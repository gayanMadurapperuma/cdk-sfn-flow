import type { S3Client } from "@aws-sdk/client-s3";
import { offload, OffloadMode, resolveRefs } from "./refs";

/** Environment variables injected by the `FlowWorkflow` construct. */
export const ENV_PAYLOAD_BUCKET = "FLOW_PAYLOAD_BUCKET";
export const ENV_PAYLOAD_MODE = "FLOW_PAYLOAD_MODE";
export const ENV_PAYLOAD_THRESHOLD_KB = "FLOW_PAYLOAD_THRESHOLD_KB";
export const ENV_PAYLOAD_PREFIX = "FLOW_PAYLOAD_PREFIX";

/**
 * A Lambda-style async handler.
 */
export type Handler<TEvent = unknown, TResult = unknown, TContext = unknown> = (
  event: TEvent,
  context: TContext,
) => Promise<TResult>;

/**
 * Options for `withPayload` and `flowPayloadMiddleware`.
 */
export interface WithPayloadOptions {
  /** Output fields that always stay inline (in `$keep`) when the output is offloaded. */
  readonly keepInline?: string[];
  /** S3 client to use (defaults to a shared client). */
  readonly client?: S3Client;
}

/** Context the construct sends with each Lambda invocation in S3/AUTO mode. */
export interface FlowContext {
  readonly prefix?: string;
  readonly execution?: string;
  readonly step?: string;
  readonly keepInline?: string[];
}

/** The claim-check envelope the construct wraps Lambda input in. */
export interface FlowEnvelope {
  readonly $flow: FlowContext;
  readonly data: unknown;
}

/** Payload settings from the environment, or undefined when the strategy is off. */
export interface PayloadSettings {
  readonly bucket: string;
  readonly mode: OffloadMode;
  readonly thresholdKb: number;
  readonly prefix: string;
}

/** Reads `FLOW_PAYLOAD_*`. Returns undefined when no payload strategy is configured. */
export function payloadSettings(
  env: NodeJS.ProcessEnv = process.env,
): PayloadSettings | undefined {
  const bucket = env[ENV_PAYLOAD_BUCKET];
  const mode = env[ENV_PAYLOAD_MODE];
  if (!bucket || !mode) return undefined;
  if (mode !== "s3" && mode !== "auto") {
    throw new Error(
      `cdk-sfn-flow-runtime: ${ENV_PAYLOAD_MODE} must be 's3' or 'auto' (got '${mode}')`,
    );
  }
  const threshold = Number(env[ENV_PAYLOAD_THRESHOLD_KB] ?? "200");
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error(
      `cdk-sfn-flow-runtime: ${ENV_PAYLOAD_THRESHOLD_KB} must be a non-negative number`,
    );
  }
  return {
    bucket,
    mode,
    thresholdKb: threshold,
    prefix: env[ENV_PAYLOAD_PREFIX] ?? "flow",
  };
}

/** True when `event` is a claim-check envelope. */
export function isFlowEnvelope(event: unknown): event is FlowEnvelope {
  return (
    typeof event === "object" &&
    event !== null &&
    "$flow" in event &&
    "data" in event &&
    typeof (event as FlowEnvelope).$flow === "object"
  );
}

/** Resolves the input of an invocation: unwraps the envelope and resolves references. */
export async function resolveInput(
  event: unknown,
  options: WithPayloadOptions = {},
): Promise<{ input: unknown; flow?: FlowContext }> {
  if (isFlowEnvelope(event)) {
    return { input: await resolveRefs(event.data, options), flow: event.$flow };
  }
  return { input: await resolveRefs(event, options) };
}

/** Offloads an invocation result according to the settings and flow context. */
export async function offloadOutput(
  result: unknown,
  settings: PayloadSettings,
  flow: FlowContext | undefined,
  options: WithPayloadOptions = {},
): Promise<unknown> {
  const keyPrefix = [
    flow?.prefix ?? settings.prefix,
    flow?.execution,
    flow?.step,
  ]
    .filter((part): part is string => Boolean(part))
    .join("/");
  return offload(result, {
    bucket: settings.bucket,
    mode: settings.mode,
    thresholdKb: settings.thresholdKb,
    keyPrefix,
    keepInline: [
      ...new Set([...(options.keepInline ?? []), ...(flow?.keepInline ?? [])]),
    ],
    client: options.client,
  });
}

/**
 * Wraps a handler so that S3 claim-check references are resolved on input and
 * outputs are offloaded (`s3`: always, `auto`: above the threshold).
 * Without `FLOW_PAYLOAD_*` env vars and without an envelope it is a passthrough.
 */
export function withPayload<TEvent, TResult, TContext>(
  handler: Handler<TEvent, TResult, TContext>,
  options: WithPayloadOptions = {},
): Handler<unknown, unknown, TContext> {
  return async (event, context) => {
    const settings = payloadSettings();
    if (!settings && !isFlowEnvelope(event)) {
      return handler(event as TEvent, context);
    }
    const { input, flow } = await resolveInput(event, options);
    const result = await handler(input as TEvent, context);
    // Without settings there is no bucket to write to; references were still resolved.
    return settings ? offloadOutput(result, settings, flow, options) : result;
  };
}
