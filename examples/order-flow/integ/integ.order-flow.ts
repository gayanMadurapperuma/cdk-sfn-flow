import { App, Duration } from "aws-cdk-lib";
import { ExpectedResult, IntegTest } from "@aws-cdk/integ-tests-alpha";
import { OrderFlowStack } from "../lib/order-flow-stack";

/**
 * Deploys the example and runs one order whose validated payload (~480 KB) exceeds the
 * 256 KB Step Functions limit, so PayloadStrategy.AUTO must offload it to S3.
 */
const app = new App();
const stack = new OrderFlowStack(app, "OrderFlowInteg");
const integ = new IntegTest(app, "OrderFlowIntegTest", { testCases: [stack] });

const seed = integ.assertions.awsApiCall("DynamoDB", "putItem", {
  TableName: stack.stockTable.tableName,
  Item: { sku: { S: "SKU-1" }, quantity: { N: "50" } },
});

const start = integ.assertions.awsApiCall("SFN", "startExecution", {
  stateMachineArn: stack.flow.stateMachine.stateMachineArn,
  input: JSON.stringify({ orderId: "order-1", sku: "SKU-1", quantity: 2, lineCount: 4000 }),
});
seed.next(start);

const status = integ.assertions
  .awsApiCall("SFN", "describeExecution", { executionArn: start.getAttString("executionArn") })
  .expect(ExpectedResult.objectLike({ status: "SUCCEEDED" }))
  .waitForAssertions({ totalTimeout: Duration.minutes(5), interval: Duration.seconds(10) });
start.next(status);
