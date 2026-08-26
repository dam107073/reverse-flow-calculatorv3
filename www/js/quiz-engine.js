(function (root, factory) {
  const hydraulics = typeof module === "object" && module.exports ? require("./hydraulics-core") : root.ReverseFlowHydraulics;
  const api = factory(hydraulics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (H) {
  "use strict";

  const CATEGORIES = Object.freeze([
    ["all", "All Hydraulics"], ["friction-loss", "Friction Loss"], ["pdp", "PDP"], ["smoothbore", "Smoothbore"],
    ["nozzle-reaction", "Nozzle Reaction"], ["elevation", "Elevation"], ["relay-pumping", "Relay Pumping"],
    ["standpipe", "Standpipe"], ["water-supply", "Water Supply"], ["pump-operations", "Pump Operations"]
  ].map(([id, label]) => Object.freeze({ id, label })));
  const DIFFICULTIES = Object.freeze(["basic", "intermediate", "advanced"]);
  const HOSES = Object.freeze([
    { label: '1½-inch', coefficient: 24, flows: [100, 125, 150, 175] },
    { label: '1¾-inch', coefficient: 15.5, flows: [125, 150, 160, 175, 185, 200] },
    { label: '1.88-inch', coefficient: 8, flows: [150, 175, 185, 200, 225] },
    { label: '2½-inch', coefficient: 2, flows: [250, 300, 350, 400, 500] },
    { label: '3-inch', coefficient: 0.8, flows: [500, 600, 750, 800] },
    { label: '4-inch', coefficient: 0.2, flows: [750, 1000, 1200] },
    { label: '5-inch', coefficient: 0.08, flows: [1000, 1250, 1500] }
  ]);
  const TIPS = Object.freeze([{ label: '¾-inch', diameter: .75 }, { label: '⅞-inch', diameter: .875 }, { label: '15⁄16-inch', diameter: .9375 }, { label: '1-inch', diameter: 1 }, { label: '1⅛-inch', diameter: 1.125 }]);

  function createRng(seed = Date.now()) {
    let state = (Number(seed) || 1) >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(values, rng) { return values[Math.floor(rng() * values.length)]; }
  function shuffle(values, rng) { const copy = [...values]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
  function whole(value) { return Math.round(value); }
  function answerSet(correct, candidates, unit = "") {
    const normalizedCorrect = whole(correct);
    const values = [normalizedCorrect, ...candidates.map(whole)].filter((value, index, list) => Number.isFinite(value) && value >= 0 && list.indexOf(value) === index);
    let offset = Math.max(2, Math.round(Math.abs(normalizedCorrect) * .1));
    while (values.length < 4) { const next = normalizedCorrect + (values.length % 2 ? offset : -offset); if (next >= 0 && !values.includes(next)) values.push(next); offset += Math.max(1, Math.round(offset / 2)); }
    return values.slice(0, 4).map(value => `${value}${unit ? ` ${unit}` : ""}`);
  }
  function finalizeQuestion(base, rng, serial) {
    const correctText = base.choices[base.correctIndex];
    const choices = shuffle(base.choices.map((text, index) => ({ text, correct: index === base.correctIndex })), rng);
    return { ...base, id: `${base.templateId || base.id}-${serial}`, choices: choices.map(item => item.text), correctIndex: choices.findIndex(item => item.correct), correctText };
  }

  const calculationTemplates = [
    { id: "fl-one-step", category: "friction-loss", difficulties: ["basic","intermediate"], generate(rng) { const hose = pick(HOSES.slice(0,4),rng), flow=pick(hose.flows,rng), length=pick([100,150,200,250,300],rng), result=H.frictionLoss(hose.coefficient,flow,length); return { prompt:`You are flowing ${flow} GPM through ${length} feet of ${hose.label} hose with C = ${hose.coefficient}. About how much friction loss should you expect?`, choices:answerSet(result,[result/(length/100),hose.coefficient*Math.pow(flow/100,2)*length/10000,result*2],"PSI"), correctIndex:0, explanation:`Q = ${(flow/100).toFixed(2)}, L = ${(length/100).toFixed(1)}. FL = ${hose.coefficient} × Q² × L ≈ ${whole(result)} PSI.`, math:`FL = ${hose.coefficient} × ${(flow/100).toFixed(2)}² × ${(length/100).toFixed(1)}` }; } },
    { id: "pdp-full", category: "pdp", difficulties: ["intermediate","advanced"], generate(rng) { const hose=pick(HOSES.slice(0,4),rng),flow=pick(hose.flows,rng),length=pick([150,200,250,300],rng),np=pick([50,55,75,100],rng),appliance=pick([0,10,25],rng),fl=H.frictionLoss(hose.coefficient,flow,length),result=H.requiredPDP({nozzlePressure:np,frictionLossPSI:fl,applianceLoss:appliance}); return { prompt:`A ${length}-foot ${hose.label} line is flowing ${flow} GPM at ${np} PSI nozzle pressure${appliance ? ` with ${appliance} PSI appliance loss` : ""}. About what PDP is required?`,choices:answerSet(result,[fl+appliance,np+appliance,np+fl],"PSI"),correctIndex:0,explanation:`Add nozzle pressure, friction loss, and appliance loss. ${np} + ${whole(fl)} + ${appliance} ≈ ${whole(result)} PSI.`,math:`PDP = NP + FL + appliance loss`}; } },
    { id: "smoothbore-flow", category: "smoothbore", difficulties: ["basic","intermediate"], generate(rng) { const tip=pick(TIPS,rng),np=pick([40,50,60,80],rng),result=H.smoothboreFlow(tip.diameter,np); return {prompt:`About how much will a ${tip.label} smoothbore tip flow at ${np} PSI nozzle pressure?`,choices:answerSet(result,[result*.75,result*1.25,29.7*tip.diameter*Math.sqrt(np)],"GPM"),correctIndex:0,explanation:`GPM = 29.7 × d² × √NP. This package flows about ${whole(result)} GPM.`,math:`GPM = 29.7 × ${tip.diameter}² × √${np}`}; } },
    { id: "smoothbore-reaction", category: "nozzle-reaction", difficulties: ["intermediate","advanced"], generate(rng) { const tip=pick(TIPS,rng),np=pick([40,50,60,80],rng),result=H.smoothboreReaction(tip.diameter,np); return {prompt:`About how much nozzle reaction will a ${tip.label} smoothbore produce at ${np} PSI?`,choices:answerSet(result,[result*.5,result*1.5,H.smoothboreFlow(tip.diameter,np)],"lb"),correctIndex:0,explanation:`NR = 1.57 × d² × NP ≈ ${whole(result)} pounds.`,math:`NR = 1.57 × ${tip.diameter}² × ${np}`}; } },
    { id: "fog-reaction", category: "nozzle-reaction", difficulties: ["basic","intermediate"], generate(rng) { const flow=pick([125,150,160,185,200,250],rng),np=pick([50,55,75,100],rng),result=H.fogReaction(flow,np); return {prompt:`About how much nozzle reaction will a fog nozzle produce at ${flow} GPM and ${np} PSI?`,choices:answerSet(result,[result*.7,result*1.3,flow/2],"lb"),correctIndex:0,explanation:`NR = 0.0505 × GPM × √NP ≈ ${whole(result)} pounds.`,math:`NR = 0.0505 × ${flow} × √${np}`}; } },
    { id: "elevation-feet", category: "elevation", difficulties: ["basic","intermediate"], generate(rng) { const feet=pick([25,40,50,75,100,125],rng),result=H.elevationPressure(feet); return {prompt:`The nozzle is ${feet} vertical feet above the pump. About how much elevation pressure should be added?`,choices:answerSet(result,[feet/10,feet*.5,feet],"PSI"),correctIndex:0,explanation:`Elevation pressure is 0.434 PSI per vertical foot. ${feet} × 0.434 ≈ ${whole(result)} PSI.`,math:`EP = ${feet} × 0.434`}; } },
    { id: "relay-pdp", category: "relay-pumping", difficulties: ["intermediate","advanced"], generate(rng) { const hose=pick(HOSES.slice(4),rng),flow=pick(hose.flows,rng),length=pick([500,750,1000,1250],rng),residual=pick([20,30,40,50],rng),fl=H.frictionLoss(hose.coefficient,flow,length),result=fl+residual; return {prompt:`A relay must move ${flow} GPM through ${length} feet of ${hose.label} hose and deliver ${residual} PSI residual. About what relay PDP is required?`,choices:answerSet(result,[fl,residual+fl/(length/100),flow/10],"PSI"),correctIndex:0,explanation:`Relay PDP equals hose friction loss plus receiving-engine residual: ${whole(fl)} + ${residual} ≈ ${whole(result)} PSI.`,math:`Relay PDP = FL + residual`}; } },
    { id: "standpipe-floor", category: "standpipe", difficulties: ["basic","intermediate"], generate(rng) { const floor=pick([3,4,5,6,8,10],rng),result=H.standpipeElevationPressure(floor); return {prompt:`Using Reverse Flow's 5 PSI-per-floor convention, how much elevation loss is estimated for an outlet on Floor ${floor}?`,choices:answerSet(result,[floor*5,(floor-2)*5,floor],"PSI"),correctIndex:0,explanation:`Floor 1 is the reference, so (${floor} − 1) × 5 = ${whole(result)} PSI.`,math:`Elevation = (floor − 1) × 5`}; } },
    { id: "standpipe-full", category: "standpipe", difficulties: ["advanced"], generate(rng) { const attack=pick([80,95,110,125],rng),floor=pick([4,6,8,10],rng),standpipe=25,supply=pick([10,15,20,25],rng),elev=H.standpipeElevationPressure(floor),result=attack+elev+standpipe+supply; return {prompt:`An attack package needs ${attack} PSI at a Floor ${floor} outlet. Add ${standpipe} PSI standpipe loss and ${supply} PSI supply loss. About what engine PDP is required?`,choices:answerSet(result,[attack+standpipe+supply,attack+elev+supply,attack+elev+standpipe],"PSI"),correctIndex:0,explanation:`Add attack demand, ${whole(elev)} PSI elevation, standpipe loss, and supply loss. Total ≈ ${whole(result)} PSI.`,math:`PDP = attack demand + elevation + standpipe loss + supply FL`}; } },
    { id: "tank-time", category: "pump-operations", difficulties: ["basic","intermediate"], generate(rng) { const tank=pick([500,750,1000,1250,1500],rng),flow=pick([100,125,150,200,250,300,500],rng),seconds=H.tankTimeSeconds(tank,flow),minutes=seconds/60; const formatTime=value=>`${Math.floor(value/60)} min ${value%60} sec`; const answer=formatTime(seconds); const wrong=[formatTime(Math.max(30,Math.round(seconds/2))),formatTime(seconds+120),formatTime(seconds+300)]; return {prompt:`A ${tank}-gallon tank is supplying ${flow} GPM with no incoming water. About how long will it last?`,choices:[answer,...wrong],correctIndex:0,explanation:`Tank time = gallons ÷ GPM. ${tank} ÷ ${flow} = ${minutes.toFixed(2)} minutes.`,math:`Time = ${tank} ÷ ${flow}`}; } },
    { id: "water-velocity", category: "pump-operations", difficulties: ["intermediate","advanced"], generate(rng) { const diameter=pick([1.75,2,2.5,3],rng),flow=pick([150,200,250,300,500],rng),result=H.waterVelocity(flow,diameter); return {prompt:`About how fast is water moving at ${flow} GPM through a ${diameter}-inch inside diameter?`,choices:answerSet(result,[result*diameter,result/diameter,flow/diameter],"ft/sec"),correctIndex:0,explanation:`Velocity = 0.408 × GPM ÷ d² ≈ ${whole(result)} ft/sec.`,math:`Velocity = 0.408 × ${flow} ÷ ${diameter}²`}; } },
    { id: "remaining-supply", category: "water-supply", difficulties: ["advanced"], generate(rng) { const staticPressure=pick([70,80,90,100],rng),residualPressure=pick([40,50,60],rng); if(residualPressure>=staticPressure-10)return this.generate(rng); const currentFlow=pick([750,1000,1250],rng),result=H.estimatedSupply({staticPressure,residualPressure,currentFlow,targetResidual:20}); return {prompt:`A hydrant has ${staticPressure} PSI static and ${residualPressure} PSI residual while flowing ${currentFlow} GPM. About how much additional flow is projected at 20 PSI residual?`,choices:answerSet(result.remainingFlow,[result.projectedFlow,currentFlow-result.remainingFlow,result.remainingFlow/2],"GPM"),correctIndex:0,explanation:`Project total flow with the 0.54 relationship, then subtract current flow. Additional supply ≈ ${whole(result.remainingFlow)} GPM.`,math:`Projected = current × ((static − 20) ÷ (static − residual))^0.54`}; } }
  ];

  const applicationTemplates = [
    ["app-extra-hose","friction-loss",["basic","intermediate"],"A crew adds another 100 feet of the same hose while keeping flow unchanged. What must the pump operator account for?",["More friction loss","Less nozzle pressure is required by definition","A smaller tank","No change to the hydraulic path"],0,"Longer hose adds friction loss, so the pump setting must account for the added pressure demand."],
    ["app-lower-line","pdp",["advanced"],"Two attack lines share a pump, and one has a lower pressure demand. What may be needed on that discharge?",["Gate it to the intended pressure","Raise it above the driving line","Remove the nozzle","Ignore the pressure difference"],0,"The highest-demand line can drive pump pressure; lower-demand discharges may need careful gating."],
    ["app-uphill","elevation",["basic","intermediate"],"A crew advances above the pump without changing hose or flow. What new pressure factor should be considered?",["Elevation loss","Tank capacity gain","Lower hose coefficient","Hydrant static pressure only"],0,"Moving above the pump adds pressure demand to lift the water."],
    ["app-relay-limit","relay-pumping",["advanced"],"A relay estimate exceeds hose and apparatus pressure limits. What is the best next step?",["Change the layout, flow, hose size, or number of pumpers","Use the number anyway","Remove receiving residual","Add a higher coefficient"],0,"A workable relay stays inside equipment limits. Adjusting the layout can reduce required pressure."],
    ["app-standpipe-gauge","standpipe",["intermediate","advanced"],"Why should standpipe outlet pressure be confirmed with an inline gauge when possible?",["System condition and pressure zones may differ from the estimate","The gauge changes the hose coefficient","It removes elevation loss","Every outlet must flow 500 GPM"],0,"The calculation is an estimate; actual standpipe conditions and pressure-reducing devices can change outlet pressure."],
    ["app-tank-early","pump-operations",["basic"],"Tank time is getting short and no sustained supply is established. What is the useful operational response?",["Communicate early and establish water supply","Wait until the tank is empty","Increase every discharge","Ignore total flow"],0,"Tank time supports early communication and water-supply decisions; it is not a reason to wait for an empty tank."],
    ["app-water-target","water-supply",["advanced"],"A 0 PSI hydrant projection shows a large number. How should it be treated?",["As a theoretical aggressive estimate, not a standard rating","As guaranteed available flow","As the nozzle pressure","As the tank refill rate"],0,"Projection to complete pressure depletion is not the standard 20 PSI available-fire-flow reference."],
    ["app-reaction","nozzle-reaction",["intermediate"],"A nozzle package produces more reaction than the crew can safely control. What should be reconsidered?",["The flow, pressure, nozzle, and staffing package","Only the hose color","The tank label","The hydrant address"],0,"A practical stream must meet hydraulic goals and remain controllable by the crew."],
    ["app-tip-confirm","smoothbore",["basic"],"Before using a smoothbore flow estimate, what equipment detail should be confirmed?",["The actual tip diameter","The tank paint color","The hose manufacture date only","The pump hour meter"],0,"Tip diameter is part of the flow formula and strongly affects the answer."]
  ].map(([id,category,difficulties,prompt,choices,correctIndex,explanation]) => ({ id, category, difficulties, generate(){return{prompt,choices,correctIndex,explanation,math:""};} }));

  function matchingTemplates(category, difficulty) { return [...calculationTemplates, ...applicationTemplates].filter(template => (category === "all" || template.category === category) && template.difficulties.includes(difficulty)); }
  function matchingConcepts(concepts, category, difficulty) { return (concepts || []).filter(question => question?.type === "concept" && (category === "all" || question.category === category) && question.difficulty === difficulty && Array.isArray(question.choices) && question.choices.length === 4); }
  function createSession({ concepts = [], category = "all", difficulty = "basic", count = 5, seed = Date.now(), retryConcepts = [] } = {}) {
    if (!CATEGORIES.some(item => item.id === category)) throw new Error("Invalid quiz category.");
    if (!DIFFICULTIES.includes(difficulty)) throw new Error("Invalid quiz difficulty.");
    if (![5,10,20].includes(Number(count))) throw new Error("Question count must be 5, 10, or 20.");
    const rng=createRng(seed), conceptPool=shuffle(matchingConcepts(concepts,category,difficulty),rng), templatePool=matchingTemplates(category,difficulty);
    if (!conceptPool.length && !templatePool.length) throw new Error("No valid questions are available for this selection.");
    const preferredRetry = new Set(retryConcepts.map(String));
    conceptPool.sort((a,b) => Number(preferredRetry.has(b.id))-Number(preferredRetry.has(a.id)));
    templatePool.sort((a,b) => Number(preferredRetry.has(b.id))-Number(preferredRetry.has(a.id)));
    const questions=[]; let conceptIndex=0, templateIndex=0;
    while(questions.length<Number(count)) {
      const useConcept=conceptPool.length && (questions.length%3===0 || !templatePool.length);
      if(useConcept){ const source=conceptPool[conceptIndex%conceptPool.length]; conceptIndex+=1; questions.push(finalizeQuestion({...source,templateId:source.id,conceptId:source.id},rng,questions.length+1)); }
      else { const template=templatePool[templateIndex%templatePool.length]; templateIndex+=1; const generated=template.generate(rng); const type=calculationTemplates.includes(template)?"calculation":"application"; questions.push(finalizeQuestion({...generated,templateId:template.id,conceptId:template.id,type,category:template.category,difficulty},rng,questions.length+1)); }
    }
    return { id:`quiz-${seed}-${category}-${difficulty}`,seed,category,difficulty,count:Number(count),questions,answers:[],currentIndex:0,completed:false };
  }
  function answerQuestion(session, choiceIndex) { const question=session.questions[session.currentIndex]; if(!question||session.completed) return session; if(session.answers.some(answer=>answer.questionId===question.id)) return session; const answer={questionId:question.id,choiceIndex,correct:choiceIndex===question.correctIndex,conceptId:question.conceptId,category:question.category}; const answers=[...session.answers,answer]; return {...session,answers}; }
  function nextQuestion(session) { if(!session.answers.some(answer=>answer.questionId===session.questions[session.currentIndex]?.id)) return session; const next=session.currentIndex+1; return {...session,currentIndex:Math.min(next,session.questions.length-1),completed:next>=session.questions.length}; }
  function scoreSession(session) { const correct=session.answers.filter(answer=>answer.correct).length,total=session.questions.length,missed=session.answers.filter(answer=>!answer.correct); return {correct,total,missed,percentage:total?Math.round(correct/total*100):0,byCategory:[...new Set(session.questions.map(q=>q.category))].map(category=>{const answers=session.answers.filter(a=>a.category===category);return{category,correct:answers.filter(a=>a.correct).length,total:session.questions.filter(q=>q.category===category).length};})}; }
  function createRetrySession(session, concepts, seed=Date.now()) { const missed=scoreSession(session).missed; if(!missed.length) return null; const count=missed.length<=5?5:missed.length<=10?10:20; return createSession({concepts,category:session.category,difficulty:session.difficulty,count,seed,retryConcepts:missed.map(item=>item.conceptId)}); }
  return { CATEGORIES, DIFFICULTIES, applicationTemplates, calculationTemplates, createRetrySession, createRng, createSession, answerQuestion, matchingConcepts, matchingTemplates, nextQuestion, scoreSession };
});
