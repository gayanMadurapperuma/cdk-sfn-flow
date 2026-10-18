import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  BuiltState,
  ChildScope,
  commonEdges,
  Resilience,
  StepBuilder,
  StepEdge,
  StepValidator,
  validateBase,
} from "./builder";
import type { Step } from "./step";
import { StepType } from "./step-type";
import type { FlowWorkflowContext } from "../compiler/context";
import { unwrap, wrap } from "../jsonata";
import { ResilientStepProps } from "../types";

/**
 * A named branch of a `Step.parallel`.
 */
export interface ParallelBranch {
  /** Branch name. It becomes the key of the branch result in the parallel output. */
  readonly name: string;

  /** The steps of the branch. */
  readonly steps: Step[];
}

/**
 * Properties for `Step.parallel`.
 */
export interface ParallelStepProps extends ResilientStepProps {
  /** At least two named branches, run concurrently. */
  readonly branches: ParallelBranch[];
}

/** The Parallel output: branch results keyed by branch name, merged with the user's output. */
export function parallelOutput(
  names: string[],
  output: string | undefined,
): string {
  const named = `{ ${names.map((n, i) => `${JSON.stringify(n)}: $states.result[${i}]`).join(", ")} }`;
  return wrap(
    output === undefined ? named : `$merge([${named}, (${unwrap(output)})])`,
  );
}

export class ParallelBuilder implements StepBuilder {
  public readonly type = StepType.PARALLEL;
  public readonly terminal = false;
  public readonly next?: string;
  public readonly resilience: Resilience;

  constructor(private readonly props: ParallelStepProps) {
    this.next = props.next;
    this.resilience = props;
  }

  public edges(): StepEdge[] {
    return commonEdges(this.props.next, this.props.catchErrors);
  }

  public children(): ChildScope[] {
    return (this.props.branches ?? []).map((b) => ({
      name: b.name,
      steps: b.steps ?? [],
    }));
  }

  public validate(v: StepValidator): void {
    validateBase(v, this.props);
    const branches = this.props.branches ?? [];
    if (branches.length < 2) {
      v.error(
        `parallel needs at least 2 branches (got ${branches.length}); use the steps directly instead`,
      );
    }
    const names = new Set<string>();
    for (const branch of branches) {
      if (!branch.name) {
        v.error("parallel branch names must not be empty");
      } else if (names.has(branch.name)) {
        v.error(`duplicate branch name '${branch.name}'`);
      }
      names.add(branch.name);
    }
  }

  public build(
    scope: Construct,
    id: string,
    ctx: FlowWorkflowContext,
  ): BuiltState {
    const state = sfn.Parallel.jsonata(scope, id, {
      comment: this.props.comment,
      assign: this.props.assign,
      outputs: parallelOutput(
        this.props.branches.map((b) => b.name),
        this.props.output,
      ),
    });
    for (const branch of this.props.branches) {
      state.branch(ctx.buildSteps(branch.steps));
    }
    return { start: state, ends: [state], catchable: state };
  }
}
