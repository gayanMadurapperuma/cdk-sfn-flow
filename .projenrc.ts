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

// Folders that are not part of the jsii package.
project.npmignore?.exclude("/runtime/", "/examples/", "/docs/");
project.eslint?.addIgnorePattern("runtime/");
project.eslint?.addIgnorePattern("examples/");

/**
 * Non-jsii runtime helper package used inside Lambda handlers.
 * Publishing is wired up in the release-prep milestone.
 */
new typescript.TypeScriptProject({
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
  peerDeps: ["@aws-sdk/client-s3@^3"],
  devDeps: ["@aws-sdk/client-s3@^3", "aws-sdk-client-mock"],
});

// The root build (via its test step) also builds and tests the runtime package.
project.testTask.spawn(
  project.addTask("build:runtime", {
    description: "Build and test the runtime package",
    steps: [
      { exec: "npm ci", cwd: "runtime" },
      { exec: "npx projen build", cwd: "runtime" },
    ],
  }),
);

project.synth();
