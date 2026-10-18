import { Template } from "aws-cdk-lib/assertions";
import * as s3 from "aws-cdk-lib/aws-s3";
import { fn, newStack, synth } from "./util";
import {
  FlowWorkflow,
  Invoke,
  MapItems,
  MapMode,
  MapResults,
  S3ItemFormat,
  Step,
  TaskPattern,
  WorkflowType,
} from "../src";

/* eslint-disable @typescript-eslint/no-explicit-any */

function statements(template: Template): any[] {
  return Object.values(template.findResources("AWS::IAM::Policy")).flatMap(
    (p: any) => p.Properties.PolicyDocument.Statement,
  );
}

describe("inline map", () => {
  test("MapItems.fromExpr selects an inline Map in AUTO mode", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.map("Each", {
          items: MapItems.fromExpr("{% $states.input.items %}"),
          itemSelector: '{% { "item": $states.context.Map.Item.Value } %}',
          concurrency: 5,
          steps: [
            Step.task("Process", { invoke: Invoke.lambda(fn(stack, "Fn")) }),
          ],
        }),
      ],
    }));
    expect(asl.States.Each).toMatchObject({
      Type: "Map",
      Items: "{% $states.input.items %}",
      ItemSelector: '{% { "item": $states.context.Map.Item.Value } %}',
      MaxConcurrency: 5,
      ItemProcessor: {
        ProcessorConfig: { Mode: "INLINE" },
        StartAt: "Process",
      },
      End: true,
    });
    expect(asl.States.Each.Retry).toHaveLength(1);
    template.resourceCountIs("AWS::S3::Bucket", 0);
  });

  test("distributed-only options are rejected", () => {
    expect(
      () =>
        new FlowWorkflow(newStack(), "Flow", {
          steps: [
            Step.map("M", {
              items: MapItems.fromExpr("{% $states.input %}"),
              batch: { maxItems: 10 },
              results: MapResults.S3,
              steps: [Step.pass("P")],
            }),
          ],
        }),
    ).toThrow(
      /'batch' requires a Distributed Map[\s\S]*'results' requires a Distributed Map/,
    );
  });
});

describe("distributed map", () => {
  test.each([
    [S3ItemFormat.JSON, { InputType: "JSON" }],
    [S3ItemFormat.JSONL, { InputType: "JSONL" }],
    [S3ItemFormat.CSV, { InputType: "CSV", CSVHeaderLocation: "FIRST_ROW" }],
    [S3ItemFormat.MANIFEST, { InputType: "MANIFEST" }],
  ])(
    "MapItems.fromS3 with %s selects a DistributedMap with the matching reader",
    (format, config) => {
      const { asl, template } = synth((stack) => ({
        steps: [
          Step.map("Each", {
            items: MapItems.fromS3({
              bucket: new s3.Bucket(stack, "Input"),
              key: "items/file",
              format,
            }),
            steps: [Step.pass("P")],
          }),
        ],
      }));
      const map = asl.States.Each;
      expect(map.ItemProcessor.ProcessorConfig).toEqual({
        Mode: "DISTRIBUTED",
        ExecutionType: "EXPRESS",
      });
      expect(map.ItemReader).toMatchObject({
        Resource: "arn:${AWS::Partition}:states:::s3:getObject",
        ReaderConfig: config,
        Arguments: { Key: "items/file" },
      });
      expect(statements(template)).toContainEqual(
        expect.objectContaining({ Action: "s3:GetObject", Effect: "Allow" }),
      );
    },
  );

  test("a prefix lists objects; CSV headers can be given", () => {
    const { asl } = synth((stack) => {
      const bucket = new s3.Bucket(stack, "Input");
      return {
        steps: [
          Step.map("Objects", {
            items: MapItems.fromS3({ bucket, prefix: "in/" }),
            steps: [Step.pass("A")],
          }),
          Step.map("Csv", {
            items: MapItems.fromS3({
              bucket,
              key: "a.csv",
              format: S3ItemFormat.CSV,
              csvHeaders: ["id", "qty"],
              maxItems: 10,
            }),
            steps: [Step.pass("B")],
          }),
        ],
      };
    });
    expect(asl.States.Objects.ItemReader.Resource).toBe(
      "arn:${AWS::Partition}:states:::s3:listObjectsV2",
    );
    expect(asl.States.Objects.ItemReader.Arguments.Prefix).toBe("in/");
    expect(asl.States.Csv.ItemReader.ReaderConfig).toEqual({
      InputType: "CSV",
      CSVHeaderLocation: "GIVEN",
      CSVHeaders: ["id", "qty"],
      MaxItems: 10,
    });
  });

  test("results go to the payload bucket; batching, tolerance and child type pass through", () => {
    const { asl, template, flow } = synth((stack) => ({
      name: "orders",
      steps: [
        Step.map("Each", {
          items: MapItems.fromS3({
            bucket: new s3.Bucket(stack, "Input"),
            key: "items.json",
          }),
          batch: { maxItems: 100, maxBytes: 1024 },
          toleratedFailurePercentage: 5,
          toleratedFailureCount: 2,
          childWorkflowType: WorkflowType.STANDARD,
          concurrency: 50,
          results: MapResults.S3,
          steps: [Step.pass("P")],
        }),
      ],
    }));
    const map = asl.States.Each;
    expect(map.ItemProcessor.ProcessorConfig).toEqual({
      Mode: "DISTRIBUTED",
      ExecutionType: "STANDARD",
    });
    expect(map.ItemBatcher).toEqual({
      MaxItemsPerBatch: 100,
      MaxInputBytesPerBatch: 1024,
    });
    expect(map.ToleratedFailurePercentage).toBe(5);
    expect(map.ToleratedFailureCount).toBe(2);
    expect(map.MaxConcurrency).toBe(50);
    expect(map.ResultWriter).toMatchObject({
      Resource: "arn:${AWS::Partition}:states:::s3:putObject",
      Arguments: {
        Bucket: expect.stringMatching(/^\$\{FlowPayloadBucket\w+\}$/),
        Prefix: "flow/orders/map-results/Each",
      },
    });
    expect(flow.payloadBucket).toBeDefined();
    template.resourceCountIs("AWS::S3::Bucket", 2);
    const writer = statements(template).find(
      (s) => Array.isArray(s.Action) && s.Action.includes("s3:PutObject"),
    );
    // The result writer grant is scoped to the workflow prefix, not the whole bucket.
    expect(JSON.stringify(writer.Resource)).toContain(
      '"/flow/orders/map-results/Each/*"',
    );
    expect(statements(template).map((s) => s.Action)).toContain(
      "states:StartExecution",
    );
  });

  test("results can go to a given bucket and prefix; DISTRIBUTED mode works with fromExpr", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.map("Each", {
          mode: MapMode.DISTRIBUTED,
          items: MapItems.fromExpr("{% $states.input.items %}"),
          results: MapResults.toS3({
            bucket: new s3.Bucket(stack, "Out"),
            prefix: "out",
          }),
          steps: [Step.pass("P")],
        }),
      ],
    }));
    expect(asl.States.Each.Items).toBe("{% $states.input.items %}");
    expect(asl.States.Each.ItemReader).toBeUndefined();
    expect(asl.States.Each.ResultWriter.Arguments.Prefix).toBe("out");
    template.resourceCountIs("AWS::S3::Bucket", 1);
  });

  test("validation", () => {
    const bucket = (stack: any) => new s3.Bucket(stack, "B");
    const cases: [(stack: any) => any, string | RegExp][] = [
      [
        (stack) => ({
          steps: [
            Step.map("M", {
              mode: MapMode.INLINE,
              items: MapItems.fromS3({ bucket: bucket(stack), key: "k" }),
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "M: MapMode.INLINE cannot read items from S3",
      ],
      [
        (stack) => ({
          workflowType: WorkflowType.EXPRESS,
          steps: [
            Step.map("M", {
              items: MapItems.fromS3({ bucket: bucket(stack), key: "k" }),
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "M: Distributed Map is not supported in EXPRESS workflows",
      ],
      [
        (stack) => ({
          steps: [
            Step.map("M", {
              items: MapItems.fromS3({ bucket: bucket(stack) }),
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "M: MapItems.fromS3 needs exactly one of 'key' or 'prefix'",
      ],
      [
        (stack) => ({
          steps: [
            Step.map("M", {
              items: MapItems.fromS3({
                bucket: bucket(stack),
                prefix: "p",
                format: S3ItemFormat.CSV,
                csvHeaders: ["a"],
              }),
              steps: [Step.pass("P")],
            }),
          ],
        }),
        /'format' applies to 'key' only/,
      ],
      [
        (stack) => ({
          steps: [
            Step.map("M", {
              items: MapItems.fromS3({
                bucket: bucket(stack),
                key: "k",
                csvHeaders: ["a"],
              }),
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "'csvHeaders' requires S3ItemFormat.CSV",
      ],
      [
        () => ({
          steps: [
            Step.map("M", {
              items: MapItems.fromExpr("{% [] %}"),
              concurrency: -1,
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "'concurrency' must be a non-negative integer",
      ],
      [
        () => ({
          steps: [
            Step.map("M", {
              mode: MapMode.DISTRIBUTED,
              items: MapItems.fromExpr("{% [] %}"),
              toleratedFailurePercentage: 101,
              steps: [Step.pass("P")],
            }),
          ],
        }),
        "'toleratedFailurePercentage' must be between 0 and 100",
      ],
      [
        () => ({
          steps: [
            Step.map("M", { items: undefined as any, steps: [Step.pass("P")] }),
          ],
        }),
        "M: map needs 'items'",
      ],
      [
        () => ({
          steps: [
            Step.map("M", { items: MapItems.fromExpr("{% [] %}"), steps: [] }),
          ],
        }),
        "M: steps must not be empty",
      ],
    ];
    for (const [build, message] of cases) {
      const stack = newStack();
      expect(() => new FlowWorkflow(stack, "Flow", build(stack))).toThrow(
        message,
      );
    }
  });

  test("EXPRESS child executions reject CALLBACK tasks; STANDARD children allow them", () => {
    const build = (childWorkflowType?: WorkflowType) => {
      const stack = newStack();
      return () =>
        new FlowWorkflow(stack, "Flow", {
          steps: [
            Step.map("M", {
              mode: MapMode.DISTRIBUTED,
              items: MapItems.fromExpr("{% $states.input %}"),
              childWorkflowType,
              steps: [
                Step.task("Cb", {
                  invoke: Invoke.lambda(fn(stack, "Fn")),
                  pattern: TaskPattern.CALLBACK,
                  timeout: undefined,
                }),
              ],
            }),
          ],
        });
    };
    expect(build()).toThrow(
      "M > Cb: TaskPattern.CALLBACK is not supported in EXPRESS workflows",
    );
    expect(build(WorkflowType.STANDARD)).not.toThrow();
  });
});
