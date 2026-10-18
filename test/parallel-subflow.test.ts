import { Duration } from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { fn, newStack, synth } from "./util";
import { FlowWorkflow, Invoke, Step, WorkflowType } from "../src";

describe("Step.parallel", () => {
  test("runs named branches and keys the output by branch name", () => {
    const { asl } = synth((stack) => ({
      defaults: { catchErrors: [{ next: "Failed" }] },
      steps: [
        Step.parallel("Enrich", {
          branches: [
            {
              name: "pricing",
              steps: [
                Step.task("GetPrice", {
                  invoke: Invoke.lambda(fn(stack, "Price")),
                }),
              ],
            },
            {
              name: "stock",
              steps: [Step.pass("GetStock", { output: "{% 5 %}" })],
            },
          ],
          next: "end",
        }),
        Step.fail("Failed", { error: "E" }),
      ],
    }));
    const enrich = asl.States.Enrich;
    expect(enrich.Type).toBe("Parallel");
    expect(enrich.Output).toBe(
      '{% { "pricing": $states.result[0], "stock": $states.result[1] } %}',
    );
    expect(enrich.Branches.map((b: { StartAt: string }) => b.StartAt)).toEqual([
      "GetPrice",
      "GetStock",
    ]);
    // Defaults: retry everywhere, catch on the top-level parallel only.
    expect(enrich.Retry).toHaveLength(1);
    expect(enrich.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "Failed" },
    ]);
    expect(enrich.Branches[0].States.GetPrice.Retry).toHaveLength(1);
    expect(enrich.Branches[0].States.GetPrice.Catch).toBeUndefined();
    expect(enrich.Branches[0].States.GetPrice.End).toBe(true);
  });

  test("merges the user's output with the branch results", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.parallel("P", {
          branches: [
            { name: "a", steps: [Step.pass("A")] },
            { name: "b", steps: [Step.pass("B")] },
          ],
          output: '{% { "at": $now() } %}',
        }),
      ],
    }));
    expect(asl.States.P.Output).toBe(
      '{% $merge([{ "a": $states.result[0], "b": $states.result[1] }, ({ "at": $now() })]) %}',
    );
  });

  test("branches resolve next and catch targets within the branch", () => {
    const { asl } = synth((stack) => ({
      steps: [
        Step.parallel("P", {
          branches: [
            {
              name: "a",
              steps: [
                Step.task("Try", {
                  invoke: Invoke.lambda(fn(stack, "Fn")),
                  catchErrors: [{ next: "Fallback" }],
                  next: "end",
                }),
                Step.pass("Fallback"),
              ],
            },
            { name: "b", steps: [Step.pass("B")] },
          ],
        }),
      ],
    }));
    expect(asl.States.P.Branches[0].States.Try.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "Fallback" },
    ]);
  });

  test.each([
    [
      [{ name: "only", steps: [Step.pass("A")] }],
      "P: parallel needs at least 2 branches (got 1)",
    ],
    [
      [
        { name: "x", steps: [Step.pass("A")] },
        { name: "x", steps: [Step.pass("B")] },
      ],
      "P: duplicate branch name 'x'",
    ],
    [
      [
        { name: "", steps: [Step.pass("A")] },
        { name: "y", steps: [Step.pass("B")] },
      ],
      "P: parallel branch names must not be empty",
    ],
    [
      [
        { name: "x", steps: [] },
        { name: "y", steps: [Step.pass("B")] },
      ],
      "P > x: steps must not be empty",
    ],
  ])("validates branches (%#)", (branches, message) => {
    expect(
      () =>
        new FlowWorkflow(newStack(), "Flow", {
          steps: [Step.parallel("P", { branches })],
        }),
    ).toThrow(message);
  });

  test("errors include nested step paths", () => {
    const build = () =>
      new FlowWorkflow(newStack(), "Flow", {
        steps: [
          Step.parallel("Enrich", {
            branches: [
              {
                name: "pricing",
                steps: [Step.pass("GetPrice", { next: "Nowhere" })],
              },
              {
                name: "stock",
                steps: [Step.pass("GetStock", { next: "Done" })],
              },
            ],
          }),
          Step.succeed("Done"),
        ],
      });
    expect(build).toThrow(
      "Enrich > pricing > GetPrice: 'next' target 'Nowhere' does not exist",
    );
    expect(build).toThrow(
      "Enrich > stock > GetStock: 'next' target 'Done' is in a different scope (Done); targets must be in the same step list",
    );
  });

  test("ids must be unique across branches", () => {
    expect(
      () =>
        new FlowWorkflow(newStack(), "Flow", {
          steps: [
            Step.pass("A"),
            Step.parallel("P", {
              branches: [
                { name: "x", steps: [Step.pass("A")] },
                { name: "y", steps: [Step.pass("B")] },
              ],
            }),
          ],
        }),
    ).toThrow("P > x > A: duplicate step id 'A' (also used at A)");
  });
});

describe("Step.subflow", () => {
  test("starts a FlowWorkflow and waits for its output", () => {
    const { asl } = synth((stack) => {
      const child = new FlowWorkflow(stack, "Child", {
        workflowType: WorkflowType.EXPRESS,
        steps: [Step.pass("X")],
      });
      return {
        defaults: { timeout: Duration.minutes(5) },
        steps: [
          Step.subflow("Run", {
            workflow: child,
            input: "{% $states.input.order %}",
          }),
        ],
      };
    });
    expect(asl.States.Run).toMatchObject({
      Type: "Task",
      Resource: "arn:${AWS::Partition}:states:::states:startExecution.sync:2",
      Arguments: {
        StateMachineArn: expect.stringMatching(/^\$\{ChildStateMachine\w+\}$/),
        Input: "{% $states.input.order %}",
      },
      Output: "{% $states.result.Output %}",
      TimeoutSeconds: 300,
    });
    expect(asl.States.Run.Retry).toHaveLength(1);
  });

  test("fire-and-forget subflow of any state machine", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.subflow("Kick", {
          stateMachine: sfn.StateMachine.fromStateMachineName(
            stack,
            "Other",
            "other",
          ),
          waitForCompletion: false,
        }),
      ],
    }));
    expect(asl.States.Kick.Resource).toBe(
      "arn:${AWS::Partition}:states:::states:startExecution",
    );
    expect(asl.States.Kick.Output).toBeUndefined();
    const statements = Object.values(
      template.findResources("AWS::IAM::Policy"),
    ).flatMap((p) => p.Properties.PolicyDocument.Statement);
    expect(statements).toContainEqual(
      expect.objectContaining({ Action: "states:StartExecution" }),
    );
  });

  test("validation", () => {
    const stack = newStack();
    const other = sfn.StateMachine.fromStateMachineName(
      stack,
      "Other",
      "other",
    );
    expect(
      () => new FlowWorkflow(stack, "A", { steps: [Step.subflow("S", {})] }),
    ).toThrow("S: subflow needs exactly one of 'workflow' or 'stateMachine'");
    expect(
      () =>
        new FlowWorkflow(stack, "B", {
          workflowType: WorkflowType.EXPRESS,
          steps: [Step.subflow("S", { stateMachine: other })],
        }),
    ).toThrow(
      "S: subflow with waitForCompletion is not supported in EXPRESS workflows",
    );
  });
});
