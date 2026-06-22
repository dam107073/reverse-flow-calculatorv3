const hoseManufacturerReferences = [
  {
    id: "mercedes-textiles",
    name: "Mercedes Textiles",
    shortName: "Mercedes",
    websiteUrl: "https://www.mercedestextiles.com/",
    sourceUrl: "https://www.knowyourhose.com/hose-specs",
    about: "Mercedes Textiles manufactures fire hose and related hose products. This reference page organizes published hose data for quick field reference inside Reverse Flow.",
    notes: "Published hose data is provided for reference only. Departments should verify hose performance against their own equipment, testing, and SOPs. Friction loss coefficients and charged IDs may vary based on hose construction, age, condition, couplings, and test method.",
    sourceNote: "Hose data shown here is based on published manufacturer/reference data. Use the source link for the latest official information.",
    hoseData: [
      { model: "KrakenExo LPX", tradeSize: "1.5\"", chargedId50: "1.73", chargedId150: "1.75", coefficient: "13.8", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "ExoMetro LPX", tradeSize: "1.75\"", chargedId50: "1.79", chargedId150: "2.07", coefficient: "13.7", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo Super II 2\"x1.5\"", tradeSize: "2.25\"", chargedId50: "2.24", chargedId150: "2.26", coefficient: "4.3", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo Super II 2\"x2.5\"", tradeSize: "2.25\"", chargedId50: "2.24", chargedId150: "2.26", coefficient: "3.13", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 1.5x1.5", tradeSize: "1.5\"", chargedId50: "1.72", chargedId150: "1.75", coefficient: "13.8", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.91", chargedId150: "1.96", coefficient: "8.03", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 2x1.5", tradeSize: "2\"", chargedId50: "2.15", chargedId150: "2.17", coefficient: "6.2", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 2x2.5", tradeSize: "2\"", chargedId50: "2.15", chargedId150: "2.17", coefficient: "5.15", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 2.5x2.5", tradeSize: "2.5\"", chargedId50: "2.65", chargedId150: "2.67", coefficient: "1.65", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 3x2.5", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.69", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "KrakenExo 3x3", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.69", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Megaflo Breather 3.5x3.5", tradeSize: "3.5\"", chargedId50: "3.71", chargedId150: "3.74", coefficient: "0.27", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Megaflo Breather 4x4", tradeSize: "4\"", chargedId50: "4.22", chargedId150: "4.3", coefficient: "0.13", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Megaflo Breather 5x5", tradeSize: "5\"", chargedId50: "5.24", chargedId150: "5.34", coefficient: "0.04", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Megaflo Breather 6", tradeSize: "6\"", chargedId50: "6.17", chargedId150: "6.32", coefficient: "0.018", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "ExoMetro 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.78", chargedId150: "1.81", coefficient: "13.7", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "ExoMetro 2.5x2.5", tradeSize: "2.5\"", chargedId50: "2.65", chargedId150: "2.67", coefficient: "1.65", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 1x1", tradeSize: "1\"", chargedId50: "1.15", chargedId150: "1.17", coefficient: "145", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 1.5x1.5", tradeSize: "1.5\"", chargedId50: "1.73", chargedId150: "1.76", coefficient: "13.8", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.9", chargedId150: "1.95", coefficient: "8.1", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 2x1.5", tradeSize: "2\"", chargedId50: "2.14", chargedId150: "2.18", coefficient: "6.3", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 2x2.5", tradeSize: "2\"", chargedId50: "2.14", chargedId150: "2.18", coefficient: "5.2", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 2.5x2.5", tradeSize: "2.5\"", chargedId50: "2.78", chargedId150: "2.8", coefficient: "1.44", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 3x2.5", tradeSize: "3\"", chargedId50: "3.19", chargedId150: "3.22", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus 3x3", tradeSize: "3\"", chargedId50: "3.19", chargedId150: "3.22", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Carry-lite 1.5x1.5", tradeSize: "1.5\"", chargedId50: "1.74", chargedId150: "1.81", coefficient: "15.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Carry-lite 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.89", chargedId150: "1.95", coefficient: "8.9", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 1x1", tradeSize: "1\"", chargedId50: "1.15", chargedId150: "1.17", coefficient: "145", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 1.5x1.5", tradeSize: "1.5\"", chargedId50: "1.67", chargedId150: "1.68", coefficient: "16.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.83", chargedId150: "1.88", coefficient: "9.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 2x1.5", tradeSize: "2\"", chargedId50: "2.14", chargedId150: "2.18", coefficient: "6.8", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 2x2.5", tradeSize: "2\"", chargedId50: "2.14", chargedId150: "2.18", coefficient: "5.7", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 2.5x2.5", tradeSize: "2.5\"", chargedId50: "2.74", chargedId150: "2.78", coefficient: "1.43", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 3x2.5", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTFS-800-DP 3x3", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTSS-800 1.5x1.5", tradeSize: "1.5\"", chargedId50: "1.67", chargedId150: "1.68", coefficient: "16.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTSS-800 1.75x1.5", tradeSize: "1.75\"", chargedId50: "1.83", chargedId150: "1.88", coefficient: "9.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTSS-800 2.5x2.5", tradeSize: "2.5\"", chargedId50: "2.74", chargedId150: "2.78", coefficient: "1.43", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTSS-800 3x2.5", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "MTSS-800 3x3", tradeSize: "3\"", chargedId50: "3.18", chargedId150: "3.21", coefficient: "0.81", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus HP 1x1", tradeSize: "1\"", chargedId50: "1.15", chargedId150: "1.17", coefficient: "145", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus HP 3x2.5", tradeSize: "3\"", chargedId50: "3.09", chargedId150: "3.46", coefficient: "0.79", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Aquaflow-Plus HP 3x3", tradeSize: "3\"", chargedId50: "3.09", chargedId150: "3.12", coefficient: "0.79", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Firebreak II Forestry", tradeSize: "1\"", chargedId50: "", chargedId150: "", coefficient: "138", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Firebreak II Forestry", tradeSize: "1.5\"", chargedId50: "", chargedId150: "", coefficient: "26", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Firebreak II Forestry", tradeSize: "2.5\"", chargedId50: "", chargedId150: "", coefficient: "2.3", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Fireboss Forestry", tradeSize: "1\"", chargedId50: "", chargedId150: "", coefficient: "123", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Fireboss Forestry", tradeSize: "1.5\"", chargedId50: "", chargedId150: "", coefficient: "24", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Future-Line", tradeSize: "1.5\"", chargedId50: "1.76", chargedId150: "1.8", coefficient: "15.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Future-Line", tradeSize: "1.75\"", chargedId50: "1.89", chargedId150: "1.92", coefficient: "9.1", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Forest-Guard II Forestry", tradeSize: "1\"", chargedId50: "", chargedId150: "", coefficient: "137", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Forest-Guard II Forestry", tradeSize: "1.5\"", chargedId50: "", chargedId150: "", coefficient: "24", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Forest-Guard II Forestry", tradeSize: "1.75\"", chargedId50: "", chargedId150: "", coefficient: "9.1", referenceUrl: "https://www.knowyourhose.com/hose-specs" },
      { model: "Forest-Guard II Forestry", tradeSize: "2.5\"", chargedId50: "", chargedId150: "", coefficient: "2.5", referenceUrl: "https://www.knowyourhose.com/hose-specs" }
    ]
  }
];

const referencesData = {
  manufacturers: {
    hose: hoseManufacturerReferences,
    equipment: []
  },
  // Real training partners should only be added after review and approval by the Reverse Flow owner.
  // Do not invent partner listings.
  // Placeholder data should be replaced or supplemented only when real partner information has been submitted.
  trainingPartners: [
    {
      id: "training-partner-directory",
      name: "Training Partner Directory",
      subtitle: "Coming soon",
      description: "Reverse Flow is building a directory of fire service training organizations and instructors focused on pump operations, fire hydraulics, water supply, driver/operator training, and related disciplines.",
      websiteUrl: null,
      contactEmail: "reverse.flow.dev@gmail.com",
      serviceArea: "Local, regional, and nationwide training organizations",
      specialties: [
        "Pump Operations",
        "Driver/Operator",
        "Rural Water Supply",
        "Fire Hydraulics",
        "Water Supply",
        "Relay Pumping",
        "Engine Company Operations",
        "Officer Development",
        "Instructor Development"
      ],
      logo: null,
      status: "placeholder"
    }
  ],
  trainingResources: []
};
