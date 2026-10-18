# cdk-sfn-flow

**Describe behaviour, not states.** A config-driven AWS CDK construct (`FlowWorkflow`) that generates
Step Functions (JSONata) workflows. It handles state wiring, least-privilege IAM, retry and catch defaults,
large-payload handling, Inline vs. Distributed Map selection, and observability.

> **Status:** early development. The public API is not stable yet.

## Install

```bash
npm install cdk-sfn-flow          # TypeScript / JavaScript
pip install cdk-sfn-flow          # Python
npm install cdk-sfn-flow-runtime  # Lambda-side payload helpers
```

## License

Apache-2.0
