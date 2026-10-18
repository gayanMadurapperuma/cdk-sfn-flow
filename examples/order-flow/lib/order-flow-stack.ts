import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import { FlowWorkflow, Invoke, PayloadStrategy, Step, TaskPattern } from "cdk-sfn-flow";
import { Construct } from "constructs";
import * as path from "path";

/**
 * The order workflow from the README, with real Lambda handlers.
 *
 * Validate can return a payload larger than the 256 KB Step Functions limit
 * (`{"lineCount": 3000}`); PayloadStrategy.AUTO offloads it to S3.
 */
export class OrderFlowStack extends Stack {
  public readonly flow: FlowWorkflow;
  public readonly stockTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = (name: string) =>
      new nodejs.NodejsFunction(this, `${name}Fn`, {
        entry: path.join(__dirname, "..", "..", "lambda", `${name}.ts`),
        runtime: lambda.Runtime.NODEJS_22_X,
        memorySize: 256,
        timeout: Duration.seconds(30),
        bundling: { minify: true, externalModules: ["@aws-sdk/*"] },
      });

    const validateFn = handler("validate");
    const priceFn = handler("price");
    const notifyFn = handler("notify");

    this.stockTable = new dynamodb.Table(this, "Stock", {
      partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const alertTopic = new sns.Topic(this, "Alerts");

    this.flow = new FlowWorkflow(this, "OrderFlow", {
      payload: { strategy: PayloadStrategy.AUTO },
      defaults: { retry: { attempts: 3, backoffRate: 2 }, timeout: Duration.minutes(2) },
      alarms: { failed: true, topic: alertTopic },
      steps: [
        // sku is read by the DynamoDB branch, which cannot resolve S3 references.
        Step.task("Validate", { invoke: Invoke.lambda(validateFn), keepInline: ["sku"] }),
        Step.parallel("Enrich", {
          branches: [
            {
              name: "pricing",
              // Route and Ship read these fields, so they must stay inline.
              steps: [Step.task("GetPrice", { invoke: Invoke.lambda(priceFn), keepInline: ["orderId", "total"] })],
            },
            {
              name: "stock",
              steps: [
                Step.task("GetStock", {
                  invoke: Invoke.dynamoGet(
                    this.stockTable,
                    '{% { "Key": { "sku": { "S": $states.input.sku } } } %}',
                  ),
                }),
              ],
            },
          ],
          catchErrors: [{ errors: ["States.ALL"], next: "Failed" }],
        }),
        Step.choice("Route", {
          branches: [{ when: "{% $states.input.pricing.total > 1000 %}", next: "Approval" }],
          otherwise: "Ship",
        }),
        Step.task("Approval", {
          invoke: Invoke.lambda(notifyFn),
          pattern: TaskPattern.CALLBACK,
          timeout: Duration.days(2),
          next: "CoolOff",
        }),
        Step.wait("CoolOff", { seconds: 300 }),
        Step.task("Ship", {
          invoke: Invoke.eventBridge({
            source: "orders",
            detailType: "OrderReady",
            detailExpr: '{% { "orderId": $states.input.pricing.orderId, "total": $states.input.pricing.total } %}',
          }),
          next: "end",
        }),
        Step.fail("Failed", { error: "OrderFailed" }),
      ],
    });
  }
}
