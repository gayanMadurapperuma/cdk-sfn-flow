import { Duration } from "aws-cdk-lib";
import { fn, newStack, synth, warningsFor } from "./util";
import {
  FlowWorkflow,
  FlowWorkflowProps,
  Invoke,
  Step,
  TaskPattern,
  WorkflowType,
} from "../src";

function expectError(
  build: (stack: ReturnType<typeof newStack>) => FlowWorkflowProps,
  message: string | RegExp,
) {
  const stack = newStack();
  expect(() => new FlowWorkflow(stack, "Flow", build(stack))).toThrow(message);
}

describe("validation errors", () => {
  test("duplicate step ids", () => {
    expectError(
      () => ({ steps: [Step.pass("A"), Step.pass("A")] }),
      "A: duplicate step id 'A' (also used at A)",
    );
  });

  test("reserved step id 'end'", () => {
    expectError(
      () => ({ steps: [Step.pass("end")] }),
      "'end' is a reserved step id",
    );
  });

  test("empty step id", () => {
    expectError(
      () => ({ steps: [Step.pass("")] }),
      "step ids must not be empty",
    );
  });

  test("next target that does not exist", () => {
    expectError(
      () => ({ steps: [Step.pass("A", { next: "Nope" })] }),
      "A: 'next' target 'Nope' does not exist",
    );
  });

  test("catch target that does not exist", () => {
    expectError(
      (stack) => ({
        steps: [
          Step.task("T", {
            invoke: Invoke.lambda(fn(stack, "Fn")),
            catchErrors: [{ next: "Nope" }],
          }),
        ],
      }),
      "T: 'catchErrors[0].next' target 'Nope' does not exist",
    );
  });

  test("defaults.catchErrors target that is not a top-level step", () => {
    expectError(
      () => ({
        defaults: { catchErrors: [{ next: "Nope" }] },
        steps: [Step.pass("A")],
      }),
      "'defaults.catchErrors[0].next' target 'Nope' must be a top-level step id",
    );
  });

  test("choice targets that do not exist", () => {
    expectError(
      () => ({
        steps: [
          Step.choice("C", {
            branches: [{ when: "{% true %}", next: "X" }],
            otherwise: "Y",
          }),
        ],
      }),
      /C: 'branches\[0\]\.next' target 'X' does not exist[\s\S]*C: 'otherwise' target 'Y' does not exist/,
    );
  });

  test("choice targets cannot be 'end'", () => {
    expectError(
      () => ({
        steps: [
          Step.choice("C", {
            branches: [{ when: "{% true %}", next: "end" }],
            otherwise: "end",
          }),
        ],
      }),
      "C: 'branches[0].next' cannot be 'end'",
    );
  });

  test("wait with none or several durations", () => {
    expectError(
      () => ({ steps: [Step.wait("W", {})] }),
      "W: wait needs exactly one of 'seconds', 'secondsExpr' or 'untilExpr' (got 0)",
    );
    expectError(
      () => ({
        steps: [Step.wait("W", { seconds: 1, untilExpr: "{% $x %}" })],
      }),
      "(got 2)",
    );
    expectError(
      () => ({ steps: [Step.wait("W", { seconds: 1.5 })] }),
      "'seconds' must be a non-negative integer",
    );
  });

  test("choice without branches or otherwise", () => {
    expectError(
      () => ({ steps: [Step.choice("C", { branches: [], otherwise: "" })] }),
      /C: choice needs at least one branch[\s\S]*C: choice needs an 'otherwise' target/,
    );
  });

  test("fail without an error", () => {
    expectError(
      () => ({ steps: [Step.fail("F", { error: "" })] }),
      "F: fail needs an 'error'",
    );
  });

  test("empty steps list", () => {
    expectError(() => ({ steps: [] }), "(workflow): steps must not be empty");
  });

  test("SYNC and CALLBACK in EXPRESS workflows", () => {
    expectError(
      (stack) => ({
        workflowType: WorkflowType.EXPRESS,
        steps: [
          Step.task("T", {
            invoke: Invoke.lambda(fn(stack, "Fn")),
            pattern: TaskPattern.CALLBACK,
            timeout: Duration.minutes(1),
          }),
        ],
      }),
      "T: TaskPattern.CALLBACK is not supported in EXPRESS workflows",
    );
  });

  test("unsupported task pattern for the invoke", () => {
    expectError(
      (stack) => ({
        steps: [
          Step.task("T", {
            invoke: Invoke.lambda(fn(stack, "Fn")),
            pattern: TaskPattern.SYNC,
          }),
        ],
      }),
      "T: Invoke.lambda does not support TaskPattern.SYNC",
    );
  });

  test("reports all errors at once", () => {
    expectError(
      () => ({ steps: [Step.pass("A", { next: "X" }), Step.pass("A")] }),
      "has 2 configuration error(s)",
    );
  });
});

describe("validation warnings", () => {
  test("unreachable steps", () => {
    const { stack } = synth(() => ({
      steps: [Step.pass("A", { next: "end" }), Step.pass("Orphan")],
    }));
    expect(warningsFor(stack, "UnreachableStep")).toEqual([
      expect.stringContaining("Orphan: step is unreachable"),
    ]);
  });

  test("steps reachable only through a catch are not unreachable", () => {
    const { stack } = synth((s) => ({
      defaults: { catchErrors: [{ next: "Failed" }] },
      steps: [
        Step.task("T", { invoke: Invoke.lambda(fn(s, "Fn")), next: "end" }),
        Step.fail("Failed", { error: "E" }),
      ],
    }));
    expect(warningsFor(stack, "UnreachableStep")).toEqual([]);
  });

  test("choice loop without a wait", () => {
    const { stack } = synth(() => ({
      steps: [
        Step.pass("Check"),
        Step.choice("Again?", {
          branches: [{ when: "{% $states.input.retry %}", next: "Check" }],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(stack, "ChoiceLoopWithoutWait")).toEqual([
      expect.stringContaining("loop Check -> Again? has no wait step"),
    ]);
  });

  test("choice self-loop without a wait", () => {
    const { stack } = synth(() => ({
      steps: [
        Step.choice("Spin", {
          branches: [{ when: "{% true %}", next: "Spin" }],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(stack, "ChoiceLoopWithoutWait")).toHaveLength(1);
  });

  test("choice loop with a wait is fine", () => {
    const { stack } = synth(() => ({
      steps: [
        Step.wait("Pause", { seconds: 10 }),
        Step.choice("Again?", {
          branches: [{ when: "{% true %}", next: "Pause" }],
          otherwise: "Done",
        }),
        Step.succeed("Done"),
      ],
    }));
    expect(warningsFor(stack, "ChoiceLoopWithoutWait")).toEqual([]);
  });

  test("CALLBACK without a timeout", () => {
    const { stack } = synth((s) => ({
      steps: [
        Step.task("Approve", {
          invoke: Invoke.lambda(fn(s, "Fn")),
          pattern: TaskPattern.CALLBACK,
        }),
      ],
    }));
    expect(warningsFor(stack, "CallbackWithoutTimeout")).toEqual([
      expect.stringContaining("Approve: CALLBACK task has no timeout"),
    ]);
  });

  test("CALLBACK covered by defaults.timeout does not warn", () => {
    const { stack } = synth((s) => ({
      defaults: { timeout: Duration.hours(1) },
      steps: [
        Step.task("Approve", {
          invoke: Invoke.lambda(fn(s, "Fn")),
          pattern: TaskPattern.CALLBACK,
        }),
      ],
    }));
    expect(warningsFor(stack, "CallbackWithoutTimeout")).toEqual([]);
  });

  test("JSONata expression not wrapped in {% %}", () => {
    const { stack } = synth((s) => ({
      steps: [
        Step.task("T", {
          invoke: Invoke.lambda(fn(s, "Fn")),
          input: "$states.input",
        }),
        Step.pass("P", { output: "{% $states.input %}" }),
      ],
    }));
    expect(warningsFor(stack, "JsonataNotWrapped")).toEqual([
      expect.stringContaining("T: 'input' is not wrapped in {% %}"),
    ]);
  });
});
