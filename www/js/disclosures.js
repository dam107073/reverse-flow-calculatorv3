(function () {
  let disclosureId = 0;

  function ensureUniqueId(element, prefix) {
    if (element.id) return element.id;

    let candidate = "";
    do {
      disclosureId += 1;
      candidate = `${prefix}-${disclosureId}`;
    } while (document.getElementById(candidate));

    element.id = candidate;
    return candidate;
  }

  function syncDisclosure(details) {
    const summary = details.querySelector(":scope > summary");
    if (!summary) return;

    summary.setAttribute("aria-expanded", details.open ? "true" : "false");

    const controlledIds = Array.from(details.children)
      .filter(element => element !== summary)
      .map(element => ensureUniqueId(element, "disclosure-panel"));

    if (controlledIds.length) {
      summary.setAttribute("aria-controls", controlledIds.join(" "));
    }

    const collapsedLabel = summary.dataset.collapsedLabel;
    const expandedLabel = summary.dataset.expandedLabel;
    if (collapsedLabel && expandedLabel) {
      summary.textContent = details.open ? expandedLabel : collapsedLabel;
    }
  }

  function initializeDisclosure(details) {
    if (!(details instanceof HTMLDetailsElement)) return;

    if (details.dataset.disclosureReady !== "true") {
      const summary = details.querySelector(":scope > summary");
      details.dataset.disclosureReady = "true";
      details.addEventListener("toggle", () => syncDisclosure(details));
      summary?.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        summary.click();
      });
    }

    syncDisclosure(details);
  }

  function initializeDisclosures(root = document) {
    if (root instanceof HTMLDetailsElement) {
      initializeDisclosure(root);
    }

    root.querySelectorAll?.("details").forEach(initializeDisclosure);
  }

  function startDisclosureObserver() {
    initializeDisclosures(document);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) initializeDisclosures(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.ReverseFlowDisclosures = {
    initialize: initializeDisclosures,
    sync: syncDisclosure
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDisclosureObserver, { once: true });
  } else {
    startDisclosureObserver();
  }
})();
