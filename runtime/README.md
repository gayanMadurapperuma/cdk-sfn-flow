# cdk-sfn-flow-runtime

Lambda-side helpers for [`cdk-sfn-flow`](https://github.com/gayanmadurapperuma/cdk-sfn-flow) workflows
that use `PayloadStrategy.S3` or `PayloadStrategy.AUTO` (S3 claim check for payloads over the 256 KB
Step Functions limit).

```bash
npm install cdk-sfn-flow-runtime
```

```ts
import { withPayload } from 'cdk-sfn-flow-runtime';

export const handler = withPayload(async (input, context) => {
  // `input` is resolved even if the previous step offloaded it to S3.
  return { ...input, status: 'done' };
}, { keepInline: ['status'] });
```

- Reads `FLOW_PAYLOAD_BUCKET`, `FLOW_PAYLOAD_MODE` (`s3` | `auto`), `FLOW_PAYLOAD_THRESHOLD_KB` and
  `FLOW_PAYLOAD_PREFIX`, which the construct sets. Without them (and without a workflow envelope) it is a
  passthrough.
- Input: unwraps the workflow envelope and recursively resolves `$flowRef` references, including inside
  Parallel results and Map result arrays.
- Output: `s3` mode always offloads; `auto` mode offloads when the JSON is larger than the threshold. Keys
  are `flow/<workflow>/<execution>/<step>/<uuid>.json`. `keepInline` fields stay in `$keep`.

Also exported: `flowPayloadMiddleware()` (Middy), `resolveRefs()` and `offload()`.

`@aws-sdk/client-s3` v3 is a peer dependency; the Lambda Node.js runtime includes it.

See [docs/payload-strategy.md](https://github.com/gayanmadurapperuma/cdk-sfn-flow/blob/main/docs/payload-strategy.md)
for the wire format.
