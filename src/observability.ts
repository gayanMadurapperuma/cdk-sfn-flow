import { RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
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
