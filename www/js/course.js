(function () {
  "use strict";
  const content = document.getElementById("courseContent");
  const status = document.getElementById("courseStatus");
  const title = document.getElementById("courseTitle");
  const context = document.getElementById("courseContext");
  const intro = document.getElementById("courseIntro");
  const back = document.getElementById("courseBack");
  const repository = new ReverseFlowResources.ResourceRepository("course");
  const feedbackController = ReverseFlowLearningFeedback.createController();
  const NS = "http://www.w3.org/2000/svg";
  let course = null;
  let progress = null;
  let reviewState = null;
  const draftSelections = new Map();

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, onClick, className = "learning-action learning-action-full") => {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  };
  const svgEl = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(ReverseFlowCourse.STORAGE_KEY) || "null"); }
    catch (_error) { return null; }
  }
  function saveProgress() {
    try { localStorage.setItem(ReverseFlowCourse.STORAGE_KEY, JSON.stringify(progress)); }
    catch (_error) {}
  }
  function resetHeader() {
    title.textContent = course.title;
    context.textContent = "Resources · Learn";
    intro.textContent = course.subtitle;
    back.href = "resources.html";
    back.setAttribute("aria-label", "Back to Resources");
    back.onclick = null;
    document.title = `${course.title} | Reverse Flow`;
  }
  function lessonHeader(lesson) {
    title.textContent = lesson.title;
    context.textContent = `Lesson ${lesson.order} of ${course.lessons.length}`;
    intro.textContent = lesson.takeaway;
    back.href = "course.html";
    back.setAttribute("aria-label", "Back to Course Overview");
    back.onclick = event => { event.preventDefault(); showOverview(true); };
    document.title = `${lesson.title} | ${course.title}`;
  }
  function updateUrl(lessonId) {
    const url = lessonId ? `course.html?lesson=${encodeURIComponent(lessonId)}` : "course.html";
    history.pushState({ lessonId: lessonId || "" }, "", url);
  }

  function progressBar(value, max, label) {
    const track = el("div", "course-progress-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", label);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(max));
    track.setAttribute("aria-valuenow", String(value));
    const fill = el("div", "course-progress-fill");
    fill.style.setProperty("--course-progress", `${max ? value / max * 100 : 0}%`);
    track.append(fill);
    return track;
  }

  function showOverview(push = false) {
    feedbackController.cleanup();
    if (push) updateUrl("");
    resetHeader();
    const stats = ReverseFlowCourse.stats(course, progress);
    const shell = el("div", "course-overview");
    const hero = el("section", "course-overview-hero");
    hero.append(el("h3", "", course.title), el("p", "course-teaching-body", course.subtitle));
    const progressCopy = el("div", "course-progress-copy");
    progressCopy.append(el("span", "", `${stats.completed} of ${stats.total} lessons complete`), el("span", "", `${stats.percentage}%`));
    hero.append(progressCopy, progressBar(stats.completed, stats.total, "Course progress"));
    const firstLesson = course.lessons[0];
    const hasStepProgress = progress.currentLessonId !== firstLesson.id || progress.currentStepId !== firstLesson.steps[0].id;
    const continueLabel = stats.completed === stats.total ? "Review Course" : (stats.completed || hasStepProgress) ? "Continue Course" : "Start Course";
    const continueLessonId = stats.completed === stats.total ? firstLesson.id : progress.currentLessonId;
    hero.append(button(continueLabel, () => showLesson(continueLessonId, true)));
    shell.append(hero, el("h3", "course-section-title", "Course Path"));

    const path = el("div", "course-path");
    course.lessons.forEach(lesson => {
      const complete = progress.completedLessonIds.includes(lesson.id);
      const unlocked = ReverseFlowCourse.isLessonUnlocked(course, progress, lesson.id);
      const current = !complete && lesson.id === stats.currentLesson.id;
      const card = button("", () => showLesson(lesson.id, true), `course-lesson-card${complete ? " is-complete" : current ? " is-current" : unlocked ? "" : " is-locked"}`);
      card.disabled = !unlocked;
      const number = el("span", "course-lesson-number", complete ? "✓" : String(lesson.order));
      const copy = el("span", "course-lesson-copy");
      copy.append(el("strong", "", lesson.title), el("span", "", lesson.minutes));
      card.append(number, copy, el("span", "course-lesson-state", complete ? "Review" : current ? "Current" : unlocked ? "Open" : "Locked"));
      path.append(card);
    });
    shell.append(path, button("Reset Course Progress", resetCourse, "learning-action learning-action-secondary learning-action-full course-reset"));
    content.replaceChildren(shell);
  }

  function resetCourse() {
    if (!confirm("Reset all Fireground Hydraulics Basics progress? This cannot be undone.")) return;
    progress = ReverseFlowCourse.defaultProgress(course);
    draftSelections.clear();
    feedbackController.resetEvents();
    saveProgress();
    showOverview(true);
  }

  function addDiagramShapes(svg, kind) {
    if (kind === "pressure-gauge") {
      svg.append(svgEl("circle", { cx: 160, cy: 86, r: 52, class: "course-surface" }), svgEl("line", { x1: 160, y1: 86, x2: 190, y2: 55, class: "course-line" }), svgEl("circle", { cx: 160, cy: 86, r: 7, class: "course-accent" }), svgEl("text", { x: 146, y: 128 }, "PSI"));
      return;
    }
    if (["opening-comparison", "pressure-flow-comparison", "hose-size-comparison", "flow-loss-comparison"].includes(kind)) {
      svg.append(svgEl("rect", { x: 35, y: 42, width: 70, height: 38, rx: 8, class: "course-surface" }), svgEl("rect", { x: 35, y: 108, width: 70, height: 38, rx: 8, class: "course-surface" }), svgEl("line", { x1: 106, y1: 61, x2: 278, y2: 61, class: "course-line" }), svgEl("line", { x1: 106, y1: 127, x2: 278, y2: 127, class: "course-line-alt" }));
      return;
    }
    if (kind === "elevation") {
      svg.append(svgEl("rect", { x: 170, y: 24, width: 105, height: 132, rx: 4, class: "course-surface" }));
      [55,88,121].forEach(y => svg.append(svgEl("line", { x1: 170, y1: y, x2: 275, y2: y, stroke: "#64748b", "stroke-width": 2 })));
      svg.append(svgEl("rect", { x: 35, y: 128, width: 68, height: 30, rx: 5, class: "course-accent" }), svgEl("path", { d: "M103 143 C135 143 130 48 170 48", class: "course-line" }), svgEl("path", { d: "M143 129 L143 55 M135 66 L143 55 L151 66", stroke: "#d95c13", "stroke-width": 4, fill: "none" }));
      return;
    }
    if (kind === "pdp-stack") {
      ["NP", "FL", "AL", "EP"].forEach((label, index) => { const x = 18 + index * 67; svg.append(svgEl("rect", { x, y: 58, width: 54, height: 48, rx: 7, class: index ? "course-surface" : "course-accent" }), svgEl("text", { x: x + 17, y: 87 }, label)); });
      svg.append(svgEl("path", { d: "M286 82 L310 82 M300 72 L310 82 L300 92", stroke: "#d95c13", "stroke-width": 4, fill: "none" }), svgEl("text", { x: 276, y: 125 }, "PDP"));
      return;
    }
    if (kind === "appliance") {
      svg.append(svgEl("path", { d: "M25 90 C70 55 90 125 130 90", class: "course-line" }), svgEl("rect", { x: 130, y: 58, width: 62, height: 64, rx: 8, class: "course-accent" }), svgEl("path", { d: "M192 90 C230 55 250 125 295 90", class: "course-line" }));
      return;
    }
    svg.append(svgEl("rect", { x: 18, y: 66, width: 65, height: 48, rx: 7, class: "course-accent" }), svgEl("path", { d: "M83 90 C120 45 145 135 185 90 S250 45 286 90", class: "course-line" }), svgEl("path", { d: "M286 72 L310 90 L286 108 Z", class: "course-accent" }));
  }

  function renderVisual(step) {
    const wrapper = el("div", "course-visual");
    const svg = svgEl("svg", { viewBox: "0 0 320 180", role: "img", preserveAspectRatio: "xMidYMid meet" });
    const titleId = `${step.id}-visual-title`;
    const descId = `${step.id}-visual-description`;
    svg.setAttribute("aria-labelledby", `${titleId} ${descId}`);
    svg.append(svgEl("title", { id: titleId }, step.title), svgEl("desc", { id: descId }, step.visual.description));
    addDiagramShapes(svg, step.visual.kind);
    const labels = el("div", "resource-badges course-visual-labels");
    step.visual.labels.forEach(label => labels.append(el("span", "resource-badge", label)));
    wrapper.append(svg, labels);
    return wrapper;
  }

  function showLesson(lessonId, push = false) {
    feedbackController.cleanup();
    const lesson = course.lessons.find(item => item.id === lessonId);
    if (!lesson || !ReverseFlowCourse.isLessonUnlocked(course, progress, lessonId)) return showOverview(push);
    if (push) updateUrl(lessonId);
    if (progress.completedLessonIds.includes(lessonId)) {
      reviewState = { lessonId, stepId: lesson.steps[0].id };
    } else {
      reviewState = null;
      progress = ReverseFlowCourse.startLesson(course, progress, lessonId);
      saveProgress();
    }
    renderStep(lesson);
  }

  function renderStep(lesson) {
    lessonHeader(lesson);
    const activeStepId = reviewState?.lessonId === lesson.id ? reviewState.stepId : progress.currentStepId;
    const stepIndex = Math.max(0, lesson.steps.findIndex(item => item.id === activeStepId));
    const step = lesson.steps[stepIndex];
    const completedCount = ReverseFlowCourse.completedStepsForLesson(lesson, progress);
    const shell = el("div", "course-step");
    const lessonProgress = el("div", "course-lesson-progress");
    const copy = el("div", "course-lesson-progress-copy");
    copy.append(el("span", "", `Lesson ${lesson.order} of ${course.lessons.length} · ${lesson.title}`), el("span", "", `Step ${stepIndex + 1} of ${lesson.steps.length} · ${completedCount} completed`));
    lessonProgress.append(copy, progressBar(stepIndex + 1, lesson.steps.length, "Lesson progress"));
    shell.append(lessonProgress);

    const card = el("section", `course-step-card${step.type === "recap" ? " course-recap" : ""}`);
    const labels = { teaching: "Learn", visual: "See It", question: step.kind === "application" ? "Fireground Check" : "Quick Check", calculation: "Work It Out", recap: "Lesson Recap" };
    card.append(el("p", "course-step-kicker", labels[step.type]));
    if (step.type === "teaching") card.append(el("h3", "", step.title), el("p", "course-teaching-statement", step.statement), ...(step.body ? [el("p", "course-teaching-body", step.body)] : []));
    if (step.type === "visual") card.append(el("h3", "", step.title), renderVisual(step), el("p", "course-teaching-body", step.visual.description));
    if (step.type === "recap") card.append(el("h3", "", step.title || "Main Takeaway"), el("p", "course-teaching-statement", step.takeaway));
    if (["question", "calculation"].includes(step.type)) renderAnswerable(card, step, lesson);
    shell.append(card);
    shell.append(renderStepActions(lesson, step, stepIndex));
    content.replaceChildren(shell);
  }

  function renderStepActions(lesson, step, stepIndex) {
    const actions = el("div", "course-step-actions");
    const previousButton = button("Previous", () => previousStep(lesson, step), "learning-action learning-action-secondary");
    previousButton.disabled = stepIndex === 0;
    actions.append(previousButton);
    const storedAnswer = ReverseFlowCourse.answerFor(progress, step.id);
    if (["question", "calculation"].includes(step.type) && !storedAnswer) {
      const check = button("Check Answer", () => submitAnswer(lesson, step), "learning-action");
      check.disabled = !Number.isInteger(draftSelections.get(step.id));
      actions.append(check);
    } else {
      const label = step.type === "recap" ? "Finish Lesson" : ["question", "calculation"].includes(step.type) ? "Next" : "Continue";
      actions.append(button(label, () => continueStep(lesson, step), "learning-action"));
    }
    return actions;
  }

  function renderAnswerable(card, step, lesson) {
    card.append(el("h3", "", step.prompt));
    const storedAnswer = ReverseFlowCourse.answerFor(progress, step.id);
    const selectedIndex = storedAnswer ? storedAnswer.selectedIndex : draftSelections.get(step.id);
    const checked = Boolean(storedAnswer);
    const choices = el("div", "course-choice-list");
    step.choices.forEach((choice, index) => {
      const label = step.type === "calculation" ? `${choice} ${step.unit}` : choice;
      const choiceButton = button("", () => {
        if (checked) return;
        draftSelections.set(step.id, index);
        feedbackController.fire("selection", `selection:${step.id}:${index}`);
        renderStep(lesson);
      }, "course-choice");
      choiceButton.append(el("span", "", label));
      choiceButton.setAttribute("aria-pressed", String(selectedIndex === index));
      choiceButton.disabled = checked;
      if (checked) {
        const result = ReverseFlowCourse.answerStep(step, selectedIndex);
        if (index === result.correctIndex) { choiceButton.classList.add("is-correct"); choiceButton.append(el("span", "course-choice-status", "✓ Correct answer")); }
        else if (index === selectedIndex) { choiceButton.classList.add("is-incorrect"); choiceButton.append(el("span", "course-choice-status", "✕ Your answer")); }
      }
      choices.append(choiceButton);
    });
    card.append(choices);
    if (!checked) return;
    const result = ReverseFlowCourse.answerStep(step, selectedIndex);
    const feedback = el("div", "course-feedback");
    feedback.setAttribute("role", "status");
    if (result.correct) feedback.append(el("span", "course-feedback-mark", "✓"));
    const feedbackCopy = el("div", "course-feedback-copy");
    feedbackCopy.append(el("strong", "", result.correct ? "Correct" : "Not quite"), el("p", "", result.explanation));
    feedback.append(feedbackCopy);
    card.append(feedback);
  }

  function submitAnswer(lesson, step) {
    const selectedIndex = draftSelections.get(step.id);
    if (!Number.isInteger(selectedIndex)) return;
    const recorded = ReverseFlowCourse.recordAnswer(course, progress, lesson.id, step.id, selectedIndex);
    progress = recorded.progress;
    saveProgress();
    renderStep(lesson);
    if (recorded.isNew) feedbackController.fire(recorded.result.correct ? "correct" : "incorrect", `answer:${step.id}`, content.querySelector(".course-feedback"));
  }

  function previousStep(lesson, step) {
    feedbackController.cleanup();
    const stepIndex = lesson.steps.findIndex(item => item.id === step.id);
    if (stepIndex <= 0) return;
    if (reviewState?.lessonId === lesson.id) reviewState.stepId = lesson.steps[stepIndex - 1].id;
    else {
      progress = ReverseFlowCourse.previous(course, progress, lesson.id, step.id);
      saveProgress();
    }
    renderStep(lesson);
  }

  function continueStep(lesson, step) {
    if (reviewState?.lessonId === lesson.id) {
      const stepIndex = lesson.steps.findIndex(item => item.id === step.id);
      if (stepIndex < lesson.steps.length - 1) {
        reviewState.stepId = lesson.steps[stepIndex + 1].id;
        renderStep(lesson);
      } else {
        reviewState = null;
        renderCompletion(lesson, ReverseFlowCourse.stats(course, progress).completed === course.lessons.length, false);
      }
      return;
    }
    const result = ReverseFlowCourse.advance(course, progress, lesson.id, step.id);
    progress = result.progress;
    saveProgress();
    if (result.lessonCompleted) renderCompletion(lesson, result.courseCompleted, true);
    else renderStep(lesson);
  }

  function renderCompletion(lesson, courseCompleted, celebrate = false) {
    feedbackController.cleanup();
    lessonHeader(lesson);
    const stats = ReverseFlowCourse.stats(course, progress);
    const complete = el("section", "course-step-card course-complete");
    complete.append(el("div", "course-complete-mark", "✓"), el("p", "course-step-kicker", courseCompleted ? "Course Complete" : "Lesson Complete"), el("h3", "", courseCompleted ? "Fireground Hydraulics Basics Complete" : `${lesson.title} Complete`), el("p", "course-teaching-statement", lesson.takeaway), el("p", "course-teaching-body", `${stats.completed} of ${stats.total} lessons complete`), progressBar(stats.completed, stats.total, "Course progress"));
    const actions = el("div", "course-actions");
    const next = course.lessons[lesson.order];
    if (next) actions.append(button(`Continue to ${next.title}`, () => showLesson(next.id, true)));
    actions.append(button(courseCompleted ? "Review Course Path" : "Back to Course Path", () => showOverview(true), "learning-action learning-action-secondary learning-action-full"));
    complete.append(actions);
    content.replaceChildren(complete);
    if (celebrate) feedbackController.fire(courseCompleted ? "course-complete" : "lesson-complete", courseCompleted ? `course:${course.id}` : `lesson:${lesson.id}`, complete);
  }

  function renderRepository(state) {
    status.textContent = state.items.length ? (state.message || (state.refreshing ? "Checking for course updates…" : "")) : (["offline", "error"].includes(state.status) ? "The course needs an initial internet connection." : state.message);
    if (!state.items.length) {
      content.replaceChildren(el("p", "learning-empty", state.status === "loading" ? "Loading Fireground Hydraulics Basics…" : "Course content is not available yet. Connect to the internet and try again."));
      if (["offline", "error"].includes(state.status)) content.append(button("Retry", () => repository.refresh({ force: true })));
      return;
    }
    if (course) return;
    course = { ...state.data.course, lessons: state.items };
    progress = ReverseFlowCourse.normalizeProgress(course, readProgress());
    saveProgress();
    const requested = new URLSearchParams(location.search).get("lesson");
    if (requested && ReverseFlowCourse.isLessonUnlocked(course, progress, requested)) showLesson(requested, false);
    else showOverview(false);
  }

  window.addEventListener("popstate", () => {
    feedbackController.cleanup();
    if (!course) return;
    const requested = new URLSearchParams(location.search).get("lesson");
    if (requested) showLesson(requested, false); else showOverview(false);
  });
  window.addEventListener("pagehide", () => feedbackController.cleanup());
  document.addEventListener("visibilitychange", () => { if (document.hidden) feedbackController.cleanup(); });
  repository.subscribe(renderRepository);
  repository.refresh();
})();
