# Security

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/gayanMadurapperuma/cdk-sfn-flow/security/advisories/new)
rather than public issues.

## Dependency audit policy

Every build runs `build-tools/audit-check.js` for the root package, `runtime/` and `examples/order-flow`:

- **Production dependencies must have zero advisories.** There are no exceptions.
- **Dev dependencies** may only carry advisories listed in `.audit-allowlist.json`, each with a reason.
  An entry is allowed only when no patched version exists and the vulnerable code never sees untrusted input.

Current exceptions:

| Advisory | Package | Why it is accepted |
|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces` (dev, via projen / jsii-docgen → fast-glob → micromatch) | No fixed release exists. Glob patterns come only from this repository's build configuration. |
