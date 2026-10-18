import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

/**
 * Execution logging configuration.
 */
export interface LoggingConfig {
  /**
   * What to log. `LogLevel.OFF` disables logging and no log group is created.
   *
   * @default LogLevel.ERROR
   */
  readonly level?: sfn.LogLevel;

  /**
   * Include execution input and output in the logs.
   *
   * @default false
   */
  readonly includeData?: boolean;

  /**
   * Retention of the generated log group.
   *
   * @default RetentionDays.ONE_MONTH
   */
  readonly retention?: logs.RetentionDays;

  /**
   * Removal policy of the generated log group.
   *
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * Log to an existing log group instead of creating one.
   *
   * @default - a log group is created
   */
  readonly destination?: logs.ILogGroup;
}

/** The generated logging resources. */
export interface LoggingResult {
  readonly logGroup?: logs.ILogGroup;
  readonly logOptions?: sfn.LogOptions;
}

/**
 * Creates the log group and state machine log options.
 */
export function configureLogging(
  scope: Construct,
  config: LoggingConfig,
  name?: string,
): LoggingResult {
  const level = config.level ?? sfn.LogLevel.ERROR;
  if (level === sfn.LogLevel.OFF) {
    return {};
  }
  const logGroup =
    config.destination ??
    new logs.LogGroup(scope, "Logs", {
      // The vended-logs prefix avoids hitting the CloudWatch Logs resource policy size limit.
      logGroupName: name ? `/aws/vendedlogs/states/${name}` : undefined,
      retention: config.retention ?? logs.RetentionDays.ONE_MONTH,
      removalPolicy: config.removalPolicy ?? RemovalPolicy.RETAIN,
    });
  return {
    logGroup,
    logOptions: {
      destination: logGroup,
      level,
      includeExecutionData: config.includeData ?? false,
    },
  };
}

/**
 * CloudWatch alarms on the state machine's execution metrics.
 */
export interface AlarmsConfig {
  /**
   * Alarm on `ExecutionsFailed`.
   *
   * @default true
   */
  readonly failed?: boolean;

  /**
   * Alarm on `ExecutionsTimedOut`.
   *
   * @default true
   */
  readonly timedOut?: boolean;

  /**
   * Alarm on `ExecutionThrottled`.
   *
   * @default false
   */
  readonly throttled?: boolean;

  /**
   * Topic notified when an alarm fires. Without `defaults.catchErrors`, it also
   * receives a message from a generated catch-all before the execution fails.
   *
   * @default - no notifications
   */
  readonly topic?: sns.ITopic;

  /**
   * Metric period.
   *
   * @default Duration.minutes(5)
   */
  readonly period?: Duration;
}

/** State names of the generated global catch. */
export const GLOBAL_CATCH_NOTIFY = "FlowNotifyFailure";
export const GLOBAL_CATCH_FAIL = "FlowFailed";

/**
 * Creates `FlowNotifyFailure` (SNS publish of the error) followed by `FlowFailed`.
 */
export function createGlobalCatch(
  scope: Construct,
  topic: sns.ITopic,
  workflowName: string,
): sfn.State {
  const notify = tasks.SnsPublish.jsonata(scope, GLOBAL_CATCH_NOTIFY, {
    topic,
    subject: `Workflow ${workflowName} failed`.slice(0, 100),
    message: sfn.TaskInput.fromText(
      `{% $string({ "workflow": ${JSON.stringify(workflowName)}, "execution": $states.context.Execution.Id, "error": $states.input.Error, "cause": $states.input.Cause }) %}`,
    ),
    // Keep the error output for the Fail state.
    outputs: "{% $states.input %}",
  });
  const fail = sfn.Fail.jsonata(scope, GLOBAL_CATCH_FAIL, {
    error: "{% $states.input.Error %}",
    cause: "{% $states.input.Cause %}",
  });
  notify.next(fail);
  return notify;
}

/** Creates the configured alarms, with actions to the topic if given. */
export function createAlarms(
  scope: Construct,
  stateMachine: sfn.StateMachine,
  config: AlarmsConfig,
): cloudwatch.Alarm[] {
  const metricOptions = {
    period: config.period ?? Duration.minutes(5),
    statistic: cloudwatch.Stats.SUM,
  };
  const wanted: [boolean, string, cloudwatch.IMetric, string][] = [
    [
      config.failed ?? true,
      "FailedAlarm",
      stateMachine.metricFailed(metricOptions),
      "failed",
    ],
    [
      config.timedOut ?? true,
      "TimedOutAlarm",
      stateMachine.metricTimedOut(metricOptions),
      "timed out",
    ],
    [
      config.throttled ?? false,
      "ThrottledAlarm",
      stateMachine.metricThrottled(metricOptions),
      "were throttled",
    ],
  ];
  return wanted
    .filter(([enabled]) => enabled)
    .map(([, id, metric, what]) => {
      const alarm = new cloudwatch.Alarm(scope, id, {
        metric,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Executions of ${stateMachine.node.path} ${what}`,
      });
      if (config.topic) {
        alarm.addAlarmAction(new cloudwatchActions.SnsAction(config.topic));
      }
      return alarm;
    });
}
