(function () {
  "use strict";
  const R = window.ReverseFlowResources;
  const list = document.getElementById("resourceResults");
  const filtersRoot = document.getElementById("resourceFilters");
  const status = document.getElementById("resourceStatus");
  const refresh = document.getElementById("resourceRefresh");
  if (!R || !list || !filtersRoot || !status || !refresh) return;

  const params = new URLSearchParams(window.location.search);
  const legacySection = params.get("section") || "";
  const type = legacySection === "training-partners" || legacySection === "training-partner" || legacySection === "training"
    ? "training"
    : legacySection === "articles"
      ? "articles"
      : "hose";
  const repository = new R.ResourceRepository(type);
  const filterState = {};
  let resourceState = repository.state;

  const titles = {
    training: ["Training Directory", "Reviewed fire service training resources and instructor listings."],
    hose: ["Hose Library", "Current published hose information from Reverse Flow."],
    articles: ["Articles", "Published articles and field notes from the Reverse Flow community."]
  };
  document.title = `${titles[type][0]} | Reverse Flow`;
  document.getElementById("resourceTitle").textContent = titles[type][0];
  document.getElementById("resourceHelper").textContent = titles[type][1];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))); }
  function options(values, selected, allLabel, valueKey, labelKey) {
    return `<option value="">${escapeHtml(allLabel)}</option>${values.map(value => {
      const key = valueKey ? value[valueKey] : value;
      const label = labelKey ? value[labelKey] : value;
      return `<option value="${escapeHtml(key)}"${String(key) === String(selected || "") ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("")}`;
  }
  function formattedDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }
  function badge(value, modifier = "") { return value ? `<span class="resource-badge${modifier ? ` ${modifier}` : ""}">${escapeHtml(value)}</span>` : ""; }

  function renderFilters() {
    const items = resourceState.items || [];
    if (type === "training") {
      filtersRoot.innerHTML = `<label class="resource-filter-wide"><span>Search</span><input type="search" data-filter="search" value="${escapeHtml(filterState.search || "")}" placeholder="Search providers, topics, or locations"></label>
        <label><span>Specialty</span><select data-filter="topic">${options(unique(items.flatMap(item => item.specialties)), filterState.topic, "All specialties")}</select></label>
        <label><span>Location</span><select data-filter="location">${options(unique(items.flatMap(item => item.statesServed.length ? item.statesServed : [item.serviceArea])), filterState.location, "All locations")}</select></label>`;
    } else if (type === "hose") {
      const dataFilters = resourceState.data && resourceState.data.filters || {};
      const manufacturers = Array.isArray(dataFilters.manufacturers) ? dataFilters.manufacturers : unique(items.map(item => item.manufacturerSlug)).map(slug => ({ slug, name: items.find(item => item.manufacturerSlug === slug).manufacturer }));
      const diameters = Array.isArray(dataFilters.diameters) ? dataFilters.diameters : unique(items.map(item => item.nominalDiameter)).map(value => ({ value }));
      const lifecycle = Array.isArray(dataFilters.lifecycle) ? dataFilters.lifecycle : unique(items.map(item => item.lifecycle)).map(value => ({ value, label: value }));
      filtersRoot.innerHTML = `<label class="resource-filter-wide"><span>Search</span><input type="search" data-filter="search" value="${escapeHtml(filterState.search || "")}" placeholder="Search manufacturer, product, or size"></label>
        <label><span>Manufacturer</span><select data-filter="manufacturer">${options(manufacturers, filterState.manufacturer, "All manufacturers", "slug", "name")}</select></label>
        <label><span>Diameter group</span><select data-filter="diameterGroup">${options([{ key: "small", label: '2.75" and below' }, { key: "large", label: '3" and above' }], filterState.diameterGroup, "All diameter groups", "key", "label")}</select></label>
        <label><span>Nominal diameter</span><select data-filter="diameter">${options(diameters.map(row => ({ value: row.value, label: `${row.value}\"` })), filterState.diameter, "All diameters", "value", "label")}</select></label>
        <label><span>Lifecycle</span><select data-filter="lifecycle">${options(lifecycle, filterState.lifecycle, "All lifecycle states", "value", "label")}</select></label>
        <label><span>Sort</span><select data-filter="sort">${options([{ value: "manufacturer", label: "Manufacturer" }, { value: "diameter", label: "Diameter" }, { value: "product", label: "Product" }], filterState.sort || "manufacturer", "", "value", "label")}</select></label>`;
    } else {
      filtersRoot.innerHTML = `<label class="resource-filter-wide"><span>Search</span><input type="search" data-filter="search" value="${escapeHtml(filterState.search || "")}" placeholder="Search title, category, or author"></label>
        <label><span>Category</span><select data-filter="category">${options(unique(items.map(item => item.category)), filterState.category, "All categories")}</select></label>
        <label><span>Type</span><select data-filter="contentType">${options([{ value: "article", label: "Article" }, { value: "field_note", label: "Field Note" }], filterState.contentType, "Articles and Field Notes", "value", "label")}</select></label>
        <label class="resource-featured-filter"><input type="checkbox" data-filter="featured"${filterState.featured ? " checked" : ""}><span>Featured only</span></label>`;
    }
  }

  function visibleItems() {
    if (type === "training") return R.filterTraining(resourceState.items, filterState);
    if (type === "hose") return R.filterHose(resourceState.items, filterState);
    return R.filterArticles(resourceState.items, filterState);
  }
  function trainingCard(item) {
    return `<article class="hose-library-card reference-card resource-summary-card">
      ${item.logoUrl ? `<div class="resource-card-image resource-logo"><img src="${escapeHtml(item.logoUrl)}" alt="${escapeHtml(`${item.title} logo`)}" loading="lazy" data-image-fallback></div>` : ""}
      <div class="resource-card-body"><div class="resource-badges">${badge(item.listingType === "instructor" ? "Instructor" : "Training Organization")}${badge(item.deliveryType)}</div><strong>${escapeHtml(item.title)}</strong>
      ${item.summary ? `<p class="helper">${escapeHtml(item.summary)}</p>` : ""}<p class="resource-card-meta">${escapeHtml([item.serviceArea, item.specialties.slice(0, 3).join(" · ")].filter(Boolean).join(" — "))}</p></div>
      <a class="reset-button reference-open-button" href="${escapeHtml(item.canonicalUrl)}" data-canonical-link>View listing</a></article>`;
  }
  function hoseCard(item) {
    const identity = [item.displaySize, item.identityQualifier].filter(Boolean).join(" · ");
    return `<article class="hose-library-card reference-card resource-summary-card"><div class="resource-card-body">
      <div class="resource-badges">${badge(item.verified ? "Reverse Flow Verified" : item.originLabel, item.verified ? "resource-badge-verified" : "")}${badge(item.statusLabel)}</div>
      <span class="resource-card-kicker">${escapeHtml(item.manufacturer)}</span><strong>${escapeHtml(item.name)}</strong>
      <p class="resource-card-meta">${escapeHtml(identity || item.diameterGroupLabel)}</p>${item.specificationSummary ? `<p class="helper">${escapeHtml(item.specificationSummary)}</p>` : ""}</div>
      <a class="reset-button reference-open-button" href="${escapeHtml(item.canonicalUrl)}" data-canonical-link>View product</a></article>`;
  }
  function articleCard(item) {
    const author = [item.authorName, item.supporterNumber ? `Supporter #${item.supporterNumber}` : ""].filter(Boolean).join(" · ");
    return `<article class="hose-library-card reference-card resource-summary-card resource-article-card${item.featured ? " resource-featured-card" : ""}">
      ${item.coverImageUrl ? `<div class="resource-card-image"><img src="${escapeHtml(item.coverImageUrl)}" alt="${escapeHtml(item.coverImageAlt)}" loading="lazy" data-image-fallback></div>` : ""}
      <div class="resource-card-body"><div class="resource-badges">${badge(item.contentType === "field_note" ? "Field Note" : "Article")}${badge(item.category)}${item.featured ? badge("Featured", "resource-badge-verified") : ""}</div>
      <strong>${escapeHtml(item.title)}</strong><p class="helper">${escapeHtml(item.summary)}</p><p class="resource-card-meta">${escapeHtml([author, formattedDate(item.publishedAt), item.readingMinutes ? `${item.readingMinutes} min read` : ""].filter(Boolean).join(" · "))}</p></div>
      <a class="reset-button reference-open-button" href="${escapeHtml(item.canonicalUrl)}" data-canonical-link>Read on Reverse Flow</a></article>`;
  }
  function stateCard(title, message, retry) {
    return `<article class="hose-library-card reference-card reference-empty-card resource-state-card"><div><strong>${escapeHtml(title)}</strong><p class="helper">${escapeHtml(message)}</p></div>${retry ? '<button class="reset-button reference-open-button" type="button" data-resource-retry>Retry</button>' : ""}</article>`;
  }

  function render() {
    renderFilters();
    refresh.disabled = resourceState.refreshing;
    refresh.textContent = resourceState.refreshing ? "Refreshing…" : "Refresh";
    if (resourceState.message) status.textContent = resourceState.message;
    else if (resourceState.refreshing && resourceState.items.length) status.textContent = "Updating saved results…";
    else if (resourceState.fetchedAt) status.textContent = `Updated ${formattedDate(resourceState.fetchedAt)}`;
    else status.textContent = "";
    if (resourceState.status === "loading" || resourceState.status === "idle") {
      list.innerHTML = stateCard(`Loading ${titles[type][0]}…`, "Fetching the latest published summaries.", false); return;
    }
    if ((resourceState.status === "offline" || resourceState.status === "error") && !resourceState.items.length) {
      list.innerHTML = stateCard(resourceState.status === "offline" ? "Internet connection required" : `${titles[type][0]} could not be loaded`, resourceState.message, true); return;
    }
    if (resourceState.status === "empty" && !resourceState.items.length) {
      list.innerHTML = stateCard(`No published ${titles[type][0].toLowerCase()} yet`, "This is a valid response. Published summaries will appear here when available.", false); return;
    }
    const items = visibleItems();
    status.textContent = `${items.length} of ${resourceState.items.length} ${resourceState.items.length === 1 ? "result" : "results"}${resourceState.message ? ` · ${resourceState.message}` : ""}`;
    list.innerHTML = items.length ? items.map(type === "training" ? trainingCard : type === "hose" ? hoseCard : articleCard).join("") : stateCard("No results match these filters", "Try a broader search or clear one of the filters.", false);
  }

  function openCanonical(url) {
    return R.openCanonicalResourceUrl(url, type, {
      open: window.open.bind(window),
      fallback: window.location.assign.bind(window.location),
      onError: () => window.alert("This Reverse Flow page could not be opened safely.")
    });
  }

  repository.subscribe(state => { resourceState = state; render(); });
  repository.refresh();
  refresh.addEventListener("click", () => repository.refresh({ force: true }));
  filtersRoot.addEventListener("input", event => {
    const control = event.target.closest("[data-filter]"); if (!control) return;
    filterState[control.dataset.filter] = control.type === "checkbox" ? control.checked : control.value;
    const selection = control.selectionStart;
    render();
    const next = filtersRoot.querySelector(`[data-filter="${control.dataset.filter}"]`);
    if (control.type === "search" && next) { next.focus(); if (typeof selection === "number") next.setSelectionRange(selection, selection); }
  });
  filtersRoot.addEventListener("change", event => {
    const control = event.target.closest("[data-filter]"); if (!control) return;
    filterState[control.dataset.filter] = control.type === "checkbox" ? control.checked : control.value; render();
  });
  list.addEventListener("click", event => {
    const retry = event.target.closest("[data-resource-retry]"); if (retry) { repository.refresh({ force: true }); return; }
    const link = event.target.closest("[data-canonical-link]"); if (link) { event.preventDefault(); openCanonical(link.href); }
  });
  list.addEventListener("error", event => { if (event.target.matches("[data-image-fallback]")) event.target.closest(".resource-card-image").remove(); }, true);

  let pullStart = null;
  window.addEventListener("touchstart", event => { if (window.scrollY <= 0 && event.touches.length === 1) pullStart = event.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", event => {
    if (pullStart === null || !event.changedTouches.length) return;
    const distance = event.changedTouches[0].clientY - pullStart; pullStart = null;
    if (distance >= 72 && !resourceState.refreshing) repository.refresh({ force: true });
  }, { passive: true });
})();
