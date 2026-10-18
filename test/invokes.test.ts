import { SecretValue, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { newStack, synth, warningsFor } from "./util";
import { FlowWorkflow, Invoke, Step, TaskPattern } from "../src";

/* eslint-disable @typescript-eslint/no-explicit-any */

function table(stack: Stack): dynamodb.Table {
  return new dynamodb.Table(stack, "Table", {
    partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
  });
}

/** All statements of the state machine role policy. */
function statements(template: Template): any[] {
  const policies = template.findResources("AWS::IAM::Policy");
  return Object.values(policies).flatMap(
    (p: any) => p.Properties.PolicyDocument.Statement,
  );
}

function tableArn(template: Template) {
  const id = Object.keys(template.findResources("AWS::DynamoDB::Table"))[0];
  return { "Fn::GetAtt": [id, "Arn"] };
}

describe("DynamoDB invokes", () => {
  const KEY = '{% { "Key": { "sku": { "S": $states.input.sku } } } %}';

  test.each([
    ["dynamoGet", "getItem", "dynamodb:GetItem"],
    ["dynamoPut", "putItem", "dynamodb:PutItem"],
    ["dynamoUpdate", "updateItem", "dynamodb:UpdateItem"],
    ["dynamoDelete", "deleteItem", "dynamodb:DeleteItem"],
  ])(
    "%s uses the optimized integration with exactly %s",
    (factory, api, action) => {
      const { asl, template } = synth((stack) => ({
        steps: [
          Step.task("T", {
            invoke: (Invoke as any)[factory](table(stack), KEY),
          }),
        ],
      }));
      expect(asl.States.T.Resource).toBe(
        `arn:\${AWS::Partition}:states:::dynamodb:${api}`,
      );
      expect(asl.States.T.Arguments).toMatch(
        /^\{% \$merge\(\[\{ "TableName": "\$\{Table\w+\}" \}, \(\{ "Key": \{ "sku": \{ "S": \$states\.input\.sku \} \} \}\)\]\) %\}$/,
      );
      expect(asl.States.T.Retry).toBeDefined();
      expect(statements(template)).toContainEqual({
        Action: action,
        Effect: "Allow",
        Resource: tableArn(template),
      });
    },
  );

  test("dynamoQuery uses the SDK integration and grants Query on the table and its indexes", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.task("Q", {
          invoke: Invoke.dynamoQuery(
            table(stack),
            '{% { "KeyConditionExpression": "sku = :s", "ExpressionAttributeValues": { ":s": { "S": $states.input.sku } } } %}',
          ),
        }),
      ],
    }));
    expect(asl.States.Q.Resource).toBe(
      "arn:${AWS::Partition}:states:::aws-sdk:dynamodb:query",
    );
    expect(statements(template)).toContainEqual({
      Action: "dynamodb:Query",
      Effect: "Allow",
      Resource: [
        tableArn(template),
        { "Fn::Join": ["", [tableArn(template), "/index/*"]] },
      ],
    });
  });
});

describe("messaging invokes", () => {
  test("sqs sends a JSONata body; CALLBACK merges the task token", () => {
    const { asl, template } = synth((stack) => {
      const queue = new sqs.Queue(stack, "Queue");
      return {
        steps: [
          Step.task("Send", {
            invoke: Invoke.sqs(queue, "{% $states.input %}", {
              messageGroupId: "g",
            }),
          }),
          Step.task("Wait", {
            invoke: Invoke.sqs(queue, "{% $states.input.order %}"),
            pattern: TaskPattern.CALLBACK,
            heartbeat: undefined,
          }),
        ],
      };
    });
    expect(asl.States.Send.Resource).toBe(
      "arn:${AWS::Partition}:states:::sqs:sendMessage",
    );
    expect(asl.States.Send.Arguments).toMatchObject({
      MessageBody: "{% $states.input %}",
      MessageGroupId: "g",
    });
    expect(asl.States.Wait.Resource).toBe(
      "arn:${AWS::Partition}:states:::sqs:sendMessage.waitForTaskToken",
    );
    expect(asl.States.Wait.Arguments.MessageBody).toBe(
      '{% $merge([($states.input.order), { "taskToken": $states.context.Task.Token }]) %}',
    );
    expect(statements(template)).toContainEqual(
      expect.objectContaining({
        Action: "sqs:SendMessage",
        Resource: { "Fn::GetAtt": [expect.stringMatching(/^Queue/), "Arn"] },
      }),
    );
  });

  test("sns publishes a JSONata message", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.task("Notify", {
          invoke: Invoke.sns(
            new sns.Topic(stack, "Topic"),
            "{% $string($states.input) %}",
            { subject: "Order" },
          ),
        }),
      ],
    }));
    expect(asl.States.Notify.Resource).toBe(
      "arn:${AWS::Partition}:states:::sns:publish",
    );
    expect(asl.States.Notify.Arguments).toMatchObject({
      Message: "{% $string($states.input) %}",
      Subject: "Order",
    });
    expect(statements(template)).toContainEqual(
      expect.objectContaining({
        Action: "sns:Publish",
        Resource: { Ref: expect.stringMatching(/^Topic/) },
      }),
    );
  });

  test("eventBridge puts an event on the default or a custom bus", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.task("Ship", {
          invoke: Invoke.eventBridge({
            source: "orders",
            detailType: "OrderReady",
            detailExpr: "{% $states.input %}",
          }),
        }),
        Step.task("Audit", {
          invoke: Invoke.eventBridge({
            bus: new events.EventBus(stack, "Bus"),
            source: "orders",
            detailType: "Audit",
            detailExpr: "{% $states.input %}",
          }),
        }),
      ],
    }));
    expect(asl.States.Ship.Resource).toBe(
      "arn:${AWS::Partition}:states:::events:putEvents",
    );
    expect(asl.States.Ship.Arguments.Entries[0]).toMatchObject({
      Source: "orders",
      DetailType: "OrderReady",
      Detail: "{% $states.input %}",
    });
    const puts = statements(template).filter(
      (s) => s.Action === "events:PutEvents",
    );
    expect(puts).toHaveLength(2);
    expect(JSON.stringify(puts[0].Resource)).toContain("event-bus/default");
    expect(puts[1].Resource).toEqual({
      "Fn::GetAtt": [expect.stringMatching(/^Bus/), "Arn"],
    });
  });
});

describe("compute and API invokes", () => {
  test("ecsRunTask supports REQUEST_RESPONSE and SYNC", () => {
    const { asl, template } = synth((stack) => {
      const cluster = new ecs.Cluster(stack, "Cluster", {
        vpc: new ec2.Vpc(stack, "Vpc", { natGateways: 0 }),
      });
      const taskDefinition = new ecs.FargateTaskDefinition(stack, "TaskDef");
      taskDefinition.addContainer("app", {
        image: ecs.ContainerImage.fromRegistry(
          "public.ecr.aws/docker/library/busybox",
        ),
      });
      return {
        steps: [
          Step.task("Run", {
            invoke: Invoke.ecsRunTask({
              cluster,
              taskDefinition,
              assignPublicIp: true,
            }),
            pattern: TaskPattern.SYNC,
          }),
        ],
      };
    });
    expect(asl.States.Run.Resource).toBe(
      "arn:${AWS::Partition}:states:::ecs:runTask.sync",
    );
    expect(asl.States.Run.Arguments.LaunchType).toBe("FARGATE");
    expect(statements(template).map((s) => s.Action)).toEqual(
      expect.arrayContaining([
        "ecs:RunTask",
        ["ecs:StopTask", "ecs:DescribeTasks"],
        "iam:PassRole",
      ]),
    );
  });

  test("http calls an endpoint through a connection", () => {
    const { asl, template } = synth((stack) => {
      const connection = new events.Connection(stack, "Conn", {
        authorization: events.Authorization.apiKey(
          "x-api-key",
          SecretValue.unsafePlainText("k"),
        ),
      });
      return {
        steps: [
          Step.task("Call", {
            invoke: Invoke.http(
              connection,
              "https://api.example.com/v1/orders",
              "POST",
              { body: "{% $states.input %}" },
            ),
          }),
        ],
      };
    });
    expect(asl.States.Call.Resource).toBe(
      "arn:${AWS::Partition}:states:::http:invoke",
    );
    expect(asl.States.Call.Arguments).toMatchObject({
      ApiEndpoint: "{% 'https://api.example.com/v1' & '/' & 'orders' %}",
      Method: "POST",
      RequestBody: "{% $states.input %}",
    });
    // AWS requires '*' for states:InvokeHTTPEndpoint; it is scoped by the endpoint condition.
    expect(statements(template)).toContainEqual(
      expect.objectContaining({
        Action: "states:InvokeHTTPEndpoint",
        Resource: "*",
        Condition: {
          StringLike: { "states:HTTPEndpoint": "https://api.example.com/v1*" },
        },
      }),
    );
  });

  test("http with an explicit path or a bare host", () => {
    const { asl } = synth((stack) => {
      const connection = new events.Connection(stack, "Conn", {
        authorization: events.Authorization.apiKey(
          "x-api-key",
          SecretValue.unsafePlainText("k"),
        ),
      });
      return {
        steps: [
          Step.task("A", {
            invoke: Invoke.http(connection, "https://api.example.com/", "GET", {
              path: "{% $states.input.id %}",
            }),
          }),
          Step.task("B", {
            invoke: Invoke.http(connection, "https://api.example.com", "GET"),
          }),
        ],
      };
    });
    expect(asl.States.A.Arguments.ApiEndpoint).toBe(
      "{% 'https://api.example.com' & '/' & $states.input.id %}",
    );
    expect(asl.States.B.Arguments.ApiEndpoint).toBe(
      "{% 'https://api.example.com' & '/' & '' %}",
    );
  });

  test("http rejects non-https URLs", () => {
    const stack = newStack();
    const connection = new events.Connection(stack, "Conn", {
      authorization: events.Authorization.apiKey(
        "x-api-key",
        SecretValue.unsafePlainText("k"),
      ),
    });
    expect(
      () =>
        new FlowWorkflow(stack, "Flow", {
          steps: [
            Step.task("A", {
              invoke: Invoke.http(connection, "http://x", "GET"),
            }),
          ],
        }),
    ).toThrow("A: Invoke.http url must start with https://");
  });

  test("sdk grants exactly service:Action on iamResources", () => {
    const { asl, template } = synth(() => ({
      steps: [
        Step.task("Get", {
          invoke: Invoke.sdk({
            service: "s3",
            action: "getObject",
            iamResources: ["arn:aws:s3:::bucket/*"],
            paramsExpr:
              '{% { "Bucket": "bucket", "Key": $states.input.key } %}',
          }),
        }),
        Step.task("List", {
          invoke: Invoke.sdk({
            service: "sfn",
            action: "listStateMachines",
            iamAction: "states:ListStateMachines",
            iamResources: ["*"],
          }),
        }),
      ],
    }));
    expect(asl.States.Get.Resource).toBe(
      "arn:${AWS::Partition}:states:::aws-sdk:s3:getObject",
    );
    expect(asl.States.Get.Arguments).toBe(
      '{% { "Bucket": "bucket", "Key": $states.input.key } %}',
    );
    expect(asl.States.List.Arguments).toEqual({});
    expect(statements(template)).toContainEqual({
      Action: "s3:GetObject",
      Effect: "Allow",
      Resource: "arn:aws:s3:::bucket/*",
    });
    expect(statements(template)).toContainEqual({
      Action: "states:ListStateMachines",
      Effect: "Allow",
      Resource: "*",
    });
  });

  test("sdk validation", () => {
    const { stack } = synth(() => ({
      steps: [
        Step.task("List", {
          invoke: Invoke.sdk({
            service: "s3",
            action: "listBuckets",
            iamResources: ["*"],
          }),
        }),
      ],
    }));
    expect(warningsFor(stack, "SdkWildcardResource")).toHaveLength(1);

    const bad = newStack();
    expect(
      () =>
        new FlowWorkflow(bad, "Flow", {
          steps: [
            Step.task("X", {
              invoke: Invoke.sdk({
                service: "S3",
                action: "GetObject",
                iamResources: [],
              }),
            }),
          ],
        }),
    ).toThrow(
      /lower-case SDK service name[\s\S]*camelCase SDK action[\s\S]*at least one entry/,
    );
  });

  test("non-Lambda invokes reject 'input' and unsupported patterns", () => {
    const stack = newStack();
    const topic = new sns.Topic(stack, "Topic");
    expect(
      () =>
        new FlowWorkflow(stack, "Flow", {
          steps: [
            Step.task("A", {
              invoke: Invoke.sns(topic, "{% 1 %}"),
              input: "{% 1 %}",
            }),
            Step.task("B", {
              invoke: Invoke.dynamoGet(table(stack), "{% {} %}"),
              pattern: TaskPattern.CALLBACK,
            }),
          ],
        }),
    ).toThrow(
      /A: Invoke.sns does not take 'input'[\s\S]*B: Invoke.dynamoGet does not support TaskPattern.CALLBACK/,
    );
  });
});

test("the state machine role only gets statements for referenced resources", () => {
  const { template } = synth((stack) => ({
    steps: [
      Step.task("Get", { invoke: Invoke.dynamoGet(table(stack), "{% {} %}") }),
    ],
  }));
  const actions = statements(template).map((s) => s.Action);
  expect(actions).toContain("dynamodb:GetItem");
  expect(actions.flat()).not.toContain("dynamodb:*");
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({ Action: "dynamodb:GetItem" }),
      ]),
    },
  });
});
