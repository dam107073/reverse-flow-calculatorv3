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
  assert.match(page, /learning-feedback\.js/);
  assert.doesNotMatch(page, /class="page-nav"|class="version-footer"/);
});

test("course player exposes progress, sequential path, resume, reset confirmation, and answer semantics", () => {
  const source = read("www/js/course.js");
  for (const contract of ["Course Path", "Course progress", "Lesson progress", "Continue Course", "Previous", "Check Answer", "Finish Lesson", "Lesson Complete", "Course Complete", "Reset Course Progress"]) assert.match(source, new RegExp(contract));
  assert.match(source, /confirm\("Reset all Fireground Hydraulics Basics progress/);
  assert.match(source, /✓ Correct answer/);
  assert.match(source, /✕ Your answer/);
  assert.match(source, /ReverseFlowCourse\.normalizeProgress/);
  assert.match(source, /ReverseFlowCourse\.isLessonUnlocked/);
  assert.match(source, /reviewState = \{ lessonId, stepId: lesson\.steps\[0\]\.id \}/);
  assert.match(source, /reviewState\?\.lessonId === lesson\.id/);
  assert.match(source, /stats\.completed === stats\.total \? firstLesson\.id : progress\.currentLessonId/);
  assert.match(source, /ReverseFlowCourse\.recordAnswer/);
  assert.match(source, /ReverseFlowCourse\.selectPendingAnswer/);
  assert.match(source, /ReverseFlowCourse\.pendingAnswerFor/);
  assert.match(source, /setAttribute\("aria-pressed", String\(selectedIndex === index\)\)/);
  assert.match(source, /"✓ Selected"/);
  assert.match(source, /check\.disabled = !ReverseFlowCourse\.pendingAnswerFor/);
  assert.ok(source.indexOf("ReverseFlowCourse.selectPendingAnswer") < source.indexOf("ReverseFlowCourse.recordAnswer"), "Selection must be stored before the separate grading action.");
  assert.match(source, /ReverseFlowCourse\.previous/);
  assert.match(source, /previousButton\.disabled = stepIndex === 0/);
  assert.match(source, /feedbackController\.fire/);
  assert.match(source, /step\.kind === "guided-practice" \? "Guided Practice" : "Learn"/);
  assert.doesNotMatch(source, /answerState/);
});

test("answered steps and review navigation use persisted state without replaying effects", () => {
  const source = read("www/js/course.js");
  assert.match(source, /ReverseFlowCourse\.answerFor\(progress, step\.id\)/);
  assert.match(source, /if \(recorded\.isNew\) feedbackController\.fire/);
  assert.match(source, /renderCompletion\(lesson, ReverseFlowCourse\.stats\(course, progress\)\.completed === course\.lessons\.length, false\)/);
  assert.match(source, /reviewState\.stepId = lesson\.steps\[stepIndex - 1\]\.id/);
  assert.match(source, /pagehide/);
  assert.match(source, /visibilitychange/);
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
  assert.match(css, /course-confetti/);
  assert.match(css, /\.course-confetti \{[^}]*position: fixed;[^}]*inset: 50% auto auto 50%;/);
  assert.match(css, /\.course-confetti \{[^}]*overflow: visible;/);
  assert.doesNotMatch(css, /\.course-confetti \{[^}]*contain:\s*[^;}]*paint/);
  assert.doesNotMatch(read("www/js/learning-feedback.js"), /getBoundingClientRect/);
  assert.match(css, /course-success-pop/);
  assert.match(css, /course-step-actions/);
  assert.match(css, /course-choice-selected/);
  assert.match(css, /background: rgba\(37,99,235/);
});

test("Settings exposes a local Learning Sounds preference without changing appearance controls", () => {
  const settings = read("www/settings.html");
  const feedback = read("www/js/learning-feedback.js");
  const packageJson = JSON.parse(read("package.json"));
  assert.match(settings, /Learning Sounds/);
  assert.match(settings, /data-learning-sounds/);
  assert.match(settings, /learning-feedback\.js/);
  assert.match(feedback, /reverse-flow-learning-sounds-v1/);
  assert.match(feedback, /prefers-reduced-motion: reduce/);
  assert.match(feedback, /registerPlugin\("Haptics"\)/);
  assert.equal(packageJson.dependencies["@capacitor/haptics"], "^8.0.2");
});

test("Resources presents the learning hierarchy without adding course to the calculator carousel", () => {
  const resources = read("www/resources.html");
  const index = read("www/index.html");
  assert.ok(resources.indexOf("Fireground Hydraulics Basics") < resources.indexOf("Practice Quiz"));
  assert.ok(resources.indexOf("Practice Quiz") < resources.indexOf("Formula Library"));
  assert.doesNotMatch(index, /Fireground Hydraulics Basics/);
});
