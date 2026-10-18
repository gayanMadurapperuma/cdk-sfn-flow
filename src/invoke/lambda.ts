import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import type { InvokeBindOptions, InvokeTarget } from "./invoke";
import { TaskPattern } from "./task-pattern";
import { unwrap, wrap } from "../jsonata";

/** Merges the task token into the payload for callback tasks. */
export function withTaskToken(input: string | undefined): string {
  const source = input === undefined ? "$states.input" : `(${unwrap(input)})`;
  return wrap(
    `$merge([${source}, { "taskToken": $states.context.Task.Token }])`,
  );
}

export class LambdaTarget implements InvokeTarget {
  public readonly name = "Invoke.lambda";
  public readonly supportedPatterns = [
    TaskPattern.REQUEST_RESPONSE,
    TaskPattern.CALLBACK,
  ];
  public readonly acceptsInput = true;
  public readonly expressions = {};

  constructor(public readonly lambdaFunction: lambda.IFunction) {}

  public bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase {
    const common = {
      lambdaFunction: this.lambdaFunction,
      // Retries come from the workflow defaults, which already cover Lambda service errors.
      retryOnServiceExceptions: false,
      ...options.state,
    };
    if (options.pattern === TaskPattern.CALLBACK) {
      return tasks.LambdaInvoke.jsonata(scope, id, {
        ...common,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromText(withTaskToken(options.input)),
      });
    }
    return tasks.LambdaInvoke.jsonata(scope, id, {
      ...common,
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromText(options.input ?? "{% $states.input %}"),
    });
  }
}
