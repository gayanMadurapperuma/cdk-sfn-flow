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

Releases are tag-driven. Pushing a tag `vX.Y.Z` on `main` runs `.github/workflows/release.yml`, which:

1. builds with `RELEASE_VERSION=X.Y.Z` (`.projenrc.ts` writes it into both package.json files),
2. stages `cdk-sfn-flow` and `cdk-sfn-flow-runtime` on npm with `npm stage publish` (with provenance),
3. publishes `cdk-sfn-flow` to PyPI when the `PYPI_TOKEN` secret is set,
4. creates a GitHub release with generated notes and the built artifacts.

```bash
git checkout main && git pull
git tag -a v1.2.3 -m "v1.2.3"
git push origin v1.2.3
```

Staged versions are not installable until a maintainer approves them with 2FA, either on npmjs.com (package → Staged versions → Approve) or with `npm stage list` and `npm stage approve <stage-id>`. Approve both packages.

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no npm token). Each package has a trusted publisher on npmjs.com for `gayanMadurapperuma/cdk-sfn-flow`, workflow `release.yml`, environment `npm`, allowed action `npm stage publish` only. The `npm` GitHub environment only accepts `v*` tags.

Repository secrets:

- `PYPI_TOKEN` (optional): PyPI API token. The PyPI upload is skipped when it is not set.
- `PROJEN_GITHUB_TOKEN`: fine-grained token (Contents, Pull requests and Workflows: read/write on this repo) used by the nightly `upgrade` workflow to open dependency PRs.

Before tagging, run the integration test once (it deploys to AWS; see `examples/order-flow/README.md`).
