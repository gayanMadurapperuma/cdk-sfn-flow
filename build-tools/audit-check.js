#!/usr/bin/env node
/**
 * Fails when `npm audit` reports any advisory that is not explicitly allow-listed
 * in `.audit-allowlist.json` at the repository root. Production dependencies must
 * always be clean, so allow-listed advisories only apply to dev dependencies.
 *
 * Usage: node build-tools/audit-check.js [packageDir]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = path.resolve(process.argv[2] ?? '.');
const allowlistFile = path.join(__dirname, '..', '.audit-allowlist.json');
const allowlist = JSON.parse(fs.readFileSync(allowlistFile, 'utf8')).advisories;
const allowed = new Map(allowlist.map((a) => [a.id, a]));

function audit(extraArgs) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', ...extraArgs], { cwd, encoding: 'utf8' }));
  } catch (err) {
    // npm audit exits non-zero when it finds vulnerabilities; the JSON is still on stdout.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

function advisories(report) {
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via === 'object') {
        const id = via.url.split('/').pop();
        found.set(id, { id, name: via.name, title: via.title, severity: via.severity });
      }
    }
  }
  return [...found.values()];
}

const failures = [];

const prod = advisories(audit(['--omit=dev']));
for (const a of prod) failures.push(`[prod] ${a.severity} ${a.name}: ${a.title} (${a.id})`);

const all = advisories(audit([]));
for (const a of all) {
  if (!allowed.has(a.id) && !prod.some((p) => p.id === a.id)) {
    failures.push(`[dev] ${a.severity} ${a.name}: ${a.title} (${a.id})`);
  }
}

for (const a of all.filter((x) => allowed.has(x.id))) {
  console.log(`audit: allow-listed ${a.id} (${a.name}): ${allowed.get(a.id).reason}`);
}

if (failures.length > 0) {
  console.error(`audit: ${failures.length} unapproved advisories in ${cwd}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`audit: ${path.relative(process.cwd(), cwd) || '.'} is clean (${all.length} allow-listed dev advisories)`);
