/**
 * A Lambda-style async handler.
 */
export type Handler<TEvent = unknown, TResult = unknown, TContext = unknown> = (
  event: TEvent,
  context: TContext,
) => Promise<TResult>;

/**
 * Options for `withPayload`.
 */
export interface WithPayloadOptions {
  /** Output fields that always stay inline (in `$keep`) when the output is offloaded. */
  readonly keepInline?: string[];
}

/** Environment variables injected by the `FlowWorkflow` construct. */
export const ENV_PAYLOAD_BUCKET = "FLOW_PAYLOAD_BUCKET";
export const ENV_PAYLOAD_MODE = "FLOW_PAYLOAD_MODE";
export const ENV_PAYLOAD_THRESHOLD_KB = "FLOW_PAYLOAD_THRESHOLD_KB";

/**
 * Returns true when the workflow configured an S3 payload strategy for this function.
 */
export function isPayloadStrategyEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env[ENV_PAYLOAD_BUCKET] && env[ENV_PAYLOAD_MODE]);
}

/**
 * Wraps a handler so that S3 claim-check references are resolved on input and
 * large outputs are offloaded. Without `FLOW_PAYLOAD_*` env vars it is a passthrough.
 */
export function withPayload<TEvent, TResult, TContext>(
  handler: Handler<TEvent, TResult, TContext>,
  _options: WithPayloadOptions = {},
): Handler<TEvent, TResult, TContext> {
  return async (event, context) => {
    if (!isPayloadStrategyEnabled()) {
      return handler(event, context);
    }
    throw new Error(
      `${ENV_PAYLOAD_MODE}=${process.env[ENV_PAYLOAD_MODE]} is not supported by this version of cdk-sfn-flow-runtime`,
    );
  };
}
