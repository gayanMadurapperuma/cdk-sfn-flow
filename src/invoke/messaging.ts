import { Duration } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import type { InvokeBindOptions, InvokeTarget } from "./invoke";
import { withTaskToken } from "./lambda";
import { TaskPattern } from "./task-pattern";

const MESSAGING_PATTERNS = [TaskPattern.REQUEST_RESPONSE, TaskPattern.CALLBACK];

function integrationPattern(pattern: TaskPattern): sfn.IntegrationPattern {
  return pattern === TaskPattern.CALLBACK
    ? sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN
    : sfn.IntegrationPattern.REQUEST_RESPONSE;
}

/** Adds the task token to a JSONata message for callback tasks. */
function message(expr: string, pattern: TaskPattern): sfn.TaskInput {
  return sfn.TaskInput.fromText(
    pattern === TaskPattern.CALLBACK ? withTaskToken(expr) : expr,
  );
}

/**
 * Options for `Invoke.sqs`.
 */
export interface SqsInvokeOptions {
  /**
   * Message group id (FIFO queues).
   *
   * @default - none
   */
  readonly messageGroupId?: string;

  /**
   * Message deduplication id (FIFO queues without content-based deduplication).
   *
   * @default - none
   */
  readonly messageDeduplicationId?: string;

  /**
   * Delivery delay.
   *
   * @default - the queue's default delay
   */
  readonly delay?: Duration;
}

export class SqsTarget implements InvokeTarget {
  public readonly name = "Invoke.sqs";
  public readonly supportedPatterns = MESSAGING_PATTERNS;
  public readonly acceptsInput = false;
  public readonly expressions: { [field: string]: string };

  constructor(
    private readonly queue: sqs.IQueue,
    private readonly bodyExpr: string,
    private readonly options: SqsInvokeOptions,
  ) {
    this.expressions = { bodyExpr };
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    return tasks.SqsSendMessage.jsonata(scope, id, {
      ...options.state,
      ...this.options,
      queue: this.queue,
      messageBody: message(this.bodyExpr, options.pattern),
      integrationPattern: integrationPattern(options.pattern),
    });
  }
}

/**
 * Options for `Invoke.sns`.
 */
export interface SnsInvokeOptions {
  /**
   * Message subject (email subscriptions).
   *
   * @default - none
   */
  readonly subject?: string;

  /**
   * Message group id (FIFO topics).
   *
   * @default - none
   */
  readonly messageGroupId?: string;
}

export class SnsTarget implements InvokeTarget {
  public readonly name = "Invoke.sns";
  public readonly supportedPatterns = MESSAGING_PATTERNS;
  public readonly acceptsInput = false;
  public readonly expressions: { [field: string]: string };

  constructor(
    private readonly topic: sns.ITopic,
    private readonly messageExpr: string,
    private readonly options: SnsInvokeOptions,
  ) {
    this.expressions = { messageExpr };
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    return tasks.SnsPublish.jsonata(scope, id, {
      ...options.state,
      ...this.options,
      topic: this.topic,
      message: message(this.messageExpr, options.pattern),
      integrationPattern: integrationPattern(options.pattern),
    });
  }
}

/**
 * Properties for `Invoke.eventBridge`.
 */
export interface EventBridgeInvokeProps {
  /**
   * The event bus.
   *
   * @default - the account's default event bus
   */
  readonly bus?: events.IEventBus;

  /** The event source. */
  readonly source: string;

  /** The event detail type. */
  readonly detailType: string;

  /** JSONata expression for the event detail. */
  readonly detailExpr: string;
}

export class EventBridgeTarget implements InvokeTarget {
  public readonly name = "Invoke.eventBridge";
  public readonly supportedPatterns = MESSAGING_PATTERNS;
  public readonly acceptsInput = false;
  public readonly expressions: { [field: string]: string };

  constructor(private readonly props: EventBridgeInvokeProps) {
    this.expressions = { detailExpr: props.detailExpr };
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    return tasks.EventBridgePutEvents.jsonata(scope, id, {
      ...options.state,
      integrationPattern: integrationPattern(options.pattern),
      entries: [
        {
          eventBus: this.props.bus,
          source: this.props.source,
          detailType: this.props.detailType,
          detail: message(this.props.detailExpr, options.pattern),
        },
      ],
    });
  }
}
