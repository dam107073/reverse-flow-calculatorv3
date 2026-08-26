const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("course screen uses app navigation and contains no website footer or primary web nav", () => {
  const page = read("www/course.html");
  assert.match(page, /class="learning-app-bar"/);
  assert.match(page, /href="resources\.html" aria-label="Back to Resources"/);
  assert.match(page, /hydraulics-core\.js/);
  assert.match(page, /course-engine\.js/);
  assert.doesNotMatch(page, /class="page-nav"|class="version-footer"/);
});

test("course player exposes progress, sequential path, resume, reset confirmation, and answer semantics", () => {
  const source = read("www/js/course.js");
  for (const contract of ["Course Path", "Course progress", "Lesson progress", "Continue Course", "Check Answer", "Lesson Complete", "Course Complete", "Reset Course Progress"]) assert.match(source, new RegExp(contract));
  assert.match(source, /confirm\("Reset all Fireground Hydraulics Basics progress/);
  assert.match(source, /✓ Correct answer/);
  assert.match(source, /✕ Your answer/);
  assert.match(source, /ReverseFlowCourse\.normalizeProgress/);
  assert.match(source, /ReverseFlowCourse\.isLessonUnlocked/);
  assert.match(source, /reviewState = \{ lessonId, stepId: lesson\.steps\[0\]\.id \}/);
  assert.match(source, /reviewState\?\.lessonId === lesson\.id/);
  assert.match(source, /stats\.completed === stats\.total \? firstLesson\.id : progress\.currentLessonId/);
});

test("course diagrams are responsive, accessible, theme-aware, and narrow-screen safe", () => {
  const source = read("www/js/course.js");
  const css = read("www/css/course.css");
  assert.match(source, /viewBox: "0 0 320 180"/);
  assert.match(source, /role: "img"/);
  assert.match(source, /aria-labelledby/);
  assert.match(source, /svg\.append\(svgEl\("title"/);
  assert.match(source, /svgEl\("desc"/);
  assert.match(css, /\.course-visual svg \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*height: auto;/);
  assert.match(css, /\.course-step-card \{[^}]*min-width: 0;/);
  assert.match(css, /overflow-wrap: break-word/);
  assert.match(css, /data-resolved-theme="dark"/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Resources presents the learning hierarchy without adding course to the calculator carousel", () => {
  const resources = read("www/resources.html");
  const index = read("www/index.html");
  assert.ok(resources.indexOf("Fireground Hydraulics Basics") < resources.indexOf("Practice Quiz"));
  assert.ok(resources.indexOf("Practice Quiz") < resources.indexOf("Formula Library"));
  assert.doesNotMatch(index, /Fireground Hydraulics Basics/);
});
