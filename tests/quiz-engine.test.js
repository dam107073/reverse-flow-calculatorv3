const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../www/js/hydraulics-core");
const Q = require("../www/js/quiz-engine");
const concepts = Q.CATEGORIES.filter(item=>item.id!=="all").flatMap(({id:category})=>Q.DIFFICULTIES.map(difficulty=>({id:`${category}-${difficulty}`,category,difficulty,type:"concept",prompt:`What is the ${category} ${difficulty} concept?`,choices:["Correct","Plausible A","Plausible B","Plausible C"],correctIndex:0,explanation:"A clear concept explanation."})));

test("every category and difficulty generates deterministic 5, 10, and 20 question sessions", () => {
  for (const category of Q.CATEGORIES.map(item => item.id)) for (const difficulty of Q.DIFFICULTIES) for (const count of [5, 10, 20]) {
    const first=Q.createSession({concepts,category,difficulty,count,seed:1201});
    const second=Q.createSession({concepts,category,difficulty,count,seed:1201});
    assert.equal(first.questions.length,count,`${category}/${difficulty}/${count}`);
    assert.deepEqual(first.questions,second.questions);
    assert.equal(new Set(first.questions.map(question=>question.id)).size,count);
    for(const question of first.questions){assert.equal(question.choices.length,4);assert.equal(new Set(question.choices).size,4);assert.ok(question.correctIndex>=0&&question.correctIndex<4);assert.equal(question.choices.filter(choice=>choice===question.correctText).length,1);assert.ok(question.explanation);}
  }
});

test("answer order is shuffled across seeds", () => {
  const positions=new Set();
  for(let seed=1;seed<=30;seed+=1)positions.add(Q.createSession({concepts,category:"friction-loss",difficulty:"basic",count:5,seed}).questions[0].correctIndex);
  assert.ok(positions.size>=3);
});

test("scoring, missed review data, and regenerated retry work", () => {
  let session=Q.createSession({concepts,category:"all",difficulty:"intermediate",count:5,seed:44});
  for(let i=0;i<session.questions.length;i+=1){const question=session.questions[session.currentIndex];const choice=i<3?question.correctIndex:(question.correctIndex+1)%4;session=Q.answerQuestion(session,choice);session=Q.nextQuestion(session);}
  const score=Q.scoreSession(session);assert.equal(score.correct,3);assert.equal(score.missed.length,2);assert.equal(score.percentage,60);assert.equal(session.completed,true);
  const retry=Q.createRetrySession(session,concepts,45);assert.equal(retry.questions.length,5);assert.notEqual(retry.id,session.id);assert.equal(new Set(retry.questions.map(item=>item.id)).size,5);
});

test("calculation templates call canonical helpers and produce realistic unique rounded answers", () => {
  const expectedHelper={"fl-one-step":"frictionLoss","pdp-full":"requiredPDP","smoothbore-flow":"smoothboreFlow","smoothbore-reaction":"smoothboreReaction","fog-reaction":"fogReaction","elevation-feet":"elevationPressure","relay-pdp":"frictionLoss","standpipe-floor":"standpipeElevationPressure","standpipe-full":"standpipeElevationPressure","tank-time":"tankTimeSeconds","water-velocity":"waterVelocity","remaining-supply":"estimatedSupply"};
  for(const template of Q.calculationTemplates){let calls=0;const name=expectedHelper[template.id],original=H[name];H[name]=function(...args){calls+=1;return original.apply(this,args);};try{for(let seed=1;seed<=100;seed+=1){calls=0;const question=template.generate(Q.createRng(seed));assert.ok(calls>0,`${template.id} did not use ${name}`);assert.equal(question.choices.length,4);assert.equal(new Set(question.choices).size,4);assert.equal(question.choices.filter(choice=>choice===question.choices[question.correctIndex]).length,1);assert.match(question.choices[question.correctIndex],/(PSI|GPM|lb|ft\/sec|min)/);assert.doesNotMatch(question.prompt,/undefined|NaN|Infinity/);}}finally{H[name]=original;}}
});

test("invalid setup is rejected cleanly", () => {
  assert.throws(()=>Q.createSession({category:"bogus"}),/category/);
  assert.throws(()=>Q.createSession({difficulty:"expert"}),/difficulty/);
  assert.throws(()=>Q.createSession({count:7}),/5, 10, or 20/);
});
