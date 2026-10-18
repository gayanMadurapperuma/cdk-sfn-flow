import { awscdk, javascript, typescript } from "projen";

const author = "Gayan Madurapperuma";
const authorAddress = "madurapperumamags@gmail.com";
const repositoryUrl = "https://github.com/gayanmadurapperuma/cdk-sfn-flow.git";

const project = new awscdk.AwsCdkConstructLibrary({
  name: "cdk-sfn-flow",
  description:
    "Config-driven AWS Step Functions workflows for CDK. Describe behaviour, not states.",
  author,
  authorAddress,
  repositoryUrl,
  license: "Apache-2.0",
  keywords: [
    "aws",
    "cdk",
    "awscdk",
    "step-functions",
    "stepfunctions",
    "jsonata",
    "workflow",
  ],

  cdkVersion: "2.273.0",
  constructsVersion: "10.8.1",
  jsiiVersion: "~6.0.0",
  minNodeVersion: "20.0.0",
  workflowNodeVersion: "22.x",

  defaultReleaseBranch: "main",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  prettier: true,
  eslint: true,

  publishToPypi: {
    distName: "cdk-sfn-flow",
    module: "cdk_sfn_flow",
  },

  gitignore: ["cdk.out/", ".DS_Store"],
  npmignoreEnabled: true,
});

// The compiler is the core of the library: keep it well covered.
project.package.file.addOverride("jest.coverageThreshold", {
  "./src/compiler/": { statements: 90, branches: 90, functions: 90, lines: 90 },
});
project.package.file.addOverride("jest.watchman", false);

// Folders that are not part of the jsii package.
project.npmignore?.exclude("/runtime/", "/examples/", "/docs/");
project.eslint?.addIgnorePattern("runtime/");
project.eslint?.addIgnorePattern("examples/");

// js-yaml@3 (via jest coverage tooling) pulls in argparse@1 -> sprintf-js, which has an
// unpatched advisory. load-nyc-config only calls `load`, which js-yaml@4 still provides.
const auditOverrides = {
  "@istanbuljs/load-nyc-config": { "js-yaml": "^4.1.0" },
};
project.package.addField("overrides", auditOverrides);

/**
 * Non-jsii runtime helper package used inside Lambda handlers.
 * Publishing is wired up in the release-prep milestone.
 */
const runtime = new typescript.TypeScriptProject({
  parent: project,
  outdir: "runtime",
  name: "cdk-sfn-flow-runtime",
  description:
    "Runtime helpers (S3 claim-check payloads) for cdk-sfn-flow Lambda handlers.",
  authorName: author,
  authorEmail: authorAddress,
  repository: repositoryUrl,
  license: "Apache-2.0",
  defaultReleaseBranch: "main",
  packageManager: javascript.NodePackageManager.NPM,
  minNodeVersion: "20.0.0",
  projenrcTs: false,
  prettier: true,
  eslint: true,
  release: false,
  peerDeps: ["@aws-sdk/client-s3@^3.1152.0"],
  devDeps: ["@aws-sdk/client-s3@^3.1152.0", "aws-sdk-client-mock@^4.1.0"],
});
runtime.package.addField("overrides", auditOverrides);
runtime.package.file.addOverride("jest.watchman", false);

// Dependency audit: prod deps must be clean, dev advisories must be allow-listed.
project.testTask.spawn(
  project.addTask("audit", {
    description: "Fail on unapproved npm audit advisories",
    steps: [
      { exec: "node build-tools/audit-check.js ." },
      { exec: "node build-tools/audit-check.js runtime" },
    ],
  }),
);

// The root build (via its test step) also builds and tests the runtime package,
// then installs the packed builds into the example app, synthesises and audits it.
project.testTask.spawn(
  project.addTask("build:runtime", {
    description: "Build and test the runtime package",
    steps: [
      { exec: "npm ci", cwd: "runtime" },
      { exec: "npx projen build", cwd: "runtime" },
    ],
  }),
);

project.testTask.spawn(
  project.addTask("test:example", {
    description:
      "Pack the local builds into examples/order-flow, synth it and audit its dependencies",
    steps: [
      { exec: "node scripts/pack-local.js", cwd: "examples/order-flow" },
      { exec: "npm install --no-audit --no-fund", cwd: "examples/order-flow" },
      { exec: "npm run synth", cwd: "examples/order-flow" },
      {
        exec: "node ../../build-tools/audit-check.js .",
        cwd: "examples/order-flow",
      },
    ],
  }),
);

project.synth();
