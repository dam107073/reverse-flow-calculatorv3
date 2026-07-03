
    // ========================================
    // APPLICATION STATE
    // ========================================
    const DEFAULT_STATE = {
      mode: "reverse",
      pdp: "",
      targetGpm: "",
      hoseLength: "",
      hoseSize: "1.88",
      nozzleType: "smoothbore",

      masterStreamType: "automaticFog",
      masterStreamLoss: "25",
      dualLineSupply: false,
      apparatusFogFlow: "1000",
      apparatusCustomFogFlow: "",
      apparatusElevation: "",
      ratedFlow: "",
      ratedPressure: "",

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
  attack1NozzleType: "smoothbore",
  attack1NozzlePressure: "50",
  attack1Flow: "",
  attack1RatedFlow: "",
  attack1RatedPressure: "",
  attack1SmoothboreTip: "",
  attack1BladeModel: "blade160",

  attack2Length: "",
  attack2HoseSize: "1.75",
  attack2NozzleType: "smoothbore",
  attack2NozzlePressure: "50",
  attack2Flow: "",
  attack2RatedFlow: "",
  attack2RatedPressure: "",
  attack2SmoothboreTip: "",
  attack2BladeModel: "blade160"
},
      standpipeOps: {
        attack2Enabled: false,
        attack1Floor: "1",
        attack1Length: "",
        attack1HoseSize: "1.75",
        attack1NozzleType: "smoothbore",
        attack1NozzlePressure: "50",
        attack1Flow: "",
        attack1RatedFlow: "",
        attack1RatedPressure: "",
        attack1SmoothboreTip: "",
        attack1BladeModel: "blade160",
        attack2Floor: "1",
        attack2Length: "",
        attack2HoseSize: "1.75",
        attack2NozzleType: "smoothbore",
        attack2NozzlePressure: "50",
        attack2Flow: "",
        attack2RatedFlow: "",
        attack2RatedPressure: "",
        attack2SmoothboreTip: "",
        attack2BladeModel: "blade160",
        supplyLength: "",
        supplyHoseSize: "3",
        standpipeLoss: "25",
        dualSupply: false
      },
      useCustomCoefficient: false,
      customCoefficient: "",
    };

    const SESSION_ACTIVE_MODE_KEY = "reverse-flow-active-mode-session-v1";
    const VALID_CALCULATOR_MODES = new Set([
      "apparatusMounted",
      "relay",
      "requiredPdp",
      "reverse",
      "splitLay",
      "standpipeOps"
    ]);
    const PRO_GATED_CALCULATOR_MODES = new Set([
      "apparatusMounted",
      "relay",
      "splitLay",
      "standpipeOps"
    ]);
    const SUPPLY_HOSE_IDS =
      ["2", "2.25", "2.5", "3", "4", "5"];

    const ATTACK_HOSE_IDS =
      ["1", "1.5", "1.75", "1.88", "2", "2.25", "2.5"];

    function normalizeNozzleType(value) {
      return value === "fog" ? "automaticFog" : value;
    }

    function normalizeStateNozzleTypes(targetState) {
      if (!targetState || typeof targetState !== "object") return targetState;

      targetState.nozzleType = normalizeNozzleType(targetState.nozzleType);
      targetState.masterStreamType = normalizeNozzleType(targetState.masterStreamType);

      ["splitLay", "standpipeOps"].forEach(section => {
        const data = targetState[section];
        if (!data || typeof data !== "object") return;

        ["1", "2"].forEach(lineNumber => {
          const key = `attack${lineNumber}NozzleType`;
          data[key] = normalizeNozzleType(data[key]);
        });
      });

      return targetState;
    }

    function isAutomaticFogType(nozzleType) {
      return normalizeNozzleType(nozzleType) === "automaticFog";
    }

    function isFixedFogType(nozzleType) {
      return normalizeNozzleType(nozzleType) === "fixedFog";
    }

    function isFogHydraulicType(nozzleType) {
      return isAutomaticFogType(nozzleType) || isFixedFogType(nozzleType);
    }

    function fixedFogFlowAtPressure(ratedFlow, ratedPressure, actualPressure) {
      if (!(ratedFlow > 0) || !(ratedPressure > 0) || !(actualPressure > 0)) return null;
      return ratedFlow * Math.sqrt(actualPressure / ratedPressure);
    }

    function fixedFogPressureForFlow(ratedFlow, ratedPressure, targetFlow) {
      if (!(ratedFlow > 0) || !(ratedPressure > 0) || !(targetFlow > 0)) return null;
      return ratedPressure * Math.pow(targetFlow / ratedFlow, 2);
    }

    function getMainNozzleType() {
      return isMasterStream()
        ? normalizeNozzleType(state.masterStreamType)
        : normalizeNozzleType(state.nozzleType);
    }

    function getMainRatedFlow() {
      return numberOrNull(state.ratedFlow);
    }

    function getMainRatedPressure() {
      return numberOrNull(state.ratedPressure);
    }

    function getLineNozzleType(section, lineNumber) {
      return normalizeNozzleType(section?.[`attack${lineNumber}NozzleType`]);
    }

    function getLineRatedFlow(section, lineNumber) {
      return numberOrNull(section?.[`attack${lineNumber}RatedFlow`]);
    }

    function getLineRatedPressure(section, lineNumber) {
      return numberOrNull(section?.[`attack${lineNumber}RatedPressure`]);
    }

    let state = getFreshLaunchState();
    let hoseLibraryRows = [];
    let modeCarouselInitialized = false;
    let modeCarouselSuppressAutoCenter = false;
    let modeCarouselPointerDown = false;
    let modeCarouselDragging = false;
    let modeCarouselPointerStartX = 0;
    let modeCarouselPointerStartY = 0;
    let modeCarouselIgnoreClickUntil = 0;

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const els = {
      presetSelect: document.getElementById("presetSelect"),
      savePresetButton: document.getElementById("savePresetButton"),
      savePresetButtonSplit: document.getElementById("savePresetButtonSplit"),
      savePresetButtonStandpipe:
        document.getElementById("savePresetButtonStandpipe"),
      updatePumpChartSetupButton:
        document.getElementById("updatePumpChartSetupButton"),
      updatePumpChartSetupButtonSplit:
        document.getElementById("updatePumpChartSetupButtonSplit"),
      updatePumpChartSetupButtonStandpipe:
        document.getElementById("updatePumpChartSetupButtonStandpipe"),
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
      visibleHoseSizesList: document.getElementById("visibleHoseSizesList"),
      visibleSmoothboreTipsList: document.getElementById("visibleSmoothboreTipsList"),
      customHoseProfileName: document.getElementById("customHoseProfileName"),
      customHoseManufacturer: document.getElementById("customHoseManufacturer"),
      customHoseModel: document.getElementById("customHoseModel"),
      customHoseSize: document.getElementById("customHoseSize"),
      customHoseUse: document.getElementById("customHoseUse"),
      customHoseCoefficient: document.getElementById("customHoseCoefficient"),
      customHoseChargedId50: document.getElementById("customHoseChargedId50"),
      customHoseChargedId150: document.getElementById("customHoseChargedId150"),
      customHoseNotes: document.getElementById("customHoseNotes"),
      createCustomHoseButton: document.getElementById("createCustomHoseButton"),
      resetHoseCoefficientsButton: document.getElementById("resetHoseCoefficientsButton"),
      resetButton: document.getElementById("resetButton"),

      viewPumpChartButton:
        document.getElementById("viewPumpChartButton"),

      pumpChartModal:
        document.getElementById("pumpChartModal"),

      closePumpChartModal:
        document.getElementById("closePumpChartModal"),

      pumpChartModalSubtitle:
        document.getElementById("pumpChartModalSubtitle"),

      pumpChartList:
        document.getElementById("pumpChartList"),

      reverseModeButton: document.getElementById("reverseModeButton"),
      pdpModeButton: document.getElementById("pdpModeButton"),
      relayModeButton: document.getElementById("relayModeButton"),
      apparatusMountedModeButton: document.getElementById("apparatusMountedModeButton"),
      standpipeOpsButton: document.getElementById("standpipeOpsButton"),
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
      fixedFogRatingField: document.getElementById("fixedFogRatingField"),
      ratedFlow: document.getElementById("ratedFlow"),
      ratedPressure: document.getElementById("ratedPressure"),

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
      standpipeOpsFields: document.getElementById("standpipeOpsFields"),
      standpipeAddOutletButton: document.getElementById("standpipeAddOutletButton"),
      standpipeRemoveOutletButton: document.getElementById("standpipeRemoveOutletButton"),
      standpipeAttack2Section: document.getElementById("standpipeAttack2Section"),
      standpipeDualSupplyToggle: document.getElementById("standpipeDualSupplyToggle"),
      standpipeResultsCard: document.getElementById("standpipeResultsCard"),
      standpipePrimaryPdp: document.getElementById("standpipePrimaryPdp"),
      standpipeTotalFlow: document.getElementById("standpipeTotalFlow"),
      standpipeSupplyLoss: document.getElementById("standpipeSupplyLoss"),
      standpipeLossResult: document.getElementById("standpipeLossResult"),
      standpipeDrivingLine: document.getElementById("standpipeDrivingLine"),
      standpipeAttack1ResultSection:
        document.getElementById("standpipeAttack1ResultSection"),
      standpipeAttack2ResultSection:
        document.getElementById("standpipeAttack2ResultSection"),
      standpipeAttack1PressureTag:
        document.getElementById("standpipeAttack1PressureTag"),
      standpipeAttack2PressureTag:
        document.getElementById("standpipeAttack2PressureTag"),
      standpipeAttack1FlowResult:
        document.getElementById("standpipeAttack1FlowResult"),
      standpipeAttack1FlResult:
        document.getElementById("standpipeAttack1FlResult"),
      standpipeAttack1ElevationResult:
        document.getElementById("standpipeAttack1ElevationResult"),
      standpipeAttack1NpResult:
        document.getElementById("standpipeAttack1NpResult"),
      standpipeAttack1ReactionResult:
        document.getElementById("standpipeAttack1ReactionResult"),
      standpipeAttack1Warnings:
        document.getElementById("standpipeAttack1Warnings"),
      standpipeAttack2FlowResult:
        document.getElementById("standpipeAttack2FlowResult"),
      standpipeAttack2FlResult:
        document.getElementById("standpipeAttack2FlResult"),
      standpipeAttack2ElevationResult:
        document.getElementById("standpipeAttack2ElevationResult"),
      standpipeAttack2NpResult:
        document.getElementById("standpipeAttack2NpResult"),
      standpipeAttack2ReactionResult:
        document.getElementById("standpipeAttack2ReactionResult"),
      standpipeAttack2Warnings:
        document.getElementById("standpipeAttack2Warnings"),
      standpipeAdvisories: document.getElementById("standpipeAdvisories"),

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
      standpipeFormula: document.getElementById("standpipeFormula"),
      formulaCard: document.getElementById("formulaCard"),
      formulaCardSummary: document.getElementById("formulaCardSummary"),
      
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
	    els.buyProButton.textContent = "Upgrade to Pro";
	  } else if (state === "loading") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Loading purchase...";
	  } else if (state === "processing") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Processing purchase...";
	  } else if (state === "owned") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Pro Active";
	  } else if (state === "restoreRequired") {
	    els.buyProButton.disabled = true;
	    els.buyProButton.textContent = "Pro Owned - Restore to Activate";
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

	function summarizeVerifiedPurchase(purchase, fallbackPath = null) {
	  if (!purchase || typeof purchase !== "object") return null;
	
	  return {
	    path: fallbackPath,
	    id: purchase.id || null,
	    platform: purchase.platform || null,
	    purchaseId: purchase.purchaseId || null,
	    transactionId: purchase.transactionId || null,
	    purchaseDate: purchase.purchaseDate || null,
	    expiryDate: purchase.expiryDate || null,
	    isExpired: Boolean(purchase.isExpired),
	    isAcknowledged: purchase.isAcknowledged,
	    isConsumed: purchase.isConsumed
	  };
	}

	function summarizeVerifiedReceipt(receipt, index = null) {
	  if (!receipt || typeof receipt !== "object") return null;
	
	  const collection = Array.isArray(receipt.collection)
	    ? receipt.collection
	    : [];
	
	  return {
	    index,
	    className: receipt.className || null,
	    platform: receipt.platform || null,
	    id: receipt.id || null,
	    latestReceipt: receipt.latestReceipt,
	    validationDate: receipt.validationDate || null,
	    collectionCount: collection.length,
	    collection: collection.map((purchase, purchaseIndex) =>
	      summarizeVerifiedPurchase(
	        purchase,
	        `store.verifiedReceipts[${index}].collection[${purchaseIndex}].id`
	      )
	    )
	  };
	}

	function getReverseFlowProStoreSnapshot(store) {
	  const purchasePlatform = getReverseFlowPurchasePlatform();
	  const proProduct = purchasePlatform && typeof store?.get === "function"
	    ? store.get(REVERSE_FLOW_PRO_PRODUCT_ID, purchasePlatform)
	    : null;
	  const verifiedReceipts = Array.isArray(store?.verifiedReceipts)
	    ? store.verifiedReceipts
	    : [];
	  const verifiedPurchases = Array.isArray(store?.verifiedPurchases)
	    ? store.verifiedPurchases
	    : [];
	  const verifiedReceiptMatch =
	    proProduct && typeof store?.findInVerifiedReceipts === "function"
	      ? store.findInVerifiedReceipts(proProduct)
	      : null;
	
	  return {
	    platform: purchasePlatform || null,
	    validatorConfigured: Boolean(store?.validator),
	    product: proProduct
	      ? {
	          id: proProduct.id || null,
	          platform: proProduct.platform || null,
	          type: proProduct.type || null,
	          canPurchase: proProduct.canPurchase,
	          owned: proProduct.owned,
	          state: proProduct.state || null
	        }
	      : null,
	    storeOwnsPro:
	      typeof store?.owned === "function" &&
	      store.owned(REVERSE_FLOW_PRO_PRODUCT_ID),
	    findInVerifiedReceipts: summarizeVerifiedPurchase(
	      verifiedReceiptMatch,
	      "store.findInVerifiedReceipts(reverse_flow_pro_lifetime)"
	    ),
	    verifiedPurchases: verifiedPurchases.map((purchase, index) =>
	      summarizeVerifiedPurchase(
	        purchase,
	        `store.verifiedPurchases[${index}].id`
	      )
	    ),
	    verifiedReceipts: verifiedReceipts.map((receipt, index) =>
	      summarizeVerifiedReceipt(receipt, index)
	    )
	  };
	}

	function logReverseFlowRestoreDiagnostic(event, store, details = {}) {
	  console.info("[Reverse Flow IAP]", {
	    event,
	    productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	    ...details,
	    ...(IAP_DEBUG_DIAGNOSTICS
	      ? { storeSnapshot: getReverseFlowProStoreSnapshot(store) }
	      : {})
	  });
	}

	function getIapDiagnosticPayload(details = {}) {
	  return IAP_DEBUG_DIAGNOSTICS ? details : {};
	}

	async function logMetaProPurchaseEvent(grantSource) {
	  const capacitor = window.Capacitor;
	  const metaAppEvents = capacitor?.Plugins?.MetaAppEvents;
	  const platform = capacitor?.getPlatform?.() || "web";
	
	  if (
	    platform !== "ios" ||
	    typeof metaAppEvents?.logProPurchase !== "function"
	  ) {
	    return;
	  }
	
	  try {
	    await metaAppEvents.logProPurchase({
	      productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	      amount: REVERSE_FLOW_PRO_META_PURCHASE_AMOUNT,
	      currency: REVERSE_FLOW_PRO_META_PURCHASE_CURRENCY
	    });
	
	    console.info("[Reverse Flow IAP]", {
	      event: "meta-pro-purchase-logged",
	      productId: grantSource.productId,
	      amount: REVERSE_FLOW_PRO_META_PURCHASE_AMOUNT,
	      currency: REVERSE_FLOW_PRO_META_PURCHASE_CURRENCY
	    });
	  } catch (error) {
	    console.info("[Reverse Flow IAP]", {
	      event: "meta-pro-purchase-log-failed",
	      productId: grantSource.productId,
	      message: error?.message || String(error)
	    });
	  }
	}

	function ownsProViaSdkStore(store) {
	  if (REVERSE_FLOW_PRO_PRODUCT_ID !== "reverse_flow_pro_lifetime") {
	    return {
	      ownsPro: false,
	      source: null,
	      productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	      productOwned: false,
	      storeOwned: false,
	      product: null
	    };
	  }
	
	  const purchasePlatform = getReverseFlowPurchasePlatform();
	  const product = purchasePlatform && typeof store?.get === "function"
	    ? store.get(REVERSE_FLOW_PRO_PRODUCT_ID, purchasePlatform)
	    : null;
	  const storeOwned =
	    typeof store?.owned === "function" &&
	    store.owned(REVERSE_FLOW_PRO_PRODUCT_ID) === true;
	  const productOwned =
	    product?.id === REVERSE_FLOW_PRO_PRODUCT_ID &&
	    product.owned === true;
	
	  return {
	    ownsPro: storeOwned || productOwned,
	    source: storeOwned ? "store-owned" : productOwned ? "product-owned" : null,
	    productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	    productOwned,
	    storeOwned,
	    product: product
	      ? {
	          id: product.id || null,
	          platform: product.platform || null,
	          canPurchase: product.canPurchase,
	          owned: product.owned,
	          state: product.state || null
	        }
	      : null
	  };
	}

	function grantProFromSdkOwnership(store, options = {}) {
	  const ownership = ownsProViaSdkStore(store);
	  if (!ownership.ownsPro) return false;
	
	  const wasAlreadyPro = isProUser();
	  const trigger = options.trigger || "sdk-owned";
	  const grantWasRestore = Boolean(options.restore);
	  const grantWasPurchase = Boolean(options.purchase);

	  if (!grantWasRestore && !grantWasPurchase) {
	    if (wasAlreadyPro) {
	      updateBuyProButtonState("owned", {
	        reason: "stored Pro entitlement is already active",
	        trigger,
	        source: ownership.source
	      });
	      return true;
	    }

	    logProAccessEvent("sdk-owned-startup-grant-suppressed", {
	      trigger,
	      source: ownership.source,
	      productId: ownership.productId,
	      ...(IAP_DEBUG_DIAGNOSTICS
	        ? {
	            ownership,
	            storeSnapshot: getReverseFlowProStoreSnapshot(store)
	          }
	        : {}),
	      reason: "explicit purchase or restore is required to activate Pro on this device"
	    });

	    updateBuyProButtonState("restoreRequired", {
	      reason: "SDK reports exact Pro product ownership but local entitlement is not active",
	      trigger,
	      source: ownership.source
	    });
	    return false;
	  }
	
	  logProAccessEvent("sdk-owned-detected-pro", {
	    trigger,
	    source: ownership.source,
	    productId: ownership.productId,
	    restoreInProgress: reverseFlowRestoreInProgress,
	    purchaseInProgress: reverseFlowPurchaseInProgress,
	    wasAlreadyPro,
	    sourceDetail: ownership.source,
	    ...(IAP_DEBUG_DIAGNOSTICS
	      ? {
	          ownership,
	          storeSnapshot: getReverseFlowProStoreSnapshot(store)
	        }
	      : {})
	  });
	
	  const proWasGranted = setAccessLevel(ACCESS_LEVELS.PRO, {
	    trigger,
	    source: "purchase",
	    productId: ownership.productId
	  });
	
	  if (!proWasGranted) return false;
	
	  updateBuyProButtonState("owned", {
	    reason: "exact Pro product is owned by SDK store",
	    trigger,
	    source: ownership.source
	  });

	  if (grantWasRestore) {
	    reverseFlowRestoreInProgress = false;
	    if (els.restorePurchaseButton) {
	      els.restorePurchaseButton.disabled = false;
	      els.restorePurchaseButton.textContent = "Restore Complete";
	    }
	  }
	
	  if (els.proModal) {
	    els.proModal.hidden = true;
	  }
	
	  if (!wasAlreadyPro && grantWasPurchase && !grantWasRestore) {
	    logMetaProPurchaseEvent({
	      productId: ownership.productId
	    });
	  }
	
	  if (grantWasPurchase || grantWasRestore) {
	    reverseFlowPurchaseInProgress = false;
	  }

	  if (!wasAlreadyPro && grantWasPurchase && !grantWasRestore) {
	    alert("Reverse Flow Pro Unlocked");
	  }
	
	  return true;
	}
	
	function initializeReverseFlowStore() {
	  const store = window.CdvPurchase.store;
	  const ProductType = window.CdvPurchase.ProductType;
	  const Platform = window.CdvPurchase.Platform;
	
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

	  function formatReceiptPath(path) {
	    return path.reduce((formatted, segment, index) => {
	      if (index === 0) return String(segment);
	      if (/^\d+$/.test(segment)) return `${formatted}[${segment}]`;
	      if (/^[A-Za-z_$][\w$]*$/.test(segment)) return `${formatted}.${segment}`;
	      return `${formatted}[${JSON.stringify(segment)}]`;
	    }, "");
	  }

	  function getReceiptPropertyValue(value, key) {
	    try {
	      return value[key];
	    } catch (error) {
	      return undefined;
	    }
	  }

	  function findVerifiedReceiptValuePaths(receipt) {
	    const targets = new Set([
	      REVERSE_FLOW_PRO_PRODUCT_ID,
	      "app.reverseflow.mobile"
	    ]);
	    const matches = {};
	    targets.forEach(target => {
	      matches[target] = [];
	    });
	    const seen = new WeakSet();
	
	    function visit(value, path = ["receipt"]) {
	      if (typeof value === "string") {
	        if (targets.has(value)) {
	          matches[value].push(formatReceiptPath(path));
	        }
	        return;
	      }
	
	      if (!value || typeof value !== "object") return;
	      if (seen.has(value)) return;
	      seen.add(value);
	
	      if (Array.isArray(value)) {
	        value.forEach((item, index) => {
	          visit(item, path.concat(String(index)));
	        });
	        return;
	      }
	
	      Object.getOwnPropertyNames(value).forEach(key => {
	        if (targets.has(key)) {
	          matches[key].push(formatReceiptPath(path.concat(key)));
	        }
	        visit(getReceiptPropertyValue(value, key), path.concat(key));
	      });
	    }
	
	    visit(receipt);
	
	    return matches;
	  }

	  function inspectVerifiedEntitlement(receipt) {
	    const collection = Array.isArray(receipt?.collection)
	      ? receipt.collection
	      : [];
	    const purchases = collection.map((purchase, index) => ({
	      path: `receipt.collection[${index}].id`,
	      productId: purchase?.id || null,
	      expired: isExpiredPurchaseObject(purchase)
	    }));
	    const matchingPurchase = purchases.find(purchase =>
	      purchase.productId === REVERSE_FLOW_PRO_PRODUCT_ID &&
	      !purchase.expired
	    );
	
	    return {
	      grantsPro: Boolean(matchingPurchase),
	      productId: matchingPurchase?.productId || null,
	      matchingCandidate: matchingPurchase || null,
	      canonicalPath: matchingPurchase?.path || null,
	      purchases
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
  platform: purchasePlatform,
  ...getIapDiagnosticPayload({
    validatorConfigured: Boolean(store.validator)
  })
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
	
	  if (IAP_DEBUG_DIAGNOSTICS) {
	    logStoreEvent("product-registering", {
	      registration: {
	        id: REVERSE_FLOW_PRO_PRODUCT_ID,
	        type: ProductType.NON_CONSUMABLE,
	        platform: purchasePlatform
	      }
	    });
	  }
	
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
	      id: product?.id,
	      productId: product?.productId,
	      canPurchase: product?.canPurchase,
	      owned: product?.owned,
	      state: product?.state,
	      ...getIapDiagnosticPayload({
	        rawProduct: product
	      })
	    });
	
	    if (product.id === REVERSE_FLOW_PRO_PRODUCT_ID) {
	      if (product.owned === true) {
	        reverseFlowProProductReady = false;
	        grantProFromSdkOwnership(store, {
	          trigger: "product-updated",
	          purchase: reverseFlowPurchaseInProgress,
	          restore: reverseFlowRestoreInProgress
	        });
	        return;
	      }

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
	    canPurchase: product.canPurchase,
	    ...getIapDiagnosticPayload({
	      rawProduct: product
	    })
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
	        transactionId: transaction?.transactionId || null,
	        state: transaction?.state || null,
	        productIds: Array.isArray(transaction?.products)
	          ? transaction.products.map(product => product?.id).filter(Boolean)
	          : [],
	        ...getIapDiagnosticPayload({
	          rawTransaction: transaction
	        })
	      });
	
	      transaction.verify();
	    })
	    .verified(receipt => {
	      const receiptInspection = inspectVerifiedEntitlement(receipt);
	      const verifiedReceiptValuePaths = findVerifiedReceiptValuePaths(receipt);
	      const receiptCollection = Array.isArray(receipt?.collection)
	        ? receipt.collection
	        : null;
	
	      if (IAP_DEBUG_DIAGNOSTICS) {
	        logStoreEvent("receipt-verified", {
	          receiptSummary: summarizeVerifiedReceipt(receipt),
	          receiptCollection,
	          receiptInspection,
	          verifiedReceiptValuePaths,
	          storeSnapshot: getReverseFlowProStoreSnapshot(store)
	        });
	      }
	
	      const storeOwnsPro =
	        typeof store.owned === "function" &&
	        store.owned(REVERSE_FLOW_PRO_PRODUCT_ID);
	      const receiptWasRestore = reverseFlowRestoreInProgress;
	
	      if (!receiptInspection.grantsPro) {
	        if (IAP_DEBUG_DIAGNOSTICS) {
	          logProAccessEvent("validator-backed-receipt-not-available", {
	            trigger: "store.when().verified",
	            source: receiptWasRestore ? "restore" : "purchase",
	            productId: null,
	            canonicalPurchases: receiptInspection.purchases,
	            verifiedReceiptValuePaths,
	            storeOwnsPro,
	            storeSnapshot: getReverseFlowProStoreSnapshot(store),
	            reason: "no validator-backed receipt collection contained the exact lifetime product"
	          });
	        }
	        grantProFromSdkOwnership(store, {
	          trigger: "store.when().verified",
	          purchase: reverseFlowPurchaseInProgress,
	          restore: receiptWasRestore
	        });
	        return;
	      }
	
	      const wasAlreadyPro = isProUser();
	      const grantWasRestore = receiptWasRestore;
	      const grantSource = receiptInspection;

	      if (!wasAlreadyPro && !grantWasRestore && !reverseFlowPurchaseInProgress) {
	        logProAccessEvent("verified-receipt-startup-grant-suppressed", {
	          trigger: "store.when().verified",
	          source: "verified-receipt",
	          productId: grantSource.productId,
	          matchingPath: grantSource.canonicalPath,
	          storeOwnsPro,
	          ...getIapDiagnosticPayload({
	            matchingCandidate: grantSource.matchingCandidate,
	            verifiedReceiptValuePaths,
	            storeSnapshot: getReverseFlowProStoreSnapshot(store)
	          }),
	          reason: "explicit purchase or restore is required to activate Pro on this device"
	        });
	        updateBuyProButtonState("restoreRequired", {
	          reason: "verified receipt contains Pro but local entitlement is not active",
	          trigger: "store.when().verified"
	        });
	        return;
	      }

	      logProAccessEvent("verified-receipt-detected-pro", {
	        trigger: "store.when().verified",
	        source: grantWasRestore ? "restore" : "purchase",
	        productId: grantSource.productId,
	        matchingPath: grantSource.canonicalPath,
	        storeOwnsPro,
	        ...getIapDiagnosticPayload({
	          matchingCandidate: grantSource.matchingCandidate,
	          verifiedReceiptValuePaths,
	          storeSnapshot: getReverseFlowProStoreSnapshot(store)
	        })
	      });
	
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
	        source: grantWasRestore ? "restore" : "purchase",
	        productId: grantSource.productId,
	        reason: "verified receipt collection contained the exact lifetime product",
	        restoreInProgress: grantWasRestore,
	        wasAlreadyPro,
	        matchingPath: grantSource.canonicalPath,
	        matchingCandidate: grantSource.matchingCandidate
	      });
	
	      if (!wasAlreadyPro) {
	        if (reverseFlowPurchaseInProgress && !grantWasRestore) {
	          logMetaProPurchaseEvent(grantSource);
	        }
	        alert("Reverse Flow Pro Unlocked");
      }

      reverseFlowPurchaseInProgress = false;

      if (els.proModal) {
        els.proModal.hidden = true;
      }

	      if (typeof receipt.finish === "function") {
	        logStoreEvent("receipt-finish-start", {
	          matchingPath: grantSource.canonicalPath
	        });
	        Promise.resolve(receipt.finish())
	          .then(() => {
	            logStoreEvent("receipt-finish-complete", {
	              matchingPath: grantSource.canonicalPath,
	              ...getIapDiagnosticPayload({
	                storeSnapshot: getReverseFlowProStoreSnapshot(store)
	              })
	            });
	          })
	          .catch(error => {
	            console.warn("[Reverse Flow IAP]", {
	              event: "receipt-finish-failed",
	              productId: REVERSE_FLOW_PRO_PRODUCT_ID,
	              matchingPath: grantSource.canonicalPath,
	              error
	            });
	          });
	      }
	    })
	    .unverified(unverifiedReceipt => {
	      console.warn("[Reverse Flow IAP]", {
	        event: "receipt-unverified",
	        ...getIapDiagnosticPayload({
	          rawReceipt: unverifiedReceipt,
	          entitlementInspection: inspectVerifiedEntitlement(unverifiedReceipt)
	        })
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
	
	  const initializeOptions = purchasePlatform === Platform.APPLE_APPSTORE
	    ? [{
	        platform: Platform.APPLE_APPSTORE,
	        options: {
	          needAppReceipt: true
	        }
	      }]
	    : [purchasePlatform];

	  if (IAP_DEBUG_DIAGNOSTICS) {
	    logStoreEvent("initialize-options", {
	      initializeOptions,
	      validatorConfigured: Boolean(store.validator),
	      note: store.validator
	        ? "receipt validator configured before initialize"
	        : "no receipt validator configured before initialize"
	    });
	  }

	  const initializeResult = store.initialize(initializeOptions);
	
	  if (initializeResult && typeof initializeResult.then === "function") {
	    initializeResult
	      .then(() => {
	        reverseFlowProStoreInitialized = true;
	        logStoreEvent("initialize-complete", {
	          returnedPromise: true,
	          ...getIapDiagnosticPayload({
	            validatorConfigured: Boolean(store.validator),
	            storeSnapshot: getReverseFlowProStoreSnapshot(store)
	          })
	        });
	        grantProFromSdkOwnership(store, {
	          trigger: "initialize-complete"
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
	      returnedPromise: false,
	      ...getIapDiagnosticPayload({
	        validatorConfigured: Boolean(store.validator),
	        storeSnapshot: getReverseFlowProStoreSnapshot(store)
	      })
	    });
	    grantProFromSdkOwnership(store, {
	      trigger: "initialize-complete"
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

    if (
      els.toolsPage &&
      typeof guardToolsAccess === "function" &&
      !guardToolsAccess({
        safeUrl: "index.html",
        redirectDelayMs: 250,
        reason: "tools-page-load"
      })
    ) {
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
  renderVisibleHoseSizes();
  renderVisibleSmoothboreTips();
  populateSmoothboreTips();
  renderPresetOptions();
  syncInputsFromState();
  setupModeCarousel();
  enforceRestoredSessionModeAccess();

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

  const hasProAccess = isProUser();

  if (typeof guardToolsAccess === "function") {
    guardToolsAccess({
      showModal: false,
      redirect: false,
      reason: "tools-gate-sync"
    });
  } else {
    if (els.toolsProContent) {
      els.toolsProContent.hidden = !hasProAccess;
      els.toolsProContent.inert = !hasProAccess;
      els.toolsProContent.setAttribute("aria-hidden", hasProAccess ? "false" : "true");
    }

    if (els.toolsProLockedMessage) {
      els.toolsProLockedMessage.hidden = hasProAccess;
    }
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
  renderVisibleHoseSizes();
  renderVisibleSmoothboreTips();
}
    // ========================================
    // STORAGE
    // ========================================
    function isValidCalculatorMode(mode) {
      return VALID_CALCULATOR_MODES.has(mode);
    }

    function isProGatedCalculatorMode(mode) {
      return PRO_GATED_CALCULATOR_MODES.has(mode);
    }

    function getSessionActiveMode() {
      try {
        const mode = sessionStorage.getItem(SESSION_ACTIVE_MODE_KEY);
        return isValidCalculatorMode(mode) ? mode : DEFAULT_STATE.mode;
      } catch {
        return DEFAULT_STATE.mode;
      }
    }

    function saveSessionActiveMode(mode) {
      if (!isValidCalculatorMode(mode)) return;

      try {
        sessionStorage.setItem(SESSION_ACTIVE_MODE_KEY, mode);
      } catch {}
    }

    function getFreshLaunchState() {
  const sessionMode = getSessionActiveMode();
  const freshState = {
    ...DEFAULT_STATE,
    mode:
      isProGatedCalculatorMode(sessionMode) && !isProUser()
        ? DEFAULT_STATE.mode
        : sessionMode,
    hoseSize: resolveVisibleHoseDefault(DEFAULT_STATE.hoseSize, HOSE_OPTIONS),
    reverseSupplyHoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.reverseSupplyHoseSize,
      getSupplyHoseOptions()
    ),
    smoothboreTip: DEFAULT_STATE.smoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.smoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : "",
    splitLay: getVisibleDefaultSplitLayState(),
    standpipeOps: getVisibleDefaultStandpipeOpsState()
  };

  normalizeStateNozzleTypes(freshState);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(freshState)
  );

  return freshState;
}
    function loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const sessionMode = getSessionActiveMode();
        if (saved) {
          const parsed = JSON.parse(saved);
          return normalizeStateNozzleTypes({
            ...DEFAULT_STATE,
            ...parsed,
            hoseSize: resolveVisibleHoseDefault(
              parsed.hoseSize || DEFAULT_STATE.hoseSize,
              getModeHoseOptions(parsed.mode || sessionMode)
            ),
            reverseSupplyHoseSize: resolveVisibleHoseDefault(
              parsed.reverseSupplyHoseSize || DEFAULT_STATE.reverseSupplyHoseSize,
              getSupplyHoseOptions()
            ),
            mode:
              isProGatedCalculatorMode(sessionMode) && !isProUser()
                ? DEFAULT_STATE.mode
                : sessionMode,
            splitLay: {
              ...getVisibleDefaultSplitLayState(),
              ...(parsed.splitLay || {})
            },
            standpipeOps: {
              ...getVisibleDefaultStandpipeOpsState(),
              ...(parsed.standpipeOps || {})
            }
          });
        }
      } catch {}
      return normalizeStateNozzleTypes({
        ...DEFAULT_STATE,
        hoseSize: resolveVisibleHoseDefault(DEFAULT_STATE.hoseSize, HOSE_OPTIONS),
        reverseSupplyHoseSize: resolveVisibleHoseDefault(
          DEFAULT_STATE.reverseSupplyHoseSize,
          getSupplyHoseOptions()
        ),
        smoothboreTip: DEFAULT_STATE.smoothboreTip
          ? resolveVisibleSmoothboreTipDefault(
              DEFAULT_STATE.smoothboreTip,
              getHandlineSmoothboreTipOptions()
            )
          : "",
        splitLay: getVisibleDefaultSplitLayState(),
        standpipeOps: getVisibleDefaultStandpipeOpsState()
      });
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadPresets() {
      return loadPumpCharts()
        .charts
        .flatMap(chart =>
          chart.setups.map(setup => ({
            ...setup.inputs,
            ...setup.result,
            id: setup.id,
            name: setup.name,
            mode: setup.mode,
            modeLabel: setup.modeLabel,
            notes: setup.notes,
            chartId: chart.id,
            setupId: setup.id,
            createdAt: setup.createdAt,
            updatedAt: setup.updatedAt
          }))
        );
    }

    function savePresets(presets) {
  if (!isProUser()) {
    openProModal();
    return false;
  }

  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return true;
}

let pumpChartView = {
  screen: "list",
  chartId: null,
  setupId: null
};

let activePumpChartEdit = null;
let shouldScrollToTopAfterPumpChartSaveClose = false;

function scrollCalculatorPageToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

function closePumpChartModal({ allowPostSaveScroll = true } = {}) {
  els.pumpChartModal.hidden = true;
  els.viewPumpChartButton?.classList.remove("active");

  if (allowPostSaveScroll && shouldScrollToTopAfterPumpChartSaveClose) {
    shouldScrollToTopAfterPumpChartSaveClose = false;
    scrollCalculatorPageToTop();
    return;
  }

  if (!allowPostSaveScroll) {
    shouldScrollToTopAfterPumpChartSaveClose = false;
  }
}

function clearPumpChartEditState() {
  activePumpChartEdit = null;
  syncLoadedSetupUpdateUi();
}

function setPumpChartEditState(chartId, setupId) {
  const { chart, setup } = findPumpChartSetup(chartId, setupId);
  if (!chart || !setup) {
    clearPumpChartEditState();
    return;
  }

  const setupInputs = {
    ...(setup.inputs || {}),
    mode: setup.inputs?.mode || setup.mode || ""
  };

  activePumpChartEdit = {
    chartId,
    setupId,
    originalInputs: getComparablePumpChartInputs(setupInputs)
  };
  syncLoadedSetupUpdateUi();
}

function setLoadedSetupUpdateButtonsVisible(visible) {
  [
    els.updatePumpChartSetupButton,
    els.updatePumpChartSetupButtonSplit,
    els.updatePumpChartSetupButtonStandpipe
  ].forEach(button => {
    if (button) button.hidden = !visible;
  });
}

function syncLoadedSetupUpdateUi() {
  const { chart, setup } = findPumpChartSetup(
    activePumpChartEdit?.chartId,
    activePumpChartEdit?.setupId
  );

  if (!activePumpChartEdit || !chart || !setup) {
    activePumpChartEdit = null;
    setLoadedSetupUpdateButtonsVisible(false);
    return;
  }

  const currentInputs = getCurrentComparablePumpChartInputs();
  const isModified = haveComparablePumpChartInputsChanged(
    activePumpChartEdit.originalInputs,
    currentInputs
  );
  const hasMatchingMode = currentInputs.mode === activePumpChartEdit.originalInputs.mode;

  setLoadedSetupUpdateButtonsVisible(isModified && hasMatchingMode);
}

function getCurrentComparablePumpChartInputs() {
  return getComparablePumpChartInputs(
    extractInputsFromLegacyPreset({
      ...buildPresetData(),
      mode: state.mode
    })
  );
}

function getComparablePumpChartInputs(inputs = {}) {
  const mode = inputs.mode || "";
  const commonInputs = {
    mode,
    useCustomCoefficient: !!inputs.useCustomCoefficient,
    customCoefficient: inputs.customCoefficient || ""
  };

  if (mode === "splitLay") {
    return {
      ...commonInputs,
      splitLay: normalizePumpChartComparableValue(inputs.splitLay || DEFAULT_STATE.splitLay)
    };
  }

  if (mode === "standpipeOps") {
    return {
      ...commonInputs,
      standpipeOps: normalizePumpChartComparableValue(
        inputs.standpipeOps || DEFAULT_STATE.standpipeOps
      )
    };
  }

  if (mode === "relay") {
    return {
      ...commonInputs,
      targetGpm: inputs.targetGpm || "",
      relayResidualPressure: inputs.relayResidualPressure || "30",
      hoseLength: inputs.hoseLength || "",
      hoseSize: inputs.hoseSize || ""
    };
  }

  if (mode === "apparatusMounted") {
    return {
      ...commonInputs,
      hoseLength: inputs.hoseLength || "",
      hoseSize: inputs.hoseSize || "",
      nozzleType: normalizeNozzleType(inputs.nozzleType) || "",
      nozzlePressure: inputs.nozzlePressure || "",
      customNozzlePressure: inputs.customNozzlePressure || "",
      ratedFlow: inputs.ratedFlow || "",
      ratedPressure: inputs.ratedPressure || "",
      smoothboreTip: inputs.smoothboreTip || "",
      bladeModel: inputs.bladeModel || "blade160",
      masterStreamType: normalizeNozzleType(inputs.masterStreamType) || "automaticFog",
      masterStreamLoss: inputs.masterStreamLoss || "25",
      apparatusFogFlow: inputs.apparatusFogFlow || "1000",
      apparatusCustomFogFlow: inputs.apparatusCustomFogFlow || "",
      apparatusElevation: inputs.apparatusElevation || "",
      applianceLoss: inputs.applianceLoss || "0"
    };
  }

  return {
    mode: inputs.mode || "",
    pdp: inputs.pdp || "",
    targetGpm: inputs.targetGpm || "",
    hoseLength: inputs.hoseLength || "",
    hoseSize: inputs.hoseSize || "",
    nozzleType: normalizeNozzleType(inputs.nozzleType) || "",
    nozzlePressure: inputs.nozzlePressure || "",
    customNozzlePressure: inputs.customNozzlePressure || "",
    ratedFlow: inputs.ratedFlow || "",
    ratedPressure: inputs.ratedPressure || "",
    smoothboreTip: inputs.smoothboreTip || "",
    bladeModel: inputs.bladeModel || "blade160",
    masterStreamType: normalizeNozzleType(inputs.masterStreamType) || "automaticFog",
    masterStreamLoss: inputs.masterStreamLoss || "25",
    dualLineSupply: !!inputs.dualLineSupply,
    applianceLoss: inputs.applianceLoss || "0",
    henTurboEnabled: !!inputs.henTurboEnabled,
    reverseSupplyEnabled: !!inputs.reverseSupplyEnabled,
    reverseSupplyLength: inputs.reverseSupplyLength || "",
    reverseSupplyHoseSize: inputs.reverseSupplyHoseSize || "3",
    reverseSupplyAppliance: inputs.reverseSupplyAppliance || "gateValve",
    useCustomCoefficient: !!inputs.useCustomCoefficient,
    customCoefficient: inputs.customCoefficient || ""
  };
}

function normalizePumpChartComparableValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizePumpChartComparableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = normalizePumpChartComparableValue(value[key]);
        return normalized;
      }, {});
  }

  return value;
}

function getStableJsonString(value) {
  return JSON.stringify(normalizePumpChartComparableValue(value));
}

function haveComparablePumpChartInputsChanged(originalInputs = {}, currentInputs = {}) {
  const normalizedOriginal = normalizePumpChartComparableValue(originalInputs);
  const normalizedCurrent = normalizePumpChartComparableValue(currentInputs);
  const keys = new Set([
    ...Object.keys(normalizedOriginal || {}),
    ...Object.keys(normalizedCurrent || {})
  ]);

  return [...keys].some(key =>
    getStableJsonString(normalizedOriginal?.[key]) !==
    getStableJsonString(normalizedCurrent?.[key])
  );
}

function scheduleLoadedSetupUpdateSync() {
  if (!activePumpChartEdit) return;

  window.requestAnimationFrame(() => {
    syncLoadedSetupUpdateUi();
  });
}

function generatePumpChartId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowIsoString() {
  return new Date().toISOString();
}

function formatPumpChartDate(value) {
  if (!value) return "Not updated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function normalizePumpChartData(rawData) {
  const charts = Array.isArray(rawData?.charts) ? rawData.charts : [];

  return {
    version: 2,
    charts: charts.map(chart => ({
      id: chart.id || generatePumpChartId("chart"),
      name: String(chart.name || "Untitled Pump Chart").trim() || "Untitled Pump Chart",
      department: String(chart.department || "").trim(),
      notes: String(chart.notes || "").trim(),
      createdAt: chart.createdAt || nowIsoString(),
      updatedAt: chart.updatedAt || chart.createdAt || nowIsoString(),
      setups: Array.isArray(chart.setups)
        ? chart.setups.map(setup => normalizePumpChartSetup(setup))
        : []
    }))
  };
}

function normalizePumpChartSetup(setup) {
  const inputs = setup.inputs || extractInputsFromLegacyPreset(setup);
  const result = setup.result || extractResultFromLegacyPreset(setup);
  const mode = setup.mode || inputs.mode || "";
  const normalizedInputs = {
    ...inputs,
    mode,
    ...(mode === "standpipeOps" && !inputs.standpipeOps && setup.standpipeOps
      ? { standpipeOps: JSON.parse(JSON.stringify(setup.standpipeOps)) }
      : {})
  };
  normalizeStateNozzleTypes(normalizedInputs);

  return {
    id: setup.id || generatePumpChartId("setup"),
    name: String(setup.name || "Untitled Setup").trim() || "Untitled Setup",
    mode,
    modeLabel: setup.modeLabel || getModeLabel(mode),
    notes: String(setup.notes || "").trim(),
    createdAt: setup.createdAt || nowIsoString(),
    updatedAt: setup.updatedAt || setup.createdAt || nowIsoString(),
    inputs: JSON.parse(JSON.stringify(normalizedInputs)),
    result: JSON.parse(JSON.stringify(result || {})),
    warnings: Array.isArray(setup.warnings) ? [...setup.warnings] : []
  };
}

function loadPumpCharts() {
  try {
    const saved = localStorage.getItem(PUMP_CHARTS_KEY);
    if (saved) {
      const data = normalizePumpChartData(JSON.parse(saved));
      localStorage.setItem(PUMP_CHARTS_KEY, JSON.stringify(data));
      return data;
    }
  } catch {}

  const migratedData = migrateLegacyPumpChartPresets();
  localStorage.setItem(PUMP_CHARTS_KEY, JSON.stringify(migratedData));
  return migratedData;
}

function savePumpCharts(data) {
  if (!isProUser()) {
    openProModal();
    return false;
  }

  localStorage.setItem(PUMP_CHARTS_KEY, JSON.stringify(normalizePumpChartData(data)));
  return true;
}

function migrateLegacyPumpChartPresets() {
  let oldPresets = [];

  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    oldPresets = saved ? JSON.parse(saved) : [];
  } catch {
    oldPresets = [];
  }

  if (!Array.isArray(oldPresets) || !oldPresets.length) {
    return { version: 2, charts: [] };
  }

  const timestamp = nowIsoString();

  return {
    version: 2,
    charts: [
      {
        id: generatePumpChartId("chart"),
        name: "Imported Setups",
        department: "",
        notes: "Created from saved Pump Chart setups.",
        createdAt: timestamp,
        updatedAt: timestamp,
        setups: oldPresets.map(preset =>
          normalizePumpChartSetup({
            ...preset,
            modeLabel: getModeLabel(preset.mode),
            createdAt: timestamp,
            updatedAt: timestamp,
            inputs: extractInputsFromLegacyPreset(preset),
            result: extractResultFromLegacyPreset(preset)
          })
        )
      }
    ]
  };
}

function extractInputsFromLegacyPreset(preset = {}) {
  return {
    mode: preset.mode || "",
    pdp: preset.pdp || "",
    targetGpm: preset.targetGpm || preset.targetFlow || "",
    relayResidualPressure:
      preset.relayResidualPressure || (preset.mode === "relay" ? "30" : ""),
    hoseLength: preset.hoseLength || "",
    hoseSize: preset.hoseSize || "",
    nozzleType: normalizeNozzleType(preset.nozzleType) || "",
    nozzlePressure: preset.nozzlePressure || "",
    customNozzlePressure: preset.customNozzlePressure || "",
    ratedFlow: preset.ratedFlow || "",
    ratedPressure: preset.ratedPressure || "",
    smoothboreTip: preset.smoothboreTip || "",
    bladeModel: preset.bladeModel || "blade160",
    masterStreamType: normalizeNozzleType(preset.masterStreamType) || "automaticFog",
    masterStreamLoss: preset.masterStreamLoss || "25",
    dualLineSupply: !!preset.dualLineSupply,
    apparatusFogFlow: preset.apparatusFogFlow || "1000",
    apparatusCustomFogFlow: preset.apparatusCustomFogFlow || "",
    apparatusElevation: preset.apparatusElevation || "",
    applianceLoss: preset.applianceLoss || "0",
    henTurboEnabled: !!preset.henTurboEnabled,
    reverseSupplyEnabled: !!preset.reverseSupplyEnabled,
    reverseSupplyLength: preset.reverseSupplyLength || "",
    reverseSupplyHoseSize: preset.reverseSupplyHoseSize || "3",
    reverseSupplyAppliance: preset.reverseSupplyAppliance || "gateValve",
    useCustomCoefficient: !!preset.useCustomCoefficient,
    customCoefficient: preset.customCoefficient || "",
    splitLay: JSON.parse(JSON.stringify(preset.splitLay || DEFAULT_STATE.splitLay)),
    standpipeOps: JSON.parse(JSON.stringify(preset.standpipeOps || DEFAULT_STATE.standpipeOps))
  };
}

function extractResultFromLegacyPreset(preset = {}) {
  return {
    primaryResult: preset.calculatedPdp ? `${preset.calculatedPdp} PSI` : "",
    primaryResultLabel: preset.mode === "reverse" ? "Pump Discharge Pressure" : "Required PDP",
    calculatedPdp: preset.calculatedPdp || "",
    calculatedFlow: preset.calculatedFlow || "",
    summary: buildLegacyPresetSummary(preset)
  };
}

function getModeLabel(mode) {
  if (mode === "requiredPdp") return "Required PDP";
  if (mode === "relay") return "Relay Pumping";
  if (mode === "splitLay") return "Split Lay";
  if (mode === "standpipeOps") return "Standpipe Ops";
  if (mode === "apparatusMounted") return "Apparatus Mounted";
  return "Reverse Flow";
}

function findPumpChart(chartId) {
  return loadPumpCharts().charts.find(chart => chart.id === chartId) || null;
}

function findPumpChartSetup(chartId, setupId) {
  const chart = findPumpChart(chartId);
  if (!chart) return { chart: null, setup: null };

  return {
    chart,
    setup: chart.setups.find(item => item.id === setupId) || null
  };
}

function getLastViewedPumpChartId() {
  try {
    return localStorage.getItem(LAST_VIEWED_PUMP_CHART_KEY) || "";
  } catch {
    return "";
  }
}

function setLastViewedPumpChartId(chartId) {
  if (!chartId) return;

  try {
    localStorage.setItem(LAST_VIEWED_PUMP_CHART_KEY, chartId);
  } catch {}
}

function clearLastViewedPumpChartId(chartId) {
  if (!chartId || getLastViewedPumpChartId() !== chartId) return;

  try {
    localStorage.removeItem(LAST_VIEWED_PUMP_CHART_KEY);
  } catch {}
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
    profileName: libraryHose.profileName || "",
    manufacturer: libraryHose.manufacturer,
    model: libraryHose.model,
    sourceModel: libraryHose.sourceModel || libraryHose.model || "",
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
  hoseLibraryRows = [];
}

function getHoseLibraryRows() {
  return loadCustomHoseProfiles();
}

function loadCustomHoseProfiles() {
  try {
    const saved = localStorage.getItem(CUSTOM_HOSE_PROFILES_KEY);
    const profiles = saved ? JSON.parse(saved) : [];
    return Array.isArray(profiles)
      ? profiles.map(normalizeHoseProfile)
      : [];
  } catch {
    return [];
  }
}

function saveCustomHoseProfiles(customHoses) {
  localStorage.setItem(
    CUSTOM_HOSE_PROFILES_KEY,
    JSON.stringify(customHoses.map(normalizeHoseProfile))
  );
}

function normalizeHoseProfile(profile = {}) {
  const manufacturer = String(profile.manufacturer || "").trim();
  const model = String(profile.model || profile.sourceModel || "").trim();
  const profileName = String(
    profile.profileName ||
    profile.name ||
    [manufacturer, model].filter(Boolean).join(" ") ||
    "Custom Hose Profile"
  ).trim();

  return {
    ...profile,
    id: profile.id || `custom-hose-${Date.now()}`,
    profileName,
    manufacturer,
    model,
    sourceModel: String(profile.sourceModel || model || "").trim(),
    tradeSize: profile.tradeSize || "",
    appHoseId: profile.appHoseId || "",
    chargedId50: profile.chargedId50 ?? null,
    chargedId150: profile.chargedId150 ?? null,
    coefficient: profile.coefficient ?? null,
    referenceUrl: profile.referenceUrl || "",
    notes: profile.notes || "",
    custom: true,
    customUse: profile.customUse || profile.use || "both",
    sourceType: profile.sourceType || (profile.referenceUrl ? "manufacturer-reference" : "custom")
  };
}

function getHoseProfileDisplayName(profile = {}) {
  return String(
    profile.profileName ||
    [profile.manufacturer, profile.model].filter(Boolean).join(" ") ||
    "Custom Hose Profile"
  ).trim();
}

function getCustomHoseUseLabel(useValue) {
  if (useValue === "attack") return "Attack";
  if (useValue === "supply") return "Supply";

  return "Supply / Attack";
}

function populateCustomHoseSizeOptions() {
  if (!els.customHoseSize) return;

  const hoseOptions = getVisibleHoseOptions(
    HOSE_OPTIONS.filter(hose =>
      ATTACK_HOSE_IDS.includes(hose.id) ||
      SUPPLY_HOSE_IDS.includes(hose.id)
    ),
    els.customHoseSize.value
  );

  els.customHoseSize.innerHTML = hoseOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hose.label)}</option>`
  )).join("");
}

function clearCustomHoseForm() {
  if (els.customHoseProfileName) els.customHoseProfileName.value = "";
  if (els.customHoseManufacturer) els.customHoseManufacturer.value = "";
  if (els.customHoseModel) els.customHoseModel.value = "";
  if (els.customHoseCoefficient) els.customHoseCoefficient.value = "";
  if (els.customHoseChargedId50) els.customHoseChargedId50.value = "";
  if (els.customHoseChargedId150) els.customHoseChargedId150.value = "";
  if (els.customHoseNotes) els.customHoseNotes.value = "";
  if (els.customHoseUse) els.customHoseUse.value = "both";
}

function createCustomHoseProfile() {
  const selectedHose = getHoseOptionById(els.customHoseSize?.value);
  const profileName = els.customHoseProfileName?.value.trim();
  const manufacturer =
    els.customHoseManufacturer?.value.trim() || "";
  const model = els.customHoseModel?.value.trim();
  const coefficient = numberOrNull(els.customHoseCoefficient?.value);
  const chargedId50 = numberOrNull(els.customHoseChargedId50?.value);
  const chargedId150 = numberOrNull(els.customHoseChargedId150?.value);
  const notes = els.customHoseNotes?.value.trim() || "";
  const useValue = els.customHoseUse?.value || "both";

  if (!selectedHose || !profileName) {
    alert("Enter a profile name and hose size.");
    return;
  }

  if (coefficient === null || coefficient <= 0) {
    alert("Enter a valid hose coefficient greater than 0.");
    return;
  }

  const customHoses = loadCustomHoseProfiles();
  const newHose = {
    id: `custom-hose-${Date.now()}`,
    profileName,
    manufacturer,
    model,
    sourceModel: model,
    tradeSize: selectedHose.label,
    appHoseId: selectedHose.id,
    chargedId50,
    chargedId150,
    coefficient,
    referenceUrl: "",
    notes,
    custom: true,
    customUse: useValue,
    sourceType: "custom"
  };

  customHoses.push(newHose);
  saveCustomHoseProfiles(customHoses);
  clearCustomHoseForm();
  populateHoseLibraryFilter();
  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderVisibleHoseSizes();

  alert(`${profileName} was added to My Hose Profiles.`);
}

function deleteCustomHoseProfile(customHoseId) {
  const customHoses = loadCustomHoseProfiles();
  const customHose = customHoses.find(hose => hose.id === customHoseId);

  if (!customHose) {
    alert("This hose profile could not be found.");
    return;
  }

  const confirmed = confirm(
    `Delete ${getHoseProfileDisplayName(customHose)} from My Hose Profiles?`
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
  renderVisibleHoseSizes();

  alert(`${getHoseProfileDisplayName(customHose)} was deleted.`);
}

function editCustomHoseProfile(customHoseId) {
  const customHoses = loadCustomHoseProfiles();
  const customHoseIndex = customHoses.findIndex(hose => hose.id === customHoseId);

  if (customHoseIndex === -1) {
    alert("This hose profile could not be found.");
    return;
  }

  const currentHose = customHoses[customHoseIndex];
  const profileName = prompt("Profile name:", getHoseProfileDisplayName(currentHose));
  if (profileName === null) return;

  const coefficientText = prompt("Coefficient:", currentHose.coefficient ?? "");
  if (coefficientText === null) return;

  const coefficient = numberOrNull(coefficientText);
  if (coefficient === null || coefficient <= 0) {
    alert("Enter a valid hose coefficient greater than 0.");
    return;
  }

  const manufacturer = prompt("Manufacturer:", currentHose.manufacturer || "");
  if (manufacturer === null) return;

  const sourceModel = prompt("Source product / model:", currentHose.sourceModel || currentHose.model || "");
  if (sourceModel === null) return;

  const chargedId50Text = prompt("Charged ID @50:", currentHose.chargedId50 ?? "");
  if (chargedId50Text === null) return;

  const chargedId150Text = prompt("Charged ID @150:", currentHose.chargedId150 ?? "");
  if (chargedId150Text === null) return;

  const notes = prompt("Notes:", currentHose.notes || "");
  if (notes === null) return;

  const updatedHose = normalizeHoseProfile({
    ...currentHose,
    profileName: profileName.trim() || getHoseProfileDisplayName(currentHose),
    manufacturer: manufacturer.trim(),
    model: sourceModel.trim(),
    sourceModel: sourceModel.trim(),
    coefficient,
    chargedId50: numberOrNull(chargedId50Text),
    chargedId150: numberOrNull(chargedId150Text),
    notes: notes.trim()
  });

  customHoses[customHoseIndex] = updatedHose;
  saveCustomHoseProfiles(customHoses);

  if (updatedHose.appHoseId) {
    const defaultProfile = getDefaultHoseProfile(updatedHose.appHoseId);

    if (defaultProfile?.id === updatedHose.id) {
      saveHoseLibrarySelection(updatedHose.appHoseId, updatedHose);
      saveDefaultHoseProfile(updatedHose.appHoseId, {
        ...updatedHose,
        use: getHoseLibraryUseLabel(updatedHose)
      });
    }
  }

  if (els.calculatorView) {
    populateHoseOptions();
    els.hoseSize.value = state.hoseSize;
    syncCoefficientUi();
    updateCalculator();
  }

  renderHoseLibrary();
  renderDefaultHoseSelections();
  renderVisibleHoseSizes();
  alert(`${getHoseProfileDisplayName(updatedHose)} was updated.`);
}

  function hoseOptionLabel(hose) {
  const activeCoefficient = getActiveHoseCoefficient(hose.id);
  const defaultProfile = getDefaultHoseProfile(hose.id);

  if (defaultProfile) {
    return `${hose.label} — ${getHoseProfileDisplayName(defaultProfile)} — Calculation C ${activeCoefficient}`;
  }

  const coefficientLabel = isModifiedHoseCoefficient(hose.id)
    ? `CUSTOM C ${activeCoefficient}`
    : `Calculation C ${activeCoefficient}`;

  return `${hose.label} — ${coefficientLabel}`;
}

function populateHoseOptions() {
  const hoseOptions = getVisibleHoseOptions(
    isRelayMode()
    ? RELAY_HOSE_OPTIONS
      : HOSE_OPTIONS,
    state.hoseSize
  );

  els.hoseSize.innerHTML = hoseOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
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

const standpipeSupplyHose =
  document.getElementById("standpipeSupplyHose");

const standpipeAttack1Hose =
  document.getElementById("standpipeAttack1Hose");

const standpipeAttack2Hose =
  document.getElementById("standpipeAttack2Hose");

const supplyOptions = HOSE_OPTIONS.filter(hose =>
  SUPPLY_HOSE_IDS.includes(hose.id)
);

if (reverseSupplyHose) {
  const reverseSupplyOptions = getVisibleHoseOptions(
    supplyOptions,
    state.reverseSupplyHoseSize
  );

  reverseSupplyHose.innerHTML = reverseSupplyOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  reverseSupplyHose.value =
    state.reverseSupplyHoseSize || "3";
}

const attackOptions = HOSE_OPTIONS.filter(hose =>
  ATTACK_HOSE_IDS.includes(hose.id)
);

if (splitSupplyHose) {
  const visibleOptions = getVisibleHoseOptions(
    supplyOptions,
    state.splitLay.supplyHoseSize
  );

  splitSupplyHose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  splitSupplyHose.value =
    state.splitLay.supplyHoseSize;
}

if (splitSupply2Hose) {
  const visibleOptions = getVisibleHoseOptions(
    supplyOptions,
    state.splitLay.supply2HoseSize
  );

  splitSupply2Hose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  splitSupply2Hose.value =
    state.splitLay.supply2HoseSize;
}

if (splitAttack1Hose) {
  const visibleOptions = getVisibleHoseOptions(
    attackOptions,
    state.splitLay.attack1HoseSize
  );

  splitAttack1Hose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  splitAttack1Hose.value =
    state.splitLay.attack1HoseSize;
}

if (splitAttack2Hose) {
  const visibleOptions = getVisibleHoseOptions(
    attackOptions,
    state.splitLay.attack2HoseSize
  );

  splitAttack2Hose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  splitAttack2Hose.value =
    state.splitLay.attack2HoseSize;
}

if (standpipeSupplyHose) {
  const visibleOptions = getVisibleHoseOptions(
    supplyOptions,
    state.standpipeOps.supplyHoseSize
  );

  standpipeSupplyHose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  standpipeSupplyHose.value =
    state.standpipeOps.supplyHoseSize;
}

if (standpipeAttack1Hose) {
  const visibleOptions = getVisibleHoseOptions(
    attackOptions,
    state.standpipeOps.attack1HoseSize
  );

  standpipeAttack1Hose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  standpipeAttack1Hose.value =
    state.standpipeOps.attack1HoseSize;
}

if (standpipeAttack2Hose) {
  const visibleOptions = getVisibleHoseOptions(
    attackOptions,
    state.standpipeOps.attack2HoseSize
  );

  standpipeAttack2Hose.innerHTML = visibleOptions.map(hose => (
    `<option value="${escapeHtml(hose.id)}">${escapeHtml(hoseOptionLabel(hose))}</option>`
  )).join("");

  standpipeAttack2Hose.value =
    state.standpipeOps.attack2HoseSize;
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

  if (defaultProfile?.sourceType === "manufacturer-reference") return "Manufacturer-derived profile";
  if (defaultProfile?.custom) return "My Hose Profiles";
  if (defaultProfile) return "My Hose Profiles";

  const savedCoefficients = loadSavedHoseCoefficients();

  if (savedCoefficients[hoseId] !== undefined) return "Custom override";

  return "Built-in";
}

function getDefaultHoseDisplayName(hose) {
  const defaultProfile = getDefaultHoseProfile(hose.id);

  if (defaultProfile) {
    return getHoseProfileDisplayName(defaultProfile);
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
        ? `<p class="helper">Use: ${escapeHtml(defaultProfile.use || "Profile")} • Profile ID: ${escapeHtml(defaultProfile.id)}</p>`
        : "";
      const defaultHoseText = defaultProfile
        ? getHoseProfileDisplayName(defaultProfile)
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
  renderVisibleHoseSizes();
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

function renderEquipmentVisibilityList({
  container,
  options,
  visibleIds,
  inputName
}) {
  if (!container) return;

  const visibleIdSet = new Set(visibleIds.map(id => String(id)));

  container.innerHTML = options.map(option => {
    const optionId = String(option.id);
    const isChecked = visibleIdSet.has(optionId);

    return `
      <label class="default-hose-selection-card equipment-visibility-card">
        <span>
          <strong>${escapeHtml(option.label)}</strong>
          <span class="helper">${isChecked ? "Visible in dropdowns" : "Hidden from normal dropdowns"}</span>
        </span>
        <input
          type="checkbox"
          name="${escapeHtml(inputName)}"
          value="${escapeHtml(optionId)}"
          ${isChecked ? "checked" : ""}
          data-option-label="${escapeHtml(option.label)}"
        />
      </label>
    `;
  }).join("");
}

function renderVisibleHoseSizes() {
  renderEquipmentVisibilityList({
    container: els.visibleHoseSizesList,
    options: getSupportedHoseOptions(),
    visibleIds: loadVisibleHoseSizeIds(),
    inputName: "visibleHoseSizes"
  });

  bindVisibleHoseSizeEvents();
}

function renderVisibleSmoothboreTips() {
  renderEquipmentVisibilityList({
    container: els.visibleSmoothboreTipsList,
    options: SMOOTHBORE_TIPS,
    visibleIds: loadVisibleSmoothboreTipIds(),
    inputName: "visibleSmoothboreTips"
  });

  bindVisibleSmoothboreTipEvents();
}

function refreshEquipmentVisibilityDisplays() {
  populateCustomHoseSizeOptions();
  renderVisibleHoseSizes();
  renderVisibleSmoothboreTips();

  if (els.calculatorView) {
    populateHoseOptions();
    populateSmoothboreTips();
    syncInputsFromState();
    syncSplitLayInputsFromState();
    syncStandpipeInputsFromState();
    syncSmoothboreUi();
    syncModeUi();
    calculateAndRender();
  }
}

function getFirstVisibleEquipmentId(options, type) {
  const visibleOptions = type === "hose"
    ? getVisibleHoseOptions(options)
    : getVisibleSmoothboreTipOptions(options);

  return visibleOptions[0]?.id || "";
}

function resolveVisibleEquipmentDefault(preferredId, options, type) {
  const visibleOptions = type === "hose"
    ? getVisibleHoseOptions(options)
    : getVisibleSmoothboreTipOptions(options);

  if (visibleOptions.some(option => option.id === preferredId)) {
    return preferredId;
  }

  return visibleOptions[0]?.id || preferredId;
}

function resolveVisibleHoseDefault(preferredId, options) {
  return resolveVisibleEquipmentDefault(preferredId, options, "hose");
}

function resolveVisibleSmoothboreTipDefault(preferredId, options) {
  return resolveVisibleEquipmentDefault(preferredId, options, "tip");
}

function getSupplyHoseOptions() {
  return HOSE_OPTIONS.filter(hose =>
    SUPPLY_HOSE_IDS.includes(hose.id)
  );
}

function getAttackHoseOptions() {
  return HOSE_OPTIONS.filter(hose =>
    ATTACK_HOSE_IDS.includes(hose.id)
  );
}

function getModeHoseOptions(mode = state.mode) {
  return mode === "relay"
    ? RELAY_HOSE_OPTIONS
    : HOSE_OPTIONS;
}

function getHandlineSmoothboreTipOptions() {
  return SMOOTHBORE_TIPS.filter(tip =>
    tip.diameter >= 0.75 &&
    tip.diameter <= 1.25
  );
}

function getMainSmoothboreTipOptions() {
  return isMasterStream() || isApparatusMountedMode()
    ? SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 1.25 &&
        tip.diameter <= 3
      )
    : getHandlineSmoothboreTipOptions();
}

function getVisibleDefaultSplitLayState() {
  return {
    ...DEFAULT_STATE.splitLay,
    supplyHoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.splitLay.supplyHoseSize,
      getSupplyHoseOptions()
    ),
    supply2HoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.splitLay.supply2HoseSize,
      getSupplyHoseOptions()
    ),
    attack1HoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.splitLay.attack1HoseSize,
      getAttackHoseOptions()
    ),
    attack2HoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.splitLay.attack2HoseSize,
      getAttackHoseOptions()
    ),
    attack1SmoothboreTip: DEFAULT_STATE.splitLay.attack1SmoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.splitLay.attack1SmoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : "",
    attack2SmoothboreTip: DEFAULT_STATE.splitLay.attack2SmoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.splitLay.attack2SmoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : ""
  };
}

function getVisibleDefaultStandpipeOpsState() {
  return {
    ...DEFAULT_STATE.standpipeOps,
    supplyHoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.standpipeOps.supplyHoseSize,
      getSupplyHoseOptions()
    ),
    attack1HoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.standpipeOps.attack1HoseSize,
      getAttackHoseOptions()
    ),
    attack2HoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.standpipeOps.attack2HoseSize,
      getAttackHoseOptions()
    ),
    attack1SmoothboreTip: DEFAULT_STATE.standpipeOps.attack1SmoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.standpipeOps.attack1SmoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : "",
    attack2SmoothboreTip: DEFAULT_STATE.standpipeOps.attack2SmoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.standpipeOps.attack2SmoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : ""
  };
}

function replaceHiddenDefaultValue(target, key, hiddenId, options, type) {
  if (!target || target[key] !== hiddenId) return false;

  const fallbackId = getFirstVisibleEquipmentId(options, type);
  if (!fallbackId) return false;

  target[key] = fallbackId;
  return true;
}

function reconcileHoseDefaultsAfterVisibilityChange(hiddenId) {
  const supplyOptions = getSupplyHoseOptions();
  const attackOptions = getAttackHoseOptions();
  let changed = false;

  changed = replaceHiddenDefaultValue(DEFAULT_STATE, "hoseSize", hiddenId, HOSE_OPTIONS, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE, "reverseSupplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "supplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "supply2HoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "attack1HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "attack2HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.standpipeOps, "supplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.standpipeOps, "attack1HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.standpipeOps, "attack2HoseSize", hiddenId, attackOptions, "hose") || changed;

  changed = replaceHiddenDefaultValue(state, "hoseSize", hiddenId, getModeHoseOptions(), "hose") || changed;
  changed = replaceHiddenDefaultValue(state, "reverseSupplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "supplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "supply2HoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "attack1HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "attack2HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.standpipeOps, "supplyHoseSize", hiddenId, supplyOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.standpipeOps, "attack1HoseSize", hiddenId, attackOptions, "hose") || changed;
  changed = replaceHiddenDefaultValue(state.standpipeOps, "attack2HoseSize", hiddenId, attackOptions, "hose") || changed;

  if (changed) {
    saveState();
  }

  return changed;
}

function reconcileSmoothboreDefaultsAfterVisibilityChange(hiddenId) {
  const handlineTips = getHandlineSmoothboreTipOptions();
  let changed = false;

  changed = replaceHiddenDefaultValue(DEFAULT_STATE, "smoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "attack1SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.splitLay, "attack2SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.standpipeOps, "attack1SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(DEFAULT_STATE.standpipeOps, "attack2SmoothboreTip", hiddenId, handlineTips, "tip") || changed;

  changed = replaceHiddenDefaultValue(state, "smoothboreTip", hiddenId, getMainSmoothboreTipOptions(), "tip") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "attack1SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(state.splitLay, "attack2SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(state.standpipeOps, "attack1SmoothboreTip", hiddenId, handlineTips, "tip") || changed;
  changed = replaceHiddenDefaultValue(state.standpipeOps, "attack2SmoothboreTip", hiddenId, handlineTips, "tip") || changed;

  if (changed) {
    saveState();
  }

  return changed;
}

function bindEquipmentVisibilityEvents({
  container,
  saveIds,
  render,
  refresh,
  reconcile
}) {
  if (!container) return;

  container
    .querySelectorAll('input[type="checkbox"]')
    .forEach(input => {
      input.addEventListener("change", () => {
        const wasHidden = !input.checked;

        const selectedIds = [...container.querySelectorAll('input[type="checkbox"]:checked')]
          .map(item => item.value);

        saveIds(selectedIds);
        const defaultsChanged = wasHidden && reconcile(input.value);
        render();
        refresh();

        if (wasHidden && defaultsChanged) {
          alert(`${input.dataset.optionLabel} was hidden. Affected defaults were updated.`);
        }
      });
    });
}

function bindVisibleHoseSizeEvents() {
  bindEquipmentVisibilityEvents({
    container: els.visibleHoseSizesList,
    saveIds: saveVisibleHoseSizeIds,
    render: renderVisibleHoseSizes,
    refresh: refreshEquipmentVisibilityDisplays,
    reconcile: reconcileHoseDefaultsAfterVisibilityChange
  });
}

function bindVisibleSmoothboreTipEvents() {
  bindEquipmentVisibilityEvents({
    container: els.visibleSmoothboreTipsList,
    saveIds: saveVisibleSmoothboreTipIds,
    render: renderVisibleSmoothboreTips,
    refresh: refreshEquipmentVisibilityDisplays,
    reconcile: reconcileSmoothboreDefaultsAfterVisibilityChange
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
  const sourceLink = hose.referenceUrl
    ? `<a href="${escapeHtml(hose.referenceUrl)}" target="_blank" rel="noopener">Source</a>`
    : "Local Profile";
  const coefficientText = hose.coefficient === null
    ? "Still gathering data"
    : `C ${formatLibraryValue(hose.coefficient)}`;
  const sourceMeta = [
    hose.manufacturer,
    hose.sourceModel || hose.model
  ].filter(Boolean).join(" ");

  return `
    <article class="hose-library-card${isSelected ? " active" : ""}">
      <div class="hose-library-card-header">
        <div>
          <strong>${escapeHtml(getHoseProfileDisplayName(hose))}</strong>
          <p class="helper">${escapeHtml(hose.tradeSize)}${appHose ? ` maps to ${escapeHtml(appHose.label)}` : " reference only"}</p>
          ${sourceMeta ? `<p class="helper">Source: ${escapeHtml(sourceMeta)}</p>` : ""}
          ${hose.notes ? `<p class="helper">Notes: ${escapeHtml(hose.notes)}</p>` : ""}
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
            class="small-button hose-library-edit-button"
            type="button"
            data-custom-hose-edit-id="${escapeHtml(hose.id)}"
          >
            Edit
          </button>
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
    `${libraryRows.length} hose ${libraryRows.length === 1 ? "profile" : "profiles"} shown. ${selectableCount} can be set as a local default.`;

  try {
    els.hoseLibraryList.innerHTML = libraryRows.length
      ? libraryRows.map(renderHoseLibraryCard).join("")
      : `
        <div class="disabled-note">
          Create a custom hose, or select one from the Hose Manufacturer reference library to add.
        </div>
      `;
  } catch (error) {
    console.error("[Reverse Flow] My Hose Profiles render failed.", error);
    els.hoseLibraryList.innerHTML = `
      <div class="disabled-note">
        My Hose Profiles could not render.
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
    .querySelectorAll("[data-custom-hose-edit-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        editCustomHoseProfile(button.dataset.customHoseEditId);
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
    alert("This hose profile cannot be selected as an app default.");
    return;
  }

  const appHose = getHoseOptionById(libraryHose.appHoseId);
  const confirmed = confirm(
    `Set ${getHoseProfileDisplayName(libraryHose)} as the default profile name for ${appHose.label} hose? Calculation coefficients will not change.`
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
  renderVisibleHoseSizes();

  alert(`${libraryHose.manufacturer} ${libraryHose.model} is now your default ${appHose.label} hose reference. Calculation coefficient unchanged: ${getActiveHoseCoefficient(libraryHose.appHoseId)}`);
}

    function populateSmoothboreTips() {
  const compatibleTips = isMasterStream() || isApparatusMountedMode()
    ? SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 1.25 &&
        tip.diameter <= 3
      )
    : SMOOTHBORE_TIPS.filter(tip =>
        tip.diameter >= 0.75 &&
        tip.diameter <= 1.25
      );
  const tips = getVisibleSmoothboreTipOptions(
    compatibleTips,
    state.smoothboreTip
  );

  els.smoothboreTip.innerHTML = tips.map(tip => (
    `<option value="${escapeHtml(tip.id)}">${escapeHtml(tip.label)}</option>`
  )).join("");

  if (!tips.some(tip => tip.id === state.smoothboreTip)) {
    state.smoothboreTip = tips[0]?.id || "";
    els.smoothboreTip.value = state.smoothboreTip;
  }
}

function populateSmoothboreTipSelect(selectElement, compatibleTips, selectedId) {
  if (!selectElement) return;

  const tips = getVisibleSmoothboreTipOptions(compatibleTips, selectedId);

  selectElement.innerHTML = tips.map(tip => (
    `<option value="${escapeHtml(tip.id)}">${escapeHtml(tip.label)}</option>`
  )).join("");

  selectElement.value = selectedId || "";
}

function populateSplitSmoothboreTipOptions(lineNumber) {
  populateSmoothboreTipSelect(
    document.getElementById(`splitAttack${lineNumber}SmoothboreTip`),
    SMOOTHBORE_TIPS.filter(tip =>
      tip.diameter >= 0.75 &&
      tip.diameter <= 1.25
    ),
    state.splitLay[`attack${lineNumber}SmoothboreTip`]
  );
}

function populateStandpipeSmoothboreTipOptions(lineNumber) {
  populateSmoothboreTipSelect(
    document.getElementById(`standpipeAttack${lineNumber}SmoothboreTip`),
    SMOOTHBORE_TIPS.filter(tip =>
      tip.diameter >= 0.75 &&
      tip.diameter <= 1.25
    ),
    state.standpipeOps[`attack${lineNumber}SmoothboreTip`]
  );
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
  if (!els.pumpChartList) return;

  if (pumpChartView.screen === "save") {
    renderSavePumpChartForm();
    return;
  }

  if (pumpChartView.screen === "detail" && pumpChartView.chartId) {
    renderPumpChartDetail(pumpChartView.chartId);
    return;
  }

  if (pumpChartView.screen === "setup" && pumpChartView.chartId && pumpChartView.setupId) {
    renderPumpChartSetupDetail(pumpChartView.chartId, pumpChartView.setupId);
    return;
  }

  renderPumpChartList();
}

function setPumpChartSubtitle(text) {
  if (els.pumpChartModalSubtitle) {
    els.pumpChartModalSubtitle.textContent = text;
  }
}

function renderPumpChartList() {
  const data = loadPumpCharts();
  pumpChartView = { screen: "list", chartId: null, setupId: null };
  setPumpChartSubtitle("Department pump chart reference cards and saved hydraulic setups.");

  if (!data.charts.length) {
    els.pumpChartList.innerHTML = `
      <div class="disabled-note">
        No Pump Charts saved yet.
      </div>
    `;
    return;
  }

  els.pumpChartList.innerHTML = data.charts.map(chart => `
    <div class="section-card pump-chart-card pump-chart-container-card">
      <div class="pump-chart-card-header">
        <div>
          <strong class="pump-chart-card-title">${escapeHtml(chart.name)}</strong>
          ${chart.department ? `<p class="pump-chart-meta">${escapeHtml(chart.department)}</p>` : ""}
        </div>
        <div class="pump-chart-card-badge">${chart.setups.length} Setups</div>
      </div>
      <div class="pump-chart-card-summary">
        Last updated ${escapeHtml(formatPumpChartDate(chart.updatedAt))}
      </div>
      <div class="pump-chart-card-summary pump-chart-card-subsummary">
        ${chart.setups.length} ${chart.setups.length === 1 ? "Setup" : "Setups"}
      </div>
      <div class="pump-chart-card-actions">
        <button class="small-button" type="button" onclick="openPumpChartDetail('${chart.id}')">Open</button>
        <button class="small-button" type="button" onclick="editPumpChartMetadata('${chart.id}')">Edit</button>
        <button class="small-button danger-button" type="button" onclick="deletePumpChart('${chart.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderPumpChartDetail(chartId, options = {}) {
  const chart = findPumpChart(chartId);
  if (!chart) {
    renderPumpChartList();
    return;
  }

  if (options.persist !== false) {
    setLastViewedPumpChartId(chartId);
  }

  pumpChartView = { screen: "detail", chartId, setupId: null };
  setPumpChartSubtitle("Printable department reference card.");

  const setupSection = chart.setups.length ? `
      <section class="pump-chart-document-section">
        ${chart.setups.map((setup, index) => renderPumpChartSetupRow(chart.id, setup, {
          canMoveUp: index > 0,
          canMoveDown: index < chart.setups.length - 1
        })).join("")}
      </section>
    ` : `
    <div class="disabled-note">
      No setups saved in this Pump Chart.
    </div>
  `;

  els.pumpChartList.innerHTML = `
    <div class="pump-chart-toolbar">
      <button class="small-button" type="button" onclick="showPumpChartsList()">Back</button>
      <button class="small-button" type="button" onclick="exportPumpChart('${chart.id}')">Export / Share</button>
    </div>
    <article class="pump-chart-document">
      <header class="pump-chart-document-header">
        <p>REVERSE FLOW PUMP CHART</p>
        <h2>${escapeHtml(chart.name)}</h2>
        ${chart.department ? `<strong>${escapeHtml(chart.department)}</strong>` : ""}
        <div class="pump-chart-document-meta">
          <span>${chart.setups.length} ${chart.setups.length === 1 ? "Setup" : "Setups"} • Updated ${escapeHtml(formatPumpChartDate(chart.updatedAt))}</span>
        </div>
        ${chart.notes ? `<p class="pump-chart-document-notes">${escapeHtml(chart.notes)}</p>` : ""}
      </header>
      ${setupSection}
    </article>
  `;
}

function renderPumpChartSetupRow(chartId, setup, options = {}) {
  const configSummary = getSetupConfigurationSummary(setup);
  const modeBadge = getSetupModeBadgeLabel(setup);
  const moveUpDisabled = options.canMoveUp ? "" : "disabled";
  const moveDownDisabled = options.canMoveDown ? "" : "disabled";
  const escapedChartId = escapeHtml(chartId);
  const escapedSetupId = escapeHtml(setup.id);

  return `
    <div class="pump-chart-setup-row">
      <div class="pump-chart-setup-primary">
        <strong class="pump-chart-setup-name">${escapeHtml(setup.name)}</strong>
        <p class="pump-chart-config-summary">${escapeHtml(configSummary)}</p>
      </div>
      <div class="pump-chart-setup-aside">
        <span class="pump-chart-mode-badge" data-mode="${escapeHtml(setup.mode || "")}">${escapeHtml(modeBadge)}</span>
        <div class="pump-chart-row-result">${escapeHtml(getSetupHydraulicSummary(setup))}</div>
      </div>
      <div class="pump-chart-row-actions">
        <button class="small-button pump-chart-load-button" type="button" onclick="loadPumpChartSetup('${escapedChartId}', '${escapedSetupId}')">Load</button>
        <details class="pump-chart-overflow">
          <summary aria-label="Setup actions" title="Setup actions">⋮</summary>
          <div class="pump-chart-overflow-menu">
            <button class="pump-chart-menu-action" type="button" onclick="movePumpChartSetup('${escapedChartId}', '${escapedSetupId}', 'up'); closePumpChartActionMenus();" ${moveUpDisabled}>Move Up</button>
            <button class="pump-chart-menu-action" type="button" onclick="movePumpChartSetup('${escapedChartId}', '${escapedSetupId}', 'down'); closePumpChartActionMenus();" ${moveDownDisabled}>Move Down</button>
            <button class="pump-chart-menu-action danger-button" type="button" onclick="deletePumpChartSetup('${escapedChartId}', '${escapedSetupId}'); closePumpChartActionMenus();">Delete</button>
          </div>
        </details>
      </div>
    </div>
  `;
}

function renderPumpChartSetupDetail(chartId, setupId) {
  const { chart, setup } = findPumpChartSetup(chartId, setupId);
  if (!chart || !setup) {
    renderPumpChartDetail(chartId);
    return;
  }

  pumpChartView = { screen: "setup", chartId, setupId };
  setPumpChartSubtitle("Saved hydraulic reference snapshot.");
  const referenceSections = getSetupReferenceSections(setup);

  els.pumpChartList.innerHTML = `
    <div class="pump-chart-toolbar">
      <button class="small-button" type="button" onclick="openPumpChartDetail('${chart.id}')">Back</button>
      <button class="small-button" type="button" onclick="loadPumpChartSetup('${chart.id}', '${setup.id}')">Load Into Calculator</button>
    </div>
    <article class="pump-chart-document">
      <header class="pump-chart-document-header">
        <p>SETUP REFERENCE CARD</p>
        <h2>${escapeHtml(setup.name)}</h2>
        <strong>${escapeHtml(chart.name)}</strong>
        <div class="pump-chart-document-meta">
          <span>${escapeHtml(setup.modeLabel || getModeLabel(setup.mode))}</span>
        </div>
      </header>

      <section class="pump-chart-reference-card">
        <h3>Operational Summary</h3>
        <strong class="pump-chart-reference-result">${escapeHtml(getSetupHydraulicSummary(setup))}</strong>
        <p class="pump-chart-reference-config">${escapeHtml(getSetupConfigurationSummary(setup))}</p>
        ${referenceSections.map(section => renderReferenceCardSection(section)).join("")}
      </section>

      ${setup.notes ? `<section class="pump-chart-document-section"><h3>NOTES</h3><p>${escapeHtml(setup.notes)}</p></section>` : ""}
      <details class="pump-chart-advanced-details">
        <summary>Show Full Calculation</summary>
        <div class="pump-chart-advanced-content">
          <div class="pump-chart-setup-detail-grid">
            <div>
              <p>Mode</p>
              <strong>${escapeHtml(setup.modeLabel || getModeLabel(setup.mode))}</strong>
            </div>
            <div>
              <p>Created</p>
              <strong>${escapeHtml(formatPumpChartDate(setup.createdAt))}</strong>
            </div>
            <div>
              <p>Updated</p>
              <strong>${escapeHtml(formatPumpChartDate(setup.updatedAt))}</strong>
            </div>
          </div>
          ${renderSetupDetailSection("Key Inputs", getSetupInputRows(setup))}
          ${renderSetupDetailSection("Calculation Breakdown", getSetupBreakdownRows(setup))}
          ${setup.warnings?.length ? renderSetupDetailSection("Warnings", setup.warnings.map(warning => ["Warning", warning])) : ""}
        </div>
      </details>
    </article>
  `;
}

function renderReferenceCardSection(section) {
  if (!section.rows.length) return "";

  return `
    <div class="pump-chart-reference-section">
      <h3>${escapeHtml(section.title)}</h3>
      ${section.rows.map(row => `
        <div class="pump-chart-reference-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSetupDetailSection(title, rows) {
  if (!rows.length) return "";

  return `
    <section class="pump-chart-document-section">
      <h3>${escapeHtml(title.toUpperCase())}</h3>
      <div class="pump-chart-detail-table">
        ${rows.map(([label, value]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || "-")}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSavePumpChartForm() {
  const data = loadPumpCharts();
  const firstChartId = data.charts[0]?.id || "";
  setPumpChartSubtitle("Save the current calculation into a Pump Chart.");

  els.pumpChartList.innerHTML = `
    <form class="pump-chart-save-form" id="pumpChartSaveForm">
      <div class="pump-chart-toolbar">
        <button class="small-button" type="button" onclick="showPumpChartsList()">Cancel</button>
      </div>

      <div class="field full">
        <label>Save Destination</label>
        <select id="pumpChartSaveMode">
          <option value="existing" ${data.charts.length ? "" : "disabled"}>Select Existing Pump Chart</option>
          <option value="new" ${data.charts.length ? "" : "selected"}>Create New Pump Chart</option>
        </select>
      </div>

      <div class="field full" id="pumpChartExistingField" ${data.charts.length ? "" : "hidden"}>
        <label>Existing Pump Chart</label>
        <select id="pumpChartExistingSelect">
          ${data.charts.map(chart => `<option value="${escapeHtml(chart.id)}" ${chart.id === firstChartId ? "selected" : ""}>${escapeHtml(chart.name)}</option>`).join("")}
        </select>
      </div>

      <div class="pump-chart-new-fields" id="pumpChartNewFields" ${data.charts.length ? "hidden" : ""}>
        <div class="field full">
          <label>Pump Chart Name</label>
          <input id="pumpChartNewName" type="text" placeholder="Engine 1" />
        </div>
        <div class="field full">
          <label>Department / Company</label>
          <input id="pumpChartNewDepartment" type="text" placeholder="Optional" />
        </div>
        <div class="field full">
          <label>Chart Notes</label>
          <textarea id="pumpChartNewNotes" rows="2" placeholder="Optional"></textarea>
        </div>
      </div>

      <div class="field full">
        <label>Setup Name</label>
        <input id="pumpChartSetupName" type="text" required placeholder="200' 1.88 Automatic Fog" />
      </div>

      <div class="field full">
        <label>Notes</label>
        <textarea id="pumpChartSetupNotes" rows="3" placeholder="Optional"></textarea>
      </div>

      <button class="small-button pump-chart-primary-action" type="submit">Save Setup</button>
    </form>
  `;

  const saveMode = document.getElementById("pumpChartSaveMode");
  const existingField = document.getElementById("pumpChartExistingField");
  const newFields = document.getElementById("pumpChartNewFields");

  saveMode?.addEventListener("change", () => {
    const creatingNewChart = saveMode.value === "new";
    if (existingField) existingField.hidden = creatingNewChart;
    if (newFields) newFields.hidden = !creatingNewChart;
  });

  document
    .getElementById("pumpChartSaveForm")
    ?.addEventListener("submit", event => {
      event.preventDefault();
      submitPumpChartSaveForm();
    });
}

function submitPumpChartSaveForm() {
  if (!isProUser()) {
    openProModal();
    return;
  }

  const setupName = document.getElementById("pumpChartSetupName")?.value.trim();
  const setupNotes = document.getElementById("pumpChartSetupNotes")?.value.trim() || "";
  const saveMode = document.getElementById("pumpChartSaveMode")?.value || "existing";

  if (!setupName) {
    alert("Setup Name is required.");
    return;
  }

  const data = loadPumpCharts();
  const timestamp = nowIsoString();
  let targetChart = null;

  if (saveMode === "new") {
    const chartName = document.getElementById("pumpChartNewName")?.value.trim();
    if (!chartName) {
      alert("Pump Chart Name is required.");
      return;
    }

    targetChart = {
      id: generatePumpChartId("chart"),
      name: chartName,
      department: document.getElementById("pumpChartNewDepartment")?.value.trim() || "",
      notes: document.getElementById("pumpChartNewNotes")?.value.trim() || "",
      createdAt: timestamp,
      updatedAt: timestamp,
      setups: []
    };
    data.charts.push(targetChart);
  } else {
    const chartId = document.getElementById("pumpChartExistingSelect")?.value;
    targetChart = data.charts.find(chart => chart.id === chartId);
    if (!targetChart) {
      alert("Select an existing Pump Chart or create a new one.");
      return;
    }
  }

  const setup = buildCurrentPumpChartSetup({
    name: setupName,
    notes: setupNotes,
    timestamp
  });

  targetChart.setups.push(setup);
  targetChart.updatedAt = timestamp;

  if (!savePumpCharts(data)) return;

  renderPresetOptions();
  clearPumpChartEditState();
  shouldScrollToTopAfterPumpChartSaveClose = true;
  pumpChartView = { screen: "detail", chartId: targetChart.id, setupId: null };
  renderPumpChart();
}

function updateActivePumpChartSetup() {
  if (!isProUser()) {
    openProModal();
    return;
  }

  if (!activePumpChartEdit) {
    alert("Load a saved Pump Chart setup before updating it.");
    return;
  }

  if (!hasValidRenderedCalculation()) {
    alert("Enter the required values to generate a valid calculation before updating this saved setup.");
    return;
  }

  const data = loadPumpCharts();
  const chart = data.charts.find(item => item.id === activePumpChartEdit.chartId);
  const setupIndex = chart?.setups.findIndex(item => item.id === activePumpChartEdit.setupId) ?? -1;

  if (!chart || setupIndex < 0) {
    clearPumpChartEditState();
    alert("This saved setup could not be found. Load it from Pump Chart again before updating.");
    return;
  }

  const existingSetup = chart.setups[setupIndex];
  const currentInputs = getCurrentComparablePumpChartInputs();

  if (
    getStableJsonString(currentInputs) ===
    getStableJsonString(activePumpChartEdit.originalInputs)
  ) {
    syncLoadedSetupUpdateUi();
    alert("No changes detected for the loaded setup.");
    return;
  }

  const confirmed = confirm(
    `Update "${existingSetup.name}" in ${chart.name}?\n\n` +
    "This will replace the saved Pump Chart setup with the current calculator values."
  );
  if (!confirmed) return;

  const timestamp = nowIsoString();
  const updatedSetup = buildCurrentPumpChartSetup({
    id: existingSetup.id,
    name: existingSetup.name,
    notes: existingSetup.notes,
    createdAt: existingSetup.createdAt,
    timestamp
  });

  chart.setups[setupIndex] = updatedSetup;
  chart.updatedAt = timestamp;

  if (!savePumpCharts(data)) return;

  renderPresetOptions();
  setPumpChartEditState(chart.id, updatedSetup.id);
  alert("Saved setup updated.");
}

function buildCurrentPumpChartSetup({ name, notes, timestamp, id, createdAt }) {
  const presetData = buildPresetData();
  const snapshot = captureCurrentResultSnapshot(presetData);

  return normalizePumpChartSetup({
    id: id || generatePumpChartId("setup"),
    name,
    mode: state.mode || "",
    modeLabel: getModeLabel(state.mode),
    notes,
    createdAt: createdAt || timestamp,
    updatedAt: timestamp,
    inputs: extractInputsFromLegacyPreset({
      ...presetData,
      mode: state.mode
    }),
    result: snapshot,
    warnings: getCurrentWarnings()
  });
}

function captureCurrentResultSnapshot(presetData) {
  return {
    primaryResult: getCurrentPrimaryResult(),
    primaryResultLabel: els.primaryResultLabel?.textContent || "Primary Result",
    flowSummary: getCurrentFlowSummary(presetData),
    pdpSummary: getCurrentPdpSummary(presetData),
    calculatedPdp: presetData.calculatedPdp || "",
    calculatedFlow: presetData.calculatedFlow || "",
    totalFl: els.totalFl?.textContent || "",
    flPer100: els.flPer100?.textContent || "",
    nozzleDisplay: els.nozzleDisplay?.textContent || "",
    nozzleReaction: els.nozzleReaction?.textContent || "",
    setupDisplay: els.setupDisplay?.textContent || "",
    turboLossDisplay: els.turboLossDisplay?.textContent || "",
    splitSupplyLayoutResult: els.splitSupplyLayoutResult?.textContent || "",
    splitSupplyFlow: els.splitSupplyFlow?.textContent || "",
    splitSupplyLoss: els.splitSupplyLoss?.textContent || "",
    splitApplianceLoss: els.splitApplianceLoss?.textContent || "",
    splitAttack1FlowResult: els.splitAttack1FlowResult?.textContent || "",
    splitAttack1NpResult: els.splitAttack1NpResult?.textContent || "",
    splitAttack1FlResult: els.splitAttack1FlResult?.textContent || "",
    splitAttack1ReactionResult: els.splitAttack1ReactionResult?.textContent || "",
    splitAttack2FlowResult: els.splitAttack2FlowResult?.textContent || "",
    splitAttack2NpResult: els.splitAttack2NpResult?.textContent || "",
    splitAttack2FlResult: els.splitAttack2FlResult?.textContent || "",
    splitAttack2ReactionResult: els.splitAttack2ReactionResult?.textContent || "",
    standpipeTotalFlow: els.standpipeTotalFlow?.textContent || "",
    standpipeSupplyLoss: els.standpipeSupplyLoss?.textContent || "",
    standpipeLossResult: els.standpipeLossResult?.textContent || "",
    standpipeDrivingLine: els.standpipeDrivingLine?.textContent || "",
    standpipeAttack1FlowResult: els.standpipeAttack1FlowResult?.textContent || "",
    standpipeAttack1NpResult: els.standpipeAttack1NpResult?.textContent || "",
    standpipeAttack1FlResult: els.standpipeAttack1FlResult?.textContent || "",
    standpipeAttack2FlowResult: els.standpipeAttack2FlowResult?.textContent || "",
    standpipeAttack2NpResult: els.standpipeAttack2NpResult?.textContent || "",
    standpipeAttack2FlResult: els.standpipeAttack2FlResult?.textContent || "",
    summary: buildLegacyPresetSummary(presetData)
  };
}

function getCurrentPrimaryResult() {
  if (isSplitLayMode()) {
    return els.splitPrimaryPdp?.textContent || "";
  }

  if (isStandpipeOpsMode()) {
    return els.standpipePrimaryPdp?.textContent || "";
  }

  const value = els.roundedGpm?.textContent || "";
  const unit = els.primaryResultUnit?.textContent || "";
  return value && value !== "—" ? `${value} ${unit}`.trim() : "";
}

function getCurrentFlowSummary(presetData = {}) {
  if (state.mode === "splitLay") {
    return "";
  }

  if (state.mode === "standpipeOps") {
    return formatGpmValue(presetData.calculatedFlow || els.standpipeTotalFlow?.textContent);
  }

  const flowValue = state.mode === "reverse"
    ? els.roundedGpm?.textContent
    : presetData.calculatedFlow || els.calculatedGpm?.textContent || state.targetGpm;

  return formatGpmValue(flowValue);
}

function getCurrentPdpSummary(presetData = {}) {
  if (state.mode === "reverse") {
    return formatPsiValue(state.pdp || presetData.calculatedPdp);
  }

  if (state.mode === "splitLay") {
    return formatPsiValue(els.splitPrimaryPdp?.textContent || presetData.calculatedPdp);
  }

  if (state.mode === "standpipeOps") {
    return formatPsiValue(els.standpipePrimaryPdp?.textContent || presetData.calculatedPdp);
  }

  return formatPsiValue(presetData.calculatedPdp || els.roundedGpm?.textContent);
}

function hasValidRenderedCalculation() {
  const value = isSplitLayMode()
    ? els.splitPrimaryPdp?.textContent || ""
    : isStandpipeOpsMode()
      ? els.standpipePrimaryPdp?.textContent || ""
      : els.roundedGpm?.textContent || "";

  const normalizedValue = String(value).trim();

  return Boolean(normalizedValue) &&
    normalizedValue !== "—" &&
    normalizedValue !== "— PSI" &&
    normalizedValue !== "-";
}

function getCurrentWarnings() {
  if (!els.warningsCard || els.warningsCard.hidden) return [];

  return [...els.warningsCard.querySelectorAll(".warning-item")]
    .map(item => item.textContent.trim())
    .filter(Boolean);
}

function getSetupPrimarySummary(setup) {
  return setup.result?.primaryResult ||
    (setup.result?.calculatedPdp ? `${setup.result.calculatedPdp} PSI` : "") ||
    setup.result?.summary ||
    "-";
}

function getSetupModeBadgeLabel(setup) {
  if (setup.mode === "requiredPdp") return "REQUIRED PDP";
  if (setup.mode === "splitLay") return "SPLIT LAY";
  if (setup.mode === "relay") return "RELAY";
  if (setup.mode === "apparatusMounted") return "APPARATUS";
  if (setup.mode === "reverse") return "REVERSE FLOW";

  return String(setup.modeLabel || getModeLabel(setup.mode))
    .trim()
    .toUpperCase();
}

function getSetupConfigurationSummary(setup) {
  const inputs = setup.inputs || {};

  if (setup.mode === "splitLay") {
    return getSplitLayConfigurationSummary(inputs.splitLay || {}, setup.result || {});
  }

  if (setup.mode === "standpipeOps") {
    return getStandpipeOpsConfigurationSummary(setup);
  }

  if (setup.mode === "apparatusMounted") {
    const summary = getApparatusMountedConfigurationSummary(setup);
    logPumpChartApparatusDisplay("saved inputs", setup, { inputs });
    logPumpChartApparatusDisplay("saved result", setup, { result: setup.result || {} });
    logPumpChartApparatusDisplay("card summary", setup, { summary });
    return summary;
  }

  if (setup.mode === "relay") {
    return getRelayConfigurationSummary(inputs);
  }

  if (inputs.nozzleType === "masterstream") {
    return [
      "Master Stream",
      getMasterStreamSavedFlowSummary(setup)
    ].filter(Boolean).join("\n");
  }

  const summary = [
    formatLengthAndHose(inputs.hoseLength, inputs.hoseSize),
    getNozzleConfigurationLabel(inputs)
  ].filter(Boolean).join(" ");

  return summary || setup.modeLabel || getModeLabel(setup.mode);
}

function getSetupHydraulicSummary(setup) {
  const result = setup.result || {};
  const flow = result.flowSummary || getSetupFlowSummary(setup);
  const pdp = result.pdpSummary || getSetupPdpSummary(setup);

  if (setup.mode === "splitLay") {
    const splitLayFlow = getSplitLayTotalFlowSummary(setup);
    if (splitLayFlow && pdp) return `${splitLayFlow} • PDP ${pdp}`;
    if (splitLayFlow) return splitLayFlow;
    return pdp ? `PDP ${pdp}` : getSetupPrimarySummary(setup);
  }

  if (setup.mode === "relay") {
    const residual = getRelayResidualSummary(setup);
    const relayResult = pdp ? `PDP ${pdp}` : getSetupPrimarySummary(setup);
    return residual ? `${relayResult}\n${residual}` : relayResult;
  }

  if (flow && pdp) return `${flow} • PDP ${pdp}`;
  if (flow) return flow;
  if (pdp) return `PDP ${pdp}`;

  return getSetupPrimarySummary(setup);
}

function getSplitLayConfigurationSummary(splitLay = {}, result = {}) {
  const supplyLine = getSplitSupplySummary(splitLay);
  const attackLine = getSplitAttackSummary(splitLay);
  const operationalLine = getSplitLayOperationalSummary(splitLay, result);

  return [supplyLine, attackLine, operationalLine].filter(Boolean).join("\n") || "Split Lay";
}

function getSplitLayOperationalSummary(splitLay = {}, result = {}) {
  if (String(splitLay.attackLines || "1") === "2") {
    return "2 Attack Lines";
  }

  return "";
}

function getSplitLayTotalFlowSummary(setup = {}) {
  const result = setup.result || {};
  return formatGpmValue(
    result.splitSupplyFlow ||
    result.calculatedFlow ||
    result.flowSummary
  );
}

function getStandpipeOpsData(setup = {}) {
  return setup.inputs?.standpipeOps ||
    setup.standpipeOps ||
    setup.inputs?.standpipe ||
    {};
}

function getStandpipeTipLabel(tipId) {
  const tip = SMOOTHBORE_TIPS.find(item => item.id === tipId);
  if (tip?.label) return tip.label;

  const normalized = String(tipId || "").trim();
  if (!normalized) return "";
  return normalized.includes('"') ? normalized : `${normalized}"`;
}

function getStandpipeBladeLabel(modelId) {
  const blade = BLADE_MODELS.find(item => item.id === modelId);
  return blade?.label || "Blade";
}

function getStandpipeNozzleSummary(standpipe = {}, lineNumber) {
  const nozzleType = standpipe[`attack${lineNumber}NozzleType`];

  if (nozzleType === "smoothbore") {
    return ["SB", getStandpipeTipLabel(standpipe[`attack${lineNumber}SmoothboreTip`])]
      .filter(Boolean)
      .join(" ");
  }

  if (nozzleType === "blade") {
    return getStandpipeBladeLabel(standpipe[`attack${lineNumber}BladeModel`]);
  }

  const nozzleLabel = isFixedFogType(nozzleType)
    ? "Fixed Fog"
    : "Automatic Fog";
  const flow = isFixedFogType(nozzleType)
    ? formatFixedFogRating(
        standpipe[`attack${lineNumber}RatedFlow`],
        standpipe[`attack${lineNumber}RatedPressure`]
      )
    : formatGpmValue(standpipe[`attack${lineNumber}Flow`]);
  return [nozzleLabel, flow].filter(Boolean).join(" ");
}

function getStandpipeAttackLineSummary(standpipe = {}, lineNumber, options = {}) {
  const line = [
    formatLengthAndHose(
      standpipe[`attack${lineNumber}Length`],
      standpipe[`attack${lineNumber}HoseSize`]
    ),
    getStandpipeNozzleSummary(standpipe, lineNumber)
  ].filter(Boolean).join(" ");
  const floor = String(standpipe[`attack${lineNumber}Floor`] || "").trim();
  const withFloor = floor ? [`Floor ${floor}`, line].filter(Boolean).join(" • ") : line;

  if (!withFloor) return "";
  return options.label ? `${options.label}: ${withFloor}` : withFloor;
}

function getStandpipeFdcSummary(standpipe = {}) {
  const supply = formatSupplyDescription(
    standpipe.supplyLength,
    standpipe.supplyHoseSize
  );

  if (!supply) return "";

  return standpipe.dualSupply
    ? `FDC: 2 x ${supply}`
    : `FDC: ${supply}`;
}

function getStandpipeLossSummary(standpipe = {}) {
  const loss = formatPsiValue(standpipe.standpipeLoss);
  return loss ? `Standpipe Loss ${loss}` : "";
}

function getStandpipeOpsConfigurationSummary(setup = {}) {
  const standpipe = getStandpipeOpsData(setup);
  const attack2Enabled = !!standpipe.attack2Enabled;
  const line1 = getStandpipeAttackLineSummary(standpipe, "1", {
    label: attack2Enabled ? "L1" : ""
  });
  const line2 = attack2Enabled
    ? getStandpipeAttackLineSummary(standpipe, "2", { label: "L2" })
    : "";
  const outletSummary = attack2Enabled ? "2 Outlets" : "";

  return [
    outletSummary,
    line1,
    line2,
    getStandpipeFdcSummary(standpipe),
    getStandpipeLossSummary(standpipe)
  ].filter(Boolean).join("\n") || "Standpipe Ops";
}

function getSplitSupplySummary(splitLay = {}) {
  const supply1 = {
    length: splitLay.supplyLength,
    hoseSize: splitLay.supplyHoseSize
  };

  if (splitLay.dualSupply) {
    return `2 x ${formatSupplyDescription(supply1.length, supply1.hoseSize)}`.trim();
  }

  if (String(splitLay.sectionCount || "2") !== "3") {
    return formatSupplyDescription(supply1.length, supply1.hoseSize);
  }

  const supply2 = {
    length: splitLay.supply2Length,
    hoseSize: splitLay.supply2HoseSize
  };

  if (areSplitSupplyLinesIdentical(supply1, supply2)) {
    return `2 x ${formatSupplyDescription(supply1.length, supply1.hoseSize)}`.trim();
  }

  return [
    formatSupplyDescription(supply1.length, supply1.hoseSize),
    formatSupplyDescription(supply2.length, supply2.hoseSize)
  ].filter(Boolean).join(" + ");
}

function getSplitAttackSummary(splitLay = {}) {
  const attack1 = getSplitAttackLineSummary(splitLay, "1");

  if (String(splitLay.attackLines || "1") !== "2") {
    return attack1;
  }

  const attack2 = getSplitAttackLineSummary(splitLay, "2");

  if (areSplitAttackLinesIdentical(splitLay)) {
    return `2 x ${attack1}`.trim();
  }

  return [attack1, attack2].filter(Boolean).join(" + ");
}

function getSplitAttackLineSummary(splitLay = {}, lineNumber) {
  return [
    formatLengthAndHose(
      splitLay[`attack${lineNumber}Length`],
      splitLay[`attack${lineNumber}HoseSize`]
    ),
    getSplitNozzleConfigurationLabel(splitLay, lineNumber)
  ].filter(Boolean).join(" ");
}

function areSplitSupplyLinesIdentical(supply1, supply2) {
  return normalizeComparableValue(supply1.length) === normalizeComparableValue(supply2.length) &&
    normalizeComparableValue(supply1.hoseSize) === normalizeComparableValue(supply2.hoseSize);
}

function areSplitAttackLinesIdentical(splitLay = {}) {
  return normalizeComparableValue(splitLay.attack1Length) === normalizeComparableValue(splitLay.attack2Length) &&
    normalizeComparableValue(splitLay.attack1HoseSize) === normalizeComparableValue(splitLay.attack2HoseSize) &&
    normalizeComparableValue(normalizeNozzleType(splitLay.attack1NozzleType) || "smoothbore") === normalizeComparableValue(normalizeNozzleType(splitLay.attack2NozzleType) || "smoothbore") &&
    normalizeComparableValue(getSplitNozzleDetailValue(splitLay, "1")) === normalizeComparableValue(getSplitNozzleDetailValue(splitLay, "2"));
}

function getSplitNozzleDetailValue(splitLay = {}, lineNumber) {
  const type = normalizeNozzleType(splitLay[`attack${lineNumber}NozzleType`]) || "smoothbore";

  if (type === "smoothbore") {
    return splitLay[`attack${lineNumber}SmoothboreTip`] || "";
  }

  if (type === "blade") {
    return splitLay[`attack${lineNumber}BladeModel`] || "blade160";
  }

  return splitLay[`attack${lineNumber}NozzlePressure`] || "";
}

function normalizeComparableValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getApparatusMountedConfigurationSummary(setupOrInputs = {}) {
  const setup = setupOrInputs.inputs || setupOrInputs.result
    ? setupOrInputs
    : { inputs: setupOrInputs, result: {} };
  const stream = getApparatusMountedStreamSummary(setup);

  if (stream) return `Deck Gun ${stream}`;

  return "Apparatus Mounted";
}

function getRelayConfigurationSummary(inputs = {}) {
  const parts = [
    formatLengthAndHose(inputs.hoseLength, inputs.hoseSize, "Relay"),
    formatGpmValue(inputs.targetGpm)
  ].filter(Boolean);

  return parts.join("\n") || "Relay Pumping";
}

function getMasterStreamConfigurationLabel(inputs = {}) {
  if (inputs.masterStreamType === "smoothbore") return "Smoothbore";
  if (inputs.masterStreamType === "fixedFog") {
    return [
      "Fixed Fog",
      formatFixedFogRating(inputs.ratedFlow, inputs.ratedPressure)
    ].filter(Boolean).join(" • ");
  }
  const flow = formatGpmValue(inputs.targetGpm);
  const pressure = getNozzlePressureSummary(inputs);
  const detail = flow && pressure
    ? `${flow} @ ${pressure}`
    : flow || pressure;
  return ["Automatic Fog", detail].filter(Boolean).join(" • ");
}

function getApparatusMountedStreamSummary(setup = {}) {
  const inputs = setup.inputs || {};

  if (inputs.nozzleType === "smoothbore") return "Smoothbore";
  if (inputs.nozzleType === "masterstream") return getMasterStreamConfigurationLabel(inputs);
  if (isAutomaticFogType(inputs.nozzleType)) return "Automatic Fog";
  if (isFixedFogType(inputs.nozzleType)) return "Fixed Fog";

  return getNozzleConfigurationLabel(inputs);
}

function getApparatusMountedFlowSummary(setup = {}) {
  const inputs = setup.inputs || {};
  const result = setup.result || {};

  if (isAutomaticFogType(inputs.nozzleType) || isFixedFogType(inputs.nozzleType)) {
    const fogFlow = inputs.apparatusFogFlow === "custom"
      ? inputs.apparatusCustomFogFlow
      : inputs.apparatusFogFlow;
    return formatGpmValue(fogFlow || result.calculatedFlow || result.flowSummary);
  }

  return formatGpmValue(result.flowSummary || result.calculatedFlow);
}

function getNozzleConfigurationLabel(inputs = {}) {
  if (inputs.nozzleType === "smoothbore") {
    const tip = getStandpipeTipLabel(inputs.smoothboreTip);
    return ["Smoothbore", tip].filter(Boolean).join(" • ");
  }
  if (inputs.nozzleType === "blade") return "Blade";
  if (inputs.nozzleType === "masterstream") {
    return getMasterStreamConfigurationLabel(inputs);
  }

  if (isFixedFogType(inputs.nozzleType)) {
    return [
      "Fixed Fog",
      formatFixedFogRating(inputs.ratedFlow, inputs.ratedPressure)
    ].filter(Boolean).join(" • ");
  }

  const automaticFogFlow = formatGpmValue(
    inputs.targetGpm ||
    (inputs.apparatusFogFlow === "custom"
      ? inputs.apparatusCustomFogFlow
      : inputs.apparatusFogFlow)
  );
  const automaticFogPressure = getNozzlePressureSummary(inputs);
  const automaticFogDetail =
    automaticFogFlow && automaticFogPressure
      ? `${automaticFogFlow} @ ${automaticFogPressure}`
      : automaticFogPressure || automaticFogFlow;

  return ["Automatic Fog", automaticFogDetail].filter(Boolean).join(" • ");
}

function getSplitNozzleConfigurationLabel(splitLay = {}, lineNumber) {
  const type = normalizeNozzleType(splitLay[`attack${lineNumber}NozzleType`]);
  if (type === "smoothbore") return "Smoothbore";
  if (type === "blade") return "Blade";
  if (type === "fixedFog") {
    return [
      "Fixed Fog",
      formatFixedFogRating(
        splitLay[`attack${lineNumber}RatedFlow`],
        splitLay[`attack${lineNumber}RatedPressure`]
      )
    ].filter(Boolean).join(" • ");
  }
  return "Automatic Fog";
}

function formatFixedFogRating(flow, pressure) {
  const flowText = formatGpmValue(flow);
  const pressureText = formatPsiValue(pressure);

  if (flowText && pressureText) {
    return `${flowText} @ ${pressureText}`;
  }

  return flowText || pressureText || "";
}

function formatLengthAndHose(length, hoseSize, label = "") {
  const normalizedLength = String(length || "").trim();
  const normalizedHose = String(hoseSize || "").trim();
  const prefix = label ? `${label} ` : "";

  if (normalizedLength && normalizedHose) {
    return `${prefix}${normalizedLength}' ${formatHoseSize(normalizedHose)}`;
  }

  if (normalizedHose) {
    return `${prefix}${formatHoseSize(normalizedHose)}`;
  }

  if (normalizedLength) {
    return `${prefix}${normalizedLength}'`;
  }

  return "";
}

function formatSupplyDescription(length, hoseSize) {
  const line = formatLengthAndHose(length, hoseSize);
  return line ? `${line} Supply` : "Supply";
}

function formatHoseSize(hoseSize) {
  const normalized = String(hoseSize || "").trim();
  if (!normalized) return "";
  if (normalized.includes('"')) return normalized;
  return `${normalized}"`;
}

function getApplianceLabel(appliance) {
  if (appliance === "gatedWye") return "Gated Wye";
  if (appliance === "gateValve") return "Gate Valve";
  if (appliance === "reducer") return "Reducer";
  if (appliance === "siamese") return "Siamese";
  return "";
}

function hasManualApplianceLoss(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue !== 0;
}

function getRelayResidualSummary(setup) {
  if (setup.mode !== "relay") return "";

  const residual = formatPsiValue(setup.inputs?.relayResidualPressure);
  return residual ? `Residual ${residual}` : "";
}

function getSetupReferenceSections(setup) {
  if (setup.mode === "splitLay") {
    return getSplitLayReferenceSections(setup);
  }

  if (setup.mode === "standpipeOps") {
    return getStandpipeOpsReferenceSections(setup);
  }

  const inputs = setup.inputs || {};
  const result = setup.result || {};
  const configurationRows = [];
  const operationalRows = [];

  if (setup.mode === "apparatusMounted") {
    const apparatusFields = getApparatusMountedReferenceFields(setup);
    configurationRows.push(
      ["Stream", apparatusFields.stream],
      ["Flow", apparatusFields.flow],
      ["Device Loss", apparatusFields.deviceLoss],
      ["Elevation", apparatusFields.elevation]
    );
    logPumpChartApparatusDisplay("detail fields", setup, { fields: apparatusFields });
  } else if (setup.mode === "relay") {
    configurationRows.push(
      ["Relay Lay", formatLengthAndHose(inputs.hoseLength, inputs.hoseSize)],
      ["Target Flow", formatGpmValue(inputs.targetGpm)]
    );
  } else if (inputs.nozzleType === "masterstream") {
    configurationRows.push(
      ["Stream", getMasterStreamConfigurationLabel(inputs)],
      ["Target Flow", getMasterStreamSavedFlowSummary(setup)],
      ["Supply", formatLengthAndHose(inputs.hoseLength, inputs.hoseSize)]
    );
  } else {
    configurationRows.push(
      ["Line", formatLengthAndHose(inputs.hoseLength, inputs.hoseSize)],
      ["Nozzle", getNozzleConfigurationLabel(inputs)]
    );
  }

  const nozzlePressure = getNozzlePressureSummary(inputs);
  if (nozzlePressure) operationalRows.push(["Nozzle Pressure", nozzlePressure]);

  if (result.nozzleReaction && result.nozzleReaction !== "—") {
    operationalRows.push(["Nozzle Reaction", result.nozzleReaction]);
  }

  if (inputs.reverseSupplyEnabled) {
    configurationRows.push(
      ["Supply", formatLengthAndHose(inputs.reverseSupplyLength, inputs.reverseSupplyHoseSize)],
      ["Appliance", getApplianceLabel(inputs.reverseSupplyAppliance)]
    );
  }

  if (hasManualApplianceLoss(inputs.applianceLoss)) {
    operationalRows.push(["Loss / Elevation", formatPsiValue(inputs.applianceLoss)]);
  }

  return [
    {
      title: "Configuration",
      rows: configurationRows
        .filter(([, value]) => value)
        .map(([label, value]) => ({ label, value }))
    },
    {
      title: "Operational",
      rows: operationalRows
        .filter(([, value]) => value)
        .map(([label, value]) => ({ label, value }))
    }
  ].filter(section => section.rows.length);
}

function getSplitLayReferenceSections(setup) {
  const splitLay = setup.inputs?.splitLay || {};
  const result = setup.result || {};
  const supplyRows = [
    {
      label: "Supply",
      value: splitLay.dualSupply
        ? `2 x ${formatLengthAndHose(splitLay.supplyLength, splitLay.supplyHoseSize)}`
        : formatLengthAndHose(splitLay.supplyLength, splitLay.supplyHoseSize)
    },
    {
      label: "Appliance",
      value: getApplianceLabel(splitLay.appliance1)
    }
  ];

  if (String(splitLay.sectionCount || "2") === "3") {
    supplyRows.push({
      label: "Second Supply",
      value: formatLengthAndHose(splitLay.supply2Length, splitLay.supply2HoseSize)
    });
  }

  const attackRows = [
    {
      label: "Attack 1",
      value: `${formatLengthAndHose(splitLay.attack1Length, splitLay.attack1HoseSize)} ${getSplitNozzleConfigurationLabel(splitLay, "1")}`.trim()
    }
  ];

  if (String(splitLay.attackLines || "1") === "2") {
    attackRows.push({
      label: "Attack 2",
      value: `${formatLengthAndHose(splitLay.attack2Length, splitLay.attack2HoseSize)} ${getSplitNozzleConfigurationLabel(splitLay, "2")}`.trim()
    });
  }

  const operationalRows = [
    {
      label: "Attack 1 Flow",
      value: result.splitAttack1FlowResult
    },
    {
      label: "Attack 1 NP",
      value: result.splitAttack1NpResult
    }
  ];

  if (String(splitLay.attackLines || "1") === "2") {
    operationalRows.push(
      {
        label: "Attack 2 Flow",
        value: result.splitAttack2FlowResult
      },
      {
        label: "Attack 2 NP",
        value: result.splitAttack2NpResult
      }
    );
  }

  return [
    {
      title: "Supply",
      rows: supplyRows.filter(row => row.value)
    },
    {
      title: "Attack",
      rows: attackRows.filter(row => row.value)
    },
    {
      title: "Operational",
      rows: operationalRows.filter(row => row.value && row.value !== "—")
    }
  ].filter(section => section.rows.length);
}

function getStandpipeOpsReferenceSections(setup) {
  const standpipe = getStandpipeOpsData(setup);
  const result = setup.result || {};
  const attackRows = [
    {
      label: "Attack 1",
      value: getStandpipeAttackLineSummary(standpipe, "1")
    }
  ];

  if (standpipe.attack2Enabled) {
    attackRows.push({
      label: "Attack 2",
      value: getStandpipeAttackLineSummary(standpipe, "2")
    });
  }

  return [
    {
      title: "Attack",
      rows: attackRows.filter(row => row.value)
    },
    {
      title: "Supply",
      rows: [
        {
          label: "FDC",
          value: getStandpipeFdcSummary(standpipe).replace(/^FDC:\s*/, "")
        },
        {
          label: "Standpipe Loss",
          value: formatPsiValue(standpipe.standpipeLoss)
        }
      ].filter(row => row.value)
    },
    {
      title: "Operational",
      rows: [
        {
          label: "Total Flow",
          value: result.standpipeTotalFlow || result.flowSummary || result.calculatedFlow
        },
        {
          label: "Required PDP",
          value: result.pdpSummary || formatPsiValue(result.calculatedPdp)
        },
        {
          label: "Driving Line",
          value: result.standpipeDrivingLine
        },
        {
          label: "Supply Loss",
          value: result.standpipeSupplyLoss
        }
      ].filter(row => row.value && row.value !== "—")
    }
  ].filter(section => section.rows.length);
}

function getTargetFlowSummary(inputs = {}) {
  if (inputs.apparatusFogFlow === "custom") {
    return formatGpmValue(inputs.apparatusCustomFogFlow);
  }

  return formatGpmValue(inputs.apparatusFogFlow || inputs.targetGpm);
}

function getMasterStreamSavedFlowSummary(setup = {}) {
  const result = setup.result || {};
  const inputs = setup.inputs || {};

  return formatGpmValue(
    result.flowSummary ||
    result.calculatedFlow ||
    getSetupFlowSummary(setup) ||
    getTargetFlowSummary(inputs)
  );
}

function getApparatusMountedReferenceFields(setup = {}) {
  const inputs = setup.inputs || {};

  return {
    stream: getApparatusMountedStreamSummary(setup),
    flow: getApparatusMountedFlowSummary(setup),
    deviceLoss: formatPsiValue(inputs.masterStreamLoss),
    elevation: inputs.apparatusElevation ? `${inputs.apparatusElevation} ft` : ""
  };
}

function getNozzlePressureSummary(inputs = {}) {
  if (inputs.nozzlePressure === "custom") {
    return formatPsiValue(inputs.customNozzlePressure);
  }

  if (isFixedFogType(inputs.nozzleType) || isFixedFogType(inputs.masterStreamType)) {
    const requiredPressure = fixedFogPressureForFlow(
      numberOrNull(inputs.ratedFlow),
      numberOrNull(inputs.ratedPressure),
      numberOrNull(inputs.targetGpm)
    );

    return formatPsiValue(requiredPressure || inputs.ratedPressure);
  }

  return formatPsiValue(inputs.nozzlePressure);
}

function getSetupFlowSummary(setup) {
  const result = setup.result || {};
  const inputs = setup.inputs || {};

  if (setup.mode === "reverse") {
    return formatGpmValue(result.calculatedFlow || result.primaryResult);
  }

  return formatGpmValue(result.calculatedFlow || inputs.targetGpm);
}

function getSetupPdpSummary(setup) {
  const result = setup.result || {};
  const inputs = setup.inputs || {};

  if (setup.mode === "reverse") {
    return formatPsiValue(inputs.pdp || result.calculatedPdp);
  }

  return formatPsiValue(result.calculatedPdp || result.primaryResult);
}

function formatGpmValue(value) {
  const text = String(value || "").trim();
  if (!text || text === "—" || text === "-") return "";

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return "";

  return `${match[0]} GPM`;
}

function formatPsiValue(value) {
  const text = String(value || "").trim();
  if (!text || text === "—" || text === "— PSI" || text === "-") return "";

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return "";

  return `${match[0]} PSI`;
}

function buildLegacyPresetSummary(preset = {}) {
  if (preset.mode === "splitLay") {
    return "Split Lay setup";
  }

  const flow = preset.calculatedFlow || "";
  const hose = preset.hoseLength ? `${preset.hoseLength}' ${preset.hoseSize || ""}`.trim() : "";
  const nozzle = preset.nozzleType === "smoothbore"
    ? `${preset.smoothboreTip || "Smoothbore"}`
    : preset.nozzleType === "blade"
      ? getBladeModelLabel(preset.bladeModel)
      : preset.nozzlePressure
        ? `Automatic Fog @ ${preset.nozzlePressure} psi`
        : "";

  return [flow, hose, nozzle].filter(Boolean).join(" | ");
}

function getSetupInputRows(setup) {
  const inputs = setup.inputs || {};
  const standpipe = inputs.standpipeOps || {};
  const rows = [
    ["Mode", setup.modeLabel || getModeLabel(setup.mode)],
    ["Hose Length", inputs.hoseLength ? `${inputs.hoseLength} ft` : ""],
    ["Hose Size", inputs.hoseSize],
    ["Nozzle Type", setup.mode === "relay" ? "" : getNozzleConfigurationLabel(inputs)],
    ["Nozzle Pressure", setup.mode === "relay" ? "" : getNozzlePressureSummary(inputs)],
    ["Target Flow", inputs.targetGpm ? `${inputs.targetGpm} GPM` : ""],
    ["Receiving Residual", setup.mode === "relay" ? getRelayResidualSummary(setup).replace("Residual ", "") : ""],
    ["Pump Discharge Pressure", inputs.pdp ? `${inputs.pdp} PSI` : ""],
    ["Appliance / Elevation Loss", inputs.applianceLoss ? `${inputs.applianceLoss} PSI` : ""]
  ];

  if (setup.mode === "splitLay") {
    const split = inputs.splitLay || {};
    rows.push(
      ["Supply 1", `${split.supplyLength || "-"} ft ${split.supplyHoseSize || ""}`.trim()],
      ["Attack 1", `${split.attack1Length || "-"} ft ${split.attack1HoseSize || ""}`.trim()],
      ["Attack Lines", split.attackLines || "1"]
    );
  }

  if (setup.mode === "standpipeOps") {
    rows.push(
      ["Attack 1", getStandpipeAttackLineSummary(standpipe, "1")],
      ["Attack 2", standpipe.attack2Enabled ? getStandpipeAttackLineSummary(standpipe, "2") : ""],
      ["FDC", getStandpipeFdcSummary(standpipe).replace(/^FDC:\s*/, "")],
      ["Standpipe Loss", formatPsiValue(standpipe.standpipeLoss)]
    );
  }

  return rows.filter(([, value]) => value);
}

function getSetupBreakdownRows(setup) {
  const result = setup.result || {};
  return [
    [result.primaryResultLabel || "Primary Result", result.primaryResult],
    ["Calculated PDP", result.calculatedPdp ? `${result.calculatedPdp} PSI` : ""],
    ["Calculated Flow", result.calculatedFlow],
    ["Total FL", result.totalFl],
    ["FL / 100 ft", result.flPer100],
    ["Nozzle", result.nozzleDisplay],
    ["Nozzle Reaction", result.nozzleReaction],
    ["Setup", result.setupDisplay],
    ["Turbo Loss", result.turboLossDisplay],
    ["Supply Layout", result.splitSupplyLayoutResult],
    ["Supply Flow", result.splitSupplyFlow],
    ["Supply Loss", result.splitSupplyLoss],
    ["Attack 1 Flow", result.splitAttack1FlowResult],
    ["Attack 1 NP", result.splitAttack1NpResult],
    ["Attack 1 FL", result.splitAttack1FlResult],
    ["Attack 2 Flow", result.splitAttack2FlowResult],
    ["Attack 2 NP", result.splitAttack2NpResult],
    ["Attack 2 FL", result.splitAttack2FlResult],
    ["Standpipe Total Flow", result.standpipeTotalFlow],
    ["Standpipe Supply Loss", result.standpipeSupplyLoss],
    ["Standpipe Loss", result.standpipeLossResult],
    ["Standpipe Driving Line", result.standpipeDrivingLine],
    ["Standpipe Attack 1 Flow", result.standpipeAttack1FlowResult],
    ["Standpipe Attack 1 NP", result.standpipeAttack1NpResult],
    ["Standpipe Attack 1 FL", result.standpipeAttack1FlResult],
    ["Standpipe Attack 2 Flow", result.standpipeAttack2FlowResult],
    ["Standpipe Attack 2 NP", result.standpipeAttack2NpResult],
    ["Standpipe Attack 2 FL", result.standpipeAttack2FlResult]
  ].filter(([, value]) => value && value !== "—");
}

    function renderPressureButtons() {
  const hideCustomNozzlePressureField = () => {
    state.customNozzlePressure = "";
    els.customNozzlePressureField.hidden = true;
    els.customNozzlePressureField.style.display = "none";
    els.customNozzlePressure.disabled = true;
    els.customNozzlePressure.value = "";
  };

  if (isSplitLayMode()) {
    els.nozzlePressureLabel.closest(".field").style.display = "none";
    els.pressureButtons.hidden = true;
    els.pressureButtons.innerHTML = "";
    els.calculatedNozzlePressure.hidden = true;
    els.disabledPressureExplanations.hidden = true;
    hideCustomNozzlePressureField();
    return;
  }

  if (isRelayMode()) {
  els.nozzlePressureLabel.closest(".field").style.display = "none";
  els.pressureButtons.hidden = true;
  els.pressureButtons.innerHTML = "";
  els.calculatedNozzlePressure.hidden = true;
  els.disabledPressureExplanations.hidden = true;
  hideCustomNozzlePressureField();
  return;
}
      if (isFixedFogType(getMainNozzleType())) {
        els.nozzlePressureLabel.closest(".field").style.display = "none";
        els.pressureButtons.hidden = true;
        els.pressureButtons.innerHTML = "";
        els.calculatedNozzlePressure.hidden = true;
        els.disabledPressureExplanations.hidden = true;
        hideCustomNozzlePressureField();
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
      state.customNozzlePressure = "";
      els.customNozzlePressureField.hidden = true;
      els.customNozzlePressureField.style.display = "none";
      els.customNozzlePressure.disabled = true;
      els.customNozzlePressure.value = "";
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
  state.nozzleType = normalizeNozzleType(state.nozzleType);
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

  if (els.ratedFlow) {
    els.ratedFlow.value = state.ratedFlow || "";
  }

  if (els.ratedPressure) {
    els.ratedPressure.value = state.ratedPressure || "";
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
  syncStandpipeInputsFromState();
  syncCoefficientUi();
  syncSmoothboreUi();
  syncModeUi();
}

function syncStandpipeInputsFromState() {
  const standpipe = state.standpipeOps;
  if (!standpipe) return;

  [
    ["standpipeAttack1Floor", "attack1Floor"],
    ["standpipeAttack1Length", "attack1Length"],
    ["standpipeAttack1Hose", "attack1HoseSize"],
    ["standpipeAttack1NozzleType", "attack1NozzleType"],
    ["standpipeAttack1NozzlePressure", "attack1NozzlePressure"],
    ["standpipeAttack1Flow", "attack1Flow"],
    ["standpipeAttack1RatedFlow", "attack1RatedFlow"],
    ["standpipeAttack1RatedPressure", "attack1RatedPressure"],
    ["standpipeAttack1SmoothboreTip", "attack1SmoothboreTip"],
    ["standpipeAttack1BladeModel", "attack1BladeModel"],
    ["standpipeAttack2Floor", "attack2Floor"],
    ["standpipeAttack2Length", "attack2Length"],
    ["standpipeAttack2Hose", "attack2HoseSize"],
    ["standpipeAttack2NozzleType", "attack2NozzleType"],
    ["standpipeAttack2NozzlePressure", "attack2NozzlePressure"],
    ["standpipeAttack2Flow", "attack2Flow"],
    ["standpipeAttack2RatedFlow", "attack2RatedFlow"],
    ["standpipeAttack2RatedPressure", "attack2RatedPressure"],
    ["standpipeAttack2SmoothboreTip", "attack2SmoothboreTip"],
    ["standpipeAttack2BladeModel", "attack2BladeModel"],
    ["standpipeSupplyLength", "supplyLength"],
    ["standpipeSupplyHose", "supplyHoseSize"],
    ["standpipeLoss", "standpipeLoss"]
  ].forEach(([elementId, stateKey]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = stateKey.endsWith("NozzleType")
        ? normalizeNozzleType(standpipe[stateKey]) || "smoothbore"
        : standpipe[stateKey] || "";
    }
  });

  if (els.standpipeDualSupplyToggle) {
    els.standpipeDualSupplyToggle.checked = !!standpipe.dualSupply;
  }
}

function syncStandpipeNozzleUi(lineNumber) {
  const standpipe = state.standpipeOps;
  const nozzleType = document.getElementById(`standpipeAttack${lineNumber}NozzleType`);
  const pressureSelect = document.getElementById(`standpipeAttack${lineNumber}NozzlePressure`);
  const flowField = document.getElementById(`standpipeAttack${lineNumber}FlowField`);
  const fixedFogRatingField = document.getElementById(`standpipeAttack${lineNumber}FixedFogRatingField`);
  const tipField = document.getElementById(`standpipeAttack${lineNumber}SmoothboreTipField`);
  const bladeField = document.getElementById(`standpipeAttack${lineNumber}BladeModelField`);

  if (!standpipe || !nozzleType || !pressureSelect || !flowField || !tipField || !bladeField) {
    return;
  }

  const lineType = normalizeNozzleType(nozzleType.value);
  nozzleType.value = lineType;
  const isSmoothboreLine = lineType === "smoothbore";
  const isBladeLine = lineType === "blade";
  const isFixedFogLine = isFixedFogType(lineType);
  const isAutomaticFogLine = isAutomaticFogType(lineType);
  const usesSolidStreamOptions = isSmoothboreLine || isBladeLine;
  const bladeKey = `attack${lineNumber}BladeModel`;
  const pressureKey = `attack${lineNumber}NozzlePressure`;
  const selectedBladeModel = standpipe[bladeKey] || "blade160";

  populateStandpipeSmoothboreTipOptions(lineNumber);

  const pressures = isBladeLine
    ? getBladeNozzlePressures(selectedBladeModel)
      : usesSolidStreamOptions
      ? [40, 50, 60]
      : [50, 55, 75, 100];

  pressureSelect.innerHTML = pressures.map(pressure => (
    `<option value="${pressure}">${pressure} psi</option>`
  )).join("");

  if (![...pressureSelect.options].some(option => option.value === standpipe[pressureKey])) {
    standpipe[pressureKey] = isBladeLine
      ? getBladeDefaultNozzlePressure(selectedBladeModel)
      : usesSolidStreamOptions
        ? "50"
        : "50";
  }

  pressureSelect.value = standpipe[pressureKey];
  pressureSelect.closest(".field").hidden = isFixedFogLine;
  pressureSelect.closest(".field").style.display = isFixedFogLine ? "none" : "";
  flowField.hidden = usesSolidStreamOptions;
  flowField.style.display = usesSolidStreamOptions ? "none" : "";
  if (fixedFogRatingField) {
    fixedFogRatingField.hidden = !isFixedFogLine;
    fixedFogRatingField.style.display = isFixedFogLine ? "" : "none";
  }
  tipField.hidden = !isSmoothboreLine;
  tipField.style.display = isSmoothboreLine ? "" : "none";
  bladeField.hidden = !isBladeLine;
  bladeField.style.display = isBladeLine ? "" : "none";
}

function syncStandpipeUi() {
  const standpipe = state.standpipeOps;
  if (!standpipe) return;

  if (els.standpipeOpsFields) {
    els.standpipeOpsFields.hidden = !isStandpipeOpsMode();
    els.standpipeOpsFields.style.display = isStandpipeOpsMode() ? "grid" : "none";
  }

  if (els.standpipeAttack2Section) {
    els.standpipeAttack2Section.hidden = !standpipe.attack2Enabled;
    els.standpipeAttack2Section.style.display = standpipe.attack2Enabled ? "grid" : "none";
  }

  if (els.standpipeAddOutletButton) {
    els.standpipeAddOutletButton.hidden = !!standpipe.attack2Enabled;
    els.standpipeAddOutletButton.style.display = standpipe.attack2Enabled ? "none" : "";
  }

  if (els.standpipeDualSupplyToggle) {
    els.standpipeDualSupplyToggle.checked = !!standpipe.dualSupply;
  }

  if (els.standpipeAttack2ResultSection) {
    els.standpipeAttack2ResultSection.hidden = !standpipe.attack2Enabled;
    els.standpipeAttack2ResultSection.style.display = standpipe.attack2Enabled ? "" : "none";
  }

  syncStandpipeNozzleUi("1");
  syncStandpipeNozzleUi("2");
}

function getActiveModeId() {
  return state.mode || DEFAULT_STATE.mode;
}

function getModeCarousel() {
  return document.querySelector(".mode-carousel");
}

function getCanonicalModeButtons() {
  const carousel = getModeCarousel();
  if (!carousel) return [];

  return [...carousel.querySelectorAll(":scope > button[data-mode]")];
}

function syncModeCarouselActiveState() {
  const carousel = getModeCarousel();
  if (!carousel) return;

  const activeMode = getActiveModeId();
  carousel.querySelectorAll("button[data-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === activeMode);
  });
}

function getModeCarouselCenterTarget(button) {
  const carousel = getModeCarousel();
  if (!carousel || !button) return null;

  return Math.max(
    0,
    button.offsetLeft -
      (carousel.clientWidth - button.offsetWidth) / 2
  );
}

function centerModeCarouselButton(button, options = {}) {
  const carousel = getModeCarousel();
  const targetLeft = getModeCarouselCenterTarget(button);

  if (!carousel || targetLeft === null) return;

  const behavior = options.behavior || "smooth";

  carousel.scrollTo({
    left: targetLeft,
    behavior
  });
}

function startModeCarouselGesture(x, y) {
  modeCarouselPointerDown = true;
  modeCarouselDragging = false;
  modeCarouselPointerStartX = x ?? 0;
  modeCarouselPointerStartY = y ?? 0;
}

function updateModeCarouselGesture(x, y) {
  if (!modeCarouselPointerDown) return;

  const deltaX = Math.abs((x ?? 0) - modeCarouselPointerStartX);
  const deltaY = Math.abs((y ?? 0) - modeCarouselPointerStartY);

  if (deltaX > 8 && deltaX > deltaY) {
    modeCarouselDragging = true;
    modeCarouselIgnoreClickUntil = Date.now() + 420;
  }
}

function finishModeCarouselGesture() {
  if (modeCarouselDragging) {
    modeCarouselIgnoreClickUntil = Date.now() + 420;
  }
  modeCarouselPointerDown = false;
  modeCarouselDragging = false;
}

function handleModeCarouselPointerDown(event) {
  startModeCarouselGesture(event.clientX, event.clientY);
}

function handleModeCarouselPointerMove(event) {
  if (!modeCarouselPointerDown) return;

  updateModeCarouselGesture(event.clientX, event.clientY);
}

function handleModeCarouselPointerEnd() {
  if (!modeCarouselPointerDown) return;
  finishModeCarouselGesture();
}

function handleModeCarouselTouchStart(event) {
  if (window.PointerEvent) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  startModeCarouselGesture(touch.clientX, touch.clientY);
}

function handleModeCarouselTouchMove(event) {
  if (window.PointerEvent) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  updateModeCarouselGesture(touch.clientX, touch.clientY);
}

function handleModeCarouselTouchEnd() {
  if (window.PointerEvent || !modeCarouselPointerDown) return;

  finishModeCarouselGesture();
}

function setupModeCarousel() {
  const carousel = getModeCarousel();

  if (!carousel || modeCarouselInitialized) return;

  const canonicalButtons = getCanonicalModeButtons();
  if (!canonicalButtons.length) return;

  carousel.addEventListener("click", event => {
    const button = event.target.closest?.("button[data-mode]");
    if (
      button &&
      button.closest?.(".mode-carousel") &&
      Date.now() < modeCarouselIgnoreClickUntil
    ) {
      event.preventDefault();
    }
  });

  carousel.addEventListener("pointerdown", handleModeCarouselPointerDown, { passive: true });
  carousel.addEventListener("pointermove", handleModeCarouselPointerMove, { passive: true });
  carousel.addEventListener("pointerup", handleModeCarouselPointerEnd, { passive: true });
  carousel.addEventListener("pointercancel", handleModeCarouselPointerEnd, { passive: true });
  carousel.addEventListener("touchstart", handleModeCarouselTouchStart, { passive: true });
  carousel.addEventListener("touchmove", handleModeCarouselTouchMove, { passive: true });
  carousel.addEventListener("touchend", handleModeCarouselTouchEnd, { passive: true });
  carousel.addEventListener("touchcancel", handleModeCarouselTouchEnd, { passive: true });

  modeCarouselInitialized = true;
  syncModeCarouselActiveState();
  centerActiveModeCard({ behavior: "auto" });
}

function centerActiveModeCard(options = {}) {
  const carousel = document.getElementById("modeButtons");
  const activeMode = getActiveModeId();
  const activeButton =
    carousel?.querySelector(`button[data-mode="${activeMode}"]`);
  if (!carousel || !activeButton) return;

  centerModeCarouselButton(activeButton, options);
}

function getNozzleTypeHelperText() {
  if (isApparatusMountedMode()) {
    if (state.nozzleType === "smoothbore") {
      return "Smoothbore uses the selected tip size and nozzle pressure to calculate deck gun flow and reaction.";
    }

    if (isFixedFogType(state.nozzleType)) {
      return "Fixed Fog uses the published GPM @ PSI rating to calculate flow, nozzle pressure, and reaction.";
    }

    return "Automatic Fog uses the selected rated flow and nozzle pressure for the apparatus-mounted stream.";
  }

  if (isMasterStream()) {
    const streamType = normalizeNozzleType(state.masterStreamType);

    if (streamType === "smoothbore") {
      return "Master Stream Smoothbore uses the selected tip size and nozzle pressure model for solid-stream flow.";
    }

    if (isFixedFogType(streamType)) {
      return "Master Stream Fixed Fog uses the published GPM @ PSI rating to calculate required or actual nozzle pressure.";
    }

    return "Master Stream Automatic Fog holds the selected nozzle pressure while hose and device losses are calculated.";
  }

  if (isSmoothbore()) {
    return isReverseMode()
      ? "Smoothbore uses the selected tip size and solves the achievable nozzle pressure from the available PDP."
      : "Smoothbore uses the selected tip size and nozzle pressure to calculate target flow.";
  }

  if (isBlade()) {
    return isReverseMode()
      ? "Blade uses the selected model and solves the achievable nozzle pressure from the available PDP."
      : "Blade uses the selected model and nozzle pressure to calculate target flow.";
  }

  if (isFixedFogType(state.nozzleType)) {
    return "Fixed Fog uses the published GPM @ PSI rating to calculate required or actual nozzle pressure.";
  }

  if (isAutomaticFogType(state.nozzleType)) {
    return "Automatic Fog holds the selected nozzle pressure while flow is calculated from available hose friction pressure.";
  }

  return "";
}

    function syncModeUi() {
      const smoothboreRequiredPdp = isRequiredPdpMode() && usesSmoothboreHydraulics();

      els.reverseModeButton.classList.toggle("active", isReverseMode());
      els.pdpModeButton.classList.toggle("active", isRequiredPdpMode());
      els.apparatusMountedModeButton?.classList.toggle("active", isApparatusMountedMode());
      els.relayModeButton.classList.toggle("active",isRelayMode());
      els.splitLayButton.classList.toggle("active", isSplitLayMode());
      els.standpipeOpsButton?.classList.toggle("active", isStandpipeOpsMode());
      syncModeCarouselActiveState();

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
        (isSplitLayMode() || isStandpipeOpsMode() || isApparatusMountedMode()) ? "none" : "";
      els.hoseLength.closest(".field").style.display =
        (isSplitLayMode() || isStandpipeOpsMode() || isApparatusMountedMode()) ? "none" : "";
      els.hoseSize.closest(".field").style.display =
        (isSplitLayMode() || isStandpipeOpsMode() || isApparatusMountedMode()) ? "none" : "";

      els.nozzleType.closest(".field").style.display =
  (isSplitLayMode() || isStandpipeOpsMode() || isRelayMode())
    ? "none"
    : "";
      els.applianceLoss.closest(".field").style.display =
        (isApparatusMountedMode() || isStandpipeOpsMode()) ? "none" : "";
      els.customCoefficient.closest(".field").style.display =
        (isSplitLayMode() || isStandpipeOpsMode() || isApparatusMountedMode()) ? "none" : "";
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
    if (isStandpipeOpsMode()) {

  document.documentElement.style.setProperty(
    "--mode-glow",
    "rgba(20, 184, 166, 0.34)"
  );

} else if (isSplitLayMode()) {

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
  : isStandpipeOpsMode()
    ? "Standpipe Ops: calculate engine PDP for standpipe stretches using attack demand, elevation, standpipe loss, and FDC supply loss."
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
      if (els.standpipeFormula) {
        els.standpipeFormula.hidden = !isStandpipeOpsMode();
      }

      els.primaryResultLabel.textContent =
  isSplitLayMode()
    ? "Split Lay PDP"
    : isStandpipeOpsMode()
      ? "Standpipe Ops PDP"
    : isApparatusMountedMode()
      ? "Required PDP"
    : isRelayMode()
      ? "Relay PDP"
      : isRequiredPdpMode()
        ? "Required PDP"
        : "Rounded Flow";

  els.primaryResultUnit.textContent =
  isRelayMode() || isRequiredPdpMode() || isSplitLayMode() || isStandpipeOpsMode() || isApparatusMountedMode()
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
    isRequiredPdpMode() && !isBlade() && !isFogHydraulicType(getMainNozzleType())
      ? "Supply"
      : "Reaction";

  els.setupLabel.textContent = "Setup";
  els.nozzleReaction.parentElement.style.display = "";

}

      els.nozzleTypeLabel.textContent = "Nozzle Style";

els.nozzleType.innerHTML = isApparatusMountedMode()
  ? `
  <option value="smoothbore">Smoothbore</option>
  <option value="automaticFog">Automatic Fog</option>
  <option value="fixedFog">Fixed Fog</option>
`
  : `
  <option value="smoothbore">Smoothbore</option>
  <option value="automaticFog">Automatic Fog</option>
  <option value="fixedFog">Fixed Fog</option>
  <option value="blade">Blade</option>
  <option value="masterstream">Master Stream</option>
`;

if (
  isApparatusMountedMode() &&
  !["automaticFog", "fixedFog", "smoothbore"].includes(normalizeNozzleType(state.nozzleType))
) {
  state.nozzleType = "smoothbore";
}

state.nozzleType = normalizeNozzleType(state.nozzleType);
els.nozzleType.value = state.nozzleType;

const nozzleTypeHelperText = getNozzleTypeHelperText();
if (els.nozzleTypeHelper) {
  els.nozzleTypeHelper.textContent = nozzleTypeHelperText;
  els.nozzleTypeHelper.hidden = !nozzleTypeHelperText;
}

els.nozzlePressureLabel.closest(".field").style.display =
  (isRelayMode() || isSplitLayMode() || isStandpipeOpsMode())
    ? "none"
    : "";

    els.relayResidualField.hidden = !isRelayMode();

    els.relayResidualField.style.display =
      isRelayMode() ? "" : "none";

    const splitLayFields = document.getElementById("splitLayFields");

if (splitLayFields) {
  splitLayFields.style.display = isSplitLayMode() ? "grid" : "none";
}

syncStandpipeUi();

if (els.splitResultsCard) {
  els.splitResultsCard.hidden = !isSplitLayMode();
}

if (els.standpipeResultsCard) {
  els.standpipeResultsCard.hidden = !isStandpipeOpsMode();
}

if (!isSplitLayMode()) {
  resetSplitLayResultCard();
}

if (!isStandpipeOpsMode()) {
  resetStandpipeResults();
}

if (els.standardResultsCard) {
  els.standardResultsCard.hidden = isSplitLayMode() || isStandpipeOpsMode();
}
if (els.standardResultsCard) {
  els.standardResultsCard.hidden = isSplitLayMode() || isStandpipeOpsMode();
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
syncStandpipeUi();
syncHenTurboUi();

if (!modeCarouselSuppressAutoCenter) {
  setTimeout(centerActiveModeCard, 0);
}

}

function syncSmoothboreUi() {

  if (isRelayMode() || isSplitLayMode() || isStandpipeOpsMode()) {

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
    if (els.fixedFogRatingField) {
      els.fixedFogRatingField.hidden = true;
      els.fixedFogRatingField.style.display = "none";
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

  const showFixedFog =
    isFixedFogType(getMainNozzleType());

  els.smoothboreTipField.hidden =
    !showSmoothbore;

  els.smoothboreTipField.style.display =
    showSmoothbore ? "" : "none";

  els.bladeModelField.hidden =
    !showBlade;

  els.bladeModelField.style.display =
    showBlade ? "" : "none";

  if (els.fixedFogRatingField) {
    els.fixedFogRatingField.hidden = !showFixedFog;
    els.fixedFogRatingField.style.display = showFixedFog ? "" : "none";
  }

  const showDualLines =
    isRequiredPdpMode() &&
    isMasterStream();

  els.dualLineSupplyField.hidden =
    !showDualLines;

  els.dualLineSupplyField.style.display =
    showDualLines ? "" : "none";

  const showApparatusFogFlow =
    showApparatusMounted && isAutomaticFogType(state.nozzleType);

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
  const fixedFogRatingField = document.getElementById(`splitAttack${lineNumber}FixedFogRatingField`);
  const tipField = document.getElementById(`splitAttack${lineNumber}SmoothboreTipField`);
  const bladeField = document.getElementById(`splitAttack${lineNumber}BladeModelField`);

  if (!nozzleType || !pressureSelect || !flowField || !tipField || !bladeField) return;

  const lineType = normalizeNozzleType(nozzleType.value);
  nozzleType.value = lineType;
  const isSmoothboreLine = lineType === "smoothbore";
  const isBladeLine = lineType === "blade";
  const isFixedFogLine = isFixedFogType(lineType);
  const usesSolidStreamOptions = isSmoothboreLine || isBladeLine;
  const bladeKey = `attack${lineNumber}BladeModel`;
  const selectedBladeModel = state.splitLay[bladeKey] || "blade160";

  populateSplitSmoothboreTipOptions(lineNumber);

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
  pressureSelect.closest(".field").hidden = isFixedFogLine;
  pressureSelect.closest(".field").style.display = isFixedFogLine ? "none" : "";

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

  flowField.hidden = usesSolidStreamOptions;
  flowField.style.display = usesSolidStreamOptions ? "none" : "";
  if (fixedFogRatingField) {
    fixedFogRatingField.hidden = !isFixedFogLine;
    fixedFogRatingField.style.display = isFixedFogLine ? "" : "none";
  }
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
    ? `Using default hose profile: ${getHoseProfileDisplayName(getDefaultHoseProfile(selectedHose.id))}. Calculation coefficient: ${activeCoefficient}.${modifiedText}`
    : `Using hose default coefficient: ${activeCoefficient}.${modifiedText}`;

    }

    // ========================================
    // EVENT HANDLING
    // ========================================
    function showAppView(viewName) {
      const isSettings = viewName === "settings";
      const isTools = viewName === "tools";

      if (
        isTools &&
        typeof guardToolsAccess === "function" &&
        !guardToolsAccess({
          redirect: false,
          reason: "in-app-tools-view"
        })
      ) {
        return;
      }

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

    function enforceRestoredSessionModeAccess() {
      const sessionMode = getSessionActiveMode();

      if (!isProGatedCalculatorMode(sessionMode) || isProUser()) return;

      saveSessionActiveMode(DEFAULT_STATE.mode);
      openProModal();
    }

    function activateCarouselMode(mode, options = {}) {
      if (!isValidCalculatorMode(mode)) return;

      if (isProGatedCalculatorMode(mode) && !isProUser()) {
        openProModal();
        return;
      }

      const targetButton = options.targetButton || null;
      const shouldPreserveCarouselTarget =
        !!targetButton && !!targetButton.closest?.(".mode-carousel");
      let activated = false;

      if (
        shouldPreserveCarouselTarget &&
        Date.now() < modeCarouselIgnoreClickUntil
      ) {
        return;
      }

      if (shouldPreserveCarouselTarget) {
        modeCarouselSuppressAutoCenter = true;
      }

      if (mode === "reverse") {
        setMode("reverse");
        resetSplitLayInputs();
        syncSplitLayInputsFromState();
        resetSplitLayResultCard();
        activated = true;
      }

      if (mode === "requiredPdp") {
        setMode("requiredPdp");
        resetSplitLayInputs();
        syncSplitLayInputsFromState();
        resetSplitLayResultCard();
        activated = true;
      }

      if (mode === "apparatusMounted") {
        setMode("apparatusMounted");
        resetSplitLayInputs();
        syncSplitLayInputsFromState();
        resetSplitLayResultCard();
        activated = true;
      }

      if (mode === "relay") {
        setMode("relay");
        resetSplitLayInputs();
        syncSplitLayInputsFromState();
        resetSplitLayResultCard();
        activated = true;
      }

      if (mode === "splitLay") {
        resetSplitLayInputs();
        resetSplitLayResultCard();
        setMode("splitLay");
        syncSplitLayInputsFromState();
        resetSplitLayResultCard();
        activated = true;
      }

      if (mode === "standpipeOps") {
        setMode("standpipeOps");
        syncStandpipeInputsFromState();
        resetStandpipeResults();
        activated = true;
      }

      modeCarouselSuppressAutoCenter = false;

      if (activated && shouldPreserveCarouselTarget) {
        syncModeCarouselActiveState();
        centerModeCarouselButton(targetButton, {
          behavior: options.behavior || "smooth"
        });
      }
    }

    function syncFormulaCardExpandedState() {
      if (!els.formulaCard || !els.formulaCardSummary) return;

      els.formulaCardSummary.setAttribute(
        "aria-expanded",
        els.formulaCard.open ? "true" : "false"
      );
    }

    function isToolsNavigationHref(href) {
      try {
        const url = new URL(href, window.location.href);
        return (
          url.origin === window.location.origin &&
          /\/tools\.html$/i.test(url.pathname)
        );
      } catch {
        return false;
      }
    }

    function bindToolsNavigationGuard() {
      if (document.body.dataset.toolsNavigationGuard === "ready") return;

      document.body.dataset.toolsNavigationGuard = "ready";
      document.addEventListener("click", event => {
        const link = event.target.closest?.("a[href]");
        if (!link || !isToolsNavigationHref(link.href) || isProUser()) return;

        event.preventDefault();
        event.stopPropagation();

        if (typeof guardToolsAccess === "function") {
          guardToolsAccess({
            redirect: false,
            reason: "tools-link-click"
          });
          return;
        }

        openProModal();
      });
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

      const supportPurchaseOwnership = ownsProViaSdkStore(store);
      if (supportPurchaseOwnership.ownsPro) {
        grantProFromSdkOwnership(store, {
          trigger: "support-page-purchase-click",
          purchase: false,
          restore: false
        });
        console.info("[Reverse Flow IAP]", {
          event: "support-page-purchase-skipped-owned-restore-required",
          productId: REVERSE_FLOW_PRO_PRODUCT_ID
        });
        if (!isProUser()) {
          alert("Reverse Flow Pro is already owned by this Apple ID. Tap Restore Purchase to activate it on this device.");
        }
        return;
      }

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

      if (product.owned === true) {
        grantProFromSdkOwnership(store, {
          trigger: "support-page-purchase-product-owned",
          purchase: false,
          restore: false
        });
        if (!isProUser()) {
          alert("Reverse Flow Pro is already owned by this Apple ID. Tap Restore Purchase to activate it on this device.");
        }
        return;
      }

      const offer = product.getOffer();

      if (!offer) {
        console.warn("[Reverse Flow IAP]", {
          event: "support-page-purchase-denied-offer-missing",
          productId: product?.id || REVERSE_FLOW_PRO_PRODUCT_ID,
          canPurchase: product?.canPurchase,
          owned: product?.owned,
          ...getIapDiagnosticPayload({
            rawProduct: product
          })
        });
        alert("Reverse Flow Pro purchase offer is not available yet.");
        return;
      }

      try {
        reverseFlowPurchaseInProgress = true;
        updateBuyProButtonState("processing", {
          reason: "support page purchase order started"
        });

        const error = await offer.order();

        if (error) {
          reverseFlowPurchaseInProgress = false;
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
        reverseFlowPurchaseInProgress = false;
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
        logReverseFlowRestoreDiagnostic("support-page-restore-start", store, {
          ready: reverseFlowProProductReady,
          initialized: reverseFlowProStoreInitialized
        });

        reverseFlowRestoreInProgress = true;
        if (els.restorePurchaseButton) {
          els.restorePurchaseButton.disabled = true;
          els.restorePurchaseButton.textContent = "Restoring...";
        }

        await store.restorePurchases();
        logReverseFlowRestoreDiagnostic("support-page-restore-complete", store, {
          isPro: isProUser(),
          restoreInProgress: reverseFlowRestoreInProgress
        });
        grantProFromSdkOwnership(store, {
          trigger: "support-page-restore-complete",
          restore: true
        });

        setTimeout(() => {
          if (!reverseFlowRestoreInProgress) return;
          logReverseFlowRestoreDiagnostic("support-page-restore-postcheck", store, {
            isPro: isProUser(),
            restoreInProgress: reverseFlowRestoreInProgress
          });
          if (grantProFromSdkOwnership(store, {
            trigger: "support-page-restore-postcheck",
            restore: true
          })) {
            return;
          }
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
        logReverseFlowRestoreDiagnostic("support-page-restore-failed", store, {
          error
        });
        alert("Purchases could not be restored.");
      }
    }

	    function bindSupportPageEvents() {
      bindToolsNavigationGuard();
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
    bindToolsNavigationGuard();
    syncFormulaCardExpandedState();
    els.formulaCard?.addEventListener("toggle", syncFormulaCardExpandedState);
    if (els.presetSelect) {
  els.presetSelect.addEventListener("change", e => applyPreset(e.target.value));
}
  [els.savePresetButton, els.savePresetButtonSplit, els.savePresetButtonStandpipe].forEach(button => {
    button?.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();

  if (!isProUser()) {
    openProModal();
    return;
  }

  openSavePumpChartSheet();
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
      [
        els.updatePumpChartSetupButton,
        els.updatePumpChartSetupButtonSplit,
        els.updatePumpChartSetupButtonStandpipe
      ].forEach(button => {
        button?.addEventListener("click", updateActivePumpChartSetup);
      });
      ["input", "change"].forEach(eventName => {
        els.calculatorView?.addEventListener(eventName, scheduleLoadedSetupUpdateSync);
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

      els.reverseModeButton.addEventListener("click", event => {
  activateCarouselMode("reverse", { targetButton: event.currentTarget });
});

els.pdpModeButton.addEventListener("click", event => {
  activateCarouselMode("requiredPdp", { targetButton: event.currentTarget });
});

els.apparatusMountedModeButton?.addEventListener("click", event => {
  activateCarouselMode("apparatusMounted", { targetButton: event.currentTarget });
});

els.relayModeButton.addEventListener("click", event => {
  activateCarouselMode("relay", { targetButton: event.currentTarget });
});

els.relayResidualPressure.addEventListener("change", e => {
  state.relayResidualPressure = e.target.value;
  updateCalculator();
});

els.splitLayButton.addEventListener("click", event => {
  activateCarouselMode("splitLay", { targetButton: event.currentTarget });
});

els.standpipeOpsButton?.addEventListener("click", event => {
  activateCarouselMode("standpipeOps", { targetButton: event.currentTarget });
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

  const purchaseOwnership = ownsProViaSdkStore(store);
  if (purchaseOwnership.ownsPro) {
    grantProFromSdkOwnership(store, {
      trigger: "purchase-click",
      purchase: false,
      restore: false
    });
    console.info("[Reverse Flow IAP]", {
      event: "purchase-skipped-owned-restore-required",
      productId: REVERSE_FLOW_PRO_PRODUCT_ID
    });
    if (!isProUser()) {
      alert("Reverse Flow Pro is already owned by this Apple ID. Tap Restore Purchase to activate it on this device.");
    }
    return;
  }

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

  if (product.owned === true) {
    grantProFromSdkOwnership(store, {
      trigger: "purchase-product-owned",
      purchase: false,
      restore: false
    });
    if (!isProUser()) {
      alert("Reverse Flow Pro is already owned by this Apple ID. Tap Restore Purchase to activate it on this device.");
    }
    return;
  }

  console.info("[Reverse Flow IAP]", {
    event: "purchase-product-found",
    id: product?.id,
    productId: product?.productId,
    canPurchase: product?.canPurchase,
    owned: product?.owned,
    state: product?.state,
    ...getIapDiagnosticPayload({
      rawProduct: product
    })
  });

	  const offer = product.getOffer();

	  if (!offer) {
	    console.warn("[Reverse Flow IAP]", {
	      event: "purchase-denied-offer-missing",
	      productId: product?.id || REVERSE_FLOW_PRO_PRODUCT_ID,
	      canPurchase: product?.canPurchase,
	      owned: product?.owned,
	      ...getIapDiagnosticPayload({
	        rawProduct: product
	      })
	    });
	  alert("Reverse Flow Pro purchase offer is not available yet.");
	  return;
	}

	  try {
	    reverseFlowPurchaseInProgress = true;
	    updateBuyProButtonState("processing", {
	      reason: "purchase order started"
    });

	    const error = await offer.order();

	    if (error) {
	      reverseFlowPurchaseInProgress = false;
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
	    reverseFlowPurchaseInProgress = false;
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
	    logReverseFlowRestoreDiagnostic("restore-start", store, {
	      ready: reverseFlowProProductReady,
	      initialized: reverseFlowProStoreInitialized
	    });

	    reverseFlowRestoreInProgress = true;
	    if (els.restorePurchaseButton) {
	      els.restorePurchaseButton.disabled = true;
	      els.restorePurchaseButton.textContent = "Restoring...";
	    }

	    await store.restorePurchases();
	    logReverseFlowRestoreDiagnostic("restore-complete", store, {
	      isPro: isProUser(),
	      restoreInProgress: reverseFlowRestoreInProgress
	    });
	    grantProFromSdkOwnership(store, {
	      trigger: "restore-complete",
	      restore: true
	    });

	    setTimeout(() => {
	      if (!reverseFlowRestoreInProgress) return;
	      logReverseFlowRestoreDiagnostic("restore-postcheck", store, {
	        isPro: isProUser(),
	        restoreInProgress: reverseFlowRestoreInProgress
	      });
	      if (grantProFromSdkOwnership(store, {
	        trigger: "restore-postcheck",
	        restore: true
	      })) {
	        return;
	      }
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
	    logReverseFlowRestoreDiagnostic("restore-failed", store, {
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

  shouldScrollToTopAfterPumpChartSaveClose = false;
  const data = loadPumpCharts();
  const lastViewedChartId = getLastViewedPumpChartId();
  const lastViewedChartExists = data.charts.some(chart => chart.id === lastViewedChartId);

  pumpChartView = lastViewedChartExists
    ? { screen: "detail", chartId: lastViewedChartId, setupId: null }
    : { screen: "list", chartId: null, setupId: null };

  renderPumpChart();

  els.pumpChartModal.hidden = false;

  els.viewPumpChartButton.classList.add("active");
  els.savePresetButton?.classList.remove("active");
});

els.closePumpChartModal.addEventListener("click", () => {
  closePumpChartModal();
});

els.pumpChartModal.addEventListener("click", event => {
  const overflowMenu = event.target.closest?.(".pump-chart-overflow");

  if (overflowMenu) {
    closePumpChartActionMenus(overflowMenu);
    return;
  }

  closePumpChartActionMenus();

  if (event.target === els.pumpChartModal) {
    closePumpChartModal();
  }
});

els.proModal.addEventListener("click", event => {
  if (event.target === els.proModal) {
    els.proModal.hidden = true;
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePumpChartActionMenus();
    els.proModal.hidden = true;
    closePumpChartModal();
  }
});

      ["pdp", "hoseLength", "applianceLoss", "reverseSupplyLength", "apparatusElevation", "apparatusCustomFogFlow", "ratedFlow", "ratedPressure"].forEach(id => {
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
      state.nozzleType = normalizeNozzleType(e.target.value);
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
  state.masterStreamType = normalizeNozzleType(e.target.value);

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
  ["splitAttack1RatedFlow", "attack1RatedFlow"],
  ["splitAttack1RatedPressure", "attack1RatedPressure"],
  ["splitAttack1SmoothboreTip", "attack1SmoothboreTip"],
  ["splitAttack1BladeModel", "attack1BladeModel"],

  ["splitAttack2Length", "attack2Length"],
  ["splitAttack2Hose", "attack2HoseSize"],
  ["splitAttack2NozzleType", "attack2NozzleType"],
  ["splitAttack2NozzlePressure", "attack2NozzlePressure"],
  ["splitAttack2Flow", "attack2Flow"],
  ["splitAttack2RatedFlow", "attack2RatedFlow"],
  ["splitAttack2RatedPressure", "attack2RatedPressure"],
  ["splitAttack2SmoothboreTip", "attack2SmoothboreTip"],
  ["splitAttack2BladeModel", "attack2BladeModel"]
].forEach(([elementId, stateKey]) => {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.addEventListener("input", e => {
    state.splitLay[stateKey] = e.target.tagName === "INPUT"
      ? wholeNumber(e.target.value)
      : e.target.value;

    if (stateKey.endsWith("NozzleType")) {
      state.splitLay[stateKey] = normalizeNozzleType(state.splitLay[stateKey]);
    }

    e.target.value = state.splitLay[stateKey];

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });

  element.addEventListener("change", e => {
    state.splitLay[stateKey] = normalizeNozzleType(e.target.value);

    saveState();
    syncSplitLayUi();
    calculateAndRender();
  });
});

els.standpipeAddOutletButton?.addEventListener("click", () => {
  const standpipe = state.standpipeOps;

  standpipe.attack2Enabled = true;
  [
    "Floor",
    "Length",
    "HoseSize",
    "NozzleType",
    "NozzlePressure",
    "Flow",
    "RatedFlow",
    "RatedPressure",
    "SmoothboreTip",
    "BladeModel"
  ].forEach(suffix => {
    standpipe[`attack2${suffix}`] = standpipe[`attack1${suffix}`];
  });

  saveState();
  syncStandpipeInputsFromState();
  syncStandpipeUi();
  calculateAndRender();
});

els.standpipeRemoveOutletButton?.addEventListener("click", () => {
  state.standpipeOps.attack2Enabled = false;

  saveState();
  syncStandpipeUi();
  calculateAndRender();
});

[
  ["standpipeAttack1Floor", "attack1Floor"],
  ["standpipeAttack1Length", "attack1Length"],
  ["standpipeAttack1Hose", "attack1HoseSize"],
  ["standpipeAttack1NozzleType", "attack1NozzleType"],
  ["standpipeAttack1NozzlePressure", "attack1NozzlePressure"],
  ["standpipeAttack1Flow", "attack1Flow"],
  ["standpipeAttack1RatedFlow", "attack1RatedFlow"],
  ["standpipeAttack1RatedPressure", "attack1RatedPressure"],
  ["standpipeAttack1SmoothboreTip", "attack1SmoothboreTip"],
  ["standpipeAttack1BladeModel", "attack1BladeModel"],
  ["standpipeAttack2Floor", "attack2Floor"],
  ["standpipeAttack2Length", "attack2Length"],
  ["standpipeAttack2Hose", "attack2HoseSize"],
  ["standpipeAttack2NozzleType", "attack2NozzleType"],
  ["standpipeAttack2NozzlePressure", "attack2NozzlePressure"],
  ["standpipeAttack2Flow", "attack2Flow"],
  ["standpipeAttack2RatedFlow", "attack2RatedFlow"],
  ["standpipeAttack2RatedPressure", "attack2RatedPressure"],
  ["standpipeAttack2SmoothboreTip", "attack2SmoothboreTip"],
  ["standpipeAttack2BladeModel", "attack2BladeModel"],
  ["standpipeSupplyLength", "supplyLength"],
  ["standpipeSupplyHose", "supplyHoseSize"],
  ["standpipeLoss", "standpipeLoss"]
].forEach(([elementId, stateKey]) => {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.addEventListener("input", e => {
    state.standpipeOps[stateKey] = e.target.tagName === "INPUT"
      ? wholeNumber(e.target.value)
      : e.target.value;

    if (stateKey.endsWith("NozzleType")) {
      state.standpipeOps[stateKey] = normalizeNozzleType(state.standpipeOps[stateKey]);
    }

    e.target.value = state.standpipeOps[stateKey];

    saveState();
    syncStandpipeUi();
    calculateAndRender();
  });

  element.addEventListener("change", e => {
    state.standpipeOps[stateKey] = normalizeNozzleType(e.target.value);

    saveState();
    syncStandpipeUi();
    calculateAndRender();
  });
});

els.standpipeDualSupplyToggle?.addEventListener("change", () => {
  state.standpipeOps.dualSupply =
    els.standpipeDualSupplyToggle.checked;

  saveState();
  syncStandpipeUi();
  calculateAndRender();
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
      syncLoadedSetupUpdateUi();
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
  if (state.mode !== mode) {
    clearPumpChartEditState();
  }

  const leavingSplitLay =
    state.mode === "splitLay" && mode !== "splitLay";

  const leavingStandpipeOps =
    state.mode === "standpipeOps" && mode !== "standpipeOps";

    const leavingReverseFlow =
  state.mode === "reverse" && mode !== "reverse";

  state.mode = mode;
  saveSessionActiveMode(mode);
  state.customNozzlePressure = "";
  clearCustomCoefficient();

  if (leavingSplitLay) {
    state.splitLay = getVisibleDefaultSplitLayState();

    resetSplitLayResultCard();
  }

  if (leavingStandpipeOps) {
    state.standpipeOps = getVisibleDefaultStandpipeOpsState();

    resetStandpipeResults();
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
    state.hoseSize = resolveVisibleHoseDefault("5", RELAY_HOSE_OPTIONS);

	    state.nozzleType = "30";
	    state.nozzlePressure = "";
    state.masterStreamType = "automaticFog";
    state.masterStreamLoss = "25";
    state.dualLineSupply = false;
    state.apparatusFogFlow = "1000";
    state.apparatusCustomFogFlow = "";
    state.apparatusElevation = "";
    state.ratedFlow = "";
    state.ratedPressure = "";

	    state.smoothboreTip = "";
    state.bladeModel = "blade160";

    state.applianceLoss = "0";
    state.henTurboEnabled = false;
  }

  if (mode === "apparatusMounted") {
    state.pdp = "";
    state.targetGpm = "";
    state.hoseLength = "";
    state.hoseSize = resolveVisibleHoseDefault("5", HOSE_OPTIONS);

    state.nozzleType = "smoothbore";
    state.masterStreamType = "automaticFog";
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
  state.hoseSize = resolveVisibleHoseDefault("1.88", HOSE_OPTIONS);

  state.nozzleType = "smoothbore";
	  state.masterStreamType = "automaticFog";
	  state.masterStreamLoss = "25";
	  state.dualLineSupply = false;
  state.apparatusFogFlow = "1000";
  state.apparatusCustomFogFlow = "";
  state.apparatusElevation = "";
  state.ratedFlow = "";
  state.ratedPressure = "";

	  state.nozzlePressure = "55";
  state.smoothboreTip = "";
  state.bladeModel = "blade160";

  state.applianceLoss = "0";
  state.henTurboEnabled = false;
}

  if (mode === "standpipeOps") {
    state.pdp = "";
    state.targetGpm = "";
    state.hoseLength = "";
    state.hoseSize = resolveVisibleHoseDefault("1.88", HOSE_OPTIONS);
    state.nozzleType = "smoothbore";
    state.masterStreamType = "automaticFog";
    state.masterStreamLoss = "25";
    state.dualLineSupply = false;
    state.apparatusFogFlow = "1000";
    state.apparatusCustomFogFlow = "";
    state.apparatusElevation = "";
    state.ratedFlow = "";
    state.ratedPressure = "";
    state.nozzlePressure = "55";
    state.smoothboreTip = "";
    state.bladeModel = "blade160";
    state.applianceLoss = "0";
    state.henTurboEnabled = false;
  }

  populateHoseOptions();
  populateSmoothboreTips();

  saveState();

  syncInputsFromState();
  syncSplitLayInputsFromState();
  syncStandpipeInputsFromState();
  syncSmoothboreUi();
  syncModeUi();

  renderPressureButtons();
  calculateAndRender();

  if (leavingSplitLay) {
    resetSplitLayResultCard();
  }
}

function resetCalculator() {
  clearPumpChartEditState();

  state = {
    ...DEFAULT_STATE,
    hoseSize: resolveVisibleHoseDefault(DEFAULT_STATE.hoseSize, HOSE_OPTIONS),
    reverseSupplyHoseSize: resolveVisibleHoseDefault(
      DEFAULT_STATE.reverseSupplyHoseSize,
      getSupplyHoseOptions()
    ),
    smoothboreTip: DEFAULT_STATE.smoothboreTip
      ? resolveVisibleSmoothboreTipDefault(
          DEFAULT_STATE.smoothboreTip,
          getHandlineSmoothboreTipOptions()
        )
      : "",
    splitLay: getVisibleDefaultSplitLayState(),
    standpipeOps: getVisibleDefaultStandpipeOpsState()
  };

  if (els.presetSelect) {
  els.presetSelect.value = "";
  els.presetSelect.selectedIndex = 0;
}

  populateHoseOptions();
  syncInputsFromState();
  resetSplitLayInputs();
  syncStandpipeInputsFromState();
  resetStandpipeResults();
  renderPressureButtons();
  saveState();
  calculateAndRender();
  scrollCalculatorPageToTop();
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
  const isStandpipe = isStandpipeOpsMode();

  return {
    mode: state.mode || "",

    pdp: state.pdp || "",
    targetGpm: state.targetGpm || "",
    relayResidualPressure: state.relayResidualPressure || (isRelayMode() ? "30" : ""),

    hoseLength: state.hoseLength || "",
    hoseSize: state.hoseSize || "",
    nozzleType: state.nozzleType || "",
    nozzlePressure: state.nozzlePressure || "",
    customNozzlePressure: state.customNozzlePressure || "",
    ratedFlow: state.ratedFlow || "",
    ratedPressure: state.ratedPressure || "",
    smoothboreTip: state.smoothboreTip || "",
    bladeModel: state.bladeModel || "blade160",
    masterStreamType: normalizeNozzleType(state.masterStreamType) || "automaticFog",
    masterStreamLoss: state.masterStreamLoss || "25",
    dualLineSupply: !!state.dualLineSupply,
    apparatusFogFlow: state.apparatusFogFlow || "1000",
    apparatusCustomFogFlow: state.apparatusCustomFogFlow || "",
    apparatusElevation: state.apparatusElevation || "",

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
    : isStandpipe
      ? els.standpipePrimaryPdp.textContent.replace(" PSI", "")
    : isReverseMode()
      ? state.pdp || ""
      : isRequiredPdpMode() || isRelayMode()
        ? els.roundedGpm.textContent
        : "",

    calculatedFlow:
      isSplit
        ? "Split Lay"
        : isStandpipe
          ? els.standpipeTotalFlow.textContent
        : isReverseMode()
          ? `${els.roundedGpm.textContent} GPM`
          : els.calculatedGpm.textContent,

    splitLay: JSON.parse(JSON.stringify(state.splitLay)),
    standpipeOps: JSON.parse(JSON.stringify(state.standpipeOps))
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
    ["splitAttack1NozzleType", normalizeNozzleType(state.splitLay.attack1NozzleType) || "smoothbore"],
    ["splitAttack1NozzlePressure", state.splitLay.attack1NozzlePressure || "50"],
    ["splitAttack1Flow", state.splitLay.attack1Flow || ""],
    ["splitAttack1RatedFlow", state.splitLay.attack1RatedFlow || ""],
    ["splitAttack1RatedPressure", state.splitLay.attack1RatedPressure || ""],
    ["splitAttack1SmoothboreTip", state.splitLay.attack1SmoothboreTip || ""],
    ["splitAttack1BladeModel", state.splitLay.attack1BladeModel || "blade160"],

    ["splitAttack2Length", state.splitLay.attack2Length || ""],
    ["splitAttack2Hose", state.splitLay.attack2HoseSize || "1.75"],
    ["splitAttack2NozzleType", normalizeNozzleType(state.splitLay.attack2NozzleType) || "smoothbore"],
    ["splitAttack2NozzlePressure", state.splitLay.attack2NozzlePressure || "50"],
    ["splitAttack2Flow", state.splitLay.attack2Flow || ""],
    ["splitAttack2RatedFlow", state.splitLay.attack2RatedFlow || ""],
    ["splitAttack2RatedPressure", state.splitLay.attack2RatedPressure || ""],
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

  clearPumpChartEditState();

  const isSplitPreset = preset.mode === "splitLay";

  state = {
    ...state,

   mode: preset.mode || state.mode,

    pdp: preset.pdp || "",
    targetGpm:
  preset.targetGpm ||
  preset.targetFlow ||
  "",

    relayResidualPressure:
      preset.relayResidualPressure || "30",

    hoseLength: preset.hoseLength || "",
    hoseSize: preset.hoseSize || state.hoseSize,
    nozzleType: normalizeNozzleType(preset.nozzleType) || state.nozzleType,
    nozzlePressure: Object.prototype.hasOwnProperty.call(preset, "nozzlePressure")
      ? preset.nozzlePressure
      : state.nozzlePressure,
    customNozzlePressure: preset.customNozzlePressure || "",
    ratedFlow: preset.ratedFlow || "",
    ratedPressure: preset.ratedPressure || "",

    smoothboreTip:
      preset.smoothboreTip || "",

    bladeModel:
      preset.bladeModel || "blade160",

    masterStreamType:
      normalizeNozzleType(preset.masterStreamType) || "automaticFog",

    masterStreamLoss:
      preset.masterStreamLoss || "25",

    dualLineSupply:
      !!preset.dualLineSupply,

    apparatusFogFlow:
      preset.apparatusFogFlow || "1000",

    apparatusCustomFogFlow:
      preset.apparatusCustomFogFlow || "",

    apparatusElevation:
      preset.apparatusElevation || "",

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

    splitLay: normalizeStateNozzleTypes({
      splitLay: {
      ...DEFAULT_STATE.splitLay,
      ...(preset.splitLay || {})
      }
    }).splitLay,

    standpipeOps: normalizeStateNozzleTypes({
      standpipeOps: {
      ...DEFAULT_STATE.standpipeOps,
      ...(preset.standpipeOps || {})
      }
    }).standpipeOps
  };

  populateHoseOptions();
  populateSmoothboreTips();
  enforceHenTurboAvailability();
  syncInputsFromState();
  syncSplitLayInputsFromState();
  syncStandpipeInputsFromState();
  syncReverseSupplyUi();
  syncSmoothboreUi();
  syncModeUi();
  renderPressureButtons();
  calculateAndRender();
  saveState();
}

function applyPumpChartSetup(chartId, setupId) {
  const { setup } = findPumpChartSetup(chartId, setupId);
  if (!setup) return;

  const preset = {
    ...setup.inputs,
    ...setup.result,
    id: setup.id,
    name: setup.name,
    mode: setup.mode
  };

  const isSplitPreset = preset.mode === "splitLay";

  state = {
    ...state,

   mode: preset.mode || state.mode,

    pdp: preset.pdp || "",
    targetGpm:
  preset.targetGpm ||
  preset.targetFlow ||
  "",

    relayResidualPressure:
      preset.relayResidualPressure || "30",

    hoseLength: preset.hoseLength || "",
    hoseSize: preset.hoseSize || state.hoseSize,
    nozzleType: normalizeNozzleType(preset.nozzleType) || state.nozzleType,
    nozzlePressure: Object.prototype.hasOwnProperty.call(preset, "nozzlePressure")
      ? preset.nozzlePressure
      : state.nozzlePressure,
    customNozzlePressure: preset.customNozzlePressure || "",
    ratedFlow: preset.ratedFlow || "",
    ratedPressure: preset.ratedPressure || "",

    smoothboreTip:
      preset.smoothboreTip || "",

    bladeModel:
      preset.bladeModel || "blade160",

    masterStreamType:
      normalizeNozzleType(preset.masterStreamType) || "automaticFog",

    masterStreamLoss:
      preset.masterStreamLoss || "25",

    dualLineSupply:
      !!preset.dualLineSupply,

    apparatusFogFlow:
      preset.apparatusFogFlow || "1000",

    apparatusCustomFogFlow:
      preset.apparatusCustomFogFlow || "",

    apparatusElevation:
      preset.apparatusElevation || "",

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

    splitLay: normalizeStateNozzleTypes({
      splitLay: {
      ...DEFAULT_STATE.splitLay,
      ...(preset.splitLay || {})
      }
    }).splitLay,

    standpipeOps: normalizeStateNozzleTypes({
      standpipeOps: {
      ...DEFAULT_STATE.standpipeOps,
      ...(preset.standpipeOps || {})
      }
    }).standpipeOps
  };

  populateHoseOptions();
  populateSmoothboreTips();
  enforceHenTurboAvailability();
  syncInputsFromState();
  syncSplitLayInputsFromState();
  syncStandpipeInputsFromState();
  syncReverseSupplyUi();
  syncSmoothboreUi();
  syncModeUi();
  renderPressureButtons();
  calculateAndRender();
  saveState();
}

window.openSavePumpChartSheet = function() {
  if (!isProUser()) {
    openProModal();
    return;
  }

  if (!hasValidRenderedCalculation()) {
    alert("Enter the required values to generate a valid calculation before saving to a Pump Chart.");
    return;
  }

  shouldScrollToTopAfterPumpChartSaveClose = false;
  pumpChartView = { screen: "save", chartId: null, setupId: null };
  renderPumpChart();
  els.pumpChartModal.hidden = false;
  els.viewPumpChartButton?.classList.add("active");
};

window.showPumpChartsList = function() {
  renderPumpChartList();
};

window.openPumpChartDetail = function(chartId) {
  pumpChartView = { screen: "detail", chartId, setupId: null };
  renderPumpChart();
};

window.closePumpChartActionMenus = function(exceptMenu = null) {
  document.querySelectorAll(".pump-chart-overflow[open]").forEach(menu => {
    if (menu !== exceptMenu) menu.open = false;
  });
};

window.viewPumpChartSetup = function(chartId, setupId) {
  pumpChartView = { screen: "setup", chartId, setupId };
  renderPumpChart();
};

window.loadPumpChartSetup = function(chartId, setupId) {
  if (!isProUser()) {
    openProModal();
    return;
  }

  applyPumpChartSetup(chartId, setupId);
  setPumpChartEditState(chartId, setupId);
  closePumpChartModal({ allowPostSaveScroll: false });
};

window.movePumpChartSetup = function(chartId, setupId, direction) {
  const data = loadPumpCharts();
  const chart = data.charts.find(item => item.id === chartId);
  if (!chart) return;

  const currentIndex = chart.setups.findIndex(item => item.id === setupId);
  if (currentIndex < 0) return;

  const targetIndex = direction === "up"
    ? currentIndex - 1
    : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= chart.setups.length) return;

  const movedSetup = chart.setups[currentIndex];
  chart.setups[currentIndex] = chart.setups[targetIndex];
  chart.setups[targetIndex] = movedSetup;
  chart.updatedAt = nowIsoString();

  if (!savePumpCharts(data)) return;

  renderPresetOptions();
  renderPumpChartDetail(chartId);
};

window.deletePumpChartSetup = function(chartId, setupId) {
  const data = loadPumpCharts();
  const chart = data.charts.find(item => item.id === chartId);
  const setup = chart?.setups.find(item => item.id === setupId);
  if (!chart || !setup) return;

  const confirmed = confirm(`Delete "${setup.name}" from ${chart.name}?`);
  if (!confirmed) return;

  chart.setups = chart.setups.filter(item => item.id !== setupId);
  chart.updatedAt = nowIsoString();

  if (!savePumpCharts(data)) return;

  if (
    activePumpChartEdit?.chartId === chartId &&
    activePumpChartEdit?.setupId === setupId
  ) {
    clearPumpChartEditState();
  }

  renderPresetOptions();
  pumpChartView = { screen: "detail", chartId, setupId: null };
  renderPumpChart();
};

window.editPumpChartMetadata = function(chartId) {
  const data = loadPumpCharts();
  const chart = data.charts.find(item => item.id === chartId);
  if (!chart) return;

  const name = prompt("Pump Chart name:", chart.name);
  if (!name || !name.trim()) return;

  const department = prompt("Department / Company:", chart.department || "");
  if (department === null) return;

  const notes = prompt("Notes:", chart.notes || "");
  if (notes === null) return;

  chart.name = name.trim();
  chart.department = department.trim();
  chart.notes = notes.trim();
  chart.updatedAt = nowIsoString();

  if (!savePumpCharts(data)) return;
  renderPumpChart();
};

window.deletePumpChart = function(chartId) {
  const data = loadPumpCharts();
  const chart = data.charts.find(item => item.id === chartId);
  if (!chart) return;

  const confirmed = confirm(`Delete Pump Chart "${chart.name}" and all ${chart.setups.length} setups?`);
  if (!confirmed) return;

  data.charts = data.charts.filter(item => item.id !== chartId);
  clearLastViewedPumpChartId(chartId);

  if (!savePumpCharts(data)) return;
  renderPresetOptions();
  renderPumpChartList();
};

window.loadPumpChartPreset = function(presetId) {
  const preset = loadPresets().find(item => item.id === presetId);
  if (!preset) return;

  if (preset.chartId && preset.setupId) {
    window.loadPumpChartSetup(preset.chartId, preset.setupId);
    return;
  }

  applyPreset(presetId);
  closePumpChartModal({ allowPostSaveScroll: false });
};

window.deletePumpChartPreset = function(presetId) {
  const preset = loadPresets().find(item => item.id === presetId);
  if (preset?.chartId && preset?.setupId) {
    window.deletePumpChartSetup(preset.chartId, preset.setupId);
  }
};

window.exportPumpChart = async function(chartId) {
  if (!isProUser()) {
    openProModal();
    return;
  }

  const chart = findPumpChart(chartId);
  if (!chart) return;

  const shareText = buildPumpChartShareText(chart);
  const pngExport = await createPumpChartPngFile(chart);
  const shareTitle = `${chart.name} Pump Chart`;

  await shareGeneratedPngFile({
    pngExport,
    shareTitle,
    fallbackText: shareText,
    nativeFolder: "pump-charts",
    nativeDialogTitle: "Share Pump Chart",
    fallbackMessage: "Pump Chart sharing is unavailable on this device.",
    fallbackCopyMessage: "Pump Chart text copied to clipboard.",
    showTextShareNotice: showPumpChartShareFallbackMessage
  });
};

async function shareGeneratedPngFile({
  pngExport,
  shareTitle,
  fallbackText = "",
  nativeFolder = "generated",
  nativeDialogTitle = "Share PNG",
  fallbackMessage = "PNG sharing is unavailable on this device.",
  fallbackCopyMessage = "Share text copied to clipboard.",
  showTextShareNotice = null
}) {
  const pngFile = pngExport?.file || null;
  const hasNavigatorShare = typeof navigator.share === "function";
  const hasNavigatorCanShare = typeof navigator.canShare === "function";
  const sharePlatform = getPumpChartSharePlatform();
  let canSharePngFile = false;

  logPumpChartShareStep("platform-detected", sharePlatform);

  if (pngFile && sharePlatform.supportsNativeFileShare) {
    const nativeShareResult = await sharePumpChartPngWithNativeCapacitor(pngFile, shareTitle, sharePlatform.platform, {
      folder: nativeFolder,
      dialogTitle: nativeDialogTitle
    });
    if (nativeShareResult.shared) return { shared: true, reason: "" };
    logPumpChartShareFallback(nativeShareResult.reason);
  }

  logPumpChartShareStep("web-share-support", {
    navigatorShare: hasNavigatorShare,
    navigatorCanShare: hasNavigatorCanShare
  });

  if (pngFile && hasNavigatorCanShare) {
    try {
      canSharePngFile = navigator.canShare({ files: [pngFile] });
      logPumpChartShareStep("png-canShare-result", {
        canShareFiles: canSharePngFile
      });
    } catch (error) {
      logPumpChartShareStep("png-canShare-error", {
        message: error?.message || String(error)
      });
    }
  } else if (!pngFile) {
    logPumpChartShareFallback(`PNG file unavailable: ${pngExport.reason}`);
  } else {
    logPumpChartShareFallback("navigator.canShare is unavailable.");
  }

  if (pngFile && hasNavigatorShare && hasNavigatorCanShare && canSharePngFile) {
    try {
      logPumpChartShareStep("png-share-attempt", {
        fileName: pngFile.name,
        fileType: pngFile.type,
        fileSize: pngFile.size
      });
      await navigator.share({
        title: shareTitle,
        files: [pngFile]
      });
      logPumpChartShareStep("png-share-success");
      return { shared: true, reason: "" };
    } catch (error) {
      if (error?.name === "AbortError") {
        logPumpChartShareStep("png-share-aborted");
        return { shared: false, reason: "Share cancelled." };
      }
      logPumpChartShareStep("png-share-error", {
        message: error?.message || String(error)
      });
      logPumpChartShareFallback(`PNG share failed: ${error?.message || String(error)}`);
    }
  } else if (pngFile) {
    logPumpChartShareFallback(
      `PNG sharing unavailable: navigator.share=${hasNavigatorShare}, navigator.canShare=${hasNavigatorCanShare}, canShareFiles=${canSharePngFile}.`
    );
  }

  if (fallbackText && hasNavigatorShare) {
    try {
      if (typeof showTextShareNotice === "function") showTextShareNotice();
      logPumpChartShareStep("share-text-attempt");
      await navigator.share({
        title: shareTitle,
        text: fallbackText
      });
      logPumpChartShareStep("share-text-success");
      return { shared: false, reason: "Text fallback shared." };
    } catch (error) {
      if (error?.name === "AbortError") {
        logPumpChartShareStep("share-text-aborted");
        return { shared: false, reason: "Share cancelled." };
      }
      logPumpChartShareFallback(`Text share failed: ${error?.message || String(error)}`);
    }
  } else if (fallbackText) {
    logPumpChartShareFallback("navigator.share is unavailable for text fallback.");
  }

  logPumpChartShareStep("browser-print-fallback-skipped", {
    reason: "Printable export fallback is disabled for Export / Share."
  });

  if (fallbackText && await copyPumpChartShareTextToClipboard(fallbackText)) {
    showPumpChartShareMessage(fallbackCopyMessage);
    return { shared: false, reason: "Text copied to clipboard." };
  }

  logPumpChartShareFallback("Text share and clipboard fallback failed.");
  showPumpChartShareMessage(fallbackMessage);
  return { shared: false, reason: fallbackMessage };
}

function getPumpChartSharePlatform() {
  const capacitor = window.Capacitor;
  let platform = "web";
  let isNative = false;

  try {
    platform = capacitor?.getPlatform?.() || "web";
    isNative = !!capacitor?.isNativePlatform?.();
  } catch (error) {
    logPumpChartShareStep("platform-detection-error", {
      message: error?.message || String(error)
    });
  }

  const plugins = capacitor?.Plugins || {};

  return {
    platform,
    isNative,
    isAndroidNative: platform === "android" && isNative,
    isIosNative: platform === "ios" && isNative,
    supportsNativeFileShare: (platform === "android" || platform === "ios") && isNative,
    hasCapacitor: !!capacitor,
    hasFilesystem: !!plugins.Filesystem,
    hasShare: !!plugins.Share
  };
}

async function sharePumpChartPngWithNativeCapacitor(pngFile, shareTitle, platform, options = {}) {
  const plugins = window.Capacitor?.Plugins || {};
  const Filesystem = plugins.Filesystem;
  const Share = plugins.Share;

  logPumpChartShareStep("native-capacitor-availability", {
    platform,
    hasFilesystem: !!Filesystem,
    hasShare: !!Share
  });

  if (!Filesystem || !Share) {
    return {
      shared: false,
      reason: `Native ${platform} share unavailable: Capacitor Filesystem or Share plugin missing.`
    };
  }

  let base64Data = "";
  try {
    logPumpChartShareStep("png-base64-conversion-attempt", {
      fileName: pngFile.name,
      fileType: pngFile.type,
      fileSize: pngFile.size
    });
    base64Data = await blobToBase64Payload(pngFile);
    logPumpChartShareStep("png-base64-conversion-success", {
      base64Length: base64Data.length
    });
  } catch (error) {
    logPumpChartShareStep("png-base64-conversion-failure", {
      message: error?.message || String(error)
    });
    return {
      shared: false,
      reason: `Native ${platform} PNG conversion failed: ${error?.message || String(error)}`
    };
  }

  const path = `${options.folder || "pump-charts"}/${pngFile.name}`;
  let fileUri = "";

  try {
    logPumpChartShareStep("native-file-write-attempt", {
      path,
      directory: "CACHE"
    });
    const writeResult = await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: "CACHE",
      recursive: true
    });
    fileUri = writeResult.uri || "";
    logPumpChartShareStep("native-file-write-success", {
      path,
      uri: fileUri
    });
  } catch (error) {
    logPumpChartShareStep("native-file-write-failure", {
      path,
      message: error?.message || String(error)
    });
    return {
      shared: false,
      reason: `Native ${platform} PNG file write failed: ${error?.message || String(error)}`
    };
  }

  try {
    logPumpChartShareStep("native-share-attempt", {
      fileName: pngFile.name,
      uri: fileUri
    });
    await Share.share({
      title: shareTitle,
      files: [fileUri],
      dialogTitle: options.dialogTitle || "Share Pump Chart"
    });
    logPumpChartShareStep("native-share-success", {
      uri: fileUri
    });
    return {
      shared: true,
      reason: ""
    };
  } catch (error) {
    logPumpChartShareStep("native-share-failure", {
      uri: fileUri,
      message: error?.message || String(error)
    });
    return {
      shared: false,
      reason: `Native ${platform} PNG share failed: ${error?.message || String(error)}`
    };
  }
}

async function createPumpChartPngFile(chart) {
  if (typeof Blob === "undefined" || typeof File === "undefined") {
    logPumpChartShareFallback("Blob or File constructor is unavailable.");
    return {
      file: null,
      reason: "Blob or File constructor is unavailable."
    };
  }

  const source = getPumpChartExportElement();
  if (!source) {
    logPumpChartShareFallback("Pump Chart export element was not found.");
    return {
      file: null,
      reason: "Pump Chart export element was not found."
    };
  }

  try {
    logPumpChartExportDomSources(source);

    const exportElement = createPumpChartExportRenderElement(source);
    let blob = null;

    if (exportElement) {
      try {
        blob = await tryRenderElementToPngBlob(exportElement, "dom-export");
        if (!blob) {
          const sanitizedClone = createSanitizedPumpChartExportClone(exportElement);
          if (sanitizedClone) {
            blob = await tryRenderElementToPngBlob(sanitizedClone, "dom-sanitized");
          }
        }
        if (!blob) {
          blob = await tryRenderManualPumpChartCanvasToBlob(exportElement);
        }
      } finally {
        const exportWrapper = exportElement.parentElement;
        if (exportWrapper) {
          exportWrapper.remove();
        } else {
          exportElement.remove();
        }
      }
    }

    if (!blob) {
      blob = await tryRenderManualPumpChartCanvasToBlob(source);
    }
    if (!blob) {
      logPumpChartShareFallback("PNG renderer did not return a blob.");
      return {
        file: null,
        reason: "PNG renderer did not return a blob."
      };
    }

    logPumpChartShareStep("png-blob-created", {
      blobSize: blob.size,
      blobType: blob.type
    });

    let file;
    try {
      file = new File(
        [blob],
        `${sanitizeFileName(chart.name)}-Pump-Chart.png`,
        { type: "image/png" }
      );
    } catch (error) {
      logPumpChartShareStep("png-file-error", {
        message: error?.message || String(error)
      });
      throw error;
    }

    logPumpChartShareStep("png-file-created", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    return {
      file,
      reason: ""
    };
  } catch (error) {
    logPumpChartShareFallback(`PNG export failed: ${error?.message || String(error)}`);
    return {
      file: null,
      reason: `PNG export failed: ${error?.message || String(error)}`
    };
  }
}

function getPumpChartExportElement() {
  if (!els.pumpChartModal || els.pumpChartModal.hidden) return null;

  return els.pumpChartModal.querySelector(".pump-chart-document");
}

function getPumpChartExportLogoSrc() {
  return GENERATED_PNG_STYLE.brand.logoSrc;
}

const GENERATED_PNG_STYLE = {
  background: "#ffffff",
  borderColor: "#cbd5e1",
  accentColor: "#d95c13",
  documentTopBorder: "6px solid rgba(217, 92, 19, 0.84)",
  canvasTopBorderHeight: 8,
  card: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: 24
  },
  header: {
    minHeight: 146,
    gap: 22,
    dividerColor: "#cbd5e1",
    labelFont: "900 13px Arial, sans-serif",
    labelSize: "12px",
    titleFont: "900 29px Arial, sans-serif",
    titleSize: "25px",
    subtitleFont: "900 18px Arial, sans-serif",
    subtitleSize: "16px",
    detailFont: "800 16px Arial, sans-serif",
    detailSize: "14px",
    mutedColor: "#64748b",
    titleColor: "#111827",
    detailColor: "#334155"
  },
  brand: {
    logoSrc: "/icons/reverse-flow-logo.png",
    borderRadiusRatio: 0.22,
    compact: {
      logoSize: 42,
      gap: 6,
      primaryFont: "900 18px Arial, sans-serif",
      secondaryFont: "900 12px Arial, sans-serif",
      primarySize: "15px",
      secondarySize: "11px",
      textWidth: 108,
      blockWidth: 154,
      cardHeight: 58,
      paddingX: 0,
      paddingY: 0
    },
    wide: {
      logoSize: 82,
      gap: 13,
      primaryFont: "900 31px Arial, sans-serif",
      secondaryFont: "900 22px Arial, sans-serif",
      textWidth: 250,
      blockWidth: 350
    }
  }
};

window.exportFrictionLossChart = async function(selectedHoseIds = []) {
  const pngExport = await createFrictionLossChartPngFile(selectedHoseIds);
  return await shareGeneratedPngFile({
    pngExport,
    shareTitle: "Friction Loss Chart",
    fallbackText: "Reverse Flow Friction Loss Chart generated as a PNG.",
    nativeFolder: "friction-loss-charts",
    nativeDialogTitle: "Share Friction Loss Chart",
    fallbackMessage: "Friction Loss Chart sharing is unavailable on this device.",
    fallbackCopyMessage: "Friction Loss Chart share text copied to clipboard."
  });
};

async function createFrictionLossChartPngFile(selectedHoseIds = []) {
  if (typeof Blob === "undefined" || typeof File === "undefined") {
    logPumpChartShareFallback("Blob or File constructor is unavailable.");
    return {
      file: null,
      reason: "Blob or File constructor is unavailable."
    };
  }

  try {
    const hoses = getFrictionLossChartHoses(selectedHoseIds);
    if (!hoses.length) {
      return {
        file: null,
        reason: "No hose sizes selected."
      };
    }

    const canvas = await renderFrictionLossChartCanvas(hoses);
    const blob = await exportCanvasToPngBlob(canvas, "friction-loss-chart");
    if (!blob) {
      return {
        file: null,
        reason: "PNG renderer did not return a blob."
      };
    }

    const file = new File(
      [blob],
      "reverse-flow-friction-loss-chart.png",
      { type: "image/png" }
    );

    logPumpChartShareStep("friction-loss-chart-file-created", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    return {
      file,
      reason: ""
    };
  } catch (error) {
    logPumpChartShareFallback(`Friction Loss Chart PNG export failed: ${error?.message || String(error)}`);
    return {
      file: null,
      reason: `Friction Loss Chart PNG export failed: ${error?.message || String(error)}`
    };
  }
}

function getFrictionLossChartHoses(selectedHoseIds = []) {
  const selected = new Set(selectedHoseIds.map(id => String(id)));
  const optionsById = new Map();

  [...(typeof HOSE_OPTIONS !== "undefined" ? HOSE_OPTIONS : []), ...(typeof RELAY_HOSE_OPTIONS !== "undefined" ? RELAY_HOSE_OPTIONS : [])]
    .forEach(hose => {
      if (!hose?.id || optionsById.has(hose.id)) return;
      const coefficient = getActiveHoseCoefficient(hose.id);
      if (!(coefficient > 0)) return;
      optionsById.set(hose.id, {
        id: hose.id,
        label: formatFrictionLossChartHoseLabel(hose),
        coefficient
      });
    });

  return [...optionsById.values()].filter(hose => selected.has(hose.id));
}

async function renderFrictionLossChartCanvas(hoses) {
  const width = 1100;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const margin = 52;
  const contentWidth = width - margin * 2;
  const flows = Array.from({ length: 21 }, (_, index) => index * 50);
  const headerTop = 52;
  const headerHeight = GENERATED_PNG_STYLE.header.minHeight;
  const tableTop = headerTop + headerHeight + 32;
  const tableHeaderHeight = 88;
  const rowHeight = 45;
  const tableHeight = tableHeaderHeight + flows.length * rowHeight;
  const coefficientsTop = tableTop + tableHeight + 22;
  const coefficientLayout = getFrictionLossCoefficientLayout(hoses);
  const coefficientsHeight = coefficientLayout.height;
  const height = Math.ceil(coefficientsTop + coefficientsHeight + 76);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable.");

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawGeneratedPngCanvasBackground(context, width, height);

  await drawGeneratedPngCanvasHeader(canvas, context, {
    x: margin,
    y: headerTop,
    width: contentWidth,
    label: "FRICTION LOSS CHART",
    title: "Friction Loss Chart",
    subtitle: "Per 100 Feet of Hose",
    metadata: getGeneratedPngMetadataLine([
      getGeneratedPngProfileName(),
      `Generated ${formatPumpChartDate(new Date().toISOString())}`
    ])
  });

  drawFrictionLossTable(context, {
    x: margin,
    y: tableTop,
    width: contentWidth,
    headerHeight: tableHeaderHeight,
    rowHeight,
    hoses,
    flows
  });

  drawFrictionLossCoefficientBox(context, {
    x: margin,
    y: coefficientsTop,
    width: contentWidth,
    height: coefficientsHeight,
    hoses,
    layout: coefficientLayout
  });

  return canvas;
}

async function drawGeneratedPngCanvasHeader(canvas, context, options) {
  const layout = getGeneratedPngHeaderLayout(options);
  const headerStyle = GENERATED_PNG_STYLE.header;

  context.fillStyle = headerStyle.mutedColor;
  context.font = headerStyle.labelFont;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(String(options.label || "").toUpperCase(), layout.textX, options.y + 18, layout.textWidth);

  context.fillStyle = headerStyle.titleColor;
  context.font = headerStyle.titleFont;
  const titleLines = wrapCanvasText(context, options.title || "", layout.textWidth).slice(0, 2);
  let nextY = options.y + 52;
  titleLines.forEach((line, index) => {
    context.fillText(line, layout.textX, nextY + index * 34, layout.textWidth);
  });
  nextY += Math.max(1, titleLines.length) * 34 + 2;

  if (options.subtitle) {
    context.fillStyle = headerStyle.detailColor;
    context.font = headerStyle.subtitleFont;
    const subtitleLines = wrapCanvasText(context, options.subtitle, layout.textWidth).slice(0, 2);
    subtitleLines.forEach((line, index) => {
      context.fillText(line, layout.textX, nextY + index * 23, layout.textWidth);
    });
    nextY += subtitleLines.length * 23 + 2;
  }

  context.fillStyle = headerStyle.detailColor;
  context.font = headerStyle.detailFont;
  const detailLines = wrapCanvasMetadataLine(context, options.metadata || "", layout.textWidth)
    .slice(0, 4);

  detailLines.forEach((line, index) => {
    context.fillText(line, layout.textX, nextY + index * 22, layout.textWidth);
  });

  await drawGeneratedPngBrandLogo(canvas, {
    x: layout.brandLogoX,
    y: layout.brandLogoY,
    logoSize: GENERATED_PNG_STYLE.brand.compact.logoSize,
    gap: GENERATED_PNG_STYLE.brand.compact.gap,
    primaryFont: GENERATED_PNG_STYLE.brand.compact.primaryFont,
    secondaryFont: GENERATED_PNG_STYLE.brand.compact.secondaryFont,
    textWidth: GENERATED_PNG_STYLE.brand.compact.textWidth
  });

  context.strokeStyle = headerStyle.dividerColor;
  context.beginPath();
  context.moveTo(options.x, options.y + headerStyle.minHeight + 0.5);
  context.lineTo(options.x + options.width, options.y + headerStyle.minHeight + 0.5);
  context.stroke();
}

function getGeneratedPngHeaderLayout(options) {
  const brand = GENERATED_PNG_STYLE.brand.compact;
  const brandCardWidth = brand.blockWidth;
  const brandCardHeight = brand.cardHeight;
  const gap = GENERATED_PNG_STYLE.header.gap;
  const brandCardX = options.x + options.width - brandCardWidth;
  const brandCardY = options.y + 46;
  const brandLogoX = brandCardX + brand.paddingX;
  const brandLogoY = brandCardY + Math.round((brandCardHeight - brand.logoSize) / 2);

  return {
    textX: options.x,
    textWidth: Math.max(220, options.width - brandCardWidth - gap),
    brandCardX,
    brandCardY,
    brandCardWidth,
    brandCardHeight,
    brandLogoX,
    brandLogoY
  };
}

function drawFrictionLossTable(context, options) {
  const firstColumnWidth = 118;
  const hoseColumnWidth = (options.width - firstColumnWidth) / options.hoses.length;
  const tableHeight = options.headerHeight + options.flows.length * options.rowHeight;
  const bottom = options.y + tableHeight;

  drawCanvasRoundedRect(context, options.x, options.y, options.width, tableHeight, 8);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#cbd5e1";
  context.stroke();

  context.fillStyle = "#f8fafc";
  context.fillRect(options.x + 1, options.y + 1, options.width - 2, options.headerHeight - 1);

  context.strokeStyle = "#d8dee7";
  context.lineWidth = 1;
  for (let rowIndex = 0; rowIndex <= options.flows.length; rowIndex += 1) {
    const y = options.y + options.headerHeight + rowIndex * options.rowHeight + 0.5;
    context.beginPath();
    context.moveTo(options.x, y);
    context.lineTo(options.x + options.width, y);
    context.stroke();
  }

  context.beginPath();
  context.moveTo(options.x + firstColumnWidth + 0.5, options.y);
  context.lineTo(options.x + firstColumnWidth + 0.5, bottom);
  context.stroke();

  options.hoses.forEach((hose, index) => {
    const x = options.x + firstColumnWidth + index * hoseColumnWidth;
    context.beginPath();
    context.moveTo(x + 0.5, options.y + options.headerHeight);
    context.lineTo(x + 0.5, bottom);
    context.stroke();
  });

  context.fillStyle = "#111827";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 22px Arial, sans-serif";
  context.fillText("FLOW", options.x + firstColumnWidth / 2, options.y + 31, firstColumnWidth - 18);
  context.fillText("(GPM)", options.x + firstColumnWidth / 2, options.y + 60, firstColumnWidth - 18);

  context.font = "900 23px Arial, sans-serif";
  context.fillText("HOSE SIZE", options.x + firstColumnWidth + (options.width - firstColumnWidth) / 2, options.y + 29, options.width - firstColumnWidth);

  context.font = getTableFontForColumnCount(options.hoses.length, true);
  options.hoses.forEach((hose, index) => {
    const centerX = options.x + firstColumnWidth + index * hoseColumnWidth + hoseColumnWidth / 2;
    context.fillText(hose.label, centerX, options.y + 66, hoseColumnWidth - 10);
  });

  context.font = "900 22px Arial, sans-serif";
  options.flows.forEach((flow, rowIndex) => {
    const centerY = options.y + options.headerHeight + rowIndex * options.rowHeight + options.rowHeight / 2;
    context.fillStyle = "#111827";
    context.fillText(String(flow), options.x + firstColumnWidth / 2, centerY, firstColumnWidth - 16);

    context.fillStyle = "#0f172a";
    context.font = getTableFontForColumnCount(options.hoses.length, false);
    options.hoses.forEach((hose, colIndex) => {
      const loss = calculateFrictionLossPerHundred(hose.coefficient, flow);
      const centerX = options.x + firstColumnWidth + colIndex * hoseColumnWidth + hoseColumnWidth / 2;
      context.fillText(formatFrictionLossCell(loss), centerX, centerY, hoseColumnWidth - 10);
    });
    context.font = "900 22px Arial, sans-serif";
  });
}

function drawFrictionLossCoefficientBox(context, options) {
  const layout = options.layout || getFrictionLossCoefficientLayout(options.hoses);

  drawCanvasRoundedRect(context, options.x, options.y, options.width, options.height, 8);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#cbd5e1";
  context.stroke();

  context.fillStyle = "#111827";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = "900 18px Arial, sans-serif";
  context.fillText("COEFFICIENTS USED", options.x + 22, options.y + 32, options.width - 44);

  const columnWidth = (options.width - 44) / layout.columnCount;

  context.font = "700 18px Arial, sans-serif";
  options.hoses.forEach((hose, index) => {
    const column = Math.floor(index / layout.rowsPerColumn);
    const row = index % layout.rowsPerColumn;
    const x = options.x + 22 + column * columnWidth;
    const y = options.y + layout.rowStart + row * layout.rowGap;
    context.fillStyle = "#111827";
    context.fillText(`${hose.label} = ${formatCoefficientForChart(hose.coefficient)}`, x, y, columnWidth - 14);
  });

}

function getFrictionLossCoefficientLayout(hoses) {
  const count = Math.max(1, hoses.length);
  const columnCount = count >= 7 ? 3 : count >= 4 ? 2 : 1;
  const rowsPerColumn = Math.ceil(count / columnCount);
  const rowStart = 62;
  const rowGap = 27;
  const contentBottom = rowStart + rowsPerColumn * rowGap + 8;

  return {
    columnCount,
    rowsPerColumn,
    rowStart,
    rowGap,
    height: contentBottom + 16
  };
}

function formatFrictionLossChartHoseLabel(hose) {
  const id = String(hose?.id || "").trim();
  if (!id) return String(hose?.chartName || hose?.label || "").replace(/"/g, "").trim();
  if (id === "dual3") return "Dual 3";
  return id;
}

function getTableFontForColumnCount(columnCount, isHeader) {
  if (columnCount > 10) return isHeader ? "900 17px Arial, sans-serif" : "700 18px Arial, sans-serif";
  if (columnCount > 8) return isHeader ? "900 19px Arial, sans-serif" : "700 19px Arial, sans-serif";
  return isHeader ? "900 22px Arial, sans-serif" : "700 22px Arial, sans-serif";
}

function calculateFrictionLossPerHundred(coefficient, gpm) {
  return coefficient * Math.pow(gpm / 100, 2);
}

function formatFrictionLossCell(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

function formatCoefficientForChart(value) {
  if (!Number.isFinite(value)) return "-";
  return value < 1 ? value.toFixed(2) : value.toFixed(1);
}

function getGeneratedPngProfileName() {
  try {
    const data = loadPumpCharts();
    const lastChart = findPumpChart(getLastViewedPumpChartId());
    const chart = lastChart || data.charts.find(item => item.department);
    return chart?.department || "";
  } catch {
    return "";
  }
}

function createPumpChartExportRenderElement(source) {
  try {
    const sourceRect = source.getBoundingClientRect();
    const width = Math.ceil(sourceRect.width);
    if (!width) return null;

    const clone = source.cloneNode(true);
    inlineComputedStyles(source, clone);
    preparePumpChartExportContent(clone);

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.width = `${width}px`;
    wrapper.style.background = getResolvedExportBackground(source);
    wrapper.style.pointerEvents = "none";
    wrapper.style.zIndex = "-1";

    clone.style.width = `${width}px`;
    clone.style.boxSizing = "border-box";
    clone.style.margin = "0";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    logPumpChartShareStep("png-export-clone-created", {
      removedModeBadges: clone.dataset.removedModeBadges || "0",
      hasBranding: clone.dataset.exportBranding || "false"
    });

    return clone;
  } catch (error) {
    logPumpChartShareStep("png-export-clone-error", {
      message: error?.message || String(error)
    });
    return null;
  }
}

function preparePumpChartExportContent(element) {
  let removedModeBadges = 0;

  element.querySelectorAll(".pump-chart-mode-badge").forEach(node => {
    node.remove();
    removedModeBadges += 1;
  });

  element.querySelectorAll(".pump-chart-setup-aside").forEach(node => {
    node.style.justifyContent = "center";
    node.style.gap = "0";
  });

  applyGeneratedPngExportCardStyle(element);
  prepareGeneratedPumpChartHeader(element);
  element.dataset.removedModeBadges = String(removedModeBadges);
}

function prepareGeneratedPumpChartHeader(element) {
  const header = element.querySelector(".pump-chart-document-header");
  if (!header) return;

  const headerData = getGeneratedPumpChartExportHeaderData(header);
  header.dataset.generatedPngLabel = headerData.label;
  header.dataset.generatedPngTitle = headerData.title;
  header.dataset.generatedPngSubtitle = headerData.subtitle;
  header.dataset.generatedPngMetadata = headerData.metadata;
  header.dataset.generatedPngNotes = headerData.notes;
  header.innerHTML = "";
  header.style.display = "grid";
  header.style.gridTemplateColumns = `minmax(0, 1fr) ${GENERATED_PNG_STYLE.brand.compact.blockWidth}px`;
  header.style.alignItems = "center";
  header.style.gap = `${GENERATED_PNG_STYLE.header.gap}px`;
  header.style.minHeight = `${GENERATED_PNG_STYLE.header.minHeight}px`;
  header.style.marginBottom = "14px";
  header.style.paddingBottom = "14px";
  header.style.borderBottom = `1px solid ${GENERATED_PNG_STYLE.header.dividerColor}`;
  header.style.color = GENERATED_PNG_STYLE.header.titleColor;
  header.style.fontFamily = "Arial, sans-serif";

  const textBlock = document.createElement("div");
  textBlock.style.minWidth = "0";

  const label = document.createElement("p");
  label.textContent = headerData.label;
  label.style.margin = "0 0 7px";
  label.style.color = GENERATED_PNG_STYLE.header.mutedColor;
  label.style.fontSize = GENERATED_PNG_STYLE.header.labelSize;
  label.style.fontWeight = "900";
  label.style.letterSpacing = "0.08em";
  label.style.textTransform = "uppercase";

  const title = document.createElement("h2");
  title.textContent = headerData.title;
  title.style.margin = "0 0 7px";
  title.style.color = GENERATED_PNG_STYLE.header.titleColor;
  title.style.fontSize = GENERATED_PNG_STYLE.header.titleSize;
  title.style.fontWeight = "900";
  title.style.lineHeight = "1.08";
  title.style.letterSpacing = "0";

  textBlock.append(label, title);

  if (headerData.subtitle) {
    const subtitle = document.createElement("p");
    subtitle.textContent = headerData.subtitle;
    subtitle.style.margin = "0 0 3px";
    subtitle.style.color = GENERATED_PNG_STYLE.header.detailColor;
    subtitle.style.fontSize = GENERATED_PNG_STYLE.header.subtitleSize;
    subtitle.style.fontWeight = "900";
    subtitle.style.lineHeight = "1.25";
    subtitle.style.letterSpacing = "0";
    subtitle.style.textTransform = "none";
    textBlock.appendChild(subtitle);
  }

  if (headerData.metadata) {
    const metadata = document.createElement("p");
    metadata.style.margin = "0";
    metadata.style.color = GENERATED_PNG_STYLE.header.detailColor;
    metadata.style.fontSize = GENERATED_PNG_STYLE.header.detailSize;
    metadata.style.fontWeight = "800";
    metadata.style.lineHeight = "1.32";
    metadata.style.letterSpacing = "0";
    metadata.style.textTransform = "none";
    appendGeneratedPngMetadataParts(metadata, headerData.metadata);
    textBlock.appendChild(metadata);
  }

  if (headerData.notes) {
    const notes = document.createElement("p");
    notes.textContent = headerData.notes;
    notes.className = "pump-chart-document-notes";
    notes.style.margin = "8px 0 0";
    notes.style.color = "#475569";
    notes.style.fontSize = "13px";
    notes.style.fontWeight = "650";
    notes.style.lineHeight = "1.35";
    notes.style.letterSpacing = "0";
    notes.style.textTransform = "none";
    textBlock.appendChild(notes);
  }

  header.append(textBlock, createGeneratedPngBrandLockupElement());
  element.dataset.exportBranding = "true";
}

function getGeneratedPumpChartExportHeaderData(header) {
  if (header?.dataset?.generatedPngTitle) {
    return {
      label: header.dataset.generatedPngLabel || "PUMP CHART",
      title: header.dataset.generatedPngTitle || "Pump Chart",
      subtitle: header.dataset.generatedPngSubtitle || "",
      metadata: header.dataset.generatedPngMetadata || "",
      notes: header.dataset.generatedPngNotes || ""
    };
  }

  const label = getGeneratedPumpChartHeaderLabel(header?.querySelector("p")?.textContent || "PUMP CHART");
  const title = header?.querySelector("h2")?.textContent?.trim() || "Pump Chart";
  const department = header?.querySelector("strong")?.textContent?.trim() || "";
  const metaItems = Array.from(header?.querySelectorAll(".pump-chart-document-meta span") || [])
    .map(item => stripGeneratedPumpChartUpdatedDate(item.textContent))
    .filter(Boolean);

  if (!metaItems.some(item => item.startsWith("Generated "))) {
    metaItems.push(`Generated ${formatPumpChartDate(new Date().toISOString())}`);
  }

  return {
    label,
    title,
    subtitle: "",
    metadata: getGeneratedPngMetadataLine([department, ...metaItems]),
    notes: header?.querySelector(".pump-chart-document-notes")?.textContent?.trim() || ""
  };
}

function getGeneratedPngMetadataLine(items = []) {
  return items
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .join(" • ");
}

function appendGeneratedPngMetadataParts(element, metadata) {
  const parts = String(metadata || "")
    .split("•")
    .map(part => part.trim())
    .filter(Boolean);

  parts.forEach((part, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.textContent = " • ";
      separator.style.whiteSpace = "normal";
      element.appendChild(separator);
    }

    const span = document.createElement("span");
    span.textContent = part;
    span.style.whiteSpace = index === 0 && !/^Generated\b/i.test(part) ? "normal" : "nowrap";
    element.appendChild(span);
  });
}

function getGeneratedPumpChartHeaderLabel(value) {
  const text = String(value || "").trim();
  return text.toUpperCase() === "REVERSE FLOW PUMP CHART" ? "PUMP CHART" : text;
}

function stripGeneratedPumpChartUpdatedDate(value) {
  return String(value || "")
    .split("•")
    .map(part => part.trim())
    .filter(part => part && !/^Updated\b/i.test(part))
    .join(" • ");
}

function createGeneratedPngBrandLockupElement() {
  const brand = document.createElement("div");
  brand.className = "pump-chart-export-brand";
  brand.setAttribute("aria-hidden", "true");
  brand.style.display = "flex";
  brand.style.alignItems = "center";
  brand.style.justifyContent = "flex-end";
  brand.style.gap = `${GENERATED_PNG_STYLE.brand.compact.gap}px`;
  brand.style.width = `${GENERATED_PNG_STYLE.brand.compact.blockWidth}px`;
  brand.style.minHeight = `${GENERATED_PNG_STYLE.brand.compact.cardHeight}px`;
  brand.style.boxSizing = "border-box";
  brand.style.color = "#111827";
  brand.style.fontFamily = "Arial, sans-serif";
  brand.style.lineHeight = "1.02";

  const mark = document.createElement("img");
  mark.src = getPumpChartExportLogoSrc();
  mark.alt = "";
  mark.style.display = "block";
  mark.style.width = `${GENERATED_PNG_STYLE.brand.compact.logoSize}px`;
  mark.style.height = `${GENERATED_PNG_STYLE.brand.compact.logoSize}px`;
  mark.style.borderRadius = `${Math.round(GENERATED_PNG_STYLE.brand.compact.logoSize * GENERATED_PNG_STYLE.brand.borderRadiusRatio)}px`;
  mark.style.objectFit = "cover";

  const text = document.createElement("span");
  text.style.display = "grid";
  text.style.gap = "2px";
  text.innerHTML = `
    <strong style="display:block;font-size:${GENERATED_PNG_STYLE.brand.compact.primarySize};font-weight:900;color:#111827;text-transform:none;letter-spacing:0;">Reverse Flow</strong>
    <span style="display:block;font-size:${GENERATED_PNG_STYLE.brand.compact.secondarySize};font-weight:900;color:#111827;text-transform:none;letter-spacing:0.02em;">Fire Hydraulics</span>
  `;

  brand.append(mark, text);
  return brand;
}

async function tryRenderElementToPngBlob(element, method) {
  try {
    logPumpChartShareStep("png-render-attempt", { method });
    const blob = await renderElementToPngBlob(element, method);
    if (blob) {
      logPumpChartShareStep("png-render-success", {
        method,
        blobSize: blob.size,
        blobType: blob.type
      });
      return blob;
    }
    logPumpChartShareStep("png-render-null", { method });
  } catch (error) {
    logPumpChartShareStep("png-render-error", {
      method,
      message: error?.message || String(error)
    });
  }

  return null;
}

async function renderElementToPngBlob(element, method) {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(element.scrollHeight || rect.height);

  if (!width || !height) return null;

  const clone = element.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  inlineComputedStyles(element, clone);
  clone.style.width = `${width}px`;
  clone.style.boxSizing = "border-box";
  clone.style.margin = "0";

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.background = getComputedStyle(element).backgroundColor || "#ffffff";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">
        ${serialized}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * pixelRatio);
    canvas.height = Math.ceil(height * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = getResolvedExportBackground(element);
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    logPumpChartShareStep("png-canvas-created", {
      method,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: width,
      cssHeight: height,
      pixelRatio
    });

    return await exportCanvasToPngBlob(canvas, method);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function exportCanvasToPngBlob(canvas, method) {
  logPumpChartShareStep("png-toBlob-start", { method });

  try {
    const blob = await new Promise((resolve, reject) => {
      try {
        canvas.toBlob(result => {
          if (result) {
            resolve(result);
          } else {
            resolve(null);
          }
        }, "image/png", 0.95);
      } catch (error) {
        reject(error);
      }
    });

    if (blob) {
      logPumpChartShareStep("png-toBlob-success", {
        method,
        blobSize: blob.size,
        blobType: blob.type
      });
      return blob;
    }

    logPumpChartShareStep("png-toBlob-null", { method });
  } catch (error) {
    logPumpChartShareStep("png-toBlob-error", {
      method,
      message: error?.message || String(error)
    });
  }

  logPumpChartShareStep("png-toDataURL-start", { method });

  try {
    const dataUrl = canvas.toDataURL("image/png");
    logPumpChartShareStep("png-toDataURL-success", {
      method,
      dataUrlLength: dataUrl.length
    });
    return dataUrlToBlob(dataUrl);
  } catch (error) {
    logPumpChartShareStep("png-toDataURL-error", {
      method,
      message: error?.message || String(error)
    });
    throw error;
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/data:([^;]+);base64/i);
  const mimeType = mimeMatch?.[1] || "image/png";
  const binary = atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function blobToBase64Payload(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",")
        ? dataUrl.split(",")[1]
        : dataUrl;
      if (!base64) {
        reject(new Error("PNG base64 payload was empty."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Unable to read PNG blob."));
    };
    reader.readAsDataURL(blob);
  });
}

function inlineComputedStyles(source, clone) {
  const sourceElements = [source, ...source.querySelectorAll("*")];
  const cloneElements = [clone, ...clone.querySelectorAll("*")];

  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index];
    if (!cloneElement) return;

    const computed = getComputedStyle(sourceElement);
    Array.from(computed).forEach(property => {
      cloneElement.style.setProperty(
        property,
        computed.getPropertyValue(property),
        computed.getPropertyPriority(property)
      );
    });
  });
}

function createSanitizedPumpChartExportClone(source) {
  try {
    const clone = source.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    inlineComputedStyles(source, clone);
    sanitizePumpChartExportElement(clone);

    const sourceRect = source.getBoundingClientRect();
    clone.style.width = `${Math.ceil(sourceRect.width)}px`;
    clone.style.boxSizing = "border-box";
    clone.style.margin = "0";

    logPumpChartShareStep("png-sanitized-clone-created", {
      removedMedia: clone.dataset.removedMedia || "0",
      removedBackgrounds: clone.dataset.removedBackgrounds || "0"
    });

    return clone;
  } catch (error) {
    logPumpChartShareStep("png-sanitized-clone-error", {
      message: error?.message || String(error)
    });
    return null;
  }
}

function sanitizePumpChartExportElement(element) {
  let removedMedia = 0;
  let removedBackgrounds = 0;

  element.querySelectorAll("img, svg, picture, source, canvas, video, object, embed").forEach(node => {
    node.remove();
    removedMedia += 1;
  });

  [element, ...element.querySelectorAll("*")].forEach(node => {
    if (node.style.backgroundImage && node.style.backgroundImage !== "none") {
      node.style.backgroundImage = "none";
      removedBackgrounds += 1;
    }
    node.style.webkitMaskImage = "none";
    node.style.maskImage = "none";
    node.style.filter = "none";
    node.style.backdropFilter = "none";
  });

  element.dataset.removedMedia = String(removedMedia);
  element.dataset.removedBackgrounds = String(removedBackgrounds);
}

function logPumpChartExportDomSources(source) {
  const resources = [];

  source.querySelectorAll("img, svg, use, image, picture, source, canvas, video, object, embed").forEach(node => {
    resources.push({
      tag: node.tagName.toLowerCase(),
      src: node.getAttribute("src") || "",
      currentSrc: node.currentSrc || "",
      href: node.getAttribute("href") || node.getAttribute("xlink:href") || "",
      crossorigin: node.getAttribute("crossorigin") || "",
      urlType: classifyPumpChartExportUrl(node.currentSrc || node.getAttribute("src") || node.getAttribute("href") || node.getAttribute("xlink:href") || "")
    });
  });

  [source, ...source.querySelectorAll("*")].forEach(node => {
    const backgroundImage = getComputedStyle(node).backgroundImage;
    if (backgroundImage && backgroundImage !== "none") {
      resources.push({
        tag: node.tagName.toLowerCase(),
        backgroundImage,
        urlType: classifyPumpChartExportUrl(backgroundImage)
      });
    }
  });

  logPumpChartShareStep("png-taint-sources", {
    resourceCount: resources.length,
    resources,
    fontStatus: document.fonts?.status || "unknown"
  });
}

function classifyPumpChartExportUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "none";
  if (text.startsWith("data:")) return "data";
  if (text.startsWith("blob:")) return "blob";
  if (text.startsWith("capacitor://")) return "capacitor";
  if (text.startsWith("file:")) return "file";
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      return url.origin === window.location.origin ? "local-http" : "cross-origin-http";
    } catch {
      return "http";
    }
  }
  if (text.includes("url(")) return "css-url";
  return "local-or-inline";
}

async function tryRenderManualPumpChartCanvasToBlob(source) {
  try {
    const canvas = renderPumpChartDocumentToCanvas(source);
    await drawPumpChartCanvasBrandLogo(canvas);
    logPumpChartShareStep("png-canvas-created", {
      method: "manual-canvas",
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    });
    const blob = await exportCanvasToPngBlob(canvas, "manual-canvas");
    if (blob) {
      logPumpChartShareStep("png-render-success", {
        method: "manual-canvas",
        blobSize: blob.size,
        blobType: blob.type
      });
    }
    return blob;
  } catch (error) {
    logPumpChartShareStep("png-render-error", {
      method: "manual-canvas",
      message: error?.message || String(error)
    });
    return null;
  }
}

function renderPumpChartDocumentToCanvas(source) {
  const width = 720;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const horizontalPadding = 32;
  const contentWidth = width - horizontalPadding * 2;
  const headerTextWidth = contentWidth - GENERATED_PNG_STYLE.brand.compact.blockWidth - GENERATED_PNG_STYLE.header.gap;
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("Canvas context unavailable.");

  const drawItems = [];
  let y = 30;

  const pushText = (text, options = {}) => {
    const item = createCanvasTextItem(measureContext, text, {
      x: horizontalPadding,
      y,
      maxWidth: contentWidth,
      ...options
    });
    if (!item) return 0;

    drawItems.push(item);
    const height = getCanvasTextItemHeight(item);
    y += height + (options.marginBottom ?? 4);
    return height;
  };

  const pushRule = (marginTop = 10, marginBottom = 10, color = "#d1d5db") => {
    y += marginTop;
    drawItems.push({ type: "rule", x: horizontalPadding, y, width: contentWidth, color });
    y += marginBottom;
  };

  const header = source.querySelector(".pump-chart-document-header");
  const headerData = getGeneratedPumpChartExportHeaderData(header);
  pushText(headerData.label || "PUMP CHART", {
    font: GENERATED_PNG_STYLE.header.labelFont,
    lineHeight: 16,
    color: GENERATED_PNG_STYLE.header.mutedColor,
    letterSpacing: 0.08,
    maxWidth: headerTextWidth,
    marginBottom: 6
  });
  pushText(headerData.title || "Pump Chart", {
    font: GENERATED_PNG_STYLE.header.titleFont,
    lineHeight: 36,
    color: GENERATED_PNG_STYLE.header.titleColor,
    maxWidth: headerTextWidth,
    marginBottom: 6
  });
  pushText(headerData.subtitle || "", {
    font: GENERATED_PNG_STYLE.header.subtitleFont,
    lineHeight: 26,
    color: GENERATED_PNG_STYLE.header.detailColor,
    maxWidth: headerTextWidth,
    marginBottom: 4
  });
  pushText(headerData.metadata || "", {
    font: GENERATED_PNG_STYLE.header.detailFont,
    lineHeight: 20,
    color: GENERATED_PNG_STYLE.header.detailColor,
    maxWidth: headerTextWidth,
    marginBottom: 7,
    metadataWrap: true
  });
  pushText(headerData.notes || "", {
    font: "650 14px Arial, sans-serif",
    lineHeight: 20,
    color: "#475569",
    marginBottom: 7
  });
  pushRule(10, 18, "#cbd5e1");

  source.querySelectorAll(".pump-chart-document-section").forEach(section => {
    pushText(stripPumpChartCategoryCount(section.querySelector("h3")?.textContent || ""), {
      font: "900 14px Arial, sans-serif",
      lineHeight: 18,
      color: "#64748b",
      marginBottom: 8
    });

    section.querySelectorAll(".pump-chart-setup-row").forEach(row => {
      const layout = createPumpChartCanvasSetupRowLayout(measureContext, row, {
        x: horizontalPadding,
        y,
        width: contentWidth
      });

      drawItems.push(...layout.items);
      y += layout.height;
    });

    const sectionText = Array.from(section.children)
      .filter(child => !child.matches("h3, .pump-chart-setup-row"))
      .map(child => child.textContent.trim())
      .filter(Boolean)
      .join("\n");
    pushText(sectionText, {
      font: "700 14px Arial, sans-serif",
      lineHeight: 20,
      color: "#334155",
      marginBottom: 10
    });
    y += 8;
  });

  const height = Math.ceil(y + 30);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable.");

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawGeneratedPngCanvasBackground(context, width, height);

  drawItems.forEach(item => {
    if (item.type === "rule") {
      context.strokeStyle = item.color || "rgba(17, 24, 39, 0.18)";
      context.beginPath();
      context.moveTo(item.x, item.y + 0.5);
      context.lineTo(item.x + item.width, item.y + 0.5);
      context.stroke();
      return;
    }

    if (item.type === "row-background") {
      drawCanvasRoundedRect(context, item.x, item.y, item.width, item.height, item.radius || 8);
      context.fillStyle = item.fill || "#f8fafc";
      context.fill();
      if (item.stroke) {
        context.strokeStyle = item.stroke;
        context.stroke();
      }
      return;
    }

    if (item.type === "badge") {
      drawCanvasBadge(context, item);
      return;
    }

    if (item.type === "brand") {
      drawCanvasExportBrand(context, item);
      return;
    }

    drawCanvasTextItem(context, item);
  });

  return canvas;
}

function createPumpChartCanvasSetupRowLayout(context, row, bounds) {
  const paddingX = 14;
  const paddingY = 13;
  const gap = 24;
  const canUseColumns = bounds.width >= 560;
  const asideWidth = canUseColumns ? 240 : bounds.width - paddingX * 2;
  const leftWidth = canUseColumns
    ? bounds.width - paddingX * 2 - asideWidth - gap
    : bounds.width - paddingX * 2;
  const leftX = bounds.x + paddingX;
  const asideX = canUseColumns
    ? bounds.x + bounds.width - paddingX - asideWidth
    : leftX;
  const contentTop = bounds.y + paddingY;
  const nameText = row.querySelector(".pump-chart-setup-name")?.textContent || "";
  const configText = row.querySelector(".pump-chart-config-summary")?.textContent || "";
  const badgeElement = row.querySelector(".pump-chart-mode-badge");
  const resultText = row.querySelector(".pump-chart-row-result")?.textContent || "";
  const items = [];

  if (badgeElement?.dataset.mode === "apparatusMounted") {
    logPumpChartApparatusExportSummary({
      name: nameText.trim(),
      configuration: configText.trim(),
      result: resultText.trim()
    });
  }
  const nameItem = createCanvasTextItem(context, nameText, {
    x: leftX,
    y: contentTop,
    maxWidth: leftWidth,
    font: "900 18px Arial, sans-serif",
    lineHeight: 23,
    color: "#111827"
  });
  const nameHeight = nameItem ? getCanvasTextItemHeight(nameItem) : 0;
  const configItem = createCanvasTextItem(context, configText, {
    x: leftX,
    y: contentTop + nameHeight + 5,
    maxWidth: leftWidth,
    font: "750 15px Arial, sans-serif",
    lineHeight: 21,
    color: "#475569"
  });
  const configHeight = configItem ? getCanvasTextItemHeight(configItem) : 0;
  const leftHeight = nameHeight + (configItem ? 5 : 0) + configHeight;
  let rightHeight = 0;

  const resultItem = createCanvasResultTextItem(context, resultText, {
    x: asideX,
    y: contentTop,
    maxWidth: asideWidth,
    font: "900 19px Arial, sans-serif",
    lineHeight: 25,
    color: "#111827",
    align: canUseColumns ? "right" : "left"
  });

  if (resultItem) {
    rightHeight += getCanvasTextItemHeight(resultItem);
    items.push(resultItem);
  }

  if (nameItem) items.push(nameItem);
  if (configItem) items.push(configItem);

  const rowContentHeight = canUseColumns
    ? Math.max(leftHeight, rightHeight)
    : Math.max(leftHeight, rightHeight);
  const rowHeight = Math.max(76, rowContentHeight + paddingY * 2);

  items.unshift({
    type: "row-background",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: rowHeight - 8,
    radius: 8,
    fill: "#f8fafc",
    stroke: "#e2e8f0"
  });

  return {
    items,
    height: rowHeight
  };
}

function createCanvasTextItem(context, text, options = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;

  const font = options.font || "700 14px Arial, sans-serif";
  const maxWidth = options.maxWidth || 300;
  context.font = font;
  const lines = options.metadataWrap
    ? wrapCanvasMetadataLine(context, cleanText, maxWidth)
    : wrapCanvasText(context, cleanText, maxWidth);
  if (!lines.length) return null;

  return {
    type: "text",
    lines,
    x: options.x || 0,
    y: options.y || 0,
    font,
    lineHeight: options.lineHeight || 18,
    color: options.color || "#111827",
    maxWidth,
    align: options.align || "left"
  };
}

function createCanvasResultTextItem(context, text, options = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;

  const font = options.font || "900 19px Arial, sans-serif";
  const maxWidth = options.maxWidth || 240;
  context.font = font;

  return {
    type: "text",
    lines: getCanvasResultLines(context, cleanText, maxWidth),
    x: options.x || 0,
    y: options.y || 0,
    font,
    lineHeight: options.lineHeight || 24,
    color: options.color || "#111827",
    maxWidth,
    align: options.align || "left"
  };
}

function getCanvasResultLines(context, text, maxWidth) {
  return String(text || "")
    .split(/\n+/)
    .flatMap(line => splitCanvasResultLine(context, line.trim(), maxWidth))
    .filter(Boolean);
}

function splitCanvasResultLine(context, line, maxWidth) {
  if (!line) return [];
  if (context.measureText(line).width <= maxWidth) return [line];

  if (line.includes(" • ")) {
    const segments = line.split(" • ").map(segment => segment.trim()).filter(Boolean);
    const combinedLines = [];
    let currentLine = "";

    segments.forEach(segment => {
      const candidate = currentLine ? `${currentLine} • ${segment}` : segment;
      if (!currentLine || context.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        combinedLines.push(currentLine);
        currentLine = segment;
      }
    });

    if (currentLine) combinedLines.push(currentLine);
    return combinedLines;
  }

  return [line];
}

function getCanvasTextItemHeight(item) {
  return item.lines.length * item.lineHeight;
}

function drawCanvasTextItem(context, item) {
  context.font = item.font;
  context.fillStyle = item.color;
  context.textAlign = item.align || "left";
  context.textBaseline = "alphabetic";
  item.lines.forEach((line, index) => {
    const x = item.align === "right" ? item.x + item.maxWidth : item.x;
    context.fillText(line, x, item.y + item.lineHeight * (index + 0.78), item.maxWidth);
  });
}

function wrapCanvasText(context, text, maxWidth) {
  return String(text || "")
    .split(/\n+/)
    .flatMap(line => wrapCanvasLine(context, line.trim(), maxWidth))
    .filter(Boolean);
}

function wrapCanvasMetadataLine(context, text, maxWidth) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return [];
  if (context.measureText(cleanText).width <= maxWidth) return [cleanText];

  const parts = cleanText
    .split("•")
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return wrapCanvasText(context, cleanText, maxWidth);

  const lines = [];
  let currentLine = "";

  parts.forEach(part => {
    const candidate = currentLine ? `${currentLine} • ${part}` : part;
    if (!currentLine || context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = part;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function wrapCanvasLine(context, text, maxWidth) {
  if (!text) return [];

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach(word => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawCanvasBadge(context, item) {
  const palette = getPumpChartCanvasBadgePalette(item.mode);
  const height = item.height || 26;
  const radius = height / 2;
  const width = Math.min(item.width, 150);
  const x = item.x + Math.max(0, item.width - width);

  context.fillStyle = palette.background;
  context.strokeStyle = palette.border;
  context.lineWidth = 1;
  drawCanvasRoundedRect(context, x, item.y, width, height, radius);
  context.fill();
  context.stroke();

  context.font = "900 11px Arial, sans-serif";
  context.fillStyle = palette.text;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(item.text, x + width / 2, item.y + height / 2 + 0.5, width - 14);
}

function drawCanvasExportBrand(context, item) {
  const markSize = 24;
  const text = "Reverse Flow";
  const generated = item.generated || "";
  context.font = "800 11px Arial, sans-serif";
  const textWidth = context.measureText(text).width;
  context.font = "700 10px Arial, sans-serif";
  const generatedWidth = generated ? context.measureText(generated).width : 0;
  const contentWidth = markSize + 7 + Math.max(textWidth, generatedWidth);
  const startX = item.x + item.width - contentWidth;
  const markX = startX;
  const markY = item.y;
  const textX = markX + markSize + 7;

  context.save();
  context.globalAlpha = 0.78;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = "800 11px Arial, sans-serif";
  context.fillStyle = "rgba(71, 85, 105, 0.76)";
  context.fillText(text, textX, markY + 10, item.width);

  if (generated) {
    context.font = "700 10px Arial, sans-serif";
    context.fillStyle = "rgba(100, 116, 139, 0.64)";
    context.fillText(generated, textX, markY + 23, item.width);
  }
  context.restore();
}

function applyGeneratedPngExportCardStyle(element) {
  element.style.background = GENERATED_PNG_STYLE.card.background;
  element.style.border = GENERATED_PNG_STYLE.card.border;
  element.style.borderTop = GENERATED_PNG_STYLE.documentTopBorder;
  element.style.borderRadius = `${GENERATED_PNG_STYLE.card.borderRadius}px`;
  element.style.padding = `${GENERATED_PNG_STYLE.card.padding}px`;
  element.style.color = GENERATED_PNG_STYLE.header.titleColor;
}

function drawGeneratedPngCanvasBackground(context, width, height) {
  context.fillStyle = GENERATED_PNG_STYLE.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = GENERATED_PNG_STYLE.borderColor;
  context.lineWidth = 1;
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
  context.fillStyle = GENERATED_PNG_STYLE.accentColor;
  context.fillRect(0, 0, width, GENERATED_PNG_STYLE.canvasTopBorderHeight);
}

function getGeneratedPngCanvasBrandOptions(size, width, margin, y) {
  const preset = GENERATED_PNG_STYLE.brand[size] || GENERATED_PNG_STYLE.brand.compact;

  return {
    x: width - margin - preset.blockWidth,
    y,
    logoSize: preset.logoSize,
    gap: preset.gap,
    primaryFont: preset.primaryFont,
    secondaryFont: preset.secondaryFont,
    textWidth: preset.textWidth
  };
}

async function drawGeneratedPngBrandLogo(canvas, options = {}) {
  try {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const context = canvas.getContext("2d");
    if (!context) return;

    const logo = await loadImage(getPumpChartExportLogoSrc());
    const x = options.x || 0;
    const y = options.y || 0;
    const logoSize = options.logoSize || GENERATED_PNG_STYLE.brand.compact.logoSize;
    const gap = options.gap || GENERATED_PNG_STYLE.brand.compact.gap;
    const textX = x + logoSize + gap;
    const primaryFont = options.primaryFont || GENERATED_PNG_STYLE.brand.compact.primaryFont;
    const secondaryFont = options.secondaryFont || GENERATED_PNG_STYLE.brand.compact.secondaryFont;

    context.save();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawCanvasRoundedRect(context, x, y, logoSize, logoSize, Math.max(8, logoSize * GENERATED_PNG_STYLE.brand.borderRadiusRatio));
    context.clip();
    context.drawImage(logo, x, y, logoSize, logoSize);
    context.restore();

    context.save();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = "#111827";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = primaryFont;
    context.fillText("Reverse Flow", textX, y + logoSize * 0.43, options.textWidth || 260);
    context.font = secondaryFont;
    context.fillText("Fire Hydraulics", textX, y + logoSize * 0.78, options.textWidth || 260);
    context.restore();
  } catch (error) {
    logPumpChartShareStep("png-brand-logo-fallback", {
      message: error?.message || String(error)
    });
  }
}

async function drawPumpChartCanvasBrandLogo(canvas) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.width / pixelRatio;
  const brand = GENERATED_PNG_STYLE.brand.compact;
  const x = width - 32 - brand.blockWidth;
  const y = 32;
  const brandHeight = brand.cardHeight;

  await drawGeneratedPngBrandLogo(canvas, {
    x: x + brand.paddingX,
    y: y + Math.round((brandHeight - brand.logoSize) / 2),
    logoSize: brand.logoSize,
    gap: brand.gap,
    primaryFont: brand.primaryFont,
    secondaryFont: brand.secondaryFont,
    textWidth: brand.textWidth
  });
}

function stripPumpChartCategoryCount(value) {
  return String(value || "").replace(/\s+\(\d+\)\s*$/, "").trim();
}

function drawCanvasRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
}

function getPumpChartCanvasBadgePalette(mode) {
  const palettes = {
    reverse: { background: "rgba(37, 99, 235, 0.10)", border: "rgba(37, 99, 235, 0.34)", text: "#1d4ed8" },
    requiredPdp: { background: "rgba(22, 163, 74, 0.10)", border: "rgba(22, 163, 74, 0.34)", text: "#166534" },
    splitLay: { background: "rgba(217, 92, 19, 0.10)", border: "rgba(217, 92, 19, 0.38)", text: "#9a3412" },
    relay: { background: "rgba(124, 58, 237, 0.10)", border: "rgba(124, 58, 237, 0.34)", text: "#6d28d9" },
    apparatusMounted: { background: "rgba(71, 85, 105, 0.10)", border: "rgba(71, 85, 105, 0.32)", text: "#334155" }
  };

  return palettes[mode] || { background: "rgba(217, 92, 19, 0.08)", border: "rgba(217, 92, 19, 0.34)", text: "#7c2d12" };
}

function getResolvedExportBackground(element) {
  let current = element;

  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      return color;
    }
    current = current.parentElement;
  }

  return "#ffffff";
}

function sanitizeFileName(value) {
  return String(value || "Reverse-Flow")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "Reverse-Flow";
}

function logPumpChartShareStep(event, details = {}) {
  console.info("[Pump Chart Share]", {
    event,
    ...details
  });
}

function logPumpChartShareFallback(reason) {
  console.info("[Pump Chart Share]", {
    event: "png-share-fallback",
    reason
  });
}

function logPumpChartApparatusDisplay(event, setup = {}, details = {}) {
  if (setup.mode !== "apparatusMounted") return;

  console.info(`[Pump Chart Apparatus] ${event}`, {
    setupId: setup.id || "",
    setupName: setup.name || "",
    mode: setup.mode,
    ...details
  });
}

function logPumpChartApparatusExportSummary(summary = {}) {
  console.info("[Pump Chart Apparatus] export summary", summary);
}

function showPumpChartShareFallbackMessage() {
  showPumpChartShareMessage("PNG sharing unavailable on this device. Sharing text instead.");
}

function showPumpChartShareMessage(message) {
  const existingMessage = document.querySelector(".pump-chart-share-fallback-message");
  if (existingMessage) existingMessage.remove();

  const notice = document.createElement("div");
  notice.className = "pump-chart-share-fallback-message";
  notice.textContent = message;
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.style.position = "fixed";
  notice.style.left = "50%";
  notice.style.bottom = "24px";
  notice.style.transform = "translateX(-50%)";
  notice.style.zIndex = "9999";
  notice.style.maxWidth = "min(92vw, 420px)";
  notice.style.padding = "10px 14px";
  notice.style.borderRadius = "10px";
  notice.style.background = "rgba(18, 26, 38, 0.94)";
  notice.style.color = "#ffffff";
  notice.style.fontSize = "0.92rem";
  notice.style.lineHeight = "1.35";
  notice.style.boxShadow = "0 12px 28px rgba(0, 0, 0, 0.28)";

  document.body.appendChild(notice);
  window.setTimeout(() => {
    notice.remove();
  }, 3600);
}

async function copyPumpChartShareTextToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    logPumpChartShareStep("clipboard-fallback-unavailable");
    return false;
  }

  try {
    logPumpChartShareStep("clipboard-fallback-attempt");
    await navigator.clipboard.writeText(text);
    logPumpChartShareStep("clipboard-fallback-success");
    return true;
  } catch (error) {
    logPumpChartShareStep("clipboard-fallback-failure", {
      message: error?.message || String(error)
    });
    return false;
  }
}

function buildPumpChartShareText(chart) {
  const lines = [
    "Reverse Flow Pump Chart",
    "",
    chart.name,
    chart.department || "",
    `${chart.setups.length} ${chart.setups.length === 1 ? "Setup" : "Setups"}`,
    ""
  ].filter(line => line !== "");

  chart.setups.forEach(setup => {
    const config = getSetupConfigurationSummary(setup).replace(/\n+/g, " / ");
    const result = getSetupHydraulicSummary(setup).replace(/\n+/g, " / ");
    lines.push([setup.name, config, result].filter(Boolean).join(" — "));
    if (setup.notes) lines.push(`Notes: ${setup.notes}`);
  });

  if (chart.notes) {
    lines.push(`Chart Notes: ${chart.notes}`);
  }

  lines.push("Generated by Reverse Flow");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function openPumpChartPrintView(chart) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Export view could not open. Check popup settings, then try again.");
    return;
  }

  printWindow.document.write(buildPumpChartPrintHtml(chart));
  printWindow.document.close();
  printWindow.focus();
}

function buildPumpChartPrintHtml(chart) {
  const sections = chart.setups.length ? `
      <section>
        ${chart.setups.map(setup => `
          <div class="setup">
            <div>
              <strong>${escapeHtml(setup.name)}</strong>
              <p>${escapeHtml(getSetupConfigurationSummary(setup))}</p>
            </div>
            <b>${escapeHtml(getSetupHydraulicSummary(setup))}</b>
            ${setup.notes ? `<p class="notes">${escapeHtml(setup.notes)}</p>` : ""}
          </div>
        `).join("")}
      </section>
    ` : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(chart.name)} Pump Chart</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
    header { border-bottom: 3px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
    header p { margin: 0 0 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; }
    h1 { margin: 0 0 6px; font-size: 30px; }
    h2 { margin: 24px 0 10px; font-size: 15px; letter-spacing: 0.08em; border-bottom: 1px solid #9ca3af; padding-bottom: 6px; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; color: #374151; font-size: 13px; }
    .setup { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; border-bottom: 1px solid #d1d5db; padding: 10px 0; break-inside: avoid; }
    .setup p { margin: 2px 0 0; color: #4b5563; font-size: 12px; }
    .setup b { font-size: 18px; }
    .notes { grid-column: 1 / -1; }
    .actions { margin: 0 0 18px; }
    button { min-height: 40px; padding: 0 16px; border: 1px solid #111827; background: #111827; color: white; border-radius: 4px; font-weight: 700; }
    @media print { .actions { display: none; } body { margin: 18mm; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
  <header>
    <p>REVERSE FLOW PUMP CHART</p>
    <h1>${escapeHtml(chart.name)}</h1>
    ${chart.department ? `<strong>${escapeHtml(chart.department)}</strong>` : ""}
    <div class="meta">
      <span>Updated ${escapeHtml(formatPumpChartDate(chart.updatedAt))}</span>
      <span>${chart.setups.length} Setups</span>
    </div>
    ${chart.notes ? `<p>${escapeHtml(chart.notes)}</p>` : ""}
  </header>
  ${sections}
</body>
</html>`;
}

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
      resetStandpipeResults();

      
      
      if (isSplitLayMode()) {
  calculateSplitLay(warnings);
  syncLoadedSetupUpdateUi();
  return;
}

if (isStandpipeOpsMode()) {
  calculateStandpipeOps(warnings);
  syncLoadedSetupUpdateUi();
  return;
}

if (isRelayMode()) {
  calculateRelayPdp({ ...inputs, warnings });
  syncLoadedSetupUpdateUi();
  return;
}

if (isApparatusMountedMode()) {
  calculateApparatusMounted({ ...inputs, warnings });
  syncLoadedSetupUpdateUi();
  return;
}

if (isRequiredPdpMode()) {
  calculateRequiredPdp({ ...inputs, warnings });
  syncLoadedSetupUpdateUi();
  return;
}

calculateReverseFlow({ ...inputs, warnings });
syncLoadedSetupUpdateUi();
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
        nozzleType: getMainNozzleType(),
        ratedFlow: getMainRatedFlow(),
        ratedPressure: getMainRatedPressure(),
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

    function solveReverseFixedFogPressure({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient,
      ratedFlow,
      ratedPressure,
      supplyApplianceLoss = 0
    }) {
      if (
        pdp === null ||
        hoseLength === null ||
        coefficient === null ||
        !(ratedFlow > 0) ||
        !(ratedPressure > 0) ||
        hoseLength <= 0 ||
        coefficient <= 0
      ) {
        return null;
      }

      const reverseSupplyEnabled = !!state.reverseSupplyEnabled;
      const supplyLength = reverseSupplyEnabled
        ? numberOrNull(state.reverseSupplyLength)
        : 0;
      const supplyHose = reverseSupplyEnabled
        ? HOSE_OPTIONS.find(hose => hose.id === state.reverseSupplyHoseSize)
        : null;

      if (
        reverseSupplyEnabled &&
        (supplyLength === null || supplyLength <= 0 || !supplyHose)
      ) {
        return null;
      }

      const attackLoad = coefficient * (hoseLength / 100);
      const supplyLoad = reverseSupplyEnabled && supplyHose
        ? getActiveHoseCoefficient(supplyHose.id) * (supplyLength / 100)
        : 0;
      const totalLoad = attackLoad + supplyLoad;

      if (totalLoad <= 0) return null;

      const flowConstant = ratedFlow / Math.sqrt(ratedPressure);
      const turboCurve = getActiveHenTurboCurve();

      if (!turboCurve) {
        const frictionMultiplier =
          totalLoad * Math.pow(flowConstant / 100, 2);
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
            fixedFogFlowAtPressure(ratedFlow, ratedPressure, achievablePressure),
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

    function calculateReverseFlow({ pdp, hoseLength, nozzlePressure, nozzleType, ratedFlow, ratedPressure, applianceLoss, masterStreamLoss, coefficient, selectedHose, warnings }) {      if (pdp === null || hoseLength === null || (!isFixedFogType(nozzleType) && nozzlePressure === null) || coefficient === null) {
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

      if (isFixedFogType(nozzleType) && (!(ratedFlow > 0) || !(ratedPressure > 0))) {
        warnings.push("Enter a valid Fixed Fog nozzle rating.");
        renderWarnings(warnings);
        return;
      }

      const pressureFloor = isFixedFogType(nozzleType) ? 0 : nozzlePressure;

      if (pdp <= pressureFloor + applianceLoss + masterStreamLoss) {

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

  if (isFixedFogType(nozzleType)) {
    const fixedFogSolve = solveReverseFixedFogPressure({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient,
      ratedFlow,
      ratedPressure,
      supplyApplianceLoss
    });

    if (!fixedFogSolve) {
      return {
        totalFrictionLoss: null,
        frictionLossPer100: null,
        calculatedGpm: null,
        turboLoss: null,
        outOfRangeWarning: "Unable to solve Fixed Fog nozzle pressure from the current setup."
      };
    }

    const totalFrictionLoss =
      pdp -
      fixedFogSolve.nozzlePressure -
      applianceLoss -
      masterStreamLoss -
      supplyApplianceLoss -
      fixedFogSolve.turboLoss;

    return {
      nozzlePressure: fixedFogSolve.nozzlePressure,
      totalFrictionLoss,
      frictionLossPer100:
        totalFrictionLoss / (hoseLength / 100),
      calculatedGpm: fixedFogSolve.calculatedGpm,
      turboLoss: fixedFogSolve.turboLoss
    };
  }

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
  calculateNozzleReaction(
    calculatedGpm,
    isFixedFogType(nozzleType) ? reverseSolve.nozzlePressure : nozzlePressure
  );

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

function calculateAchievableFixedFogPressure() {
  if (!isReverseMode() || !isFixedFogType(getMainNozzleType())) return null;

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
  const ratedFlow = getMainRatedFlow();
  const ratedPressure = getMainRatedPressure();
  let supplyApplianceLoss = 0;
  let solve = solveReverseFixedFogPressure({
    pdp,
    hoseLength,
    applianceLoss,
    masterStreamLoss,
    coefficient,
    ratedFlow,
    ratedPressure,
    supplyApplianceLoss
  });

  if (solve && state.reverseSupplyEnabled && solve.calculatedGpm > 350) {
    supplyApplianceLoss = 10;
    solve = solveReverseFixedFogPressure({
      pdp,
      hoseLength,
      applianceLoss,
      masterStreamLoss,
      coefficient,
      ratedFlow,
      ratedPressure,
      supplyApplianceLoss
    });
  }

  if (!solve) return null;

  return Math.max(0, solve.nozzlePressure);
}

    // ========================================
    // REQUIRED PDP CALCULATIONS
    // ========================================
    function calculateRequiredPdp({ targetGpm, hoseLength, nozzlePressure, nozzleType, ratedFlow, ratedPressure, applianceLoss, masterStreamLoss, coefficient, selectedHose, warnings }) {
      if (targetGpm === null || hoseLength === null || (!isFixedFogType(nozzleType) && nozzlePressure === null) || coefficient === null) {
        renderWarnings(warnings);
        return;
      }

      if (!validateCommonInputs({ hoseLength, coefficient, warnings })) return;

      if (targetGpm <= 0) {
        warnings.push("Target flow must be greater than 0 GPM.");
        renderWarnings(warnings);
        return;
      }

      const requiredNozzlePressure = isFixedFogType(nozzleType)
        ? fixedFogPressureForFlow(ratedFlow, ratedPressure, targetGpm)
        : nozzlePressure;

      if (isFixedFogType(nozzleType) && !(requiredNozzlePressure > 0)) {
        warnings.push("Enter a valid Fixed Fog nozzle rating.");
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
        requiredNozzlePressure +
        totalFrictionLoss +
        applianceLoss +
        masterStreamLoss +
        henTurboLoss;      const roundedRequiredPdp = Math.round(requiredPdp);
      const nozzleReaction = calculateNozzleReaction(targetGpm, requiredNozzlePressure);

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
    : isFogHydraulicType(getMainNozzleType())
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

  if (isFixedFogType(state.nozzleType)) {
    return getMainRatedFlow();
  }

  return state.apparatusFogFlow === "custom"
    ? numberOrNull(state.apparatusCustomFogFlow)
    : numberOrNull(state.apparatusFogFlow);
}

function calculateApparatusMounted({ nozzlePressure, nozzleType, ratedPressure, masterStreamLoss, warnings }) {
  const effectiveNozzlePressure = isFixedFogType(nozzleType)
    ? ratedPressure
    : nozzlePressure;

  if (effectiveNozzlePressure === null) {
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
    effectiveNozzlePressure +
    elevationLoss +
    applianceLoss;
  const nozzleReaction =
    calculateNozzleReaction(flow, effectiveNozzlePressure);

  setResult(
    Math.round(requiredPdp),
    `${Math.round(flow)} GPM`,
    `${Math.round(effectiveNozzlePressure)} psi`,
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
// STANDPIPE OPS CALCULATIONS
// ========================================

function getStandpipeHydraulicSmoothboreModel(lineNumber) {
  const nozzleType = state.standpipeOps[`attack${lineNumber}NozzleType`];

  if (nozzleType === "blade") {
    return BLADE_MODELS.find(
      item => item.id === state.standpipeOps[`attack${lineNumber}BladeModel`]
    ) || BLADE_MODELS[0];
  }

  return SMOOTHBORE_TIPS.find(
    item => item.id === state.standpipeOps[`attack${lineNumber}SmoothboreTip`]
  );
}

function calculateStandpipeFogReaction(flow, nozzlePressure) {
  if (!flow || !nozzlePressure) return "—";

  return `${Math.round(
    0.0505 * flow * Math.sqrt(nozzlePressure)
  )} lb`;
}

function calculateStandpipeSmoothboreReaction(lineNumber, nozzlePressure) {
  const tip = getStandpipeHydraulicSmoothboreModel(lineNumber);
  const nozzleType = state.standpipeOps[`attack${lineNumber}NozzleType`];

  if (!tip || !nozzlePressure) return "—";

  const reaction = Math.round(
    1.57 *
    tip.diameter *
    tip.diameter *
    nozzlePressure
  );

  return nozzleType === "blade"
    ? `${reaction} lb (solid stream)`
    : `${reaction} lb`;
}

function calculateStandpipeAttackLine(lineNumber, warnings) {
  const standpipe = state.standpipeOps;
  const hose = HOSE_OPTIONS.find(
    item => item.id === standpipe[`attack${lineNumber}HoseSize`]
  );
  const floor = numberOrNull(standpipe[`attack${lineNumber}Floor`]);
  const length = numberOrNull(standpipe[`attack${lineNumber}Length`]);
  const nozzleType = getLineNozzleType(standpipe, lineNumber);
  let nozzlePressure = numberOrNull(standpipe[`attack${lineNumber}NozzlePressure`]);

  if (!hose || floor === null || length === null || (!isFixedFogType(nozzleType) && nozzlePressure === null)) {
    warnings.push(`Complete Attack Line ${lineNumber} configuration.`);
    renderWarnings(warnings);
    return null;
  }

  if (floor < 1) {
    warnings.push(`Attack Line ${lineNumber} outlet floor must be Floor 1 or higher.`);
    renderWarnings(warnings);
    return null;
  }

  if (length <= 0) {
    warnings.push(`Attack Line ${lineNumber} hose length must be greater than 0 feet.`);
    renderWarnings(warnings);
    return null;
  }

  let flow = 0;

  if (nozzleType === "smoothbore" || nozzleType === "blade") {
    const tip = getStandpipeHydraulicSmoothboreModel(lineNumber);

    if (!tip) {
      warnings.push(
        nozzleType === "blade"
          ? `Select a Blade model for Attack Line ${lineNumber}.`
          : `Select a smoothbore tip for Attack Line ${lineNumber}.`
      );
      renderWarnings(warnings);
      return null;
    }

    flow = smoothboreGpm(tip.diameter, nozzlePressure);
  } else {
    flow = numberOrNull(standpipe[`attack${lineNumber}Flow`]);

    if (flow === null || flow <= 0) {
      warnings.push(`Enter target flow for Attack Line ${lineNumber}.`);
      renderWarnings(warnings);
      return null;
    }

    if (isFixedFogType(nozzleType)) {
      nozzlePressure = fixedFogPressureForFlow(
        getLineRatedFlow(standpipe, lineNumber),
        getLineRatedPressure(standpipe, lineNumber),
        flow
      );

      if (!(nozzlePressure > 0)) {
        warnings.push(`Enter a valid Fixed Fog nozzle rating for Attack Line ${lineNumber}.`);
        renderWarnings(warnings);
        return null;
      }
    }
  }

  const coefficient = getActiveHoseCoefficient(hose.id);
  const flPer100 = coefficient * Math.pow(flow / 100, 2);
  const totalFl = flPer100 * (length / 100);
  const elevationLoss = (floor - 1) * 5;
  const requiredPdp = nozzlePressure + totalFl + elevationLoss;
  const reaction =
    nozzleType === "smoothbore" || nozzleType === "blade"
      ? calculateStandpipeSmoothboreReaction(lineNumber, nozzlePressure)
      : calculateStandpipeFogReaction(flow, nozzlePressure);
  const lineWarnings = [];

  if (flow > 250) {
    lineWarnings.push(
      "Flow exceeds 250 GPM from a single standpipe outlet. Verify outlet capability, system condition, and local SOP."
    );
  }

  return {
    lineNumber,
    hose,
    floor,
    length,
    nozzleType,
    nozzlePressure,
    ratedFlow: isFixedFogType(nozzleType)
      ? getLineRatedFlow(standpipe, lineNumber)
      : null,
    ratedPressure: isFixedFogType(nozzleType)
      ? getLineRatedPressure(standpipe, lineNumber)
      : null,
    flow,
    flPer100,
    totalFl,
    elevationLoss,
    requiredPdp,
    reaction,
    warnings: lineWarnings
  };
}

function calculateActualStandpipeLine(line, attackSidePdp) {
  const coefficient = getActiveHoseCoefficient(line.hose.id);
  const lengthHundreds = line.length / 100;
  const pressureForNozzleAndFriction =
    attackSidePdp - line.elevationLoss;
  let actualNozzlePressure = line.nozzlePressure;
  let actualFlow = line.flow;

  if (pressureForNozzleAndFriction <= 0) {
    return {
      ...line,
      designFlow: line.flow,
      designNozzlePressure: line.nozzlePressure,
      flow: 0,
      nozzlePressure: 0,
      flPer100: 0,
      totalFl: 0,
      requiredPdp: line.elevationLoss,
      reaction: "—",
      isRecalculated: true
    };
  }

  if (line.nozzleType === "smoothbore" || line.nozzleType === "blade") {
    const tip = getStandpipeHydraulicSmoothboreModel(line.lineNumber);

    if (tip) {
      const flowConstant =
        29.7 * tip.diameter * tip.diameter;
      const frictionMultiplier =
        coefficient *
        Math.pow(flowConstant / 100, 2) *
        lengthHundreds;

      actualNozzlePressure =
        pressureForNozzleAndFriction / (1 + frictionMultiplier);
      actualFlow =
        smoothboreGpm(tip.diameter, actualNozzlePressure);
    }
  } else if (isFixedFogType(line.nozzleType)) {
    const flowConstant =
      line.ratedFlow / Math.sqrt(line.ratedPressure);
    const frictionMultiplier =
      coefficient *
      Math.pow(flowConstant / 100, 2) *
      lengthHundreds;

    actualNozzlePressure =
      pressureForNozzleAndFriction / (1 + frictionMultiplier);
    actualFlow =
      fixedFogFlowAtPressure(
        line.ratedFlow,
        line.ratedPressure,
        actualNozzlePressure
      ) || 0;
  } else {
    actualNozzlePressure = line.nozzlePressure;

    const availableFrictionPressure =
      pressureForNozzleAndFriction - actualNozzlePressure;

    actualFlow =
      availableFrictionPressure > 0
        ? Math.sqrt(
            availableFrictionPressure /
            (coefficient * lengthHundreds)
          ) * 100
        : 0;
  }

  const flPer100 =
    coefficient * Math.pow(actualFlow / 100, 2);
  const totalFl =
    flPer100 * lengthHundreds;
  const reaction =
    line.nozzleType === "smoothbore" || line.nozzleType === "blade"
      ? calculateStandpipeSmoothboreReaction(line.lineNumber, actualNozzlePressure)
      : calculateStandpipeFogReaction(actualFlow, actualNozzlePressure);
  const warnings = [...line.warnings];

  if (
    actualFlow > 250 &&
    !warnings.some(warning => warning.includes("Flow exceeds 250 GPM"))
  ) {
    warnings.push(
      "Flow exceeds 250 GPM from a single standpipe outlet. Verify outlet capability, system condition, and local SOP."
    );
  }

  return {
    ...line,
    designFlow: line.flow,
    designNozzlePressure: line.nozzlePressure,
    flow: actualFlow,
    nozzlePressure: actualNozzlePressure,
    flPer100,
    totalFl,
    requiredPdp: actualNozzlePressure + totalFl + line.elevationLoss,
    reaction,
    warnings,
    isRecalculated:
      Math.abs(actualNozzlePressure - line.nozzlePressure) > 1 ||
      Math.abs(actualFlow - line.flow) > 1
  };
}

function calculateStandpipeOps(warnings) {
  const standpipe = state.standpipeOps;
  const supplyLength = numberOrNull(standpipe.supplyLength);
  const supplyHose = HOSE_OPTIONS.find(hose => hose.id === standpipe.supplyHoseSize);
  const standpipeLoss = numberOrNull(standpipe.standpipeLoss) ?? 25;

  const line1 = calculateStandpipeAttackLine("1", warnings);
  if (!line1) return;

  const line2 = standpipe.attack2Enabled
    ? calculateStandpipeAttackLine("2", warnings)
    : null;

  if (standpipe.attack2Enabled && !line2) return;

  if (!supplyHose || supplyLength === null || supplyLength <= 0) {
    warnings.push("Enter a valid supply hose size and supply hose length.");
    renderWarnings(warnings);
    return;
  }

  if (standpipeLoss < 0) {
    warnings.push("Standpipe loss must be 0 psi or greater.");
    renderWarnings(warnings);
    return;
  }

  const highestAttackSidePdp =
    Math.max(
      line1.requiredPdp,
      line2 ? line2.requiredPdp : 0
    );
  const actualLine1 =
    calculateActualStandpipeLine(line1, highestAttackSidePdp);
  const actualLine2 =
    line2
      ? calculateActualStandpipeLine(line2, highestAttackSidePdp)
      : null;
  const totalFlow = actualLine1.flow + (actualLine2 ? actualLine2.flow : 0);
  const supplyFlowPerLine = standpipe.dualSupply ? totalFlow / 2 : totalFlow;
  const supplyCoefficient = getActiveHoseCoefficient(supplyHose.id);
  const supplyTotalFl =
    supplyCoefficient *
    Math.pow(supplyFlowPerLine / 100, 2) *
    (supplyLength / 100);
  const drivingLine =
    line2 && line2.requiredPdp > line1.requiredPdp
      ? actualLine2
      : actualLine1;
  const requiredPdp =
    highestAttackSidePdp +
    standpipeLoss +
    supplyTotalFl;
  const systemWarnings = [];

  if (totalFlow > 500) {
    systemWarnings.push(
      "Total standpipe flow exceeds 500 GPM. Verify riser/system capacity, preplan information, and local procedures."
    );
  }

  if (requiredPdp > 250) {
    systemWarnings.push(
      "High required discharge pressure. Confirm hose, FDC, standpipe system, pressure zones, and department operating limits before pumping this pressure."
    );
  }

  setStandpipeResults({
    requiredPdp,
    totalFlow,
    supplyTotalFl,
    supplyFlowPerLine,
    standpipeLoss,
    drivingLine,
    line1: actualLine1,
    line2: actualLine2,
    systemWarnings
  });

  setResult(
    Math.round(requiredPdp),
    `${Math.round(totalFlow)} GPM`,
    `${supplyTotalFl.toFixed(1)} psi supply`,
    standpipe.dualSupply
      ? `Dual @ ${Math.round(supplyFlowPerLine)} GPM per line`
    : `${Math.round(supplyFlowPerLine)} GPM supply`,
    `Standpipe loss ${Math.round(standpipeLoss)} psi`,
    `Attack Line ${drivingLine.lineNumber} drives PDP`,
    drivingLine.reaction
  );

  renderWarnings([]);
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
    getLineNozzleType(state.splitLay, lineNumber);

  let nozzlePressure =
    numberOrNull(
      state.splitLay[`attack${lineNumber}NozzlePressure`]
    );

  if (!hose || length === null || (!isFixedFogType(nozzleType) && nozzlePressure === null)) {

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

    if (isFixedFogType(nozzleType)) {
      nozzlePressure = fixedFogPressureForFlow(
        getLineRatedFlow(state.splitLay, lineNumber),
        getLineRatedPressure(state.splitLay, lineNumber),
        flow
      );

      if (!(nozzlePressure > 0)) {
        warnings.push(
          `Enter a valid Fixed Fog nozzle rating for Attack Line ${lineNumber}.`
        );
        renderWarnings(warnings);
        return null;
      }
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
  ratedFlow: isFixedFogType(nozzleType)
    ? getLineRatedFlow(state.splitLay, lineNumber)
    : null,
  ratedPressure: isFixedFogType(nozzleType)
    ? getLineRatedPressure(state.splitLay, lineNumber)
    : null,
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
  } else if (isFixedFogType(line.nozzleType)) {
    const flowConstant =
      line.ratedFlow / Math.sqrt(line.ratedPressure);

    const frictionMultiplier =
      coefficient *
      Math.pow(flowConstant / 100, 2) *
      lengthHundreds;

    actualNozzlePressure =
      branchPressure / (1 + frictionMultiplier);

    actualFlow =
      fixedFogFlowAtPressure(
        line.ratedFlow,
        line.ratedPressure,
        actualNozzlePressure
      ) || 0;
  } else {
    actualNozzlePressure = line.nozzlePressure;

    const availableFrictionPressure =
      branchPressure - actualNozzlePressure;

    actualFlow =
      availableFrictionPressure > 0
        ? Math.sqrt(
            availableFrictionPressure /
            (coefficient * lengthHundreds)
          ) * 100
        : 0;
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

  if (line.nozzleType === "smoothbore") {
    const tip = SMOOTHBORE_TIPS.find(
      item => item.id === state.splitLay[`attack${line.lineNumber}SmoothboreTip`]
    );
    return `${tip?.label || "Smoothbore"} ${flowAndPressure}`;
  }

  if (line.nozzleType === "blade") {
    return `${getBladeModelLabel(state.splitLay[`attack${line.lineNumber}BladeModel`])} ${flowAndPressure}`;
  }

  return `${isFixedFogType(line.nozzleType) ? "Fixed Fog" : "Automatic Fog"} ${flowAndPressure}`;
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
    function resetStandpipeResults() {
  [
    "standpipePrimaryPdp",
    "standpipeTotalFlow",
    "standpipeSupplyLoss",
    "standpipeLossResult",
    "standpipeDrivingLine",
    "standpipeAttack1FlowResult",
    "standpipeAttack1FlResult",
    "standpipeAttack1ElevationResult",
    "standpipeAttack1NpResult",
    "standpipeAttack1ReactionResult",
    "standpipeAttack2FlowResult",
    "standpipeAttack2FlResult",
    "standpipeAttack2ElevationResult",
    "standpipeAttack2NpResult",
    "standpipeAttack2ReactionResult"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  [els.standpipeAttack1PressureTag, els.standpipeAttack2PressureTag].forEach(tag => {
    if (!tag) return;
    tag.textContent = "—";
    tag.className = "pressure-path-tag";
  });

  [els.standpipeAttack1Warnings, els.standpipeAttack2Warnings].forEach(container => {
    if (!container) return;
    container.hidden = true;
    container.innerHTML = "";
  });

  if (els.standpipeAdvisories) {
    els.standpipeAdvisories.innerHTML = "";
  }
}

function renderStandpipeLineWarnings(container, warnings) {
  if (!container) return;

  container.hidden = !warnings.length;
  container.innerHTML = warnings.map(warning => (
    `<div class="warning-item"><span>⚠️</span><span>${escapeHtml(warning)}</span></div>`
  )).join("");
}

function renderStandpipeAdvisories(warnings) {
  if (!els.standpipeAdvisories) return;

  const advisoryText =
    "Standpipe outlet pressure is estimated. PRVs, pressure-restricting devices, valve position, system condition, and building piping can affect actual pressure at the outlet. Confirm with an inline gauge whenever possible.";

  const advisoryItems = [advisoryText, ...warnings];

  els.standpipeAdvisories.innerHTML = advisoryItems.map(item => (
    `<div class="warning-item"><span>⚠️</span><span>${escapeHtml(item)}</span></div>`
  )).join("");
}

function setStandpipeLineTag(tag, isDriving, isSingle) {
  if (!tag) return;

  tag.textContent = isSingle
    ? "SINGLE LINE"
    : isDriving
      ? "PDP DRIVING LINE"
      : "SECONDARY";
  tag.className = `pressure-path-tag ${isSingle ? "balanced" : isDriving ? "driver" : "recalculated"}`;
}

function setStandpipeResults({
  requiredPdp,
  totalFlow,
  supplyTotalFl,
  supplyFlowPerLine,
  standpipeLoss,
  drivingLine,
  line1,
  line2,
  systemWarnings
}) {
  if (!els.standpipeResultsCard) return;

  els.standpipePrimaryPdp.textContent =
    `${Math.round(requiredPdp)} PSI`;
  els.standpipeTotalFlow.textContent =
    `${Math.round(totalFlow)} GPM`;
  els.standpipeSupplyLoss.textContent =
    state.standpipeOps.dualSupply
      ? `${supplyTotalFl.toFixed(1)} psi per line @ ${Math.round(supplyFlowPerLine)} GPM`
      : `${supplyTotalFl.toFixed(1)} psi`;
  els.standpipeLossResult.textContent =
    `${Math.round(standpipeLoss)} psi`;
  els.standpipeDrivingLine.textContent =
    `Attack Line ${drivingLine.lineNumber}`;

  const renderLine = (line, elements) => {
    elements.flow.textContent = `${Math.round(line.flow)} GPM`;
    elements.fl.textContent = `${line.totalFl.toFixed(1)} psi`;
    elements.elevation.textContent = `${Math.round(line.elevationLoss)} psi`;
    elements.nozzlePressure.textContent = `${Math.round(line.nozzlePressure)} psi`;
    elements.reaction.textContent = line.reaction;
    renderStandpipeLineWarnings(elements.warnings, line.warnings);
  };

  renderLine(line1, {
    flow: els.standpipeAttack1FlowResult,
    fl: els.standpipeAttack1FlResult,
    elevation: els.standpipeAttack1ElevationResult,
    nozzlePressure: els.standpipeAttack1NpResult,
    reaction: els.standpipeAttack1ReactionResult,
    warnings: els.standpipeAttack1Warnings
  });

  if (line2) {
    renderLine(line2, {
      flow: els.standpipeAttack2FlowResult,
      fl: els.standpipeAttack2FlResult,
      elevation: els.standpipeAttack2ElevationResult,
      nozzlePressure: els.standpipeAttack2NpResult,
      reaction: els.standpipeAttack2ReactionResult,
      warnings: els.standpipeAttack2Warnings
    });
  }

  setStandpipeLineTag(
    els.standpipeAttack1PressureTag,
    drivingLine.lineNumber === "1",
    !line2
  );
  setStandpipeLineTag(
    els.standpipeAttack2PressureTag,
    line2 && drivingLine.lineNumber === "2",
    false
  );

  renderStandpipeAdvisories(systemWarnings);
}

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

      if (isFixedFogType(getMainNozzleType())) {
        const ratedFlow = getMainRatedFlow();
        const ratedPressure = getMainRatedPressure();
        const calculatedPressure = isReverseMode()
          ? calculateAchievableFixedFogPressure()
          : isRequiredPdpMode()
            ? fixedFogPressureForFlow(ratedFlow, ratedPressure, numberOrNull(state.targetGpm))
            : ratedPressure;
        const rating = ratedFlow && ratedPressure
          ? `${Math.round(ratedFlow)} GPM @ ${Math.round(ratedPressure)} PSI`
          : "rating incomplete";
        const pressureText = calculatedPressure
          ? ` • NP ${Math.round(calculatedPressure)} psi`
          : "";

        return `Fixed Fog • ${rating}${pressureText}`;
      }

      const displayPressure =
  state.nozzlePressure === "custom"
    ? state.customNozzlePressure
    : state.nozzlePressure;

return `Automatic Fog • ${displayPressure} psi`;
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

      if (isFogHydraulicType(getMainNozzleType())) {
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

    function isStandpipeOpsMode() {
      return state.mode === "standpipeOps";
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
  const visibleSplitDefaults = getVisibleDefaultSplitLayState();

  state.splitLay.attack2Length = "";
  state.splitLay.attack2Flow = "";
  state.splitLay.attack2RatedFlow = "";
  state.splitLay.attack2RatedPressure = "";
  state.splitLay.attack2SmoothboreTip = "";
  state.splitLay.attack2BladeModel =
    visibleSplitDefaults.attack2BladeModel;
  state.splitLay.attack2NozzleType =
    visibleSplitDefaults.attack2NozzleType;
  state.splitLay.attack2NozzlePressure =
    visibleSplitDefaults.attack2NozzlePressure;
  state.splitLay.attack2HoseSize =
    visibleSplitDefaults.attack2HoseSize;

  [
    ["splitAttack2Length", ""],
    ["splitAttack2Flow", ""],
    ["splitAttack2SmoothboreTip", ""],
    ["splitAttack2BladeModel", visibleSplitDefaults.attack2BladeModel],
    ["splitAttack2NozzleType", visibleSplitDefaults.attack2NozzleType],
    ["splitAttack2NozzlePressure", visibleSplitDefaults.attack2NozzlePressure],
    ["splitAttack2RatedFlow", ""],
    ["splitAttack2RatedPressure", ""],
    ["splitAttack2Hose", visibleSplitDefaults.attack2HoseSize]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
  syncSplitNozzleUi("2");
}
    function clearSplitSupply2State() {
  const visibleSplitDefaults = getVisibleDefaultSplitLayState();

  state.splitLay.supply2Length = "";
  state.splitLay.supply2HoseSize =
    visibleSplitDefaults.supply2HoseSize;
  state.splitLay.appliance2 =
    visibleSplitDefaults.appliance2;

  [
    ["splitSupply2Length", ""],
    ["splitSupply2Hose", visibleSplitDefaults.supply2HoseSize],
    ["splitAppliance2", visibleSplitDefaults.appliance2]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
}

  function resetReverseSupplyInputs() {
  state.reverseSupplyEnabled = false;
  state.reverseSupplyLength = "";
  state.reverseSupplyHoseSize = resolveVisibleHoseDefault("3", getSupplyHoseOptions());
  state.reverseSupplyAppliance = "gateValve";

  if (els.reverseSupplyLength) {
    els.reverseSupplyLength.value = "";
  }

  if (els.reverseSupplyHose) {
    els.reverseSupplyHose.value = state.reverseSupplyHoseSize;
  }

  if (els.reverseSupplyAppliance) {
    els.reverseSupplyAppliance.value = "gateValve";
  }

  syncReverseSupplyUi();
}

function resetSplitLayInputs() {

  state.splitLay = getVisibleDefaultSplitLayState();

  [
    ["splitSupplyLength", ""],
    ["splitSupplyHose", state.splitLay.supplyHoseSize],
    ["splitAppliance1", DEFAULT_STATE.splitLay.appliance1],

    ["splitSupply2Length", ""],
    ["splitSupply2Hose", state.splitLay.supply2HoseSize],
    ["splitAppliance2", DEFAULT_STATE.splitLay.appliance2],

    ["splitAttack1Length", ""],
    ["splitAttack1Hose", state.splitLay.attack1HoseSize],
    ["splitAttack1NozzleType", DEFAULT_STATE.splitLay.attack1NozzleType],
    ["splitAttack1NozzlePressure", DEFAULT_STATE.splitLay.attack1NozzlePressure],
    ["splitAttack1Flow", ""],
    ["splitAttack1RatedFlow", ""],
    ["splitAttack1RatedPressure", ""],
    ["splitAttack1SmoothboreTip", state.splitLay.attack1SmoothboreTip],
    ["splitAttack1BladeModel", DEFAULT_STATE.splitLay.attack1BladeModel],

    ["splitAttack2Length", ""],
    ["splitAttack2Hose", state.splitLay.attack2HoseSize],
    ["splitAttack2NozzleType", DEFAULT_STATE.splitLay.attack2NozzleType],
    ["splitAttack2NozzlePressure", DEFAULT_STATE.splitLay.attack2NozzlePressure],
    ["splitAttack2Flow", ""],
    ["splitAttack2RatedFlow", ""],
    ["splitAttack2RatedPressure", ""],
    ["splitAttack2SmoothboreTip", state.splitLay.attack2SmoothboreTip],
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
