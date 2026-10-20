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

## Releasing

Releases are tag-driven. Pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which:

1. builds with `RELEASE_VERSION=X.Y.Z` (`.projenrc.ts` writes it into both package.json files),
2. publishes `cdk-sfn-flow` to npm (with provenance) and PyPI, and `cdk-sfn-flow-runtime` to npm,
3. creates a GitHub release with generated notes and the built artifacts.

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC from GitHub Actions, no long-lived token). Configure it on npmjs.com for both `cdk-sfn-flow` and `cdk-sfn-flow-runtime` (Settings → Trusted Publisher → GitHub Actions, workflow `release.yml`).

Repository secrets:

- `NPM_TOKEN`: only needed for a package's very first publish, before its trusted publisher exists. Delete it once trusted publishing is configured.
- `PYPI_TOKEN` (optional): PyPI API token. The PyPI upload is skipped when it is not set.
- `PROJEN_GITHUB_TOKEN`: fine-grained token (Contents, Pull requests and Workflows: read/write on this repo) used by the nightly `upgrade` workflow to open dependency PRs.

First release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Before tagging, run the integration test once (it deploys to AWS; see `examples/order-flow/README.md`).
