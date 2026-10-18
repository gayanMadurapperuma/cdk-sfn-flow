import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import type { Step } from "../steps/step";
import { DefaultsConfig, WorkflowType } from "../types";

/** Shared compile-time information passed to every step builder. */
export interface FlowWorkflowContext {
  readonly workflowType: WorkflowType;
  readonly defaults: DefaultsConfig;
  /** Builds a nested step list (branch or iterator) and returns its chain. */
  buildSteps(steps: Step[]): sfn.IChainable;
}
