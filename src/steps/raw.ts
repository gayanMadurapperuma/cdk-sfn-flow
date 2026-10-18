import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { BuiltState, StepBuilder, StepEdge } from "./builder";
import { StepType } from "./step-type";

/**
 * Properties for `Step.raw`.
 */
export interface RawStepProps {
  /**
   * Id of the step that runs after the chain's end states, or `"end"`.
   *
   * @default - the following step in the list
   */
  readonly next?: string;
}

export class RawBuilder implements StepBuilder {
  public readonly type = StepType.RAW;
  public readonly next?: string;

  constructor(
    private readonly chainable: sfn.IChainable,
    props: RawStepProps,
  ) {
    this.next = props.next;
  }

  /** A chain without open end states (e.g. ending in Succeed/Fail) is terminal. */
  public get terminal(): boolean {
    return this.chainable.endStates.length === 0;
  }

  public edges(): StepEdge[] {
    return this.next === undefined
      ? []
      : [{ target: this.next, field: "next" }];
  }

  public children() {
    return [];
  }

  public validate(): void {}

  public build(): BuiltState {
    return { start: this.chainable.startState, ends: this.chainable.endStates };
  }
}
