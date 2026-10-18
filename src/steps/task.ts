import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  BuiltState,
  commonEdges,
  Resilience,
  StepBuilder,
  StepEdge,
  StepValidator,
  validateBase,
} from "./builder";
import { StepType } from "./step-type";
import type { FlowWorkflowContext } from "../compiler/context";
import type { Invoke } from "../invoke/invoke";
import { TaskPattern } from "../invoke/task-pattern";
import { ResilientStepProps, WorkflowType } from "../types";

/**
 * Properties for `Step.task`.
 */
export interface TaskStepProps extends ResilientStepProps {
  /** The service to call. */
  readonly invoke: Invoke;

  /**
   * How the task waits for the service.
   *
   * @default TaskPattern.REQUEST_RESPONSE
   */
  readonly pattern?: TaskPattern;

  /**
   * JSONata payload for targets that take one (Lambda).
   *
   * @default "{% $states.input %}"
   */
  readonly input?: string;

  /**
   * Task timeout.
   *
   * @default - defaults.timeout
   */
  readonly timeout?: Duration;

  /**
   * Heartbeat timeout, mainly for callback tasks.
   *
   * @default - no heartbeat
   */
  readonly heartbeat?: Duration;

  /**
   * Output fields that must stay inline when the payload strategy offloads this
   * task's output to S3, for example fields read by a later `choice`.
   *
   * @default - none
   */
  readonly keepInline?: string[];
}

export class TaskBuilder implements StepBuilder {
  public readonly type = StepType.TASK;
  public readonly terminal = false;
  public readonly next?: string;
  public readonly resilience: Resilience;

  constructor(public readonly props: TaskStepProps) {
    this.next = props.next;
    this.resilience = props;
  }

  public get pattern(): TaskPattern {
    return this.props.pattern ?? TaskPattern.REQUEST_RESPONSE;
  }

  public edges(): StepEdge[] {
    return commonEdges(this.props.next, this.props.catchErrors);
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    const target = this.props.invoke._target;
    validateBase(v, this.props);
    v.expression("input", this.props.input);
    for (const [field, value] of Object.entries(target.expressions)) {
      v.expression(field, value);
    }
    target.validate?.(v);
    if (!target.supportedPatterns.includes(this.pattern)) {
      v.error(
        `${target.name} does not support TaskPattern.${this.pattern} (supported: ${target.supportedPatterns.join(", ")})`,
      );
    }
    if (
      this.pattern !== TaskPattern.REQUEST_RESPONSE &&
      v.context.workflowType === WorkflowType.EXPRESS
    ) {
      v.error(
        `TaskPattern.${this.pattern} is not supported in EXPRESS workflows`,
      );
    }
    if (
      this.props.keepInline !== undefined &&
      target.lambdaFunction === undefined
    ) {
      v.error(
        `'keepInline' applies to Invoke.lambda tasks only (got ${target.name})`,
      );
    }
    if (this.props.input !== undefined && !target.acceptsInput) {
      v.error(
        `${target.name} does not take 'input'; use the invoke's own expression instead`,
      );
    }
    if (
      this.pattern === TaskPattern.CALLBACK &&
      this.timeout(v.context) === undefined
    ) {
      v.warn(
        "CallbackWithoutTimeout",
        "CALLBACK task has no timeout; an execution could wait for its token for up to a year",
      );
    }
  }

  public build(
    scope: Construct,
    id: string,
    ctx: FlowWorkflowContext,
  ): BuiltState {
    const timeout = this.timeout(ctx);
    const task = this.props.invoke._target.bind(scope, id, {
      pattern: this.pattern,
      input: this.props.input,
      envelope:
        ctx.payload.offloads && this.props.invoke._target.lambdaFunction
          ? { prefix: ctx.payload.prefix, keepInline: this.props.keepInline }
          : undefined,
      state: {
        comment: this.props.comment,
        outputs: this.props.output,
        assign: this.props.assign,
        taskTimeout: timeout && sfn.Timeout.duration(timeout),
        heartbeatTimeout:
          this.props.heartbeat && sfn.Timeout.duration(this.props.heartbeat),
      },
    });
    return { start: task, ends: [task], catchable: task };
  }

  private timeout(ctx: FlowWorkflowContext): Duration | undefined {
    return this.props.timeout ?? ctx.defaults.timeout;
  }
}
