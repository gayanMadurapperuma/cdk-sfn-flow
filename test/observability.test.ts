import { Duration } from "aws-cdk-lib";
import { Match } from "aws-cdk-lib/assertions";
import * as kms from "aws-cdk-lib/aws-kms";
import * as sns from "aws-cdk-lib/aws-sns";
import { fn, newStack, synth } from "./util";
import { FlowWorkflow, Invoke, Step } from "../src";

describe("alarms", () => {
  test("no alarms unless configured", () => {
    const { template, flow } = synth(() => ({ steps: [Step.pass("A")] }));
    template.resourceCountIs("AWS::CloudWatch::Alarm", 0);
    expect(flow.alarms).toEqual([]);
  });

  test("failed and timed-out alarms by default, notifying the topic", () => {
    const { template, flow } = synth((stack) => ({
      alarms: { topic: new sns.Topic(stack, "Alerts") },
      steps: [Step.pass("A")],
    }));
    expect(flow.alarms).toHaveLength(2);
    for (const metric of ["ExecutionsFailed", "ExecutionsTimedOut"]) {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: metric,
        Namespace: "AWS/States",
        Statistic: "Sum",
        Period: 300,
        Threshold: 1,
        EvaluationPeriods: 1,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        TreatMissingData: "notBreaching",
        AlarmActions: [{ Ref: Match.stringLikeRegexp("^Alerts") }],
      });
    }
  });

  test("throttled alarm on request, others can be turned off", () => {
    const { template } = synth(() => ({
      alarms: {
        failed: false,
        timedOut: false,
        throttled: true,
        period: Duration.minutes(1),
      },
      steps: [Step.pass("A")],
    }));
    template.resourceCountIs("AWS::CloudWatch::Alarm", 1);
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      MetricName: "ExecutionThrottled",
      Period: 60,
      AlarmActions: Match.absent(),
    });
  });
});

describe("global catch", () => {
  test("alarms.topic without defaults.catchErrors adds notify-and-fail to top-level steps", () => {
    const { asl, template } = synth((stack) => ({
      name: "orders",
      alarms: { topic: new sns.Topic(stack, "Alerts") },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "Fn")) }),
        Step.task("B", {
          invoke: Invoke.lambda(fn(stack, "Fn2")),
          catchErrors: [],
        }),
        Step.parallel("P", {
          branches: [
            {
              name: "x",
              steps: [
                Step.task("C", { invoke: Invoke.lambda(fn(stack, "Fn3")) }),
              ],
            },
            { name: "y", steps: [Step.pass("D")] },
          ],
        }),
      ],
    }));
    expect(asl.States.A.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "FlowNotifyFailure" },
    ]);
    expect(asl.States.B.Catch).toBeUndefined();
    expect(asl.States.P.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "FlowNotifyFailure" },
    ]);
    expect(asl.States.P.Branches[0].States.C.Catch).toBeUndefined();
    expect(asl.States.FlowNotifyFailure).toMatchObject({
      Type: "Task",
      Resource: "arn:${AWS::Partition}:states:::sns:publish",
      Output: "{% $states.input %}",
      Next: "FlowFailed",
      Arguments: {
        Subject: "Workflow orders failed",
        Message:
          '{% $string({ "workflow": "orders", "execution": $states.context.Execution.Id, "error": $states.input.Error, "cause": $states.input.Cause }) %}',
      },
    });
    expect(asl.States.FlowFailed).toEqual({
      Type: "Fail",
      Error: "{% $states.input.Error %}",
      Cause: "{% $states.input.Cause %}",
    });
    const statements = Object.values(
      template.findResources("AWS::IAM::Policy"),
    ).flatMap((p) => p.Properties.PolicyDocument.Statement);
    expect(statements).toContainEqual(
      expect.objectContaining({ Action: "sns:Publish" }),
    );
  });

  test("defaults.catchErrors replaces the global catch", () => {
    const { asl } = synth((stack) => ({
      alarms: { topic: new sns.Topic(stack, "Alerts") },
      defaults: { catchErrors: [{ next: "Failed" }] },
      steps: [
        Step.task("A", { invoke: Invoke.lambda(fn(stack, "Fn")), next: "end" }),
        Step.fail("Failed", { error: "E" }),
      ],
    }));
    expect(asl.States.A.Catch).toEqual([
      { ErrorEquals: ["States.ALL"], Next: "Failed" },
    ]);
    expect(asl.States.FlowNotifyFailure).toBeUndefined();
  });

  test("generated state names are reserved", () => {
    expect(
      () =>
        new FlowWorkflow(newStack(), "Flow", {
          steps: [Step.pass("FlowFailed")],
        }),
    ).toThrow("FlowFailed: 'FlowFailed' is a reserved step id");
  });
});

test("encryptionKey configures customer managed encryption", () => {
  const { template } = synth((stack) => ({
    encryptionKey: new kms.Key(stack, "Key"),
    steps: [Step.pass("A")],
  }));
  template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
    EncryptionConfiguration: {
      Type: "CUSTOMER_MANAGED_KMS_KEY",
      KmsKeyId: Match.anyValue(),
    },
  });
});
