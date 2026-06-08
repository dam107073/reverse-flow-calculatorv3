
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

      nozzlePressure: "55",
      customNozzlePressure: "",

      smoothboreTip: "",
      applianceLoss: "0",
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

  attack2Length: "",
  attack2HoseSize: "1.75",
  attack2NozzleType: "fog",
  attack2NozzlePressure: "50",
  attack2Flow: "",
  attack2SmoothboreTip: ""
},
      useCustomCoefficient: false,
      customCoefficient: "",
    };

    let state = getFreshLaunchState();

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const els = {
      presetSelect: document.getElementById("presetSelect"),
      savePresetButton: document.getElementById("savePresetButton"),
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

      dualLineSupplyField:
      document.getElementById("dualLineSupplyField"),

      dualLineSupplyToggle:
      document.getElementById("dualLineSupplyToggle"),
      masterStreamLossField:
      document.getElementById("masterStreamLossField"),

      masterStreamLoss:
      document.getElementById("masterStreamLoss"),
      smoothboreTipField: document.getElementById("smoothboreTipField"),
      smoothboreTip: document.getElementById("smoothboreTip"),

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
      invertApplianceLossButton:
        document.getElementById("invertApplianceLossButton"),
      coefficientToggle: document.getElementById("coefficientToggle"),
      customCoefficient: document.getElementById("customCoefficient"),
      saveCoefficientDefaultButton: document.getElementById("saveCoefficientDefaultButton"),
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
      warningsCard: document.getElementById("warningsCard"),
      splitDualSupplyToggle: document.getElementById("splitDualSupplyToggle"),
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
	    els.buyProButton.textContent = "Buy Reverse Flow Pro";
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

    function init() {

  els.versionFooter.textContent =
  `Reverse Flow v${APP_VERSION}`;

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
  populateHoseOptions();
  populateSmoothboreTips();
  renderPresetOptions();
  syncInputsFromState();
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

  const badge = document.getElementById("accessBadge");

  if (!badge) return;

  if (userAccessLevel === ACCESS_LEVELS.PRO) {
    badge.textContent = "PRO";
    return;
  }

  badge.textContent = "BASIC";
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
  function hoseOptionLabel(hose) {
  const activeCoefficient = getActiveHoseCoefficient(hose.id);

  const coefficientLabel = isModifiedHoseCoefficient(hose.id)
    ? `CUSTOM C ${activeCoefficient}`
    : `C ${activeCoefficient}`;

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

const splitAttack1Hose =
  document.getElementById("splitAttack1Hose");

const splitAttack2Hose =
  document.getElementById("splitAttack2Hose");

const supplyOptions = HOSE_OPTIONS.filter(hose =>
  ["2", "2.25", "2.5", "3", "4", "5"].includes(hose.id)
);

const attackOptions = HOSE_OPTIONS.filter(hose =>
  ["1", "1.5", "1.75", "1.88", "2", "2.25", "2.5"].includes(hose.id)
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

    function populateSmoothboreTips() {
  const tips = isMasterStream()
    ? SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 1.25 &&
        tip.diameter <= 2
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
    : `${splitLay.attack1Flow || "—"} GPM Fog`;

const attack2Description =
  splitLay.attack2NozzleType === "smoothbore"
    ? `${splitLay.attack2SmoothboreTip || "SB"} SB`
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

  const pressureKey =
  isMasterStream()
    ? "masterstream"
    : state.nozzleType;

  const pressures = getNozzlePressures()[pressureKey];
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
        `<div class="warning-item"><span>⚠️</span><span>${warning}</span></div>`
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
  els.nozzleType.value = state.nozzleType;

  els.relayResidualPressure.value =
    state.relayResidualPressure || "30";

  els.masterStreamType.value =
    state.masterStreamType;

  els.masterStreamLoss.value =
    state.masterStreamLoss;

  els.dualLineSupplyToggle.checked =
    state.dualLineSupply;

  els.smoothboreTip.value = state.smoothboreTip;
  els.applianceLoss.value = state.applianceLoss;
  els.customCoefficient.value = state.customCoefficient;

  syncCoefficientUi();
  syncSmoothboreUi();
  syncModeUi();
}

    function syncModeUi() {
      const smoothboreRequiredPdp = isRequiredPdpMode() && isSmoothbore();

      els.reverseModeButton.classList.toggle("active", isReverseMode());
      els.pdpModeButton.classList.toggle("active", isRequiredPdpMode());
      els.relayModeButton.classList.toggle("active",isRelayMode());
      els.splitLayButton.classList.toggle("active", isSplitLayMode());

      els.pdpLabel.textContent =
        isRelayMode()
          ? "Target Flow"
      : isRequiredPdpMode()
          ? "Target Flow"
          : "Pump Discharge Pressure";

      els.pdp.placeholder =
        isRelayMode()
          ? "GPM"
      : isRequiredPdpMode()
          ? "GPM"
          : "PDP";

      els.pdp.disabled = smoothboreRequiredPdp;

      els.pdp.closest(".field").style.display = isSplitLayMode() ? "none" : "";
      els.hoseLength.closest(".field").style.display = isSplitLayMode() ? "none" : "";
      els.hoseSize.closest(".field").style.display = isSplitLayMode() ? "none" : "";
      
      els.nozzleType.closest(".field").style.display =
  (isSplitLayMode() || isRelayMode())
    ? "none"
    : "";
      els.applianceLoss.closest(".field").style.display = "";
      els.customCoefficient.closest(".field").style.display = isSplitLayMode() ? "none" : "";

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
  : isRelayMode()
    ? "Relay Pumping: Calculate the discharge pressure needed to supply a receiving engine."
    : smoothboreRequiredPdp
      ? "Required PDP: Smoothbore target flow is calculated from tip size and nozzle pressure."
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
    : isRelayMode()
      ? "Relay PDP"
      : isRequiredPdpMode()
        ? "Required PDP"
        : "Rounded Flow";
      
      els.primaryResultUnit.textContent =
  isRelayMode() || isRequiredPdpMode() || isSplitLayMode()
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

} else {

  els.calculatedLabel.textContent = isRequiredPdpMode()
    ? "Total Flow"
    : "Calculated";

  els.totalFlLabel.textContent = "Total FL";

  els.flPer100Label.textContent =
    isSplitLayMode()
      ? "FL Breakdown"
      : "FL / 100'";

  els.nozzleDisplayLabel.textContent = "Nozzle";

  els.reactionLabel.textContent =
    isRequiredPdpMode()
      ? "Supply"
      : "Reaction";

  els.setupLabel.textContent = "Setup";
  els.nozzleReaction.parentElement.style.display = "";

}
    
      els.nozzleTypeLabel.textContent = "Nozzle Style";

els.nozzleType.innerHTML = `
  <option value="fog">Fog</option>
  <option value="smoothbore">Smoothbore</option>
  <option value="masterstream">Master Stream</option>
`;

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

syncSplitLayUi();

}

function syncSmoothboreUi() {

  if (isRelayMode() || isSplitLayMode()) {

    els.smoothboreTipField.hidden = true;
    els.smoothboreTipField.style.display = "none";

    els.masterStreamTypeField.hidden = true;
    els.masterStreamTypeField.style.display = "none";

    els.masterStreamLossField.hidden = true;
    els.masterStreamLossField.style.display = "none";

    els.dualLineSupplyField.hidden = true;
    els.dualLineSupplyField.style.display = "none";

    return;
  }

  const showMasterStream =
    isMasterStream();

  els.masterStreamTypeField.hidden =
    !showMasterStream;

  els.masterStreamTypeField.style.display =
    showMasterStream ? "" : "none";

  els.masterStreamLossField.hidden =
    !showMasterStream;

  els.masterStreamLossField.style.display =
    showMasterStream ? "" : "none";

  const showSmoothbore =
    isSmoothbore();

  els.smoothboreTipField.hidden =
    !showSmoothbore;

  els.smoothboreTipField.style.display =
    showSmoothbore ? "" : "none";

  const showDualLines =
    isRequiredPdpMode() &&
    isMasterStream();

  els.dualLineSupplyField.hidden =
    !showDualLines;

  els.dualLineSupplyField.style.display =
    showDualLines ? "" : "none";

  if (!showSmoothbore) {
    state.smoothboreTip = "";
    els.smoothboreTip.value = "";
  }
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
  els.splitDualSupplyToggle.checked =
    state.splitLay.dualSupply;
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

function syncSplitNozzleUi(lineNumber) {
  const nozzleType = document.getElementById(`splitAttack${lineNumber}NozzleType`);
  const pressureSelect = document.getElementById(`splitAttack${lineNumber}NozzlePressure`);
  const flowField = document.getElementById(`splitAttack${lineNumber}FlowField`);
  const tipField = document.getElementById(`splitAttack${lineNumber}SmoothboreTipField`);

  if (!nozzleType || !pressureSelect || !flowField || !tipField) return;

  const isSmoothboreLine = nozzleType.value === "smoothbore";

  pressureSelect.innerHTML = isSmoothboreLine
    ? `
      <option value="40">40 psi</option>
      <option value="50">50 psi</option>
      <option value="60">60 psi</option>
    `
    : `
      <option value="50">50 psi</option>
      <option value="55">55 psi</option>
      <option value="75">75 psi</option>
      <option value="100">100 psi</option>
    `;

  const pressureKey = `attack${lineNumber}NozzlePressure`;

  if (![...pressureSelect.options].some(option => option.value === state.splitLay[pressureKey])) {
    state.splitLay[pressureKey] = isSmoothboreLine ? "50" : "50";
  }

  pressureSelect.value = state.splitLay[pressureKey];

  tipField.hidden = !isSmoothboreLine;
  tipField.style.display = isSmoothboreLine ? "" : "none";

  flowField.style.display = isSmoothboreLine ? "none" : "";
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
  : `Using hose default coefficient: ${activeCoefficient}.${modifiedText}`;

      const hasTemporaryCustomCoefficient =
  state.useCustomCoefficient &&
  numberOrNull(state.customCoefficient) !== null;

els.saveCoefficientDefaultButton.hidden =
  !hasTemporaryCustomCoefficient;

els.saveCoefficientDefaultButton.textContent =
  `Save as Default for ${selectedHose.label} Hose`;
    }

    // ========================================
    // EVENT HANDLING
    // ========================================
    function bindEvents() {
    if (els.presetSelect) {
  els.presetSelect.addEventListener("change", e => applyPreset(e.target.value));
}
  els.savePresetButton.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();

  if (!isProUser()) {
    openProModal();
    return;
  }

  saveCurrentSetupAsPreset();
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
      els.resetHoseCoefficientsButton.addEventListener("click", () => {

  if (!isProUser()) {
    openProModal();
    return;
  }

  const confirmed = confirm(
    "Reset all hose coefficients back to app defaults?"
  );

  if (!confirmed) return;

  resetSavedHoseCoefficients();

  state.useCustomCoefficient = false;
  state.customCoefficient = "";
  els.customCoefficient.value = "";

  populateHoseOptions();
  els.hoseSize.value = state.hoseSize;

  syncCoefficientUi();
  updateCalculator();

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


function openProModal() {
  els.proModal.hidden = false;
}

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

      ["pdp", "hoseLength", "applianceLoss"].forEach(id => {
        els[id].addEventListener("input", e => handleWholeNumberInput(id, e.target));
      });

      els.customCoefficient.addEventListener("input", e => {
  state.customCoefficient = decimalNumber(e.target.value);
  e.target.value = state.customCoefficient;

  syncCoefficientUi();
  updateCalculator();
});

      els.saveCoefficientDefaultButton.addEventListener("click", () => {

  if (!isProUser()) {
    openProModal();
    return;
  }

  const selectedHose = getSelectedHose();
  const coefficient = numberOrNull(state.customCoefficient);

  if (coefficient === null || coefficient <= 0) {
    alert("Enter a valid hose coefficient greater than 0.");
    return;
  }

        const confirmed = confirm(
  `Save C ${coefficient} as the new default coefficient for ${selectedHose.label} hose?`
);

if (!confirmed) return;

  saveHoseCoefficient(selectedHose.id, coefficient);

  state.useCustomCoefficient = false;
  state.customCoefficient = "";
  els.customCoefficient.value = "";

  populateHoseOptions();
  els.hoseSize.value = selectedHose.id;

  syncCoefficientUi();
  updateCalculator();

  alert(`${selectedHose.label} hose default coefficient saved as C ${coefficient}.`);
});

      els.hoseSize.addEventListener("change", e => {
  state.hoseSize = e.target.value;
  clearCustomCoefficient();
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

els.masterStreamLoss.addEventListener("input", e => {
  state.masterStreamLoss = e.target.value || "25";
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

  saveState();
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

  ["splitAttack2Length", "attack2Length"],
  ["splitAttack2Hose", "attack2HoseSize"],
  ["splitAttack2NozzleType", "attack2NozzleType"],
  ["splitAttack2NozzlePressure", "attack2NozzlePressure"],
  ["splitAttack2Flow", "attack2Flow"],
  ["splitAttack2SmoothboreTip", "attack2SmoothboreTip"]
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

  if (isRequiredPdpMode() && isSmoothbore()) {
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

  state.mode = mode;
  state.customNozzlePressure = "";
  clearCustomCoefficient();

  if (leavingSplitLay) {
    state.splitLay = {
      ...DEFAULT_STATE.splitLay
    };

    resetSplitLayResultCard();
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

    state.smoothboreTip = "";

    state.applianceLoss = "0";
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

  state.nozzlePressure = "55";
  state.smoothboreTip = "";

  state.applianceLoss = "0";
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

    applianceLoss: state.applianceLoss || "0",

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

    ["splitAttack2Length", state.splitLay.attack2Length || ""],
    ["splitAttack2Hose", state.splitLay.attack2HoseSize || "1.75"],
    ["splitAttack2NozzleType", state.splitLay.attack2NozzleType || "fog"],
    ["splitAttack2NozzlePressure", state.splitLay.attack2NozzlePressure || "50"],
    ["splitAttack2Flow", state.splitLay.attack2Flow || ""],
    ["splitAttack2SmoothboreTip", state.splitLay.attack2SmoothboreTip || ""]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });

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

    applianceLoss:
      preset.applianceLoss || "0",

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
  syncInputsFromState();
  syncSplitLayInputsFromState();
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

if (isRequiredPdpMode()) {
  calculateRequiredPdp({ ...inputs, warnings });
  return;
}

calculateReverseFlow({ ...inputs, warnings });
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
      isMasterStream()
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
    function calculateReverseFlow({ pdp, hoseLength, nozzlePressure, applianceLoss, masterStreamLoss, coefficient, selectedHose, warnings }) {      if (pdp === null || hoseLength === null || nozzlePressure === null || coefficient === null) {
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

const totalFrictionLoss =
  pdp -
  nozzlePressure -
  applianceLoss -
  masterStreamLoss;
      if (totalFrictionLoss < 0) {
        warnings.push("Total friction loss is negative after subtracting nozzle pressure and appliance/elevation loss.");
        setResult("—", "—", `${Math.round(totalFrictionLoss)} psi`, "—", getNozzleDisplay(), getSetupDisplay());
        renderWarnings(warnings);
        return;
      }

      const frictionLossPer100 = totalFrictionLoss / (hoseLength / 100);
      const calculatedGpm = isSmoothbore()
        ? smoothboreGpm(getSelectedSmoothboreTip().diameter, nozzlePressure)
        : Math.sqrt(frictionLossPer100 / coefficient) * 100;
      const roundedGpm = roundToNearestFive(calculatedGpm);
      const nozzleReaction = calculateNozzleReaction(calculatedGpm, nozzlePressure);

      if (roundedGpm > selectedHose.maxReferenceFlow) {
        warnings.push(`Rounded flow is above the normal reference range for ${selectedHose.chartName} hose. Confirm with department-approved flow testing or local operating guidance.`);
      }

      setResult(
  roundedGpm,
  `${Math.round(calculatedGpm)} GPM`,
  `${totalFrictionLoss.toFixed(1)} psi`,
  `${frictionLossPer100.toFixed(1)} psi`,
  getNozzleDisplay(),
  getSetupDisplay(),
  nozzleReaction
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
      const tip = getSelectedSmoothboreTip();

      if (pdp === null || hoseLength === null || coefficient === null || !tip || hoseLength <= 0 || coefficient <= 0) {
        return null;
      }

      const usablePressure =
      pdp -
      applianceLoss -
      masterStreamLoss;
      if (usablePressure <= 0) return 0;

      const lengthHundreds = hoseLength / 100;
      const tipConstant = 29.7 * tip.diameter * tip.diameter / 100;
      const frictionMultiplier = coefficient * tipConstant * tipConstant * lengthHundreds;
      const achievablePressure = usablePressure / (1 + frictionMultiplier);

      return Math.max(0, Math.floor(achievablePressure));
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
      const requiredPdp =
        nozzlePressure +
        totalFrictionLoss +
        applianceLoss +
        masterStreamLoss;      const roundedRequiredPdp = Math.round(requiredPdp);
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
  state.dualLineSupply && isMasterStream()
    ? `Dual lines: YES
Per line: ${Math.round(flowForFriction)} GPM`
    : "Dual lines: NO"
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
    appliance1Loss;
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
  ? `L1 ${Math.round(actualAttack1.actualFlow)} GPM @ ${Math.round(actualAttack1.actualNozzlePressure)} psi
L2 ${Math.round(actualAttack2.actualFlow)} GPM @ ${Math.round(actualAttack2.actualNozzlePressure)} psi`
  : `${Math.round(actualAttack1.actualFlow)} GPM @ ${Math.round(actualAttack1.actualNozzlePressure)} psi`,
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

  if (nozzleType === "smoothbore") {

    const tipId =
      state.splitLay[`attack${lineNumber}SmoothboreTip`];

    const tip =
      SMOOTHBORE_TIPS.find(t => t.id === tipId);

    if (!tip) {

      warnings.push(
        `Select a smoothbore tip for Attack Line ${lineNumber}.`
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

  if (nozzleType === "smoothbore") {

    const tipId =
      state.splitLay[`attack${lineNumber}SmoothboreTip`];

    const tip =
      SMOOTHBORE_TIPS.find(t => t.id === tipId);

    if (tip) {

      reaction =
        `${Math.round(
          1.57 *
          tip.diameter *
          tip.diameter *
          nozzlePressure
        )} lb`;

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

  if (line.nozzleType === "smoothbore") {
    const tipId =
      state.splitLay[`attack${line.lineNumber}SmoothboreTip`];

    const tip =
      SMOOTHBORE_TIPS.find(t => t.id === tipId);

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
    line.nozzleType === "smoothbore"
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
  const tipId =
    state.splitLay[`attack${line.lineNumber}SmoothboreTip`];

  const tip =
    SMOOTHBORE_TIPS.find(t => t.id === tipId);

  if (!tip || !nozzlePressure) return "—";

  return `${Math.round(
    1.57 *
    tip.diameter *
    tip.diameter *
    nozzlePressure
  )} lb`;
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
    function setResult(rounded, calculated, total, per100, nozzle, setup, reaction = "-") {
      els.roundedGpm.textContent = rounded;
      els.calculatedGpm.textContent = calculated;
      els.totalFl.textContent = total;
      els.flPer100.textContent = per100;
      els.nozzleDisplay.textContent = nozzle;
      els.setupDisplay.textContent = setup;
      els.nozzleReaction.textContent = reaction;
      els.standardResultsCard?.classList.toggle(
        "result-empty",
        String(rounded).trim() === "—" || String(rounded).trim() === "-"
      );
    }

    function getSetupDisplay() {

  const hose = getSelectedHose();

  if (state.useCustomCoefficient && state.customCoefficient) {

    return `${state.hoseLength || "—"}' of ${hose.label} • Custom C ${state.customCoefficient}`;

  }

  return `${state.hoseLength || "—"}' of ${hose.label}`;
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
      if (isRequiredPdpMode() && isSmoothbore()) {
        const tip = getSelectedSmoothboreTip();
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
      if (!isRequiredPdpMode() || !isSmoothbore()) return;
      state.targetGpm = getTargetFlowValue();
    }

    function smoothboreGpm(diameter, nozzlePressure) {
      return 29.7 * diameter * diameter * Math.sqrt(nozzlePressure);
    }

    function calculateNozzleReaction(calculatedGpm, nozzlePressure) {
      if (isSmoothbore()) {
        const tip = getSelectedSmoothboreTip();
        if (!tip || nozzlePressure === null) return "—";

        const reaction = 1.57 * tip.diameter * tip.diameter * nozzlePressure;
        return `${Math.round(reaction)} lb`;
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

    function isReverseMode() {
      return state.mode === "reverse";
    }

    function isRequiredPdpMode() {
      return state.mode === "requiredPdp";
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
      return isReverseMode() && isSmoothbore();
    }

    // ========================================
// SPLIT LAY RESET
// ========================================
function clearSplitAttack2State() {
  state.splitLay.attack2Length = "";
  state.splitLay.attack2Flow = "";
  state.splitLay.attack2SmoothboreTip = "";
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

    ["splitAttack2Length", ""],
    ["splitAttack2Hose", DEFAULT_STATE.splitLay.attack2HoseSize],
    ["splitAttack2NozzleType", DEFAULT_STATE.splitLay.attack2NozzleType],
    ["splitAttack2NozzlePressure", DEFAULT_STATE.splitLay.attack2NozzlePressure],
    ["splitAttack2Flow", ""],
    ["splitAttack2SmoothboreTip", DEFAULT_STATE.splitLay.attack2SmoothboreTip]
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
