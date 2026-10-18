#!/usr/bin/env node
// Packs the local cdk-sfn-flow and cdk-sfn-flow-runtime builds into .local/ so this
// example installs them like published packages (one copy of aws-cdk-lib).
// Run `npx projen build` at the repository root first.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", ".local");
fs.mkdirSync(out, { recursive: true });

for (const [dir, name] of [
  ["../../..", "cdk-sfn-flow"],
  ["../../../runtime", "cdk-sfn-flow-runtime"],
]) {
  const cwd = path.join(__dirname, dir);
  const file = execFileSync("npm", ["pack", "--silent", "--pack-destination", out], { cwd, encoding: "utf8" })
    .trim()
    .split("\n")
    .pop();
  fs.renameSync(path.join(out, file), path.join(out, `${name}.tgz`));
  console.log(`packed ${name} -> .local/${name}.tgz`);
}
