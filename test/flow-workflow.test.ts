import { App, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { FlowWorkflow, WorkflowType } from "../src";

function synth(build: (stack: Stack) => void): Template {
  const stack = new Stack(new App(), "TestStack");
  build(stack);
  return Template.fromStack(stack);
}

describe("FlowWorkflow", () => {
  test("synthesises a JSONata STANDARD state machine by default", () => {
    const template = synth((stack) => new FlowWorkflow(stack, "Flow"));

    template.resourceCountIs("AWS::StepFunctions::StateMachine", 1);
    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineType: "STANDARD",
      DefinitionString: Match.serializedJson(
        Match.objectLike({
          QueryLanguage: "JSONata",
          StartAt: "Start",
          States: Match.objectLike({
            Start: Match.objectLike({ Type: "Pass" }),
          }),
        }),
      ),
    });
  });

  test("supports EXPRESS workflows and an explicit name", () => {
    const template = synth(
      (stack) =>
        new FlowWorkflow(stack, "Flow", {
          workflowType: WorkflowType.EXPRESS,
          name: "orders",
        }),
    );

    template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineType: "EXPRESS",
      StateMachineName: "orders",
    });
  });

  test("exposes the state machine and its role", () => {
    const stack = new Stack(new App(), "TestStack");
    const flow = new FlowWorkflow(stack, "Flow");

    expect(flow.stateMachine.role).toBe(flow.role);
    Template.fromStack(stack).resourceCountIs("AWS::IAM::Role", 1);
  });
});
