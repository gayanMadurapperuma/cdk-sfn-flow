# Security

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/gayanMadurapperuma/cdk-sfn-flow/security/advisories/new)
rather than public issues.

## Dependency audit policy

Every build runs `build-tools/audit-check.js` for the root package, `runtime/` and `examples/order-flow`:

- **Production dependencies must have zero advisories.** There are no exceptions.
- **Dev dependencies** may only carry advisories listed in `.audit-allowlist.json`, each with a reason.
  An entry is allowed only when the vulnerable code never sees untrusted input and either no patched version
  exists, or a dependency's bundled copy or required major version prevents adopting the patch.

Current exceptions:

| Advisory | Package | Why it is accepted |
|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces` (dev, via projen / jsii-docgen → fast-glob → micromatch) | No fixed release exists. Glob patterns come only from this repository's build configuration. |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | `deepmerge` (dev, via jest-config) | No fixed release exists. It only merges this repository's jest configuration. |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | `minimatch` (dev, via eslint and eslint-plugin-import; bundled in aws-cdk-lib) | The fix is in 11.0.1, but eslint's tooling requires an older major and aws-cdk-lib bundles its own copy, which overrides cannot reach. Patterns come only from this repository's configuration and from CDK apps at synth time. Accepted for dev dependencies only: `examples/order-flow` has aws-cdk-lib as a production dependency, so its audit fails until aws-cdk-lib ships a patched copy. |
