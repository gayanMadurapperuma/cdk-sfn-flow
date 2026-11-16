import { Duration } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import jsonata from "jsonata";
import { fn, synth } from "./util";
import {
  Invoke,
  MapItems,
  PayloadStrategy,
  Step,
  TaskPattern,
  FlowWorkflow,
} from "../src";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Every `{% %}` expression in a definition, with the JSON path it was found at. */
function expressions(node: any, path = "$"): [string, string][] {
  if (typeof node === "string") {
    const match = /^\s*\{%([\s\S]*)%\}\s*$/.exec(node);
    return match ? [[path, match[1]]] : [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child, i) => expressions(child, `${path}[${i}]`));
  }
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, child]) =>
      expressions(child, `${path}.${key}`),
    );
  }
  return [];
}

/**
 * The library builds many expressions by concatenation (envelopes, task tokens,
 * TableName merges, parallel outputs, the global catch). A syntax error in one of them
 * only shows up when the state runs, so parse them all with the reference implementation.
 */
test("every generated JSONata expression parses", () => {
  const { asl } = synth((stack) => {
    const table = new dynamodb.Table(stack, "Table", {
      partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
    });
    const child = new FlowWorkflow(stack, "Child", {
      steps: [Step.pass("ChildPass")],
    });
    return {
      payload: { strategy: PayloadStrategy.AUTO },
      alarms: { topic: new sns.Topic(stack, "Alerts") },
      steps: [
        Step.task("Validate", {
          invoke: Invoke.lambda(fn(stack, "ValidateFn")),
          input: '{% { "order": $states.input.order } %}',
          keepInline: ["sku", "total"],
          assign: { sku: "{% $states.result.sku %}" },
        }),
        Step.parallel("Enrich", {
          output: '{% { "sku": $sku } %}',
          branches: [
            {
              name: "stock",
              steps: [
                Step.task("GetStock", {
                  invoke: Invoke.dynamoGet(
                    table,
                    '{% { "Key": { "sku": { "S": $sku } } } %}',
                  ),
                }),
              ],
            },
            {
              name: "history",
              steps: [
                Step.task("Query", {
                  invoke: Invoke.dynamoQuery(
                    table,
                    '{% { "KeyConditionExpression": "sku = :s", "ExpressionAttributeValues": { ":s": { "S": $sku } } } %}',
                  ),
                }),
              ],
            },
          ],
        }),
        Step.map("Each", {
          items: MapItems.fromExpr("{% $states.input.history.Items %}"),
          itemSelector: '{% { "item": $states.context.Map.Item.Value } %}',
          steps: [Step.pass("Keep", { output: "{% $states.input.item %}" })],
        }),
        Step.choice("Route", {
          branches: [
            {
              when: "{% $count($states.input) > 10 %}",
              next: "Approval",
              output: '{% { "items": $states.input } %}',
            },
          ],
          otherwise: "Queue",
        }),
        Step.task("Approval", {
          invoke: Invoke.lambda(fn(stack, "ApproveFn")),
          pattern: TaskPattern.CALLBACK,
          timeout: Duration.hours(1),
        }),
        Step.task("Queue", {
          invoke: Invoke.sqs(
            new sqs.Queue(stack, "Queue"),
            '{% { "sku": $sku } %}',
          ),
          pattern: TaskPattern.CALLBACK,
          timeout: Duration.hours(1),
        }),
        Step.wait("Pause", { secondsExpr: "{% $states.input.delay %}" }),
        Step.subflow("Run", { workflow: child }),
        Step.succeed("Done", { output: '{% { "sku": $sku } %}' }),
      ],
    };
  });

  const found = expressions(asl);
  // The envelope, the hoisted output, the token merge, the TableName merge, the parallel
  // output and the global catch are all in there.
  expect(found.length).toBeGreaterThan(15);
  for (const [path, source] of found) {
    expect(() => jsonata(source)).not.toThrow();
    // Keeps the failing expression visible when the assertion above fails.
    expect([path, typeof jsonata(source).evaluate]).toEqual([path, "function"]);
  }
});

test("the Dynamo merge keeps the table name the role was granted", async () => {
  const { asl } = synth((stack) => ({
    steps: [
      Step.task("Get", {
        invoke: Invoke.dynamoGet(
          new dynamodb.Table(stack, "Table", {
            partitionKey: { name: "sku", type: dynamodb.AttributeType.STRING },
          }),
          '{% { "TableName": "SomeOtherTable", "Key": { "sku": { "S": "a" } } } %}',
        ),
      }),
    ],
  }));
  const [[, source]] = expressions(asl.States.Get.Arguments);
  const result = await jsonata(source).evaluate({});
  expect(result.TableName).toMatch(/^\$\{Table\w+\}$/);
  expect(result.Key).toEqual({ sku: { S: "a" } });
});

test("the hoisted output and the envelope evaluate as documented", async () => {
  const { asl } = synth((stack) => ({
    name: "orders",
    payload: { strategy: PayloadStrategy.S3 },
    steps: [
      Step.task("Score", {
        invoke: Invoke.lambda(fn(stack, "Fn")),
        keepInline: ["status"],
      }),
    ],
  }));
  const bindings = {
    states: {
      input: { order: 1 },
      context: { Execution: { Name: "exec-1" }, State: { Name: "Score" } },
      result: {
        $flowRef: { bucket: "b", key: "k", size: 1 },
        $keep: { status: "ok" },
      },
    },
  };
  const [[, args]] = expressions(asl.States.Score.Arguments);
  await expect(jsonata(args).evaluate({}, bindings)).resolves.toEqual({
    $flow: {
      prefix: "flow/orders",
      execution: "exec-1",
      step: "Score",
      keepInline: ["status"],
      bucket: expect.stringMatching(/^\$\{FlowPayloadBucket\w+\}$/),
      mode: "s3",
    },
    data: { order: 1 },
  });
  const [[, output]] = expressions(asl.States.Score.Output);
  await expect(jsonata(output).evaluate({}, bindings)).resolves.toEqual({
    status: "ok",
    $flowRef: { bucket: "b", key: "k", size: 1 },
  });
});
