const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../www/js/resources-data.js");
function formulaFeed() { return { schemaVersion:"reverse-flow-learning-formulas-v1",contentVersion:"test-1",updatedAt:"2026-08-26T16:00:00Z",items:[{id:"friction-loss",title:"Friction Loss",category:"Friction Loss",summary:"Pressure used moving water through hose.",formula:"FL = C × Q² × L",tellsYou:"Pressure lost in hose.",variables:[{symbol:"FL",meaning:"friction loss",units:"PSI"}],explanation:"More hose and flow add loss.",example:{scenario:"Flow water through hose.",steps:["Insert the values."],answer:"FL = 10 PSI"},takeaway:"Account for hose loss.",quizCategory:"friction-loss",updatedAt:"2026-08-26T16:00:00Z"}]}; }
function quizFeed() { return { schemaVersion:"reverse-flow-learning-quiz-v1",contentVersion:"test-1",updatedAt:"2026-08-26T16:00:00Z",items:[{id:"fl-basic",category:"friction-loss",difficulty:"basic",type:"concept",prompt:"What happens when hose length increases?",choices:["Loss increases","Loss decreases","Nothing changes","Flow stops"],correctIndex:0,explanation:"Longer hose creates more friction loss."}]}; }
function courseFeed() {
  const lessons=Array.from({length:10},(_,index)=>({id:`lesson-${index+1}`,order:index+1,title:`Lesson ${index+1}`,minutes:"3–5 min",takeaway:"Use the pressure parts.",steps:[
    {id:`l${index+1}-teach`,type:"teaching",kind:index===0?"worked-example":undefined,title:"Learn",statement:"Pressure pushes water.",body:"Flow is water moving.",...(index===1?{interaction:{type:"guided-practice",prompt:"What is Q?",choices:["0.2","2","20","200"],correctIndex:1,feedback:"Q = 2.",concept:"friction-loss"}}:{})},
    {id:`l${index+1}-visual`,type:"visual",title:"See it",visual:{kind:"pressure-gauge",description:"A gauge shows pressure.",labels:["PSI"]}},
    {id:`l${index+1}-question`,type:"question",prompt:"What measures pressure?",choices:["PSI","GPM","Feet","Gallons"],correctIndex:0,feedback:"PSI measures pressure.",concept:"pressure-flow",kind:"concept"},
    {id:`l${index+1}-calc`,type:"calculation",prompt:"Find the loss.",operation:"frictionLoss",inputs:{coefficient:2,flowGPM:250,lengthFeet:200},choices:[13,25,50,100],unit:"PSI",explanation:"The result is 25 PSI.",concept:"friction-loss"},
    {id:`l${index+1}-recap`,type:"recap",title:"Takeaway",takeaway:"Pressure and flow are related."}
  ]}));
  return {schemaVersion:"reverse-flow-learning-course-v1",contentVersion:"test-1",updatedAt:"2026-08-26T18:00:00Z",course:{id:"fireground-hydraulics-basics",title:"Fireground Hydraulics Basics",subtitle:"Learn one step at a time.",lessons}};
}

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
}
function headers(values = {}) { return { get: name => values[name.toLowerCase()] || "" }; }
function response(data, options = {}) {
  return { ok: options.status ? options.status >= 200 && options.status < 300 : true, status: options.status || 200, headers: headers(options.headers), json: async () => data };
}
function trainingItem() {
  return { id: "training-1", slug: "engine-ops", title: "Engine Ops", appSummary: "Practical engine work.", specialties: ["Pump Operations"], statesServed: ["Nationwide"], logoUrl: "/api/training-directory/asset?id=1" };
}
function hoseItem(id = "hose-1") {
  return { id, manufacturer: { name: "Key Hose", slug: "key-hose" }, name: `Big 10 ${id}`, canonicalPath: `/resources/hose-library/key-hose/${id}/`, displaySize: '1.75"', nominalDiameter: { value: 1.75, unit: "in" }, diameterGroup: { key: "small", label: "Small Diameter" }, lifecycle: "current", statusLabel: "Current", origin: { label: "Supporter Submitted" }, verified: true };
}
function hosePage(items, total, nextCursor = null) {
  return { schemaVersion: "resources-public-v1", library: "hose", items, total, pagination: { limit: 100, nextCursor }, availableFilters: { manufacturers: [{ slug: "key-hose", name: "Key Hose" }], diameters: [{ value: 1.75 }], lifecycle: [{ value: "current", label: "Current" }] } };
}
function articleItem(overrides = {}) {
  return { id: "article-1", title: "First Line", summary: "A practical field note.", contentType: "field_note", category: "Operations", author: { name: "Taylor", supporterNumber: "0042" }, canonicalUrl: "https://reverse-flow.app/resources/articles/first-line", publishedAt: "2026-08-01T12:00:00Z", coverImageUrl: "/api/resources/article-assets/11111111-1111-4111-8111-111111111111", ...overrides };
}

test("typed normalizers accept optional fields and reject malformed structures", () => {
  assert.equal(R.normalizeTrainingPayload({ listings: [trainingItem()] }).items[0].canonicalUrl, "https://reverse-flow.app/training-directory/engine-ops");
  assert.equal(R.normalizeHosePage(hosePage([hoseItem()], 1)).items[0].verified, true);
  assert.equal(R.normalizeArticlesPayload({ items: [articleItem()] }).items[0].supporterNumber, "0042");
  assert.match(R.normalizeArticlesPayload({ items: [articleItem()] }).items[0].coverImageUrl, /variant=640/);
  assert.throws(() => R.normalizeTrainingPayload({ listings: [{ id: "x" }] }), /required field/);
  assert.throws(() => R.normalizeHosePage({ items: [] }), /version|structurally/);
  assert.throws(() => R.normalizeArticlesPayload({ items: [{ title: "Draft" }] }), /required field/);
});

test("learning feed parsers accept the shared schemas and reject malformed updates", () => {
  const formulas=R.normalizeFormulasPayload(formulaFeed());
  const quiz=R.normalizeQuizPayload(quizFeed());
  const course=R.normalizeCoursePayload(courseFeed());
  assert.equal(formulas.items.length,1);
  assert.equal(quiz.items.length,1);
  assert.equal(course.items.length,10);
  assert.equal(course.items[0].steps.length,5);
  assert.equal(course.items[0].steps[0].kind,"worked-example");
  assert.equal(course.items[1].steps[0].kind,"guided-practice");
  assert.deepEqual(course.items[1].steps[0].choices,["0.2","2","20","200"]);
  assert.equal(course.course.title,"Fireground Hydraulics Basics");
  assert.equal(formulas.items[0].variables.length>0,true);
  assert.equal(quiz.items.every(item=>item.choices.length===4),true);
  assert.throws(()=>R.normalizeFormulasPayload({...formulaFeed(),schemaVersion:"future"}),/version/);
  const malformed=quizFeed();malformed.items=[{...malformed.items[0],choices:["one"]}];
  assert.throws(()=>R.normalizeQuizPayload(malformed),/invalid answers/);
  const badCourse=courseFeed();badCourse.course.lessons[0].steps[2].choices=["one"];
  assert.throws(()=>R.normalizeCoursePayload(badCourse),/invalid answers/);
  const badCalculation=courseFeed();badCalculation.course.lessons[0].steps[3].inputs={};
  assert.throws(()=>R.normalizeCoursePayload(badCalculation),/Calculation step/);
  const badTeachingKind=courseFeed();badTeachingKind.course.lessons[0].steps[0].kind="future-kind";
  assert.throws(()=>R.normalizeCoursePayload(badTeachingKind),/Teaching step/);
});

test("learning resources retain last-known-good content after malformed revalidation", async () => {
  const target=storage();
  R.writeCache("formulas",{data:R.normalizeFormulasPayload(formulaFeed())},target);
  const repository=new R.ResourceRepository("formulas",{storage:target,fetch:async()=>response({schemaVersion:"broken",items:[]})});
  assert.equal(repository.state.items.length,1);
  await repository.refresh({force:true});
  assert.equal(repository.state.status,"cached");
  assert.equal(repository.state.items.length,1);
});

test("course resources cache validated structured lessons and reject incompatible replacement", async () => {
  const target=storage();
  R.writeCache("course",{data:R.normalizeCoursePayload(courseFeed())},target);
  const repository=new R.ResourceRepository("course",{storage:target,fetch:async()=>response({schemaVersion:"future",course:{lessons:[]}})});
  assert.equal(repository.state.items.length,10);
  await repository.refresh({force:true});
  assert.equal(repository.state.status,"cached");
  assert.equal(repository.state.items.length,10);
});

test("canonical URLs and images are first-party HTTPS only", () => {
  assert.equal(R.canonicalResourceUrl("https://reverse-flow.app/resources/articles/one", "articles"), "https://reverse-flow.app/resources/articles/one");
  assert.equal(R.canonicalResourceUrl("http://reverse-flow.app/resources/articles/one", "articles"), "");
  assert.equal(R.canonicalResourceUrl("https://evil.example/resources/articles/one", "articles"), "");
  assert.equal(R.canonicalResourceUrl("https://reverse-flow.app/admin/articles", "articles"), "");
  assert.equal(R.safeImageUrl("/api/resources/article-assets/one"), "https://reverse-flow.app/api/resources/article-assets/one");
  assert.equal(R.safeImageUrl("https://storage.example/private.jpg"), "");
});

test("canonical link opening uses one safe strategy and a blocked-popup fallback", () => {
  const calls = [];
  assert.equal(R.openCanonicalResourceUrl("https://reverse-flow.app/resources/hose-library/key/item/", "hose", { open: (...args) => { calls.push(args); return {}; } }), true);
  assert.deepEqual(calls[0], ["https://reverse-flow.app/resources/hose-library/key/item/", "_blank", "noopener"]);
  let fallback = "";
  assert.equal(R.openCanonicalResourceUrl("/training-directory/example", "training", { open: () => null, fallback: value => { fallback = value; } }), true);
  assert.equal(fallback, "https://reverse-flow.app/training-directory/example");
  let rejected = false;
  assert.equal(R.openCanonicalResourceUrl("https://evil.example/resource", "hose", { onError: () => { rejected = true; } }), false);
  assert.equal(rejected, true);
});

test("cache is versioned and malformed cache is ignored", () => {
  const target = storage();
  const cached = R.writeCache("articles", { data: { items: [] }, etag: '"abc"' }, target);
  assert.equal(cached.version, R.CACHE_VERSION);
  assert.deepEqual(R.readCache("articles", target).data.items, []);
  target.setItem(R.CACHE_KEYS.articles, JSON.stringify({ version: 1, data: { items: [articleItem()] } }));
  assert.equal(R.readCache("articles", target), null);
  target.setItem(R.CACHE_KEYS.articles, JSON.stringify({ version: R.CACHE_VERSION, type: "articles", fetchedAt: new Date().toISOString(), data: { items: [{ id: "bad" }] } }));
  assert.equal(R.readCache("articles", target), null);
});

test("conditional request returns not-modified without parsing a body", async () => {
  let requestHeaders;
  const result = await R.fetchCompleteResource("articles", { etag: '"old"', data: { items: [articleItem()] } }, {
    fetch: async (_url, options) => { requestHeaders = options.headers; return response(null, { status: 304 }); }
  });
  assert.equal(result.notModified, true);
  assert.equal(requestHeaders["If-None-Match"], '"old"');
});

test("Hose Library follows cursors, removes duplicate IDs, and requires a coherent complete feed", async () => {
  const calls = [];
  const fetch = async url => {
    calls.push(url);
    if (calls.length === 1) return response(hosePage([hoseItem("one"), hoseItem("two")], 3, "next"));
    return response(hosePage([hoseItem("two"), hoseItem("three")], 3, null));
  };
  const result = await R.fetchCompleteResource("hose", null, { fetch });
  assert.equal(result.data.items.length, 3);
  assert.match(calls[1], /cursor=next/);
  await assert.rejects(() => R.fetchCompleteResource("hose", null, { fetch: async () => response(hosePage([hoseItem("one")], 2, null)) }), /partial/);
});

test("last-known-good cache renders immediately and survives failed refresh", async () => {
  const target = storage();
  R.writeCache("training", { data: { items: R.normalizeTrainingPayload({ listings: [trainingItem()] }).items } }, target);
  const repository = new R.ResourceRepository("training", { storage: target, fetch: async () => { throw new Error("network down"); } });
  assert.equal(repository.state.status, "cached");
  assert.equal(repository.state.items.length, 1);
  await repository.refresh({ force: true });
  assert.equal(repository.state.status, "cached");
  assert.equal(repository.state.items.length, 1);
  assert.match(repository.state.message, /showing saved/i);
});

test("fully valid success replaces cache, valid empty response is distinct, and malformed response does not", async () => {
  const target = storage();
  const live = new R.ResourceRepository("articles", { storage: target, fetch: async () => response({ items: [articleItem()] }, { headers: { etag: '"new"' } }) });
  await live.refresh({ force: true });
  assert.equal(live.state.status, "ready");
  assert.equal(R.readCache("articles", target).etag, '"new"');
  const empty = new R.ResourceRepository("articles", { storage: storage(), fetch: async () => response({ items: [] }) });
  await empty.refresh({ force: true });
  assert.equal(empty.state.status, "empty");
  const malformed = new R.ResourceRepository("articles", { storage: target, fetch: async () => response({ items: [{ title: "bad" }] }) });
  await malformed.refresh({ force: true });
  assert.equal(malformed.state.status, "cached");
  assert.equal(malformed.state.items[0].id, "article-1");
});

test("a storage quota failure does not hide a fully valid live response", async () => {
  const brokenStorage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  const repository = new R.ResourceRepository("articles", { storage: brokenStorage, fetch: async () => response({ items: [articleItem()] }) });
  await repository.refresh({ force: true });
  assert.equal(repository.state.status, "ready");
  assert.equal(repository.state.items.length, 1);
});

test("first-time request errors and timeouts produce a retryable error state", async () => {
  const repository = new R.ResourceRepository("training", { storage: storage(), timeoutMs: 5, fetch: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))) });
  await repository.refresh({ force: true });
  assert.equal(repository.state.status, "error");
  assert.match(repository.state.message, /timed out/i);
});

test("search and filters preserve native-only browsing state", () => {
  const training = R.normalizeTrainingPayload({ listings: [trainingItem()] }).items;
  assert.equal(R.filterTraining(training, { topic: "Pump Operations" }).length, 1);
  const hoses = R.normalizeHosePage(hosePage([hoseItem()], 1)).items;
  assert.equal(R.filterHose(hoses, { manufacturer: "key-hose", diameterGroup: "small", lifecycle: "current" }).length, 1);
  const articles = R.normalizeArticlesPayload({ items: [articleItem({ featured: true })] }).items;
  assert.equal(R.filterArticles(articles, { search: "Taylor", category: "Operations", contentType: "field_note", featured: true }).length, 1);
});
