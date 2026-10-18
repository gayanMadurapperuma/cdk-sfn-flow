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
 * A conditional branch of a `Step.choice`.
 */
export interface ChoiceBranch {
  /** JSONata condition, e.g. `{% $states.input.total > 1000 %}`. */
  readonly when: string;

  /** Id of the step to run when the condition is true. */
  readonly next: string;

  /**
   * A human-readable description of the branch.
   *
   * @default - no comment
   */
  readonly comment?: string;

  /**
   * JSONata output passed to `next` when this branch is taken.
   *
   * @default - the choice input
   */
  readonly output?: string;

  /**
   * JSONata variables to assign when this branch is taken.
   *
   * @default - no variables
   */
  readonly assign?: { [name: string]: string };
}

/**
 * Properties for `Step.choice`. A choice is terminal: it has no implicit next step.
 */
export interface ChoiceStepProps {
  /** Branches, evaluated in order. */
  readonly branches: ChoiceBranch[];

  /** Id of the step to run when no branch matches. */
  readonly otherwise: string;

  /**
   * A human-readable description of the step.
   *
   * @default - no comment
   */
  readonly comment?: string;

  /**
   * JSONata variables to assign.
   *
   * @default - no variables
   */
  readonly assign?: { [name: string]: string };

  /**
   * JSONata expression for the step output.
   *
   * @default - the choice input
   */
  readonly output?: string;
}

export class ChoiceBuilder implements StepBuilder {
  public readonly type = StepType.CHOICE;
  public readonly terminal = true;

  constructor(public readonly props: ChoiceStepProps) {}

  public edges(): StepEdge[] {
    const edges: StepEdge[] = (this.props.branches ?? []).map((b, i) => ({
      target: b.next,
      field: `branches[${i}].next`,
    }));
    if (this.props.otherwise !== undefined) {
      edges.push({ target: this.props.otherwise, field: "otherwise" });
    }
    return edges;
  }

  public children() {
    return [];
  }

  public validate(v: StepValidator): void {
    validateBase(v, this.props);
    if (!this.props.branches || this.props.branches.length === 0) {
      v.error("choice needs at least one branch");
    }
    if (!this.props.otherwise) {
      v.error("choice needs an 'otherwise' target");
    }
    (this.props.branches ?? []).forEach((b, i) => {
      v.expression(`branches[${i}].when`, b.when);
      v.expression(`branches[${i}].output`, b.output);
    });
  }

  public build(scope: Construct, id: string): BuiltState {
    const state = sfn.Choice.jsonata(scope, id, {
      comment: this.props.comment,
      outputs: this.props.output,
      assign: this.props.assign,
    });
    return { start: state, ends: [] };
  }

  public wire(built: BuiltState, resolve: (target: string) => sfn.State): void {
    const choice = built.start as sfn.Choice;
    for (const branch of this.props.branches) {
      choice.when(sfn.Condition.jsonata(branch.when), resolve(branch.next), {
        comment: branch.comment,
        outputs: branch.output,
        assign: branch.assign,
      });
    }
    choice.otherwise(resolve(this.props.otherwise));
  }
}
