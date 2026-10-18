import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { fn, synth } from "./util";
import { Invoke, Step } from "../src";

const DEFAULT_RETRY = {
  ErrorEquals: [
    "States.TaskFailed",
    "Lambda.ServiceException",
    "Lambda.TooManyRequestsException",
    "Lambda.SdkClientException",
  ],
  IntervalSeconds: 2,
  MaxAttempts: 3,
  BackoffRate: 2,
  JitterStrategy: "FULL",
};

describe("retry and catch defaults", () => {
  test("tasks get the built-in retry", () => {
    const { asl } = synth((stack) => ({
      steps: [Step.task("T", { invoke: Invoke.lambda(fn(stack, "Fn")) })],
    }));
    expect(asl.States.T.Retry).toEqual([DEFAULT_RETRY]);
    expect(asl.States.T.Catch).toBeUndefined();
  });

  test("defaults.retry and per-step retry are merged over the built-in retry", () => {
    const { asl } = synth((stack) => ({
      defaults: { retry: { attempts: 5, backoffRate: 3 } },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
        Step.task("B", {
          invoke: Invoke.lambda(fn(stack, "FnB")),
          retry: {
            errors: ["Custom"],
            attempts: 1,
            interval: Duration.seconds(5),
            maxDelay: Duration.seconds(30),
            jitter: sfn.JitterType.NONE,
          },
        }),
      ],
    }));
    expect(asl.States.A.Retry).toEqual([
      { ...DEFAULT_RETRY, MaxAttempts: 5, BackoffRate: 3 },
    ]);
    expect(asl.States.B.Retry).toEqual([
      {
        ErrorEquals: ["Custom"],
        IntervalSeconds: 5,
        MaxAttempts: 1,
        BackoffRate: 3,
        MaxDelaySeconds: 30,
        JitterStrategy: "NONE",
      },
    ]);
  });

  test("disableRetry turns retries off per step or by default", () => {
    const { asl } = synth((stack) => ({
      defaults: { disableRetry: true },
      steps: [
        Step.task("Off", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
        Step.task("On", {
          invoke: Invoke.lambda(fn(stack, "FnB")),
          disableRetry: false,
        }),
      ],
    }));
    expect(asl.States.Off.Retry).toBeUndefined();
    expect(asl.States.On.Retry).toEqual([DEFAULT_RETRY]);

    const perStep = synth((stack) => ({
      steps: [
        Step.task("T", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          disableRetry: true,
        }),
      ],
    }));
    expect(perStep.asl.States.T.Retry).toBeUndefined();
  });

  test("defaults.timeout applies to tasks without their own timeout", () => {
    const { asl } = synth((stack) => ({
      defaults: { timeout: Duration.minutes(2) },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
        Step.task("B", {
          invoke: Invoke.lambda(fn(stack, "FnB")),
          timeout: Duration.seconds(5),
        }),
      ],
    }));
    expect(asl.States.A.TimeoutSeconds).toBe(120);
    expect(asl.States.B.TimeoutSeconds).toBe(5);
  });

  test("per-step catchErrors route errors to a step", () => {
    const { asl } = synth((stack) => ({
      steps: [
        Step.task("T", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          catchErrors: [
            {
              errors: ["Custom"],
              next: "Recover",
              output: "{% $states.errorOutput %}",
              assign: { failed: "{% true %}" },
            },
            { next: "Failed" },
          ],
          next: "end",
        }),
        Step.pass("Recover", { next: "end" }),
        Step.fail("Failed", { error: "Boom" }),
      ],
    }));
    expect(asl.States.T.Catch).toEqual([
      {
        ErrorEquals: ["Custom"],
        Next: "Recover",
        Output: "{% $states.errorOutput %}",
        Assign: { failed: "{% true %}" },
      },
      { ErrorEquals: ["States.ALL"], Next: "Failed" },
    ]);
  });

  test("defaults.catchErrors apply to top-level steps without their own catch", () => {
    const { asl } = synth((stack) => ({
      defaults: { catchErrors: [{ next: "Failed" }] },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
        Step.task("B", {
          invoke: Invoke.lambda(fn(stack, "FnB")),
          catchErrors: [],
          next: "end",
        }),
        Step.fail("Failed", { error: "Boom" }),
      ],
    }));
    expect(asl.States.A.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "Failed" },
    ]);
    expect(asl.States.B.Catch).toBeUndefined();
  });
});
