(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowPumpOperatorPackage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SETUP_NAME_MAX_LENGTH = 28;
  const MAX_EXPORT_SETUPS = 6;
  const PAGE_WIDTH_PX = 816;
  const PAGE_HEIGHT_PX = 1056;
  const MAX_PAGE_ONE_REFERENCE_UNITS = 4.5;
  const PRINT_PALETTE = Object.freeze({
    bodyText: "#18202b",
    mutedText: "#525c6b",
    subtleText: "#657080",
    pageBackground: "#ffffff"
  });
  const EMPTY_VALUE = "—";
  const APPLIANCE_LABELS = Object.freeze({
    gatedWye: "Gated Wye",
    gateValve: "Gate Valve",
    reducer: "Reducer",
    siamese: "Siamese"
  });

  const SUPPORT_MODULES = [
    {
      id: "appliance-loss",
      title: "Appliance Loss Guide",
      type: "table",
      headers: ["Appliance", "Add"],
      rows: [
        ["Small Appliance (Wye, Reducer)", "10 psi"],
        ["Large Appliance (Portable Hydrant, Water Thief)", "25 psi"],
        ["Master Stream Device", "25 psi"],
        ["Standpipe System", "25 psi"],
        ["Residential Sprinkler System", "95 psi"],
        ["Commercial Sprinkler System", "150 psi"]
      ]
    },
    {
      id: "hydrant-water",
      title: "Additional Water Available",
      type: "table",
      headers: ["Intake Pressure Drop", "Additional Water Available"],
      rows: [
        ["0-10%", "≈ 3× Current Flow"],
        ["11-15%", "≈ 2× Current Flow"],
        ["16-25%", "≈ Current Flow"],
        [">25%", "Less than Current Flow"]
      ],
      footer: "Approximation only."
    }
  ];

  const FORMULA_MODULES = [
    {
      id: "common-formulas",
      title: "Common Formulas",
      type: "formulas",
      formulas: [
        ["Friction Loss", "FL = C × (Q ÷ 100)<sup>2</sup> × (L ÷ 100)"],
        ["Smoothbore Flow", "GPM = 29.7 × d<sup>2</sup> × √NP"],
        ["Smoothbore Nozzle Reaction", "NR = 1.57 × d<sup>2</sup> × NP"],
        ["Fog Nozzle Reaction", "NR = 0.0505 × GPM × √NP"]
      ]
    }
  ];

  const OPTIONAL_MODULES = [
    {
      id: "dry-standpipe",
      title: "Dry Standpipe Quick Reference",
      type: "bullet-groups",
      groups: [
        ["Riser supports <strong>500 GPM</strong>", "Outlet supports <strong>250 GPM</strong>", "PRVs may be present"],
        ["Add <strong>25 psi</strong> Standpipe Loss", "Add <strong>5 psi/floor</strong> Elevation Loss", "Include <strong>Attack Friction Loss</strong>", "Include <strong>Supply Friction Loss</strong>"]
      ]
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

  function classifySetupStructure(setup) {
    const structure = setup && setup.hydraulicStructure;
    const supplySections = Array.isArray(structure && structure.supplySections)
      ? structure.supplySections
      : null;
    const attackSections = Array.isArray(structure && structure.attackSections)
      ? structure.attackSections
      : null;
    const confident = structure && structure.confidence === "confident";

    if (!confident || !supplySections || !attackSections) {
      return {
        className: "complex",
        exportable: false,
        ambiguous: true,
        supplySectionCount: supplySections ? supplySections.length : null,
        attackSectionCount: attackSections ? attackSections.length : null
      };
    }

    const supplySectionCount = supplySections.length;
    const attackSectionCount = attackSections.length;
    const exportable = supplySectionCount <= 1 && attackSectionCount === 1;
    return {
      className: exportable ? "simple" : "complex",
      exportable,
      ambiguous: false,
      supplySectionCount,
      attackSectionCount
    };
  }

  function getExportSelectionState(setups, selectedIds) {
    const selected = new Set((selectedIds || []).map(String));
    const simpleSelectedCount = (setups || []).reduce((count, setup) => (
      count + (selected.has(String(setup.id)) && classifySetupStructure(setup).exportable ? 1 : 0)
    ), 0);
    const limitReached = simpleSelectedCount >= MAX_EXPORT_SETUPS;

    return (setups || []).map(setup => {
      const classification = classifySetupStructure(setup);
      const isSelected = classification.exportable && selected.has(String(setup.id));
      const disabledReason = !classification.exportable
        ? "complex"
        : limitReached && !isSelected
          ? "limit"
          : "";
      return { setup, classification, selected: isSelected, disabled: Boolean(disabledReason), disabledReason };
    });
  }

  function formatHosePath(structure, formatSize) {
    const formatter = typeof formatSize === "function" ? formatSize : value => cleanText(value);
    const sections = [
      ...(structure && Array.isArray(structure.supplySections) ? structure.supplySections : []),
      ...(structure && Array.isArray(structure.attackSections) ? structure.attackSections : [])
    ];
    return sections.map(section => {
      const size = formatter(section && section.hoseSize);
      const length = cleanText(section && section.hoseLength).match(/-?\d+(?:\.\d+)?/)?.[0] || "";
      return size && length ? `${size} × ${length}'` : "";
    }).filter(Boolean).join(" → ");
  }

  function formatSectionFrictionLoss(structure) {
    const supplySections = structure && Array.isArray(structure.supplySections) ? structure.supplySections : [];
    const attackSections = structure && Array.isArray(structure.attackSections) ? structure.attackSections : [];
    const attackLoss = cleanText(attackSections[0] && attackSections[0].frictionLoss);
    if (!supplySections.length) return attackLoss;
    const supplyLoss = cleanText(supplySections[0] && supplySections[0].frictionLoss);
    return `S ${supplyLoss || EMPTY_VALUE}\nA ${attackLoss || EMPTY_VALUE}`;
  }

  function formatSavedAppliance(setup) {
    const inputs = setup && setup.inputs && typeof setup.inputs === "object" ? setup.inputs : {};
    if (setup && setup.mode === "splitLay") {
      const splitLay = inputs.splitLay && typeof inputs.splitLay === "object"
        ? inputs.splitLay
        : setup.splitLay && typeof setup.splitLay === "object"
          ? setup.splitLay
          : null;
      if (!splitLay || !Object.prototype.hasOwnProperty.call(splitLay, "appliance1")) return "";
      return APPLIANCE_LABELS[cleanText(splitLay.appliance1)] || "";
    }
    if (inputs.reverseSupplyEnabled !== true || !Object.prototype.hasOwnProperty.call(inputs, "reverseSupplyAppliance")) {
      return "";
    }
    return APPLIANCE_LABELS[cleanText(inputs.reverseSupplyAppliance)] || "";
  }

  function formatSmoothboreNozzle(value) {
    const tip = cleanText(value)
      .replace(/^Smoothbore\b\s*(?:[•-]\s*)?/i, "")
      .replace(/^SB\s*/i, "")
      .replace(/(^|\s)1\/4(?=\")/g, "$1¼")
      .replace(/(^|\s)1\/2(?=\")/g, "$1½")
      .replace(/(^|\s)3\/4(?=\")/g, "$1¾")
      .replace(/\s+([¼½¾])(?=\")/g, "$1");
    return tip ? `SB ${tip}` : "SB";
  }

  function selectSetupsInChartOrder(setups, selectedIds) {
    const selected = new Set((selectedIds || []).map(String));
    return (setups || []).filter(setup => selected.has(String(setup.id)));
  }

  function validateExportSelection(setups, selectedIds) {
    const selected = selectSetupsInChartOrder(setups, selectedIds);
    const ineligible = selected.filter(setup => !classifySetupStructure(setup).exportable);
    if (ineligible.length) {
      return {
        ok: false,
        selected: selected.filter(setup => classifySetupStructure(setup).exportable),
        ineligible,
        overLimit: [],
        limitExceeded: false,
        message: "Complex setups are saved and reloadable, but are not supported in Pump Chart export."
      };
    }
    if (!selected.length) {
      return { ok: false, selected, ineligible: [], overLimit: [], limitExceeded: false, message: "Select at least one simple saved setup." };
    }
    if (selected.length > MAX_EXPORT_SETUPS) {
      return {
        ok: false,
        selected,
        ineligible: [],
        overLimit: [],
        limitExceeded: true,
        message: `Choose no more than ${MAX_EXPORT_SETUPS} simple setups.`
      };
    }
    const overLimit = selected.filter(setup => cleanText(setup.name).length > SETUP_NAME_MAX_LENGTH);
    if (overLimit.length) {
      return {
        ok: false,
        selected,
        ineligible: [],
        overLimit,
        limitExceeded: false,
        message: `Rename ${overLimit.map(setup => `\"${cleanText(setup.name)}\"`).join(", ")} to ${SETUP_NAME_MAX_LENGTH} characters or fewer before exporting.`
      };
    }
    return { ok: true, selected, ineligible: [], overLimit: [], limitExceeded: false, message: "" };
  }

  function getSetupRowUnits(setup) {
    return cleanText(setup && (setup.name || setup.id)).length > 20 ? 1.55 : 1;
  }

  function createLayoutModel(data) {
    if (!data || !cleanText(data.chartName)) throw new Error("Pump Chart name is required.");
    if (!(data.setups || []).length) throw new Error("At least one setup is required.");
    if (!(data.hoses || []).length) throw new Error("At least one enabled hose size is required.");

    const setupUnits = data.setups.reduce((sum, setup) => sum + getSetupRowUnits(setup), 0);
    const pageOneHasReferences = setupUnits <= MAX_PAGE_ONE_REFERENCE_UNITS;
    const referenceIsCompact = data.hoses.length <= 8 && (data.tips || []).length <= 10;
    const pageOneReferences = pageOneHasReferences ? SUPPORT_MODULES : [];
    const pageTwoReferences = referenceIsCompact ? [...FORMULA_MODULES, ...OPTIONAL_MODULES] : [];
    const includedReferenceIds = new Set([...pageOneReferences, ...pageTwoReferences].map(module => module.id));
    const allReferenceModules = [...SUPPORT_MODULES, ...FORMULA_MODULES, ...OPTIONAL_MODULES];
    const pages = [{
      kind: "operational",
      label: "PUMP CHART",
      chartName: cleanText(data.chartName),
      setupRows: data.setups.slice(),
      worksheet: true,
      referenceModules: pageOneReferences
    }, {
      kind: "hydraulic",
      label: "HYDRAULIC REFERENCE",
      chartName: cleanText(data.chartName),
      hoses: data.hoses.slice(),
      tips: (data.tips || []).slice(),
      referenceModules: pageTwoReferences
    }];

    return {
      chartName: cleanText(data.chartName),
      generatedAt: data.generatedAt || new Date().toISOString(),
      pages,
      pageCount: 2,
      firstHydraulicPageNumber: 2,
      frictionLossChartPageNumber: 2,
      frictionLossChartSplit: false,
      omittedReferenceModules: allReferenceModules
        .filter(module => !includedReferenceIds.has(module.id))
        .map(module => module.title)
    };
  }

  function estimateLayout(data) {
    const model = createLayoutModel(data);
    return {
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
      <div class="rf-pop-brand"><img src="icons/reverse-flow-logo.png" alt=""><div><strong>REVERSE FLOW</strong><span>PUMP OPERATOR PACKAGE</span></div></div>
    </header>`;
  }

  function renderFooter(model, pageNumber) {
    return `<footer class="rf-pop-footer"><span>Generated ${escapeHtml(formatGeneratedDate(model.generatedAt))} - Reverse Flow</span><span>${pageNumber}</span></footer>`;
  }

  function renderWorksheet() {
    const columns = [
      "GPM /<br>Tip Size", "Nozzle<br>Pressure", "Hose", "FL", "Appliance", "Elevation", "PDP"
    ];
    return `<section class="rf-pop-section rf-pop-worksheet"><h2>Operator Worksheet</h2>
      <table><thead><tr>${columns.map(column => `<th>${column}</th>`).join("")}</tr></thead>
      <tbody>${Array.from({ length: 4 }, () => `<tr>${columns.map(() => "<td></td>").join("")}</tr>`).join("")}</tbody></table>
    </section>`;
  }

  const SETUP_COLUMNS = [
    ["name", "Setup"], ["gpm", "GPM"], ["hose", "Hose"], ["frictionLoss", "FL"],
    ["nozzle", "Nozzle"], ["nozzlePressure", "NP"],
    ["appliance", "Appliance"], ["elevation", "Elevation"], ["pdp", "PDP"]
  ];

  function renderSetupCell(row, key) {
    if (key === "frictionLoss") {
      const parts = cleanText(row[key]).split(/\s*(?:·|\n)\s*/).filter(Boolean);
      const value = parts.length > 1
        ? `<span class="rf-pop-fl-stack">${parts.map(part => `<span>${escapeHtml(part)}</span>`).join("")}</span>`
        : escapeHtml(row[key] || EMPTY_VALUE);
      return `<td class="rf-pop-cell-frictionLoss">${value}</td>`;
    }
    if (key === "nozzle" || key === "appliance") {
      const rawLabel = cleanText(row[key]);
      const label = key === "nozzle" && /^(?:Smoothbore\b|SB\b)/i.test(rawLabel)
        ? formatSmoothboreNozzle(rawLabel)
        : rawLabel;
      return label
        ? `<td class="rf-pop-cell-${escapeHtml(key)}"><span class="rf-pop-nowrap-label">${escapeHtml(label)}</span></td>`
        : `<td class="rf-pop-cell-${escapeHtml(key)}">${EMPTY_VALUE}</td>`;
    }
    if (key !== "hose") return `<td class="rf-pop-cell-${escapeHtml(key)}">${escapeHtml(row[key] || EMPTY_VALUE)}</td>`;
    const sections = cleanText(row[key]).split(/\s+→\s+/).filter(Boolean);
    if (!sections.length) return `<td class="rf-pop-cell-hose">${EMPTY_VALUE}</td>`;
    return `<td class="rf-pop-cell-hose"><span class="rf-pop-hose-content">${sections.map(section => `<span class="rf-pop-hose-section">${escapeHtml(section)}</span>`).join(`<span class="rf-pop-hose-arrow"> → </span>`)}</span></td>`;
  }

  function renderSetupTable(rows) {
    return `<section class="rf-pop-section rf-pop-setups"><h2>Setups</h2>
      <table><thead><tr>${SETUP_COLUMNS.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${SETUP_COLUMNS.map(([key]) => renderSetupCell(row, key)).join("")}</tr>`).join("")}</tbody></table>
    </section>`;
  }

  function renderModuleBody(module) {
    if (module.type === "table") {
      return `<div class="rf-pop-module-body"><table class="rf-pop-reference-table"><thead><tr>${module.headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${module.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>${module.footer ? `<p class="rf-pop-module-footer">${escapeHtml(module.footer)}</p>` : ""}</div>`;
    }
    if (module.type === "formulas") {
      return `<div class="rf-pop-module-body rf-pop-formula-grid">${module.formulas.map(([label, equation]) => `<div><h4>${escapeHtml(label)}</h4><p>${equation}</p></div>`).join("")}</div>`;
    }
    if (module.type === "bullet-groups") {
      const groupLabels = ["Things to Remember", "Things to Add"];
      return `<div class="rf-pop-module-body rf-pop-bullet-groups">${module.groups.map((group, index) => `<div><h4>${groupLabels[index]}</h4><ul>${group.map(item => `<li>${item}</li>`).join("")}</ul></div>`).join("")}</div>`;
    }
    return "";
  }

  function renderModules(title, modules, className) {
    if (!modules || !modules.length) return "";
    return `<section class="rf-pop-section ${className || ""}"><h2>${escapeHtml(title)}</h2>
      <div class="rf-pop-module-grid">${modules.map(module => `<article class="rf-pop-module rf-pop-module-${escapeHtml(module.id)}"><h3>${escapeHtml(module.title)}</h3>${renderModuleBody(module)}</article>`).join("")}</div>
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
    const handlineTips = tips.filter(tip => Number(tip.diameter) >= 0.75 && Number(tip.diameter) <= 1.25);
    const masterStreamTips = tips.filter(tip => Number(tip.diameter) >= 1.25 && Number(tip.diameter) <= 3);
    const table = (title, pressure, pressureTips) => `<table><thead><tr><th colspan="2">${title}</th></tr><tr><th>Tip</th><th>GPM</th></tr></thead><tbody>${pressureTips.map(tip => {
      const gpm = 29.7 * Number(tip.diameter) * Number(tip.diameter) * Math.sqrt(pressure);
      return `<tr><td>${escapeHtml(tip.label)}</td><td>${Math.round(gpm)}</td></tr>`;
    }).join("")}</tbody></table>`;
    return `<section class="rf-pop-section rf-pop-smoothbore rf-pop-tip-count-${tips.length}"><h2>Smoothbore References</h2><div>${table("Handline Smoothbore (50 PSI)", 50, handlineTips)}${table("Masterstream Smoothbore (80 PSI)", 80, masterStreamTips)}</div></section>`;
  }

  function renderPageContent(model, page) {
    if (page.kind === "operational") {
      return `${renderWorksheet()}${renderSetupTable(page.setupRows)}${renderModules("Operational Reference", page.referenceModules, "rf-pop-support")}`;
    }
    if (page.kind === "hydraulic") {
      return `${renderFrictionLossChart(page.hoses)}${renderSmoothbore(page.tips)}${renderModules("Quick Reference", page.referenceModules, "rf-pop-page-two-reference")}`;
    }
    return "";
  }

  function renderPageHtml(model, page, pageNumber) {
    const pageClass = page.kind === "operational" && !page.referenceModules.length ? " rf-pop-page-operational-expanded" : "";
    return `<article class="rf-pop-page${pageClass}" data-package-page="${pageNumber}" data-page-kind="${escapeHtml(page.kind)}" aria-label="Pump Operator Package page ${pageNumber}">
      ${renderHeader(page)}<main>${renderPageContent(model, page)}</main>${renderFooter(model, pageNumber)}
    </article>`;
  }

  function renderPackageHtml(model) {
    return `<div class="rf-pop-render-root">${model.pages.map((page, index) => renderPageHtml(model, page, index + 1)).join("")}</div>`;
  }

  const PAGE_STYLES = `
    .rf-pop-render-root{font-family:Arial,Helvetica,sans-serif;color:${PRINT_PALETTE.bodyText};background:#d8dde4;padding:24px;display:grid;gap:24px}
    .rf-pop-page{box-sizing:border-box;width:${PAGE_WIDTH_PX}px;height:${PAGE_HEIGHT_PX}px;background:${PRINT_PALETTE.pageBackground};color:${PRINT_PALETTE.bodyText};color-scheme:light;opacity:1;filter:none;padding:34px 42px 30px;display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.18)}
    .rf-pop-page main,.rf-pop-page table,.rf-pop-page td,.rf-pop-page li,.rf-pop-page h1,.rf-pop-page .rf-pop-brand strong,.rf-pop-page .rf-pop-formula-grid p{color:${PRINT_PALETTE.bodyText}}
    .rf-pop-page *{box-sizing:border-box}.rf-pop-header{width:100%;border-top:8px solid #d71920;border-bottom:3px solid #313a47;padding:10px 0 10px;display:flex;justify-content:space-between;align-items:center;min-height:76px}.rf-pop-header>div:first-child{min-width:0;flex:1 1 auto}
    .rf-pop-header p{margin:0 0 4px;color:#a3141a;font-size:10px;font-weight:900;letter-spacing:.18em}.rf-pop-header h1{margin:0;padding-right:12px;font-size:25px;line-height:1.05;max-width:500px;white-space:nowrap;overflow:hidden}.rf-pop-brand{display:flex;flex:0 0 auto;align-items:center;gap:7px;text-align:left;padding:6px 9px 6px 8px;border-left:4px solid #d71920;border-radius:4px;background:#f8eeee}.rf-pop-brand img{width:37px;height:37px;object-fit:contain}.rf-pop-brand div{display:grid;gap:2px}.rf-pop-brand strong{font-size:12px;line-height:1;font-weight:900;letter-spacing:.055em}.rf-pop-brand span{font-size:7.5px;font-weight:700;color:#525c6b;letter-spacing:.1em}
    .rf-pop-page main{padding-top:12px;overflow:hidden}.rf-pop-section{margin:0 0 11px}.rf-pop-section h2{font-size:14px;line-height:1.1;margin:0 0 7px;padding:7px 10px;background:#d71920;color:#fff;border-left:7px solid #a3141a;border-bottom:2px solid #a3141a;border-radius:4px;letter-spacing:.025em}.rf-pop-section h2 span{font-size:9px;font-weight:700;color:#fff;margin-left:6px;opacity:.88;letter-spacing:.04em}
    table{width:100%;border-collapse:collapse;table-layout:fixed}.rf-pop-worksheet th{height:43px;background:#f4e2e3;color:#181f2a;font-size:10px;line-height:1.18;border:1px solid #aeb7c2;border-top:4px solid #d71920;padding:5px;font-weight:900}.rf-pop-worksheet th:first-child,.rf-pop-worksheet th:last-child{background:#ecd0d2;color:#7f1116}.rf-pop-worksheet td{height:67px;border:1px solid #aeb7c2}
    .rf-pop-worksheet th:nth-child(1){width:13%}.rf-pop-worksheet th:nth-child(2){width:14%}.rf-pop-worksheet th:nth-child(3){width:22%}.rf-pop-worksheet th:nth-child(4){width:12%}.rf-pop-worksheet th:nth-child(5){width:13%}.rf-pop-worksheet th:nth-child(6){width:12%}.rf-pop-worksheet th:nth-child(7){width:14%}
    .rf-pop-setups table{border-bottom:2px solid #313a47}.rf-pop-setups thead{background:#313a47;color:#fff}.rf-pop-setups th{height:35px;padding:6px 4px;font-size:8.5px;line-height:1.1;text-align:center;border-top:4px solid #d71920;border-bottom:0;font-weight:800;letter-spacing:.015em}.rf-pop-setups td{height:43px;padding:7px 5px;font-size:10px;line-height:1.14;border-bottom:1px solid #c7ced7;overflow-wrap:normal;word-break:normal;vertical-align:middle;text-align:center}.rf-pop-setups tbody tr:nth-child(even){background:#f3f5f7}.rf-pop-setups tbody tr:last-child td{border-bottom:0}.rf-pop-setups th:first-child,.rf-pop-setups td:first-child{width:20%;font-weight:900;text-align:left}.rf-pop-setups td:first-child{padding-left:9px;border-left:4px solid #d71920;font-size:10.5px}.rf-pop-setups th:nth-child(2),.rf-pop-setups th:last-child{font-weight:900;color:#fff;background:#a3141a}.rf-pop-setups td:nth-child(2),.rf-pop-setups td:last-child{font-weight:900;color:#a3141a;background:#fbefef;font-size:15px}
    .rf-pop-setups th:nth-child(2){width:8%}.rf-pop-setups th:nth-child(3){width:21%}.rf-pop-setups th:nth-child(4){width:10%}.rf-pop-setups th:nth-child(5){width:12%}.rf-pop-setups th:nth-child(6){width:6%}.rf-pop-setups th:nth-child(7){width:9%}.rf-pop-setups th:nth-child(8){width:7%}.rf-pop-setups th:nth-child(9){width:7%}.rf-pop-setups th:nth-child(3),.rf-pop-setups td:nth-child(3),.rf-pop-setups th:nth-child(5),.rf-pop-setups td:nth-child(5),.rf-pop-setups th:nth-child(8),.rf-pop-setups td:nth-child(8){border-left:2px solid #9fa9b5}
    .rf-pop-hose-content,.rf-pop-nowrap-label{display:inline-block;max-width:100%;white-space:nowrap}.rf-pop-hose-section,.rf-pop-hose-arrow{white-space:nowrap}.rf-pop-cell-hose.rf-pop-hose-tight,.rf-pop-cell-nozzle.rf-pop-label-tight,.rf-pop-cell-appliance.rf-pop-label-tight{font-size:9px}.rf-pop-fl-stack{display:grid;gap:2px;line-height:1.05}.rf-pop-setups th:nth-child(2),.rf-pop-setups td:nth-child(2),.rf-pop-setups th:nth-child(4),.rf-pop-setups td:nth-child(4),.rf-pop-setups th:nth-child(6),.rf-pop-setups td:nth-child(6),.rf-pop-setups th:nth-child(8),.rf-pop-setups td:nth-child(8),.rf-pop-setups th:nth-child(9),.rf-pop-setups td:nth-child(9){text-align:right}
    .rf-pop-page-operational-expanded .rf-pop-setups td{height:65px}
    .rf-pop-module-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.rf-pop-module{border:0;border-top:4px solid #d71920;border-bottom:1px solid #aeb7c2;border-radius:0;background:#fff}.rf-pop-module h3{font-size:10px;margin:0;padding:6px 8px;background:#f4e2e3;border:0;color:#7f1116;letter-spacing:.02em;font-weight:900}.rf-pop-module-body{padding:8px 8px 7px}.rf-pop-reference-table th,.rf-pop-reference-table td{font-size:8px;line-height:1.22;padding:3px 4px;border-bottom:1px solid #e1e5ea}.rf-pop-reference-table tbody tr:last-child td{border-bottom:0}.rf-pop-reference-table th{background:transparent;color:#525c6b;font-size:7.5px;font-weight:900;text-align:left;text-transform:uppercase;letter-spacing:.035em}.rf-pop-reference-table th:last-child,.rf-pop-reference-table td:last-child{text-align:right;font-weight:900}.rf-pop-module-footer{font-size:8px!important;font-weight:700;margin:5px 0 0!important;color:#414c5c}.rf-pop-formula-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}.rf-pop-formula-grid div{border-left:4px solid #d71920;padding-left:8px}.rf-pop-formula-grid h4{font-size:7px;margin:0 0 3px;color:#525c6b;text-transform:uppercase;letter-spacing:.04em}.rf-pop-formula-grid p{font-size:10px;line-height:1.08;margin:0;font-weight:900;white-space:nowrap}.rf-pop-bullet-groups{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rf-pop-bullet-groups>div+div{border-left:1px solid #c7ced7;padding-left:11px}.rf-pop-bullet-groups h4{font-size:7px;line-height:1;margin:0 0 6px;color:#a3141a;text-transform:uppercase;letter-spacing:.06em;font-weight:900}.rf-pop-bullet-groups ul{margin:0;padding-left:13px}.rf-pop-bullet-groups li{font-size:8.3px;line-height:1.25;margin:0 0 3px}
    .rf-pop-support .rf-pop-reference-table th,.rf-pop-support .rf-pop-reference-table td{padding-top:2px;padding-bottom:2px}
    .rf-pop-module-appliance-loss .rf-pop-reference-table th:first-child,.rf-pop-module-appliance-loss .rf-pop-reference-table td:first-child{width:82%;white-space:nowrap}.rf-pop-module-appliance-loss .rf-pop-reference-table th:last-child,.rf-pop-module-appliance-loss .rf-pop-reference-table td:last-child{width:18%}
    .rf-pop-friction table{font-variant-numeric:tabular-nums}.rf-pop-friction th,.rf-pop-friction td{height:18px;padding:2px 8px;border-bottom:1px solid #dfe3e8;font-size:8px;text-align:right}.rf-pop-friction thead th{height:29px;background:#313a47;color:#fff;border-top:4px solid #d71920;border-bottom:0;font-size:8.5px;text-align:right;font-weight:900}.rf-pop-friction tbody tr:nth-child(even){background:#f3f5f7}.rf-pop-friction tbody th{font-weight:900;width:48px;color:#a3141a}.rf-pop-friction table[class*="rf-pop-hose-count-9"] th,.rf-pop-friction table[class*="rf-pop-hose-count-9"] td,.rf-pop-friction .rf-pop-hose-count-10 th,.rf-pop-friction .rf-pop-hose-count-10 td,.rf-pop-friction .rf-pop-hose-count-11 th,.rf-pop-friction .rf-pop-hose-count-11 td{font-size:7px;padding:2px 3px}.rf-pop-coefficients{margin:6px 0 0;padding-left:6px;border-left:3px solid #d71920;font-size:8px;line-height:1.35;color:#303a48;font-weight:700}
    .rf-pop-smoothbore>div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rf-pop-smoothbore th,.rf-pop-smoothbore td{height:18px;padding:2px 7px;border-bottom:1px solid #dfe3e8;font-size:8.5px}.rf-pop-smoothbore thead tr:first-child th{height:26px;background:#313a47;color:#fff;border-top:4px solid #d71920;font-size:9.5px;font-weight:900}.rf-pop-smoothbore thead tr:nth-child(2) th{color:#525c6b;font-size:7.5px;text-transform:uppercase;letter-spacing:.04em}.rf-pop-smoothbore th:first-child,.rf-pop-smoothbore td:first-child{text-align:left}.rf-pop-smoothbore th:last-child,.rf-pop-smoothbore td:last-child{text-align:right}.rf-pop-smoothbore tbody tr:nth-child(even){background:#f3f5f7}
    .rf-pop-tip-count-11 th,.rf-pop-tip-count-11 td,.rf-pop-tip-count-12 th,.rf-pop-tip-count-12 td,.rf-pop-tip-count-13 th,.rf-pop-tip-count-13 td,.rf-pop-tip-count-14 th,.rf-pop-tip-count-14 td,.rf-pop-tip-count-15 th,.rf-pop-tip-count-15 td,.rf-pop-tip-count-16 th,.rf-pop-tip-count-16 td,.rf-pop-tip-count-17 th,.rf-pop-tip-count-17 td,.rf-pop-tip-count-18 th,.rf-pop-tip-count-18 td,.rf-pop-tip-count-19 th,.rf-pop-tip-count-19 td{height:17px;font-size:8px}
    .rf-pop-footer{border-top:1px solid #aeb7c2;padding-top:7px;display:flex;justify-content:space-between;color:${PRINT_PALETTE.subtleText};font-size:7.5px}.rf-pop-footer span:last-child{color:#a3141a;font-weight:800}
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
    const pages = Array.from(wrapper.querySelectorAll(".rf-pop-page"));
    pages.forEach(page => page.querySelectorAll(".rf-pop-cell-hose, .rf-pop-cell-nozzle, .rf-pop-cell-appliance").forEach(cell => {
      const content = cell.querySelector(".rf-pop-hose-content, .rf-pop-nowrap-label");
      if (!content) return;
      const cellStyle = documentObject.defaultView && documentObject.defaultView.getComputedStyle(cell);
      const availableWidth = cell.clientWidth -
        (Number.parseFloat(cellStyle && cellStyle.paddingLeft) || 0) -
        (Number.parseFloat(cellStyle && cellStyle.paddingRight) || 0);
      content.style.maxWidth = "none";
      const measuredWidth = content.getBoundingClientRect().width;
      content.style.maxWidth = "";
      if (measuredWidth > availableWidth + 0.5) {
        cell.classList.add(cell.classList.contains("rf-pop-cell-hose") ? "rf-pop-hose-tight" : "rf-pop-label-tight");
      }
    }));
    return { wrapper, pages };
  }

  return {
    SETUP_NAME_MAX_LENGTH,
    MAX_EXPORT_SETUPS,
    PAGE_WIDTH_PX,
    PAGE_HEIGHT_PX,
    PRINT_PALETTE,
    PAGE_STYLES,
    SUPPORT_MODULES,
    FORMULA_MODULES,
    OPTIONAL_MODULES,
    validateSetupName,
    classifySetupStructure,
    getExportSelectionState,
    formatHosePath,
    formatSectionFrictionLoss,
    formatSavedAppliance,
    formatSmoothboreNozzle,
    selectSetupsInChartOrder,
    validateExportSelection,
    createLayoutModel,
    estimateLayout,
    renderPackageHtml,
    mountPackagePages
  };
});
