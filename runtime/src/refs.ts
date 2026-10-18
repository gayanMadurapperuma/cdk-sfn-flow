import { randomUUID } from "crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** Location of an offloaded payload. */
export interface FlowRefLocation {
  readonly bucket: string;
  readonly key: string;
  /** Size of the serialized payload in bytes. */
  readonly size: number;
}

/**
 * A claim-check reference. `$keep` holds fields that stay inline; the construct
 * also hoists them next to `$flowRef` so states can read them directly.
 */
export interface FlowRef {
  readonly $flowRef: FlowRefLocation;
  readonly $keep?: Record<string, unknown>;
  readonly [field: string]: unknown;
}

/** When to offload an output. */
export type OffloadMode = "s3" | "auto";

export interface OffloadOptions {
  readonly bucket: string;
  readonly mode: OffloadMode;
  /** Threshold for `auto`, in KB of serialized JSON. */
  readonly thresholdKb?: number;
  /** Full object key, or a key prefix to which `<uuid>.json` is appended. */
  readonly key?: string;
  readonly keyPrefix?: string;
  /** Top-level fields copied into `$keep`. */
  readonly keepInline?: readonly string[];
  readonly client?: S3Client;
}

export interface ResolveOptions {
  readonly client?: S3Client;
}

let defaultClient: S3Client | undefined;

function s3(client?: S3Client): S3Client {
  if (client) return client;
  defaultClient ??= new S3Client({});
  return defaultClient;
}

/** True when `value` is a claim-check reference. */
export function isFlowRef(value: unknown): value is FlowRef {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const ref = (value as { $flowRef?: unknown }).$flowRef;
  return (
    typeof ref === "object" &&
    ref !== null &&
    typeof (ref as FlowRefLocation).bucket === "string" &&
    typeof (ref as FlowRefLocation).key === "string"
  );
}

/** The serialized JSON size of `value` in bytes. */
export function jsonSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");
}

async function load(ref: FlowRef, client: S3Client): Promise<unknown> {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: ref.$flowRef.bucket,
      Key: ref.$flowRef.key,
    }),
  );
  if (!response.Body) {
    throw new Error(
      `cdk-sfn-flow-runtime: s3://${ref.$flowRef.bucket}/${ref.$flowRef.key} has no body`,
    );
  }
  const loaded: unknown = JSON.parse(
    await response.Body.transformToString("utf8"),
  );
  // Inline fields win over the stored copy only when the stored payload is not an object.
  if (typeof loaded === "object" && loaded !== null && !Array.isArray(loaded)) {
    return { ...ref.$keep, ...loaded };
  }
  return loaded;
}

/**
 * Recursively replaces every `$flowRef` object in `value` (including inside
 * Parallel-merged objects and Map result arrays) with the payload it points to.
 */
export async function resolveRefs<T = unknown>(
  value: unknown,
  options: ResolveOptions = {},
): Promise<T> {
  const client = s3(options.client);
  const visit = async (node: unknown): Promise<unknown> => {
    if (isFlowRef(node)) {
      return visit(await load(node, client));
    }
    if (Array.isArray(node)) {
      return Promise.all(node.map(visit));
    }
    if (typeof node === "object" && node !== null) {
      const entries = await Promise.all(
        Object.entries(node).map(
          async ([k, v]) => [k, await visit(v)] as const,
        ),
      );
      return Object.fromEntries(entries);
    }
    return node;
  };
  return (await visit(value)) as T;
}

/** Picks `fields` from an object value. */
function pick(
  value: unknown,
  fields: readonly string[],
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const field of fields) {
      if (field in value) {
        kept[field] = (value as Record<string, unknown>)[field];
      }
    }
  }
  return kept;
}

/**
 * Stores `value` in S3 and returns a reference, or returns `value` unchanged when
 * `mode` is `auto` and it is not larger than the threshold. `undefined` is never offloaded.
 */
export async function offload(
  value: unknown,
  options: OffloadOptions,
): Promise<unknown> {
  if (value === undefined) return value;
  const body = JSON.stringify(value);
  const size = Buffer.byteLength(body, "utf8");
  const thresholdBytes = (options.thresholdKb ?? 200) * 1024;
  if (options.mode === "auto" && size <= thresholdBytes) {
    return value;
  }
  const key =
    options.key ??
    `${(options.keyPrefix ?? "flow").replace(/\/+$/, "")}/${randomUUID()}.json`;
  await s3(options.client).send(
    new PutObjectCommand({
      Bucket: options.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
    }),
  );
  const ref: FlowRef = {
    $flowRef: { bucket: options.bucket, key, size },
    $keep: pick(value, options.keepInline ?? []),
  };
  return ref;
}
