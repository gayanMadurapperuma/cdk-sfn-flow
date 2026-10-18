import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  BuiltState,
  ChildScope,
  commonEdges,
  Resilience,
  StepBuilder,
  StepEdge,
  StepValidator,
  validateBase,
} from "./builder";
import type { Step } from "./step";
import { StepType } from "./step-type";
import type { FlowWorkflowContext } from "../compiler/context";
import { ResilientStepProps, WorkflowType } from "../types";

/**
 * How a map runs its iterations.
 */
export enum MapMode {
  /** Distributed for `MapItems.fromS3`, inline otherwise. */
  AUTO = "AUTO",
  /** Inline Map: iterations run inside the execution (up to 40 concurrent). */
  INLINE = "INLINE",
  /** Distributed Map: each iteration (or batch) is a child execution. */
  DISTRIBUTED = "DISTRIBUTED",
}

/**
 * Format of an S3 item source.
 */
export enum S3ItemFormat {
  /** A JSON array. */
  JSON = "JSON",
  /** JSON Lines: one JSON value per line. */
  JSONL = "JSONL",
  /** CSV; the first row holds the headers unless `csvHeaders` is set. */
  CSV = "CSV",
  /** An S3 Inventory manifest. */
  MANIFEST = "MANIFEST",
}

/**
 * An S3 item source for `MapItems.fromS3`. Set either `key` (iterate over the
 * file's entries) or `prefix` (iterate over the objects under the prefix).
 */
export interface MapS3Source {
  /** The bucket to read from. Read access is granted. */
  readonly bucket: s3.IBucket;

  /**
   * Object key of the file to iterate over.
   *
   * @default - not set
   */
  readonly key?: string;

  /**
   * Iterate over the objects under this prefix (one item per object).
   *
   * @default - not set
   */
  readonly prefix?: string;

  /**
   * Format of the file at `key`.
   *
   * @default S3ItemFormat.JSON
   */
  readonly format?: S3ItemFormat;

  /**
   * CSV headers, when the file has no header row.
   *
   * @default - the first row
   */
  readonly csvHeaders?: string[];

  /**
   * Maximum number of items to read.
   *
   * @default - all items
   */
  readonly maxItems?: number;
}

/**
 * Where a map gets its items.
 */
export class MapItems {
  /** Items from a JSONata expression that evaluates to an array. */
  public static fromExpr(expression: string): MapItems {
    return new MapItems(expression, undefined);
  }

  /** Items from S3. Selects a Distributed Map in `MapMode.AUTO`. */
  public static fromS3(source: MapS3Source): MapItems {
    return new MapItems(undefined, source);
  }

  /** @internal */
  public readonly _expression?: string;
  /** @internal */
  public readonly _s3?: MapS3Source;

  private constructor(
    expression: string | undefined,
    source: MapS3Source | undefined,
  ) {
    this._expression = expression;
    this._s3 = source;
  }
}

/**
 * Options for `MapResults.toS3`.
 */
export interface MapResultsS3Options {
  /**
   * Bucket for the results.
   *
   * @default - the workflow payload bucket (created if needed)
   */
  readonly bucket?: s3.IBucket;

  /**
   * Key prefix for the results.
   *
   * @default - `flow/<workflow-name>/map-results/<step-id>`
   */
  readonly prefix?: string;
}

/**
 * Where a Distributed Map writes its results.
 */
export class MapResults {
  /** Write results to the payload bucket. */
  public static readonly S3: MapResults = MapResults.toS3();

  /** Write results to S3 (Distributed Map only). The step output is then the result manifest location. */
  public static toS3(options: MapResultsS3Options = {}): MapResults {
    return new MapResults(options);
  }

  /** @internal */
  public readonly _s3: MapResultsS3Options;

  private constructor(options: MapResultsS3Options) {
    this._s3 = options;
  }
}

/**
 * Batching for Distributed Map child executions.
 */
export interface MapBatchConfig {
  /**
   * Maximum items per child execution.
   *
   * @default - no item limit
   */
  readonly maxItems?: number;

  /**
   * Maximum input bytes per child execution.
   *
   * @default - no byte limit
   */
  readonly maxBytes?: number;
}

/**
 * Properties for `Step.map`.
 */
export interface MapStepProps extends ResilientStepProps {
  /** The items to iterate over. */
  readonly items: MapItems;

  /** The steps run for each item. */
  readonly steps: Step[];

  /**
   * Inline or Distributed.
   *
   * @default MapMode.AUTO
   */
  readonly mode?: MapMode;

  /**
   * Maximum concurrent iterations.
   *
   * @default - no limit (inline: up to 40)
   */
  readonly concurrency?: number;

  /**
   * JSONata expression that builds each iteration's input (`$states.context.Map.Item.Value`).
   *
   * @default - the item
   */
  readonly itemSelector?: string;

  /**
   * Batch items per child execution (Distributed only).
   *
   * @default - no batching
   */
  readonly batch?: MapBatchConfig;

  /**
   * Percentage of failed items tolerated before the map fails (Distributed only).
   *
   * @default 0
   */
  readonly toleratedFailurePercentage?: number;

  /**
   * Number of failed items tolerated before the map fails (Distributed only).
   *
   * @default 0
   */
  readonly toleratedFailureCount?: number;

  /**
   * Type of the child executions (Distributed only).
   *
   * @default WorkflowType.EXPRESS
   */
  readonly childWorkflowType?: WorkflowType;

  /**
   * Write results to S3 instead of returning them (Distributed only).
   *
   * @default - results are returned in the output
   */
  readonly results?: MapResults;
}

export class MapBuilder implements StepBuilder {
  public readonly type = StepType.MAP;
  public readonly terminal = false;
  public readonly next?: string;
  public readonly resilience: Resilience;

  constructor(private readonly props: MapStepProps) {
    this.next = props.next;
    this.resilience = props;
  }

  public get distributed(): boolean {
    const mode = this.props.mode ?? MapMode.AUTO;
    return (
      mode === MapMode.DISTRIBUTED ||
      (mode === MapMode.AUTO && this.props.items?._s3 !== undefined)
    );
  }

  /** The item expression, for payload checks. */
  public get itemsExpression(): string | undefined {
    return this.props.items?._expression;
  }

  private get childType(): WorkflowType {
    return this.props.childWorkflowType ?? WorkflowType.EXPRESS;
  }

  public edges(): StepEdge[] {
    return commonEdges(this.props.next, this.props.catchErrors);
  }

  public children(): ChildScope[] {
    return [
      {
        name: "",
        steps: this.props.steps ?? [],
        workflowType: this.distributed ? this.childType : undefined,
      },
    ];
  }

  public validate(v: StepValidator): void {
    const p = this.props;
    validateBase(v, p);
    v.expression("items", p.items?._expression);
    v.expression("itemSelector", p.itemSelector);
    if (!p.items) {
      v.error("map needs 'items'");
      return;
    }
    if (p.mode === MapMode.INLINE && p.items._s3) {
      v.error(
        "MapMode.INLINE cannot read items from S3; use MapMode.AUTO or MapMode.DISTRIBUTED",
      );
    }
    if (this.distributed && v.context.workflowType === WorkflowType.EXPRESS) {
      v.error("Distributed Map is not supported in EXPRESS workflows");
    }
    if (p.items._s3) {
      const { key, prefix, format, csvHeaders } = p.items._s3;
      if ((key === undefined) === (prefix === undefined)) {
        v.error("MapItems.fromS3 needs exactly one of 'key' or 'prefix'");
      }
      if (prefix !== undefined && format !== undefined) {
        v.error(
          "MapItems.fromS3 'format' applies to 'key' only; a prefix yields one item per object",
        );
      }
      if (csvHeaders !== undefined && format !== S3ItemFormat.CSV) {
        v.error("MapItems.fromS3 'csvHeaders' requires S3ItemFormat.CSV");
      }
    }
    if (
      p.concurrency !== undefined &&
      (!Number.isInteger(p.concurrency) || p.concurrency < 0)
    ) {
      v.error(
        `'concurrency' must be a non-negative integer (got ${p.concurrency})`,
      );
    }
    if (
      p.toleratedFailurePercentage !== undefined &&
      (p.toleratedFailurePercentage < 0 || p.toleratedFailurePercentage > 100)
    ) {
      v.error(
        `'toleratedFailurePercentage' must be between 0 and 100 (got ${p.toleratedFailurePercentage})`,
      );
    }
    if (!this.distributed) {
      const distributedOnly: [string, unknown][] = [
        ["batch", p.batch],
        ["toleratedFailurePercentage", p.toleratedFailurePercentage],
        ["toleratedFailureCount", p.toleratedFailureCount],
        ["childWorkflowType", p.childWorkflowType],
        ["results", p.results],
      ];
      for (const [field, value] of distributedOnly) {
        if (value !== undefined) {
          v.error(
            `'${field}' requires a Distributed Map (MapMode.DISTRIBUTED or MapItems.fromS3)`,
          );
        }
      }
    }
  }

  public build(
    scope: Construct,
    id: string,
    ctx: FlowWorkflowContext,
  ): BuiltState {
    const p = this.props;
    const processor = ctx.buildSteps(p.steps);
    const common = {
      comment: p.comment,
      assign: p.assign,
      outputs: p.output,
      maxConcurrency: p.concurrency,
      jsonataItemSelector: p.itemSelector,
      items:
        p.items._expression === undefined
          ? undefined
          : sfn.ProvideItems.jsonata(p.items._expression),
    };

    if (!this.distributed) {
      const state = sfn.Map.jsonata(scope, id, common);
      state.itemProcessor(processor);
      return { start: state, ends: [state], catchable: state };
    }

    const state = sfn.DistributedMap.jsonata(scope, id, {
      ...common,
      itemReader: p.items._s3 && itemReader(p.items._s3),
      mapExecutionType:
        this.childType === WorkflowType.STANDARD
          ? sfn.StateMachineType.STANDARD
          : sfn.StateMachineType.EXPRESS,
      itemBatcher:
        p.batch &&
        new sfn.ItemBatcher({
          maxItemsPerBatch: p.batch.maxItems,
          maxInputBytesPerBatch: p.batch.maxBytes,
        }),
      toleratedFailurePercentage: p.toleratedFailurePercentage,
      toleratedFailureCount: p.toleratedFailureCount,
      resultWriterV2:
        p.results &&
        new PrefixScopedResultWriter(
          p.results._s3.bucket ?? ctx.payload.bucket(),
          p.results._s3.prefix ?? `${ctx.payload.prefix}/map-results/${id}`,
        ),
    });
    state.itemProcessor(processor);
    return { start: state, ends: [state], catchable: state };
  }
}

/** A result writer whose grant covers only its prefix, not the whole bucket. */
class PrefixScopedResultWriter extends sfn.ResultWriterV2 {
  constructor(
    private readonly target: s3.IBucket,
    private readonly keyPrefix: string,
  ) {
    super({ bucket: target, prefix: keyPrefix });
  }

  public providePolicyStatements(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        actions: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListMultipartUploadParts",
          "s3:AbortMultipartUpload",
        ],
        resources: [
          this.target.arnForObjects(`${this.keyPrefix.replace(/\/+$/, "")}/*`),
        ],
      }),
    ];
  }
}

function itemReader(source: MapS3Source): sfn.IItemReader {
  const { bucket, key, prefix, maxItems } = source;
  if (key === undefined) {
    return new sfn.S3ObjectsItemReader({ bucket, prefix, maxItems });
  }
  switch (source.format ?? S3ItemFormat.JSON) {
    case S3ItemFormat.JSONL:
      return new sfn.S3JsonLItemReader({ bucket, key, maxItems });
    case S3ItemFormat.CSV:
      return new sfn.S3CsvItemReader({
        bucket,
        key,
        maxItems,
        csvHeaders: source.csvHeaders
          ? sfn.CsvHeaders.use(source.csvHeaders)
          : sfn.CsvHeaders.useFirstRow(),
      });
    case S3ItemFormat.MANIFEST:
      return new sfn.S3ManifestItemReader({ bucket, key, maxItems });
    default:
      return new sfn.S3JsonItemReader({ bucket, key, maxItems });
  }
}
