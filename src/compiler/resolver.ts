import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import type { FlowWorkflowContext } from "./context";
import type { PayloadStore } from "./payload";
import { DEFAULT_CATCH_ERRORS, resolveRetry } from "../defaults";
import { BuiltState } from "../steps/builder";
import type { Step } from "../steps/step";
import { CatchConfig, DefaultsConfig, END, WorkflowType } from "../types";

/** Options for `FlowResolver`. */
export interface FlowResolverOptions {
  readonly workflowType: WorkflowType;
  readonly defaults: DefaultsConfig;
  readonly payload: PayloadStore;
  /**
   * Catches for top-level resilient steps without their own `catchErrors`
   * (`defaults.catchErrors`, or the generated global catch).
   */
  readonly topLevelCatches?: CatchConfig[];
  /** Generated top-level states that catches can target, by name. */
  readonly extraTargets?: { [id: string]: sfn.State };
}

/**
 * Turns step lists into wired CDK states: array order, `next`, `"end"`,
 * terminal steps, retries, catches and choice branches.
 */
export class FlowResolver {
  public readonly context: FlowWorkflowContext;

  constructor(
    private readonly scope: Construct,
    private readonly options: FlowResolverOptions,
  ) {
    this.context = {
      workflowType: options.workflowType,
      defaults: options.defaults,
      payload: options.payload,
      buildSteps: (steps) => this.buildList(steps, false),
    };
  }

  /** Builds the top-level step list. */
  public build(steps: Step[]): sfn.IChainable {
    return this.buildList(steps, true);
  }

  private buildList(steps: Step[], top: boolean): sfn.IChainable {
    const built = new Map<string, BuiltState>();
    for (const step of steps) {
      built.set(
        step.id,
        step._builder.build(this.scope, step.id, this.context),
      );
    }
    const resolve = (target: string): sfn.State => {
      const state =
        built.get(target)?.start ??
        (top ? this.options.extraTargets?.[target] : undefined);
      if (!state) {
        // The validator rejects unknown targets; this guards internal misuse.
        throw new Error(`cdk-sfn-flow: unknown step '${target}'`);
      }
      return state;
    };

    steps.forEach((step, index) => {
      const builder = step._builder;
      const state = built.get(step.id)!;

      if (!builder.terminal) {
        const next =
          builder.next ??
          (index + 1 < steps.length ? steps[index + 1].id : END);
        if (next !== END) {
          const target = resolve(next);
          state.ends.forEach((end) => end.next(target));
        }
      }

      if (builder.resilience && state.catchable) {
        const retry = resolveRetry(this.options.defaults, builder.resilience);
        if (retry) {
          state.catchable.addRetry(retry);
        }
        const catches =
          builder.resilience.catchErrors ??
          (top ? this.options.topLevelCatches : undefined);
        for (const c of catches ?? []) {
          state.catchable.addCatch(resolve(c.next), {
            errors: c.errors ?? DEFAULT_CATCH_ERRORS,
            outputs: c.output,
            assign: c.assign,
          });
        }
      }

      builder.wire?.(state, resolve);
    });

    return built.get(steps[0].id)!.start;
  }
}
