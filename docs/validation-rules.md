# Validation rules

`FlowWorkflow` validates its config at synth time.

- **Errors** stop `cdk synth`. The error lists every problem, each prefixed with the step path
  (`Enrich > pricing > GetPrice`; a map iterator continues from the map id, e.g. `Each > Process`).
- **Warnings** are CDK annotations with the id `cdk-sfn-flow:<Rule>`. Acknowledge one with
  `Annotations.of(flow).acknowledgeWarning('cdk-sfn-flow:<Rule>', 'reason')`.

Every rule has a test in `test/`.

## Errors

| Rule | Message (abridged) |
|---|---|
| Duplicate ids | `duplicate step id 'X' (also used at …)`. Ids are unique across the whole workflow, including branches and iterators. |
| Reserved ids | `'end'`, `'FlowNotifyFailure'` and `'FlowFailed'` cannot be step ids. Empty ids are rejected. |
| Unknown targets | `'next'`, `'catchErrors[i].next'`, `'branches[i].next'` or `'otherwise'` target does not exist |
| Cross-scope targets | target is in a different scope. Targets must be in the same step list (top level, branch or iterator). |
| `defaults.catchErrors` targets | must be top-level step ids |
| `'end'` as a choice or catch target | route to a `Step.succeed` or `Step.fail` instead |
| Wait | exactly one of `seconds`, `secondsExpr`, `untilExpr`; `seconds` must be a non-negative integer |
| Choice | at least one branch, and an `otherwise` target |
| Parallel | at least 2 branches; branch names non-empty and unique |
| Empty step lists | the workflow, every branch and every map iterator need at least one step |
| Task patterns | the invoke must support the pattern (for example, Lambda supports `REQUEST_RESPONSE` and `CALLBACK`) |
| EXPRESS | `TaskPattern.SYNC` / `CALLBACK`, `subflow` with `waitForCompletion`, and Distributed Map are not allowed. This also applies inside Distributed Map children of type EXPRESS. |
| Map | `MapMode.INLINE` with `MapItems.fromS3`; `fromS3` needs exactly one of `key` / `prefix`; `format` only with `key`; `csvHeaders` only with CSV; `concurrency` ≥ 0; `toleratedFailurePercentage` 0–100; `batch`, `toleratedFailure*`, `childWorkflowType` and `results` only for Distributed Maps |
| Subflow | exactly one of `workflow` / `stateMachine` |
| Task input | `input` only for Lambda; `keepInline` only for Lambda |
| `Invoke.http` | literal URLs must be `https://` |
| `Invoke.sdk` | lower-case service, camelCase action, at least one IAM resource |
| Fail | `error` is required |

## Warnings

| Id | When |
|---|---|
| `UnreachableStep` | No path from the first step of its list reaches the step (catch edges count as paths). It is left out of the state machine. |
| `ChoiceLoopWithoutWait` | A loop through a `choice` contains no `wait` step, so it can burn state transitions. |
| `CallbackWithoutTimeout` | A `CALLBACK` task has no `timeout` (and no `defaults.timeout`), so an execution could wait for up to a year. |
| `JsonataNotWrapped` | A JSONata field (`input`, `output`, `when`, `secondsExpr`, `untilExpr`, `items`, `itemSelector`, invoke expressions) is not wrapped in `{% %}`, so it is a literal string. |
| `SdkWildcardResource` | `Invoke.sdk` is granted on `*`. |
| `ChoiceReadsOffloadedInput` | S3/AUTO mode: a `choice` reads `$states.input.<field>` after a Lambda (or a parallel/map containing one) whose output may be offloaded, and the field is not in `keepInline`. |
| `NonLambdaReadsOffloadedInput` | S3/AUTO mode: a non-Lambda task reads `$states.input` after such a step. Only Lambda handlers can resolve references, so keep the fields inline or pass them through `assign` variables. |
| `InlineMapOverOffloadedItems` | S3/AUTO mode: an inline map iterates over `$states.input…` after such a step. Use `MapItems.fromS3` or keep the array inline. |
| `PayloadEnvNotInjected` | S3/AUTO mode: a referenced function is not a `lambda.Function` (an alias, version or imported function), so set the `FLOW_PAYLOAD_*` variables yourself. |
| `PayloadGrantSkipped` | S3/AUTO mode: an imported function has no role in this app, so grant it access to `flow/<workflow>/*` yourself. |

The payload checks follow data flow through `choice`, `wait` and `pass` steps without `output`, because
those steps pass references through unchanged.
