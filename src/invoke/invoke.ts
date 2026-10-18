import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import {
  EcsRunTaskInvokeProps,
  EcsTarget,
  HttpInvokeOptions,
  HttpTarget,
  SdkInvokeProps,
  SdkTarget,
} from "./compute";
import { DynamoOperation, DynamoTarget } from "./dynamodb";
import { LambdaTarget } from "./lambda";
import {
  EventBridgeInvokeProps,
  EventBridgeTarget,
  SnsInvokeOptions,
  SnsTarget,
  SqsInvokeOptions,
  SqsTarget,
} from "./messaging";
import { TaskPattern } from "./task-pattern";
import type { StepValidator } from "../steps/builder";

/** State fields that every invoke passes through to the task state. */
export interface InvokeStateOptions {
  readonly comment?: string;
  readonly outputs?: string;
  readonly assign?: { [name: string]: string };
  readonly taskTimeout?: sfn.Timeout;
  readonly heartbeatTimeout?: sfn.Timeout;
}

/** Options for creating the task state of an invoke. */
export interface InvokeBindOptions {
  readonly pattern: TaskPattern;
  /** User JSONata input (`Step.task` `input`), if any. */
  readonly input?: string;
  readonly state: InvokeStateOptions;
}

/** Implementation of an invoke target. */
export interface InvokeTarget {
  /** Short name used in messages, e.g. `Invoke.lambda`. */
  readonly name: string;
  readonly supportedPatterns: TaskPattern[];
  /** Whether `Step.task` `input` applies to this target. */
  readonly acceptsInput: boolean;
  /** The Lambda function, for Lambda targets. */
  readonly lambdaFunction?: lambda.IFunction;
  /** JSONata fields of the target, for validation (`{% %}` checks, payload warnings). */
  readonly expressions: { [field: string]: string };
  /** Target-specific validation. */
  validate?(v: StepValidator): void;
  bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase;
}

/**
 * The service a `Step.task` calls.
 */
export class Invoke {
  /**
   * Invoke a Lambda function. The task output is the function's return value.
   */
  public static lambda(fn: lambda.IFunction): Invoke {
    return new Invoke(new LambdaTarget(fn));
  }

  /**
   * DynamoDB GetItem. `paramsExpr` is merged with `TableName`, e.g.
   * `{% { "Key": { "sku": { "S": $states.input.sku } } } %}`.
   */
  public static dynamoGet(table: dynamodb.ITable, paramsExpr: string): Invoke {
    return new Invoke(new DynamoTarget(table, DynamoOperation.GET, paramsExpr));
  }

  /** DynamoDB PutItem. `paramsExpr` is merged with `TableName`. */
  public static dynamoPut(table: dynamodb.ITable, paramsExpr: string): Invoke {
    return new Invoke(new DynamoTarget(table, DynamoOperation.PUT, paramsExpr));
  }

  /** DynamoDB UpdateItem. `paramsExpr` is merged with `TableName`. */
  public static dynamoUpdate(
    table: dynamodb.ITable,
    paramsExpr: string,
  ): Invoke {
    return new Invoke(
      new DynamoTarget(table, DynamoOperation.UPDATE, paramsExpr),
    );
  }

  /** DynamoDB DeleteItem. `paramsExpr` is merged with `TableName`. */
  public static dynamoDelete(
    table: dynamodb.ITable,
    paramsExpr: string,
  ): Invoke {
    return new Invoke(
      new DynamoTarget(table, DynamoOperation.DELETE, paramsExpr),
    );
  }

  /**
   * DynamoDB Query (through the AWS SDK integration). `paramsExpr` is merged with
   * `TableName`; Query is granted on the table and its indexes.
   */
  public static dynamoQuery(
    table: dynamodb.ITable,
    paramsExpr: string,
  ): Invoke {
    return new Invoke(
      new DynamoTarget(table, DynamoOperation.QUERY, paramsExpr),
    );
  }

  /** Sends an SQS message with a JSONata body. */
  public static sqs(
    queue: sqs.IQueue,
    bodyExpr: string,
    options: SqsInvokeOptions = {},
  ): Invoke {
    return new Invoke(new SqsTarget(queue, bodyExpr, options));
  }

  /** Publishes an SNS message with a JSONata body. */
  public static sns(
    topic: sns.ITopic,
    messageExpr: string,
    options: SnsInvokeOptions = {},
  ): Invoke {
    return new Invoke(new SnsTarget(topic, messageExpr, options));
  }

  /** Puts an EventBridge event with a JSONata detail. */
  public static eventBridge(props: EventBridgeInvokeProps): Invoke {
    return new Invoke(new EventBridgeTarget(props));
  }

  /** Runs an ECS task. Use `TaskPattern.SYNC` to wait for it to stop. */
  public static ecsRunTask(props: EcsRunTaskInvokeProps): Invoke {
    return new Invoke(new EcsTarget(props));
  }

  /**
   * Calls an HTTPS endpoint through an EventBridge connection.
   *
   * @param connection the connection that holds the credentials
   * @param url the https URL, or a JSONata expression
   * @param method the HTTP method, or a JSONata expression
   */
  public static http(
    connection: events.IConnection,
    url: string,
    method: string,
    options: HttpInvokeOptions = {},
  ): Invoke {
    return new Invoke(new HttpTarget(connection, url, method, options));
  }

  /** Calls any AWS API through the AWS SDK integration, granting exactly `service:Action`. */
  public static sdk(props: SdkInvokeProps): Invoke {
    return new Invoke(new SdkTarget(props));
  }

  /** @internal */
  public readonly _target: InvokeTarget;

  private constructor(target: InvokeTarget) {
    this._target = target;
  }
}
