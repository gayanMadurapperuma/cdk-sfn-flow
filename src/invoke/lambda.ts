import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import type {
  InvokeBindOptions,
  InvokeTarget,
  PayloadEnvelope,
} from "./invoke";
import { TaskPattern } from "./task-pattern";
import { unwrap, wrap } from "../jsonata";

/** JSONata source that merges the task token into `source`. */
function mergeTaskToken(source: string): string {
  return `$merge([${source}, { "taskToken": $states.context.Task.Token }])`;
}

/** Merges the task token into the payload for callback tasks. */
export function withTaskToken(input: string | undefined): string {
  return wrap(
    mergeTaskToken(
      input === undefined ? "$states.input" : `(${unwrap(input)})`,
    ),
  );
}

/**
 * Wraps the Lambda payload in the claim-check envelope read by `withPayload`:
 * `{ "$flow": { workflow, execution, step, keepInline }, "data": <input> }`.
 */
export function envelopePayload(
  source: string,
  envelope: PayloadEnvelope,
): string {
  const flow = [
    `"prefix": ${JSON.stringify(envelope.prefix)}`,
    `"execution": $states.context.Execution.Name`,
    `"step": $states.context.State.Name`,
    `"keepInline": ${JSON.stringify(envelope.keepInline ?? [])}`,
  ].join(", ");
  return wrap(`{ "$flow": { ${flow} }, "data": ${source} }`);
}

/**
 * Default Lambda output in S3/AUTO mode: when the result is a reference, hoist the
 * `$keep` fields next to `$flowRef` so later states can read them as `$states.input.<field>`.
 */
export const OFFLOADED_OUTPUT =
  '{% $exists($states.result.`$flowRef`) ? $merge([$states.result.`$keep`, { "$flowRef": $states.result.`$flowRef` }]) : $states.result %}';

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
    const callback = options.pattern === TaskPattern.CALLBACK;
    const source =
      options.input === undefined
        ? "$states.input"
        : `(${unwrap(options.input)})`;
    const data = callback ? mergeTaskToken(source) : source;
    // Plain request-response tasks pass the user input through unchanged.
    const payload = options.envelope
      ? envelopePayload(data, options.envelope)
      : callback
        ? wrap(data)
        : (options.input ?? "{% $states.input %}");
    const common = {
      lambdaFunction: this.lambdaFunction,
      // Retries come from the workflow defaults, which already cover Lambda service errors.
      retryOnServiceExceptions: false,
      ...options.state,
      payload: sfn.TaskInput.fromText(payload),
    };
    if (callback) {
      return tasks.LambdaInvoke.jsonata(scope, id, {
        ...common,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      });
    }
    return tasks.LambdaInvoke.jsonata(scope, id, {
      ...common,
      payloadResponseOnly: true,
      outputs:
        options.state.outputs ??
        (options.envelope ? OFFLOADED_OUTPUT : undefined),
    });
  }
}
