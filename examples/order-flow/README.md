# Example: order flow

A deployable CDK app for the README workflow, with real Lambda handlers that use
`cdk-sfn-flow-runtime`'s `withPayload`. `Validate` can produce more than 256 KB
(`{"lineCount": 4000}` gives about 480 KB), which `PayloadStrategy.AUTO` offloads to S3.

## Run against the local build

```bash
# at the repository root
npx projen build

cd examples/order-flow
npm run pack-local      # packs ../../ and ../../runtime into .local/
npm install
npm run synth
npm run deploy          # deploys to your default AWS account/region
```

After the packages are published, replace the `file:.local/...` dependencies with versions from npm.

Start an execution:

```bash
aws stepfunctions start-execution \
  --state-machine-arn <OrderFlow state machine ARN> \
  --input '{"orderId":"order-1","sku":"SKU-1","quantity":2,"lineCount":4000}'
```

Seed the stock table first, with an item whose `sku` is `SKU-1`.

## Integration test

`integ/integ.order-flow.ts` deploys the stack with `@aws-cdk/integ-tests-alpha`, seeds the table, starts
the execution above and waits for `SUCCEEDED`:

```bash
npm run integ           # deploys to your AWS account, then destroys the stack
```
