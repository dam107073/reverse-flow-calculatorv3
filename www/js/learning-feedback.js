(function (root, factory) {
  const api = factory(root || {});
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReverseFlowLearningFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SOUND_KEY = "reverse-flow-learning-sounds-v1";
  const EVENT_TYPES = new Set(["selection", "correct", "incorrect", "lesson-complete", "course-complete"]);

  function availableStorage(globalObject = root) {
    try { return globalObject.localStorage || null; } catch (_error) { return null; }
  }
  function soundEnabled(storage = availableStorage()) {
    try { return !storage || storage.getItem(SOUND_KEY) !== "off"; } catch (_error) { return true; }
  }
  function setSoundEnabled(enabled, storage = availableStorage()) {
    try { storage?.setItem(SOUND_KEY, enabled ? "on" : "off"); } catch (_error) {}
    return Boolean(enabled);
  }
  function reducedMotion(globalObject = root) {
    try { return Boolean(globalObject.matchMedia && globalObject.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_error) { return false; }
  }

  function createController(options = {}) {
    const globalObject = options.globalObject || root;
    const documentObject = options.document || globalObject.document || null;
    const storage = options.storage === undefined ? availableStorage(globalObject) : options.storage;
    const firedEvents = new Set();
    const particles = new Set();
    const timers = new Set();
    let audioContext = null;
    let activeOscillators = [];
    let registeredHaptics;

    function getHaptics() {
      if (options.haptics !== undefined) return options.haptics;
      if (registeredHaptics !== undefined) return registeredHaptics;
      try {
        const capacitor = globalObject.Capacitor;
        registeredHaptics = capacitor?.Plugins?.Haptics || (typeof capacitor?.registerPlugin === "function" ? capacitor.registerPlugin("Haptics") : null);
      } catch (_error) { registeredHaptics = null; }
      return registeredHaptics;
    }

    function fallbackVibration(type) {
      const vibrate = globalObject.navigator && globalObject.navigator.vibrate;
      if (typeof vibrate !== "function") return false;
      const patterns = { selection: 12, correct: [24, 38, 18], incorrect: [22, 38, 32], "lesson-complete": [30, 45, 45], "course-complete": [35, 45, 55, 55, 75] };
      vibrate.call(globalObject.navigator, patterns[type]);
      return true;
    }

    async function performHaptic(type) {
      if (typeof options.performHaptic === "function") return options.performHaptic(type);
      try {
        const haptics = getHaptics();
        if (!haptics) return fallbackVibration(type);
        if (type === "selection") await haptics.impact({ style: "LIGHT" });
        else if (type === "incorrect") await haptics.notification({ type: "WARNING" });
        else if (type === "lesson-complete") await haptics.impact({ style: "MEDIUM" });
        else if (type === "course-complete") await haptics.impact({ style: "HEAVY" });
        else await haptics.notification({ type: "SUCCESS" });
        return true;
      } catch (_error) { return fallbackVibration(type); }
    }

    function stopAudio() {
      activeOscillators.forEach(oscillator => { try { oscillator.stop(); } catch (_error) {} });
      activeOscillators = [];
      if (typeof options.stopSound === "function") options.stopSound();
    }

    function playTone(type) {
      if (typeof options.playSound === "function") return options.playSound(type);
      const AudioContext = globalObject.AudioContext || globalObject.webkitAudioContext;
      if (!AudioContext) return false;
      stopAudio();
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const notes = {
        correct: [[620, .08, 0], [820, .09, .07]],
        incorrect: [[260, .11, 0]],
        "lesson-complete": [[520, .09, 0], [700, .11, .08]],
        "course-complete": [[440, .09, 0], [620, .11, .08], [820, .16, .17]]
      }[type] || [];
      const startedAt = audioContext.currentTime;
      notes.forEach(([frequency, duration, delay]) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, startedAt + delay);
        gain.gain.exponentialRampToValueAtTime(.055, startedAt + delay + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, startedAt + delay + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(startedAt + delay);
        oscillator.stop(startedAt + delay + duration + .015);
        activeOscillators.push(oscillator);
      });
      return notes.length > 0;
    }

    function burst(_target, level) {
      if (typeof options.burst === "function") return options.burst(null, level);
      const host = documentObject && (documentObject.body || documentObject.documentElement);
      if (!host || typeof host.append !== "function") return false;
      const count = level === "course" ? 40 : level === "lesson" ? 28 : 18;
      const layer = documentObject.createElement("span");
      layer.className = `course-confetti course-confetti-${level}`;
      layer.setAttribute("aria-hidden", "true");
      for (let index = 0; index < count; index += 1) {
        const particle = documentObject.createElement("i");
        const angle = (Math.PI * 2 * index / count) + ((index % 3) * .09);
        const distance = 55 + (index % 6) * 12 + (level === "course" ? 25 : level === "lesson" ? 10 : 0);
        particle.style.setProperty("--confetti-x", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--confetti-y", `${Math.sin(angle) * distance}px`);
        particle.style.setProperty("--confetti-delay", `${(index % 5) * 16}ms`);
        particle.style.setProperty("--confetti-color", ["#f97316", "#facc15", "#2563eb", "#22c55e", "#ef4444", "#a855f7"][index % 6]);
        layer.append(particle);
      }
      host.append(layer);
      particles.add(layer);
      const timer = globalObject.setTimeout(() => { particles.delete(layer); layer.remove(); timers.delete(timer); }, level === "course" ? 1300 : level === "lesson" ? 1150 : 980);
      timers.add(timer);
      return true;
    }

    function animate(target, type) {
      if (!target || reducedMotion(globalObject)) return false;
      const animated = type === "correct" ? target.querySelector?.(".course-feedback-mark") : target;
      if (!animated || !animated.classList) return false;
      animated.classList.add(type === "correct" ? "is-new-success" : "is-new-completion");
      return true;
    }

    function fire(type, eventId, target) {
      if (!EVENT_TYPES.has(type) || !eventId || firedEvents.has(eventId)) return { fired: false, haptic: false, sound: false, confetti: false, animated: false };
      firedEvents.add(eventId);
      Promise.resolve(performHaptic(type)).catch(() => {});
      const sound = type !== "selection" && soundEnabled(storage) ? Boolean(playTone(type)) : false;
      const motionAllowed = !reducedMotion(globalObject);
      const level = type === "correct" ? "answer" : type === "lesson-complete" ? "lesson" : type === "course-complete" ? "course" : "";
      const confetti = Boolean(level && motionAllowed && burst(target, level));
      const animated = Boolean(motionAllowed && ["correct", "lesson-complete", "course-complete"].includes(type) && animate(target, type));
      return { fired: true, haptic: true, sound, confetti, animated };
    }

    function cleanup() {
      stopAudio();
      timers.forEach(timer => globalObject.clearTimeout?.(timer));
      timers.clear();
      particles.forEach(particle => particle.remove());
      particles.clear();
    }
    function resetEvents() { firedEvents.clear(); cleanup(); }
    return { cleanup, fire, isReducedMotion: () => reducedMotion(globalObject), isSoundEnabled: () => soundEnabled(storage), resetEvents, setSoundEnabled: enabled => setSoundEnabled(enabled, storage) };
  }

  function bindSoundSetting(documentObject = root.document, storage = availableStorage()) {
    const control = documentObject && documentObject.querySelector("[data-learning-sounds]");
    if (!control || control.dataset.learningSoundsBound === "true") return false;
    control.dataset.learningSoundsBound = "true";
    control.checked = soundEnabled(storage);
    control.addEventListener("change", () => setSoundEnabled(control.checked, storage));
    return true;
  }

  if (root.document) {
    const bind = () => bindSoundSetting(root.document);
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
  }

  return { SOUND_KEY, bindSoundSetting, createController, reducedMotion, setSoundEnabled, soundEnabled };
});
