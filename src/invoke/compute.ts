import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { IntegrationTask, integrationArn } from "./integration-task";
import type { InvokeBindOptions, InvokeTarget } from "./invoke";
import { TaskPattern } from "./task-pattern";
import { isExpression } from "../jsonata";
import type { StepValidator } from "../steps/builder";

/**
 * Properties for `Invoke.ecsRunTask`.
 */
export interface EcsRunTaskInvokeProps {
  /** The cluster to run the task on. */
  readonly cluster: ecs.ICluster;

  /** The task definition to run. */
  readonly taskDefinition: ecs.TaskDefinition;

  /**
   * Where to run the task.
   *
   * @default - Fargate, latest platform version
   */
  readonly launchTarget?: tasks.IEcsLaunchTarget;

  /**
   * Subnets for awsvpc networking.
   *
   * @default - private subnets of the cluster's VPC
   */
  readonly subnets?: ec2.SubnetSelection;

  /**
   * Security groups for awsvpc networking.
   *
   * @default - a new security group
   */
  readonly securityGroups?: ec2.ISecurityGroup[];

  /**
   * Assign a public IP address (Fargate).
   *
   * @default false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Container overrides. Environment values may be JSONata expressions.
   *
   * @default - none
   */
  readonly containerOverrides?: tasks.ContainerOverride[];
}

export class EcsTarget implements InvokeTarget {
  public readonly name = "Invoke.ecsRunTask";
  public readonly supportedPatterns = [
    TaskPattern.REQUEST_RESPONSE,
    TaskPattern.SYNC,
  ];
  public readonly acceptsInput = false;
  public readonly expressions = {};

  constructor(private readonly props: EcsRunTaskInvokeProps) {}

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    return tasks.EcsRunTask.jsonata(scope, id, {
      ...options.state,
      ...this.props,
      launchTarget:
        this.props.launchTarget ??
        new tasks.EcsFargateLaunchTarget({
          platformVersion: ecs.FargatePlatformVersion.LATEST,
        }),
      integrationPattern:
        options.pattern === TaskPattern.SYNC
          ? sfn.IntegrationPattern.RUN_JOB
          : sfn.IntegrationPattern.REQUEST_RESPONSE,
    });
  }
}

/**
 * Options for `Invoke.http`. Values may be literals or JSONata expressions.
 */
export interface HttpInvokeOptions {
  /**
   * Path appended to the URL (after a `/`).
   *
   * @default - the last path segment of `url`
   */
  readonly path?: string;

  /**
   * Request body.
   *
   * @default - no body
   */
  readonly body?: string;

  /**
   * Request headers (a JSONata expression that evaluates to an object).
   *
   * @default - no extra headers
   */
  readonly headers?: string;

  /**
   * Query parameters (a JSONata expression that evaluates to an object).
   *
   * @default - none
   */
  readonly queryParameters?: string;
}

export class HttpTarget implements InvokeTarget {
  public readonly name = "Invoke.http";
  public readonly supportedPatterns = [TaskPattern.REQUEST_RESPONSE];
  public readonly acceptsInput = false;
  public readonly expressions: { [field: string]: string };

  constructor(
    private readonly connection: events.IConnection,
    private readonly url: string,
    private readonly method: string,
    private readonly options: HttpInvokeOptions,
  ) {
    const expressions: { [field: string]: string } = {};
    for (const [field, value] of Object.entries({
      body: options.body,
      headers: options.headers,
      queryParameters: options.queryParameters,
    })) {
      if (value !== undefined) expressions[field] = value;
    }
    this.expressions = expressions;
  }

  public validate(v: StepValidator): void {
    if (!isExpression(this.url) && !/^https:\/\//.test(this.url)) {
      v.error(`Invoke.http url must start with https:// (got '${this.url}')`);
    }
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    const [apiRoot, apiEndpoint] = this.splitUrl();
    return tasks.HttpInvoke.jsonata(scope, id, {
      ...options.state,
      connection: this.connection,
      apiRoot,
      apiEndpoint: sfn.TaskInput.fromText(apiEndpoint),
      method: sfn.TaskInput.fromText(this.method),
      body:
        this.options.body === undefined
          ? undefined
          : sfn.TaskInput.fromText(this.options.body),
      headers:
        this.options.headers === undefined
          ? undefined
          : sfn.TaskInput.fromText(this.options.headers),
      queryStringParameters:
        this.options.queryParameters === undefined
          ? undefined
          : sfn.TaskInput.fromText(this.options.queryParameters),
    });
  }

  /** CDK joins `apiRoot` and `apiEndpoint` with `/`, so split a literal URL at its last segment. */
  private splitUrl(): [string, string] {
    if (this.options.path !== undefined || isExpression(this.url)) {
      return [this.url.replace(/\/+$/, ""), this.options.path ?? ""];
    }
    const trimmed = this.url.replace(/\/+$/, "");
    const slash = trimmed.lastIndexOf("/");
    return slash > "https://".length
      ? [trimmed.slice(0, slash), trimmed.slice(slash + 1)]
      : [trimmed, ""];
  }
}

/**
 * Properties for `Invoke.sdk`.
 */
export interface SdkInvokeProps {
  /** The AWS SDK service name, lower case (e.g. `s3`, `dynamodb`, `secretsmanager`). */
  readonly service: string;

  /** The API action, camelCase as in the SDK (e.g. `getObject`). */
  readonly action: string;

  /** Resource ARNs the action is granted on. */
  readonly iamResources: string[];

  /**
   * JSONata expression for the API parameters.
   *
   * @default - no parameters
   */
  readonly paramsExpr?: string;

  /**
   * The IAM action, when it does not follow `service:Action`.
   *
   * @default - `<service>:<Action>`
   */
  readonly iamAction?: string;
}

export class SdkTarget implements InvokeTarget {
  public readonly name = "Invoke.sdk";
  public readonly supportedPatterns = [TaskPattern.REQUEST_RESPONSE];
  public readonly acceptsInput = false;
  public readonly expressions: { [field: string]: string };

  constructor(private readonly props: SdkInvokeProps) {
    this.expressions =
      props.paramsExpr === undefined ? {} : { paramsExpr: props.paramsExpr };
  }

  public get iamAction(): string {
    const { service, action } = this.props;
    return (
      this.props.iamAction ??
      `${service}:${action.charAt(0).toUpperCase()}${action.slice(1)}`
    );
  }

  public validate(v: StepValidator): void {
    if (!/^[a-z0-9]+$/.test(this.props.service)) {
      v.error(
        `Invoke.sdk service must be the lower-case SDK service name (got '${this.props.service}')`,
      );
    }
    if (!/^[a-z][a-zA-Z0-9]*$/.test(this.props.action)) {
      v.error(
        `Invoke.sdk action must be the camelCase SDK action (got '${this.props.action}')`,
      );
    }
    if (this.props.iamResources.length === 0) {
      v.error("Invoke.sdk needs at least one entry in 'iamResources'");
    }
    if (this.props.iamResources.includes("*")) {
      v.warn(
        "SdkWildcardResource",
        `Invoke.sdk grants ${this.iamAction} on '*'; scope 'iamResources' unless the action requires it`,
      );
    }
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    return new IntegrationTask(scope, id, {
      ...options.state,
      resource: integrationArn(
        "aws-sdk",
        `${this.props.service}:${this.props.action}`,
      ),
      arguments: this.props.paramsExpr ?? {},
      policies: [
        new iam.PolicyStatement({
          actions: [this.iamAction],
          resources: this.props.iamResources,
        }),
      ],
    });
  }
}
