import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { IntegrationTask, integrationArn } from "./integration-task";
import type { InvokeBindOptions, InvokeTarget } from "./invoke";
import { TaskPattern } from "./task-pattern";
import { unwrap, wrap } from "../jsonata";

/** DynamoDB operations supported by `Invoke.dynamo*`. */
export enum DynamoOperation {
  GET = "getItem",
  PUT = "putItem",
  UPDATE = "updateItem",
  DELETE = "deleteItem",
  QUERY = "query",
}

const IAM_ACTIONS: Record<DynamoOperation, string> = {
  [DynamoOperation.GET]: "dynamodb:GetItem",
  [DynamoOperation.PUT]: "dynamodb:PutItem",
  [DynamoOperation.UPDATE]: "dynamodb:UpdateItem",
  [DynamoOperation.DELETE]: "dynamodb:DeleteItem",
  [DynamoOperation.QUERY]: "dynamodb:Query",
};

export class DynamoTarget implements InvokeTarget {
  public readonly supportedPatterns = [TaskPattern.REQUEST_RESPONSE];
  public readonly acceptsInput = false;
  public readonly name: string;
  public readonly expressions: { [field: string]: string };

  constructor(
    private readonly table: dynamodb.ITable,
    private readonly operation: DynamoOperation,
    private readonly paramsExpr: string,
  ) {
    this.name = `Invoke.dynamo${operation === DynamoOperation.QUERY ? "Query" : operation.replace("Item", "").replace(/^./, (c) => c.toUpperCase())}`;
    this.expressions = { paramsExpr };
  }

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    // getItem/putItem/updateItem/deleteItem have optimized integrations; query is only
    // available through the AWS SDK integration.
    const resource =
      this.operation === DynamoOperation.QUERY
        ? integrationArn("aws-sdk", "dynamodb:query")
        : integrationArn("dynamodb", this.operation);
    const resources =
      this.operation === DynamoOperation.QUERY
        ? [this.table.tableArn, `${this.table.tableArn}/index/*`]
        : [this.table.tableArn];
    return new IntegrationTask(scope, id, {
      ...options.state,
      resource,
      arguments: wrap(
        `$merge([{ "TableName": "${this.table.tableName}" }, (${unwrap(this.paramsExpr)})])`,
      ),
      policies: [
        new iam.PolicyStatement({
          actions: [IAM_ACTIONS[this.operation]],
          resources,
        }),
      ],
    });
  }
}
