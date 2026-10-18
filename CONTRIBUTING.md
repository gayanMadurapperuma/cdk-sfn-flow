# Contributing

Thanks for your interest in `cdk-sfn-flow`!

## Development

This repository is managed by [projen](https://github.com/projen/projen). Do not edit generated files
(they are read-only). Change `.projenrc.ts` instead, then run `npx projen`.

```bash
npm install
npx projen build   # jsii compile (TS + Python), lint, tests, runtime/, examples/order-flow synth, dependency audit
npx projen test    # tests only
```

Layout:

- `src/`: the jsii construct library (`cdk-sfn-flow`, published to npm and PyPI)
- `runtime/`: a plain TypeScript package (`cdk-sfn-flow-runtime`) used inside Lambda handlers
- `examples/order-flow/`: a deployable example app (installs the locally packed builds)
- `docs/`: payload strategy and validation rule reference

The README example is snapshot-tested (`test/readme-example.test.ts`). If you change generated output on
purpose, update the snapshot with `npx projen test` and commit it.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles (`feat:`, `fix:`, `chore:` …).
- Add tests for new behaviour. Every validation rule must have a test.
- Keep public APIs jsii-compatible: no union types, generics or function-typed props.
