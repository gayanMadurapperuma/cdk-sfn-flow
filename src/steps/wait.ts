import { Duration } from "aws-cdk-lib";
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
 * Properties for `Step.wait`. Set exactly one of `seconds`, `secondsExpr` or `untilExpr`.
 */
export interface WaitStepProps extends StepBaseProps {
  /**
   * Fixed number of seconds to wait.
   *
   * @default - not set
   */
  readonly seconds?: number;

  /**
   * JSONata expression that evaluates to the number of seconds to wait.
   *
   * @default - not set
   */
  readonly secondsExpr?: string;

  /**
   * JSONata expression that evaluates to an ISO-8601 timestamp to wait until.
   *
   * @default - not set
   */
  readonly untilExpr?: string;
}

export class WaitBuilder implements StepBuilder {
  public readonly type = StepType.WAIT;
  public readonly terminal = false;
  public readonly next?: string;

  constructor(public readonly props: WaitStepProps) {
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
    const { seconds, secondsExpr, untilExpr } = this.props;
    const set = [seconds, secondsExpr, untilExpr].filter(
      (x) => x !== undefined,
    ).length;
    if (set !== 1) {
      v.error(
        `wait needs exactly one of 'seconds', 'secondsExpr' or 'untilExpr' (got ${set})`,
      );
    }
    if (seconds !== undefined && (!Number.isInteger(seconds) || seconds < 0)) {
      v.error(`'seconds' must be a non-negative integer (got ${seconds})`);
    }
    v.expression("secondsExpr", secondsExpr);
    v.expression("untilExpr", untilExpr);
  }

  public build(scope: Construct, id: string): BuiltState {
    const state = sfn.Wait.jsonata(scope, id, {
      comment: this.props.comment,
      outputs: this.props.output,
      assign: this.props.assign,
      time: this.time(),
    });
    return { start: state, ends: [state] };
  }

  private time(): sfn.WaitTime {
    if (this.props.secondsExpr !== undefined) {
      return sfn.WaitTime.seconds(this.props.secondsExpr);
    }
    if (this.props.untilExpr !== undefined) {
      return sfn.WaitTime.timestamp(this.props.untilExpr);
    }
    return sfn.WaitTime.duration(Duration.seconds(this.props.seconds ?? 0));
  }
}
