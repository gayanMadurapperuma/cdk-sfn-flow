import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { LambdaTarget } from "./lambda";
import { TaskPattern } from "./task-pattern";

/** State fields that every invoke passes through to the task state. */
export interface InvokeStateOptions {
  readonly comment?: string;
  readonly outputs?: string;
  readonly assign?: { [name: string]: string };
  readonly taskTimeout?: sfn.Timeout;
  readonly heartbeatTimeout?: sfn.Timeout;
}

/** Options for creating the task state of an invoke. */
export interface InvokeBindOptions {
  readonly pattern: TaskPattern;
  /** User JSONata input (`Step.task` `input`), if any. */
  readonly input?: string;
  readonly state: InvokeStateOptions;
}

/** Implementation of an invoke target. */
export interface InvokeTarget {
  /** Short name used in messages, e.g. `Invoke.lambda`. */
  readonly name: string;
  readonly supportedPatterns: TaskPattern[];
  /** Whether `Step.task` `input` applies to this target. */
  readonly acceptsInput: boolean;
  /** The Lambda function, for Lambda targets. */
  readonly lambdaFunction?: lambda.IFunction;
  /** JSONata fields of the target, for validation (`{% %}` checks, payload warnings). */
  readonly expressions: { [field: string]: string };
  bind(
    scope: Construct,
    id: string,
    options: InvokeBindOptions,
  ): sfn.TaskStateBase;
}

/**
 * The service a `Step.task` calls.
 */
export class Invoke {
  /**
   * Invoke a Lambda function. The task output is the function's return value.
   */
  public static lambda(fn: lambda.IFunction): Invoke {
    return new Invoke(new LambdaTarget(fn));
  }

  /** @internal */
  public readonly _target: InvokeTarget;

  private constructor(target: InvokeTarget) {
    this._target = target;
  }
}
