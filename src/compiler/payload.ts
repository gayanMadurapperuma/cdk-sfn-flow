import { Duration } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import type { PayloadEnvelope } from "../invoke/invoke";

/**
 * How step outputs are passed between states.
 */
export enum PayloadStrategy {
  /** Payloads stay in the state (256 KB limit). Nothing is created. */
  INLINE = "INLINE",
  /** Lambda outputs are always offloaded to S3 and resolved on input (claim check). */
  S3 = "S3",
  /** Lambda outputs larger than `thresholdKb` are offloaded to S3. */
  AUTO = "AUTO",
}

/**
 * Large-payload handling.
 */
export interface PayloadConfig {
  /**
   * The strategy.
   *
   * @default PayloadStrategy.INLINE
   */
  readonly strategy?: PayloadStrategy;

  /**
   * Offload threshold for `AUTO`, in KB of serialized JSON.
   *
   * @default 200
   */
  readonly thresholdKb?: number;

  /**
   * Days before offloaded payloads expire (generated bucket only).
   *
   * @default 7
   */
  readonly retentionDays?: number;

  /**
   * Use an existing bucket instead of creating one. Its lifecycle rules are not changed.
   *
   * @default - a bucket is created when needed
   */
  readonly bucket?: s3.IBucket;
}

/**
 * Owns the payload bucket. The bucket is created only when something needs it
 * (S3/AUTO payloads or Distributed Map results).
 */
export class PayloadStore {
  /** Key prefix for everything this workflow writes: `flow/<workflow-name>`. */
  public readonly prefix: string;
  private created?: s3.Bucket;

  constructor(
    private readonly scope: Construct,
    workflowName: string,
    private readonly config: PayloadConfig,
  ) {
    this.prefix = `flow/${workflowName}`;
  }

  public get strategy(): PayloadStrategy {
    return this.config.strategy ?? PayloadStrategy.INLINE;
  }

  /** True for S3 and AUTO. */
  public get offloads(): boolean {
    return this.strategy !== PayloadStrategy.INLINE;
  }

  public get thresholdKb(): number {
    return this.config.thresholdKb ?? 200;
  }

  public get retentionDays(): number {
    return this.config.retentionDays ?? 7;
  }

  /** True when the bucket is generated, so `retentionDays` applies to it. */
  public get managesRetention(): boolean {
    return this.config.bucket === undefined;
  }

  /** The bucket, if one exists (given or created) without forcing creation. */
  public get existingBucket(): s3.IBucket | undefined {
    return this.config.bucket ?? this.created;
  }

  /** The payload bucket; created on first use. */
  public bucket(): s3.IBucket {
    if (this.config.bucket) {
      return this.config.bucket;
    }
    this.created ??= new s3.Bucket(this.scope, "PayloadBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        { prefix: "flow/", expiration: Duration.days(this.retentionDays) },
      ],
    });
    return this.created;
  }

  /** ARN pattern for the objects of this workflow. */
  public objectsArn(): string {
    return this.bucket().arnForObjects(`${this.prefix}/*`);
  }
}

/** The claim-check settings sent to Lambda tasks with every invocation. */
export function payloadEnvelope(
  store: PayloadStore,
  keepInline: string[] | undefined,
): PayloadEnvelope {
  const auto = store.strategy === PayloadStrategy.AUTO;
  return {
    prefix: store.prefix,
    keepInline,
    bucket: store.bucket().bucketName,
    mode: auto ? "auto" : "s3",
    thresholdKb: auto ? store.thresholdKb : undefined,
  };
}

/**
 * Environment variables read by `cdk-sfn-flow-runtime` 0.1.x. Newer runtimes take the
 * settings from the envelope and use these only as a fallback.
 */
export const PAYLOAD_ENV = {
  bucket: "FLOW_PAYLOAD_BUCKET",
  mode: "FLOW_PAYLOAD_MODE",
  thresholdKb: "FLOW_PAYLOAD_THRESHOLD_KB",
  prefix: "FLOW_PAYLOAD_PREFIX",
};

/** The environment a Lambda function needs for the configured strategy. */
export function payloadEnvironment(store: PayloadStore): {
  [name: string]: string;
} {
  const env: { [name: string]: string } = {
    [PAYLOAD_ENV.bucket]: store.bucket().bucketName,
    [PAYLOAD_ENV.mode]: store.strategy === PayloadStrategy.AUTO ? "auto" : "s3",
    [PAYLOAD_ENV.prefix]: store.prefix,
  };
  if (store.strategy === PayloadStrategy.AUTO) {
    env[PAYLOAD_ENV.thresholdKb] = String(store.thresholdKb);
  }
  return env;
}
