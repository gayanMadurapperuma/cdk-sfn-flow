import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { fn, synth } from "./util";
import { Invoke, MapItems, Step } from "../src";

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

  test("parallel, map and subflow steps are not retried by default", () => {
    const { asl } = synth((stack) => ({
      // defaults.retry tunes the task retry; it does not opt containers in.
      defaults: { retry: { attempts: 5 } },
      steps: [
        Step.parallel("Both", {
          branches: [
            {
              name: "a",
              steps: [
                Step.task("A", { invoke: Invoke.lambda(fn(stack, "FnA")) }),
              ],
            },
            { name: "b", steps: [Step.pass("B")] },
          ],
        }),
        Step.map("Each", {
          items: MapItems.fromExpr("{% $states.input.items %}"),
          steps: [Step.pass("P")],
        }),
        Step.subflow("Child", {
          stateMachine: new sfn.StateMachine(stack, "Other", {
            definitionBody: sfn.DefinitionBody.fromChainable(
              new sfn.Pass(stack, "OtherPass"),
            ),
          }),
        }),
      ],
    }));
    expect(asl.States.Both.Retry).toBeUndefined();
    expect(asl.States.Each.Retry).toBeUndefined();
    expect(asl.States.Child.Retry).toBeUndefined();
    // The task inside the parallel keeps its retry.
    expect(asl.States.Both.Branches[0].States.A.Retry).toEqual([
      { ...DEFAULT_RETRY, MaxAttempts: 5 },
    ]);
  });

  test("a parallel or map opts in with 'retry' or 'disableRetry: false'", () => {
    const { asl } = synth(() => ({
      defaults: { retry: { backoffRate: 3 } },
      steps: [
        Step.parallel("Both", {
          retry: { errors: ["Transient"], attempts: 2 },
          branches: [
            { name: "a", steps: [Step.pass("A")] },
            { name: "b", steps: [Step.pass("B")] },
          ],
        }),
        Step.map("Each", {
          items: MapItems.fromExpr("{% $states.input.items %}"),
          disableRetry: false,
          steps: [Step.pass("P")],
        }),
      ],
    }));
    expect(asl.States.Both.Retry).toEqual([
      {
        ...DEFAULT_RETRY,
        ErrorEquals: ["Transient"],
        MaxAttempts: 2,
        BackoffRate: 3,
      },
    ]);
    expect(asl.States.Each.Retry).toEqual([
      { ...DEFAULT_RETRY, BackoffRate: 3 },
    ]);
  });
});
