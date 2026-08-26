(function () {
  "use strict";
  const content = document.getElementById("formulaContent");
  const status = document.getElementById("formulaStatus");
  const repository = new ReverseFlowResources.ResourceRepository("formulas");
  const params = new URLSearchParams(location.search);
  const requestedId = params.get("formula");
  const el = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text; return node; };
  const action = (label, href) => { const link=el("a","reset-button nav-button-link",label); link.href=href; return link; };

  function renderDetail(item) {
    const detail=el("article","formula-detail");
    const heading=el("div","learning-heading"); const title=el("div"); title.append(el("h2","",item.title),el("p","helper",item.summary)); heading.append(title,action("All Formulas","formulas.html")); detail.append(heading);
    const formula=el("section","formula-section"); formula.append(el("h3","","Formula"),el("div","formula-expression",item.formula)); detail.append(formula);
    const tells=el("section","formula-section"); tells.append(el("h3","","What It Tells You"),el("p","",item.tellsYou)); detail.append(tells);
    const variables=el("section","formula-section"); variables.append(el("h3","","Variables")); const table=el("table","formula-variables"); const head=el("tr"); ["Symbol","Meaning","Units"].forEach(label=>head.append(el("th","",label))); const thead=el("thead");thead.append(head);table.append(thead);const tbody=el("tbody"); item.variables.forEach(variable=>{const row=el("tr");[variable.symbol,variable.meaning,variable.units].forEach(value=>row.append(el("td","",value)));tbody.append(row);});table.append(tbody);variables.append(table);detail.append(variables);
    const explanation=el("section","formula-section"); explanation.append(el("h3","","Plain-Language Explanation"),el("p","",item.explanation)); detail.append(explanation);
    const example=el("section","formula-section"); example.append(el("h3","","Worked Example"),el("p","",item.example.scenario)); const steps=el("ol");item.example.steps.forEach(step=>steps.append(el("li","",step)));example.append(steps,el("strong","",item.example.answer));detail.append(example);
    const takeaway=el("section","formula-section"); takeaway.append(el("h3","","Operational Takeaway"),el("p","",item.takeaway));detail.append(takeaway);
    const actions=el("div","learning-actions");actions.append(action("Practice This Formula",`quiz.html?category=${encodeURIComponent(item.quizCategory)}`),action("Back to Resources","resources.html"));detail.append(actions);content.replaceChildren(detail);
  }
  function renderList(items) {
    const shell=el("div","learning-shell");const toolbar=el("div","learning-toolbar");const field=el("label","","Search formulas");const input=el("input");input.type="search";input.placeholder="Search by title, category, or formula";field.append(input);toolbar.append(field,action("Start Practice Quiz","quiz.html"));const list=el("div","formula-list");shell.append(toolbar,list);content.replaceChildren(shell);
    const update=()=>{const query=input.value.trim().toLowerCase();const filtered=items.filter(item=>[item.title,item.category,item.summary,item.formula].join(" ").toLowerCase().includes(query));list.replaceChildren();filtered.forEach(item=>{const card=el("article","formula-card");card.append(el("h3","",item.title),el("p","helper",item.summary),el("div","formula-expression",item.formula),action("Open Formula",`formulas.html?formula=${encodeURIComponent(item.id)}`));list.append(card);});if(!filtered.length)list.append(el("p","learning-empty","No formulas match that search."));};input.addEventListener("input",update);update();
  }
  function render(state) {
    status.textContent=state.items.length ? (state.message || (state.refreshing ? "Checking for formula updates…" : "")) : (["offline","error"].includes(state.status) ? "Formula content needs an initial internet connection." : state.message);
    if(!state.items.length){content.replaceChildren(el("p","learning-empty",state.status==="loading"?"Loading Formula Library…":"Formula content is not available yet. Connect to the internet and try again."));if(["offline","error"].includes(state.status)){const retry=el("button","reset-button","Retry");retry.type="button";retry.addEventListener("click",()=>repository.refresh({force:true}));content.append(retry);}return;}
    if(requestedId){const item=state.items.find(candidate=>candidate.id===requestedId);if(item)renderDetail(item);else content.replaceChildren(el("p","learning-empty","That formula is not available in this version of the library."),action("View All Formulas","formulas.html"));}else renderList(state.items);
  }
  repository.subscribe(render); repository.refresh();
})();
