(function (root, factory) {
  const hydraulics = typeof module === "object" && module.exports ? require("./hydraulics-core") : root.ReverseFlowHydraulics;
  const api = factory(hydraulics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowCourse = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (H) {
  "use strict";

  const PROGRESS_VERSION = 1;
  const STORAGE_KEY = "reverse-flow-fireground-hydraulics-course-v1";

  function defaultProgress(course) {
    const first = course.lessons[0];
    return { version: PROGRESS_VERSION, courseId: course.id, completedLessonIds: [], currentLessonId: first.id, currentStepId: first.steps[0].id, finalQuizCompleted: false };
  }

  function normalizedCompleted(course, values) {
    const requested = new Set(Array.isArray(values) ? values.map(String) : []);
    const completed = [];
    for (const lesson of course.lessons) {
      if (!requested.has(lesson.id)) break;
      completed.push(lesson.id);
    }
    return completed;
  }

  function isLessonUnlocked(course, progress, lessonId) {
    const index = course.lessons.findIndex(lesson => lesson.id === lessonId);
    if (index < 0) return false;
    return index === 0 || progress.completedLessonIds.includes(course.lessons[index - 1].id) || progress.completedLessonIds.includes(lessonId);
  }

  function normalizeProgress(course, raw) {
    const fallback = defaultProgress(course);
    if (!raw || raw.version !== PROGRESS_VERSION || raw.courseId !== course.id) return fallback;
    const completedLessonIds = normalizedCompleted(course, raw.completedLessonIds);
    const candidate = course.lessons.find(lesson => lesson.id === raw.currentLessonId);
    const currentLesson = candidate && isLessonUnlocked(course, { completedLessonIds }, candidate.id)
      ? candidate
      : course.lessons.find(lesson => !completedLessonIds.includes(lesson.id)) || course.lessons[course.lessons.length - 1];
    const step = currentLesson.steps.find(item => item.id === raw.currentStepId) || currentLesson.steps[0];
    return {
      version: PROGRESS_VERSION,
      courseId: course.id,
      completedLessonIds,
      currentLessonId: currentLesson.id,
      currentStepId: step.id,
      finalQuizCompleted: completedLessonIds.includes(course.lessons[course.lessons.length - 1].id)
    };
  }

  function stats(course, progress) {
    const completed = progress.completedLessonIds.length;
    const currentLesson = course.lessons.find(lesson => !progress.completedLessonIds.includes(lesson.id)) || course.lessons[course.lessons.length - 1];
    return { completed, total: course.lessons.length, percentage: Math.round(completed / course.lessons.length * 100), currentLesson };
  }

  function startLesson(course, progress, lessonId) {
    const lesson = course.lessons.find(item => item.id === lessonId);
    if (!lesson || !isLessonUnlocked(course, progress, lessonId)) return progress;
    const preserveStep = progress.currentLessonId === lessonId && !progress.completedLessonIds.includes(lessonId) && lesson.steps.some(step => step.id === progress.currentStepId);
    return { ...progress, currentLessonId: lesson.id, currentStepId: preserveStep ? progress.currentStepId : lesson.steps[0].id };
  }

  function calculateStep(step) {
    if (!step || step.type !== "calculation") throw new TypeError("A calculation step is required.");
    let value;
    if (step.operation === "frictionLoss") value = H.frictionLoss(step.inputs.coefficient, step.inputs.flowGPM, step.inputs.lengthFeet);
    else if (step.operation === "elevationPressure") value = H.elevationPressure(step.inputs.heightFeet);
    else if (step.operation === "requiredPDP") value = H.requiredPDP(step.inputs);
    else throw new Error("Unsupported course calculation.");
    const rounded = Math.round(value);
    const correctIndex = step.choices.findIndex(choice => Number(choice) === rounded);
    if (correctIndex < 0 || step.choices.filter(choice => Number(choice) === rounded).length !== 1) throw new Error("Course calculation answers do not match the hydraulic result.");
    return { value, rounded, correctIndex };
  }

  function answerStep(step, choiceIndex) {
    if (!step || !["question", "calculation"].includes(step.type)) throw new TypeError("An answerable step is required.");
    const correctIndex = step.type === "calculation" ? calculateStep(step).correctIndex : step.correctIndex;
    return {
      correct: Number(choiceIndex) === correctIndex,
      correctIndex,
      explanation: step.type === "calculation" ? step.explanation : step.feedback
    };
  }

  function advance(course, progress, lessonId, stepId) {
    const lessonIndex = course.lessons.findIndex(item => item.id === lessonId);
    const lesson = course.lessons[lessonIndex];
    if (!lesson || !isLessonUnlocked(course, progress, lessonId)) return { progress, lessonCompleted: false, courseCompleted: false };
    const stepIndex = lesson.steps.findIndex(item => item.id === stepId);
    if (stepIndex < 0) return { progress, lessonCompleted: false, courseCompleted: false };
    if (stepIndex < lesson.steps.length - 1) {
      return { progress: { ...progress, currentLessonId: lesson.id, currentStepId: lesson.steps[stepIndex + 1].id }, lessonCompleted: false, courseCompleted: false };
    }
    const completedLessonIds = normalizedCompleted(course, [...progress.completedLessonIds, lesson.id]);
    const nextLesson = course.lessons[lessonIndex + 1];
    const courseCompleted = completedLessonIds.length === course.lessons.length;
    return {
      progress: {
        ...progress,
        completedLessonIds,
        currentLessonId: nextLesson ? nextLesson.id : lesson.id,
        currentStepId: nextLesson ? nextLesson.steps[0].id : stepId,
        finalQuizCompleted: courseCompleted
      },
      lessonCompleted: true,
      courseCompleted
    };
  }

  return { PROGRESS_VERSION, STORAGE_KEY, advance, answerStep, calculateStep, defaultProgress, isLessonUnlocked, normalizeProgress, startLesson, stats };
});
