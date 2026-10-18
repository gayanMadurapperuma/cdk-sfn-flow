# Contributing

Thanks for your interest in `cdk-sfn-flow`!

## Development

This repository is managed by [projen](https://github.com/projen/projen). Do not edit generated files
(they are read-only). Change `.projenrc.ts` instead, then run `npx projen`.

```bash
npm install
npx projen build   # compile (jsii), lint, test, package, and build/test runtime/
npx projen test    # tests only
```

Layout:

- `src/`: the jsii construct library (`cdk-sfn-flow`, published to npm and PyPI)
- `runtime/`: a plain TypeScript package (`cdk-sfn-flow-runtime`) used inside Lambda handlers

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles (`feat:`, `fix:`, `chore:` …).
- Add tests for new behaviour. Every validation rule must have a test.
- Keep public APIs jsii-compatible: no union types, generics or function-typed props.
