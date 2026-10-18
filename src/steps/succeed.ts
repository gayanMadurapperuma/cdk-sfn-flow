import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  BuiltState,
  StepBuilder,
  StepEdge,
  StepValidator,
  validateBase,
} from "./builder";
import { StepType } from "./step-type";

/**
 * Properties for `Step.succeed`.
 */
export interface SucceedStepProps {
  /**
   * A human-readable description of the step.
   *
   * @default - no comment
   */
  readonly comment?: string;

  /**
   * JSONata expression for the workflow (or branch) output.
   *
   * @default - the step input
   */
  readonly output?: string;
}

export class SucceedBuilder implements StepBuilder {
  public readonly type = StepType.SUCCEED;
  public readonly terminal = true;

  constructor(private readonly props: SucceedStepProps) {}

  public edges(): StepEdge[] {
    return [];
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    validateBase(v, this.props);
  }

  public build(scope: Construct, id: string): BuiltState {
    const state = sfn.Succeed.jsonata(scope, id, {
      comment: this.props.comment,
      outputs: this.props.output,
    });
    return { start: state, ends: [] };
  }
}
