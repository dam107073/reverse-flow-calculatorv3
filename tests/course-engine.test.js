const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../www/js/course-engine");

function fixtureCourse() {
  return {
    id: "fireground-hydraulics-basics",
    title: "Fireground Hydraulics Basics",
    lessons: Array.from({ length: 10 }, (_, index) => ({
      id: `lesson-${index + 1}`,
      order: index + 1,
      title: `Lesson ${index + 1}`,
      steps: Array.from({ length: 5 }, (_unused, stepIndex) => ({ id: `l${index + 1}-s${stepIndex + 1}`, type: stepIndex === 4 ? "recap" : "teaching" }))
    }))
  };
}

test("course progress starts at Lesson 1 and unlocks lessons sequentially", () => {
  const course = fixtureCourse();
  const progress = C.defaultProgress(course);
  assert.equal(progress.currentLessonId, "lesson-1");
  assert.equal(progress.currentStepId, "l1-s1");
  assert.equal(C.isLessonUnlocked(course, progress, "lesson-1"), true);
  assert.equal(C.isLessonUnlocked(course, progress, "lesson-2"), false);
  assert.equal(C.startLesson(course, progress, "lesson-2"), progress);
});

test("current step persists on resume and malformed future completion is removed", () => {
  const course = fixtureCourse();
  const resumed = C.normalizeProgress(course, { version: 1, courseId: course.id, completedLessonIds: ["lesson-1"], currentLessonId: "lesson-2", currentStepId: "l2-s3" });
  assert.equal(resumed.currentLessonId, "lesson-2");
  assert.equal(resumed.currentStepId, "l2-s3");
  const sanitized = C.normalizeProgress(course, { version: 1, courseId: course.id, completedLessonIds: ["lesson-1", "lesson-3"], currentLessonId: "lesson-4", currentStepId: "bad" });
  assert.deepEqual(sanitized.completedLessonIds, ["lesson-1"]);
  assert.equal(sanitized.currentLessonId, "lesson-2");
});

test("advancing saves steps, completes lessons, keeps review available, and unlocks the next lesson", () => {
  const course = fixtureCourse();
  let progress = C.defaultProgress(course);
  let result = C.advance(course, progress, "lesson-1", "l1-s1");
  assert.equal(result.progress.currentStepId, "l1-s2");
  result = C.advance(course, result.progress, "lesson-1", "l1-s5");
  progress = result.progress;
  assert.equal(result.lessonCompleted, true);
  assert.deepEqual(progress.completedLessonIds, ["lesson-1"]);
  assert.equal(progress.currentLessonId, "lesson-2");
  assert.equal(C.isLessonUnlocked(course, progress, "lesson-1"), true);
  assert.equal(C.isLessonUnlocked(course, progress, "lesson-2"), true);
  const review = C.startLesson(course, progress, "lesson-1");
  assert.equal(review.currentStepId, "l1-s1");
});

test("course stats and final completion remain deterministic through all ten lessons", () => {
  const course = fixtureCourse();
  let progress = C.defaultProgress(course);
  for (const lesson of course.lessons) progress = C.advance(course, progress, lesson.id, lesson.steps[4].id).progress;
  const stats = C.stats(course, progress);
  assert.equal(stats.completed, 10);
  assert.equal(stats.percentage, 100);
  assert.equal(progress.finalQuizCompleted, true);
  assert.equal(C.isLessonUnlocked(course, progress, "lesson-10"), true);
  assert.deepEqual(C.defaultProgress(course).completedLessonIds, []);
});

test("question answers expose correct and incorrect states with useful feedback", () => {
  const step = { type: "question", correctIndex: 2, feedback: "PSI measures pressure." };
  assert.deepEqual(C.answerStep(step, 2), { correct: true, correctIndex: 2, explanation: "PSI measures pressure." });
  assert.deepEqual(C.answerStep(step, 0), { correct: false, correctIndex: 2, explanation: "PSI measures pressure." });
});

test("course calculations use canonical hydraulics and match one displayed answer", () => {
  const cases = [
    { type:"calculation",operation:"frictionLoss",inputs:{coefficient:15.5,flowGPM:150,lengthFeet:200},choices:[35,50,70,140],unit:"PSI",explanation:"70 PSI" },
    { type:"calculation",operation:"elevationPressure",inputs:{heightFeet:50},choices:[10,22,43,50],unit:"PSI",explanation:"22 PSI" },
    { type:"calculation",operation:"requiredPDP",inputs:{nozzlePressure:50,frictionLossPSI:70,applianceLoss:10,elevationPressure:22},choices:[102,120,142,152],unit:"PSI",explanation:"152 PSI" }
  ];
  assert.deepEqual(cases.map(step => C.calculateStep(step).rounded), [70,22,152]);
  assert.deepEqual(cases.map(step => C.answerStep(step, C.calculateStep(step).correctIndex).correct), [true,true,true]);
  assert.throws(() => C.calculateStep({ ...cases[0], choices:[1,2,3,4] }), /do not match/);
});
