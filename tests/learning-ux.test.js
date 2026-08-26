const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("learning screens use an app-style Resources return without website navigation or footer", () => {
  for (const file of ["www/formulas.html", "www/quiz.html"]) {
    const page = read(file);
    assert.match(page, /class="learning-app-bar"/);
    assert.match(page, /class="learning-back" href="resources\.html" aria-label="Back to Resources"/);
    assert.doesNotMatch(page, /class="page-nav"/);
    assert.doesNotMatch(page, /class="version-footer"/);
  }
});

test("formula list uses full-card links and detail content uses stacked teaching sections", () => {
  const source = read("www/js/formulas.js");
  assert.match(source, /el\("a", "formula-card"\)/);
  assert.match(source, /card\.href = `formulas\.html\?formula=/);
  assert.doesNotMatch(source, /Open Formula/);
  assert.match(source, /formula-variable-row/);
  assert.doesNotMatch(source, /el\("table"/);
  assert.match(source, /formula-example-answer/);
  assert.match(source, /formula-takeaway/);
  assert.match(source, /back\.href = "formulas\.html"/);
  assert.match(source, /Back to Formula Library/);
  assert.match(source, /quiz\.html\?category=/);
});

test("quiz setup, active feedback, and results expose the required app interactions", () => {
  const source = read("www/js/quiz.js");
  assert.match(source, /quiz-segmented/);
  assert.match(source, /Question count/);
  assert.match(source, /Start Quiz/);
  assert.match(source, /role", "progressbar"/);
  assert.match(source, /✓ Correct answer/);
  assert.match(source, /✕ Your answer/);
  assert.match(source, /Practice Missed Concepts/);
  assert.match(source, /Take Another Quiz/);
  assert.match(source, /Back to Resources/);
});

test("learning CSS preserves readable touch targets, answer semantics, and narrow-width containment", () => {
  const css = read("www/css/learning.css");
  assert.match(css, /\.learning-back \{[^}]*width: 44px;[^}]*height: 44px;/);
  assert.match(css, /\.formula-card \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;[^}]*min-width: 0;[^}]*max-width: 100%;/);
  assert.match(css, /\.formula-expression \{[^}]*max-width: 100%;[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.quiz-choice:disabled \{[^}]*opacity: 1;/);
  assert.match(css, /html\[data-resolved-theme="dark"\] \.learning-action:not\(\.learning-action-secondary\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
});
