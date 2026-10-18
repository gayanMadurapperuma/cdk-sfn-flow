import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { allScopes, allSteps, dataPredecessors } from "./graph";
import { payloadEnvironment, PayloadStore } from "./payload";
import type { ValidationWarning } from "./validator";
import { TaskPattern } from "../invoke/task-pattern";
import { readsStateInput } from "../jsonata";
import type { ChoiceBuilder } from "../steps/choice";
import type { MapBuilder } from "../steps/map";
import type { PassBuilder } from "../steps/pass";
import type { Step } from "../steps/step";
import { StepType } from "../steps/step-type";
import type { TaskBuilder } from "../steps/task";
import type { WaitBuilder } from "../steps/wait";

/** The Lambda function of a request-response Lambda task, whose output the runtime may offload. */
function offloadingLambda(step: Step): lambda.IFunction | undefined {
  if (step.type !== StepType.TASK) return undefined;
  const task = step._builder as TaskBuilder;
  return task.pattern === TaskPattern.REQUEST_RESPONSE
    ? task.props.invoke._target.lambdaFunction
    : undefined;
}

/** All Lambda functions referenced by the workflow (any pattern). */
function referencedLambdas(steps: Step[]): lambda.IFunction[] {
  const functions = new Set<lambda.IFunction>();
  for (const step of allSteps(steps)) {
    if (step.type === StepType.TASK) {
      const fn = (step._builder as TaskBuilder).props.invoke._target
        .lambdaFunction;
      if (fn) functions.add(fn);
    }
  }
  return [...functions];
}

/**
 * Grants every referenced Lambda read/write on `flow/<workflow-name>/*` and injects the
 * `FLOW_PAYLOAD_*` environment. Returns warnings for functions it cannot configure.
 */
export function wirePayloadInfrastructure(
  steps: Step[],
  store: PayloadStore,
): ValidationWarning[] {
  if (!store.offloads) return [];
  const warnings: ValidationWarning[] = [];
  const bucket = store.bucket();
  const env = payloadEnvironment(store);

  for (const fn of referencedLambdas(steps)) {
    iam.Grant.addToPrincipal({
      grantee: fn,
      actions: ["s3:GetObject", "s3:PutObject"],
      resourceArns: [store.objectsArn()],
    });
    bucket.encryptionKey?.grantEncryptDecrypt(fn);
    // Imported functions have no role in this app, so the grant cannot be added.
    if (fn.role === undefined) {
      warnings.push({
        rule: "PayloadGrantSkipped",
        message: `Lambda ${fn.node.path} has no role in this app; grant it s3:GetObject and s3:PutObject on ${store.prefix}/* of the payload bucket`,
      });
    }
    if (fn instanceof lambda.Function) {
      for (const [name, value] of Object.entries(env)) {
        fn.addEnvironment(name, value);
      }
    } else {
      warnings.push({
        rule: "PayloadEnvNotInjected",
        message: `Lambda ${fn.node.path} is not a lambda.Function, so FLOW_PAYLOAD_* variables were not set; set ${Object.keys(env).join(", ")} on it yourself`,
      });
    }
  }
  return warnings;
}

/** `$states.input.a.b` paths read by an expression, as segment lists. */
function inputPaths(expression: string): string[][] {
  return [
    ...expression.matchAll(/\$states\.input((?:\.[A-Za-z_$][\w$]*)+)/g),
  ].map((m) => m[1].slice(1).split("."));
}

/**
 * Fields known to stay inline in the output of a step: the `keepInline` of a Lambda task,
 * or of every Lambda task nested in a parallel/map.
 */
function keptFields(step: Step): Set<string> {
  const fields = new Set<string>();
  for (const s of [
    step,
    ...step._builder.children().flatMap((c) => allSteps(c.steps)),
  ]) {
    if (s.type === StepType.TASK) {
      ((s._builder as TaskBuilder).props.keepInline ?? []).forEach((f) =>
        fields.add(f),
      );
    }
  }
  return fields;
}

/** True when the step's output may contain S3 references. */
function mayBeOffloaded(step: Step): boolean {
  if (offloadingLambda(step)) return true;
  if (step.type === StepType.PARALLEL || step.type === StepType.MAP) {
    return step._builder
      .children()
      .some((c) =>
        allSteps(c.steps).some((s) => offloadingLambda(s) !== undefined),
      );
  }
  return false;
}

/** True for steps that pass their input through unchanged (spec: wait, pass and choice keep refs). */
function passesThrough(step: Step): boolean {
  switch (step.type) {
    case StepType.CHOICE:
      return (step._builder as ChoiceBuilder).props.output === undefined;
    case StepType.WAIT:
      return (step._builder as WaitBuilder).props.output === undefined;
    case StepType.PASS:
      return (step._builder as PassBuilder).props.output === undefined;
    default:
      return false;
  }
}

/**
 * Steps whose possibly offloaded output reaches `id`, looking through
 * pass-through steps (choice, wait, pass without output).
 */
function offloadingSources(
  id: string,
  preds: Map<string, Step[]>,
  seen = new Set<string>(),
): Step[] {
  const sources: Step[] = [];
  for (const pred of preds.get(id) ?? []) {
    if (seen.has(pred.id)) continue;
    seen.add(pred.id);
    if (mayBeOffloaded(pred)) {
      sources.push(pred);
    } else if (passesThrough(pred)) {
      sources.push(...offloadingSources(pred.id, preds, seen));
    }
  }
  return sources;
}

/**
 * Warnings for states that read data a previous Lambda may have offloaded to S3 (spec 5.5).
 */
export function analyzePayload(
  steps: Step[],
  store: PayloadStore,
): ValidationWarning[] {
  if (!store.offloads) return [];
  const warnings: ValidationWarning[] = [];

  for (const scope of allScopes(steps)) {
    const preds = dataPredecessors(scope.steps);
    for (const step of scope.steps) {
      const offloaders = offloadingSources(step.id, preds);
      if (offloaders.length === 0) continue;
      const kept = new Set(offloaders.flatMap((p) => [...keptFields(p)]));
      const uncovered = (expression: string | undefined): string[] =>
        expression === undefined
          ? []
          : inputPaths(expression)
              .filter((path) => !path.some((segment) => kept.has(segment)))
              .map((path) => path.join("."));
      const path = [...scope.path, step.id].join(" > ");
      const from = offloaders.map((p) => p.id).join(", ");

      if (step.type === StepType.CHOICE) {
        const fields = (step._builder as ChoiceBuilder).props.branches.flatMap(
          (b) => uncovered(b.when),
        );
        if (fields.length > 0) {
          warnings.push({
            rule: "ChoiceReadsOffloadedInput",
            message: `${path}: reads $states.input.${[...new Set(fields)].join(", $states.input.")} after ${from}, whose output may be offloaded to S3; add the field to 'keepInline' on ${from}`,
          });
        }
      } else if (
        step.type === StepType.TASK &&
        offloadingLambda(step) === undefined
      ) {
        const task = step._builder as TaskBuilder;
        const target = task.props.invoke._target;
        if (target.lambdaFunction) continue;
        const reads = Object.values(target.expressions).some(
          (e) =>
            readsStateInput(e) &&
            (inputPaths(e).length === 0 || uncovered(e).length > 0),
        );
        if (reads) {
          warnings.push({
            rule: "NonLambdaReadsOffloadedInput",
            message: `${path}: ${target.name} cannot resolve S3 references but reads $states.input after ${from}; keep the fields inline with 'keepInline' or pass them via 'assign' variables`,
          });
        }
      } else if (step.type === StepType.MAP) {
        const map = step._builder as MapBuilder;
        const items = map.itemsExpression;
        if (
          !map.distributed &&
          items !== undefined &&
          readsStateInput(items) &&
          (inputPaths(items).length === 0 || uncovered(items).length > 0)
        ) {
          warnings.push({
            rule: "InlineMapOverOffloadedItems",
            message: `${path}: iterates over $states.input after ${from}, whose output may be offloaded to S3; use MapItems.fromS3 or keep the array inline with 'keepInline'`,
          });
        }
      }
    }
  }
  return warnings;
}
