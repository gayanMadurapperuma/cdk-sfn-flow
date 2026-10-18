import { Aws } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import type { InvokeStateOptions } from "./invoke";

/** Properties for `IntegrationTask`. */
export interface IntegrationTaskProps extends InvokeStateOptions {
  /** The integration resource ARN, e.g. `arn:aws:states:::dynamodb:getItem`. */
  readonly resource: string;
  /** JSONata arguments (an expression string or an object). */
  readonly arguments: unknown;
  /** Least-privilege statements registered on the state machine role. */
  readonly policies: iam.PolicyStatement[];
}

/**
 * A JSONata task whose arguments are a single expression. CDK's typed task constructs
 * only accept per-field values, so integrations that take a whole-parameters expression
 * (DynamoDB, AWS SDK) use this chainable. It registers exactly the given IAM statements.
 */
export class IntegrationTask extends sfn.TaskStateBase {
  protected readonly taskMetrics?: sfn.TaskMetricsConfig;
  protected readonly taskPolicies?: iam.PolicyStatement[];

  constructor(
    scope: Construct,
    id: string,
    private readonly props: IntegrationTaskProps,
  ) {
    super(scope, id, { ...props, queryLanguage: sfn.QueryLanguage.JSONATA });
    this.taskPolicies = props.policies;
  }

  protected _renderTask(): unknown {
    return { Resource: this.props.resource, Arguments: this.props.arguments };
  }
}

/** The ARN of a Step Functions service integration. */
export function integrationArn(
  service: string,
  api: string,
  suffix = "",
): string {
  return `arn:${Aws.PARTITION}:states:::${service}:${api}${suffix}`;
}
