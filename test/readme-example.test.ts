import { Duration } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import { fn, newStack } from "./util";
import {
  FlowWorkflow,
  Invoke,
  PayloadStrategy,
  Step,
  TaskPattern,
} from "../src";

/** The example from the README, kept in sync by this test. */
function readmeExample() {
  const stack = newStack();
  const validateFn = fn(stack, "Validate");
  const priceFn = fn(stack, "Price");
  const notifyFn = fn(stack, "Notify");
  const stockTable = new dynamodb.Table(stack, "Stock", {
    partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
  });
  const alertTopic = new sns.Topic(stack, "Alerts");

  // --- README example start ---
  new FlowWorkflow(stack, "OrderFlow", {
    payload: { strategy: PayloadStrategy.AUTO },
    defaults: {
      retry: { attempts: 3, backoffRate: 2 },
      timeout: Duration.minutes(2),
    },
    alarms: { failed: true, topic: alertTopic },
    steps: [
      Step.task("Validate", {
        invoke: Invoke.lambda(validateFn),
        keepInline: ["sku"],
      }),
      Step.parallel("Enrich", {
        branches: [
          {
            name: "pricing",
            steps: [
              Step.task("GetPrice", {
                invoke: Invoke.lambda(priceFn),
                keepInline: ["total"],
              }),
            ],
          },
          {
            name: "stock",
            steps: [
              Step.task("GetStock", {
                invoke: Invoke.dynamoGet(
                  stockTable,
                  '{% { "Key": { "sku": { "S": $states.input.sku } } } %}',
                ),
              }),
            ],
          },
        ],
        catchErrors: [{ errors: ["States.ALL"], next: "Failed" }],
      }),
      Step.choice("Route", {
        branches: [
          {
            when: "{% $states.input.pricing.total > 1000 %}",
            next: "Approval",
          },
        ],
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
          detailExpr: "{% $states.input %}",
        }),
        next: "end",
      }),
      Step.fail("Failed", { error: "OrderFailed" }),
    ],
  });
  // --- README example end ---
  return stack;
}

test("README example synthesises", () => {
  const stack = readmeExample();
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::CloudWatch::Alarm", 2);
  // Ship sends the whole input (which may hold S3 references) to EventBridge: the only warning.
  const warnings = Annotations.fromStack(stack).findWarning(
    "*",
    Match.stringLikeRegexp("cdk-sfn-flow:"),
  );
  expect(warnings.map((w) => String(w.entry.data))).toEqual([
    expect.stringContaining(
      "Ship: Invoke.eventBridge cannot resolve S3 references",
    ),
  ]);
  expect(template.toJSON()).toMatchSnapshot();
});
