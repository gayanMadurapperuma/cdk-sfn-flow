# Payload strategy

Step Functions limits the input and output of every state to 256 KB. `cdk-sfn-flow` can move large
Lambda outputs to S3 and pass a small reference instead (the *claim-check* pattern).

```ts
new FlowWorkflow(this, 'Flow', {
  payload: { strategy: PayloadStrategy.AUTO, thresholdKb: 200, retentionDays: 7 },
  steps: [...],
});
```

## Strategies

| Strategy | What the construct does | What `withPayload` does |
|---|---|---|
| `INLINE` (default) | nothing | passthrough |
| `S3` | creates the payload bucket, grants and injects env vars (below) | always offloads outputs, resolves inputs |
| `AUTO` | same as `S3`, plus `FLOW_PAYLOAD_THRESHOLD_KB` | offloads outputs whose JSON is larger than `thresholdKb` |

### Infrastructure (S3 / AUTO)

- **Bucket.** SSE-S3, all public access blocked, SSL enforced, and objects under `flow/` expire after
  `retentionDays`. Pass `payload.bucket` to use your own bucket; its lifecycle rules are not changed,
  and a KMS key on it is granted to the functions.
- **Grants.** Every Lambda referenced anywhere in the workflow gets `s3:GetObject` and `s3:PutObject` on
  `flow/<workflow-name>/*`, and nothing else.
- **Environment.** For each `lambda.Function`: `FLOW_PAYLOAD_BUCKET`, `FLOW_PAYLOAD_MODE` (`s3` | `auto`),
  `FLOW_PAYLOAD_PREFIX` and, for AUTO, `FLOW_PAYLOAD_THRESHOLD_KB`. For aliases, versions and imported
  functions you set these yourself (a warning tells you).
- **Distributed Map results** (`MapResults.S3`) are written to the same bucket under
  `flow/<workflow-name>/map-results/<step-id>`, with a grant limited to that prefix.

## Wire format

In S3/AUTO mode every Lambda task receives an envelope:

```json
{
  "$flow": { "prefix": "flow/orders", "execution": "<execution name>", "step": "Score", "keepInline": ["status"] },
  "data": <the state input>
}
```

`withPayload` unwraps it, resolves every reference inside `data`, and passes the plain value to your
handler. It resolves references at any depth, so parallel results and map result arrays work too. The
handler's return value is offloaded (always in `s3` mode, above the threshold in `auto`) to
`flow/<workflow>/<execution>/<step>/<uuid>.json`, and replaced by:

```json
{ "$flowRef": { "bucket": "my-bucket", "key": "flow/orders/exec-1/Score/0d9c….json", "size": 312845 }, "$keep": { "status": "ok" } }
```

The task's default output then moves the `$keep` fields up next to `$flowRef`:

```json
{ "status": "ok", "$flowRef": { … } }
```

so `{% $states.input.status = 'ok' %}` works in a later `choice`.

### Mapping to middy-store

A `$flowRef` is a plain S3 location (`bucket`, `key`, `size`). Code that uses `middy-store`, or any
other S3-backed store, can map it to its own reference shape from `$flowRef.bucket` and `$flowRef.key`
(for example, the URL `s3://<bucket>/<key>`). A ready-made adapter is on the roadmap.

## Rules of thumb

- **Control-flow fields stay inline.** List every field that a `choice` or a non-Lambda task reads in
  `keepInline` on the producing task, or in the handler's `withPayload(..., { keepInline })`. The
  validator warns when it sees a read that might hit an offloaded field.
- **Only Lambda handlers resolve references.** DynamoDB, SQS, SNS, EventBridge, HTTP and SDK tasks see
  the reference object. Give them kept fields, or values from `assign` variables.
- **Wait, Pass and Succeed** pass references through unchanged.
- **Parallel** branches offload independently, so the merged output is an object of references, which
  `withPayload` resolves.
- **Inline Map over a large array**: if the array might be offloaded, use `MapItems.fromS3` (a
  Distributed Map reads it directly from S3) or keep the array inline.
- **Callback tasks**: the token is merged into `data` as `taskToken`. The callback result comes from
  `SendTaskSuccess` and is not offloaded.
- **Subflows** pass references to the child workflow. Its functions can only read them if they share the
  bucket and prefix grant, so give both workflows the same `payload.bucket` and grant the child's
  functions access to the parent prefix.

## Runtime API

```ts
import { withPayload, flowPayloadMiddleware, resolveRefs, offload } from 'cdk-sfn-flow-runtime';

export const handler = withPayload(async (input, context) => ..., { keepInline: ['status'] });

// Middy
export const handler2 = middy(baseHandler).use(flowPayloadMiddleware({ keepInline: ['status'] }));

// Plain functions
const value = await resolveRefs(event);
const out = await offload(result, { bucket, mode: 'auto', thresholdKb: 200, keyPrefix: 'flow/orders' });
```

With no `FLOW_PAYLOAD_*` variables and no envelope, `withPayload` is a passthrough. `@aws-sdk/client-s3`
v3 is a peer dependency; the Lambda Node.js runtime already includes it.
