# cdk-sfn-flow

[![build](https://github.com/gayanMadurapperuma/cdk-sfn-flow/actions/workflows/build.yml/badge.svg)](https://github.com/gayanMadurapperuma/cdk-sfn-flow/actions/workflows/build.yml)
[![npm](https://img.shields.io/npm/v/cdk-sfn-flow)](https://www.npmjs.com/package/cdk-sfn-flow)
[![PyPI](https://img.shields.io/pypi/v/cdk-sfn-flow)](https://pypi.org/project/cdk-sfn-flow/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

**Describe behaviour, not states.** `FlowWorkflow` is an AWS CDK construct that turns a small, typed
config into a JSONata Step Functions state machine. It generates the parts you would otherwise write by hand:

- state wiring and transitions (array order, `next`, `'end'`, loops)
- least-privilege IAM, derived from the services each step calls
- retry and catch defaults, plus error routing
- large-payload handling: values stay inline or go to S3 as a claim check
- Inline vs. Distributed Map selection, with S3 item readers and result writers
- logging, X-Ray and CloudWatch alarms
- synth-time validation with clear step paths (`Enrich > pricing > GetPrice`)

## The problem

The same order workflow written two ways, both formatted with Prettier at 100 columns:

| | Lines | Also includes |
|---|---|---|
| Plain CDK (`sfn.*` / `tasks.*`) | **120** | nothing else: no validation, no payload warnings |
| `FlowWorkflow` | **64** | validation, payload warnings, scoped grants, generated global catch |

<details>
<summary>Plain CDK version (120 lines)</summary>

```ts
const retry = {
  errors: ['States.TaskFailed', 'Lambda.ServiceException', 'Lambda.TooManyRequestsException', 'Lambda.SdkClientException'],
  maxAttempts: 3, interval: Duration.seconds(2), backoffRate: 2, jitterStrategy: sfn.JitterType.FULL,
};
const payloadBucket = new s3.Bucket(this, 'PayloadBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED, blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, enforceSSL: true,
  lifecycleRules: [{ prefix: 'flow/', expiration: Duration.days(7) }],
});
for (const fn of [validateFn, priceFn, notifyFn]) {
  payloadBucket.grantReadWrite(fn, 'flow/orders/*');
  fn.addEnvironment('PAYLOAD_BUCKET', payloadBucket.bucketName);
  fn.addEnvironment('PAYLOAD_THRESHOLD_KB', '200');
}
const notifyFailure = tasks.SnsPublish.jsonata(this, 'NotifyFailure', {
  topic: alertTopic, message: sfn.TaskInput.fromText('{% $string($states.input) %}'), outputs: '{% $states.input %}',
});
const flowFailed = sfn.Fail.jsonata(this, 'FlowFailed', { error: '{% $states.input.Error %}', cause: '{% $states.input.Cause %}' });
notifyFailure.next(flowFailed);
const failed = sfn.Fail.jsonata(this, 'Failed', { error: 'OrderFailed' });
const validate = tasks.LambdaInvoke.jsonata(this, 'Validate', {
  lambdaFunction: validateFn, payloadResponseOnly: true, taskTimeout: sfn.Timeout.duration(Duration.minutes(2)),
  payload: sfn.TaskInput.fromText('{% { "$flow": { "execution": $states.context.Execution.Name, "step": $states.context.State.Name }, "data": $states.input } %}'),
  outputs: '{% $exists($states.result.`$flowRef`) ? $merge([$states.result.`$keep`, { "$flowRef": $states.result.`$flowRef` }]) : $states.result %}',
});
validate.addRetry(retry).addCatch(notifyFailure);
// ... GetPrice, GetStock, Enrich, Route, Approval, CoolOff, Ship, log group, state machine, alarms
```

Full listing: [docs/plain-cdk-comparison.md](docs/plain-cdk-comparison.md).

</details>

## Install

```bash
npm install cdk-sfn-flow                 # TypeScript / JavaScript
pip install cdk-sfn-flow                 # Python
npm install cdk-sfn-flow-runtime         # Lambda handlers (only for PayloadStrategy.S3 / AUTO)
```

`aws-cdk-lib` (v2.273.0 or later) and `constructs` (v10) are peer dependencies.

## Quick start

```ts
import { Duration } from 'aws-cdk-lib';
import { FlowWorkflow, Invoke, PayloadStrategy, Step, TaskPattern } from 'cdk-sfn-flow';

new FlowWorkflow(this, 'OrderFlow', {
  payload: { strategy: PayloadStrategy.AUTO },
  defaults: { retry: { attempts: 3, backoffRate: 2 }, timeout: Duration.minutes(2) },
  alarms: { failed: true, topic: alertTopic },
  steps: [
    Step.task('Validate', { invoke: Invoke.lambda(validateFn), keepInline: ['sku'] }),
    Step.parallel('Enrich', {
      branches: [
        { name: 'pricing', steps: [Step.task('GetPrice', { invoke: Invoke.lambda(priceFn), keepInline: ['total'] })] },
        { name: 'stock', steps: [Step.task('GetStock', { invoke: Invoke.dynamoGet(stockTable,
            '{% { "Key": { "sku": { "S": $states.input.sku } } } %}') })] },
      ],
      catchErrors: [{ errors: ['States.ALL'], next: 'Failed' }],
    }),
    Step.choice('Route', {
      branches: [{ when: '{% $states.input.pricing.total > 1000 %}', next: 'Approval' }],
      otherwise: 'Ship',
    }),
    Step.task('Approval', { invoke: Invoke.lambda(notifyFn), pattern: TaskPattern.CALLBACK,
      timeout: Duration.days(2), next: 'CoolOff' }),
    Step.wait('CoolOff', { seconds: 300 }),
    Step.task('Ship', { invoke: Invoke.eventBridge({ source: 'orders', detailType: 'OrderReady',
      detailExpr: '{% $states.input %}' }), next: 'end' }),
    Step.fail('Failed', { error: 'OrderFailed' }),
  ],
});
```

This example is synthesised and snapshot-tested in `test/readme-example.test.ts`. It produces a single
warning: `Ship` sends the whole input, which may contain S3 references, to EventBridge (see
[Payload strategy](#payload-strategy)). `examples/order-flow` shows the fix, which sends only fields that are kept inline.

Python:

```python
from cdk_sfn_flow import FlowWorkflow, Invoke, PayloadStrategy, Step, PayloadConfig

FlowWorkflow(self, "OrderFlow",
    payload=PayloadConfig(strategy=PayloadStrategy.AUTO),
    steps=[
        Step.task("Validate", invoke=Invoke.lambda_(validate_fn)),
        Step.succeed("Done"),
    ],
)
```

### The generated workflow

```mermaid
flowchart TD
  Start((start)) --> Validate
  Validate --> Enrich
  subgraph Enrich [Enrich: parallel]
    direction LR
    GetPrice["pricing: GetPrice (Lambda)"]
    GetStock["stock: GetStock (DynamoDB)"]
  end
  Enrich --> Route{Route}
  Enrich -. States.ALL .-> Failed[[Failed]]
  Route -- "total > 1000" --> Approval["Approval (callback, 2 days)"]
  Route -- otherwise --> Ship["Ship (EventBridge)"]
  Approval --> CoolOff["CoolOff (wait 300 s)"]
  CoolOff --> Ship
  Ship --> End((end))
  Validate -. States.ALL .-> Notify["FlowNotifyFailure (SNS)"]
  Approval -. States.ALL .-> Notify
  Ship -. States.ALL .-> Notify
  Notify --> FlowFailed[[FlowFailed]]
```

## How it works

- **Flow resolution.** Steps run in array order. `next` overrides the order, and `'end'` ends the
  current list. `choice`, `succeed` and `fail` are terminal, and the last step of a list (workflow,
  parallel branch or map iterator) ends that list. Loops are allowed via `choice`.
- **Defaults.** `defaults.retry`, `defaults.disableRetry` and `defaults.timeout` apply to every `task`,
  `parallel`, `map` and `subflow` step. Per-step values override them.
  - Built-in retry: `States.TaskFailed` and the three `Lambda.*` service errors; 3 attempts, 2 s interval, backoff 2, full jitter.
  - `defaults.catchErrors` applies to top-level steps. A failure inside a branch or iterator surfaces on the
    enclosing `parallel`/`map`, which catches it.
  - If `alarms.topic` is set and `defaults.catchErrors` is not, every top-level step gets a catch that
    publishes the error to SNS (`FlowNotifyFailure`) and then fails (`FlowFailed`).
- **IAM.** Grants come from the CDK task constructs and are derived from what each step references.
  - `Invoke.sdk` and DynamoDB get exactly the action they call, on the resources you pass.
  - Payload bucket grants are scoped to `flow/<workflow-name>/*`.
  - The only `*` resource is `states:InvokeHTTPEndpoint` for `Invoke.http`, which AWS requires; it is
    narrowed by an endpoint condition.
- **Observability.** A log group with 30-day retention (`ERROR` level, no execution data by default) and
  X-Ray tracing are on by default. `alarms` adds CloudWatch alarms on `ExecutionsFailed`,
  `ExecutionsTimedOut` and (opt-in) `ExecutionThrottled`.

## Config reference

### `FlowWorkflow`

| Prop | Type | Default |
|---|---|---|
| `steps` | `Step[]` | required |
| `workflowType` | `WorkflowType.STANDARD \| EXPRESS` | `STANDARD` |
| `name` | `string` | generated |
| `timeout` | `Duration` | none |
| `payload` | `{ strategy, thresholdKb, retentionDays, bucket }` | `INLINE`, 200 KB, 7 days, created bucket |
| `defaults` | `{ retry, disableRetry, catchErrors, timeout }` | built-in retry |
| `logging` | `{ level, includeData, retention, removalPolicy, destination }` | `ERROR`, `false`, 30 days, `RETAIN` |
| `tracing` | `boolean` | `true` |
| `encryptionKey` | `kms.IKey` | AWS owned key |
| `alarms` | `{ failed, timedOut, throttled, topic, period }` | no alarms; when set: `true`, `true`, `false`, none, 5 min |

Exposed: `stateMachine`, `role`, `logGroup`, `alarms`, `payloadBucket`, `workflowName`, `workflowType`.

### Shared step fields

| Field | Applies to | Notes |
|---|---|---|
| `next` | all except `choice`, `succeed`, `fail` | step id, or `'end'` |
| `comment` | all | |
| `assign` | all except `fail` | `{ name: '{% expr %}' }` JSONata variables |
| `output` | all except `fail` | JSONata output |
| `retry`, `disableRetry`, `catchErrors` | `task`, `parallel`, `map`, `subflow` | merged over `defaults` |

### Step types

| Factory | Specific props |
|---|---|
| `Step.task(id, …)` | `invoke`, `pattern` (`REQUEST_RESPONSE` · `SYNC` · `CALLBACK`), `input` (Lambda), `timeout`, `heartbeat`, `keepInline` (Lambda) |
| `Step.wait(id, …)` | exactly one of `seconds`, `secondsExpr`, `untilExpr` |
| `Step.choice(id, …)` | `branches: [{ when, next, output?, assign? }]`, `otherwise` |
| `Step.parallel(id, …)` | `branches: [{ name, steps }]` (≥ 2); output is `{ <name>: result }` merged with `output` |
| `Step.map(id, …)` | `items` (`MapItems.fromExpr` · `MapItems.fromS3`), `steps`, `mode` (`AUTO` · `INLINE` · `DISTRIBUTED`), `concurrency`, `itemSelector`, `batch`, `toleratedFailurePercentage`, `toleratedFailureCount`, `childWorkflowType`, `results` (`MapResults.S3` · `MapResults.toS3({...})`) |
| `Step.pass(id, …)` | shared fields only |
| `Step.succeed(id, …)` | `output`, `comment` |
| `Step.fail(id, …)` | `error`, `cause` (literals or JSONata) |
| `Step.subflow(id, …)` | `workflow` (FlowWorkflow) or `stateMachine`, `waitForCompletion` (default `true`; output is the child output), `input`, `timeout` |
| `Step.raw(id, chainable)` | escape hatch for hand-written JSONata CDK states |

### Invokes

| Factory | Patterns | IAM |
|---|---|---|
| `Invoke.lambda(fn)` | request-response, callback | `lambda:InvokeFunction` |
| `Invoke.dynamoGet/Put/Update/Delete(table, paramsExpr)` | request-response | exactly `dynamodb:<Op>Item` on the table |
| `Invoke.dynamoQuery(table, paramsExpr)` | request-response | `dynamodb:Query` on the table and its indexes |
| `Invoke.sqs(queue, bodyExpr, opts?)` | request-response, callback | `sqs:SendMessage` (+ KMS) |
| `Invoke.sns(topic, messageExpr, opts?)` | request-response, callback | `sns:Publish` |
| `Invoke.eventBridge({ bus?, source, detailType, detailExpr })` | request-response, callback | `events:PutEvents` on the bus |
| `Invoke.ecsRunTask({ cluster, taskDefinition, … })` | request-response, sync | `ecs:RunTask`, `iam:PassRole` (+ sync permissions) |
| `Invoke.http(connection, url, method, opts?)` | request-response | connection secret, `states:InvokeHTTPEndpoint` (condition-scoped) |
| `Invoke.sdk({ service, action, iamResources, paramsExpr?, iamAction? })` | request-response | exactly `service:Action` on `iamResources` |

For callback tasks the task token is merged into the payload as `taskToken`. DynamoDB `paramsExpr` is
merged with `TableName`.

## Payload strategy

Step Functions limits state payloads to 256 KB. `payload.strategy` decides what happens with bigger outputs:

| Strategy | Infrastructure | Runtime (`withPayload`) |
|---|---|---|
| `INLINE` (default) | nothing | nothing |
| `S3` | payload bucket (SSE, public access blocked, SSL enforced, expiry after `retentionDays`); read/write on `flow/<workflow>/*` for every referenced Lambda; `FLOW_PAYLOAD_*` env vars | always offloads outputs and resolves inputs |
| `AUTO` | same as `S3`, plus `FLOW_PAYLOAD_THRESHOLD_KB` | offloads only outputs above `thresholdKb` |

Wrap your handlers with the runtime:

```ts
import { withPayload } from 'cdk-sfn-flow-runtime';

export const handler = withPayload(async (order) => {
  // `order` is always the resolved payload, even if the previous step offloaded it.
  return { ...order, status: 'priced' };
}, { keepInline: ['status'] });
```

An offloaded output looks like
`{ "$flowRef": { "bucket": "…", "key": "flow/<workflow>/<execution>/<step>/<uuid>.json", "size": 123 }, "$keep": { … } }`.
The construct moves `$keep` fields to the top level of the state output, so `choice` conditions and
other states can still read them as `$states.input.<field>`. Use `keepInline` on the task for control-flow
fields, and the validator warns when a later state reads a field that might not be inline.
See [docs/payload-strategy.md](docs/payload-strategy.md).

## Validation

Configuration errors fail `cdk synth` with every problem and its step path. Risky patterns produce
CDK warnings with stable ids (`cdk-sfn-flow:<Rule>`), which you can acknowledge. The full list is in
[docs/validation-rules.md](docs/validation-rules.md).

```
FlowWorkflow 'Stack/OrderFlow' has 2 configuration error(s):
  - Enrich > pricing > GetPrice: 'next' target 'Nowhere' does not exist
  - Route: choice needs an 'otherwise' target
```

## Comparison

| | Plain CDK | `@matthewbonig/state-machine` | ASL `DefinitionBody.fromFile` | **cdk-sfn-flow** |
|---|---|---|---|---|
| Authoring model | state by state | ASL JSON/YAML + overrides | ASL JSON | behaviour config |
| Typed (TS / Python) | yes | partly | no | yes |
| Automatic IAM | yes | manual | manual | yes, least privilege |
| Retry/catch defaults | manual | manual | manual | yes |
| Large payloads (S3 claim check) | manual | manual | manual | **built in** |
| Inline vs. Distributed Map choice | manual | manual | manual | **automatic** |
| Synth-time flow validation | CDK graph checks | no | no | **yes, with step paths** |
| Alarms and logging | manual | manual | manual | yes |
| Escape hatch | — | — | — | `Step.raw` |

## Roadmap

- YAML/JSON config loader
- Python port of `cdk-sfn-flow-runtime`
- More invoke targets (Glue, Batch, Bedrock, CodeBuild)
- `middy-store` reference adapter
- Optional association of subflow executions with the parent (`AWS_STEP_FUNCTIONS_STARTED_BY_EXECUTION_ID`)

JSONPath, Activities and Step Functions Local are not planned.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). `npx projen build` compiles with jsii (TypeScript + Python),
lints, tests the library and the runtime, synthesises `examples/order-flow` and audits all
dependencies (see [SECURITY.md](SECURITY.md)).

## License

Apache-2.0
