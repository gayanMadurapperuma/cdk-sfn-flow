import type { S3Client } from "@aws-sdk/client-s3";
import { offload, OffloadMode, resolveRefs } from "./refs";

/**
 * Environment variables injected by the `FlowWorkflow` construct. They are a fallback
 * for envelopes that carry no settings (state machines deployed by cdk-sfn-flow 0.1.x).
 */
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
  /**
   * Extra buckets that input references may point to, besides the workflow's own
   * payload bucket (for example the payload bucket of a parent workflow).
   */
  readonly allowedBuckets?: string[];
}

/** Context the construct sends with each Lambda invocation in S3/AUTO mode. */
export interface FlowContext {
  readonly prefix?: string;
  readonly execution?: string;
  readonly step?: string;
  readonly keepInline?: string[];
  /** The payload bucket of the workflow. */
  readonly bucket?: string;
  /** `s3` or `auto`. */
  readonly mode?: string;
  /** Offload threshold for `auto`, in KB. */
  readonly thresholdKb?: number;
}

/** The claim-check envelope the construct wraps Lambda input in. */
export interface FlowEnvelope {
  readonly $flow: FlowContext;
  readonly data: unknown;
}

/** Payload settings of an invocation, or undefined when the strategy is off. */
export interface PayloadSettings {
  readonly bucket: string;
  readonly mode: OffloadMode;
  readonly thresholdKb: number;
  readonly prefix: string;
}

function parseMode(mode: string, source: string): OffloadMode {
  if (mode !== "s3" && mode !== "auto") {
    throw new Error(
      `cdk-sfn-flow-runtime: ${source} must be 's3' or 'auto' (got '${mode}')`,
    );
  }
  return mode;
}

function parseThreshold(value: unknown, source: string): number {
  const threshold = Number(value ?? 200);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error(
      `cdk-sfn-flow-runtime: ${source} must be a non-negative number`,
    );
  }
  return threshold;
}

/** Reads `FLOW_PAYLOAD_*`. Returns undefined when no payload strategy is configured. */
export function payloadSettings(
  env: NodeJS.ProcessEnv = process.env,
): PayloadSettings | undefined {
  const bucket = env[ENV_PAYLOAD_BUCKET];
  const mode = env[ENV_PAYLOAD_MODE];
  if (!bucket || !mode) return undefined;
  return {
    bucket,
    mode: parseMode(mode, ENV_PAYLOAD_MODE),
    thresholdKb: parseThreshold(
      env[ENV_PAYLOAD_THRESHOLD_KB],
      ENV_PAYLOAD_THRESHOLD_KB,
    ),
    prefix: env[ENV_PAYLOAD_PREFIX] ?? "flow",
  };
}

/**
 * The payload settings of an invocation: taken from the envelope, which the workflow
 * builds, and from `FLOW_PAYLOAD_*` for envelopes without settings.
 */
export function flowSettings(
  flow: FlowContext,
  env: NodeJS.ProcessEnv = process.env,
): PayloadSettings | undefined {
  if (!flow.bucket || !flow.mode) {
    const fromEnv = payloadSettings(env);
    return fromEnv && { ...fromEnv, prefix: flow.prefix ?? fromEnv.prefix };
  }
  return {
    bucket: flow.bucket,
    mode: parseMode(flow.mode, "$flow.mode"),
    thresholdKb: parseThreshold(flow.thresholdKb, "$flow.thresholdKb"),
    prefix: flow.prefix ?? "flow",
  };
}

/** True when `event` is a claim-check envelope. */
export function isFlowEnvelope(event: unknown): event is FlowEnvelope {
  return (
    typeof event === "object" &&
    event !== null &&
    "$flow" in event &&
    "data" in event &&
    typeof (event as FlowEnvelope).$flow === "object" &&
    (event as FlowEnvelope).$flow !== null
  );
}

/** `flow/` for the prefix `flow/<workflow-name>`. */
function rootPrefix(prefix: string): string {
  return `${prefix.split("/")[0]}/`;
}

/**
 * Resolves the input of an invocation: unwraps the envelope and resolves references.
 * Only references into the workflow's payload bucket (under the payload root prefix)
 * or into `options.allowedBuckets` are resolved; any other reference is rejected.
 * Events that are not envelopes are returned unchanged.
 */
export async function resolveInput(
  event: unknown,
  options: WithPayloadOptions = {},
): Promise<{ input: unknown; flow?: FlowContext }> {
  if (!isFlowEnvelope(event)) {
    return { input: event };
  }
  const settings = flowSettings(event.$flow);
  const input = await resolveRefs(event.data, {
    client: options.client,
    allowedBuckets: [
      ...(settings ? [settings.bucket] : []),
      ...(options.allowedBuckets ?? []),
    ],
    allowedKeyPrefixes: settings ? [rootPrefix(settings.prefix)] : undefined,
  });
  return { input, flow: event.$flow };
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
 *
 * This only happens for invocations from a `FlowWorkflow` with an S3/AUTO payload
 * strategy, which wrap the input in an envelope. Any other invocation (direct, from
 * another service, or from an INLINE workflow) is a passthrough.
 */
export function withPayload<TEvent, TResult, TContext>(
  handler: Handler<TEvent, TResult, TContext>,
  options: WithPayloadOptions = {},
): Handler<unknown, unknown, TContext> {
  return async (event, context) => {
    if (!isFlowEnvelope(event)) {
      return handler(event as TEvent, context);
    }
    const { input, flow } = await resolveInput(event, options);
    const result = await handler(input as TEvent, context);
    const settings = flowSettings(event.$flow);
    // Without settings there is no bucket to write to.
    return settings ? offloadOutput(result, settings, flow, options) : result;
  };
}
