import { Duration } from "aws-cdk-lib";
import { Match } from "aws-cdk-lib/assertions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { fn, synth } from "./util";
import { Invoke, Step, StepType, TaskPattern, WorkflowType } from "../src";

describe("FlowWorkflow", () => {
  test("synthesises a STANDARD JSONata state machine with X-Ray and error logging", () => {
    const { template, asl, flow } = synth(() => ({
      steps: [Step.pass("Start")],
    }));

    expect(asl.QueryLanguage).toBe("JSONata");
    expect(asl.StartAt).toBe("Start");
    expect(asl.States.Start).toEqual({ Type: "Pass", End: true });
    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineType: "STANDARD",
      TracingConfiguration: { Enabled: true },
      LoggingConfiguration: Match.objectLike({
        Level: "ERROR",
        IncludeExecutionData: false,
      }),
    });
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 30,
    });
    expect(flow.logGroup).toBeDefined();
    expect(flow.role).toBe(flow.stateMachine.role);
  });

  test("supports EXPRESS, a name, a timeout and tracing off", () => {
    const { template, asl } = synth(() => ({
      workflowType: WorkflowType.EXPRESS,
      name: "orders",
      timeout: Duration.minutes(1),
      tracing: false,
      steps: [Step.succeed("Done")],
    }));

    expect(asl.TimeoutSeconds).toBe(60);
    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineType: "EXPRESS",
      StateMachineName: "orders",
      TracingConfiguration: { Enabled: false },
    });
    template.hasResourceProperties("AWS::Logs::LogGroup", {
      LogGroupName: "/aws/vendedlogs/states/orders",
    });
  });

  test("logging can be configured or turned off", () => {
    const custom = synth(() => ({
      logging: {
        level: sfn.LogLevel.ALL,
        includeData: true,
        retention: logs.RetentionDays.ONE_WEEK,
      },
      steps: [Step.pass("A")],
    }));
    custom.template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      LoggingConfiguration: Match.objectLike({
        Level: "ALL",
        IncludeExecutionData: true,
      }),
    });
    custom.template.hasResourceProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 7,
    });

    const off = synth(() => ({
      logging: { level: sfn.LogLevel.OFF },
      steps: [Step.pass("A")],
    }));
    off.template.resourceCountIs("AWS::Logs::LogGroup", 0);
    expect(off.flow.logGroup).toBeUndefined();
  });

  test("logs to an existing log group", () => {
    const { template } = synth((stack) => ({
      logging: { destination: new logs.LogGroup(stack, "Existing") },
      steps: [Step.pass("A")],
    }));
    template.resourceCountIs("AWS::Logs::LogGroup", 1);
  });

  test("step ids may match construct ids used by the workflow itself", () => {
    const { asl } = synth(() => ({
      steps: [Step.pass("StateMachine"), Step.pass("Logs")],
    }));
    expect(Object.keys(asl.States)).toEqual(["StateMachine", "Logs"]);
  });
});

describe("flow resolution", () => {
  test("steps run in array order and the last step ends the workflow", () => {
    const { asl } = synth(() => ({
      steps: [Step.pass("A"), Step.pass("B"), Step.pass("C")],
    }));
    expect(asl.States.A.Next).toBe("B");
    expect(asl.States.B.Next).toBe("C");
    expect(asl.States.C.End).toBe(true);
  });

  test("next overrides array order and 'end' terminates", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.pass("A", { next: "C" }),
        Step.pass("B", { next: "end" }),
        Step.pass("C", { next: "B" }),
      ],
    }));
    expect(asl.States.A.Next).toBe("C");
    expect(asl.States.C.Next).toBe("B");
    expect(asl.States.B.End).toBe(true);
  });

  test("choice, succeed and fail are terminal", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.choice("Route", {
          branches: [{ when: "{% $states.input.ok %}", next: "Ok" }],
          otherwise: "Bad",
        }),
        Step.succeed("Ok"),
        Step.fail("Bad", {
          error: "Nope",
          cause: "{% $states.input.reason %}",
        }),
      ],
    }));
    expect(asl.States.Route).toEqual({
      Type: "Choice",
      Choices: [{ Condition: "{% $states.input.ok %}", Next: "Ok" }],
      Default: "Bad",
    });
    expect(asl.States.Ok).toEqual({ Type: "Succeed" });
    expect(asl.States.Bad).toEqual({
      Type: "Fail",
      Error: "Nope",
      Cause: "{% $states.input.reason %}",
    });
  });

  test("loops through a choice are allowed", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.pass("Poll"),
        Step.wait("Pause", { seconds: 5 }),
        Step.choice("Done?", {
          branches: [{ when: "{% $states.input.done %}", next: "Ok" }],
          otherwise: "Poll",
        }),
        Step.succeed("Ok"),
      ],
    }));
    expect(asl.States["Done?"].Default).toBe("Poll");
  });
});

describe("step types", () => {
  test("Step.type reports the kind of step", () => {
    expect(Step.pass("A").type).toBe(StepType.PASS);
    expect(Step.wait("W", { seconds: 1 }).type).toBe(StepType.WAIT);
  });

  test("lambda task invokes the function directly and returns its result", () => {
    const { asl, template } = synth((stack) => ({
      steps: [
        Step.task("Validate", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          comment: "validate the order",
          timeout: Duration.seconds(30),
          heartbeat: Duration.seconds(10),
          assign: { orderId: "{% $states.input.id %}" },
          output: "{% $states.result.body %}",
        }),
      ],
    }));
    expect(asl.States.Validate).toMatchObject({
      Type: "Task",
      Comment: "validate the order",
      Arguments: "{% $states.input %}",
      TimeoutSeconds: 30,
      HeartbeatSeconds: 10,
      Assign: { orderId: "{% $states.input.id %}" },
      Output: "{% $states.result.body %}",
      End: true,
    });
    expect(asl.States.Validate.Resource).toMatch(/^\$\{Fn\w+\.Arn\}$/);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "lambda:InvokeFunction",
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  test("lambda task passes a custom input", () => {
    const { asl } = synth((stack) => ({
      steps: [
        Step.task("T", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          input: "{% { 'id': $states.input.id } %}",
        }),
      ],
    }));
    expect(asl.States.T.Arguments).toBe("{% { 'id': $states.input.id } %}");
  });

  test("CALLBACK lambda task waits for a token injected into the payload", () => {
    const { asl } = synth((stack) => ({
      steps: [
        Step.task("Approve", {
          invoke: Invoke.lambda(fn(stack, "Fn")),
          pattern: TaskPattern.CALLBACK,
          input: "{% $states.input.order %}",
          timeout: Duration.days(2),
        }),
      ],
    }));
    expect(asl.States.Approve.Resource).toBe(
      "arn:${AWS::Partition}:states:::lambda:invoke.waitForTaskToken",
    );
    expect(asl.States.Approve.Arguments.Payload).toBe(
      '{% $merge([($states.input.order), { "taskToken": $states.context.Task.Token }]) %}',
    );
    expect(asl.States.Approve.TimeoutSeconds).toBe(172800);
  });

  test("pass, succeed and wait support output and assign", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.pass("P", {
          output: "{% { 'a': 1 } %}",
          assign: { x: "{% 1 %}" },
          comment: "c",
        }),
        Step.wait("W", { secondsExpr: "{% $states.input.delay %}" }),
        Step.wait("U", { untilExpr: "{% $states.input.at %}" }),
        Step.wait("S", { seconds: 300 }),
        Step.succeed("Done", { output: "{% $x %}" }),
      ],
    }));
    expect(asl.States.P).toMatchObject({
      Type: "Pass",
      Output: "{% { 'a': 1 } %}",
      Assign: { x: "{% 1 %}" },
    });
    expect(asl.States.W.Seconds).toBe("{% $states.input.delay %}");
    expect(asl.States.U.Timestamp).toBe("{% $states.input.at %}");
    expect(asl.States.S.Seconds).toBe(300);
    expect(asl.States.Done.Output).toBe("{% $x %}");
  });

  test("choice branches can carry output and assign", () => {
    const { asl } = synth(() => ({
      steps: [
        Step.choice("C", {
          branches: [
            {
              when: "{% true %}",
              next: "A",
              output: "{% 1 %}",
              assign: { v: "{% 2 %}" },
              comment: "yes",
            },
          ],
          otherwise: "A",
          assign: { seen: "{% true %}" },
        }),
        Step.succeed("A"),
      ],
    }));
    expect(asl.States.C.Choices[0]).toEqual({
      Condition: "{% true %}",
      Next: "A",
      Output: "{% 1 %}",
      Assign: { v: "{% 2 %}" },
      Comment: "yes",
    });
    expect(asl.States.C.Assign).toEqual({ seen: "{% true %}" });
  });

  test("raw steps embed hand-written CDK chains", () => {
    const { asl } = synth((s) => ({
      steps: [
        Step.pass("Before"),
        Step.raw(
          "Custom",
          sfn.Pass.jsonata(s, "RawA").next(sfn.Pass.jsonata(s, "RawB")),
        ),
        Step.succeed("After"),
      ],
    }));
    expect(asl.States.Before.Next).toBe("RawA");
    expect(asl.States.RawA.Next).toBe("RawB");
    expect(asl.States.RawB.Next).toBe("After");
  });
});
