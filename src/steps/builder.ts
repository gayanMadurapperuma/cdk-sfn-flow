import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import type { Step } from "./step";
import { StepType } from "./step-type";
import type { FlowWorkflowContext } from "../compiler/context";
import { CatchConfig, RetryConfig, WorkflowType } from "../types";

/** A transition declared by a step (explicit `next`, a catch, or a choice branch). */
export interface StepEdge {
  readonly target: string;
  /** The config field that declares the edge, used in error messages. */
  readonly field: string;
}

/** A nested step list (parallel branch or map iterator). */
export interface ChildScope {
  /** Path segment of the scope; empty for a map iterator (path continues from the map id). */
  readonly name: string;
  readonly steps: Step[];
  /** Workflow type the nested steps run in, when it differs from the parent (Distributed Map children). */
  readonly workflowType?: WorkflowType;
}

/** A state that supports retry and catch. */
export interface Catchable {
  addCatch(handler: sfn.IChainable, props?: sfn.CatchProps): unknown;
  addRetry(props?: sfn.RetryProps): unknown;
}

/** Retry and catch settings of a resilient step. */
export interface Resilience {
  readonly retry?: RetryConfig;
  readonly disableRetry?: boolean;
  readonly catchErrors?: CatchConfig[];
}

/** The states generated for a step. */
export interface BuiltState {
  /** The state that transitions into this step target. */
  readonly start: sfn.State;
  /** States whose `next` is wired to the following step. Empty for terminal steps. */
  readonly ends: sfn.INextable[];
  /** The state that receives retries and catches, if any. */
  readonly catchable?: Catchable;
}

/** Collects validation results for one step. */
export interface StepValidator {
  /** The path of the step, e.g. `Enrich > pricing > GetPrice`. */
  readonly path: string;
  readonly context: FlowWorkflowContext;
  error(message: string): void;
  warn(rule: string, message: string): void;
  /** Warns when a JSONata field is not wrapped in `{% %}`. */
  expression(field: string, value: string | undefined): void;
}

/** Everything the compiler needs to know about a step. */
export interface StepBuilder {
  readonly type: StepType;
  readonly next?: string;
  /** Terminal steps have no implicit next (choice, succeed, fail). */
  readonly terminal: boolean;
  /** Present for steps that take retry/catch (task, parallel, map, subflow). */
  readonly resilience?: Resilience;
  /** Transitions other than the implicit next. */
  edges(): StepEdge[];
  children(): ChildScope[];
  validate(v: StepValidator): void;
  build(scope: Construct, id: string, ctx: FlowWorkflowContext): BuiltState;
  /** Wires transitions that are not `next` (choice branches). */
  wire?(built: BuiltState, resolve: (target: string) => sfn.State): void;
}

/** Edges declared by `next` and `catchErrors`. */
export function commonEdges(
  next: string | undefined,
  catches: CatchConfig[] | undefined,
): StepEdge[] {
  const edges: StepEdge[] = [];
  if (next !== undefined) {
    edges.push({ target: next, field: "next" });
  }
  (catches ?? []).forEach((c, i) =>
    edges.push({ target: c.next, field: `catchErrors[${i}].next` }),
  );
  return edges;
}

/** Validates the JSONata fields shared by every step. */
export function validateBase(
  v: StepValidator,
  props: {
    readonly output?: string;
    readonly assign?: { [name: string]: string };
  },
): void {
  v.expression("output", props.output);
}
