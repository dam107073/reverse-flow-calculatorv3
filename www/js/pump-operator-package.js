(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowPumpOperatorPackage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SETUP_NAME_MAX_LENGTH = 28;
  const PAGE_WIDTH_PX = 816;
  const PAGE_HEIGHT_PX = 1056;
  const MAX_PAGE_ONE_ROW_UNITS = 7.5;
  const MAX_CONTINUATION_ROW_UNITS = 34;

  const SUPPORT_MODULES = [
    {
      id: "appliance-loss",
      title: "Appliance Loss Guide",
      lines: [
        "Use the calculated/current Reverse Flow appliance loss.",
        "Confirm unusual appliances with department or manufacturer data."
      ]
    },
    {
      id: "hydrant-water",
      title: "Additional Water Available at a Hydrant",
      lines: [
        "Q available = Q test x ((S - target R) / (S - R))^0.54",
        "Use verified static, residual, and flow readings."
      ]
    },
    {
      id: "foam-eductor",
      title: "Inline Foam Eductor",
      lines: [
        "Match rated flow and inlet pressure.",
        "Follow eductor, hose, nozzle, and concentrate guidance."
      ]
    }
  ];

  const FORMULA_MODULES = [
    {
      id: "friction-formula",
      title: "Friction Loss Formula",
      lines: ["FL = C x (Q / 100)^2 x (L / 100)", "C = coefficient; Q = GPM; L = feet"]
    },
    {
      id: "smoothbore-formula",
      title: "Smoothbore Flow Formula",
      lines: ["GPM = 29.7 x d^2 x square root of NP", "d = tip diameter (in); NP = PSI"]
    }
  ];

  const OPTIONAL_MODULES = [
    {
      id: "standpipe-quick-info",
      title: "Standpipe Quick Info",
      lines: ["Include attack line, standpipe, supply, and elevation losses."]
    },
    {
      id: "relay-pumping",
      title: "Relay Pumping",
      lines: ["Add calculated friction loss for the desired flow plus the required residual pressure."]
    }
  ];

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return cleanText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validateSetupName(value) {
    const name = cleanText(value);
    if (!name) return { ok: false, name, message: "Setup Name is required." };
    if (name.length > SETUP_NAME_MAX_LENGTH) {
      return {
        ok: false,
        name,
        message: `Setup names are limited to ${SETUP_NAME_MAX_LENGTH} characters.`
      };
    }
    return { ok: true, name, message: "" };
  }

  function selectSetupsInChartOrder(setups, selectedIds) {
    const selected = new Set((selectedIds || []).map(String));
    return (setups || []).filter(setup => selected.has(String(setup.id)));
  }

  function validateExportSelection(setups, selectedIds) {
    const selected = selectSetupsInChartOrder(setups, selectedIds);
    if (!selected.length) {
      return { ok: false, selected, overLimit: [], message: "Select at least one saved setup." };
    }
    const overLimit = selected.filter(setup => cleanText(setup.name).length > SETUP_NAME_MAX_LENGTH);
    if (overLimit.length) {
      return {
        ok: false,
        selected,
        overLimit,
        message: `Rename ${overLimit.map(setup => `\"${cleanText(setup.name)}\"`).join(", ")} to ${SETUP_NAME_MAX_LENGTH} characters or fewer before exporting.`
      };
    }
    return { ok: true, selected, overLimit: [], message: "" };
  }

  function getSetupRowUnits(setup) {
    return cleanText(setup && (setup.name || setup.id)).length > 20 ? 1.55 : 1;
  }

  function takeRowsByUnits(rows, maxUnits) {
    let units = 0;
    let count = 0;
    while (count < rows.length) {
      const next = getSetupRowUnits(rows[count]);
      if (count && units + next > maxUnits) break;
      units += next;
      count += 1;
    }
    return { rows: rows.slice(0, count), remaining: rows.slice(count), units };
  }

  function createLayoutModel(data) {
    if (!data || !cleanText(data.chartName)) throw new Error("Pump Chart name is required.");
    if (!(data.setups || []).length) throw new Error("At least one setup is required.");
    if (!(data.hoses || []).length) throw new Error("At least one enabled hose size is required.");

    const pages = [];
    let remainingSetups = data.setups.slice();
    const firstSetupPage = takeRowsByUnits(remainingSetups, MAX_PAGE_ONE_ROW_UNITS);
    remainingSetups = firstSetupPage.remaining;
    const pageOneHasSupport = !remainingSetups.length && firstSetupPage.units <= 4.5;

    pages.push({
      kind: "operational",
      label: "PUMP CHART",
      chartName: cleanText(data.chartName),
      setupRows: firstSetupPage.rows,
      worksheet: true,
      supportModules: pageOneHasSupport ? SUPPORT_MODULES : []
    });

    while (remainingSetups.length) {
      const continuation = takeRowsByUnits(remainingSetups, MAX_CONTINUATION_ROW_UNITS);
      remainingSetups = continuation.remaining;
      pages.push({
        kind: "operational-continuation",
        label: "PUMP CHART - SETUPS CONTINUED",
        chartName: cleanText(data.chartName),
        setupRows: continuation.rows,
        worksheet: false,
        supportModules: []
      });
    }

    const hydraulicPage = {
      kind: "hydraulic",
      label: "HYDRAULIC REFERENCE",
      chartName: cleanText(data.chartName),
      hoses: data.hoses.slice(),
      tips: (data.tips || []).slice(),
      formulaModules: FORMULA_MODULES,
      supportModules: [],
      optionalModules: []
    };

    const referenceIsCompact = hydraulicPage.hoses.length <= 8 && hydraulicPage.tips.length <= 10;
    if (!pageOneHasSupport && referenceIsCompact) hydraulicPage.supportModules = SUPPORT_MODULES;
    if (pageOneHasSupport && referenceIsCompact) hydraulicPage.optionalModules = OPTIONAL_MODULES;
    pages.push(hydraulicPage);

    const deferredSupport = !pageOneHasSupport && !hydraulicPage.supportModules.length;
    if (deferredSupport) {
      pages.push({
        kind: "supplemental",
        label: "OPERATIONAL REFERENCE",
        chartName: cleanText(data.chartName),
        supportModules: deferredSupport ? SUPPORT_MODULES : [],
        optionalModules: OPTIONAL_MODULES
      });
    }

    const firstHydraulicPageIndex = pages.findIndex(page => page.kind === "hydraulic");
    const likelyExceedsTwoPages = pages.length > 2;
    return {
      chartName: cleanText(data.chartName),
      generatedAt: data.generatedAt || new Date().toISOString(),
      pages,
      likelyExceedsTwoPages,
      pageCount: pages.length,
      firstHydraulicPageNumber: firstHydraulicPageIndex + 1,
      frictionLossChartPageNumber: firstHydraulicPageIndex + 1,
      frictionLossChartSplit: false
    };
  }

  function estimateLayout(data) {
    const model = createLayoutModel(data);
    return {
      likelyExceedsTwoPages: model.likelyExceedsTwoPages,
      pageCount: model.pageCount,
      firstHydraulicPageNumber: model.firstHydraulicPageNumber,
      frictionLossChartSplit: false
    };
  }

  function formatGeneratedDate(value) {
    const date = new Date(value || Date.now());
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  function renderHeader(page) {
    const chartName = cleanText(page.chartName);
    return `<header class="rf-pop-header">
      <div>
        <p>${escapeHtml(page.label)}</p>
        <h1>${escapeHtml(chartName)}</h1>
      </div>
      <div class="rf-pop-brand"><strong>REVERSE FLOW</strong><span>FIRE HYDRAULICS</span></div>
    </header>`;
  }

  function renderFooter(model, pageNumber) {
    return `<footer class="rf-pop-footer"><span>Generated ${escapeHtml(formatGeneratedDate(model.generatedAt))} - Reverse Flow</span><span>${pageNumber}</span></footer>`;
  }

  function renderWorksheet() {
    const columns = [
      "GPM /<br>Tip Size", "Nozzle<br>Pressure", "Hose<br>Size", "Hose<br>Length", "Appliance",
      "Elevation", "Attack Line<br>Friction Loss", "Supply Line<br>Friction Loss", "PDP"
    ];
    return `<section class="rf-pop-section rf-pop-worksheet"><h2>Operator Worksheet</h2>
      <table><thead><tr>${columns.map(column => `<th>${column}</th>`).join("")}</tr></thead>
      <tbody>${Array.from({ length: 6 }, () => `<tr>${columns.map(() => "<td></td>").join("")}</tr>`).join("")}</tbody></table>
    </section>`;
  }

  const SETUP_COLUMNS = [
    ["name", "Setup"], ["gpm", "GPM"], ["hoseSize", "Hose Size"], ["hoseLength", "Hose Length"],
    ["frictionLoss", "FL"], ["nozzle", "Nozzle"], ["nozzlePressure", "NP"],
    ["appliance", "Appliance"], ["elevation", "Elevation"], ["pdp", "PDP"]
  ];

  function renderSetupTable(rows, continued) {
    return `<section class="rf-pop-section rf-pop-setups"><h2>Setups${continued ? " (continued)" : ""}</h2>
      <table><thead><tr>${SETUP_COLUMNS.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${SETUP_COLUMNS.map(([key]) => `<td>${escapeHtml(row[key] || "-")}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </section>`;
  }

  function renderModules(title, modules, className) {
    if (!modules || !modules.length) return "";
    return `<section class="rf-pop-section ${className || ""}"><h2>${escapeHtml(title)}</h2>
      <div class="rf-pop-module-grid">${modules.map(module => `<article class="rf-pop-module"><h3>${escapeHtml(module.title)}</h3>${module.lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}</article>`).join("")}</div>
    </section>`;
  }

  function renderFrictionLossChart(hoses) {
    const flows = Array.from({ length: 21 }, (_, index) => index * 50);
    return `<section class="rf-pop-section rf-pop-friction"><h2>Friction Loss Chart <span>PSI per 100 ft</span></h2>
      <table class="rf-pop-hose-count-${hoses.length}"><thead><tr><th>GPM</th>${hoses.map(hose => `<th>${escapeHtml(hose.label)}</th>`).join("")}</tr></thead>
      <tbody>${flows.map(flow => `<tr><th>${flow}</th>${hoses.map(hose => {
        const loss = Number(hose.coefficient) * Math.pow(flow / 100, 2);
        return `<td>${Number.isFinite(loss) ? loss.toFixed(1) : "-"}</td>`;
      }).join("")}</tr>`).join("")}</tbody></table>
      <p class="rf-pop-coefficients">${hoses.map(hose => `${escapeHtml(hose.label)}: C ${Number(hose.coefficient) < 1 ? Number(hose.coefficient).toFixed(2) : Number(hose.coefficient).toFixed(1)}`).join(" &nbsp; ")}</p>
    </section>`;
  }

  function renderSmoothbore(tips) {
    if (!tips.length) return "";
    const table = pressure => `<table><thead><tr><th colspan="2">Smoothbore ${pressure} PSI</th></tr><tr><th>Tip</th><th>GPM</th></tr></thead><tbody>${tips.map(tip => {
      const gpm = 29.7 * Number(tip.diameter) * Number(tip.diameter) * Math.sqrt(pressure);
      return `<tr><td>${escapeHtml(tip.label)}</td><td>${Math.round(gpm)}</td></tr>`;
    }).join("")}</tbody></table>`;
    return `<section class="rf-pop-section rf-pop-smoothbore"><h2>Smoothbore References</h2><div>${table(50)}${table(80)}</div></section>`;
  }

  function renderPageContent(model, page) {
    if (page.kind === "operational") {
      return `${renderWorksheet()}${renderSetupTable(page.setupRows, false)}${renderModules("Operational Reference", page.supportModules, "rf-pop-support")}`;
    }
    if (page.kind === "operational-continuation") return renderSetupTable(page.setupRows, true);
    if (page.kind === "hydraulic") {
      return `${renderFrictionLossChart(page.hoses)}${renderSmoothbore(page.tips)}${renderModules("Formulas", page.formulaModules, "rf-pop-formulas")}${renderModules("Operational Reference", page.supportModules, "rf-pop-support")}${renderModules("Supplemental Quick Info", page.optionalModules, "rf-pop-optional")}`;
    }
    return `${renderModules("Operational Reference", page.supportModules, "rf-pop-support")}${renderModules("Supplemental Quick Info", page.optionalModules, "rf-pop-optional")}`;
  }

  function renderPageHtml(model, page, pageNumber) {
    return `<article class="rf-pop-page" data-package-page="${pageNumber}" data-page-kind="${escapeHtml(page.kind)}" aria-label="Pump Operator Package page ${pageNumber}">
      ${renderHeader(page)}<main>${renderPageContent(model, page)}</main>${renderFooter(model, pageNumber)}
    </article>`;
  }

  function renderPackageHtml(model) {
    return `<div class="rf-pop-render-root">${model.pages.map((page, index) => renderPageHtml(model, page, index + 1)).join("")}</div>`;
  }

  const PAGE_STYLES = `
    .rf-pop-render-root{font-family:Arial,Helvetica,sans-serif;color:#181f2a;background:#d8dde4;padding:24px;display:grid;gap:24px}
    .rf-pop-page{box-sizing:border-box;width:${PAGE_WIDTH_PX}px;height:${PAGE_HEIGHT_PX}px;background:#fff;padding:40px 48px 34px;display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.18)}
    .rf-pop-page *{box-sizing:border-box}.rf-pop-header{border-top:4px solid #d71920;border-bottom:1px solid #bfc6d0;padding:14px 0 13px;display:flex;justify-content:space-between;align-items:center;min-height:74px}
    .rf-pop-header p{margin:0 0 4px;color:#525c6b;font-size:10px;font-weight:800;letter-spacing:.14em}.rf-pop-header h1{margin:0;font-size:24px;line-height:1.05;max-width:510px}.rf-pop-brand{text-align:right;display:grid;gap:2px}.rf-pop-brand strong{font-size:11px}.rf-pop-brand span{font-size:8px;color:#525c6b;letter-spacing:.08em}
    .rf-pop-page main{padding-top:12px;overflow:hidden}.rf-pop-section{margin:0 0 12px}.rf-pop-section h2{font-size:14px;line-height:1.1;margin:0 0 7px;padding:5px 0 6px 9px;border-left:4px solid #d71920;border-bottom:1px solid #bfc6d0;letter-spacing:.01em}.rf-pop-section h2 span{font-size:9px;font-weight:400;color:#525c6b;margin-left:5px}
    table{width:100%;border-collapse:collapse;table-layout:fixed}.rf-pop-worksheet th{height:44px;background:#f8eeee;color:#181f2a;font-size:10px;line-height:1.18;border:1px solid #bfc6d0;border-top:3px solid #d71920;padding:5px}.rf-pop-worksheet td{height:64px;border:1px solid #bfc6d0}
    .rf-pop-worksheet th:nth-child(1){width:10%}.rf-pop-worksheet th:nth-child(2){width:10%}.rf-pop-worksheet th:nth-child(3){width:9%}.rf-pop-worksheet th:nth-child(4){width:10%}.rf-pop-worksheet th:nth-child(5){width:12%}.rf-pop-worksheet th:nth-child(6){width:10%}.rf-pop-worksheet th:nth-child(7),.rf-pop-worksheet th:nth-child(8){width:13%}.rf-pop-worksheet th:nth-child(9){width:13%}
    .rf-pop-setups thead{background:#f8eeee;color:#181f2a}.rf-pop-setups th{height:34px;padding:5px 4px;font-size:8.5px;line-height:1.1;text-align:left;border-top:3px solid #d71920;border-bottom:1px solid #aeb7c2}.rf-pop-setups td{height:42px;padding:6px 4px;font-size:10.5px;line-height:1.15;border-bottom:1px solid #d5dbe3;overflow-wrap:anywhere;vertical-align:middle}.rf-pop-setups tbody tr:nth-child(even){background:#f6f8fa}.rf-pop-setups th:first-child,.rf-pop-setups td:first-child{width:21%;font-weight:700}.rf-pop-setups th:nth-child(2),.rf-pop-setups td:nth-child(2),.rf-pop-setups th:last-child,.rf-pop-setups td:last-child{font-weight:900;text-align:right;color:#b4151b}.rf-pop-setups td:nth-child(2),.rf-pop-setups td:last-child{font-size:13px}.rf-pop-setups th:nth-child(2){width:8%}.rf-pop-setups th:nth-child(3){width:9%}.rf-pop-setups th:nth-child(4){width:9%}.rf-pop-setups th:nth-child(5){width:7%}.rf-pop-setups th:nth-child(6){width:11%}.rf-pop-setups th:nth-child(7){width:7%}.rf-pop-setups th:nth-child(8){width:11%}.rf-pop-setups th:nth-child(9){width:8%}.rf-pop-setups th:nth-child(10){width:9%}.rf-pop-setups td:nth-child(2),.rf-pop-setups td:nth-child(4),.rf-pop-setups td:nth-child(5),.rf-pop-setups td:nth-child(7),.rf-pop-setups td:nth-child(9),.rf-pop-setups td:nth-child(10){text-align:right}
    .rf-pop-module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rf-pop-module{border:1px solid #c7ced7;border-top:2px solid #d71920;border-radius:7px;padding:8px;min-height:58px}.rf-pop-module h3{font-size:9px;margin:0 0 5px;color:#a6151a}.rf-pop-module p{font-size:8px;line-height:1.25;margin:2px 0}.rf-pop-formulas .rf-pop-module-grid,.rf-pop-optional .rf-pop-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .rf-pop-friction table{font-variant-numeric:tabular-nums}.rf-pop-friction th,.rf-pop-friction td{height:18px;padding:2px 3px;border-bottom:1px solid #e0e5ea;font-size:8px;text-align:right}.rf-pop-friction thead th{height:28px;background:#f8eeee;color:#181f2a;border-top:3px solid #d71920;border-bottom:1px solid #aeb7c2;font-size:8.5px;text-align:center}.rf-pop-friction tbody tr:nth-child(even){background:#f6f8fa}.rf-pop-friction tbody th{font-weight:800;width:48px;color:#a6151a}.rf-pop-friction table[class*="rf-pop-hose-count-9"] th,.rf-pop-friction table[class*="rf-pop-hose-count-9"] td,.rf-pop-friction .rf-pop-hose-count-10 th,.rf-pop-friction .rf-pop-hose-count-10 td,.rf-pop-friction .rf-pop-hose-count-11 th,.rf-pop-friction .rf-pop-hose-count-11 td{font-size:7px;padding:2px 1px}.rf-pop-coefficients{margin:6px 0 0;font-size:8px;line-height:1.3;color:#414c5c}
    .rf-pop-smoothbore>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rf-pop-smoothbore th,.rf-pop-smoothbore td{height:17px;padding:2px 7px;border-bottom:1px solid #e0e5ea;font-size:8px}.rf-pop-smoothbore thead tr:first-child th{height:25px;background:#f8eeee;color:#181f2a;border-top:3px solid #d71920;font-size:9.5px}.rf-pop-smoothbore th:first-child,.rf-pop-smoothbore td:first-child{text-align:left}.rf-pop-smoothbore th:last-child,.rf-pop-smoothbore td:last-child{text-align:right}.rf-pop-smoothbore tbody tr:nth-child(even){background:#f6f8fa}
    .rf-pop-footer{border-top:1px solid #d5dae1;padding-top:8px;display:flex;justify-content:space-between;color:#525c6b;font-size:8px}
  `;

  function mountPackagePages(model, documentObject) {
    if (!documentObject || !documentObject.createElement) throw new Error("Document renderer is unavailable.");
    const wrapper = documentObject.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.zIndex = "-1";
    wrapper.style.pointerEvents = "none";
    wrapper.innerHTML = `<style>${PAGE_STYLES}</style>${renderPackageHtml(model)}`;
    documentObject.body.appendChild(wrapper);
    return { wrapper, pages: Array.from(wrapper.querySelectorAll(".rf-pop-page")) };
  }

  return {
    SETUP_NAME_MAX_LENGTH,
    PAGE_WIDTH_PX,
    PAGE_HEIGHT_PX,
    PAGE_STYLES,
    SUPPORT_MODULES,
    FORMULA_MODULES,
    OPTIONAL_MODULES,
    validateSetupName,
    selectSetupsInChartOrder,
    validateExportSelection,
    createLayoutModel,
    estimateLayout,
    renderPackageHtml,
    mountPackagePages
  };
});
