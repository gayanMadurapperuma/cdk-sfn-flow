import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { StepBuilder } from "./builder";
import { ChoiceBuilder, ChoiceStepProps } from "./choice";
import { FailBuilder, FailStepProps } from "./fail";
import { ParallelBuilder, ParallelStepProps } from "./parallel";
import { PassBuilder, PassStepProps } from "./pass";
import { RawBuilder, RawStepProps } from "./raw";
import { StepType } from "./step-type";
import { SubflowBuilder, SubflowStepProps } from "./subflow";
import { SucceedBuilder, SucceedStepProps } from "./succeed";
import { TaskBuilder, TaskStepProps } from "./task";
import { WaitBuilder, WaitStepProps } from "./wait";

/**
 * A step of a `FlowWorkflow`. Create steps with the static factory methods.
 */
export class Step {
  /**
   * Calls a service (Lambda, DynamoDB, SQS, ...).
   */
  public static task(id: string, props: TaskStepProps): Step {
    return new Step(id, new TaskBuilder(props));
  }

  /**
   * Waits for a fixed time, a computed number of seconds, or until a timestamp.
   */
  public static wait(id: string, props: WaitStepProps): Step {
    return new Step(id, new WaitBuilder(props));
  }

  /**
   * Branches on JSONata conditions. Terminal: every path is given explicitly.
   */
  public static choice(id: string, props: ChoiceStepProps): Step {
    return new Step(id, new ChoiceBuilder(props));
  }

  /**
   * Runs named branches concurrently. The output is an object keyed by branch name.
   */
  public static parallel(id: string, props: ParallelStepProps): Step {
    return new Step(id, new ParallelBuilder(props));
  }

  /**
   * Starts another state machine, by default waiting for it and returning its output.
   */
  public static subflow(id: string, props: SubflowStepProps): Step {
    return new Step(id, new SubflowBuilder(props));
  }

  /**
   * Transforms data or assigns variables without calling a service.
   */
  public static pass(id: string, props: PassStepProps = {}): Step {
    return new Step(id, new PassBuilder(props));
  }

  /**
   * Ends the current step list successfully.
   */
  public static succeed(id: string, props: SucceedStepProps = {}): Step {
    return new Step(id, new SucceedBuilder(props));
  }

  /**
   * Ends the workflow (or branch) with an error.
   */
  public static fail(id: string, props: FailStepProps): Step {
    return new Step(id, new FailBuilder(props));
  }

  /**
   * Escape hatch: embeds hand-written CDK states. The chain must use JSONata
   * (or set its own query language). It is referenced by `id`; its states keep their own names.
   */
  public static raw(
    id: string,
    chainable: sfn.IChainable,
    props: RawStepProps = {},
  ): Step {
    return new Step(id, new RawBuilder(chainable, props));
  }

  /** The step id. It is also the state name. */
  public readonly id: string;

  /** @internal */
  public readonly _builder: StepBuilder;

  private constructor(id: string, builder: StepBuilder) {
    this.id = id;
    this._builder = builder;
  }

  /** The kind of step. */
  public get type(): StepType {
    return this._builder.type;
  }
}
