const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../www/js/learning-feedback");

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem:key => values.has(key) ? values.get(key) : null, setItem:(key,value) => values.set(key,String(value)) };
}

test("correct and incorrect answer effects fire once per genuine event", () => {
  const haptics = [], sounds = [], bursts = [];
  const controller = F.createController({ storage:storage(), performHaptic:type => haptics.push(type), playSound:type => { sounds.push(type); return true; }, burst:(_target,level) => { bursts.push(level); return true; }, globalObject:{ matchMedia:()=>({matches:false}) } });
  assert.deepEqual(controller.fire("correct", "answer:q1", null), { fired:true, haptic:true, sound:true, confetti:true, animated:false });
  assert.equal(controller.fire("correct", "answer:q1", null).fired, false);
  assert.equal(controller.fire("incorrect", "answer:q2", null).confetti, false);
  assert.equal(controller.fire("incorrect", "answer:q2", null).fired, false);
  assert.deepEqual(haptics, ["correct", "incorrect"]);
  assert.deepEqual(sounds, ["correct", "incorrect"]);
  assert.deepEqual(bursts, ["answer"]);
});

test("lesson and course completion effects remain idempotent", () => {
  const events = [];
  const controller = F.createController({ storage:storage(), performHaptic:type => events.push(`h:${type}`), playSound:type => { events.push(`s:${type}`); return true; }, burst:(_target,level) => { events.push(`c:${level}`); return true; }, globalObject:{ matchMedia:()=>({matches:false}) } });
  assert.equal(controller.fire("lesson-complete", "lesson:one", null).fired, true);
  assert.equal(controller.fire("lesson-complete", "lesson:one", null).fired, false);
  assert.equal(controller.fire("course-complete", "course:basics", null).fired, true);
  assert.equal(controller.fire("course-complete", "course:basics", null).fired, false);
  assert.deepEqual(events, ["h:lesson-complete", "s:lesson-complete", "c:lesson", "h:course-complete", "s:course-complete", "c:course"]);
});

test("answer and completion confetti use a viewport layer instead of the answer geometry", () => {
  const makeNode = () => ({ children:[], className:"", style:{ setProperty(){} }, classList:{ add(){} }, append(...items){ this.children.push(...items); }, setAttribute(){}, remove(){ this.removed = true; } });
  const body = makeNode();
  const document = { body, createElement:() => makeNode() };
  const globalObject = { document, matchMedia:()=>({matches:false}), setTimeout:()=>1, clearTimeout(){} };
  const answer = { append(){ throw new Error("confetti must not attach to the answer"); }, getBoundingClientRect(){ throw new Error("answer bounds must not set the origin"); }, querySelector:()=>null };
  const controller = F.createController({ storage:storage({[F.SOUND_KEY]:"off"}), document, globalObject, performHaptic:()=>true });
  assert.equal(controller.fire("correct", "answer:centered", answer).confetti, true);
  assert.equal(controller.fire("lesson-complete", "lesson:centered", answer).confetti, true);
  assert.equal(controller.fire("course-complete", "course:centered", answer).confetti, true);
  assert.deepEqual(body.children.map(item => item.className), ["course-confetti course-confetti-answer", "course-confetti course-confetti-lesson", "course-confetti course-confetti-course"]);
  controller.cleanup();
  assert.ok(body.children.every(item => item.removed));
});

test("sound preference is local, defaults on, and suppresses only sound", () => {
  const targetStorage = storage();
  assert.equal(F.soundEnabled(targetStorage), true);
  F.setSoundEnabled(false, targetStorage);
  assert.equal(F.soundEnabled(targetStorage), false);
  const events = [];
  const controller = F.createController({ storage:targetStorage, performHaptic:type => events.push(type), playSound:() => { throw new Error("sound must remain disabled"); }, burst:() => true, globalObject:{ matchMedia:()=>({matches:false}) } });
  const result = controller.fire("correct", "answer:q1", null);
  assert.equal(result.sound, false);
  assert.equal(result.haptic, true);
  assert.equal(result.confetti, true);
  assert.deepEqual(events, ["correct"]);
});

test("reduced motion disables confetti and animation without removing sound or haptics", () => {
  const events = [];
  const target = { querySelector:() => ({ classList:{ add:() => events.push("animation") } }), classList:{ add:() => events.push("target-animation") } };
  const controller = F.createController({ storage:storage(), performHaptic:type => events.push(`h:${type}`), playSound:type => { events.push(`s:${type}`); return true; }, burst:() => { events.push("confetti"); return true; }, globalObject:{ matchMedia:()=>({matches:true}) } });
  const result = controller.fire("correct", "answer:q1", target);
  assert.deepEqual(result, { fired:true, haptic:true, sound:true, confetti:false, animated:false });
  assert.deepEqual(events, ["h:correct", "s:correct"]);
});

test("unsupported native haptics fail safely", async () => {
  const controller = F.createController({ storage:storage({[F.SOUND_KEY]:"off"}), haptics:{ notification:async()=>{ throw new Error("unsupported"); } }, globalObject:{ navigator:{}, matchMedia:()=>({matches:false}) } });
  assert.doesNotThrow(() => controller.fire("correct", "answer:q1", null));
  await Promise.resolve();
});
