import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  BuiltState,
  commonEdges,
  StepBuilder,
  StepEdge,
  StepValidator,
  validateBase,
} from "./builder";
import { StepType } from "./step-type";
import { StepBaseProps } from "../types";

/**
 * Properties for `Step.pass`.
 */
export interface PassStepProps extends StepBaseProps {}

export class PassBuilder implements StepBuilder {
  public readonly type = StepType.PASS;
  public readonly terminal = false;
  public readonly next?: string;

  constructor(private readonly props: PassStepProps) {
    this.next = props.next;
  }

  public edges(): StepEdge[] {
    return commonEdges(this.props.next, undefined);
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    validateBase(v, this.props);
  }

  public build(scope: Construct, id: string): BuiltState {
    const state = sfn.Pass.jsonata(scope, id, {
      comment: this.props.comment,
      outputs: this.props.output,
      assign: this.props.assign,
    });
    return { start: state, ends: [state] };
  }
}
