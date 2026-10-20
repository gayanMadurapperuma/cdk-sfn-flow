import { awscdk, github, javascript, typescript } from "projen";

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

  // Accept the standard Conventional Commits types in PR titles (projen defaults to feat/fix/chore).
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: [
          "feat",
          "fix",
          "docs",
          "style",
          "refactor",
          "perf",
          "test",
          "build",
          "ci",
          "chore",
          "revert",
        ],
      },
    },
  },

  publishToPypi: {
    distName: "cdk-sfn-flow",
    module: "cdk_sfn_flow",
  },

  // Releases are tag-driven (see the "release" workflow below), not on every push to main.
  release: false,

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

// Release builds set the version from the git tag (v1.2.3 -> 1.2.3).
const releaseVersion = process.env.RELEASE_VERSION;
if (releaseVersion) {
  project.package.addVersion(releaseVersion);
}

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
if (releaseVersion) {
  runtime.package.addVersion(releaseVersion);
}
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

// Tag-driven release: push a tag like v0.1.0 to publish cdk-sfn-flow (npm, plus
// PyPI when the PYPI_TOKEN secret is set) and cdk-sfn-flow-runtime (npm), then
// create a GitHub release.
const releaseWorkflow = project.github?.addWorkflow("release");
releaseWorkflow?.on({ push: { tags: ["v*.*.*"] } });
releaseWorkflow?.addJobs({
  release: {
    runsOn: ["ubuntu-latest"],
    // id-token: npm provenance attestations.
    permissions: {
      contents: github.workflows.JobPermission.WRITE,
      idToken: github.workflows.JobPermission.WRITE,
    },
    // Secrets can't be referenced in step `if:`, so expose whether one is set.
    env: { CI: "true", HAS_PYPI_TOKEN: "${{ secrets.PYPI_TOKEN != '' }}" },
    steps: [
      {
        name: "Checkout",
        uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
        with: { "fetch-depth": 0 },
      },
      {
        name: "Setup Node.js",
        uses: "actions/setup-node@v7.0.0",
        with: { "node-version": "22.x" },
      },
      // npm trusted publishing (OIDC) needs npm >= 11.5.1; Node 22 ships npm 10.
      { name: "Upgrade npm", run: "npm install -g npm@^11.5.1" },
      {
        name: "Setup Python",
        uses: "actions/setup-python@v7.0.0",
        with: { "python-version": "3.x" },
      },
      {
        name: "Resolve version",
        run: [
          'VERSION="${GITHUB_REF_NAME#v}"',
          'echo "$VERSION" | grep -Eq "^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$" || { echo "Invalid tag $GITHUB_REF_NAME"; exit 1; }',
          'echo "RELEASE_VERSION=$VERSION" >> "$GITHUB_ENV"',
        ].join("\n"),
      },
      { name: "Install dependencies", run: "npm ci" },
      { name: "Build", run: "npx projen build && npx projen package-all" },
      {
        name: "Check versions",
        run: [
          'test "$(node -p "require(\'./package.json\').version")" = "$RELEASE_VERSION"',
          'test "$(node -p "require(\'./runtime/package.json\').version")" = "$RELEASE_VERSION"',
          "ls dist/js dist/python runtime/dist/js",
        ].join("\n"),
      },
      {
        name: "Publish cdk-sfn-flow to npm",
        env: {
          NODE_AUTH_TOKEN: "${{ secrets.NPM_TOKEN }}",
          NPM_CONFIG_PROVENANCE: "true",
        },
        // Uses trusted publishing when configured on npmjs.com; NPM_TOKEN is only a
        // fallback for packages that don't have a trusted publisher yet.
        run: [
          'if [ -n "$NODE_AUTH_TOKEN" ]; then npm config set //registry.npmjs.org/:_authToken "$NODE_AUTH_TOKEN"; fi',
          "npm publish dist/js/cdk-sfn-flow@*.jsii.tgz --access public",
        ].join("\n"),
      },
      {
        name: "Publish cdk-sfn-flow-runtime to npm",
        env: {
          NODE_AUTH_TOKEN: "${{ secrets.NPM_TOKEN }}",
          NPM_CONFIG_PROVENANCE: "true",
        },
        run: "npm publish runtime/dist/js/cdk-sfn-flow-runtime-*.tgz --access public",
      },
      {
        name: "Publish cdk-sfn-flow to PyPI",
        if: "env.HAS_PYPI_TOKEN == 'true'",
        env: {
          TWINE_USERNAME: "__token__",
          TWINE_PASSWORD: "${{ secrets.PYPI_TOKEN }}",
        },
        run: [
          "python -m pip install --upgrade twine",
          "python -m twine upload --non-interactive dist/python/*",
        ].join("\n"),
      },
      {
        name: "Create GitHub release",
        env: { GH_TOKEN: "${{ github.token }}" },
        run: 'gh release create "$GITHUB_REF_NAME" --title "$GITHUB_REF_NAME" --generate-notes dist/js/*.tgz dist/python/* runtime/dist/js/*.tgz',
      },
    ],
  },
});

project.synth();
