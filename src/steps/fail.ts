import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { BuiltState, StepBuilder, StepEdge, StepValidator } from "./builder";
import { StepType } from "./step-type";

/**
 * Properties for `Step.fail`.
 */
export interface FailStepProps {
  /** Error name, or a JSONata expression that evaluates to one. */
  readonly error: string;

  /**
   * Error cause, or a JSONata expression that evaluates to one.
   *
   * @default - no cause
   */
  readonly cause?: string;

  /**
   * A human-readable description of the step.
   *
   * @default - no comment
   */
  readonly comment?: string;
}

export class FailBuilder implements StepBuilder {
  public readonly type = StepType.FAIL;
  public readonly terminal = true;

  constructor(private readonly props: FailStepProps) {}

  public edges(): StepEdge[] {
    return [];
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    if (!this.props.error) {
      v.error("fail needs an 'error'");
    }
  }

  public build(scope: Construct, id: string): BuiltState {
    const state = sfn.Fail.jsonata(scope, id, {
      comment: this.props.comment,
      error: this.props.error,
      cause: this.props.cause,
    });
    return { start: state, ends: [] };
  }
}
