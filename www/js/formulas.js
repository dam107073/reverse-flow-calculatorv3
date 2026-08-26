(function () {
  "use strict";
  const content = document.getElementById("formulaContent");
  const status = document.getElementById("formulaStatus");
  const repository = new ReverseFlowResources.ResourceRepository("formulas");
  const screenTitle = document.getElementById("formulaTitle");
  const screenContext = document.querySelector(".learning-app-context");
  const intro = document.querySelector(".learning-intro");
  const back = document.querySelector(".learning-back");
  const params = new URLSearchParams(location.search);
  const requestedId = params.get("formula");
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const action = (label, href, secondary = false) => {
    const link = el("a", `learning-action${secondary ? " learning-action-secondary" : ""}`, label);
    link.href = href;
    return link;
  };

  function renderDetail(item) {
    screenTitle.textContent = item.title;
    screenContext.textContent = "Formula Library";
    intro.textContent = item.summary;
    back.href = "formulas.html";
    back.setAttribute("aria-label", "Back to Formula Library");
    document.title = `${item.title} | Reverse Flow`;
    const detail = el("article", "formula-detail");
    const formula = el("section", "formula-section");
    formula.append(el("h3", "", "Formula"), el("div", "formula-expression", item.formula));
    detail.append(formula);

    const tells = el("section", "formula-section");
    tells.append(el("h3", "", "What It Tells You"), el("p", "", item.tellsYou));
    detail.append(tells);

    const variables = el("section", "formula-section");
    variables.append(el("h3", "", "Variables"));
    const variableList = el("div", "formula-variables");
    item.variables.forEach(variable => {
      const row = el("div", "formula-variable-row");
      row.append(
        el("strong", "formula-variable-symbol", variable.symbol),
        el("span", "formula-variable-meaning", variable.meaning),
        el("span", "formula-variable-units", variable.units)
      );
      variableList.append(row);
    });
    variables.append(variableList);
    detail.append(variables);

    const explanation = el("section", "formula-section");
    explanation.append(el("h3", "", "Plain-Language Explanation"), el("p", "", item.explanation));
    detail.append(explanation);

    const example = el("section", "formula-section formula-example");
    example.append(el("h3", "", "Worked Example"), el("p", "", item.example.scenario));
    const steps = el("ol");
    item.example.steps.forEach(step => steps.append(el("li", "", step)));
    example.append(steps, el("strong", "formula-example-answer", item.example.answer));
    detail.append(example);

    const takeaway = el("section", "formula-section formula-takeaway");
    takeaway.append(el("h3", "", "Takeaway"), el("p", "", item.takeaway));
    detail.append(takeaway);

    const actions = el("div", "learning-actions");
    const practice = action("Practice This Formula", `quiz.html?category=${encodeURIComponent(item.quizCategory)}`);
    practice.classList.add("learning-action-full");
    actions.append(practice, action("All Formulas", "formulas.html", true), action("Back to Resources", "resources.html", true));
    detail.append(actions);
    content.replaceChildren(detail);
  }

  function renderList(items) {
    const shell = el("div", "learning-shell");
    const toolbar = el("div", "learning-toolbar");
    const field = el("label", "", "Search formulas");
    const input = el("input");
    input.type = "search";
    input.placeholder = "Search by title, category, or formula";
    field.append(input);
    toolbar.append(field, action("Start Practice Quiz", "quiz.html"));
    const list = el("div", "formula-list");
    shell.append(toolbar, list);
    content.replaceChildren(shell);

    const update = () => {
      const query = input.value.trim().toLowerCase();
      const filtered = items.filter(item => [item.title, item.category, item.summary, item.formula].join(" ").toLowerCase().includes(query));
      list.replaceChildren();
      filtered.forEach(item => {
        const card = el("a", "formula-card");
        card.href = `formulas.html?formula=${encodeURIComponent(item.id)}`;
        const copy = el("div", "formula-card-copy");
        copy.append(el("h3", "", item.title), el("p", "helper", item.summary), el("div", "formula-expression", item.formula));
        card.append(copy, el("span", "formula-card-chevron", "›"));
        list.append(card);
      });
      if (!filtered.length) list.append(el("p", "learning-empty", "No formulas match that search."));
    };
    input.addEventListener("input", update);
    update();
  }

  function render(state) {
    status.textContent = state.items.length ? (state.message || (state.refreshing ? "Checking for formula updates…" : "")) : (["offline", "error"].includes(state.status) ? "Formula content needs an initial internet connection." : state.message);
    if (!state.items.length) {
      content.replaceChildren(el("p", "learning-empty", state.status === "loading" ? "Loading Formula Library…" : "Formula content is not available yet. Connect to the internet and try again."));
      if (["offline", "error"].includes(state.status)) {
        const retry = el("button", "learning-action learning-action-full", "Retry");
        retry.type = "button";
        retry.addEventListener("click", () => repository.refresh({ force: true }));
        content.append(retry);
      }
      return;
    }
    if (requestedId) {
      const item = state.items.find(candidate => candidate.id === requestedId);
      if (item) renderDetail(item);
      else content.replaceChildren(el("p", "learning-empty", "That formula is not available in this version of the library."), action("View All Formulas", "formulas.html"));
    } else renderList(state.items);
  }

  repository.subscribe(render);
  repository.refresh();
})();
