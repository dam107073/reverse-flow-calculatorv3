const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const appBuild = fs.readFileSync(
  path.join(root, "android", "app", "build.gradle"),
  "utf8"
);
const safety = fs.readFileSync(
  path.join(root, "android", "duplicate-generated-artifacts.gradle"),
  "utf8"
);
const androidGitignore = fs.readFileSync(
  path.join(root, "android", ".gitignore"),
  "utf8"
);

test("Android release loads generated-artifact lifecycle protection", () => {
  assert.match(
    appBuild,
    /apply from: rootProject\.file\('duplicate-generated-artifacts\.gradle'\)/
  );
  assert.match(safety, /sanitizeDuplicateGeneratedArtifacts/);
  assert.match(safety, /verifyNoDuplicateGeneratedArtifacts/);
  assert.match(safety, /task\.name\.startsWith\("mergeDex"\)/);
});

test("app build output is excluded from macOS cloud synchronization", () => {
  assert.match(
    appBuild,
    /layout\.buildDirectory\.set\(file\("build\.nosync"\)\)/
  );
  assert.match(androidGitignore, /^build\.nosync\/$/m);
  assert.match(
    appBuild,
    /layout\.buildDirectory\.dir\("intermediates\/packaged_res"\)/
  );
});

test("artifact cleanup is limited to impossible generated conflict names", () => {
  assert.match(safety, /layout\.buildDirectory\.dir\("intermediates"\)/);
  assert.match(safety, /\\d\+\\\.\(jar\|dex\|class\)/);
  assert.match(safety, /Files\.mismatch/);
  assert.match(safety, /Generated conflict copy has no canonical artifact/);
  assert.match(safety, /Generated conflict copy differs/);
  assert.doesNotMatch(safety, /pickFirst|exclude group|exclude module|duplicatesStrategy/);
  assert.doesNotMatch(safety, /androidx\.activity|activity-ktx/);
});
