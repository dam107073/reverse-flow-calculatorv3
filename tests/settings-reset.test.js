const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../www', file), 'utf8');
const source = read('js/app.js');

function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1);
  const body = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let i = body; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error(`Missing function ${name}`);
}

class Element {
  constructor() { this.listeners = {}; this.dataset = {}; this.children = {}; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type, detail = {}) {
    for (const callback of this.listeners[type] || []) {
      callback({ target: this, preventDefault() {}, ...detail });
    }
  }
  querySelector(selector) { return this.children[selector] ||= new Element(); }
  setAttribute() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatch('close'); }
  remove() { this.removed = true; }
  getBoundingClientRect() { return { left: 10, right: 100, top: 10, bottom: 100 }; }
}

function harness(calculator = false) {
  const values = new Map();
  const writes = [];
  const dialogs = [];
  const button = new Element();
  button.dataset.coefficientReset = '1.75';
  const context = vm.createContext({
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { writes.push(key); values.set(key, value); },
      removeItem: key => { writes.push(key); values.delete(key); }
    },
    document: {
      getElementById: id => dialogs.find(d => d.id === id && !d.removed),
      createElement: () => new Element(),
      body: { appendChild: dialog => dialogs.push(dialog) }
    },
    els: {
      calculatorView: calculator ? {} : null,
      customCoefficient: { value: '17' },
      defaultHoseCoefficientsList: {
        querySelectorAll: selector => selector === '[data-coefficient-reset]' ? [button] : []
      }
    },
    state: { hoseSize: '1.75', hoseLength: '777', useCustomCoefficient: true, customCoefficient: '17' },
    alert() {},
    getSessionActiveMode: () => 'reverse',
    normalizeStateNozzleTypes: state => state,
    getCoefficientSettingsHoseOptions: () => [{ id: '1.75', label: '1.75"' }],
    getModeHoseOptions: () => [],
    getSupplyHoseOptions: () => [],
    getHandlineSmoothboreTipOptions: () => [],
    resolveVisibleHoseDefault: id => id,
    resolveVisibleSmoothboreTipDefault: id => id,
    getVisibleDefaultSplitLayState: () => ({}),
    getVisibleDefaultStandpipeOpsState: () => ({}),
    getVisibleDefaultWyeOpsState: () => ({})
  });
  for (const name of ['renderHoseLibrary', 'renderDefaultHoseSelections', 'renderDefaultHoseCoefficients',
    'clearPumpChartEditState', 'populateHoseOptions', 'syncInputsFromState', 'resetSplitLayInputs',
    'syncStandpipeInputsFromState', 'rerenderWyeOpsFields', 'resetStandpipeResults',
    'renderPressureButtons', 'calculateAndRender', 'scrollCalculatorPageToTop']) context[name] = () => {};
  vm.runInContext(read('js/constants.js') + '\n' + read('js/data/hydraulics.js') + '\n' + source.slice(source.indexOf('const DEFAULT_STATE ='), source.indexOf('};', source.indexOf('const DEFAULT_STATE =')) + 2), context);
  vm.runInContext(['confirmSettingsReset', 'bindDefaultHoseCoefficientEvents',
    'requestHoseCoefficientsReset', 'requestCalculatorReset', 'resetCalculator', 'saveState', 'loadState']
    .map(extract).join('\n'), context);
  context.refreshCoefficientDisplays = () => { if (calculator) context.saveState(); };
  vm.runInContext(`
    saveHoseCoefficient('1.75', 17);
    saveHoseCoefficient('2.5', 3);
    localStorage.setItem(VISIBLE_HOSE_SIZES_KEY, '["1.75","2.5"]');
    localStorage.setItem(VISIBLE_SMOOTHBORE_TIPS_KEY, '["7/8"]');
    localStorage.setItem(DEFAULT_HOSE_PROFILES_KEY, '{"1.75":{"id":"department-hose"}}');
    localStorage.setItem(CUSTOM_HOSE_PROFILES_KEY, '[{"id":"department-hose"}]');
    localStorage.setItem(PUMP_CHARTS_KEY, '{"charts":[{"id":"engine"}]}');
    localStorage.setItem(APPEARANCE_PREFERENCE_KEY, 'dark');
    saveState();
  `, context);
  writes.length = 0;
  context.bindDefaultHoseCoefficientEvents();
  return { context, values, writes, dialogs, button, snapshot: () => JSON.stringify([...values]) };
}

const routes = {
  individual: h => h.button.dispatch('click'),
  allTools: h => h.context.requestHoseCoefficientsReset(),
  allCalculator: h => h.context.requestHoseCoefficientsReset(),
  calculator: h => h.context.requestCalculatorReset()
};
const dismissals = {
  Cancel: dialog => dialog.querySelector('[data-reset-cancel]').dispatch('click'),
  'platform cancel / Escape': dialog => dialog.dispatch('cancel'),
  'platform close': dialog => dialog.close(),
  backdrop: dialog => dialog.dispatch('click', { clientX: 0, clientY: 0 })
};

for (const [route, open] of Object.entries(routes)) {
  for (const [name, dismiss] of Object.entries(dismissals)) {
    test(`${route}: opening and ${name} preserve every persisted byte`, () => {
      const h = harness(route.includes('Calculator') || route === 'calculator');
      const before = h.snapshot();
      const state = JSON.stringify(h.context.state);
      open(h);
      assert.equal(h.snapshot(), before);
      assert.deepEqual(h.writes, []);
      assert.equal(h.dialogs[0].open, true);
      dismiss(h.dialogs[0]);
      // A queued click on a dismissed confirmation cannot reset anything.
      h.dialogs[0].querySelector('[data-reset-confirm]').dispatch('click');
      assert.equal(h.snapshot(), before);
      assert.equal(JSON.stringify(h.context.state), state);
      assert.deepEqual(h.writes, []);
    });
  }
  test(`${route}: explicit confirmation resets once and preserves unrelated storage on reload`, () => {
    const h = harness(route.includes('Calculator') || route === 'calculator');
    const before = new Map(h.values);
    open(h);
    open(h);
    assert.equal(h.dialogs.length, 1, 'repeated activation must not stack dialogs');
    const confirm = h.dialogs[0].querySelector('[data-reset-confirm]');
    confirm.dispatch('click');
    const after = h.snapshot();
    confirm.dispatch('click');
    h.dialogs[0].dispatch('close');
    assert.equal(h.snapshot(), after);
    const coefficientKey = vm.runInContext('HOSE_COEFFS_KEY', h.context);
    const stateKey = vm.runInContext('STORAGE_KEY', h.context);
    const changedKey = route === 'calculator' ? stateKey : coefficientKey;
    assert.equal(h.writes.filter(key => key === changedKey).length, 1);
    for (const [key, value] of before) {
      if (key === changedKey || (route === 'allCalculator' && key === stateKey)) continue;
      assert.equal(h.values.get(key), value, `${key} remains untouched`);
    }
    // Reload the real persistence functions against the resulting storage.
    const reload = vm.createContext({ localStorage: h.context.localStorage });
    vm.runInContext(read('js/constants.js') + '\n' + read('js/data/hydraulics.js'), reload);
    if (route === 'calculator') {
      const expected = vm.runInContext('DEFAULT_STATE.hoseLength', h.context);
      assert.equal(h.context.loadState().hoseLength, expected);
      assert.equal(vm.runInContext('getActiveHoseCoefficient("1.75")', reload), 17);
    } else {
      assert.equal(vm.runInContext('getActiveHoseCoefficient("1.75")', reload), 15.5);
      assert.equal(vm.runInContext('getActiveHoseCoefficient("2.5")', reload), route === 'individual' ? 3 : 2);
      if (route === 'allCalculator') {
        assert.equal(h.context.loadState().useCustomCoefficient, false);
        assert.equal(h.context.loadState().customCoefficient, '');
      }
    }
  });
}

test('reset buttons bind only to guarded entry points', () => {
  assert.equal((source.match(/addEventListener\("click", requestHoseCoefficientsReset\)/g) || []).length, 2);
  assert.match(source, /els\.resetButton\.addEventListener\("click", requestCalculatorReset\)/);
  assert.doesNotMatch(source, /addEventListener\("click", resetCalculator\)/);
  const dialog = extract('confirmSettingsReset');
  assert.match(dialog, /Reset to Defaults\?/);
  assert.match(dialog, /data-reset-cancel autofocus>Cancel/);
  assert.match(dialog, /data-reset-confirm>Reset to Defaults/);
});

test('older WebViews use the existing native confirmation and never reset on refusal', () => {
  for (const answer of [false, true]) {
    const h = harness();
    h.context.document.createElement = () => ({ showModal: undefined });
    let prompts = 0;
    h.context.confirm = message => {
      prompts++;
      assert.equal(h.writes.length, 0);
      assert.match(message, /^Reset to Defaults\?/);
      return answer;
    };
    h.context.requestHoseCoefficientsReset();
    assert.equal(prompts, 1);
    assert.equal(h.writes.length, answer ? 1 : 0);
  }
});
