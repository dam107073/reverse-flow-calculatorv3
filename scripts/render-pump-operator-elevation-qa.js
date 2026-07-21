const fs = require("node:fs");
const path = require("node:path");
const packageApi = require("../www/js/pump-operator-package.js");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs/pump-operator-package-standpipe-elevation");
const logoUrl = `file://${path.join(root, "www/icons/reverse-flow-logo.png")}`;

const data = {
  chartName: "Engine 1 QA",
  generatedAt: "2026-07-21T12:00:00.000Z",
  setups: [
    {
      id: "normal",
      name: "First Floor Attack",
      gpm: "185",
      hose: `1.75\" × 200'`,
      frictionLoss: "32",
      nozzle: `SB 15/16\"`,
      nozzlePressure: "50",
      appliance: "—",
      elevation: "",
      pdp: "82"
    },
    {
      id: "standpipe-third-floor",
      name: "Third Floor Standpipe",
      gpm: "185",
      hose: `3\" × 50' → 2.5\" × 100'`,
      frictionLoss: "S 0.4\nA 8.0",
      nozzle: "Fixed Fog",
      nozzlePressure: "100",
      appliance: "—",
      elevation: "10",
      pdp: "143"
    }
  ],
  hoses: [
    { id: "1.75", label: `1.75\"`, coefficient: 15.5 },
    { id: "2.5", label: `2.5\"`, coefficient: 2 },
    { id: "3", label: `3\"`, coefficient: 0.8 },
    { id: "5", label: `5\"`, coefficient: 0.08 }
  ],
  tips: [
    { id: "7/8", label: `7/8\"`, diameter: 0.875 },
    { id: "15/16", label: `15/16\"`, diameter: 0.9375 },
    { id: "1-1/8", label: `1 1/8\"`, diameter: 1.125 },
    { id: "1-1/4", label: `1 1/4\"`, diameter: 1.25 },
    { id: "1-1/2", label: `1 1/2\"`, diameter: 1.5 },
    { id: "2", label: `2\"`, diameter: 2 }
  ]
};

const model = packageApi.createLayoutModel(data);
const rendered = packageApi.renderPackageHtml(model)
  .replaceAll('src="icons/reverse-flow-logo.png"', `src="${logoUrl}"`);
const baseStyles = `
  html,body{margin:0;padding:0;background:#fff}
  ${packageApi.PAGE_STYLES}
  .rf-pop-render-root{padding:0;gap:0;background:#fff}
  .rf-pop-page{box-shadow:none;break-after:page;page-break-after:always}
  .rf-pop-page:last-child{break-after:auto;page-break-after:auto}
  @page{size:8.5in 11in;margin:0}
`;
const documentHtml = (body, extraStyles = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}${extraStyles}</style></head><body>${body}</body></html>`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "pump-operator-package.html"), documentHtml(rendered));

model.pages.forEach((page, index) => {
  fs.writeFileSync(
    path.join(outputDir, `page-${index + 1}.html`),
    documentHtml(rendered, `.rf-pop-page:not(:nth-child(${index + 1})){display:none}`)
  );
});

console.log(JSON.stringify({ outputDir, pageCount: model.pageCount, setups: data.setups }, null, 2));
