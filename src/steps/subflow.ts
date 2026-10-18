import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
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
import type { FlowWorkflow } from "../flow-workflow";
import { ResilientStepProps, WorkflowType } from "../types";

/**
 * Properties for `Step.subflow`. Set exactly one of `workflow` or `stateMachine`.
 */
export interface SubflowStepProps extends ResilientStepProps {
  /**
   * The child workflow.
   *
   * @default - not set
   */
  readonly workflow?: FlowWorkflow;

  /**
   * Any state machine to start.
   *
   * @default - not set
   */
  readonly stateMachine?: sfn.IStateMachine;

  /**
   * Wait for the child execution to finish. The step output is then the child's output.
   * Not available in EXPRESS workflows.
   *
   * @default true
   */
  readonly waitForCompletion?: boolean;

  /**
   * JSONata input for the child execution.
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
}

export class SubflowBuilder implements StepBuilder {
  public readonly type = StepType.SUBFLOW;
  public readonly terminal = false;
  public readonly next?: string;
  public readonly resilience: Resilience;

  constructor(private readonly props: SubflowStepProps) {
    this.next = props.next;
    this.resilience = props;
  }

  private get wait(): boolean {
    return this.props.waitForCompletion ?? true;
  }

  public edges(): StepEdge[] {
    return commonEdges(this.props.next, this.props.catchErrors);
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    validateBase(v, this.props);
    v.expression("input", this.props.input);
    if (
      (this.props.workflow === undefined) ===
      (this.props.stateMachine === undefined)
    ) {
      v.error("subflow needs exactly one of 'workflow' or 'stateMachine'");
    }
    if (this.wait && v.context.workflowType === WorkflowType.EXPRESS) {
      v.error(
        "subflow with waitForCompletion is not supported in EXPRESS workflows; set waitForCompletion: false",
      );
    }
  }

  public build(
    scope: Construct,
    id: string,
    ctx: FlowWorkflowContext,
  ): BuiltState {
    const timeout = this.props.timeout ?? ctx.defaults.timeout;
    const task = tasks.StepFunctionsStartExecution.jsonata(scope, id, {
      stateMachine:
        this.props.workflow?.stateMachine ?? this.props.stateMachine!,
      input: sfn.TaskInput.fromText(this.props.input ?? "{% $states.input %}"),
      // .sync:2 returns the child output as JSON; surface it as the step output.
      integrationPattern: this.wait
        ? sfn.IntegrationPattern.RUN_JOB
        : sfn.IntegrationPattern.REQUEST_RESPONSE,
      outputs:
        this.props.output ??
        (this.wait ? "{% $states.result.Output %}" : undefined),
      comment: this.props.comment,
      assign: this.props.assign,
      taskTimeout: timeout && sfn.Timeout.duration(timeout),
    });
    return { start: task, ends: [task], catchable: task };
  }
}
