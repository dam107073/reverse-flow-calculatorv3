(function () {
  "use strict";
  const STORAGE_KEY = "reverse-flow-practice-quiz-session-v1";
  const content = document.getElementById("quizContent");
  const status = document.getElementById("quizStatus");
  const repository = new ReverseFlowResources.ResourceRepository("quiz");
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let concepts = [];
  let session = restore();

  function restore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && Array.isArray(value.questions) && value.questions.length && value.completed === false ? value : null;
    } catch (_error) { return null; }
  }

  function save() {
    try {
      if (session && !session.completed) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {}
  }

  function button(label, onClick, className = "learning-action") {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function selectField(label, values, current) {
    const field = el("label", "quiz-select-field", label);
    const select = el("select");
    values.forEach(value => {
      const option = el("option", "", value.label);
      option.value = value.id;
      if (value.id === current) option.selected = true;
      select.append(option);
    });
    field.append(select);
    return { field, select };
  }

  function segmentedField(label, name, values, current) {
    const section = el("fieldset", "quiz-setup-section");
    const legend = el("legend", "quiz-setup-label", label);
    const group = el("div", "quiz-segmented");
    const inputs = [];
    values.forEach(value => {
      const option = el("label");
      const input = el("input");
      input.type = "radio";
      input.name = name;
      input.value = value.id;
      input.checked = value.id === current;
      option.append(input, el("span", "", value.label));
      group.append(option);
      inputs.push(input);
    });
    section.append(legend, group);
    return { field: section, value: () => inputs.find(input => input.checked)?.value };
  }

  function showSetup() {
    session = null;
    save();
    const params = new URLSearchParams(location.search);
    const requested = params.get("category");
    const initial = ReverseFlowQuiz.CATEGORIES.some(item => item.id === requested) ? requested : "all";
    const setup = el("div", "quiz-setup");
    const availability = el("p", "helper", concepts.length ? "Questions combine randomized calculations, operational applications, and saved website concepts." : "Concept updates are not cached on this device yet. Randomized calculation and application questions remain available offline.");
    availability.id = "quizAvailability";
    const category = selectField("Category", ReverseFlowQuiz.CATEGORIES, initial);
    const difficulty = segmentedField("Difficulty", "quizDifficulty", ReverseFlowQuiz.DIFFICULTIES.map(id => ({ id, label: id[0].toUpperCase() + id.slice(1) })), "basic");
    const count = segmentedField("Question count", "quizCount", [5, 10, 20].map(id => ({ id: String(id), label: String(id) })), "10");
    const error = el("p", "learning-status");
    const start = button("Start Quiz", () => {
      try {
        session = ReverseFlowQuiz.createSession({ concepts, category: category.select.value, difficulty: difficulty.value(), count: Number(count.value()), seed: Date.now() });
        save();
        renderQuestion();
      } catch (caught) { error.textContent = caught.message; }
    }, "learning-action learning-action-full quiz-start");
    setup.append(availability, category.field, difficulty.field, count.field, error, start);
    content.replaceChildren(setup);
  }

  function renderQuestion() {
    if (!session) return showSetup();
    if (session.completed) return renderResults();
    const question = session.questions[session.currentIndex];
    const answer = session.answers.find(item => item.questionId === question.id);
    const shell = el("div", "quiz-question");
    const progress = el("div", "quiz-progress");
    const progressCopy = el("div", "quiz-progress-copy");
    progressCopy.append(el("span", "", `Question ${session.currentIndex + 1} of ${session.questions.length}`), el("span", "", `${session.answers.filter(item => item.correct).length} correct`));
    const progressTrack = el("div", "quiz-progress-track");
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-label", "Quiz progress");
    progressTrack.setAttribute("aria-valuemin", "0");
    progressTrack.setAttribute("aria-valuemax", String(session.questions.length));
    progressTrack.setAttribute("aria-valuenow", String(session.currentIndex + 1));
    const progressFill = el("div", "quiz-progress-fill");
    progressFill.style.setProperty("--quiz-progress", `${((session.currentIndex + 1) / session.questions.length) * 100}%`);
    progressTrack.append(progressFill);
    progress.append(progressCopy, progressTrack);
    shell.append(progress, el("p", "quiz-question-meta", `${question.category.replaceAll("-", " ")} · ${question.difficulty}`), el("h3", "", question.prompt));

    const choices = el("div", "quiz-choice-list");
    question.choices.forEach((choice, index) => {
      const choiceButton = button("", () => {
        session = ReverseFlowQuiz.answerQuestion(session, index);
        save();
        renderQuestion();
      }, "quiz-choice");
      choiceButton.append(el("span", "", choice));
      choiceButton.setAttribute("aria-pressed", String(Boolean(answer && answer.choiceIndex === index)));
      choiceButton.disabled = Boolean(answer);
      if (answer && index === question.correctIndex) {
        choiceButton.classList.add("is-correct");
        choiceButton.append(el("span", "quiz-choice-status", "✓ Correct answer"));
      } else if (answer && index === answer.choiceIndex) {
        choiceButton.classList.add("is-incorrect");
        choiceButton.append(el("span", "quiz-choice-status", "✕ Your answer"));
      }
      choices.append(choiceButton);
    });
    shell.append(choices);

    if (answer) {
      const feedback = el("section", "quiz-feedback");
      feedback.setAttribute("role", "status");
      feedback.tabIndex = -1;
      feedback.append(
        el("strong", "", answer.correct ? "Correct" : "Not quite"),
        el("p", "", `Correct answer: ${question.choices[question.correctIndex]}`),
        el("p", "", question.explanation)
      );
      if (question.math) feedback.append(el("div", "formula-expression", question.math));
      const actions = el("div", "quiz-feedback-actions");
      actions.append(
        button(session.currentIndex === session.questions.length - 1 ? "See Results" : "Next Question", () => {
          session = ReverseFlowQuiz.nextQuestion(session);
          save();
          renderQuestion();
        }, "learning-action learning-action-full"),
        button("End Quiz", showSetup, "learning-action learning-action-secondary learning-action-full quiz-end")
      );
      shell.append(feedback, actions);
    } else {
      shell.append(button("End Quiz", showSetup, "learning-action learning-action-secondary learning-action-full quiz-end"));
    }
    content.replaceChildren(shell);
    if (answer) shell.querySelector(".quiz-feedback").focus();
  }

  function renderResults() {
    save();
    const score = ReverseFlowQuiz.scoreSession(session);
    const shell = el("div", "quiz-results");
    const message = score.percentage >= 80 ? "The main relationships are landing. Review any misses to keep them sharp." : score.percentage >= 60 ? "You have a working base. Reviewing the missed concepts will strengthen the next round." : "Use the review below to identify which relationships to practice next.";
    shell.append(el("h3", "", "Quiz Complete"));
    const hero = el("section", "quiz-result-hero");
    hero.append(el("div", "quiz-result-score", `${score.percentage}%`), el("p", "quiz-result-summary", `${score.correct} of ${score.total} correct`), el("p", "quiz-result-message", message));
    shell.append(hero);

    const breakdown = el("section", "quiz-breakdown");
    breakdown.append(el("h4", "", "Performance Breakdown"));
    score.byCategory.forEach(item => {
      const row = el("div", "quiz-breakdown-row");
      row.append(el("span", "", item.category.replaceAll("-", " ")), el("strong", "", `${item.correct} of ${item.total}`));
      breakdown.append(row);
    });
    shell.append(breakdown);

    const missed = score.missed.map(answer => ({ answer, question: session.questions.find(question => question.id === answer.questionId) }));
    if (missed.length) {
      shell.append(el("h4", "quiz-review-heading", "Review Missed Questions"));
      const review = el("div", "quiz-review");
      missed.forEach(({ answer, question }) => {
        const card = el("article", "quiz-review-item");
        card.append(el("strong", "", question.prompt), el("p", "", `Your answer: ${question.choices[answer.choiceIndex]}`), el("p", "", `Correct answer: ${question.choices[question.correctIndex]}`), el("p", "", question.explanation));
        review.append(card);
      });
      shell.append(review);
    }

    const actions = el("div", "quiz-results-actions");
    if (missed.length) actions.append(button("Practice Missed Concepts", () => {
      session = ReverseFlowQuiz.createRetrySession(session, concepts, Date.now());
      save();
      renderQuestion();
    }, "learning-action learning-action-full"));
    actions.append(button("Take Another Quiz", showSetup, `learning-action learning-action-full${missed.length ? " learning-action-secondary" : ""}`));
    const resources = el("a", "learning-action learning-action-secondary learning-action-full", "Back to Resources");
    resources.href = "resources.html";
    actions.append(resources);
    shell.append(actions);
    content.replaceChildren(shell);
  }

  repository.subscribe(state => {
    concepts = state.items || [];
    status.textContent = concepts.length ? (state.message || (state.refreshing ? "Checking for question updates…" : "")) : (["offline", "error"].includes(state.status) ? "Concept questions need an initial internet connection. Calculation practice remains available offline." : state.message);
    const availability = document.getElementById("quizAvailability");
    if (availability && concepts.length) availability.textContent = "Questions combine randomized calculations, operational applications, and saved website concepts.";
    if (!session && content.childElementCount === 0) showSetup();
  });
  if (session) renderQuestion();
  repository.refresh();
})();
