import { App, Stack } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { FlowWorkflow, FlowWorkflowProps } from "../src";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function newStack(): Stack {
  return new Stack(new App(), "TestStack", {
    env: { account: "111111111111", region: "us-east-1" },
  });
}

export function fn(stack: Stack, id: string): lambda.Function {
  return new lambda.Function(stack, id, {
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: lambda.Code.fromInline("exports.handler = async (e) => e;"),
  });
}

/** Synthesises a workflow and returns its template and parsed ASL definition. */
export function synth(build: (stack: Stack) => FlowWorkflowProps): {
  template: Template;
  asl: any;
  stack: Stack;
  flow: FlowWorkflow;
} {
  const stack = newStack();
  const flow = new FlowWorkflow(stack, "Flow", build(stack));
  const template = Template.fromStack(stack);
  return { template, asl: definition(template), stack, flow };
}

/**
 * Parses the definition of the state machine of the workflow with the given construct id
 * (default `Flow`), replacing CloudFormation tokens with placeholders.
 */
export function definition(template: Template, workflowId = "Flow"): any {
  const machines = template.findResources("AWS::StepFunctions::StateMachine");
  const logicalId = Object.keys(machines).find((id) =>
    id.startsWith(`${workflowId}StateMachine`),
  );
  if (!logicalId) {
    throw new Error(`no state machine for workflow '${workflowId}'`);
  }
  const body = machines[logicalId].Properties.DefinitionString;
  const text =
    typeof body === "string"
      ? body
      : body["Fn::Join"][1]
          .map((part: any) =>
            typeof part === "string" ? part : tokenName(part),
          )
          .join("");
  return JSON.parse(text);
}

function tokenName(token: any): string {
  if (token["Fn::GetAtt"]) return `\${${token["Fn::GetAtt"].join(".")}}`;
  if (token.Ref) return `\${${token.Ref}}`;
  return "${Token}";
}

export function warnings(stack: Stack): string[] {
  return Annotations.fromStack(stack)
    .findWarning("*", Match.anyValue())
    .map((w) => String(w.entry.data));
}

/** Warning messages matching a rule id. */
export function warningsFor(stack: Stack, rule: string): string[] {
  return warnings(stack).filter((w) =>
    w.includes(`[ack: cdk-sfn-flow:${rule}]`),
  );
}
