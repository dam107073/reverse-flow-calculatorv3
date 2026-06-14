
    // ========================================
    // APPLICATION STATE
    // ========================================
    const DEFAULT_STATE = {
      mode: "reverse",
      pdp: "",
      targetGpm: "",
      hoseLength: "",
      hoseSize: "1.88",
      nozzleType: "fog",
      nozzleType: "fog",

      masterStreamType: "fog",
      masterStreamLoss: "25",
      dualLineSupply: false,
      apparatusFogFlow: "1000",
      apparatusCustomFogFlow: "",
      apparatusElevation: "",

      nozzlePressure: "55",
      customNozzlePressure: "",

      smoothboreTip: "",
      bladeModel: "blade160",
      applianceLoss: "0",
      henTurboEnabled: false,
      reverseSupplyEnabled: false,
      reverseSupplyLength: "",
      reverseSupplyHoseSize: "3",
      reverseSupplyAppliance: "gateValve",
      splitLay: {
        dualSupply: false,
  sectionCount: "2",
  supplyLength: "",
  supplyHoseSize: "3",

  appliance1: "gatedWye",

  supply2Length: "",
  supply2HoseSize: "1.88",

  appliance2: "gateValve",

  attackLines: "1",

  attack1Length: "",
  attack1HoseSize: "1.75",
  attack1NozzleType: "fog",
  attack1NozzlePressure: "50",
  attack1Flow: "",
  attack1SmoothboreTip: "",
  attack1BladeModel: "blade160",

  attack2Length: "",
  attack2HoseSize: "1.75",
  attack2NozzleType: "fog",
  attack2NozzlePressure: "50",
  attack2Flow: "",
  attack2SmoothboreTip: "",
  attack2BladeModel: "blade160"
},
      useCustomCoefficient: false,
      customCoefficient: "",
    };

    let state = getFreshLaunchState();
    let hoseLibraryRows = [];

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const els = {
      presetSelect: document.getElementById("presetSelect"),
      savePresetButton: document.getElementById("savePresetButton"),
      savePresetButtonSplit: document.getElementById("savePresetButtonSplit"),
      calculatorView: document.getElementById("calculatorView"),
      toolsPage: document.getElementById("toolsPage"),
      settingsPage: document.getElementById("settingsPage"),
      toolsProContent: document.getElementById("toolsProContent"),
      toolsProLockedMessage: document.getElementById("toolsProLockedMessage"),
      toolsProUpgradeButton: document.getElementById("toolsProUpgradeButton"),
      settingsView: document.getElementById("settingsView"),
      toolsView: document.getElementById("toolsView"),
      settingsViewButton: document.getElementById("settingsViewButton"),
      toolsViewButton: document.getElementById("toolsViewButton"),
      settingsBackButton: document.getElementById("settingsBackButton"),
      toolsBackButton: document.getElementById("toolsBackButton"),
      hoseLibraryManufacturerFilter: document.getElementById("hoseLibraryManufacturerFilter"),
      hoseLibrarySizeFilter: document.getElementById("hoseLibrarySizeFilter"),
      hoseLibraryUseFilter: document.getElementById("hoseLibraryUseFilter"),
      hoseLibrarySummary: document.getElementById("hoseLibrarySummary"),
      hoseLibraryList: document.getElementById("hoseLibraryList"),
      defaultHoseSelectionsList: document.getElementById("defaultHoseSelectionsList"),
      defaultHoseCoefficientsList: document.getElementById("defaultHoseCoefficientsList"),
      customHoseManufacturer: document.getElementById("customHoseManufacturer"),
      customHoseModel: document.getElementById("customHoseModel"),
      customHoseSize: document.getElementById("customHoseSize"),
      customHoseUse: document.getElementById("customHoseUse"),
      customHoseCoefficient: document.getElementById("customHoseCoefficient"),
      createCustomHoseButton: document.getElementById("createCustomHoseButton"),
      resetHoseCoefficientsButton: document.getElementById("resetHoseCoefficientsButton"),
      resetButton: document.getElementById("resetButton"),

      viewPumpChartButton:
        document.getElementById("viewPumpChartButton"),

      pumpChartModal:
        document.getElementById("pumpChartModal"),

      closePumpChartModal:
        document.getElementById("closePumpChartModal"),

      pumpChartList:
        document.getElementById("pumpChartList"),

      reverseModeButton: document.getElementById("reverseModeButton"),
      pdpModeButton: document.getElementById("pdpModeButton"),
      relayModeButton: document.getElementById("relayModeButton"),
      apparatusMountedModeButton: document.getElementById("apparatusMountedModeButton"),
      modeHelper: document.getElementById("modeHelper"),

      pdpLabel: document.getElementById("pdpLabel"),
      pdp: document.getElementById("pdp"),
      hoseLength: document.getElementById("hoseLength"),
      hoseSize: document.getElementById("hoseSize"),
      relayResidualField: document.getElementById("relayResidualField"),
relayResidualPressure: document.getElementById("relayResidualPressure"),
      nozzleTypeLabel: document.getElementById("nozzleTypeLabel"),
      nozzleType: document.getElementById("nozzleType"),
      nozzleTypeHelper: document.getElementById("nozzleTypeHelper"),
      masterStreamTypeField:
      document.getElementById("masterStreamTypeField"),

      masterStreamType:
      document.getElementById("masterStreamType"),
      apparatusFogFlowField: document.getElementById("apparatusFogFlowField"),
      apparatusFogFlow: document.getElementById("apparatusFogFlow"),
      apparatusCustomFogFlowField: document.getElementById("apparatusCustomFogFlowField"),
      apparatusCustomFogFlow: document.getElementById("apparatusCustomFogFlow"),

      dualLineSupplyField:
      document.getElementById("dualLineSupplyField"),

      dualLineSupplyToggle:
      document.getElementById("dualLineSupplyToggle"),
      masterStreamLossField:
      document.getElementById("masterStreamLossField"),

      masterStreamLoss:
      document.getElementById("masterStreamLoss"),
      apparatusElevationField: document.getElementById("apparatusElevationField"),
      apparatusElevation: document.getElementById("apparatusElevation"),
      smoothboreTipField: document.getElementById("smoothboreTipField"),
      smoothboreTip: document.getElementById("smoothboreTip"),
      bladeModelField: document.getElementById("bladeModelField"),
      bladeModel: document.getElementById("bladeModel"),

      nozzlePressureLabel: document.getElementById("nozzlePressureLabel"),
      pressureButtons: document.getElementById("pressureButtons"),
      calculatedNozzlePressure: document.getElementById("calculatedNozzlePressure"),
      calculatedNozzlePressureValue: document.getElementById("calculatedNozzlePressureValue"),
      disabledPressureExplanations: document.getElementById("disabledPressureExplanations"),

      
      customNozzlePressureField:
        document.getElementById("customNozzlePressureField"),

      customNozzlePressure:
        document.getElementById("customNozzlePressure"),

      applianceLoss: document.getElementById("applianceLoss"),
      henTurboField: document.getElementById("henTurboField"),
      henTurboToggle: document.getElementById("henTurboToggle"),
      invertApplianceLossButton:
        document.getElementById("invertApplianceLossButton"),
      coefficientToggle: document.getElementById("coefficientToggle"),
      customCoefficient: document.getElementById("customCoefficient"),
      coefficientHelper: document.getElementById("coefficientHelper"),

      standardResultsCard: document.getElementById("standardResultsCard"),
      primaryResultLabel: document.getElementById("primaryResultLabel"),
      primaryResultUnit: document.getElementById("primaryResultUnit"),
      calculatedLabel: document.getElementById("calculatedLabel"),
      totalFlLabel: document.getElementById("totalFlLabel"),
      flPer100Label: document.getElementById("flPer100Label"),
      nozzleDisplayLabel: document.getElementById("nozzleDisplayLabel"),
      reactionLabel: document.getElementById("reactionLabel"),
      setupLabel: document.getElementById("setupLabel"),
      roundedGpm: document.getElementById("roundedGpm"),
      calculatedGpm: document.getElementById("calculatedGpm"),
      totalFl: document.getElementById("totalFl"),
      flPer100: document.getElementById("flPer100"),
      nozzleDisplay: document.getElementById("nozzleDisplay"),
      nozzleReaction: document.getElementById("nozzleReaction"),
      setupDisplay: document.getElementById("setupDisplay"),
      turboLossDetail: document.getElementById("turboLossDetail"),
      turboLossDisplay: document.getElementById("turboLossDisplay"),
      bladeResultNote: document.getElementById("bladeResultNote"),
      warningsCard: document.getElementById("warningsCard"),
      splitDualSupplyToggle: document.getElementById("splitDualSupplyToggle"),

      reverseSupplyToggleField:
        document.getElementById("reverseSupplyToggleField"),

      reverseSupplyToggle:
        document.getElementById("reverseSupplyToggle"),

      reverseSupplySection:
        document.getElementById("reverseSupplySection"),

      reverseSupplyLength:
        document.getElementById("reverseSupplyLength"),

      reverseSupplyHose:
        document.getElementById("reverseSupplyHose"),

      reverseSupplyAppliance:
        document.getElementById("reverseSupplyAppliance"),
            splitResultsCard: document.getElementById("splitResultsCard"),
            splitAttack1PressureTag:
              document.getElementById("splitAttack1PressureTag"),

      splitAttack2PressureTag:
        document.getElementById("splitAttack2PressureTag"),
      splitPrimaryPdp: document.getElementById("splitPrimaryPdp"),
      splitSupplyLayoutResult:
        document.getElementById("splitSupplyLayoutResult"),
      splitSupplyFlow: document.getElementById("splitSupplyFlow"),
      splitSupplyLoss: document.getElementById("splitSupplyLoss"),
      splitApplianceLoss: document.getElementById("splitApplianceLoss"),
      splitSupply2ResultSection: document.getElementById("splitSupply2ResultSection"),
      splitSupply2Flow: document.getElementById("splitSupply2Flow"),
      splitSupply2Loss: document.getElementById("splitSupply2Loss"),
      splitAppliance2Loss: document.getElementById("splitAppliance2Loss"),
      splitAttack1FlowResult: document.getElementById("splitAttack1FlowResult"),
      splitAttack1NpResult: document.getElementById("splitAttack1NpResult"),
      splitAttack1FlResult: document.getElementById("splitAttack1FlResult"),
      splitAttack1ReactionResult:
        document.getElementById("splitAttack1ReactionResult"),
      splitAttack2ResultSection: document.getElementById("splitAttack2ResultSection"),
      splitAttack2FlowResult: document.getElementById("splitAttack2FlowResult"),
      splitAttack2NpResult: document.getElementById("splitAttack2NpResult"),
      splitAttack2FlResult: document.getElementById("splitAttack2FlResult"),
      splitAttack2ReactionResult:
        document.getElementById("splitAttack2ReactionResult"),

      splitLayButton: document.getElementById("splitLayButton"),
      proModal: document.getElementById("proModal"),
      closeProModal: document.getElementById("closeProModal"),
      buyProButton: document.getElementById("buyProButton"),
      restorePurchaseButton: document.getElementById("restorePurchaseButton"),
      webProBanner: document.getElementById("webProBanner"),
      settingsVersionInfo: document.getElementById("settingsVersionInfo"),
      reverseFormula: document.getElementById("reverseFormula"),
      requiredPdpFormula: document.getElementById("requiredPdpFormula"),
      relayFormula: document.getElementById("relayFormula"),
      splitLayFormula: document.getElementById("splitLayFormula"),
      
      versionFooter: document.getElementById("versionFooter"),
    };

    // ========================================
    // INITIALIZATION
    // ========================================

	   document.addEventListener("deviceready", () => {
	  console.log("Device ready fired.");
	
	  if (!window.CdvPurchase) {
	    console.warn("CdvPurchase is NOT available.");
	    updateBuyProButtonState("unavailable", {
	      reason: "CdvPurchase unavailable on deviceready"
	    });
	    return;
	  }

  console.log("CdvPurchase is available.");

	  initializeReverseFlowStore();
	});
	
	function updateBuyProButtonState(state, details = {}) {
	  if (!els.buyProButton) return;
	
	  if (state === "ready") {
	    els.buyProButton.disabled = false;
	    els.buyProButton.textContent = "Unlock Pro";
	  } else if (state === "loading") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Loading purchase...";
	  } else if (state === "processing") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Processing purchase...";
	  } else if (state === "web") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Purchase in Mobile App";
	  } else if (state === "unavailable") {
	    els.buyProButton.disabled = false;
	    els.buyProButton.textContent = "Purchase Unavailable";
	  }
	
	  console.info("[Reverse Flow IAP]", {
	    event: "buy-button-state",
	    state,
	    disabled: els.buyProButton.disabled,
	    text: els.buyProButton.textContent,
	    ready: reverseFlowProProductReady,
	    initialized: reverseFlowProStoreInitialized,
	    ...details
	  });
	}
	
	function initializeReverseFlowStore() {
	  const store = window.CdvPurchase.store;
	  const ProductType = window.CdvPurchase.ProductType;
	  const Platform = window.CdvPurchase.Platform;
	
	  const trustedProductIdFields = new Set([
	    "id",
	    "productId",
	    "product_id",
	    "productIdentifier",
	    "identifier"
	  ]);
	  const trustedProductContainers = new Set([
	    "collection",
	    "products",
	    "purchase",
	    "purchases"
	  ]);
	
	  function logStoreEvent(event, details = {}) {
	    console.info("[Reverse Flow IAP]", {
	      event,
	      productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	      ...details
	    });
	  }
	
	  function setBuyProButtonState(state, details = {}) {
	    updateBuyProButtonState(state, details);
	  }
	
	  function isTrustedProductIdLocation(path) {
	    const lastSegment = path[path.length - 1];
	    if (trustedProductIdFields.has(lastSegment)) return true;
	
	    const previousSegment = path[path.length - 2];
	    return (
	      trustedProductContainers.has(previousSegment) &&
	      /^\d+$/.test(lastSegment)
	    );
	  }
	
	  function isExpiredPurchaseObject(value) {
	    if (!value || typeof value !== "object") return false;
	    if (value.isExpired) return true;
	
	    const expiry = value.expiryDate || value.expirationDate || value.expiresDate;
	    if (!expiry) return false;
	
	    const expiryTime = typeof expiry === "number"
	      ? expiry
	      : Date.parse(expiry);
	
	    return Number.isFinite(expiryTime) && expiryTime <= Date.now();
	  }
	
	  function inspectVerifiedEntitlement(sourceObject) {
	    const candidates = [];
	    const seen = new WeakSet();
	
	    function visit(value, path = [], parent = null) {
	      if (typeof value === "string") {
	        const trustedLocation = isTrustedProductIdLocation(path);
	        candidates.push({
	          path: path.join("."),
	          value,
	          trustedLocation,
	          exactMatch: value === REVERSE_FLOW_PRO_PRODUCT_ID,
	          expired: isExpiredPurchaseObject(parent)
	        });
	        return;
	      }
	
	      if (!value || typeof value !== "object") return;
	      if (seen.has(value)) return;
	      seen.add(value);
	
	      if (Array.isArray(value)) {
	        value.forEach((item, index) => {
	          visit(item, path.concat(String(index)), parent);
	        });
	        return;
	      }
	
	      Object.keys(value).forEach(key => {
	        visit(value[key], path.concat(key), value);
	      });
	    }
	
	    visit(sourceObject);
	
	    const matchingCandidate = candidates.find(candidate =>
	      candidate.value === REVERSE_FLOW_PRO_PRODUCT_ID &&
	      candidate.trustedLocation &&
	      !candidate.expired
	    );
	
	    return {
	      grantsPro: Boolean(matchingCandidate),
	      productId: matchingCandidate?.value || null,
	      matchingCandidate,
	      candidates
	    };
	  }
	
	  const purchasePlatform = getReverseFlowPurchasePlatform();

if (!purchasePlatform) {
  logStoreEvent("initialize-aborted", {
    reason: "unsupported or non-native platform"
  });

  setBuyProButtonState("web", {
    reason: "unsupported or non-native platform"
  });

  return;
}

logStoreEvent("initialize-start", {
  hasStore: Boolean(store),
  productType: ProductType.NON_CONSUMABLE,
  platform: purchasePlatform
});
	
	  setBuyProButtonState("loading", {
	    reason: "store initialization started"
	  });
	
	  if (reverseFlowProLoadTimeout) {
	    clearTimeout(reverseFlowProLoadTimeout);
	  }
	
	  reverseFlowProLoadTimeout = setTimeout(() => {
	    if (reverseFlowProProductReady) return;
	    setBuyProButtonState("unavailable", {
	      reason: "product did not become purchasable before timeout"
	    });
	  }, 15000);
	
	  logStoreEvent("product-registering", {
	    registration: {
	      id: REVERSE_FLOW_PRO_PRODUCT_ID,
	      type: ProductType.NON_CONSUMABLE,
	      platform: purchasePlatform
	    }
	  });
	
	  store.register([
	    {
	      id: REVERSE_FLOW_PRO_PRODUCT_ID,
	      type: ProductType.NON_CONSUMABLE,
      platform: purchasePlatform
    }
  ]);

	  store.when()
	  .productUpdated(product => {
	    logStoreEvent("product-updated", {
	      rawProduct: product,
	      id: product?.id,
	      productId: product?.productId,
	      canPurchase: product?.canPurchase,
	      owned: product?.owned,
	      state: product?.state
	    });
	
	    if (product.id === REVERSE_FLOW_PRO_PRODUCT_ID) {
	      if (product.canPurchase) {
	  reverseFlowProProductReady = true;
	  if (reverseFlowProLoadTimeout) {
	    clearTimeout(reverseFlowProLoadTimeout);
	    reverseFlowProLoadTimeout = null;
	  }
	
	  setBuyProButtonState("ready", {
	    reason: "product canPurchase is true",
	    productCanPurchase: product.canPurchase
	  });
	
	  logStoreEvent("product-ready", {
	    rawProduct: product,
	    canPurchase: product.canPurchase
	  });
	} else {
	  reverseFlowProProductReady = false;
	  setBuyProButtonState("unavailable", {
	    reason: "product updated but cannot be purchased",
	    productCanPurchase: product.canPurchase
	  });
	}
	    }
	  });

	  store.when()
	    .approved(transaction => {
	      logStoreEvent("transaction-approved", {
	        rawTransaction: transaction,
	        entitlementInspection: inspectVerifiedEntitlement(transaction)
	      });
	
	      transaction.verify();
	    })
	    .verified(receipt => {
	      const receiptInspection = inspectVerifiedEntitlement(receipt);
	      const transactionInspection = inspectVerifiedEntitlement(receipt?.transaction);
	      const receiptCollection = Array.isArray(receipt?.collection)
	        ? receipt.collection
	        : null;
	
	      logStoreEvent("receipt-verified", {
	        rawReceipt: receipt,
	        rawTransaction: receipt?.transaction || null,
	        receiptCollection,
	        receiptInspection,
	        transactionInspection
	      });
	
	      const storeOwnsPro =
	        typeof store.owned === "function" &&
	        store.owned(REVERSE_FLOW_PRO_PRODUCT_ID);
	
	      if (!receiptInspection.grantsPro && !transactionInspection.grantsPro) {
	        logProAccessEvent("verified-receipt-did-not-grant-pro", {
	          trigger: "store.when().verified",
	          source: "purchase",
	          productId: null,
	          receiptProductCandidates: receiptInspection.candidates,
	          transactionProductCandidates: transactionInspection.candidates,
	          storeOwnsPro,
	          reason: "verified receipt did not contain the exact lifetime product in a trusted product or transaction field"
	        });
	        return;
	      }
	
	      const wasAlreadyPro = isProUser();
	      const grantSource = receiptInspection.grantsPro
	        ? receiptInspection
	        : transactionInspection;
	
	      const proWasGranted = setAccessLevel(ACCESS_LEVELS.PRO, {
	        trigger: "store.when().verified",
	        source: "purchase",
	        productId: grantSource.productId
	      });
	
	      if (!proWasGranted) return;
	
	      reverseFlowRestoreInProgress = false;
	      if (els.restorePurchaseButton) {
	        els.restorePurchaseButton.disabled = false;
	        els.restorePurchaseButton.textContent = "Restore Purchase";
	      }
	
	      logProAccessEvent("pro-grant-succeeded", {
	        trigger: "store.when().verified",
	        source: "purchase",
	        productId: grantSource.productId,
	        reason: "verified receipt contained the exact lifetime product in a trusted field",
	        matchingCandidate: grantSource.matchingCandidate
	      });
	
	      if (!wasAlreadyPro) {
	        alert("Reverse Flow Pro Unlocked");
      }

      if (els.proModal) {
        els.proModal.hidden = true;
      }

	      if (typeof receipt.finish === "function") {
	        receipt.finish();
	      }
	    })
	    .unverified(unverifiedReceipt => {
	      console.warn("[Reverse Flow IAP]", {
	        event: "receipt-unverified",
	        rawReceipt: unverifiedReceipt,
	        entitlementInspection: inspectVerifiedEntitlement(unverifiedReceipt)
	      });
	    });
	
	  store.error(error => {
	    console.warn("[Reverse Flow IAP]", {
	      event: "store-error",
	      error
	    });
	    if (!reverseFlowProProductReady) {
	      setBuyProButtonState("unavailable", {
	        reason: "store error before product became ready",
	        error
	      });
	    }
	  });
	
	  const initializeResult = store.initialize([
      purchasePlatform
    ]);
	
	  if (initializeResult && typeof initializeResult.then === "function") {
	    initializeResult
	      .then(() => {
	        reverseFlowProStoreInitialized = true;
	        logStoreEvent("initialize-complete", {
	          returnedPromise: true
	        });
	      })
	      .catch(error => {
	        console.warn("[Reverse Flow IAP]", {
	          event: "initialize-failed",
	          error
	        });
	        setBuyProButtonState("unavailable", {
	          reason: "store initialization failed",
	          error
	        });
	      });
	  } else {
	    reverseFlowProStoreInitialized = true;
	    logStoreEvent("initialize-complete", {
	      returnedPromise: false
	    });
	  }
	}

    init();

    function isNativeCapacitorApp() {
      try {
        return Boolean(
          window.Capacitor &&
          typeof window.Capacitor.isNativePlatform === "function" &&
          window.Capacitor.isNativePlatform()
        );
      } catch (error) {
        console.warn("Unable to determine Capacitor platform:", error);
        return false;
      }
    }

    function updateWebProBannerVisibility() {
      if (!els.webProBanner) return;

      els.webProBanner.hidden = isNativeCapacitorApp();
    }

    async function init() {

  if (els.versionFooter) {
    els.versionFooter.textContent =
      `Reverse Flow v${APP_VERSION}`;
  }

  if (els.settingsVersionInfo) {
    els.settingsVersionInfo.textContent =
      `Reverse Flow v${APP_VERSION}`;
  }

	  if (els.buyProButton) {
	  updateBuyProButtonState(
	    isNativeCapacitorApp() ? "loading" : "web",
	    {
	      reason: isNativeCapacitorApp()
	        ? "native app init"
	        : "web preview without native purchase store"
	    }
	  );
	}
  
  updateWebProBannerVisibility();
  updateAccessBadge();
  await loadHoseLibraryData();

  if (!els.calculatorView) {
    updateToolsGate();
    bindSupportPageEvents();

    if (els.toolsPage && !isProUser()) {
      openProModal();
      return;
    }

      renderSupportPageToolsContent();
      return;
    }

  populateHoseOptions();
  populateHoseLibraryFilter();
  applyHoseLibraryQueryFilters();
  populateCustomHoseSizeOptions();
  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderDefaultHoseCoefficients();
  populateSmoothboreTips();
  renderPresetOptions();
  syncInputsFromState();

  syncReverseSupplyUi();

  renderPressureButtons();
  calculateAndRender();
  bindEvents();
}

function updateAccessBadge() {

  document.body.classList.toggle(
    "pro-user",
    isProUser()
  );

  document.body.classList.add("access-ready");

  if (els.toolsPage) {
    const wasToolsContentHidden = Boolean(els.toolsProContent?.hidden);

    updateToolsGate();

    if (isProUser() && wasToolsContentHidden) {
      renderSupportPageToolsContent();
    }
  }

  const badge = document.getElementById("accessBadge");

  if (!badge) return;

  if (userAccessLevel === ACCESS_LEVELS.PRO) {
    badge.textContent = "PRO";
    return;
  }

  badge.textContent = "BASIC";
}

function updateToolsGate() {
  if (!els.toolsPage) return;

  const hasProAccess =
    isProUser() ||
    document.body.classList.contains("pro-user");

  if (els.toolsProContent) {
    els.toolsProContent.hidden = !hasProAccess;
  }

  if (els.toolsProLockedMessage) {
    els.toolsProLockedMessage.hidden = hasProAccess;
  }

  if (hasProAccess && els.proModal) {
    els.proModal.hidden = true;
  }
}

function renderSupportPageToolsContent() {
  populateHoseLibraryFilter();
  applyHoseLibraryQueryFilters();
  populateCustomHoseSizeOptions();
  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderDefaultHoseCoefficients();
}
    // ========================================
    // STORAGE
    // ========================================
    function getFreshLaunchState() {
  const freshState = {
    ...DEFAULT_STATE,
    splitLay: {
      ...DEFAULT_STATE.splitLay
    }
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(freshState)
  );

  return freshState;
}
    function loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      } catch {}
      return { ...DEFAULT_STATE };
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadPresets() {
      try {
        const saved = localStorage.getItem(PRESETS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }

    function savePresets(presets) {
  if (!isProUser()) {
    openProModal();
    return false;
  }

  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return true;
}

    // ========================================
    // UI POPULATION
    // ========================================
function loadSavedHoseLibrarySelections() {
  try {
    const saved = localStorage.getItem(HOSE_LIBRARY_SELECTIONS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getSavedHoseLibrarySelection(hoseId) {
  const savedSelections = loadSavedHoseLibrarySelections();

  return savedSelections[hoseId] || null;
}

function saveHoseLibrarySelection(hoseId, libraryHose) {
  const savedSelections = loadSavedHoseLibrarySelections();

  savedSelections[hoseId] = {
    id: libraryHose.id,
    manufacturer: libraryHose.manufacturer,
    model: libraryHose.model,
    coefficient: libraryHose.coefficient
  };

  localStorage.setItem(
    HOSE_LIBRARY_SELECTIONS_KEY,
    JSON.stringify(savedSelections)
  );
}

function clearHoseLibrarySelection(hoseId) {
  const savedSelections = loadSavedHoseLibrarySelections();

  delete savedSelections[hoseId];

  localStorage.setItem(
    HOSE_LIBRARY_SELECTIONS_KEY,
    JSON.stringify(savedSelections)
  );
}

async function loadHoseLibraryData() {
  if (hoseLibraryRows.length) return;

  try {
    const response = await fetch("js/data/hose-library.js?v=3");

    if (!response.ok) {
      throw new Error(`Hose library request failed: ${response.status}`);
    }

    const rows = await response.json();

    hoseLibraryRows = Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn("[Reverse Flow] Hose library failed to load.", error);
    hoseLibraryRows = [];
  }
}

function getHoseLibraryRows() {
  return [
    ...hoseLibraryRows,
    ...loadCustomHoseProfiles()
  ];
}

function loadCustomHoseProfiles() {
  try {
    const saved = localStorage.getItem(CUSTOM_HOSE_PROFILES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomHoseProfiles(customHoses) {
  localStorage.setItem(
    CUSTOM_HOSE_PROFILES_KEY,
    JSON.stringify(customHoses)
  );
}

function getCustomHoseUseLabel(useValue) {
  if (useValue === "attack") return "Attack";
  if (useValue === "supply") return "Supply";

  return "Supply / Attack";
}

function populateCustomHoseSizeOptions() {
  if (!els.customHoseSize) return;

  const hoseOptions = HOSE_OPTIONS.filter(hose =>
    ATTACK_HOSE_IDS.includes(hose.id) ||
    SUPPLY_HOSE_IDS.includes(hose.id)
  );

  els.customHoseSize.innerHTML = hoseOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hose.label)}</option>`
  )).join("");
}

function clearCustomHoseForm() {
  if (els.customHoseManufacturer) els.customHoseManufacturer.value = "";
  if (els.customHoseModel) els.customHoseModel.value = "";
  if (els.customHoseCoefficient) els.customHoseCoefficient.value = "";
  if (els.customHoseUse) els.customHoseUse.value = "both";
}

function createCustomHoseProfile() {
  const selectedHose = getHoseOptionById(els.customHoseSize?.value);
  const manufacturer =
    els.customHoseManufacturer?.value.trim() || "Custom";
  const model = els.customHoseModel?.value.trim();
  const coefficient = numberOrNull(els.customHoseCoefficient?.value);
  const useValue = els.customHoseUse?.value || "both";

  if (!selectedHose || !model) {
    alert("Enter a custom hose name and size.");
    return;
  }

  if (coefficient === null || coefficient <= 0) {
    alert("Enter a valid hose coefficient greater than 0.");
    return;
  }

  const customHoses = loadCustomHoseProfiles();
  const newHose = {
    id: `custom-hose-${Date.now()}`,
    manufacturer,
    model,
    tradeSize: selectedHose.label,
    appHoseId: selectedHose.id,
    chargedId50: null,
    chargedId150: null,
    coefficient,
    referenceUrl: "",
    custom: true,
    customUse: useValue
  };

  customHoses.push(newHose);
  saveCustomHoseProfiles(customHoses);
  clearCustomHoseForm();
  populateHoseLibraryFilter();
  renderHoseLibrary();
  renderDefaultHoseSelections();

  alert(`${manufacturer} ${model} was added to the Hose Library.`);
}

function deleteCustomHoseProfile(customHoseId) {
  const customHoses = loadCustomHoseProfiles();
  const customHose = customHoses.find(hose => hose.id === customHoseId);

  if (!customHose) {
    alert("This custom hose could not be found.");
    return;
  }

  const confirmed = confirm(
    `Delete ${customHose.manufacturer} ${customHose.model} from the Hose Library?`
  );

  if (!confirmed) return;

  saveCustomHoseProfiles(
    customHoses.filter(hose => hose.id !== customHoseId)
  );

  if (customHose.appHoseId) {
    const defaultProfile = getDefaultHoseProfile(customHose.appHoseId);

    if (defaultProfile?.id === customHose.id) {
      clearDefaultHoseProfile(customHose.appHoseId);
      clearHoseLibrarySelection(customHose.appHoseId);
    }
  }

  if (els.calculatorView) {
    populateHoseOptions();
    els.hoseSize.value = state.hoseSize;
    syncSplitLayInputsFromState();
    calculateAndRender();
  }

  populateHoseLibraryFilter();
  renderHoseLibrary();
  renderDefaultHoseSelections();

  alert(`${customHose.manufacturer} ${customHose.model} was deleted.`);
}

const SUPPLY_HOSE_IDS =
  ["2", "2.25", "2.5", "3", "4", "5"];

const ATTACK_HOSE_IDS =
  ["1", "1.5", "1.75", "1.88", "2", "2.25", "2.5"];

  function hoseOptionLabel(hose) {
  const activeCoefficient = getActiveHoseCoefficient(hose.id);
  const defaultProfile = getDefaultHoseProfile(hose.id);

  if (defaultProfile) {
    return `${hose.label} — ${defaultProfile.manufacturer} ${defaultProfile.model} — Calculation C ${activeCoefficient}`;
  }

  const coefficientLabel = isModifiedHoseCoefficient(hose.id)
    ? `CUSTOM C ${activeCoefficient}`
    : `Calculation C ${activeCoefficient}`;

  return `${hose.label} — ${coefficientLabel}`;
}

function populateHoseOptions() {
  const hoseOptions = isRelayMode()
    ? RELAY_HOSE_OPTIONS
    : HOSE_OPTIONS;

  els.hoseSize.innerHTML = hoseOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  const splitSupplyHose =
  document.getElementById("splitSupplyHose");

const splitSupply2Hose =
  document.getElementById("splitSupply2Hose");

  const reverseSupplyHose =
  document.getElementById("reverseSupplyHose");

const splitAttack1Hose =
  document.getElementById("splitAttack1Hose");

const splitAttack2Hose =
  document.getElementById("splitAttack2Hose");

const supplyOptions = HOSE_OPTIONS.filter(hose =>
  SUPPLY_HOSE_IDS.includes(hose.id)
);

if (reverseSupplyHose) {
  reverseSupplyHose.innerHTML = supplyOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  reverseSupplyHose.value =
    state.reverseSupplyHoseSize || "3";
}

const attackOptions = HOSE_OPTIONS.filter(hose =>
  ATTACK_HOSE_IDS.includes(hose.id)
);

if (splitSupplyHose) {
  splitSupplyHose.innerHTML = supplyOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  splitSupplyHose.value =
    state.splitLay.supplyHoseSize;
}

if (splitSupply2Hose) {
  splitSupply2Hose.innerHTML = supplyOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  splitSupply2Hose.value =
    state.splitLay.supply2HoseSize;
}

if (splitAttack1Hose) {
  splitAttack1Hose.innerHTML = attackOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  splitAttack1Hose.value =
    state.splitLay.attack1HoseSize;
}

if (splitAttack2Hose) {
  splitAttack2Hose.innerHTML = attackOptions.map(hose => (
    `<option value="${hose.id}">${hoseOptionLabel(hose)}</option>`
  )).join("");

  splitAttack2Hose.value =
    state.splitLay.attack2HoseSize;
}
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getHoseOptionById(hoseId) {
  return [...HOSE_OPTIONS, ...RELAY_HOSE_OPTIONS]
    .find(hose => hose.id === hoseId);
}

function formatLibraryValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value}${suffix}`;
}

function populateHoseLibraryFilter() {
  if (!els.hoseLibrarySizeFilter || !els.hoseLibraryManufacturerFilter) return;

  const hoseLibraryRows = getHoseLibraryRows();
  const manufacturers = [
    ...new Set(hoseLibraryRows.map(hose => hose.manufacturer).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b));
  const tradeSizes = [
    ...new Set(hoseLibraryRows.map(hose => hose.tradeSize).filter(Boolean))
  ];

  els.hoseLibraryManufacturerFilter.innerHTML = [
    `<option value="all">All manufacturers</option>`,
    ...manufacturers.map(manufacturer => (
      `<option value="${escapeHtml(manufacturer)}">${escapeHtml(manufacturer)}</option>`
    ))
  ].join("");

  els.hoseLibrarySizeFilter.innerHTML = [
    `<option value="all">All hose sizes</option>`,
    ...tradeSizes.map(size => (
      `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`
    ))
  ].join("");
}

function applyHoseLibraryQueryFilters() {
  if (!els.hoseLibrarySizeFilter) return;

  const params = new URLSearchParams(window.location.search);
  const selectedHoseId = params.get("size");

  if (!selectedHoseId) return;

  const selectedTradeSize = getHoseLibrarySizeFilterValueForHose(selectedHoseId);

  if (!selectedTradeSize) return;

  els.hoseLibrarySizeFilter.value = selectedTradeSize;
}

function getHoseLibraryUseLabel(hose) {
  if (hose.custom) {
    return getCustomHoseUseLabel(hose.customUse);
  }

  if (!hose.appHoseId) return "Reference";

  const isSupply = SUPPLY_HOSE_IDS.includes(hose.appHoseId);
  const isAttack = ATTACK_HOSE_IDS.includes(hose.appHoseId);

  if (isSupply && isAttack) return "Supply / Attack";
  if (isSupply) return "Supply";
  if (isAttack) return "Attack";

  return "Reference";
}

function getDefaultHoseDisplaySource(hoseId) {
  const defaultProfile = getDefaultHoseProfile(hoseId);

  if (defaultProfile?.custom) return "Custom hose";
  if (defaultProfile) return "Catalog";

  const savedCoefficients = loadSavedHoseCoefficients();

  if (savedCoefficients[hoseId] !== undefined) return "Custom override";

  return "Built-in";
}

function getDefaultHoseDisplayName(hose) {
  const defaultProfile = getDefaultHoseProfile(hose.id);

  if (defaultProfile) {
    return `${defaultProfile.manufacturer} ${defaultProfile.model}`;
  }

  if (getDefaultHoseDisplaySource(hose.id) === "Custom override") {
    return "Custom coefficient default";
  }

  return "Built-in default";
}

function getPublishedHoseCoefficient(defaultProfile) {
  if (!defaultProfile) return null;

  return defaultProfile.publishedCoefficient ?? defaultProfile.coefficient ?? null;
}

function getCalculationCoefficientSource(hoseId) {
  const savedCoefficients = loadSavedHoseCoefficients();

  return savedCoefficients[hoseId] !== undefined
    ? "Custom coefficient"
    : "App default";
}

function getSupportedHoseOptions() {
  const hoseMap = new Map();

  [...HOSE_OPTIONS, ...RELAY_HOSE_OPTIONS].forEach(hose => {
    if (!hoseMap.has(hose.id)) {
      hoseMap.set(hose.id, hose);
    }
  });

  return [...hoseMap.values()];
}

function getCoefficientSettingsHoseOptions() {
  return HOSE_OPTIONS;
}

function getHoseLibrarySizeFilterValueForHose(hoseId) {
  const matchingRow = getHoseLibraryRows()
    .find(hose => hose.appHoseId === hoseId);

  return matchingRow?.tradeSize || "";
}

function renderDefaultHoseSelections() {
  if (!els.defaultHoseSelectionsList) return;

  els.defaultHoseSelectionsList.innerHTML = getSupportedHoseOptions()
    .map(hose => {
      const defaultProfile = getDefaultHoseProfile(hose.id);
      const source = getDefaultHoseDisplaySource(hose.id);
      const calculationCoefficient = getActiveHoseCoefficient(hose.id);
      const publishedCoefficient = getPublishedHoseCoefficient(defaultProfile);
      const profileMeta = defaultProfile
        ? `<p class="helper">Use: ${escapeHtml(defaultProfile.use || "Catalog")} • Catalog ID: ${escapeHtml(defaultProfile.id)}</p>`
        : "";
      const defaultHoseText = defaultProfile
        ? `${defaultProfile.manufacturer} ${defaultProfile.model}`
        : "Built-in default";
      const publishedCoefficientText = defaultProfile
        ? formatLibraryValue(publishedCoefficient)
        : "None selected";
      const selectionAction = defaultProfile
        ? `
          <button
            class="small-button default-hose-delete-button"
            type="button"
            data-default-hose-clear-id="${escapeHtml(hose.id)}"
          >
            Delete Selection
          </button>
        `
        : `
          <button class="small-button default-hose-delete-button" type="button" disabled>
            No Selection to Delete
          </button>
        `;

      return `
        <article class="default-hose-selection-card">
          <div>
            <strong>${escapeHtml(hose.label)}</strong>
            <p>Default Hose: ${escapeHtml(defaultHoseText)}</p>
            <p class="helper">Published Coefficient: ${escapeHtml(publishedCoefficientText)}</p>
            <p class="helper">Calculation Coefficient: ${escapeHtml(calculationCoefficient)}</p>
            <p class="helper">Reference Source: ${escapeHtml(source)}</p>
            ${profileMeta}
          </div>
          ${selectionAction}
        </article>
      `;
    })
    .join("");

  els.defaultHoseSelectionsList
    .querySelectorAll("[data-default-hose-clear-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        clearDefaultHoseSelection(button.dataset.defaultHoseClearId);
      });
    });
}

function clearDefaultHoseSelection(hoseId) {
  const hose = getHoseOptionById(hoseId);
  const defaultProfile = getDefaultHoseProfile(hoseId);

  if (!hose || !defaultProfile) {
    renderDefaultHoseSelections();
    return;
  }

  const confirmed = confirm(
    `Delete the default hose selection for ${hose.label}? Calculation coefficients will not change.`
  );

  if (!confirmed) return;

  clearDefaultHoseProfile(hoseId);
  clearHoseLibrarySelection(hoseId);

  if (els.calculatorView) {
    populateHoseOptions();
    els.hoseSize.value = state.hoseSize;
    syncCoefficientUi();
    updateCalculator();
  }

  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderDefaultHoseCoefficients();
}

function renderDefaultHoseCoefficients() {
  if (!els.defaultHoseCoefficientsList) return;

  els.defaultHoseCoefficientsList.innerHTML = getCoefficientSettingsHoseOptions()
    .map(hose => {
      const calculationCoefficient = getActiveHoseCoefficient(hose.id);
      const factoryCoefficient = FACTORY_HOSE_COEFFS[hose.id];
      const source = getCalculationCoefficientSource(hose.id);
      const isModified = isModifiedHoseCoefficient(hose.id);

      return `
        <article class="default-hose-coefficient-card">
          <div>
            <strong>${escapeHtml(hose.label)}</strong>
            <p class="helper">Current calculation coefficient: ${escapeHtml(calculationCoefficient)}</p>
            <p class="helper">App default coefficient: ${escapeHtml(factoryCoefficient)}</p>
            <p class="helper">Source: ${escapeHtml(source)}</p>
          </div>
          <div class="default-hose-coefficient-actions">
            <input
              type="text"
              inputmode="decimal"
              value="${escapeHtml(calculationCoefficient)}"
              aria-label="${escapeHtml(hose.label)} calculation coefficient"
              data-coefficient-input="${escapeHtml(hose.id)}"
            />
            <button
              class="small-button"
              type="button"
              data-coefficient-save="${escapeHtml(hose.id)}"
            >
              Save
            </button>
            <button
              class="small-button"
              type="button"
              data-coefficient-reset="${escapeHtml(hose.id)}"
              ${isModified ? "" : "disabled"}
            >
              Reset
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  bindDefaultHoseCoefficientEvents();
}

function refreshCoefficientDisplays() {
  if (els.calculatorView) {
    populateHoseOptions();

    if (els.hoseSize) {
      els.hoseSize.value = state.hoseSize;
    }

    syncCoefficientUi();
    calculateAndRender();
  }

  renderDefaultHoseSelections();
  renderDefaultHoseCoefficients();
}

function bindDefaultHoseCoefficientEvents() {
  if (!els.defaultHoseCoefficientsList) return;

  els.defaultHoseCoefficientsList
    .querySelectorAll("[data-coefficient-save]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const hoseId = button.dataset.coefficientSave;
        const input = button
          .closest(".default-hose-coefficient-card")
          ?.querySelector("[data-coefficient-input]");
        const coefficient = numberOrNull(input?.value);

        if (coefficient === null || coefficient <= 0) {
          alert("Enter a valid hose coefficient greater than 0.");
          return;
        }

        saveHoseCoefficient(hoseId, coefficient);
        refreshCoefficientDisplays();
        alert("Calculation coefficient saved.");
      });
    });

  els.defaultHoseCoefficientsList
    .querySelectorAll("[data-coefficient-reset]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const hoseId = button.dataset.coefficientReset;

        clearSavedHoseCoefficient(hoseId);
        refreshCoefficientDisplays();
      });
    });
}

function hoseMatchesLibraryUse(hose, selectedUse) {
  if (selectedUse === "all") return true;
  if (!hose.appHoseId) return false;

  if (hose.custom) {
    return hose.customUse === "both" || hose.customUse === selectedUse;
  }

  if (selectedUse === "supply") {
    return SUPPLY_HOSE_IDS.includes(hose.appHoseId);
  }

  if (selectedUse === "attack") {
    return ATTACK_HOSE_IDS.includes(hose.appHoseId);
  }

  return true;
}

function renderHoseLibraryCard(hose) {
  const appHose = getHoseOptionById(hose.appHoseId);
  const selectedLibrary = hose.appHoseId
    ? getDefaultHoseProfile(hose.appHoseId)
    : null;
  const isSelected =
    selectedLibrary && selectedLibrary.id === hose.id;
  const canSelect = Boolean(appHose);
  const buttonText = isSelected
    ? "Selected Default"
    : canSelect
      ? `Set as Default for ${appHose.label}`
      : "Reference Only";
  const useLabel = getHoseLibraryUseLabel(hose);
  const sourceLink = hose.custom
    ? "Custom Hose"
    : hose.referenceUrl
      ? `<a href="${escapeHtml(hose.referenceUrl)}" target="_blank" rel="noopener">Source</a>`
      : "Source —";
  const coefficientText = hose.coefficient === null
    ? "Still gathering data"
    : `Published C ${formatLibraryValue(hose.coefficient)}`;

  return `
    <article class="hose-library-card${isSelected ? " active" : ""}">
      <div class="hose-library-card-header">
        <div>
          <strong>${escapeHtml(hose.manufacturer)} ${escapeHtml(hose.model)}</strong>
          <p class="helper">${escapeHtml(hose.tradeSize)}${appHose ? ` maps to ${escapeHtml(appHose.label)}` : " reference only"}</p>
        </div>
        <span class="hose-library-coefficient">
          ${escapeHtml(coefficientText)}
        </span>
      </div>

      <div class="hose-library-details">
        <span>Use: ${escapeHtml(useLabel)}</span>
        <span>ID @50: ${formatLibraryValue(hose.chargedId50, "\"")}</span>
        <span>ID @150: ${formatLibraryValue(hose.chargedId150, "\"")}</span>
        <span>${sourceLink}</span>
      </div>

      <div class="hose-library-card-actions">
        <button
          class="small-button hose-library-select-button"
          type="button"
          data-hose-library-id="${escapeHtml(hose.id)}"
          ${canSelect ? "" : "disabled"}
        >
          ${escapeHtml(buttonText)}
        </button>
        ${hose.custom ? `
          <button
            class="small-button hose-library-delete-button"
            type="button"
            data-custom-hose-delete-id="${escapeHtml(hose.id)}"
          >
            Delete
          </button>
        ` : ""}
      </div>
    </article>
  `;
}

function renderHoseLibrary() {
  if (!els.hoseLibraryList || !els.hoseLibrarySummary) return;

  const selectedManufacturer =
    els.hoseLibraryManufacturerFilter?.value || "all";
  const selectedSize = els.hoseLibrarySizeFilter?.value || "all";
  const selectedUse = els.hoseLibraryUseFilter?.value || "all";
  const hoseLibraryRows = getHoseLibraryRows();
  const libraryRows = hoseLibraryRows.filter(hose => {
    const matchesManufacturer = selectedManufacturer === "all" ||
      hose.manufacturer === selectedManufacturer;
    const matchesSize = selectedSize === "all" ||
      hose.tradeSize === selectedSize;

    return matchesManufacturer &&
      matchesSize &&
      hoseMatchesLibraryUse(hose, selectedUse);
  });

  const selectableCount = libraryRows.filter(hose =>
    hose.appHoseId && hose.coefficient !== null
  ).length;

  els.hoseLibrarySummary.textContent =
    `${libraryRows.length} hose profiles shown. ${selectableCount} can be set as a local default.`;

  try {
    els.hoseLibraryList.innerHTML = libraryRows
      .map(renderHoseLibraryCard)
      .join("");
  } catch (error) {
    console.error("[Reverse Flow] Hose library render failed.", error);
    els.hoseLibraryList.innerHTML = `
      <div class="disabled-note">
        Hose Library could not render.
      </div>
    `;
  }

  els.hoseLibraryList
    .querySelectorAll("[data-hose-library-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        applyHoseLibraryDefault(button.dataset.hoseLibraryId);
      });
    });

  els.hoseLibraryList
    .querySelectorAll("[data-custom-hose-delete-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteCustomHoseProfile(button.dataset.customHoseDeleteId);
      });
    });
}

function applyHoseLibraryDefault(libraryId) {
  const libraryHose = getHoseLibraryRows()
    .find(hose => hose.id === libraryId);

  if (!libraryHose || !libraryHose.appHoseId) {
    alert("This hose library entry cannot be selected as an app default.");
    return;
  }

  const appHose = getHoseOptionById(libraryHose.appHoseId);
  const confirmed = confirm(
    `Set ${libraryHose.manufacturer} ${libraryHose.model} as the default reference profile for ${appHose.label} hose? Calculation coefficients will not change.`
  );

  if (!confirmed) return;

  saveHoseLibrarySelection(libraryHose.appHoseId, libraryHose);
  saveDefaultHoseProfile(libraryHose.appHoseId, {
    ...libraryHose,
    use: getHoseLibraryUseLabel(libraryHose)
  });

  if (els.calculatorView) {
    populateHoseOptions();
    els.hoseSize.value = state.hoseSize;

    syncCoefficientUi();
    updateCalculator();
  }

  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderDefaultHoseCoefficients();

  alert(`${libraryHose.manufacturer} ${libraryHose.model} is now your default ${appHose.label} hose reference. Calculation coefficient unchanged: ${getActiveHoseCoefficient(libraryHose.appHoseId)}`);
}

    function populateSmoothboreTips() {
  const tips = isMasterStream()
    || isApparatusMountedMode()
    ? SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 1.25 &&
        tip.diameter <= 3
      )
    : SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 0.75 &&
        tip.diameter <= 1.25
      );

  els.smoothboreTip.innerHTML = tips.map(tip => (
    `<option value="${tip.id}">${tip.label}</option>`
  )).join("");

  if (!tips.some(tip => tip.id === state.smoothboreTip)) {
    state.smoothboreTip = tips[0]?.id || "";
    els.smoothboreTip.value = state.smoothboreTip;
  }
}

    function renderPresetOptions() {
  if (!els.presetSelect) return;

  const presets = loadPresets();

  els.presetSelect.innerHTML = `
    <option value="">No saved setup selected</option>
    ${presets.map(preset => (
      `<option value="${preset.id}">${preset.name}</option>`
    )).join("")}
  `;
}

      function renderPumpChart() {

  const presets = loadPresets();

  if (!presets.length) {
    els.pumpChartList.innerHTML = `
      <div class="disabled-note">
        No saved pump chart setups yet.
      </div>
    `;
    return;
  }

  els.pumpChartList.innerHTML = presets.map(preset => {

    const isSplitLayPreset = preset.mode === "splitLay";

    const nozzleDisplay = isSplitLayPreset
      ? "Split Lay Setup"
      : preset.nozzleType === "smoothbore"
        ? `${preset.smoothboreTip || "SB"} Smoothbore`
        : preset.nozzleType === "blade"
          ? getBladeModelLabel(preset.bladeModel)
          : `Fog @ ${preset.nozzlePressure} psi`;

    const typeLabel =
  preset.mode === "requiredPdp"
    ? "REQUIRED PDP"
    : preset.mode === "relay"
      ? "RELAY"
      : preset.mode === "splitLay"
        ? "SPLIT LAY"
        : "REVERSE FLOW";

    const splitLay = preset.splitLay || {};

const splitAttackCount = splitLay.attackLines || "1";
const splitSectionCount = splitLay.sectionCount || "2";
const dualSupply = splitLay.dualSupply ? "Dual Supply 1" : "Single Supply 1";

const splitSupply1 =
  `S1 • ${splitLay.supplyLength || "—"}' ${splitLay.supplyHoseSize || "—"}`;

const splitSupply2 =
  splitSectionCount === "3"
    ? `<br>S2 • ${splitLay.supply2Length || "—"}' ${splitLay.supply2HoseSize || "—"}`
    : "";

const attack1Description =
  splitLay.attack1NozzleType === "smoothbore"
    ? `${splitLay.attack1SmoothboreTip || "SB"} SB`
    : splitLay.attack1NozzleType === "blade"
      ? getBladeModelLabel(splitLay.attack1BladeModel)
    : `${splitLay.attack1Flow || "—"} GPM Fog`;

const attack2Description =
  splitLay.attack2NozzleType === "smoothbore"
    ? `${splitLay.attack2SmoothboreTip || "SB"} SB`
    : splitLay.attack2NozzleType === "blade"
      ? getBladeModelLabel(splitLay.attack2BladeModel)
    : `${splitLay.attack2Flow || "—"} GPM Fog`;

const splitAttack1 =
  `A1 • ${splitLay.attack1Length || "—"}' ${splitLay.attack1HoseSize || "—"} • ${attack1Description}`;

const splitAttack2 =
  splitAttackCount === "2"
    ? `<br>A2 • ${splitLay.attack2Length || "—"}' ${splitLay.attack2HoseSize || "—"} • ${attack2Description}`
    : "";

const setupSummary =
  preset.mode === "relay"
    ? `${preset.calculatedFlow || "—"} • ${preset.hoseLength || "—"}' ${preset.hoseSize || "—"}`
    : isSplitLayPreset
      ? `
        ${splitSupply1}
        ${splitSupply2}
        <br><br>
        ${splitAttack1}
        ${splitAttack2}
      `
      : `${preset.calculatedFlow || "—"} • ${preset.hoseLength || "—"}' ${preset.hoseSize || "—"} • ${nozzleDisplay}`;

    const turboSummary =
      preset.henTurboEnabled && !isSplitLayPreset && preset.mode !== "relay"
        ? `<div class="pump-chart-card-summary">HEN Turbo included</div>`
        : "";

    return `
      <div class="section-card pump-chart-card">
        <div class="pump-chart-card-header">

          <strong class="pump-chart-card-title">
            ${preset.name}
          </strong>

          <div class="pump-chart-card-badge">
            ${typeLabel}
          </div>

        </div>

        <div>

          <div class="pump-chart-card-result">
           ${preset.calculatedPdp ? `${preset.calculatedPdp} PSI` : "—"}
          </div>

          <div class="pump-chart-card-summary">
            ${setupSummary}
          </div>

          ${turboSummary}

        </div>

        <div class="pump-chart-card-actions">

          <button
            class="small-button"
            onclick="loadPumpChartPreset('${preset.id}')"
          >
            Load Setup
          </button>

          <button
            class="small-button"
            onclick="deletePumpChartPreset('${preset.id}')"
          >
            Delete
          </button>

        </div>
      </div>
    `;

  }).join("");
}

    function renderPressureButtons() {
  if (isSplitLayMode()) {
    els.nozzlePressureLabel.closest(".field").style.display = "none";
    els.pressureButtons.hidden = true;
    els.pressureButtons.innerHTML = "";
    els.calculatedNozzlePressure.hidden = true;
    els.disabledPressureExplanations.hidden = true;
    return;
  }

  if (isRelayMode()) {
  els.nozzlePressureLabel.closest(".field").style.display = "none";
  els.pressureButtons.hidden = true;
  els.pressureButtons.innerHTML = "";
  els.calculatedNozzlePressure.hidden = true;
  els.disabledPressureExplanations.hidden = true;
  return;
}
      if (isReverseSmoothbore()) {
        renderCalculatedSmoothborePressure();
        return;
      }

      els.nozzlePressureLabel.textContent = "Nozzle Pressure";
      els.pressureButtons.hidden = false;
      els.calculatedNozzlePressure.hidden = true;
      els.calculatedNozzlePressureValue.textContent = "— psi";
      els.disabledPressureExplanations.hidden = true;
      els.disabledPressureExplanations.innerHTML = "";

  const pressureKey =
  isMasterStream() || isApparatusMountedMode()
    ? "masterstream"
    : state.nozzleType;

  const pressures = getNozzlePressures()[pressureKey];

  if (!pressures.some(pressure => String(pressure) === String(state.nozzlePressure))) {
    state.nozzlePressure = isBlade()
      ? getBladeDefaultNozzlePressure()
      : String(pressures[0]);
    state.customNozzlePressure = "";
  }

  syncCalculatedSmoothboreTargetFlow();

  if (isRequiredPdpMode() && usesSmoothboreHydraulics()) {
    els.pdp.value = state.targetGpm;
  }

      const usingCustomPressure =
        state.nozzlePressure === "custom";

      els.customNozzlePressureField.hidden =
  !usingCustomPressure;

      els.customNozzlePressureField.style.display =
  usingCustomPressure ? "" : "none";

els.customNozzlePressure.disabled =
  !usingCustomPressure;

if (usingCustomPressure) {
  els.customNozzlePressure.value =
    state.customNozzlePressure || "";
} else {
  els.customNozzlePressure.value = "";
}

      els.pressureButtons.innerHTML = pressures.map(pressure => {
        const isActive = state.nozzlePressure === String(pressure);
        return `
<button
  type="button"
  data-pressure="${pressure}"
  class="${isActive ? "active" : ""}"
>
  ${pressure === "custom" ? "Custom NP" : `${pressure} psi`}
</button>
`;
      }).join("");

      els.pressureButtons.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => {
          if (button.disabled) return;

          state.nozzlePressure = button.dataset.pressure;
          
          if (button.dataset.pressure !== "custom") {
          state.customNozzlePressure = "";
          els.customNozzlePressure.value = "";
    }
          syncCalculatedSmoothboreTargetFlow();
          saveState();
          syncModeUi();
          renderPressureButtons();
          calculateAndRender();
        });
      });
    }

    function renderCalculatedSmoothborePressure() {
      const calculatedPressure = calculateAchievableSmoothborePressure();

      els.nozzlePressureLabel.textContent = "Calculated Nozzle Pressure";
      els.pressureButtons.hidden = true;
      els.pressureButtons.innerHTML = "";
      els.calculatedNozzlePressure.hidden = false;
      els.calculatedNozzlePressureValue.textContent = calculatedPressure === null ? "— psi" : `${calculatedPressure} psi`;
      els.disabledPressureExplanations.hidden = true;
      els.disabledPressureExplanations.innerHTML = "";
    }

    function renderWarnings(warnings) {
      if (!warnings.length) {
        els.warningsCard.hidden = true;
        els.warningsCard.innerHTML = "";
        return;
      }

      els.warningsCard.hidden = false;
      els.warningsCard.innerHTML = warnings.map(warning => (
        `<div class="warning-item"><span>⚠️</span><span>${escapeHtml(warning)}</span></div>`
      )).join("");
    }

    // ========================================
    // UI SYNCHRONIZATION
    // ========================================
    function syncInputsFromState() {
  els.pdp.value =
    isRequiredPdpMode() || isRelayMode()
      ? state.targetGpm
      : state.pdp;

  els.hoseLength.value = state.hoseLength;
  els.hoseSize.value = state.hoseSize;
    if (els.reverseSupplyLength) {
    els.reverseSupplyLength.value =
      state.reverseSupplyLength || "";
  }

  if (els.reverseSupplyHose) {
    els.reverseSupplyHose.value =
      state.reverseSupplyHoseSize || "3";
  }

  if (els.reverseSupplyAppliance) {
    els.reverseSupplyAppliance.value =
      state.reverseSupplyAppliance || "gateValve";
  }
  els.nozzleType.value = state.nozzleType;

  els.relayResidualPressure.value =
    state.relayResidualPressure || "30";

  els.masterStreamType.value =
    state.masterStreamType;

      els.masterStreamLoss.value =
    state.masterStreamLoss;

  if (els.apparatusFogFlow) {
    els.apparatusFogFlow.value =
      state.apparatusFogFlow || "1000";
  }

  if (els.apparatusCustomFogFlow) {
    els.apparatusCustomFogFlow.value =
      state.apparatusCustomFogFlow || "";
  }

  if (els.apparatusElevation) {
    els.apparatusElevation.value =
      state.apparatusElevation || "";
  }

  els.dualLineSupplyToggle.checked =
    state.dualLineSupply;

  els.smoothboreTip.value = state.smoothboreTip;
  if (els.bladeModel) {
    els.bladeModel.value = state.bladeModel || "blade160";
  }
  els.applianceLoss.value = state.applianceLoss;
  els.customCoefficient.value = state.customCoefficient;

  enforceHenTurboAvailability();
  syncHenTurboUi();
  syncReverseSupplyUi();
  syncCoefficientUi();
  syncSmoothboreUi();
  syncModeUi();
}

    function syncModeUi() {
      const smoothboreRequiredPdp = isRequiredPdpMode() && usesSmoothboreHydraulics();

      els.reverseModeButton.classList.toggle("active", isReverseMode());
      els.pdpModeButton.classList.toggle("active", isRequiredPdpMode());
      els.apparatusMountedModeButton?.classList.toggle("active", isApparatusMountedMode());
      els.relayModeButton.classList.toggle("active",isRelayMode());
      els.splitLayButton.classList.toggle("active", isSplitLayMode());

      els.pdpLabel.textContent =
        isApparatusMountedMode()
          ? "Rated Flow"
      : isRelayMode()
          ? "Target Flow"
      : isRequiredPdpMode()
          ? "Target Flow"
          : "Pump Discharge Pressure";

      els.pdp.placeholder =
        isApparatusMountedMode()
          ? "GPM"
      : isRelayMode()
          ? "GPM"
      : isRequiredPdpMode()
          ? "GPM"
          : "PDP";

      els.pdp.disabled = smoothboreRequiredPdp || isApparatusMountedMode();

      els.pdp.closest(".field").style.display =
        (isSplitLayMode() || isApparatusMountedMode()) ? "none" : "";
      els.hoseLength.closest(".field").style.display =
        (isSplitLayMode() || isApparatusMountedMode()) ? "none" : "";
      els.hoseSize.closest(".field").style.display =
        (isSplitLayMode() || isApparatusMountedMode()) ? "none" : "";
      
      els.nozzleType.closest(".field").style.display =
  (isSplitLayMode() || isRelayMode())
    ? "none"
    : "";
      els.applianceLoss.closest(".field").style.display =
        isApparatusMountedMode() ? "none" : "";
      els.customCoefficient.closest(".field").style.display =
        (isSplitLayMode() || isApparatusMountedMode()) ? "none" : "";
      enforceHenTurboAvailability();
      syncHenTurboUi();

      els.pdp.value =
  isRequiredPdpMode() || isRelayMode()
    ? getTargetFlowValue()
    : state.pdp;

      document.querySelector('label[for="hoseLength"]').textContent =
  isRelayMode() ? "Relay Distance" : "Hose Length";

document.querySelector('label[for="hoseSize"]').textContent =
  isRelayMode() ? "Relay Hose Layout" : "Hose Size";

document.querySelector('label[for="applianceLoss"]').textContent =
  "Appliance / Elevation Loss";
    if (isSplitLayMode()) {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(168, 85, 247, 0.38)"
  );

} else if (isApparatusMountedMode()) {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(14, 165, 233, 0.36)"
  );

} else if (isRelayMode()) {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(59, 130, 246, 0.38)"
  );

} else if (isRequiredPdpMode()) {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(34, 197, 94, 0.36)"
  );

} else {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(234, 88, 12, 0.38)"
  );

}
    els.modeHelper.textContent = isSplitLayMode()
  ? "Split Lay: Calculate longer deployments using separate supply and attack sections joined by an appliance."
  : isApparatusMountedMode()
    ? "Apparatus Mounted: calculate master stream flow, reaction, elevation loss, and required PDP without hose friction."
  : isRelayMode()
    ? "Relay Pumping: Calculate the discharge pressure needed to supply a receiving engine."
    : smoothboreRequiredPdp
      ? `Required PDP: ${isBlade() ? "Blade" : "Smoothbore"} target flow is calculated from selected model and nozzle pressure.`
      : isRequiredPdpMode()
        ? "Required PDP: Enter target GPM to calculate the needed pump pressure."
        : "Reverse Flow: enter PDP to estimate GPM.";

      els.reverseFormula.hidden = !isReverseMode();
      els.requiredPdpFormula.hidden = !isRequiredPdpMode();
      els.relayFormula.hidden = !isRelayMode();
      els.splitLayFormula.hidden = !isSplitLayMode();

      els.primaryResultLabel.textContent =
  isSplitLayMode()
    ? "Split Lay PDP"
    : isApparatusMountedMode()
      ? "Required PDP"
    : isRelayMode()
      ? "Relay PDP"
      : isRequiredPdpMode()
        ? "Required PDP"
        : "Rounded Flow";
      
  els.primaryResultUnit.textContent =
  isRelayMode() || isRequiredPdpMode() || isSplitLayMode() || isApparatusMountedMode()
    ? "PSI"
    : "GPM";
     if (isRelayMode()) {

  els.calculatedLabel.textContent = "Target Flow";
  els.totalFlLabel.textContent = "Relay FL";
  els.flPer100Label.textContent = "FL / 100'";
  els.nozzleDisplayLabel.textContent = "Residual";
  els.reactionLabel.textContent = "Reserve";
  els.nozzleReaction.parentElement.style.display = isRelayMode() ? "none" : "";
  els.setupLabel.textContent = "Relay Distance";

} else if (isApparatusMountedMode()) {

  els.calculatedLabel.textContent = "Flow";
  els.totalFlLabel.textContent = "Nozzle Pressure";
  els.flPer100Label.textContent = "Elevation Loss";
  els.nozzleDisplayLabel.textContent = "Appliance Loss";
  els.reactionLabel.textContent = "Reaction";
  els.setupLabel.textContent = "Nozzle";
  els.nozzleReaction.parentElement.style.display = "";

} else {

  els.calculatedLabel.textContent = isRequiredPdpMode()
    ? "Total Flow"
    : "Calculated";

  els.totalFlLabel.textContent = "Total FL";

  els.flPer100Label.textContent =
  isSplitLayMode()
    ? "FL Breakdown"
    : state.reverseSupplyEnabled
      ? "FL Breakdown"
      : "FL / 100'";

  els.nozzleDisplayLabel.textContent = "Nozzle";

  els.reactionLabel.textContent =
    isRequiredPdpMode() && !isBlade()
      ? "Supply"
      : "Reaction";

  els.setupLabel.textContent = "Setup";
  els.nozzleReaction.parentElement.style.display = "";

}
    
      els.nozzleTypeLabel.textContent = "Nozzle Style";

els.nozzleType.innerHTML = isApparatusMountedMode()
  ? `
  <option value="fog">Fog</option>
  <option value="smoothbore">Smoothbore</option>
`
  : `
  <option value="fog">Fog</option>
  <option value="smoothbore">Smoothbore</option>
  <option value="blade">Blade</option>
  <option value="masterstream">Master Stream</option>
`;

if (
  isApparatusMountedMode() &&
  !["fog", "smoothbore"].includes(state.nozzleType)
) {
  state.nozzleType = "fog";
}

els.nozzleType.value = state.nozzleType;

els.nozzlePressureLabel.closest(".field").style.display =
  (isRelayMode() || isSplitLayMode())
    ? "none"
    : "";

    els.relayResidualField.hidden = !isRelayMode();

    els.relayResidualField.style.display =
      isRelayMode() ? "" : "none";

    const splitLayFields = document.getElementById("splitLayFields");

if (splitLayFields) {
  splitLayFields.style.display = isSplitLayMode() ? "grid" : "none";
}

if (els.splitResultsCard) {
  els.splitResultsCard.hidden = !isSplitLayMode();
}

if (!isSplitLayMode()) {
  resetSplitLayResultCard();
}

if (els.standardResultsCard) {
  els.standardResultsCard.hidden = isSplitLayMode();
}
if (els.standardResultsCard) {
  els.standardResultsCard.hidden = isSplitLayMode();
}

if (els.reverseSupplyToggleField) {
  els.reverseSupplyToggleField.style.display =
    isReverseMode() ? "" : "none";
}

if (!isReverseMode()) {
  state.reverseSupplyEnabled = false;
  syncReverseSupplyUi();
}

syncSplitLayUi();
syncHenTurboUi();

}

function syncSmoothboreUi() {

  if (isRelayMode() || isSplitLayMode()) {

    els.smoothboreTipField.hidden = true;
    els.smoothboreTipField.style.display = "none";

    els.bladeModelField.hidden = true;
    els.bladeModelField.style.display = "none";

    els.masterStreamTypeField.hidden = true;
    els.masterStreamTypeField.style.display = "none";

    els.masterStreamLossField.hidden = true;
    els.masterStreamLossField.style.display = "none";

    els.dualLineSupplyField.hidden = true;
    els.dualLineSupplyField.style.display = "none";
    if (els.apparatusFogFlowField) {
      els.apparatusFogFlowField.hidden = true;
      els.apparatusFogFlowField.style.display = "none";
    }
    if (els.apparatusCustomFogFlowField) {
      els.apparatusCustomFogFlowField.hidden = true;
      els.apparatusCustomFogFlowField.style.display = "none";
    }
    if (els.apparatusElevationField) {
      els.apparatusElevationField.hidden = true;
      els.apparatusElevationField.style.display = "none";
    }

    return;
  }

  const showMasterStream =
    isMasterStream();

  const showApparatusMounted =
    isApparatusMountedMode();

  els.masterStreamTypeField.hidden =
    !showMasterStream;

  els.masterStreamTypeField.style.display =
    showMasterStream ? "" : "none";

  els.masterStreamLossField.hidden =
    !(showMasterStream || showApparatusMounted);

  els.masterStreamLossField.style.display =
    (showMasterStream || showApparatusMounted) ? "" : "none";

  document.querySelector('label[for="masterStreamLoss"]').textContent =
    showApparatusMounted
      ? "Master Stream / Appliance Loss"
      : "Master Stream Device Loss";

  const showSmoothbore =
    isSmoothbore();

  const showBlade =
    isBlade();

  els.smoothboreTipField.hidden =
    !showSmoothbore;

  els.smoothboreTipField.style.display =
    showSmoothbore ? "" : "none";

  els.bladeModelField.hidden =
    !showBlade;

  els.bladeModelField.style.display =
    showBlade ? "" : "none";

  const showDualLines =
    isRequiredPdpMode() &&
    isMasterStream();

  els.dualLineSupplyField.hidden =
    !showDualLines;

  els.dualLineSupplyField.style.display =
    showDualLines ? "" : "none";

  const showApparatusFogFlow =
    showApparatusMounted && state.nozzleType === "fog";

  if (els.apparatusFogFlowField) {
    els.apparatusFogFlowField.hidden =
      !showApparatusFogFlow;
    els.apparatusFogFlowField.style.display =
      showApparatusFogFlow ? "" : "none";
  }

  const showApparatusCustomFogFlow =
    showApparatusFogFlow &&
    state.apparatusFogFlow === "custom";

  if (els.apparatusCustomFogFlowField) {
    els.apparatusCustomFogFlowField.hidden =
      !showApparatusCustomFogFlow;
    els.apparatusCustomFogFlowField.style.display =
      showApparatusCustomFogFlow ? "" : "none";
  }

  if (els.apparatusElevationField) {
    els.apparatusElevationField.hidden =
      !showApparatusMounted;
    els.apparatusElevationField.style.display =
      showApparatusMounted ? "" : "none";
  }

  if (!showSmoothbore) {
    state.smoothboreTip = "";
    els.smoothboreTip.value = "";
  }

  if (showBlade && !BLADE_MODELS.some(model => model.id === state.bladeModel)) {
    state.bladeModel = "blade160";
    els.bladeModel.value = state.bladeModel;
  }
}

function getHenTurboCurveForHose(hoseId = state.hoseSize) {
  return Object.values(HEN_TURBO_CURVES).find(curve =>
    curve.compatibleHoseIds.includes(String(hoseId))
  ) || null;
}

function isHenTurboAvailable() {
  return (isReverseMode() || isRequiredPdpMode()) &&
    !!getHenTurboCurveForHose();
}

function enforceHenTurboAvailability() {
  if (!isHenTurboAvailable()) {
    state.henTurboEnabled = false;
  }
}

function syncHenTurboUi() {
  if (!els.henTurboField || !els.henTurboToggle) return;

  const isAvailable = isHenTurboAvailable();
  els.henTurboField.hidden = !isAvailable;
  els.henTurboField.style.display = isAvailable ? "" : "none";
  els.henTurboToggle.classList.toggle("active", !!state.henTurboEnabled);
  els.henTurboToggle.setAttribute(
    "aria-pressed",
    state.henTurboEnabled ? "true" : "false"
  );
}

function getActiveHenTurboCurve() {
  if (!state.henTurboEnabled) return null;
  return getHenTurboCurveForHose();
}

function getHenTurboSegments(curve) {
  if (!curve) return [];

  return curve.points.slice(0, -1).map((point, index) => {
    const nextPoint = curve.points[index + 1];
    const slope =
      (nextPoint.loss - point.loss) /
      (nextPoint.gpm - point.gpm);

    return {
      minGpm: point.gpm,
      maxGpm: nextPoint.gpm,
      a: slope,
      b: point.loss - slope * point.gpm
    };
  });
}

function getHenTurboLossForGpm(gpm, curve) {
  if (!curve || gpm === null || !Number.isFinite(gpm)) return null;

  const exactPoint = curve.points.find(point => point.gpm === gpm);
  if (exactPoint) return exactPoint.loss;

  const segment = getHenTurboSegments(curve).find(item =>
    gpm >= item.minGpm && gpm <= item.maxGpm
  );

  if (!segment) return null;

  return segment.a * gpm + segment.b;
}

function getHenTurboPublishedRange(curve) {
  if (!curve || !curve.points.length) return null;

  return {
    min: curve.points[0].gpm,
    max: curve.points[curve.points.length - 1].gpm
  };
}

function formatHenTurboWarningFlow(gpm) {
  return Math.round(gpm);
}

function formatHenTurboOutOfRangeWarning(gpm, range, actionText) {
  return [
    "Calculation Unavailable",
    "",
    "Calculated flow is outside the published range for the selected Turbo device.",
    "",
    `Turbo Published Range: ${range.min}–${range.max} GPM`,
    `Current Calculated Flow: ${formatHenTurboWarningFlow(gpm)} GPM`,
    "",
    `${actionText} flow or remove the Turbo to continue.`
  ].join("\n");
}

function getHenTurboOutOfRangeWarning(gpm, curve) {
  const range = getHenTurboPublishedRange(curve);

  if (!range || gpm === null || !Number.isFinite(gpm)) {
    return HEN_TURBO_OUT_OF_RANGE_WARNING;
  }

  if (gpm < range.min) {
    return formatHenTurboOutOfRangeWarning(gpm, range, "Increase");
  }

  if (gpm > range.max) {
    return formatHenTurboOutOfRangeWarning(gpm, range, "Reduce");
  }

  return HEN_TURBO_OUT_OF_RANGE_WARNING;
}

function renderCalculationUnavailable(warnings) {
  setResult(
    "—",
    "—",
    "—",
    "—",
    getNozzleDisplay(),
    getSetupDisplay(),
    "—"
  );
  renderWarnings(warnings);
}

function enforceSplitLayRestrictions() {
  const connectingAppliance =
  state.splitLay.sectionCount === "3"
    ? state.splitLay.appliance2
    : state.splitLay.appliance1;

  const attack2Button = document.querySelector(
    '#splitAttackLineButtons button[data-attack-lines="2"]'
  );

  const attack1Button = document.querySelector(
    '#splitAttackLineButtons button[data-attack-lines="1"]'
  );

  const twoAttackAllowed =
  state.splitLay.sectionCount === "3"
    ? state.splitLay.appliance2 === "gatedWye"
    : state.splitLay.appliance1 === "gatedWye";

  if (!twoAttackAllowed) {
    state.splitLay.attackLines = "1";

    clearSplitAttack2State();

    if (attack2Button) {
      attack2Button.disabled = true;
    }
  } else {
    if (attack2Button) {
      attack2Button.disabled = false;
    }
  }

  if (attack1Button) {
    attack1Button.disabled = false;
  }
}
function resetSplitLayResultCard() {
  [
    "splitPrimaryPdp",
    "splitSupplyLayoutResult",
    "splitSupplyFlow",
    "splitSupplyLoss",
    "splitApplianceLoss",
    "splitSupply2Flow",
    "splitSupply2Loss",
    "splitAppliance2Loss",
    "splitAttack1FlowResult",
    "splitAttack1NpResult",
    "splitAttack1FlResult",
    "splitAttack1ReactionResult",
    "splitAttack2FlowResult",
    "splitAttack2NpResult",
    "splitAttack2FlResult",
    "splitAttack2ReactionResult"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  if (els.splitAttack1PressureTag) {
    els.splitAttack1PressureTag.textContent = "—";
    els.splitAttack1PressureTag.className = "pressure-path-tag";
  }

  if (els.splitAttack2PressureTag) {
    els.splitAttack2PressureTag.textContent = "—";
    els.splitAttack2PressureTag.className = "pressure-path-tag";
  }

  if (els.splitSupply2ResultSection) {
    els.splitSupply2ResultSection.hidden = true;
  }

  if (els.splitAttack2ResultSection) {
    els.splitAttack2ResultSection.hidden = true;
  }
}
function syncSplitLayUi() {
  enforceSplitLayRestrictions();

  if (!isSplitLayMode()) return;

  if (els.splitDualSupplyToggle) {
  els.splitDualSupplyToggle.checked = state.splitLay.dualSupply;
}

  if (els.splitAppliance1) {

  if (state.splitLay.dualSupply) {
    state.splitLay.appliance1 = "siamese";
    els.splitAppliance1.value = "siamese";
    els.splitAppliance1.disabled = true;
  } else {
    els.splitAppliance1.disabled = false;
  }

}


  const supply2Section = document.getElementById("splitSupply2Section");
  const attack2Section = document.getElementById("splitAttack2Section");
  const attackSections = document.getElementById("splitAttackSections");

  const sectionButtons = document.querySelectorAll("#splitSectionButtons button");
  const attackLineButtons = document.querySelectorAll("#splitAttackLineButtons button");

  sectionButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.sections === state.splitLay.sectionCount
    );
  });
  attackLineButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.attackLines === state.splitLay.attackLines
    );
  });

  if (supply2Section) {
    const showSupply2 = state.splitLay.sectionCount === "3";
    supply2Section.hidden = !showSupply2;
    supply2Section.style.display = showSupply2 ? "grid" : "none";
  }
  if (state.splitLay.sectionCount !== "3") {
  clearSplitSupply2State();
}

  if (attack2Section) {
    const showAttack2 = state.splitLay.attackLines === "2";
    attack2Section.hidden = !showAttack2;
    attack2Section.style.display = showAttack2 ? "grid" : "none";
  }
  if (els.splitSupply2ResultSection) {
  const showSupply2Result = state.splitLay.sectionCount === "3";
  els.splitSupply2ResultSection.hidden = !showSupply2Result;
  els.splitSupply2ResultSection.style.display = showSupply2Result ? "" : "none";
}

if (els.splitAttack2ResultSection) {
  const showAttack2Result = state.splitLay.attackLines === "2";
  els.splitAttack2ResultSection.hidden = !showAttack2Result;
  els.splitAttack2ResultSection.style.display = showAttack2Result ? "" : "none";
}

  if (attackSections) {
    attackSections.classList.toggle(
      "two-lines",
      state.splitLay.attackLines === "2"
    );
  }

  syncSplitNozzleUi("1");
  syncSplitNozzleUi("2");
}

function syncReverseSupplyUi() {
  if (!els.reverseSupplyToggle || !els.reverseSupplySection) {
    return;
  }

  const enabled = !!state.reverseSupplyEnabled;

  els.reverseSupplyToggle.textContent =
    "Add Supply Section";
  els.reverseSupplyToggle.setAttribute(
    "aria-pressed",
    enabled ? "true" : "false"
  );

  els.reverseSupplyToggle.classList.toggle(
    "active",
    enabled
  );

  els.reverseSupplySection.hidden = !enabled;
  els.reverseSupplySection.style.display =
    enabled ? "grid" : "none";
}

function syncSplitNozzleUi(lineNumber) {
  const nozzleType = document.getElementById(`splitAttack${lineNumber}NozzleType`);
  const pressureSelect = document.getElementById(`splitAttack${lineNumber}NozzlePressure`);
  const flowField = document.getElementById(`splitAttack${lineNumber}FlowField`);
  const tipField = document.getElementById(`splitAttack${lineNumber}SmoothboreTipField`);
  const bladeField = document.getElementById(`splitAttack${lineNumber}BladeModelField`);

  if (!nozzleType || !pressureSelect || !flowField || !tipField || !bladeField) return;

  const isSmoothboreLine = nozzleType.value === "smoothbore";
  const isBladeLine = nozzleType.value === "blade";
  const usesSolidStreamOptions = isSmoothboreLine || isBladeLine;
  const bladeKey = `attack${lineNumber}BladeModel`;
  const selectedBladeModel = state.splitLay[bladeKey] || "blade160";
  const solidStreamPressures = isBladeLine
    ? getBladeNozzlePressures(selectedBladeModel)
    : [40, 50, 60];

  pressureSelect.innerHTML = usesSolidStreamOptions
    ? solidStreamPressures.map(pressure => (
      `<option value="${pressure}">${pressure} psi</option>`
    )).join("")
    : `
      <option value="50">50 psi</option>
      <option value="55">55 psi</option>
      <option value="75">75 psi</option>
      <option value="100">100 psi</option>
    `;

  const pressureKey = `attack${lineNumber}NozzlePressure`;

  if (![...pressureSelect.options].some(option => option.value === state.splitLay[pressureKey])) {
    state.splitLay[pressureKey] = isBladeLine
      ? getBladeDefaultNozzlePressure(selectedBladeModel)
      : "50";
  }

  pressureSelect.value = state.splitLay[pressureKey];

  tipField.hidden = !isSmoothboreLine;
  tipField.style.display = isSmoothboreLine ? "" : "none";

  bladeField.hidden = !isBladeLine;
  bladeField.style.display = isBladeLine ? "" : "none";

  const bladeSelect = document.getElementById(`splitAttack${lineNumber}BladeModel`);
  if (bladeSelect) {
    if (!BLADE_MODELS.some(model => model.id === state.splitLay[bladeKey])) {
      state.splitLay[bladeKey] = "blade160";
    }
    bladeSelect.value = state.splitLay[bladeKey];
  }

  flowField.style.display = usesSolidStreamOptions ? "none" : "";
}

    function syncCoefficientUi() {
      const selectedHose = getSelectedHose();

      els.customCoefficient.disabled = !state.useCustomCoefficient;
      els.coefficientToggle.textContent = state.useCustomCoefficient ? "On" : "Off";
      els.coefficientToggle.classList.toggle("active", state.useCustomCoefficient);
      const activeCoefficient = getActiveHoseCoefficient(selectedHose.id);
const factoryCoefficient = FACTORY_HOSE_COEFFS[selectedHose.id];
const modifiedText = isModifiedHoseCoefficient(selectedHose.id)
  ? ` Modified from factory default C ${factoryCoefficient}.`
  : "";

els.customCoefficient.placeholder = String(activeCoefficient);

els.coefficientHelper.textContent = state.useCustomCoefficient
  ? "Using temporary custom coefficient for this calculation only."
  : getDefaultHoseProfile(selectedHose.id)
    ? `Using default hose reference: ${getDefaultHoseProfile(selectedHose.id).manufacturer} ${getDefaultHoseProfile(selectedHose.id).model}. Calculation coefficient: ${activeCoefficient}.${modifiedText}`
    : `Using hose default coefficient: ${activeCoefficient}.${modifiedText}`;

    }

    // ========================================
    // EVENT HANDLING
    // ========================================
    function showAppView(viewName) {
      const isSettings = viewName === "settings";
      const isTools = viewName === "tools";

      els.calculatorView.hidden = isSettings || isTools;
      els.settingsView.hidden = !isSettings;
      els.toolsView.hidden = !isTools;

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openProModal() {
      if (!els.proModal) {
        alert("Reverse Flow Pro is required for this feature.");
        return;
      }

      els.proModal.hidden = false;
    }

    function getReverseFlowStoreForSupportPage() {
      if (!window.CdvPurchase) {
        alert("In-App Purchases are not available on this device.");
        return null;
      }

      const purchasePlatform = getReverseFlowPurchasePlatform();

      if (!purchasePlatform) {
        alert("Purchases are only available in the mobile app.");
        return null;
      }

      return window.CdvPurchase.store;
    }

    async function purchaseReverseFlowProFromSupportPage() {
      console.info("[Reverse Flow IAP]", {
        event: "support-page-purchase-click",
        ready: reverseFlowProProductReady,
        initialized: reverseFlowProStoreInitialized,
        buttonDisabled: els.buyProButton?.disabled,
        buttonText: els.buyProButton?.textContent
      });

      const store = getReverseFlowStoreForSupportPage();
      if (!store) return;

      if (!reverseFlowProProductReady) {
        console.warn("[Reverse Flow IAP]", {
          event: "support-page-purchase-denied-product-not-ready",
          ready: reverseFlowProProductReady,
          initialized: reverseFlowProStoreInitialized
        });
        alert("Reverse Flow Pro purchase is not available yet. Please try again in a moment.");
        return;
      }

      const purchasePlatform = getReverseFlowPurchasePlatform();

      if (!purchasePlatform) {
        alert("Purchases are only available in the mobile app.");
        return;
      }

      const product = store.get(
        REVERSE_FLOW_PRO_PRODUCT_ID,
        purchasePlatform
      );

      if (!product) {
        console.warn("[Reverse Flow IAP]", {
          event: "support-page-purchase-denied-product-missing",
          productId: REVERSE_FLOW_PRO_PRODUCT_ID
        });
        alert("Reverse Flow Pro is not available yet. Please try again in a moment.");
        return;
      }

      const offer = product.getOffer();

      if (!offer) {
        console.warn("[Reverse Flow IAP]", {
          event: "support-page-purchase-denied-offer-missing",
          rawProduct: product
        });
        alert("Reverse Flow Pro purchase offer is not available yet.");
        return;
      }

      try {
        updateBuyProButtonState("processing", {
          reason: "support page purchase order started"
        });

        const error = await offer.order();

        if (error) {
          console.warn("[Reverse Flow IAP]", {
            event: "support-page-purchase-order-error",
            error
          });
          alert(error.message || "The purchase could not be completed.");
        } else {
          console.info("[Reverse Flow IAP]", {
            event: "support-page-purchase-order-submitted"
          });
        }
      } catch (error) {
        console.error("[Reverse Flow IAP]", {
          event: "support-page-purchase-order-failed",
          error
        });
        alert("The purchase could not be completed.");
      } finally {
        if (!isProUser()) {
          updateBuyProButtonState(
            reverseFlowProProductReady ? "ready" : "unavailable",
            {
              reason: "support page purchase order finished without Pro unlock"
            }
          );
        }
      }
    }

    async function restoreReverseFlowPurchasesFromSupportPage() {
      console.info("[Reverse Flow IAP]", {
        event: "support-page-restore-click",
        ready: reverseFlowProProductReady,
        initialized: reverseFlowProStoreInitialized,
        buttonDisabled: els.restorePurchaseButton?.disabled,
        buttonText: els.restorePurchaseButton?.textContent
      });

      const store = getReverseFlowStoreForSupportPage();
      if (!store) return;

      try {
        reverseFlowRestoreInProgress = true;
        if (els.restorePurchaseButton) {
          els.restorePurchaseButton.disabled = true;
          els.restorePurchaseButton.textContent = "Restoring...";
        }

        await store.restorePurchases();
        console.info("[Reverse Flow IAP]", {
          event: "support-page-restore-request-complete",
          isPro: isProUser()
        });

        setTimeout(() => {
          if (!reverseFlowRestoreInProgress) return;
          reverseFlowRestoreInProgress = false;
          if (els.restorePurchaseButton) {
            els.restorePurchaseButton.disabled = false;
            els.restorePurchaseButton.textContent = "Restore Purchase";
          }

          if (!isProUser()) {
            console.warn("[Reverse Flow IAP]", {
              event: "support-page-restore-complete-no-pro-entitlement",
              reason: "restore did not produce a verified lifetime product receipt"
            });
            alert("No valid Reverse Flow Pro purchase was found to restore.");
          }
        }, 5000);
      } catch (error) {
        reverseFlowRestoreInProgress = false;
        if (els.restorePurchaseButton) {
          els.restorePurchaseButton.disabled = false;
          els.restorePurchaseButton.textContent = "Restore Purchase";
        }
        console.error("[Reverse Flow IAP]", {
          event: "support-page-restore-failed",
          error
        });
        alert("Purchases could not be restored.");
      }
    }

	    function bindSupportPageEvents() {
	      els.hoseLibraryManufacturerFilter?.addEventListener("change", renderHoseLibrary);
      els.hoseLibrarySizeFilter?.addEventListener("change", renderHoseLibrary);
      els.hoseLibraryUseFilter?.addEventListener("change", renderHoseLibrary);
      els.createCustomHoseButton?.addEventListener("click", createCustomHoseProfile);
      els.toolsProUpgradeButton?.addEventListener("click", openProModal);

	      els.resetHoseCoefficientsButton?.addEventListener("click", () => {
        const confirmed = confirm(
          "Reset all hose coefficients back to app defaults?"
        );

        if (!confirmed) return;

        resetSavedHoseCoefficients();
        renderHoseLibrary();
        renderDefaultHoseSelections();
        renderDefaultHoseCoefficients();

        alert("Hose coefficients reset to app defaults.");
      });

      els.closeProModal?.addEventListener("click", () => {
        els.proModal.hidden = true;
      });

      els.proModal?.addEventListener("click", event => {
        if (event.target === els.proModal) {
          els.proModal.hidden = true;
        }
      });

      els.buyProButton?.addEventListener("click", () => {
        console.info("[Reverse Flow IAP]", {
          event: "support-page-buy-click",
          page: els.toolsPage ? "tools" : "settings",
          buttonDisabled: els.buyProButton?.disabled,
          buttonText: els.buyProButton?.textContent
        });
        purchaseReverseFlowProFromSupportPage();
      });

      els.restorePurchaseButton?.addEventListener("click", () => {
        console.info("[Reverse Flow IAP]", {
          event: "support-page-restore-click",
          page: els.toolsPage ? "tools" : "settings",
          buttonDisabled: els.restorePurchaseButton?.disabled,
          buttonText: els.restorePurchaseButton?.textContent
        });
        restoreReverseFlowPurchasesFromSupportPage();
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && els.proModal) {
          els.proModal.hidden = true;
        }
      });
    }

    function bindEvents() {
    if (els.presetSelect) {
  els.presetSelect.addEventListener("change", e => applyPreset(e.target.value));
}
  [els.savePresetButton, els.savePresetButtonSplit].forEach(button => {
    button?.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();

  if (!isProUser()) {
    openProModal();
    return;
  }

  saveCurrentSetupAsPreset();
});
  });
      els.invertApplianceLossButton?.addEventListener("click", () => {

  const current =
    parseFloat(els.applianceLoss.value) || 0;

  const inverted = current * -1;

  els.applianceLoss.value = inverted;

  state.applianceLoss = inverted;

  calculateAndRender();
});
      els.resetButton.addEventListener("click", resetCalculator);
      els.settingsViewButton?.addEventListener("click", () => showAppView("settings"));
      els.toolsViewButton?.addEventListener("click", () => showAppView("tools"));
      els.settingsBackButton?.addEventListener("click", () => showAppView("calculator"));
      els.toolsBackButton?.addEventListener("click", () => showAppView("calculator"));
      els.hoseLibraryManufacturerFilter?.addEventListener("change", renderHoseLibrary);
      els.hoseLibrarySizeFilter?.addEventListener("change", renderHoseLibrary);
      els.hoseLibraryUseFilter?.addEventListener("change", renderHoseLibrary);
      els.createCustomHoseButton?.addEventListener("click", createCustomHoseProfile);
      els.resetHoseCoefficientsButton?.addEventListener("click", () => {

  const confirmed = confirm(
    "Reset all hose coefficients back to app defaults?"
  );

  if (!confirmed) return;

  resetSavedHoseCoefficients();

  state.useCustomCoefficient = false;
  state.customCoefficient = "";
  if (els.customCoefficient) {
    els.customCoefficient.value = "";
  }

  refreshCoefficientDisplays();
  renderHoseLibrary();

  alert("Hose coefficients reset to app defaults.");
});

      els.reverseModeButton.addEventListener("click", () => {
  setMode("reverse");
  resetSplitLayInputs();
  syncSplitLayInputsFromState();
  resetSplitLayResultCard();
});

els.pdpModeButton.addEventListener("click", () => {
  setMode("requiredPdp");
  resetSplitLayInputs();
  syncSplitLayInputsFromState();
  resetSplitLayResultCard();
});

els.apparatusMountedModeButton?.addEventListener("click", () => {
  if (!isProUser()) {
    openProModal();
    return;
  }

  setMode("apparatusMounted");
  resetSplitLayInputs();
  syncSplitLayInputsFromState();
  resetSplitLayResultCard();
});

els.relayModeButton.addEventListener("click", () => {
  if (!isProUser()) {
    openProModal();
    return;
  }

  setMode("relay");
  resetSplitLayInputs();
  syncSplitLayInputsFromState();
  resetSplitLayResultCard();
});

els.relayResidualPressure.addEventListener("change", e => {
  state.relayResidualPressure = e.target.value;
  updateCalculator();
});

els.splitLayButton.addEventListener("click", () => {
  if (!isProUser()) {
    openProModal();
    return;
  }

  resetSplitLayInputs();
  resetSplitLayResultCard();
  setMode("splitLay");
  syncSplitLayInputsFromState();
  resetSplitLayResultCard();

});


els.buyProButton?.addEventListener("click", () => {
  purchaseReverseFlowPro();
});

els.restorePurchaseButton?.addEventListener("click", () => {
  restoreReverseFlowPurchases();
});



function getReverseFlowStore() {
  if (!window.CdvPurchase) {
    alert("In-App Purchases are not available on this device.");
    return null;
  }

  const purchasePlatform = getReverseFlowPurchasePlatform();

  if (!purchasePlatform) {
    alert("Purchases are only available in the mobile app.");
    return null;
  }

  return window.CdvPurchase.store;
}

async function purchaseReverseFlowPro() {
  console.info("[Reverse Flow IAP]", {
    event: "purchase-click",
    ready: reverseFlowProProductReady,
    initialized: reverseFlowProStoreInitialized,
    buttonDisabled: els.buyProButton?.disabled,
    buttonText: els.buyProButton?.textContent
  });

	  const store = getReverseFlowStore();
	  if (!store) return;
	
	  if (!reverseFlowProProductReady) {
	  console.warn("[Reverse Flow IAP]", {
	    event: "purchase-denied-product-not-ready",
	    ready: reverseFlowProProductReady,
	    initialized: reverseFlowProStoreInitialized
	  });
	  alert("Reverse Flow Pro purchase is not available yet. Please try again in a moment.");
	  return;
	}
	
	  const purchasePlatform = getReverseFlowPurchasePlatform();

if (!purchasePlatform) {
  alert("Purchases are only available in the mobile app.");
  return;
}

const product =
  store.get(
    REVERSE_FLOW_PRO_PRODUCT_ID,
    purchasePlatform
  );
	
	  if (!product) {
	    console.warn("[Reverse Flow IAP]", {
	      event: "purchase-denied-product-missing",
	      productId: REVERSE_FLOW_PRO_PRODUCT_ID
	    });
	    alert("Reverse Flow Pro is not available yet. Please try again in a moment.");
	    return;
	  }

  console.info("[Reverse Flow IAP]", {
    event: "purchase-product-found",
    rawProduct: product,
    id: product?.id,
    productId: product?.productId,
    canPurchase: product?.canPurchase,
    owned: product?.owned,
    state: product?.state
  });
	
	  const offer = product.getOffer();
	
	  if (!offer) {
	    console.warn("[Reverse Flow IAP]", {
	      event: "purchase-denied-offer-missing",
	      rawProduct: product
	    });
	    alert("Reverse Flow Pro purchase offer is not available yet.");
	    return;
	  }
	
	  try {
	    updateBuyProButtonState("processing", {
	      reason: "purchase order started"
	    });

	    const error = await offer.order();
	
	    if (error) {
	      console.warn("[Reverse Flow IAP]", {
	        event: "purchase-order-error",
	        error
	      });
	      alert(error.message || "The purchase could not be completed.");
	    } else {
	      console.info("[Reverse Flow IAP]", {
	        event: "purchase-order-submitted"
	      });
	    }
	  } catch (error) {
	    console.error("[Reverse Flow IAP]", {
	      event: "purchase-order-failed",
	      error
	    });
	    alert("The purchase could not be completed.");
	  } finally {
	    if (!isProUser()) {
	      updateBuyProButtonState(
	        reverseFlowProProductReady ? "ready" : "unavailable",
	        {
	          reason: "purchase order finished without Pro unlock"
	        }
	      );
	    }
	  }
	}
	
	async function restoreReverseFlowPurchases() {
  console.info("[Reverse Flow IAP]", {
    event: "restore-click",
    ready: reverseFlowProProductReady,
    initialized: reverseFlowProStoreInitialized,
    buttonDisabled: els.restorePurchaseButton?.disabled,
    buttonText: els.restorePurchaseButton?.textContent
  });

	  const store = getReverseFlowStore();
	  if (!store) return;
	
	  try {
	    reverseFlowRestoreInProgress = true;
	    if (els.restorePurchaseButton) {
	      els.restorePurchaseButton.disabled = true;
	      els.restorePurchaseButton.textContent = "Restoring...";
	    }

	    await store.restorePurchases();
	    console.info("[Reverse Flow IAP]", {
	      event: "restore-request-complete",
	      isPro: isProUser()
	    });

	    setTimeout(() => {
	      if (!reverseFlowRestoreInProgress) return;
	      reverseFlowRestoreInProgress = false;
	      if (els.restorePurchaseButton) {
	        els.restorePurchaseButton.disabled = false;
	        els.restorePurchaseButton.textContent = "Restore Purchase";
	      }

	      if (!isProUser()) {
	        console.warn("[Reverse Flow IAP]", {
	          event: "restore-complete-no-pro-entitlement",
	          reason: "restore did not produce a verified lifetime product receipt"
	        });
	        alert("No valid Reverse Flow Pro purchase was found to restore.");
	      }
	    }, 5000);
	  } catch (error) {
	    reverseFlowRestoreInProgress = false;
	    if (els.restorePurchaseButton) {
	      els.restorePurchaseButton.disabled = false;
	      els.restorePurchaseButton.textContent = "Restore Purchase";
	    }
	    console.error("[Reverse Flow IAP]", {
	      event: "restore-failed",
	      error
	    });
	    alert("Purchases could not be restored.");
	  }
	}

els.closeProModal.addEventListener("click", () => {
  els.proModal.hidden = true;
});
      els.viewPumpChartButton.addEventListener("click", () => {

  if (!isProUser()) {
    openProModal();
    return;
  }

  renderPumpChart();

  els.pumpChartModal.hidden = false;

  els.viewPumpChartButton.classList.add("active");
  els.savePresetButton.classList.remove("active");
});

els.closePumpChartModal.addEventListener("click", () => {

  els.pumpChartModal.hidden = true;

  els.viewPumpChartButton.classList.remove("active");
});

els.pumpChartModal.addEventListener("click", event => {

  if (event.target === els.pumpChartModal) {

    els.pumpChartModal.hidden = true;

    els.viewPumpChartButton.classList.remove("active");
  }
});

els.proModal.addEventListener("click", event => {
  if (event.target === els.proModal) {
    els.proModal.hidden = true;
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    els.proModal.hidden = true;
    els.pumpChartModal.hidden = true;
  }
});

      ["pdp", "hoseLength", "applianceLoss", "reverseSupplyLength", "apparatusElevation", "apparatusCustomFogFlow"].forEach(id => {
        els[id]?.addEventListener("input", e => handleWholeNumberInput(id, e.target));
      });

      els.reverseSupplyHose?.addEventListener("change", e => {
  state.reverseSupplyHoseSize = e.target.value;
  updateCalculator();
});

els.reverseSupplyAppliance?.addEventListener("change", e => {
  state.reverseSupplyAppliance = e.target.value;
  updateCalculator();
});

      els.customCoefficient.addEventListener("input", e => {
  state.customCoefficient = decimalNumber(e.target.value);
  e.target.value = state.customCoefficient;

  syncCoefficientUi();
  updateCalculator();
});

      els.hoseSize.addEventListener("change", e => {
  state.hoseSize = e.target.value;
  clearCustomCoefficient();
  enforceHenTurboAvailability();
  updateCalculator();
});

      els.nozzleType.addEventListener("change", e => {
      state.nozzleType = e.target.value;
      state.customNozzlePressure = "";
      els.customNozzlePressure.value = "";

  if (isRelayMode()) {
    saveState();
    syncModeUi();
    calculateAndRender();
    return;
  }

  state.nozzlePressure = String(
  getNozzlePressures()[state.nozzleType][0]
);

populateSmoothboreTips();
syncCalculatedSmoothboreTargetFlow();
syncSmoothboreUi();
syncModeUi();
renderPressureButtons();
updateCalculator();
});

      els.smoothboreTip.addEventListener("change", e => {
        state.smoothboreTip = e.target.value;
        syncCalculatedSmoothboreTargetFlow();
        syncModeUi();
        renderPressureButtons();
        updateCalculator();
      });

      els.bladeModel.addEventListener("change", e => {
        state.bladeModel = e.target.value;
        syncCalculatedSmoothboreTargetFlow();
        syncModeUi();
        renderPressureButtons();
        updateCalculator();
      });

      els.masterStreamType.addEventListener("change", e => {
  state.masterStreamType = e.target.value;

  state.customNozzlePressure = "";
  els.customNozzlePressure.value = "";

  state.nozzlePressure = String(
    getNozzlePressures()[state.nozzleType][0]
  );

  syncCalculatedSmoothboreTargetFlow();
  syncSmoothboreUi();
  syncModeUi();
  renderPressureButtons();
  updateCalculator();
});

els.dualLineSupplyToggle.addEventListener("change", e => {
  state.dualLineSupply = e.target.checked;
  updateCalculator();
});

els.henTurboToggle?.addEventListener("click", () => {
  if (!isHenTurboAvailable()) {
    state.henTurboEnabled = false;
    updateCalculator();
    return;
  }

  state.henTurboEnabled = !state.henTurboEnabled;
  updateCalculator();
});

els.masterStreamLoss.addEventListener("input", e => {
  state.masterStreamLoss = e.target.value || "25";
  updateCalculator();
});

els.apparatusFogFlow?.addEventListener("change", e => {
  state.apparatusFogFlow = e.target.value;
  if (state.apparatusFogFlow !== "custom") {
    state.apparatusCustomFogFlow = "";
    if (els.apparatusCustomFogFlow) {
      els.apparatusCustomFogFlow.value = "";
    }
  }
  syncSmoothboreUi();
  updateCalculator();
});

      document.querySelectorAll("#splitSectionButtons button").forEach(button => {
  button.addEventListener("click", () => {
    state.splitLay.sectionCount = button.dataset.sections;

   if (state.splitLay.sectionCount === "2") {
  clearSplitSupply2State();
  clearSplitAttack2State();
}

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });
});

els.splitDualSupplyToggle?.addEventListener("change", () => {
  state.splitLay.dualSupply =
    els.splitDualSupplyToggle.checked;

  if (state.splitLay.dualSupply) {
    state.splitLay.appliance1 = "siamese";
  }

  saveState();
  syncSplitLayInputsFromState();
  syncSplitLayUi();
  calculateAndRender();
});

els.reverseSupplyToggle?.addEventListener("click", () => {

  state.reverseSupplyEnabled =
    !state.reverseSupplyEnabled;

  saveState();
  syncReverseSupplyUi();
  calculateAndRender();

});

document.querySelectorAll("#splitAttackLineButtons button").forEach(button => {
  button.addEventListener("click", () => {
    state.splitLay.attackLines = button.dataset.attackLines;

    if (state.splitLay.attackLines === "1") {
      clearSplitAttack2State();
    }

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });
});

[
  ["splitSupplyLength", "supplyLength"],
  ["splitSupplyHose", "supplyHoseSize"],
  ["splitAppliance1", "appliance1"],

  ["splitSupply2Length", "supply2Length"],
  ["splitSupply2Hose", "supply2HoseSize"],
  ["splitAppliance2", "appliance2"],

  ["splitAttack1Length", "attack1Length"],
  ["splitAttack1Hose", "attack1HoseSize"],
  ["splitAttack1NozzleType", "attack1NozzleType"],
  ["splitAttack1NozzlePressure", "attack1NozzlePressure"],
  ["splitAttack1Flow", "attack1Flow"],
  ["splitAttack1SmoothboreTip", "attack1SmoothboreTip"],
  ["splitAttack1BladeModel", "attack1BladeModel"],

  ["splitAttack2Length", "attack2Length"],
  ["splitAttack2Hose", "attack2HoseSize"],
  ["splitAttack2NozzleType", "attack2NozzleType"],
  ["splitAttack2NozzlePressure", "attack2NozzlePressure"],
  ["splitAttack2Flow", "attack2Flow"],
  ["splitAttack2SmoothboreTip", "attack2SmoothboreTip"],
  ["splitAttack2BladeModel", "attack2BladeModel"]
].forEach(([elementId, stateKey]) => {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.addEventListener("input", e => {
    state.splitLay[stateKey] = e.target.tagName === "INPUT"
      ? wholeNumber(e.target.value)
      : e.target.value;

    e.target.value = state.splitLay[stateKey];

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });

  element.addEventListener("change", e => {
    state.splitLay[stateKey] = e.target.value;

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });
});
      els.customNozzlePressure.addEventListener("input", e => {

  state.customNozzlePressure =
    wholeNumber(e.target.value);

  e.target.value =
    state.customNozzlePressure;

  syncCalculatedSmoothboreTargetFlow();

  if (isRequiredPdpMode() && usesSmoothboreHydraulics()) {
    els.pdp.value = state.targetGpm;
  }

  updateCalculator();

});
      
      els.coefficientToggle.addEventListener("click", () => {
        state.useCustomCoefficient = !state.useCustomCoefficient;

        if (!state.useCustomCoefficient) {
          state.customCoefficient = "";
          els.customCoefficient.value = "";
        }

        syncCoefficientUi();
        updateCalculator();
      });
    }

    function handleWholeNumberInput(id, inputElement) {
  if (id === "pdp" && (isRequiredPdpMode() || isRelayMode())) {
    state.targetGpm = wholeNumber(inputElement.value);
    inputElement.value = state.targetGpm;
  } else {
    state[id] = wholeNumber(inputElement.value);
    inputElement.value = state[id];
  }

  updateCalculator();
}

    function updateCalculator() {
      enforceHenTurboAvailability();
      syncHenTurboUi();
      saveState();
      renderPressureButtons();
      calculateAndRender();
    }
    function clearCustomCoefficient() {
  state.useCustomCoefficient = false;
  state.customCoefficient = "";

  if (els.customCoefficient) {
    els.customCoefficient.value = "";
  }

  syncCoefficientUi();
}
    function setMode(mode) {
  const leavingSplitLay =
    state.mode === "splitLay" && mode !== "splitLay";

    const leavingReverseFlow =
  state.mode === "reverse" && mode !== "reverse";

  state.mode = mode;
  state.customNozzlePressure = "";
  clearCustomCoefficient();

  if (leavingSplitLay) {
    state.splitLay = {
      ...DEFAULT_STATE.splitLay
    };

    resetSplitLayResultCard();
  }

  if (leavingReverseFlow) {
  resetReverseSupplyInputs();
}

  // ========================================
  // RELAY MODE DEFAULTS
  // ========================================

  if (mode === "relay") {
    state.pdp = "";
    state.targetGpm = "";
    state.hoseLength = "";
    state.hoseSize = "5";

	    state.nozzleType = "30";
	    state.nozzlePressure = "";
    state.masterStreamType = "fog";
    state.masterStreamLoss = "25";
    state.dualLineSupply = false;
    state.apparatusFogFlow = "1000";
    state.apparatusCustomFogFlow = "";
    state.apparatusElevation = "";

	    state.smoothboreTip = "";
    state.bladeModel = "blade160";

    state.applianceLoss = "0";
    state.henTurboEnabled = false;
  }

  if (mode === "apparatusMounted") {
    state.pdp = "";
    state.targetGpm = "";
    state.hoseLength = "";
    state.hoseSize = "5";

    state.nozzleType = "fog";
    state.masterStreamType = "fog";
    state.masterStreamLoss = "25";
    state.dualLineSupply = false;
    state.apparatusFogFlow = "1000";
    state.apparatusCustomFogFlow = "";
    state.apparatusElevation = "";

    state.nozzlePressure = "50";
    state.smoothboreTip = "";
    state.bladeModel = "blade160";

    state.applianceLoss = "0";
    state.henTurboEnabled = false;
  }

  // ========================================
  // STANDARD CALCULATOR DEFAULTS
  // ========================================

  if (mode === "reverse" || mode === "requiredPdp") {
  state.pdp = "";
  state.targetGpm = "";
  state.hoseLength = "";
  state.hoseSize = "1.88";

  state.nozzleType = "fog";
	  state.masterStreamType = "fog";
	  state.masterStreamLoss = "25";
	  state.dualLineSupply = false;
  state.apparatusFogFlow = "1000";
  state.apparatusCustomFogFlow = "";
  state.apparatusElevation = "";

	  state.nozzlePressure = "55";
  state.smoothboreTip = "";
  state.bladeModel = "blade160";

  state.applianceLoss = "0";
  state.henTurboEnabled = false;
}

  populateHoseOptions();

  saveState();

  syncInputsFromState();
  syncSplitLayInputsFromState();
  syncSmoothboreUi();
  syncModeUi();

  renderPressureButtons();
  calculateAndRender();

  if (leavingSplitLay) {
    resetSplitLayResultCard();
  }
}

function resetCalculator() {
  state = {
    ...DEFAULT_STATE,
    splitLay: {
      ...DEFAULT_STATE.splitLay
    }
  };

  if (els.presetSelect) {
  els.presetSelect.value = "";
  els.presetSelect.selectedIndex = 0;
}

  populateHoseOptions();
  syncInputsFromState();
  resetSplitLayInputs();
  renderPressureButtons();
  saveState();
  calculateAndRender();
}

    // ========================================
    // PRESETS
    // ========================================
    function saveCurrentSetupAsPreset() {
  if (!isProUser()) {
    openProModal();
    return;
  }

  const name = prompt("Enter a name for this setup:");
      if (!name || !name.trim()) return;

      const presets = loadPresets();
      const existingPreset = presets.find(
        preset => preset.name.toLowerCase() === name.trim().toLowerCase()
      );

      if (existingPreset) {
        const overwrite = confirm(`A preset named "${existingPreset.name}" already exists. Overwrite it?`);
        if (!overwrite) return;

        Object.assign(existingPreset, buildPresetData());
        savePresets(presets);
        renderPresetOptions();
        if (els.presetSelect) {
  els.presetSelect.value = existingPreset.id;
}
        alert(`Updated preset: ${existingPreset.name}`);
        return;
      }

      const newPreset = {
        id: `preset-${Date.now()}`,
        name: name.trim(),
        ...buildPresetData(),
      };

      presets.push(newPreset);
      savePresets(presets);
      renderPresetOptions();
      if (els.presetSelect) {
  els.presetSelect.value = newPreset.id;
}
      alert(`Saved setup: ${newPreset.name}`);
    }

    function buildPresetData() {
  const isSplit = isSplitLayMode();

  return {
    mode: state.mode || "",

    pdp: state.pdp || "",
    targetGpm: state.targetGpm || "",

    hoseLength: state.hoseLength || "",
    hoseSize: state.hoseSize || "",
    nozzleType: state.nozzleType || "",
    nozzlePressure: state.nozzlePressure || "",
    smoothboreTip: state.smoothboreTip || "",
    bladeModel: state.bladeModel || "blade160",

    applianceLoss: state.applianceLoss || "0",
    henTurboEnabled:
      !!state.henTurboEnabled &&
      (isReverseMode() || isRequiredPdpMode()) &&
      !!getHenTurboCurveForHose(state.hoseSize),

    reverseSupplyEnabled:
  state.reverseSupplyEnabled || false,

    reverseSupplyLength:
      state.reverseSupplyLength || "",

    reverseSupplyHoseSize:
      state.reverseSupplyHoseSize || "3",

    reverseSupplyAppliance:
      state.reverseSupplyAppliance || "gateValve",

    useCustomCoefficient:
      state.useCustomCoefficient || false,

    customCoefficient:
      state.customCoefficient || "",

    calculatedPdp:
  isSplit
    ? els.splitPrimaryPdp.textContent.replace(" PSI", "")
    : isReverseMode()
      ? state.pdp || ""
      : isRequiredPdpMode() || isRelayMode()
        ? els.roundedGpm.textContent
        : "",

    calculatedFlow:
      isSplit
        ? "Split Lay"
        : isReverseMode()
          ? `${els.roundedGpm.textContent} GPM`
          : els.calculatedGpm.textContent,

    splitLay: JSON.parse(JSON.stringify(state.splitLay))
  };
}

    function syncSplitLayInputsFromState() {
  [
    ["splitSupplyLength", state.splitLay.supplyLength || ""],
    ["splitSupplyHose", state.splitLay.supplyHoseSize || "3"],
    ["splitAppliance1", state.splitLay.appliance1 || "gatedWye"],

    ["splitSupply2Length", state.splitLay.supply2Length || ""],
    ["splitSupply2Hose", state.splitLay.supply2HoseSize || "1.88"],
    ["splitAppliance2", state.splitLay.appliance2 || "gateValve"],

    ["splitAttack1Length", state.splitLay.attack1Length || ""],
    ["splitAttack1Hose", state.splitLay.attack1HoseSize || "1.75"],
    ["splitAttack1NozzleType", state.splitLay.attack1NozzleType || "fog"],
    ["splitAttack1NozzlePressure", state.splitLay.attack1NozzlePressure || "50"],
    ["splitAttack1Flow", state.splitLay.attack1Flow || ""],
    ["splitAttack1SmoothboreTip", state.splitLay.attack1SmoothboreTip || ""],
    ["splitAttack1BladeModel", state.splitLay.attack1BladeModel || "blade160"],

    ["splitAttack2Length", state.splitLay.attack2Length || ""],
    ["splitAttack2Hose", state.splitLay.attack2HoseSize || "1.75"],
    ["splitAttack2NozzleType", state.splitLay.attack2NozzleType || "fog"],
    ["splitAttack2NozzlePressure", state.splitLay.attack2NozzlePressure || "50"],
    ["splitAttack2Flow", state.splitLay.attack2Flow || ""],
    ["splitAttack2SmoothboreTip", state.splitLay.attack2SmoothboreTip || ""],
    ["splitAttack2BladeModel", state.splitLay.attack2BladeModel || "blade160"]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });

  const splitAppliance1 = document.getElementById("splitAppliance1");

if (splitAppliance1) {
  splitAppliance1.disabled = !!state.splitLay.dualSupply;
}

  if (els.splitDualSupplyToggle) {
    els.splitDualSupplyToggle.checked = !!state.splitLay.dualSupply;
  }
}
    
function applyPreset(presetId) {
  if (!presetId) return;

  const presets = loadPresets();
  const preset = presets.find(item => item.id === presetId);
  if (!preset) return;

  const isSplitPreset = preset.mode === "splitLay";

  state = {
    ...state,

   mode: preset.mode || state.mode,

    pdp: preset.pdp || "",
    targetGpm:
  preset.targetGpm ||
  preset.targetFlow ||
  "",

    hoseLength: preset.hoseLength || "",
    hoseSize: preset.hoseSize || state.hoseSize,
    nozzleType: preset.nozzleType || state.nozzleType,
    nozzlePressure: preset.nozzlePressure || state.nozzlePressure,

    smoothboreTip:
      preset.smoothboreTip || "",

    bladeModel:
      preset.bladeModel || "blade160",

    applianceLoss:
      preset.applianceLoss || "0",

    henTurboEnabled:
      !!preset.henTurboEnabled &&
      (preset.mode === "reverse" || preset.mode === "requiredPdp") &&
      !!getHenTurboCurveForHose(preset.hoseSize || state.hoseSize),

    reverseSupplyEnabled:
      preset.reverseSupplyEnabled || false,

    reverseSupplyLength:
      preset.reverseSupplyLength || "",

    reverseSupplyHoseSize:
      preset.reverseSupplyHoseSize || "3",

    reverseSupplyAppliance:
      preset.reverseSupplyAppliance || "gateValve",

    useCustomCoefficient:
      preset.useCustomCoefficient || false,

    customCoefficient:
      preset.customCoefficient || "",

    splitLay: {
      ...DEFAULT_STATE.splitLay,
      ...(preset.splitLay || {})
    }
  };

  populateHoseOptions();
  enforceHenTurboAvailability();
  syncInputsFromState();
  syncSplitLayInputsFromState();
  syncReverseSupplyUi();
  syncSmoothboreUi();
  syncModeUi();
  renderPressureButtons();
  calculateAndRender();
  saveState();
}

window.loadPumpChartPreset = function(presetId) {

  applyPreset(presetId);

  els.viewPumpChartButton.classList.remove("active");
  els.pumpChartModal.hidden = true;
};

window.deletePumpChartPreset = function(presetId) {

  const presets = loadPresets();

  const preset = presets.find(
    item => item.id === presetId
  );

  if (!preset) return;

  const confirmed = confirm(
    `Delete "${preset.name}" from Pump Chart?`
  );

  if (!confirmed) return;

  const updatedPresets =
    presets.filter(item => item.id !== presetId);

  savePresets(updatedPresets);

  renderPresetOptions();
  renderPumpChart();

  if (els.presetSelect.value === presetId) {
    els.presetSelect.value = "";
  }
};

    function deleteSelectedPreset() {
      const selectedId = els.presetSelect.value;

      if (!selectedId) {
        alert("No preset selected.");
        return;
      }

      const presets = loadPresets();
      const preset = presets.find(item => item.id === selectedId);
      if (!preset) return;

      const confirmed = confirm(`Delete preset "${preset.name}"?`);
      if (!confirmed) return;

      const updatedPresets = presets.filter(item => item.id !== selectedId);
      savePresets(updatedPresets);
      renderPresetOptions();
      els.presetSelect.value = "";
      alert(`Deleted preset: ${preset.name}`);
    }

    // ========================================
    // CALCULATION ORCHESTRATION
    // ========================================
    function calculateAndRender() {
      const inputs = getCalculationInputs();
      const warnings = [];

      setResult("—", "—", "—", "—", getNozzleDisplay(), getSetupDisplay());
      resetSplitResults();

      
      
      if (isSplitLayMode()) {
  calculateSplitLay(warnings);
  return;
}

if (isRelayMode()) {
  calculateRelayPdp({ ...inputs, warnings });
  return;
}

if (isApparatusMountedMode()) {
  calculateApparatusMounted({ ...inputs, warnings });
  return;
}

if (isRequiredPdpMode()) {
  calculateRequiredPdp({ ...inputs, warnings });
  return;
}

calculateReverseFlow({ ...inputs, warnings });
    }

    function addFiftyFeet(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const currentValue = Number(input.value) || 0;
  input.value = currentValue + 50;

  input.dispatchEvent(new Event("input", { bubbles: true }));
}

    function getCalculationInputs() {
      const selectedHose = getSelectedHose();
      const coefficient = state.useCustomCoefficient
        ? numberOrNull(state.customCoefficient)
        : getActiveHoseCoefficient(selectedHose.id);

      let nozzlePressure =
  state.nozzlePressure === "custom"
    ? numberOrNull(state.customNozzlePressure)
    : numberOrNull(state.nozzlePressure);

      if (isReverseSmoothbore()) {
        nozzlePressure = calculateAchievableSmoothborePressure();
      }

      syncCalculatedSmoothboreTargetFlow();

      const masterStreamLoss =
      (isMasterStream() || isApparatusMountedMode())
    ? numberOrNull(state.masterStreamLoss) ?? 25
    : 0;

      return {
        selectedHose,
        coefficient,
        pdp: numberOrNull(state.pdp),
        targetGpm: numberOrNull(getTargetFlowValue()),
        hoseLength: numberOrNull(state.hoseLength),
        nozzlePressure,
        applianceLoss: numberOrNull(state.applianceLoss) ?? 0,
        masterStreamLoss,
      };
    }

    // ========================================
    // REVERSE FLOW CALCULATIONS
    // ========================================
    function solveReverseFogWithTurbo({
      pdp,
      nozzlePressure,
      applianceLoss,
      masterStreamLoss,
      supplyApplianceLoss,
      totalFrictionLoad,
      hoseLength,
      curve
    }) {
      const frictionFactor = totalFrictionLoad / 10000;

      for (const segment of getHenTurboSegments(curve)) {
        const a = frictionFactor;
        const b = segment.a;
        const c =
          nozzlePressure +
          applianceLoss +
          masterStreamLoss +
          supplyApplianceLoss +
          segment.b -
          pdp;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) continue;

        const roots = [
          (-b + Math.sqrt(discriminant)) / (2 * a),
          (-b - Math.sqrt(discriminant)) / (2 * a)
        ];

        const calculatedGpm = roots.find(root =>
          root > 0 &&
          root >= segment.minGpm &&
          root <= segment.maxGpm
        );

        if (!calculatedGpm) continue;

        const turboLoss =
          segment.a * calculatedGpm + segment.b;
        const totalFrictionLoss =
          totalFrictionLoad * Math.pow(calculatedGpm / 100, 2);

        return {
          totalFrictionLoss,
          frictionLossPer100:
            totalFrictionLoss / (hoseLength / 100),
          calculatedGpm,
          turboLoss
        };
      }

      return null;
    }

    function solveReverseSmoothborePressure({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient,
      supplyApplianceLoss = 0
    }) {
      const model = getSelectedHydraulicSmoothboreModel();

      if (
        pdp === null ||
        hoseLength === null ||
        coefficient === null ||
        !model ||
        hoseLength <= 0 ||
        coefficient <= 0
      ) {
        return null;
      }

      const reverseSupplyEnabled =
        !!state.reverseSupplyEnabled;

      const supplyLength =
        reverseSupplyEnabled
          ? numberOrNull(state.reverseSupplyLength)
          : 0;

      const supplyHose =
        reverseSupplyEnabled
          ? HOSE_OPTIONS.find(hose =>
              hose.id === state.reverseSupplyHoseSize
            )
          : null;

      if (
        reverseSupplyEnabled &&
        (supplyLength === null || supplyLength <= 0 || !supplyHose)
      ) {
        return null;
      }

      const attackLoad =
        coefficient * (hoseLength / 100);

      const supplyLoad =
        reverseSupplyEnabled && supplyHose
          ? getActiveHoseCoefficient(supplyHose.id) *
            (supplyLength / 100)
          : 0;

      const totalLoad =
        attackLoad + supplyLoad;

      if (totalLoad <= 0) return null;

      const flowConstant =
        29.7 * model.diameter * model.diameter;
      const turboCurve = getActiveHenTurboCurve();

      if (!turboCurve) {
        const frictionMultiplier =
          Math.pow(flowConstant / 100, 2) *
          totalLoad;
        const achievablePressure =
          (pdp - applianceLoss - masterStreamLoss - supplyApplianceLoss) /
          (1 + frictionMultiplier);

        if (achievablePressure <= 0) {
          return {
            nozzlePressure: 0,
            calculatedGpm: 0,
            turboLoss: 0
          };
        }

        return {
          nozzlePressure: achievablePressure,
          calculatedGpm:
            flowConstant * Math.sqrt(achievablePressure),
          turboLoss: 0
        };
      }

      for (const segment of getHenTurboSegments(turboCurve)) {
        const quadraticA =
          1 +
          totalLoad *
          Math.pow(flowConstant / 100, 2);
        const quadraticB =
          segment.a * flowConstant;
        const quadraticC =
          applianceLoss +
          masterStreamLoss +
          supplyApplianceLoss +
          segment.b -
          pdp;
        const discriminant =
          quadraticB * quadraticB -
          4 * quadraticA * quadraticC;

        if (discriminant < 0) continue;

        const roots = [
          (-quadraticB + Math.sqrt(discriminant)) /
            (2 * quadraticA),
          (-quadraticB - Math.sqrt(discriminant)) /
            (2 * quadraticA)
        ];

        const root = roots.find(item => {
          const calculatedGpm = flowConstant * item;
          return item > 0 &&
            calculatedGpm >= segment.minGpm &&
            calculatedGpm <= segment.maxGpm;
        });

        if (!root) continue;

        const calculatedGpm = flowConstant * root;

        return {
          nozzlePressure: root * root,
          calculatedGpm,
          turboLoss:
            segment.a * calculatedGpm + segment.b
        };
      }

      return null;
    }

    function getReverseSmoothboreTurboRangeWarning({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient
    }) {
      const curve = getActiveHenTurboCurve();
      const range = getHenTurboPublishedRange(curve);
      const model = getSelectedHydraulicSmoothboreModel();

      if (
        !curve ||
        !range ||
        hoseLength === null ||
        coefficient === null ||
        !model ||
        hoseLength <= 0 ||
        coefficient <= 0
      ) {
        return HEN_TURBO_OUT_OF_RANGE_WARNING;
      }

      if (pdp === null) {
        return getHenTurboOutOfRangeWarning(0, curve);
      }

      const supplyLength = state.reverseSupplyEnabled
        ? numberOrNull(state.reverseSupplyLength)
        : 0;
      const supplyHose = state.reverseSupplyEnabled
        ? HOSE_OPTIONS.find(hose =>
            hose.id === state.reverseSupplyHoseSize
          )
        : null;

      if (
        state.reverseSupplyEnabled &&
        (supplyLength === null || supplyLength <= 0 || !supplyHose)
      ) {
        return HEN_TURBO_OUT_OF_RANGE_WARNING;
      }

      const attackLoad =
        coefficient * (hoseLength / 100);
      const supplyLoad =
        state.reverseSupplyEnabled && supplyHose
          ? getActiveHoseCoefficient(supplyHose.id) *
            (supplyLength / 100)
          : 0;
      const totalLoad = attackLoad + supplyLoad;
      const flowConstant =
        29.7 * model.diameter * model.diameter;

      if (totalLoad <= 0 || flowConstant <= 0) {
        return getHenTurboOutOfRangeWarning(0, curve);
      }

      function estimateFlowWithFixedTurboLoss(turboLoss = 0) {
        const availablePressure =
          pdp - applianceLoss - masterStreamLoss - turboLoss;
        const frictionMultiplier =
          totalLoad * Math.pow(flowConstant / 100, 2);
        const achievablePressure =
          availablePressure / (1 + frictionMultiplier);

        if (achievablePressure <= 0) return 0;

        return flowConstant * Math.sqrt(achievablePressure);
      }

      function requiredPdpAtGpm(gpm) {
        const nozzlePressureAtFlow =
          Math.pow(gpm / flowConstant, 2);
        const hoseFrictionLoss =
          totalLoad * Math.pow(gpm / 100, 2);
        const turboLoss =
          getHenTurboLossForGpm(gpm, curve);
        const supplyApplianceLoss =
          state.reverseSupplyEnabled && gpm > 350 ? 10 : 0;

        if (turboLoss === null) return null;

        return nozzlePressureAtFlow +
          hoseFrictionLoss +
          applianceLoss +
          masterStreamLoss +
          supplyApplianceLoss +
          turboLoss;
      }

      const minimumRangePdp = requiredPdpAtGpm(range.min);
      const maximumRangePdp = requiredPdpAtGpm(range.max);

      if (minimumRangePdp !== null && pdp < minimumRangePdp) {
        return getHenTurboOutOfRangeWarning(
          estimateFlowWithFixedTurboLoss(getHenTurboLossForGpm(range.min, curve)),
          curve
        );
      }

      if (maximumRangePdp !== null && pdp > maximumRangePdp) {
        return getHenTurboOutOfRangeWarning(
          estimateFlowWithFixedTurboLoss(getHenTurboLossForGpm(range.max, curve)),
          curve
        );
      }

      return getHenTurboOutOfRangeWarning(
        estimateFlowWithFixedTurboLoss(),
        curve
      );
    }

    function calculateReverseFlow({ pdp, hoseLength, nozzlePressure, applianceLoss, masterStreamLoss, coefficient, selectedHose, warnings }) {      if (pdp === null || hoseLength === null || nozzlePressure === null || coefficient === null) {
        if (
          state.henTurboEnabled &&
          isReverseSmoothbore() &&
          pdp !== null &&
          hoseLength !== null &&
          coefficient !== null
        ) {
          warnings.push(
            getReverseSmoothboreTurboRangeWarning({
              pdp,
              hoseLength,
              applianceLoss,
              masterStreamLoss,
              coefficient
            })
          );
          renderCalculationUnavailable(warnings);
          return;
        }

        renderWarnings(warnings);
        return;
      }

      if (!validateCommonInputs({ hoseLength, coefficient, warnings })) return;

      if (pdp <= nozzlePressure + applianceLoss + masterStreamLoss) {

  warnings.push(
  isMasterStream()
    ? "PDP must exceed nozzle pressure, master stream device loss, and appliance/elevation loss."
    : "PDP must exceed nozzle pressure and appliance/elevation loss."
);

  setResult(
    "—",
    "—",
    "—",
    "—",
    getNozzleDisplay(),
    getSetupDisplay(),
    "—"
  );

  renderWarnings(warnings);

  return;
}

const reverseSupplyEnabled =
  !!state.reverseSupplyEnabled;

const supplyLength =
  reverseSupplyEnabled
    ? numberOrNull(state.reverseSupplyLength)
    : 0;

const supplyHose =
  reverseSupplyEnabled
    ? HOSE_OPTIONS.find(hose =>
        hose.id === state.reverseSupplyHoseSize
      )
    : null;

if (reverseSupplyEnabled) {
  if (supplyLength === null || supplyLength <= 0 || !supplyHose) {
    warnings.push("Enter a valid Reverse Flow supply section length and hose size.");
    renderWarnings(warnings);
    return;
  }
}

const attackLoad =
  coefficient * (hoseLength / 100);

const supplyLoad =
  reverseSupplyEnabled && supplyHose
    ? getActiveHoseCoefficient(supplyHose.id) * (supplyLength / 100)
    : 0;

const totalFrictionLoad =
  attackLoad + supplyLoad;

function solveReverseFlowGpm(supplyApplianceLoss) {
  const turboCurve = getActiveHenTurboCurve();

  if (turboCurve && !usesSmoothboreHydraulics()) {
    const turboSolve = solveReverseFogWithTurbo({
      pdp,
      nozzlePressure,
      applianceLoss,
      masterStreamLoss,
      supplyApplianceLoss,
      totalFrictionLoad,
      hoseLength,
      curve: turboCurve
    });

    if (turboSolve) return turboSolve;

    const availablePressure =
      pdp -
      nozzlePressure -
      applianceLoss -
      masterStreamLoss -
      supplyApplianceLoss;
    const estimatedGpm =
      availablePressure > 0 && totalFrictionLoad > 0
        ? Math.sqrt(availablePressure / totalFrictionLoad) * 100
        : null;
    const turboRange = getHenTurboPublishedRange(turboCurve);
    const minimumTurboLoss = turboRange
      ? getHenTurboLossForGpm(turboRange.min, turboCurve)
      : null;
    const maximumTurboLoss = turboRange
      ? getHenTurboLossForGpm(turboRange.max, turboCurve)
      : null;
    const estimateFlowWithFixedTurboLoss = turboLoss => {
      const pressureForFlow = availablePressure - (turboLoss || 0);
      return pressureForFlow > 0 && totalFrictionLoad > 0
        ? Math.sqrt(pressureForFlow / totalFrictionLoad) * 100
        : 0;
    };
    const minimumRangePdp =
      turboRange && minimumTurboLoss !== null
        ? nozzlePressure +
          applianceLoss +
          masterStreamLoss +
          supplyApplianceLoss +
          totalFrictionLoad * Math.pow(turboRange.min / 100, 2) +
          minimumTurboLoss
        : null;
    const maximumRangePdp =
      turboRange && maximumTurboLoss !== null
        ? nozzlePressure +
          applianceLoss +
          masterStreamLoss +
          supplyApplianceLoss +
          totalFrictionLoad * Math.pow(turboRange.max / 100, 2) +
          maximumTurboLoss
        : null;
    let outOfRangeWarning =
      getHenTurboOutOfRangeWarning(estimatedGpm, turboCurve);

    if (availablePressure <= 0) {
      outOfRangeWarning =
        getHenTurboOutOfRangeWarning(0, turboCurve);
    } else if (minimumRangePdp !== null && pdp < minimumRangePdp) {
      outOfRangeWarning =
        getHenTurboOutOfRangeWarning(
          estimateFlowWithFixedTurboLoss(minimumTurboLoss),
          turboCurve
        );
    } else if (maximumRangePdp !== null && pdp > maximumRangePdp) {
      outOfRangeWarning =
        getHenTurboOutOfRangeWarning(
          estimateFlowWithFixedTurboLoss(maximumTurboLoss),
          turboCurve
        );
    }

    return {
      totalFrictionLoss: null,
      frictionLossPer100: null,
      calculatedGpm: null,
      turboLoss: null,
      outOfRangeWarning
    };
  }

  const smoothboreFlow =
    usesSmoothboreHydraulics()
      ? smoothboreGpm(
          getSelectedHydraulicSmoothboreModel().diameter,
          nozzlePressure
        )
      : null;

  const turboLoss =
    turboCurve && smoothboreFlow !== null
      ? getHenTurboLossForGpm(smoothboreFlow, turboCurve)
      : 0;

  if (turboCurve && turboLoss === null) {
    return {
      totalFrictionLoss: null,
      frictionLossPer100: null,
      calculatedGpm: null,
      turboLoss: null,
      outOfRangeWarning:
        getHenTurboOutOfRangeWarning(smoothboreFlow, turboCurve)
    };
  }

  const totalFrictionLoss =
    pdp -
    nozzlePressure -
    applianceLoss -
    masterStreamLoss -
    supplyApplianceLoss -
    turboLoss;

  if (totalFrictionLoss <= 0 || totalFrictionLoad <= 0) {
    return {
      totalFrictionLoss,
      frictionLossPer100: null,
      calculatedGpm: null,
      turboLoss
    };
  }

  const calculatedGpm =
    usesSmoothboreHydraulics()
      ? smoothboreFlow
      : Math.sqrt(totalFrictionLoss / totalFrictionLoad) * 100;

  return {
    totalFrictionLoss,
    frictionLossPer100:
      totalFrictionLoss / (hoseLength / 100),
    calculatedGpm,
    turboLoss
  };
}

let supplyApplianceLoss = 0;
let reverseSolve = solveReverseFlowGpm(supplyApplianceLoss);

if (
  reverseSupplyEnabled &&
  reverseSolve !== null &&
  reverseSolve.calculatedGpm !== null &&
  reverseSolve.calculatedGpm > 350
) {
  supplyApplianceLoss = 10;
  reverseSolve = solveReverseFlowGpm(supplyApplianceLoss);
}

if (
  reverseSolve.calculatedGpm === null ||
  (
    reverseSolve.totalFrictionLoss !== null &&
    reverseSolve.totalFrictionLoss < 0
  )
) {
  warnings.push(
    reverseSolve.outOfRangeWarning
      ? reverseSolve.outOfRangeWarning
      : "Total friction loss is negative after subtracting nozzle pressure, appliance/elevation loss, master stream loss, and supply appliance loss."
  );

  setResult(
    "—",
    "—",
    reverseSolve.totalFrictionLoss === null
      ? "—"
      : `${Math.round(reverseSolve.totalFrictionLoss)} psi`,
    "—",
    getNozzleDisplay(),
    getSetupDisplay(),
    "—"
  );

  renderWarnings(warnings);
  return;
}

const totalFrictionLoss =
  reverseSolve.totalFrictionLoss;

const frictionLossPer100 =
  reverseSolve.frictionLossPer100;

const calculatedGpm =
  reverseSolve.calculatedGpm;

const roundedGpm =
  roundToNearestFive(calculatedGpm);

const nozzleReaction =
  calculateNozzleReaction(calculatedGpm, nozzlePressure);

if (roundedGpm > selectedHose.maxReferenceFlow) {
  warnings.push(`Rounded flow is above the normal reference range for ${selectedHose.chartName} hose. Confirm with department-approved flow testing or local operating guidance.`);
}

if (reverseSupplyEnabled && supplyApplianceLoss > 0) {
  warnings.push("Estimated supply appliance loss applied: 10 psi at flows >350 GPM.");
}

const attackFrictionLoss =
  coefficient *
  Math.pow(calculatedGpm / 100, 2) *
  (hoseLength / 100);

const supplyFrictionLoss =
  reverseSupplyEnabled && supplyHose
    ? getActiveHoseCoefficient(supplyHose.id) *
      Math.pow(calculatedGpm / 100, 2) *
      (supplyLength / 100)
    : 0;

const frictionDisplay =
  reverseSupplyEnabled
    ? `A ${attackFrictionLoss.toFixed(1)} / S ${supplyFrictionLoss.toFixed(1)}`
    : `${frictionLossPer100.toFixed(1)} psi`;

setResult(
  roundedGpm,
  `${Math.round(calculatedGpm)} GPM`,
  `${totalFrictionLoss.toFixed(1)} psi`,
  frictionDisplay,
  getNozzleDisplay(),
  getSetupDisplay(),
  nozzleReaction,
  reverseSolve.turboLoss,
  calculatedGpm
);

renderWarnings(warnings);

    }

    function calculateAchievableSmoothborePressure() {
  if (!isReverseSmoothbore()) return null;

  const pdp = numberOrNull(state.pdp);
  const hoseLength = numberOrNull(state.hoseLength);
  const applianceLoss = numberOrNull(state.applianceLoss) ?? 0;

  const masterStreamLoss =
    isMasterStream()
      ? numberOrNull(state.masterStreamLoss) ?? 25
      : 0;

  const selectedHose = getSelectedHose();

  const coefficient = state.useCustomCoefficient
    ? numberOrNull(state.customCoefficient)
    : getActiveHoseCoefficient(selectedHose.id);

  let supplyApplianceLoss = 0;
  let solve = solveReverseSmoothborePressure({
    pdp,
    hoseLength,
    applianceLoss,
    masterStreamLoss,
    coefficient,
    supplyApplianceLoss
  });

  if (solve && state.reverseSupplyEnabled && solve.calculatedGpm > 350) {
    supplyApplianceLoss = 10;
    solve = solveReverseSmoothborePressure({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient,
      supplyApplianceLoss
    });
  }

  if (!solve) return null;

  return Math.max(0, Math.floor(solve.nozzlePressure));
}

    // ========================================
    // REQUIRED PDP CALCULATIONS
    // ========================================
    function calculateRequiredPdp({ targetGpm, hoseLength, nozzlePressure, applianceLoss, masterStreamLoss, coefficient, selectedHose, warnings }) {
      if (targetGpm === null || hoseLength === null || nozzlePressure === null || coefficient === null) {
        renderWarnings(warnings);
        return;
      }

      if (!validateCommonInputs({ hoseLength, coefficient, warnings })) return;

      if (targetGpm <= 0) {
        warnings.push("Target flow must be greater than 0 GPM.");
        renderWarnings(warnings);
        return;
      }

      const flowForFriction =
      isRequiredPdpMode() &&
      isMasterStream() &&
      state.dualLineSupply
        ? targetGpm / 2
        : targetGpm;

      const q = flowForFriction / 100;
      const lengthHundreds = hoseLength / 100;
      const frictionLossPer100 = coefficient * q * q;
      const totalFrictionLoss = frictionLossPer100 * lengthHundreds;
      const turboCurve = getActiveHenTurboCurve();
      const henTurboLoss = turboCurve
        ? getHenTurboLossForGpm(targetGpm, turboCurve)
        : 0;

      if (turboCurve && henTurboLoss === null) {
        warnings.push(
          getHenTurboOutOfRangeWarning(targetGpm, turboCurve)
        );
        renderCalculationUnavailable(warnings);
        return;
      }

      const requiredPdp =
        nozzlePressure +
        totalFrictionLoss +
        applianceLoss +
        masterStreamLoss +
        henTurboLoss;      const roundedRequiredPdp = Math.round(requiredPdp);
      const nozzleReaction = calculateNozzleReaction(targetGpm, nozzlePressure);

      const warningFlow =
  state.dualLineSupply && isMasterStream()
    ? flowForFriction
    : targetGpm;

if (warningFlow > selectedHose.maxReferenceFlow) {
  warnings.push(
    state.dualLineSupply && isMasterStream()
      ? `Per-line flow is above the normal reference range for ${selectedHose.chartName} hose. Confirm with department-approved flow testing or local operating guidance.`
      : `Target flow is above the normal reference range for ${selectedHose.chartName} hose. Confirm with department-approved flow testing or local operating guidance.`
  );
}

      setResult(
  roundedRequiredPdp,
  `${Math.round(targetGpm)} GPM`,
  `${totalFrictionLoss.toFixed(1)} psi`,
  `${frictionLossPer100.toFixed(1)} psi`,
  getNozzleDisplay(),
  getSetupDisplay(),
  isBlade()
    ? nozzleReaction
    : state.dualLineSupply && isMasterStream()
    ? `Dual lines: YES
Per line: ${Math.round(flowForFriction)} GPM`
    : "Dual lines: NO",
  henTurboLoss,
  targetGpm
);

      renderWarnings(warnings);
    }

function getApparatusRatedFlow() {
  if (state.nozzleType === "smoothbore") {
    const tip = getSelectedHydraulicSmoothboreModel();
    const nozzlePressure =
      state.nozzlePressure === "custom"
        ? numberOrNull(state.customNozzlePressure)
        : numberOrNull(state.nozzlePressure);

    if (!tip || nozzlePressure === null) return null;

    return smoothboreGpm(tip.diameter, nozzlePressure);
  }

  return state.apparatusFogFlow === "custom"
    ? numberOrNull(state.apparatusCustomFogFlow)
    : numberOrNull(state.apparatusFogFlow);
}

function calculateApparatusMounted({ nozzlePressure, masterStreamLoss, warnings }) {
  if (nozzlePressure === null) {
    renderWarnings(warnings);
    return;
  }

  const flow = getApparatusRatedFlow();
  const elevationFeet = numberOrNull(state.apparatusElevation) ?? 0;
  const applianceLoss = masterStreamLoss ?? 25;

  if (flow === null || flow <= 0) {
    warnings.push("Enter a valid rated flow greater than 0 GPM.");
    renderWarnings(warnings);
    return;
  }

  if (elevationFeet < 0) {
    warnings.push("Elevation above pump must be 0 feet or greater.");
    renderWarnings(warnings);
    return;
  }

  if (applianceLoss < 0) {
    warnings.push("Master stream / appliance loss must be 0 psi or greater.");
    renderWarnings(warnings);
    return;
  }

  const elevationLoss = elevationFeet * 0.434;
  const requiredPdp =
    nozzlePressure +
    elevationLoss +
    applianceLoss;
  const nozzleReaction =
    calculateNozzleReaction(flow, nozzlePressure);

  setResult(
    Math.round(requiredPdp),
    `${Math.round(flow)} GPM`,
    `${Math.round(nozzlePressure)} psi`,
    `${elevationLoss.toFixed(1)} psi`,
    `${Math.round(applianceLoss)} psi`,
    getNozzleDisplay(),
    nozzleReaction,
    null,
    null
  );

  renderWarnings(warnings);
}
      // ========================================
// RELAY PDP CALCULATIONS
// ========================================

function calculateRelayPdp({
  targetGpm,
  hoseLength,
  applianceLoss,
  coefficient,
  selectedHose,
  warnings
}) {

  const residualPressure =
  Number(state.relayResidualPressure || 30);

  if (
    targetGpm === null ||
    hoseLength === null ||
    coefficient === null
  ) {
    renderWarnings(warnings);
    return;
  }

  if (!validateCommonInputs({ hoseLength, coefficient, warnings })) {
    return;
  }

  if (targetGpm <= 0) {
    warnings.push("Target flow must be greater than 0 GPM.");
    renderWarnings(warnings);
    return;
  }

  const q = targetGpm / 100;
  const lengthHundreds = hoseLength / 100;

  const frictionLossPer100 = coefficient * q * q;

  const totalFrictionLoss = frictionLossPer100 * lengthHundreds;

  const requiredRelayPdp =
    totalFrictionLoss +
    residualPressure +
    applianceLoss;

  if (targetGpm > selectedHose.maxReferenceFlow) {
    warnings.push(
  `Target flow is above the normal reference range for ${selectedHose.chartName} hose. Confirm with department-approved flow testing or local operating guidance.`
);
  }

  if (requiredRelayPdp > 400) {
  warnings.push(
    "Calculated relay PDP exceeds 400 psi. This is beyond normal apparatus operating limits. Reduce flow, shorten the lay, add relay pumpers, or increase hose diameter."
  );
} else if (requiredRelayPdp > 300) {
  warnings.push(
    "Calculated relay PDP exceeds 300 psi. Confirm apparatus, hose, and department operating limits before using this setup."
  );
}

  setResult(
  Math.round(requiredRelayPdp),
  `${Math.round(targetGpm)} GPM`,
  `${totalFrictionLoss.toFixed(1)} psi`,
  `${frictionLossPer100.toFixed(1)} psi`,
  `${residualPressure} psi residual`,
  `${hoseLength}' Relay Distance`,
  "—"
);

  renderWarnings(warnings);
}
    // ========================================
// SPLIT LAY CALCULATIONS
// ========================================

function calculateSplitLay(warnings) {

  const sectionCount = state.splitLay.sectionCount;
  const dualSupply = state.splitLay.dualSupply;
  const attackLines = parseInt(state.splitLay.attackLines, 10) || 1;
  const manualApplianceLoss =
    numberOrNull(state.applianceLoss) ?? 0;

  const supply1Length =
    numberOrNull(state.splitLay.supplyLength);

  const supply1Hose =
    HOSE_OPTIONS.find(hose =>
      hose.id === state.splitLay.supplyHoseSize
    );

  if (!supply1Hose || supply1Length === null) {
    renderWarnings(warnings);
    return;
  }

  const attack1 = calculateSplitAttackLine("1", warnings);
  if (!attack1) return;

  const attack2 =
    attackLines === 2
      ? calculateSplitAttackLine("2", warnings)
      : null;

  if (attackLines === 2 && !attack2) return;

  

  const highestAttackSidePdp =
    Math.max(
      attack1.requiredPdp,
      attack2 ? attack2.requiredPdp : 0
    );
  const actualAttack1 =
  calculateActualSplitLine(
    attack1,
    highestAttackSidePdp
  );

const actualAttack2 =
  attack2
    ? calculateActualSplitLine(
        attack2,
        highestAttackSidePdp
      )
    : null;
  const totalAttackFlow =
  actualAttack1.actualFlow +
  (actualAttack2 ? actualAttack2.actualFlow : 0);
  const appliance1Loss =
    getSplitApplianceLoss(
      state.splitLay.appliance1,
      totalAttackFlow
    );

  let appliance2Loss = 0;
  let supply2TotalFl = 0;

  if (sectionCount === "3") {

    const supply2Length =
      numberOrNull(state.splitLay.supply2Length);

    const supply2Hose =
      HOSE_OPTIONS.find(hose =>
        hose.id === state.splitLay.supply2HoseSize
      );

    if (!supply2Hose || supply2Length === null) {
      warnings.push("Enter Supply Section 2 hose and length.");
      renderWarnings(warnings);
      return;
    }

    const supply2Q =
      totalAttackFlow / 100;

    const supply2FlPer100 =
      getActiveHoseCoefficient(supply2Hose.id) *
      supply2Q *
      supply2Q;

    supply2TotalFl =
      supply2FlPer100 *
      (supply2Length / 100);

    appliance2Loss =
      getSplitApplianceLoss(
        state.splitLay.appliance2,
        totalAttackFlow
      );

  }

  const supply1Q =
    totalAttackFlow / 100;

  let supply1Coefficient =
    getActiveHoseCoefficient(supply1Hose.id);

  if (dualSupply) {
  supply1Coefficient = supply1Coefficient / 4;
}

  const supply1FlPer100 =
    supply1Coefficient *
    supply1Q *
    supply1Q;

  const supply1TotalFl =
    supply1FlPer100 *
    (supply1Length / 100);

  const totalPdp =
    highestAttackSidePdp +
    supply2TotalFl +
    appliance2Loss +
    supply1TotalFl +
    appliance1Loss +
    manualApplianceLoss;
  if (totalPdp > 300) {
  warnings.push(
    "Calculated PDP exceeds 300 psi. Confirm hose/apparatus limits and department operating guidelines before using this setup."
  );
}

  if (appliance1Loss > 0) {
    warnings.push("Estimated Appliance 1 loss applied: 10 psi at flows ≥350 GPM.");
  }

  if (appliance2Loss > 0) {
    warnings.push("Estimated Appliance 2 loss applied: 10 psi at flows ≥350 GPM.");
  }

  if (manualApplianceLoss !== 0) {
    warnings.push(
      `Manual appliance/elevation ${manualApplianceLoss > 0 ? "loss" : "gain"} applied: ${Math.round(Math.abs(manualApplianceLoss))} psi.`
    );
  }

  if (dualSupply) {
  warnings.push("Dual supply assumes matching hose size and matching hose length.");
}

  if (attackLines === 2 && attack2) {
    const attackDifference =
      Math.abs(attack1.requiredPdp - attack2.requiredPdp);

    if (attackDifference > 5) {
      warnings.push(
        "One attack line has a lower hydraulic demand than the PDP-driving line, resulting in increased nozzle pressure and flow on that line."
      );
    }
  }

  setSplitResults({
  totalPdp,
  totalAttackFlow,
  supply1TotalFl,
  supply2TotalFl,
  appliance1Loss,
  appliance2Loss,
  actualAttack1,
  actualAttack2
});
  setResult(
    Math.round(totalPdp),
    `${Math.round(totalAttackFlow)} GPM`,
    `${Math.round(
  supply1TotalFl +
  supply2TotalFl +
  actualAttack1.actualTotalFl +
  (actualAttack2 ? actualAttack2.actualTotalFl : 0)
)} psi total`,
    sectionCount === "3"
  ? attackLines === 2
    ? `S1 ${supply1TotalFl.toFixed(1)} / S2 ${supply2TotalFl.toFixed(1)} / L1 ${actualAttack1.actualTotalFl.toFixed(1)} / L2 ${actualAttack2.actualTotalFl.toFixed(1)}`
    : `S1 ${Math.round(supply1TotalFl)} / S2 ${Math.round(supply2TotalFl)} / A ${Math.round(actualAttack1.actualTotalFl)}`
  : attackLines === 2
    ? `S ${Math.round(supply1TotalFl)} / L1 ${Math.round(actualAttack1.actualTotalFl)} / L2 ${Math.round(actualAttack2.actualTotalFl)}`
    : `S ${Math.round(supply1TotalFl)} / A ${Math.round(actualAttack1.actualTotalFl)}`,
   attackLines === 2
  ? `L1 ${getSplitNozzleDisplay(actualAttack1)}
L2 ${getSplitNozzleDisplay(actualAttack2)}`
  : getSplitNozzleDisplay(actualAttack1),
    dualSupply
  ? `Dual ${supply1Hose.label} Supply`
      : `${supply1Length}' ${supply1Hose.label} Supply`,
    attackLines === 2
  ? `${actualAttack1.actualReaction} / ${actualAttack2.actualReaction}`
  : actualAttack1.actualReaction
  );

  renderWarnings(warnings);

}
    function getSplitAttackCount() {
  return state.splitLay.attackCount || "1";
}

function getSplitSupplyLines() {
  const count = Number(state.splitLay.supplyLineCount || 1);
  return Math.max(1, Math.min(2, count));
}

function getSplitSupplyFlow(totalFlow) {
  const supplyLines = getSplitSupplyLines();

  if (supplyLines === 2) {
    return totalFlow / 2;
  }

  return totalFlow;
}

function getApplianceLoss(appliance, gpm) {
  if (!appliance || appliance === "none") return 0;

  // Current app standard:
  // Small appliances are ignored until 350 GPM or greater.
  return gpm >= 350 ? 10 : 0;
}

function calcHoseFL(gpm, coeff, feet) {
  const hundreds = Number(feet || 0) / 100;
  const c = Number(coeff || 0);

  if (!gpm || !c || !hundreds) return 0;

  return c * Math.pow(gpm / 100, 2) * hundreds;
}

function calcSmoothboreFlow(tipSize, nozzlePressure) {
  const diameter = Number(tipSize || 0);
  const np = Number(nozzlePressure || 0);

  if (!diameter || !np) return 0;

  return 29.7 * Math.pow(diameter, 2) * Math.sqrt(np);
}

function roundToNearest5(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 5) * 5;
}

function formatPsi(value) {
  if (!Number.isFinite(value)) return "0 psi";
  return `${Math.round(value)} psi`;
}

function formatGpm(value) {
  if (!Number.isFinite(value)) return "0 GPM";
  return `${roundToNearest5(value)} GPM`;
}
    function getSplitApplianceLoss(appliance, gpm) {

  if (!appliance || appliance === "none") {
    return 0;
  }

  return gpm >= 350 ? 10 : 0;

}

function calculateSplitAttackLine(lineNumber, warnings) {

  const hoseSize =
    state.splitLay[`attack${lineNumber}HoseSize`];

  const hose =
    HOSE_OPTIONS.find(h => h.id === hoseSize);

  const length =
    numberOrNull(
      state.splitLay[`attack${lineNumber}Length`]
    );

  const nozzleType =
    state.splitLay[`attack${lineNumber}NozzleType`];

  const nozzlePressure =
    numberOrNull(
      state.splitLay[`attack${lineNumber}NozzlePressure`]
    );

  if (!hose || length === null || nozzlePressure === null) {

    warnings.push(
      `Complete Attack Line ${lineNumber} configuration.`
    );

    renderWarnings(warnings);

    return null;
  }

  let flow = 0;

  if (nozzleType === "smoothbore" || nozzleType === "blade") {

    const tip =
      getSplitHydraulicSmoothboreModel(lineNumber);

    if (!tip) {

      warnings.push(
        nozzleType === "blade"
          ? `Select a Blade model for Attack Line ${lineNumber}.`
          : `Select a smoothbore tip for Attack Line ${lineNumber}.`
      );

      renderWarnings(warnings);

      return null;
    }

    flow =
      smoothboreGpm(
        tip.diameter,
        nozzlePressure
      );

  } else {

    flow =
      numberOrNull(
        state.splitLay[`attack${lineNumber}Flow`]
      );

    if (flow === null || flow <= 0) {

      warnings.push(
        `Enter target flow for Attack Line ${lineNumber}.`
      );

      renderWarnings(warnings);

      return null;
    }

  }

  const q = flow / 100;

  const coefficient =
    getActiveHoseCoefficient(hose.id);

  const flPer100 =
    coefficient * q * q;

  const totalFl =
    flPer100 * (length / 100);

  const requiredPdp =
    totalFl + nozzlePressure;

  let reaction = "—";

  if (nozzleType === "smoothbore" || nozzleType === "blade") {

    const tip =
      getSplitHydraulicSmoothboreModel(lineNumber);

    if (tip) {

      const reactionValue = Math.round(
        1.57 *
        tip.diameter *
        tip.diameter *
        nozzlePressure
      );

      reaction = nozzleType === "blade"
        ? `${reactionValue} lb (solid stream)`
        : `${reactionValue} lb`;

    }

  } else {

    reaction =
      `${Math.round(
        0.0505 *
        flow *
        Math.sqrt(nozzlePressure)
      )} lb`;

  }

  return {
  lineNumber,
  hose,
  length,
  nozzleType,
  nozzlePressure,
  flow,
  flPer100,
  totalFl,
  requiredPdp,
  reaction
};

}
    function calculateActualSplitLine(line, branchPressure) {
  const coefficient = getActiveHoseCoefficient(line.hose.id);
  const lengthHundreds = line.length / 100;

  let actualNozzlePressure = line.nozzlePressure;
  let actualFlow = line.flow;

  if (line.nozzleType === "smoothbore" || line.nozzleType === "blade") {
    const tip =
      getSplitHydraulicSmoothboreModel(line.lineNumber);

    if (tip) {
      const tipConstant =
        29.7 * tip.diameter * tip.diameter / 100;

      const frictionMultiplier =
        coefficient *
        tipConstant *
        tipConstant *
        lengthHundreds;

      actualNozzlePressure =
        branchPressure / (1 + frictionMultiplier);

      actualFlow =
        smoothboreGpm(tip.diameter, actualNozzlePressure);
    }
  } else {
    const designFlow = line.flow;
    const designNozzlePressure = line.nozzlePressure;

    const frictionMultiplier =
      coefficient *
      Math.pow(designFlow / 100, 2) *
      lengthHundreds /
      designNozzlePressure;

    actualNozzlePressure =
      branchPressure / (1 + frictionMultiplier);

    actualFlow =
      designFlow *
      Math.sqrt(actualNozzlePressure / designNozzlePressure);
  }

  const actualFlPer100 =
    coefficient * Math.pow(actualFlow / 100, 2);

  const actualTotalFl =
    actualFlPer100 * lengthHundreds;

  const actualReaction =
    line.nozzleType === "smoothbore" || line.nozzleType === "blade"
      ? calculateSplitSmoothboreReaction(line, actualNozzlePressure)
      : calculateSplitFogReaction(actualFlow, actualNozzlePressure);

  return {
    ...line,
    actualNozzlePressure,
    actualFlow,
    actualFlPer100,
    actualTotalFl,
    actualReaction
  };
}
    function calculateSplitFogReaction(flow, nozzlePressure) {
  if (!flow || !nozzlePressure) return "—";

  return `${Math.round(
    0.0505 * flow * Math.sqrt(nozzlePressure)
  )} lb`;
}

function calculateSplitSmoothboreReaction(line, nozzlePressure) {
  const tip =
    getSplitHydraulicSmoothboreModel(line.lineNumber);

  if (!tip || !nozzlePressure) return "—";

  const reaction = Math.round(
    1.57 *
    tip.diameter *
    tip.diameter *
    nozzlePressure
  );

  return line.nozzleType === "blade"
    ? `${reaction} lb (solid stream)`
    : `${reaction} lb`;
}

function getSplitNozzleDisplay(line) {
  const flowAndPressure =
    `${Math.round(line.actualFlow)} GPM @ ${Math.round(line.actualNozzlePressure)} psi`;

  if (line.nozzleType === "blade") {
    return `${getBladeModelLabel(state.splitLay[`attack${line.lineNumber}BladeModel`])} ${flowAndPressure}`;
  }

  return flowAndPressure;
}


    // ========================================
    // VALIDATION
    // ========================================
    function validateCommonInputs({ hoseLength, coefficient, warnings }) {
      if (hoseLength <= 0) {
        warnings.push("Hose length must be greater than 0 feet.");
        renderWarnings(warnings);
        return false;
      }

      if (coefficient <= 0) {
        warnings.push("Hose coefficient must be greater than 0.");
        renderWarnings(warnings);
        return false;
      }

      return true;
    }

    // ========================================
    // RESULT RENDERING
    // ========================================
    function resetSplitResults() {
  if (!els.splitResultsCard) return;

  els.splitPrimaryPdp.textContent = "— PSI";
  els.splitSupplyLayoutResult.textContent = "—";

  els.splitSupplyFlow.textContent = "—";
  els.splitSupplyLoss.textContent = "—";
  els.splitApplianceLoss.textContent = "—";

  els.splitSupply2Flow.textContent = "—";
  els.splitSupply2Loss.textContent = "—";
  els.splitAppliance2Loss.textContent = "—";

  els.splitAttack1FlowResult.textContent = "—";
  els.splitAttack1NpResult.textContent = "—";
  els.splitAttack1FlResult.textContent = "—";

  els.splitAttack2FlowResult.textContent = "—";
  els.splitAttack2NpResult.textContent = "—";
  els.splitAttack2FlResult.textContent = "—";
  els.splitAttack1ReactionResult.textContent = "—";
  els.splitAttack2ReactionResult.textContent = "—";
  els.splitAttack1PressureTag.textContent = "—";
  els.splitAttack2PressureTag.textContent = "—";
}
    function setSplitResults({
  totalPdp,
  totalAttackFlow,
  supply1TotalFl,
  supply2TotalFl = 0,
  appliance1Loss = 0,
  appliance2Loss = 0,
  actualAttack1,
  actualAttack2 = null
}) {
  if (!els.splitResultsCard) return;

  els.splitPrimaryPdp.textContent =
    `${Math.round(totalPdp)} PSI`;

  els.splitSupplyLayoutResult.textContent =
    state.splitLay.dualSupply
    ? "Dual Matching Supply"
    : "Single Supply";

  els.splitSupplyFlow.textContent =
    `${Math.round(totalAttackFlow)} GPM`;

  els.splitSupplyLoss.textContent =
  `${supply1TotalFl.toFixed(1)} psi`;

  els.splitApplianceLoss.textContent =
    `${Math.round(appliance1Loss)} psi`;

  els.splitSupply2Flow.textContent =
    `${Math.round(totalAttackFlow)} GPM`;

  els.splitSupply2Loss.textContent =
  `${supply2TotalFl.toFixed(1)} psi`;

  els.splitAppliance2Loss.textContent =
    `${Math.round(appliance2Loss)} psi`;

      [
  els.splitAttack1FlowResult,
  els.splitAttack2FlowResult,
  els.splitAttack1NpResult,
  els.splitAttack2NpResult
].forEach(el => {

  if (!el) return;

  el.classList.remove(
    "flow-increase",
    "overpressure"
  );

});

  els.splitAttack1FlowResult.textContent =
    `${Math.round(actualAttack1.actualFlow)} GPM`;
      els.splitAttack1FlowResult.classList.toggle(
  "flow-increase",
  actualAttack1.actualNozzlePressure >
    actualAttack1.nozzlePressure + 1
);

  els.splitAttack1NpResult.textContent =
    `${Math.round(actualAttack1.actualNozzlePressure)} psi`;

  els.splitAttack1NpResult.classList.toggle(
    "overpressure",
    actualAttack1.actualNozzlePressure > actualAttack1.nozzlePressure + 1
  );

  els.splitAttack1FlResult.textContent =
  `${actualAttack1.actualTotalFl.toFixed(1)} psi`;
    const pressureDifference =
  actualAttack2
    ? Math.abs(
        actualAttack1.actualNozzlePressure -
        actualAttack2.actualNozzlePressure
      )
    : 0;
      els.splitAttack1ReactionResult.textContent =
  actualAttack1.actualReaction;

if (!actualAttack2) {

  els.splitAttack1PressureTag.textContent =
  "SINGLE LINE";

els.splitAttack1PressureTag.className =
  "pressure-path-tag balanced";

} else if (pressureDifference <= 3) {

 els.splitAttack1PressureTag.textContent =
  "BALANCED";

els.splitAttack1PressureTag.className =
  "pressure-path-tag balanced";

els.splitAttack2PressureTag.textContent =
  "BALANCED";

els.splitAttack2PressureTag.className =
  "pressure-path-tag balanced";

} else if (
  actualAttack1.requiredPdp >
  actualAttack2.requiredPdp
) {

  els.splitAttack1PressureTag.textContent =
    "PDP DRIVING LINE";
  els.splitAttack1PressureTag.className =
  "pressure-path-tag driver";

  els.splitAttack2PressureTag.textContent =
    "RECALCULATED";
  els.splitAttack2PressureTag.className =
  "pressure-path-tag recalculated";

} else {

  els.splitAttack1PressureTag.textContent =
  "RECALCULATED";

els.splitAttack1PressureTag.className =
  "pressure-path-tag recalculated";

els.splitAttack2PressureTag.textContent =
  "PDP DRIVING LINE";

els.splitAttack2PressureTag.className =
  "pressure-path-tag driver";

}

  if (actualAttack2) {
    els.splitAttack2FlowResult.textContent =
      `${Math.round(actualAttack2.actualFlow)} GPM`;
    els.splitAttack2FlowResult.classList.toggle(
  "flow-increase",
  actualAttack2.actualNozzlePressure >
    actualAttack2.nozzlePressure + 1
);

    els.splitAttack2NpResult.textContent =
      `${Math.round(actualAttack2.actualNozzlePressure)} psi`;

    els.splitAttack2NpResult.classList.toggle(
    "overpressure",
    actualAttack2.actualNozzlePressure > actualAttack2.nozzlePressure + 1
  );

    els.splitAttack2FlResult.textContent =
  `${actualAttack2.actualTotalFl.toFixed(1)} psi`;
    els.splitAttack2ReactionResult.textContent =
  actualAttack2.actualReaction;
  }
}
    function setResult(rounded, calculated, total, per100, nozzle, setup, reaction = "-", turboLoss = null, turboFlow = null) {
      els.roundedGpm.textContent = rounded;
      els.calculatedGpm.textContent = calculated;
      els.totalFl.textContent = total;
      els.flPer100.textContent = per100;
      els.nozzleDisplay.textContent = nozzle;
      els.setupDisplay.textContent = setup;
      els.nozzleReaction.textContent = reaction;
      if (els.turboLossDetail && els.turboLossDisplay) {
        const showTurboLoss =
          state.henTurboEnabled &&
          turboLoss !== null &&
          Number.isFinite(turboLoss) &&
          turboFlow !== null &&
          Number.isFinite(turboFlow);

        els.turboLossDetail.hidden = !showTurboLoss;
        els.turboLossDetail.style.display = showTurboLoss ? "" : "none";
        els.turboLossDisplay.textContent = showTurboLoss
          ? `${turboLoss.toFixed(1)} psi @ ${Math.round(turboFlow)} GPM`
          : "—";
      }
      if (els.bladeResultNote) {
        els.bladeResultNote.hidden =
          !isBlade() ||
          isRelayMode() ||
          isSplitLayMode() ||
          String(rounded).trim() === "—" ||
          String(rounded).trim() === "-";
      }
      els.standardResultsCard?.classList.toggle(
        "result-empty",
        String(rounded).trim() === "—" || String(rounded).trim() === "-"
      );
    }

    function getSetupDisplay() {

  const hose = getSelectedHose();

  if (state.useCustomCoefficient && state.customCoefficient) {

    return `${state.hoseLength || "—"}' of ${hose.label} • Custom C ${state.customCoefficient}${state.henTurboEnabled ? " • HEN Turbo" : ""}`;

  }

  return `${state.hoseLength || "—"}' of ${hose.label}${state.henTurboEnabled ? " • HEN Turbo" : ""}`;
}

    function getNozzleDisplay() {
      if (isSmoothbore()) {
        const tip = getSelectedSmoothboreTip();
        const displayedPressure = isReverseMode()
  ? calculateAchievableSmoothborePressure()
  : state.nozzlePressure === "custom"
    ? state.customNozzlePressure
    : state.nozzlePressure;

        return `${tip ? tip.label : state.smoothboreTip} SB @ ${displayedPressure ?? "—"} psi`;
      }

      if (isBlade()) {
        const blade = getSelectedBladeModel();
        const displayedPressure = isReverseMode()
  ? calculateAchievableSmoothborePressure()
  : state.nozzlePressure === "custom"
    ? state.customNozzlePressure
    : state.nozzlePressure;

        return `${blade ? blade.label : "Blade 160"} @ ${displayedPressure ?? "—"} psi`;
      }

      const displayPressure =
  state.nozzlePressure === "custom"
    ? state.customNozzlePressure
    : state.nozzlePressure;

return `Fog @ ${displayPressure} psi`;
    }

    // ========================================
    // HYDRAULIC HELPERS
    // ========================================
    function getTargetFlowValue() {
      if (isRequiredPdpMode() && usesSmoothboreHydraulics()) {
        const tip = getSelectedHydraulicSmoothboreModel();
        const nozzlePressure =
  state.nozzlePressure === "custom"
    ? numberOrNull(state.customNozzlePressure)
    : numberOrNull(state.nozzlePressure);
        if (!tip || nozzlePressure === null) return "";
        return String(Math.round(smoothboreGpm(tip.diameter, nozzlePressure)));
      }

      return state.targetGpm;
    }

    function syncCalculatedSmoothboreTargetFlow() {
      if (!isRequiredPdpMode() || !usesSmoothboreHydraulics()) return;
      state.targetGpm = getTargetFlowValue();
    }

    function smoothboreGpm(diameter, nozzlePressure) {
      return 29.7 * diameter * diameter * Math.sqrt(nozzlePressure);
    }

    function calculateNozzleReaction(calculatedGpm, nozzlePressure) {
      if (usesSmoothboreHydraulics()) {
        const tip = getSelectedHydraulicSmoothboreModel();
        if (!tip || nozzlePressure === null) return "—";

        const reaction = 1.57 * tip.diameter * tip.diameter * nozzlePressure;
        return isBlade()
          ? `${Math.round(reaction)} lb (solid stream)`
          : `${Math.round(reaction)} lb`;
      }

      if (state.nozzleType === "fog") {
        if (!calculatedGpm || nozzlePressure === null) return "—";

        const reaction = 0.0505 * calculatedGpm * Math.sqrt(nozzlePressure);
        return `${Math.round(reaction)} lb`;
      }

      return "—";
    }

    // ========================================
    // SELECTORS / MODE HELPERS
    // ========================================
    function getSelectedHose() {

  const hoseOptions = isRelayMode()
    ? RELAY_HOSE_OPTIONS
    : HOSE_OPTIONS;

  return (
    hoseOptions.find(hose => hose.id === state.hoseSize) ||
    hoseOptions[0]
  );
}

    function getSelectedSmoothboreTip() {
      return SMOOTHBORE_TIPS.find(item => item.id === state.smoothboreTip);
    }

    function getSelectedBladeModel() {
      return BLADE_MODELS.find(item => item.id === state.bladeModel) ||
        BLADE_MODELS[0];
    }

    function getBladeModelLabel(modelId) {
      const blade = BLADE_MODELS.find(item => item.id === modelId);
      return blade ? blade.label : "Blade 160";
    }

    function getSelectedHydraulicSmoothboreModel() {
      return isBlade()
        ? getSelectedBladeModel()
        : getSelectedSmoothboreTip();
    }

    function getSplitBladeModel(lineNumber) {
      return BLADE_MODELS.find(
        item => item.id === state.splitLay[`attack${lineNumber}BladeModel`]
      ) || BLADE_MODELS[0];
    }

    function getSplitHydraulicSmoothboreModel(lineNumber) {
      return state.splitLay[`attack${lineNumber}NozzleType`] === "blade"
        ? getSplitBladeModel(lineNumber)
        : SMOOTHBORE_TIPS.find(
            item => item.id === state.splitLay[`attack${lineNumber}SmoothboreTip`]
          );
    }

    function isReverseMode() {
      return state.mode === "reverse";
    }

    function isRequiredPdpMode() {
      return state.mode === "requiredPdp";
    }

    function isApparatusMountedMode() {
      return state.mode === "apparatusMounted";
    }

    function isRelayMode() {
      return state.mode === "relay";
    }

    function isSplitLayMode() {
      return state.mode === "splitLay";
}

    function isSmoothbore() {
  return (
    state.nozzleType === "smoothbore" ||
    (
      state.nozzleType === "masterstream" &&
      state.masterStreamType === "smoothbore"
    )
  );
}

function isMasterStream() {
  return state.nozzleType === "masterstream";
}

    function isReverseSmoothbore() {
      return isReverseMode() && usesSmoothboreHydraulics();
    }

    function isBlade() {
      return state.nozzleType === "blade";
    }

    function usesSmoothboreHydraulics() {
      return isSmoothbore() || isBlade();
    }

    // ========================================
// SPLIT LAY RESET
// ========================================
function clearSplitAttack2State() {
  state.splitLay.attack2Length = "";
  state.splitLay.attack2Flow = "";
  state.splitLay.attack2SmoothboreTip = "";
  state.splitLay.attack2BladeModel =
    DEFAULT_STATE.splitLay.attack2BladeModel;
  state.splitLay.attack2NozzleType =
    DEFAULT_STATE.splitLay.attack2NozzleType;
  state.splitLay.attack2NozzlePressure =
    DEFAULT_STATE.splitLay.attack2NozzlePressure;
  state.splitLay.attack2HoseSize =
    DEFAULT_STATE.splitLay.attack2HoseSize;

  [
    ["splitAttack2Length", ""],
    ["splitAttack2Flow", ""],
    ["splitAttack2SmoothboreTip", ""],
    ["splitAttack2BladeModel", DEFAULT_STATE.splitLay.attack2BladeModel],
    ["splitAttack2NozzleType", DEFAULT_STATE.splitLay.attack2NozzleType],
    ["splitAttack2NozzlePressure", DEFAULT_STATE.splitLay.attack2NozzlePressure],
    ["splitAttack2Hose", DEFAULT_STATE.splitLay.attack2HoseSize]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
  syncSplitNozzleUi("2");
}
    function clearSplitSupply2State() {
  state.splitLay.supply2Length = "";
  state.splitLay.supply2HoseSize =
    DEFAULT_STATE.splitLay.supply2HoseSize;
  state.splitLay.appliance2 =
    DEFAULT_STATE.splitLay.appliance2;

  [
    ["splitSupply2Length", ""],
    ["splitSupply2Hose", DEFAULT_STATE.splitLay.supply2HoseSize],
    ["splitAppliance2", DEFAULT_STATE.splitLay.appliance2]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
}

  function resetReverseSupplyInputs() {
  state.reverseSupplyEnabled = false;
  state.reverseSupplyLength = "";
  state.reverseSupplyHoseSize = "3";
  state.reverseSupplyAppliance = "gateValve";

  if (els.reverseSupplyLength) {
    els.reverseSupplyLength.value = "";
  }

  if (els.reverseSupplyHose) {
    els.reverseSupplyHose.value = "3";
  }

  if (els.reverseSupplyAppliance) {
    els.reverseSupplyAppliance.value = "gateValve";
  }

  syncReverseSupplyUi();
}

function resetSplitLayInputs() {

  state.splitLay = {
    ...DEFAULT_STATE.splitLay
  };

  [
    ["splitSupplyLength", ""],
    ["splitSupplyHose", DEFAULT_STATE.splitLay.supplyHoseSize],
    ["splitAppliance1", DEFAULT_STATE.splitLay.appliance1],

    ["splitSupply2Length", ""],
    ["splitSupply2Hose", DEFAULT_STATE.splitLay.supply2HoseSize],
    ["splitAppliance2", DEFAULT_STATE.splitLay.appliance2],

    ["splitAttack1Length", ""],
    ["splitAttack1Hose", DEFAULT_STATE.splitLay.attack1HoseSize],
    ["splitAttack1NozzleType", DEFAULT_STATE.splitLay.attack1NozzleType],
    ["splitAttack1NozzlePressure", DEFAULT_STATE.splitLay.attack1NozzlePressure],
    ["splitAttack1Flow", ""],
    ["splitAttack1SmoothboreTip", DEFAULT_STATE.splitLay.attack1SmoothboreTip],
    ["splitAttack1BladeModel", DEFAULT_STATE.splitLay.attack1BladeModel],

    ["splitAttack2Length", ""],
    ["splitAttack2Hose", DEFAULT_STATE.splitLay.attack2HoseSize],
    ["splitAttack2NozzleType", DEFAULT_STATE.splitLay.attack2NozzleType],
    ["splitAttack2NozzlePressure", DEFAULT_STATE.splitLay.attack2NozzlePressure],
    ["splitAttack2Flow", ""],
    ["splitAttack2SmoothboreTip", DEFAULT_STATE.splitLay.attack2SmoothboreTip],
    ["splitAttack2BladeModel", DEFAULT_STATE.splitLay.attack2BladeModel]
  ].forEach(([id, value]) => {

    const el = document.getElementById(id);

    if (el) {
      el.value = value;
    }

  });

  syncSplitLayUi();

}
    
    // ========================================
    // GENERAL UTILITIES
    // ========================================
    function wholeNumber(value) {
  value = String(value).replace(/[^0-9-]/g, "");

  // Only allow one minus sign, and only at the beginning
  value = value.replace(/(?!^)-/g, "");

  return value;
}

    function decimalNumber(value) {
      value = String(value).replace(/[^0-9.]/g, "");

      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }

      return value;
    }

    function numberOrNull(value) {
      if (value === "" || value === null || value === undefined) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function roundToNearestFive(value) {
      return Math.round(value / 5) * 5;
    }
