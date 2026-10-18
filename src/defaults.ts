import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { DefaultsConfig, RetryConfig } from "./types";

/** Errors retried when no `errors` are configured. */
export const DEFAULT_RETRY_ERRORS = [
  "States.TaskFailed",
  "Lambda.ServiceException",
  "Lambda.TooManyRequestsException",
  "Lambda.SdkClientException",
];

/** Errors caught when a catch has no `errors`. */
export const DEFAULT_CATCH_ERRORS = ["States.ALL"];

/**
 * Merges the built-in retry, `defaults.retry` and the step's retry (later wins),
 * or returns undefined when retries are disabled.
 */
export function resolveRetry(
  defaults: DefaultsConfig,
  step: { readonly retry?: RetryConfig; readonly disableRetry?: boolean },
): sfn.RetryProps | undefined {
  if (step.disableRetry ?? defaults.disableRetry ?? false) {
    return undefined;
  }
  const merged: RetryConfig = {
    ...defined(defaults.retry),
    ...defined(step.retry),
  };
  return {
    errors: merged.errors ?? DEFAULT_RETRY_ERRORS,
    maxAttempts: merged.attempts ?? 3,
    interval: merged.interval ?? Duration.seconds(2),
    backoffRate: merged.backoffRate ?? 2,
    maxDelay: merged.maxDelay,
    jitterStrategy: merged.jitter ?? sfn.JitterType.FULL,
  };
}

/** Drops undefined fields so they don't override earlier values in a spread. */
function defined<T extends object>(value: T | undefined): Partial<T> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
