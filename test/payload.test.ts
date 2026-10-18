import { Template } from "aws-cdk-lib/assertions";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import { fn, synth, warningsFor } from "./util";
import { Invoke, MapItems, PayloadStrategy, Step, TaskPattern } from "../src";

/* eslint-disable @typescript-eslint/no-explicit-any */

function lambdaEnv(template: Template): any[] {
  return Object.values(template.findResources("AWS::Lambda::Function")).map(
    (f: any) => f.Properties.Environment?.Variables,
  );
}

function statements(template: Template): any[] {
  return Object.values(template.findResources("AWS::IAM::Policy")).flatMap(
    (p: any) => p.Properties.PolicyDocument.Statement,
  );
}

describe("INLINE strategy", () => {
  test("creates nothing and leaves Lambda payloads alone", () => {
    const { asl, template, flow } = synth((stack) => ({
      steps: [
        Step.task("T", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          keepInline: ["status"],
        }),
      ],
    }));
    template.resourceCountIs("AWS::S3::Bucket", 0);
    expect(flow.payloadBucket).toBeUndefined();
    expect(asl.States.T.Arguments).toBe("{% $states.input %}");
    expect(lambdaEnv(template)).toEqual([undefined]);
  });
});

describe.each([
  [PayloadStrategy.S3, "s3", undefined],
  [PayloadStrategy.AUTO, "auto", "150"],
])("%s strategy", (strategy, mode, threshold) => {
  test("creates the bucket, injects env vars and grants prefix-scoped access", () => {
    const { template, flow } = synth((stack) => ({
      name: "orders",
      payload: { strategy, thresholdKb: 150, retentionDays: 3 },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
        Step.task("B", { invoke: Invoke.lambda(fn(stack, "FnB")) }),
      ],
    }));
    expect(flow.payloadBucket).toBeDefined();
    template.hasResourceProperties("AWS::S3::Bucket", {
      LifecycleConfiguration: {
        Rules: [{ ExpirationInDays: 3, Prefix: "flow/", Status: "Enabled" }],
      },
    });
    for (const env of lambdaEnv(template)) {
      expect(env).toEqual({
        FLOW_PAYLOAD_BUCKET: {
          Ref: expect.stringMatching(/^FlowPayloadBucket/),
        },
        FLOW_PAYLOAD_MODE: mode,
        FLOW_PAYLOAD_PREFIX: "flow/orders",
        ...(threshold ? { FLOW_PAYLOAD_THRESHOLD_KB: threshold } : {}),
      });
    }
    const grants = statements(template).filter(
      (s) => JSON.stringify(s.Action) === '["s3:GetObject","s3:PutObject"]',
    );
    expect(grants).toHaveLength(2);
    for (const grant of grants) {
      expect(JSON.stringify(grant.Resource)).toContain("/flow/orders/*");
    }
  });
});

describe("Lambda payloads in S3/AUTO mode", () => {
  test("wrap the input in the claim-check envelope and hoist kept fields in the output", () => {
    const { asl } = synth((stack) => ({
      name: "orders",
      payload: { strategy: PayloadStrategy.AUTO },
      steps: [
        Step.task("Score", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          keepInline: ["status"],
        }),
        Step.task("Custom", {
          invoke: Invoke.lambda(fn(stack, "Fn2")),
          input: "{% $states.input.order %}",
          output: "{% $states.result %}",
        }),
      ],
    }));
    expect(asl.States.Score.Arguments).toBe(
      '{% { "$flow": { "prefix": "flow/orders", "execution": $states.context.Execution.Name, "step": $states.context.State.Name, "keepInline": ["status"] }, "data": $states.input } %}',
    );
    expect(asl.States.Score.Output).toBe(
      '{% $exists($states.result.`$flowRef`) ? $merge([$states.result.`$keep`, { "$flowRef": $states.result.`$flowRef` }]) : $states.result %}',
    );
    expect(asl.States.Custom.Arguments).toContain(
      '"data": ($states.input.order) }',
    );
    expect(asl.States.Custom.Output).toBe("{% $states.result %}");
  });

  test("callback tasks get the token inside the envelope data", () => {
    const { asl } = synth((stack) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.task("Approve", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          pattern: TaskPattern.CALLBACK,
          timeout: undefined,
        }),
      ],
    }));
    expect(asl.States.Approve.Arguments.Payload).toContain(
      '"data": $merge([$states.input, { "taskToken": $states.context.Task.Token }]) }',
    );
  });

  test("uses a given bucket, including its KMS key", () => {
    const { template } = synth((stack) => ({
      payload: {
        strategy: PayloadStrategy.S3,
        bucket: new s3.Bucket(stack, "Mine", {
          encryptionKey: new kms.Key(stack, "Key"),
        }),
      },
      steps: [Step.task("A", { invoke: Invoke.lambda(fn(stack, "Fn")) })],
    }));
    template.resourceCountIs("AWS::S3::Bucket", 1);
    expect(
      statements(template).map((s) => JSON.stringify(s.Action)),
    ).toContainEqual(expect.stringContaining("kms:Decrypt"));
  });

  test("warns for functions it cannot configure", () => {
    const { stack } = synth((s) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.task("Imported", {
          invoke: Invoke.lambda(
            lambda.Function.fromFunctionArn(
              s,
              "Ext",
              "arn:aws:lambda:us-east-1:111111111111:function:ext",
            ),
          ),
        }),
        Step.task("Aliased", {
          invoke: Invoke.lambda(
            new lambda.Alias(s, "Alias", {
              aliasName: "live",
              version: fn(s, "Fn").currentVersion,
            }),
          ),
        }),
      ],
    }));
    expect(warningsFor(stack, "PayloadEnvNotInjected")).toHaveLength(2);
    expect(warningsFor(stack, "PayloadGrantSkipped")).toEqual([
      expect.stringContaining("Ext has no role"),
    ]);
  });

  test("keepInline is only valid on Lambda tasks", () => {
    expect(() =>
      synth((stack) => ({
        steps: [
          Step.task("N", {
            invoke: Invoke.sns(new sns.Topic(stack, "T"), "{% 1 %}"),
            keepInline: ["x"],
          }),
        ],
      })),
    ).toThrow(
      "N: 'keepInline' applies to Invoke.lambda tasks only (got Invoke.sns)",
    );
  });
});

describe("payload warnings", () => {
  test("choice reading fields of a possibly offloaded output", () => {
    const build = (keepInline?: string[]) =>
      synth((stack) => ({
        payload: { strategy: PayloadStrategy.AUTO },
        steps: [
          Step.task("Score", {
            invoke: Invoke.lambda(fn(stack, "Fn")),
            keepInline,
          }),
          Step.choice("Route", {
            branches: [{ when: "{% $states.input.score > 5 %}", next: "Done" }],
            otherwise: "Done",
          }),
          Step.succeed("Done"),
        ],
      })).stack;
    expect(warningsFor(build(), "ChoiceReadsOffloadedInput")).toEqual([
      expect.stringContaining("Route: reads $states.input.score after Score"),
    ]);
    expect(warningsFor(build(["score"]), "ChoiceReadsOffloadedInput")).toEqual(
      [],
    );
  });

  test("choice after a parallel of Lambda branches", () => {
    const { stack } = synth((s) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.parallel("Enrich", {
          branches: [
            {
              name: "pricing",
              steps: [
                Step.task("GetPrice", { invoke: Invoke.lambda(fn(s, "Fn")) }),
              ],
            },
            { name: "stock", steps: [Step.pass("GetStock")] },
          ],
        }),
        Step.choice("Route", {
          branches: [
            { when: "{% $states.input.pricing.total > 1 %}", next: "Done" },
          ],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(stack, "ChoiceReadsOffloadedInput")).toHaveLength(1);
  });

  test("non-Lambda task consuming offloaded output", () => {
    const { stack } = synth((s) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.task("Score", { invoke: Invoke.lambda(fn(s, "Fn")) }),
        Step.task("Notify", {
          invoke: Invoke.sns(
            new sns.Topic(s, "T"),
            "{% $string($states.input) %}",
          ),
        }),
        Step.task("Static", {
          invoke: Invoke.sns(new sns.Topic(s, "T2"), "{% 'done' %}"),
        }),
      ],
    }));
    expect(warningsFor(stack, "NonLambdaReadsOffloadedInput")).toEqual([
      expect.stringContaining(
        "Notify: Invoke.sns cannot resolve S3 references",
      ),
    ]);
  });

  test("looks through choice, wait and pass steps", () => {
    const { stack } = synth((s) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.task("Score", { invoke: Invoke.lambda(fn(s, "Fn")) }),
        Step.wait("Pause", { seconds: 1 }),
        Step.pass("Noop"),
        Step.task("Notify", {
          invoke: Invoke.sns(new sns.Topic(s, "T"), "{% $states.input.id %}"),
        }),
        Step.pass("Reshape", { output: "{% { 'id': 1 } %}" }),
        Step.task("Notify2", {
          invoke: Invoke.sns(new sns.Topic(s, "T2"), "{% $states.input.id %}"),
        }),
      ],
    }));
    expect(warningsFor(stack, "NonLambdaReadsOffloadedInput")).toEqual([
      expect.stringContaining(
        "Notify: Invoke.sns cannot resolve S3 references but reads $states.input after Score",
      ),
    ]);
  });

  test("inline map over a possibly offloaded array", () => {
    const { stack } = synth((s) => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.task("List", { invoke: Invoke.lambda(fn(s, "Fn")) }),
        Step.map("Each", {
          items: MapItems.fromExpr("{% $states.input.items %}"),
          steps: [Step.pass("P")],
        }),
      ],
    }));
    expect(warningsFor(stack, "InlineMapOverOffloadedItems")).toEqual([
      expect.stringContaining("Each: iterates over $states.input after List"),
    ]);
  });

  test("no payload warnings in INLINE mode or after non-Lambda steps", () => {
    const inline = synth((s) => ({
      steps: [
        Step.task("Score", { invoke: Invoke.lambda(fn(s, "Fn")) }),
        Step.choice("Route", {
          branches: [{ when: "{% $states.input.score > 5 %}", next: "Done" }],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(inline.stack, "ChoiceReadsOffloadedInput")).toEqual([]);

    const afterPass = synth(() => ({
      payload: { strategy: PayloadStrategy.S3 },
      steps: [
        Step.pass("Init"),
        Step.choice("Route", {
          branches: [{ when: "{% $states.input.x %}", next: "Done" }],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(afterPass.stack, "ChoiceReadsOffloadedInput")).toEqual(
      [],
    );
  });
});
