import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";

/**
 * The Step Functions workflow type.
 */
export enum WorkflowType {
  /** Long-running, exactly-once workflows (up to one year). */
  STANDARD = "STANDARD",
  /** High-volume, short-lived workflows (up to five minutes). */
  EXPRESS = "EXPRESS",
}

/**
 * Use as a `next` target to end the current step list (workflow, branch or map iterator).
 */
export const END = "end";

/**
 * Retry configuration for a step. Unset fields fall back to `defaults.retry`,
 * then to the built-in default.
 */
export interface RetryConfig {
  /**
   * Errors to retry.
   *
   * @default - States.TaskFailed, Lambda.ServiceException, Lambda.TooManyRequestsException, Lambda.SdkClientException
   */
  readonly errors?: string[];

  /**
   * Maximum number of retry attempts.
   *
   * @default 3
   */
  readonly attempts?: number;

  /**
   * Delay before the first retry.
   *
   * @default Duration.seconds(2)
   */
  readonly interval?: Duration;

  /**
   * Multiplier applied to the delay after each attempt.
   *
   * @default 2
   */
  readonly backoffRate?: number;

  /**
   * Upper bound for the delay between attempts.
   *
   * @default - no maximum
   */
  readonly maxDelay?: Duration;

  /**
   * Jitter strategy.
   *
   * @default JitterType.FULL
   */
  readonly jitter?: sfn.JitterType;
}

/**
 * Routes errors raised by a step to another step in the same scope.
 */
export interface CatchConfig {
  /**
   * Errors to catch.
   *
   * @default ["States.ALL"]
   */
  readonly errors?: string[];

  /**
   * Id of the step to continue with. It must be in the same scope (top level, branch or map iterator).
   */
  readonly next: string;

  /**
   * JSONata output passed to the `next` step.
   *
   * @default - the error output (`$states.errorOutput`)
   */
  readonly output?: string;

  /**
   * JSONata variables to assign when the error is caught.
   *
   * @default - no variables
   */
  readonly assign?: { [name: string]: string };
}

/**
 * Defaults applied to every `task`, `parallel`, `map` and `subflow` step.
 */
export interface DefaultsConfig {
  /**
   * Default retry. Per-step `retry` fields override it.
   *
   * @default - the built-in retry (see `RetryConfig`)
   */
  readonly retry?: RetryConfig;

  /**
   * Turns off retries for all steps unless a step sets `disableRetry: false`.
   *
   * @default false
   */
  readonly disableRetry?: boolean;

  /**
   * Default error routing for top-level steps without their own `catchErrors`.
   * Targets must be top-level step ids. Failures inside a parallel branch or map
   * iterator surface on the enclosing step and are caught there.
   *
   * @default - no catch, unless `alarms.topic` is set (then a global notify-and-fail catch is generated)
   */
  readonly catchErrors?: CatchConfig[];

  /**
   * Default timeout for `task` and `subflow` steps.
   *
   * @default - no timeout
   */
  readonly timeout?: Duration;
}

/**
 * Fields shared by every step.
 */
export interface StepBaseProps {
  /**
   * Id of the step that runs next, or `"end"` to end the current step list.
   *
   * @default - the following step in the list, or the end of the list for the last step
   */
  readonly next?: string;

  /**
   * A human-readable description of the step.
   *
   * @default - no comment
   */
  readonly comment?: string;

  /**
   * JSONata variables to assign, by name.
   *
   * @default - no variables
   */
  readonly assign?: { [name: string]: string };

  /**
   * JSONata expression for the step output.
   *
   * @default - the state's default output
   */
  readonly output?: string;
}

/**
 * Retry and catch fields for steps that call other services.
 */
export interface ResilientStepProps extends StepBaseProps {
  /**
   * Retry configuration, merged over `defaults.retry`.
   *
   * @default - defaults.retry
   */
  readonly retry?: RetryConfig;

  /**
   * Turns off retries for this step.
   *
   * @default - defaults.disableRetry
   */
  readonly disableRetry?: boolean;

  /**
   * Error routing for this step. Replaces `defaults.catchErrors`.
   *
   * @default - defaults.catchErrors (top-level steps only)
   */
  readonly catchErrors?: CatchConfig[];
}
