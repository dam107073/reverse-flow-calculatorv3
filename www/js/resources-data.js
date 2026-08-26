(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ReverseFlowResources = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ORIGIN = "https://reverse-flow.app";
  const CACHE_VERSION = 2;
  const DEFAULT_TIMEOUT_MS = 12000;
  const MIN_REVALIDATE_MS = 60000;
  const STALE_AFTER_MS = 15 * 60 * 1000;
  const CACHE_KEYS = Object.freeze({
    training: "reverseFlowResourceCache:training:v2",
    hose: "reverseFlowResourceCache:hose:v2",
    articles: "reverseFlowResourceCache:articles:v2",
    formulas: "reverseFlowResourceCache:formulas:v2",
    quiz: "reverseFlowResourceCache:quiz:v2",
    course: "reverseFlowResourceCache:course:v2"
  });
  const ENDPOINTS = Object.freeze({
    training: `${ORIGIN}/api/training-directory/listings`,
    hose: `${ORIGIN}/api/resources/v1/libraries/hose/items?limit=100`,
    articles: `${ORIGIN}/api/resources/articles/app-summary`,
    formulas: `${ORIGIN}/api/resources/learning/formulas`,
    quiz: `${ORIGIN}/api/resources/learning/quiz`,
    course: `${ORIGIN}/api/resources/learning/course`
  });

  function text(value) { return typeof value === "string" ? value.trim() : ""; }
  function array(value) { return Array.isArray(value) ? value : []; }
  function absoluteUrl(value) {
    try { return new URL(text(value), ORIGIN).href; } catch (_error) { return ""; }
  }
  function canonicalResourceUrl(value, type) {
    try {
      const url = new URL(text(value), ORIGIN);
      const prefixes = type === "training"
        ? ["/training-directory/"]
        : type === "hose"
          ? ["/resources/hose-library/"]
          : type === "articles"
            ? ["/resources/articles/"]
            : ["/training-directory/", "/resources/hose-library/", "/resources/articles/"];
      if (url.protocol !== "https:" || url.hostname !== "reverse-flow.app" || url.port || url.username || url.password) return "";
      if (!prefixes.some(prefix => url.pathname.startsWith(prefix))) return "";
      return url.href;
    } catch (_error) { return ""; }
  }
  function safeImageUrl(value) {
    try {
      const url = new URL(text(value), ORIGIN);
      if (url.protocol !== "https:" || url.hostname !== "reverse-flow.app" || url.port || url.username || url.password) return "";
      return url.href;
    } catch (_error) { return ""; }
  }
  function optimizedArticleImageUrl(value) {
    const safe = safeImageUrl(value);
    if (!safe) return "";
    const url = new URL(safe);
    if (url.pathname.startsWith("/api/resources/article-assets/") && !url.searchParams.has("variant")) url.searchParams.set("variant", "640");
    return url.href;
  }
  function openCanonicalResourceUrl(value, type, options = {}) {
    const safeUrl = canonicalResourceUrl(value, type);
    if (!safeUrl) { if (options.onError) options.onError(); return false; }
    try {
      const opener = options.open || (typeof globalThis.open === "function" ? globalThis.open.bind(globalThis) : null);
      const opened = opener ? opener(safeUrl, "_blank", "noopener") : null;
      if (!opened) {
        const fallback = options.fallback || (globalThis.location && typeof globalThis.location.assign === "function" ? globalThis.location.assign.bind(globalThis.location) : null);
        required(fallback, "No safe browser navigation method is available.");
        fallback(safeUrl);
      }
      return true;
    } catch (_error) { if (options.onError) options.onError(); return false; }
  }
  function isoDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }
  function required(condition, message) {
    if (!condition) throw new Error(message);
  }

  function normalizeTrainingPayload(body) {
    required(body && Array.isArray(body.listings), "Training Directory response is structurally incompatible.");
    return {
      items: body.listings.map((item, index) => {
        required(item && typeof item === "object", `Training listing ${index + 1} is invalid.`);
        const id = text(item.id);
        const slug = text(item.slug);
        const title = text(item.title);
        required(id && slug && title, `Training listing ${index + 1} is missing a required field.`);
        const canonicalUrl = canonicalResourceUrl(`/training-directory/${encodeURIComponent(slug)}`, "training");
        required(canonicalUrl, `Training listing ${index + 1} has no safe canonical URL.`);
        return {
          id, slug, title,
          listingType: text(item.listingType),
          summary: text(item.appSummary) || text(item.publicProfile),
          serviceArea: text(item.serviceArea),
          statesServed: array(item.statesServed).map(text).filter(Boolean),
          deliveryType: text(item.deliveryType),
          specialties: array(item.specialties).map(text).filter(Boolean),
          logoUrl: safeImageUrl(item.logoUrl),
          canonicalUrl,
          publishedAt: isoDate(item.publishedAt)
        };
      })
    };
  }

  function normalizeHosePage(body) {
    required(body && body.schemaVersion === "resources-public-v1" && body.library === "hose", "Hose Library response version is incompatible.");
    required(Array.isArray(body.items) && body.pagination && typeof body.pagination === "object", "Hose Library response is structurally incompatible.");
    const items = body.items.map((item, index) => {
      required(item && typeof item === "object", `Hose record ${index + 1} is invalid.`);
      const id = text(item.id);
      const name = text(item.name);
      const manufacturer = text(item.manufacturer && item.manufacturer.name);
      const canonicalUrl = canonicalResourceUrl(item.canonicalPath, "hose");
      required(id && name && manufacturer && canonicalUrl, `Hose record ${index + 1} is missing a required field.`);
      const nominal = Number(item.nominalDiameter && item.nominalDiameter.value);
      return {
        id, name, manufacturer,
        manufacturerSlug: text(item.manufacturer && item.manufacturer.slug),
        displaySize: text(item.displaySize),
        nominalDiameter: Number.isFinite(nominal) ? nominal : null,
        diameterGroup: text(item.diameterGroup && item.diameterGroup.key),
        diameterGroupLabel: text(item.diameterGroup && item.diameterGroup.label),
        identityQualifier: text(item.identityQualifier),
        lifecycle: text(item.lifecycle) || "unknown",
        statusLabel: text(item.statusLabel),
        originLabel: text((item.origin || item.primaryOrigin) && (item.origin || item.primaryOrigin).label),
        verified: item.verified === true,
        specificationSummary: text(item.specificationSummary),
        canonicalUrl
      };
    });
    const total = Number(body.total);
    required(Number.isInteger(total) && total >= 0, "Hose Library total is invalid.");
    const nextCursor = body.pagination.nextCursor === null ? null : text(body.pagination.nextCursor);
    required(body.pagination.nextCursor === null || nextCursor, "Hose Library pagination cursor is invalid.");
    return {
      items, total, nextCursor,
      filters: body.availableFilters && typeof body.availableFilters === "object" ? body.availableFilters : {}
    };
  }

  function normalizeArticlesPayload(body) {
    required(body && Array.isArray(body.items), "Articles response is structurally incompatible.");
    const featuredId = text(body.featured && body.featured.id);
    return {
      items: body.items.map((item, index) => {
        required(item && typeof item === "object", `Article ${index + 1} is invalid.`);
        const id = text(item.id);
        const title = text(item.title);
        const summary = text(item.summary);
        const contentType = text(item.contentType);
        const canonicalUrl = canonicalResourceUrl(item.canonicalUrl || item.canonicalPath, "articles");
        required(id && title && summary && ["article", "field_note"].includes(contentType) && canonicalUrl, `Article ${index + 1} is missing a required field.`);
        const minutes = Number(item.readingMinutes);
        return {
          id, title, summary, contentType,
          category: text(item.category),
          authorName: text(item.author && item.author.name),
          supporterNumber: text(item.author && item.author.supporterNumber),
          publishedAt: isoDate(item.publishedAt),
          updatedAt: isoDate(item.updatedAt),
          readingMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
          coverImageUrl: optimizedArticleImageUrl(item.coverImageUrl),
          coverImageAlt: text(item.coverImageAlt) || title,
          canonicalUrl,
          featured: item.featured === true || id === featuredId
        };
      }).sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id))
    };
  }

  function normalizeFormulasPayload(body) {
    required(body && body.schemaVersion === "reverse-flow-learning-formulas-v1" && Array.isArray(body.items), "Formula Library response version is incompatible.");
    const contentVersion = text(body.contentVersion);
    const updatedAt = isoDate(body.updatedAt);
    required(contentVersion && updatedAt, "Formula Library response metadata is invalid.");
    const items = body.items.map((item, index) => {
      required(item && typeof item === "object", `Formula ${index + 1} is invalid.`);
      const normalized = {
        id: text(item.id), title: text(item.title), category: text(item.category), summary: text(item.summary),
        formula: text(item.formula), tellsYou: text(item.tellsYou), explanation: text(item.explanation),
        takeaway: text(item.takeaway), quizCategory: text(item.quizCategory), updatedAt: isoDate(item.updatedAt),
        variables: array(item.variables).map(variable => ({ symbol: text(variable && variable.symbol), meaning: text(variable && variable.meaning), units: text(variable && variable.units) })),
        example: { scenario: text(item.example && item.example.scenario), steps: array(item.example && item.example.steps).map(text).filter(Boolean), answer: text(item.example && item.example.answer) }
      };
      required(normalized.id && normalized.title && normalized.category && normalized.summary && normalized.formula && normalized.tellsYou && normalized.explanation && normalized.takeaway && normalized.quizCategory && normalized.updatedAt, `Formula ${index + 1} is missing a required field.`);
      required(normalized.variables.length && normalized.variables.every(variable => variable.symbol && variable.meaning && variable.units), `Formula ${index + 1} has invalid variables.`);
      required(normalized.example.scenario && normalized.example.steps.length && normalized.example.answer, `Formula ${index + 1} has an invalid worked example.`);
      return normalized;
    });
    required(new Set(items.map(item => item.id)).size === items.length, "Formula Library contains duplicate IDs.");
    return { items, contentVersion, updatedAt };
  }

  function normalizeQuizPayload(body) {
    required(body && body.schemaVersion === "reverse-flow-learning-quiz-v1" && Array.isArray(body.items), "Practice Quiz response version is incompatible.");
    const contentVersion = text(body.contentVersion);
    const updatedAt = isoDate(body.updatedAt);
    required(contentVersion && updatedAt, "Practice Quiz response metadata is invalid.");
    const items = body.items.map((item, index) => {
      required(item && typeof item === "object", `Quiz question ${index + 1} is invalid.`);
      const choices = array(item.choices).map(text);
      const correctIndex = Number(item.correctIndex);
      const normalized = { id: text(item.id), category: text(item.category), difficulty: text(item.difficulty), type: text(item.type), prompt: text(item.prompt), choices, correctIndex, explanation: text(item.explanation) };
      required(normalized.id && normalized.category && ["basic", "intermediate", "advanced"].includes(normalized.difficulty) && normalized.type === "concept" && normalized.prompt && normalized.explanation, `Quiz question ${index + 1} is missing a required field.`);
      required(choices.length === 4 && new Set(choices).size === 4 && Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < 4, `Quiz question ${index + 1} has invalid answers.`);
      return normalized;
    });
    required(new Set(items.map(item => item.id)).size === items.length, "Practice Quiz contains duplicate IDs.");
    return { items, contentVersion, updatedAt };
  }

  function normalizeCoursePayload(body) {
    required(body && body.schemaVersion === "reverse-flow-learning-course-v1" && body.course && Array.isArray(body.course.lessons), "Course response version is incompatible.");
    const contentVersion = text(body.contentVersion);
    const updatedAt = isoDate(body.updatedAt);
    const course = { id: text(body.course.id), title: text(body.course.title), subtitle: text(body.course.subtitle) };
    required(contentVersion && updatedAt && course.id && course.title && course.subtitle && body.course.lessons.length === 10, "Course response metadata is invalid.");
    const stepIds = new Set();
    const items = body.course.lessons.map((item, lessonIndex) => {
      required(item && typeof item === "object", `Course lesson ${lessonIndex + 1} is invalid.`);
      const lesson = { id: text(item.id), order: Number(item.order), title: text(item.title), minutes: text(item.minutes), takeaway: text(item.takeaway), steps: [] };
      required(lesson.id && lesson.order === lessonIndex + 1 && lesson.title && lesson.minutes && lesson.takeaway && Array.isArray(item.steps) && item.steps.length >= 5, `Course lesson ${lessonIndex + 1} is malformed.`);
      lesson.steps = item.steps.map((step, stepIndex) => {
        required(step && typeof step === "object", `Step ${stepIndex + 1} in lesson ${lesson.order} is invalid.`);
        const normalized = { id: text(step.id), type: text(step.type) };
        required(normalized.id && !stepIds.has(normalized.id) && ["teaching", "visual", "question", "calculation", "recap"].includes(normalized.type), `Step ${stepIndex + 1} in lesson ${lesson.order} is malformed.`);
        stepIds.add(normalized.id);
        if (normalized.type === "teaching") Object.assign(normalized, { title: text(step.title), statement: text(step.statement), body: text(step.body) });
        if (normalized.type === "visual") Object.assign(normalized, { title: text(step.title), visual: { kind: text(step.visual && step.visual.kind), description: text(step.visual && step.visual.description), labels: array(step.visual && step.visual.labels).map(text).filter(Boolean) } });
        if (normalized.type === "question") Object.assign(normalized, { prompt: text(step.prompt), choices: array(step.choices).map(text), correctIndex: Number(step.correctIndex), feedback: text(step.feedback), concept: text(step.concept), kind: text(step.kind) || "concept" });
        if (normalized.type === "calculation") Object.assign(normalized, { prompt: text(step.prompt), operation: text(step.operation), inputs: Object.fromEntries(Object.entries(step.inputs || {}).map(([key, value]) => [text(key), Number(value)])), choices: array(step.choices).map(Number), unit: text(step.unit), explanation: text(step.explanation), concept: text(step.concept) });
        if (normalized.type === "recap") Object.assign(normalized, { title: text(step.title), takeaway: text(step.takeaway) });
        if (normalized.type === "teaching") required(normalized.title && normalized.statement, `Teaching step ${normalized.id} is incomplete.`);
        if (normalized.type === "visual") required(normalized.title && normalized.visual.kind && normalized.visual.description, `Visual step ${normalized.id} is incomplete.`);
        if (normalized.type === "question") required(normalized.prompt && normalized.feedback && normalized.concept && normalized.choices.length === 4 && new Set(normalized.choices).size === 4 && Number.isInteger(normalized.correctIndex) && normalized.correctIndex >= 0 && normalized.correctIndex < 4, `Question step ${normalized.id} has invalid answers.`);
        if (normalized.type === "calculation") {
          const requiredInputs = normalized.operation === "frictionLoss" ? ["coefficient", "flowGPM", "lengthFeet"] : normalized.operation === "elevationPressure" ? ["heightFeet"] : normalized.operation === "requiredPDP" ? ["nozzlePressure"] : [];
          required(normalized.prompt && normalized.explanation && normalized.concept && requiredInputs.length && requiredInputs.every(key => Number.isFinite(normalized.inputs[key])) && Object.values(normalized.inputs).every(Number.isFinite) && normalized.choices.length === 4 && new Set(normalized.choices).size === 4 && normalized.choices.every(Number.isFinite) && normalized.unit, `Calculation step ${normalized.id} is invalid.`);
        }
        if (normalized.type === "recap") required(normalized.takeaway, `Recap step ${normalized.id} is incomplete.`);
        return normalized;
      });
      return lesson;
    });
    required(new Set(items.map(item => item.id)).size === items.length, "Course contains duplicate lesson IDs.");
    return { items, course, contentVersion, updatedAt };
  }

  function responseHeader(headers, name) {
    if (!headers) return "";
    if (typeof headers.get === "function") return text(headers.get(name));
    const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase());
    return key ? text(headers[key]) : "";
  }

  function nativeHttp() {
    try { return globalThis.Capacitor && globalThis.Capacitor.Plugins && globalThis.Capacitor.Plugins.CapacitorHttp; }
    catch (_error) { return null; }
  }

  async function withTimeout(promise, timeoutMs) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Resource request timed out.")), timeoutMs); })
      ]);
    } finally { clearTimeout(timer); }
  }

  async function requestJson(url, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    const plugin = options.http || nativeHttp();
    if (plugin && typeof plugin.get === "function") {
      const response = await withTimeout(plugin.get({ url, headers, responseType: "json" }), options.timeoutMs || DEFAULT_TIMEOUT_MS);
      if (response.status === 304) return { notModified: true, headers: response.headers || {} };
      if (response.status < 200 || response.status >= 300) throw new Error(`Resource request failed (${response.status}).`);
      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      return { data, headers: response.headers || {} };
    }
    const fetcher = options.fetch || globalThis.fetch;
    required(typeof fetcher === "function", "No network client is available.");
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS) : null;
    try {
      const response = await fetcher(url, { method: "GET", headers, cache: "no-store", signal: controller && controller.signal });
      if (response.status === 304) return { notModified: true, headers: response.headers };
      if (!response.ok) throw new Error(`Resource request failed (${response.status}).`);
      return { data: await response.json(), headers: response.headers };
    } catch (error) {
      if (error && error.name === "AbortError") throw new Error("Resource request timed out.");
      throw error;
    } finally { if (timer) clearTimeout(timer); }
  }

  function conditionalHeaders(cache) {
    if (!cache) return {};
    if (cache.etag) return { "If-None-Match": cache.etag };
    if (cache.lastModified) return { "If-Modified-Since": cache.lastModified };
    return {};
  }

  async function fetchCompleteResource(type, cache, options = {}) {
    const first = await requestJson(ENDPOINTS[type], { ...options, headers: conditionalHeaders(cache) });
    if (first.notModified) return { notModified: true };
    let data;
    if (type === "training") data = normalizeTrainingPayload(first.data);
    if (type === "articles") data = normalizeArticlesPayload(first.data);
    if (type === "formulas") data = normalizeFormulasPayload(first.data);
    if (type === "quiz") data = normalizeQuizPayload(first.data);
    if (type === "course") data = normalizeCoursePayload(first.data);
    if (type === "hose") {
      const initial = normalizeHosePage(first.data);
      const byId = new Map(initial.items.map(item => [item.id, item]));
      let nextCursor = initial.nextCursor;
      let pages = 1;
      while (nextCursor) {
        required(pages < 20, "Hose Library pagination exceeded its safe limit.");
        const pageUrl = `${ENDPOINTS.hose}&cursor=${encodeURIComponent(nextCursor)}`;
        const response = await requestJson(pageUrl, options);
        const page = normalizeHosePage(response.data);
        required(page.total === initial.total, "Hose Library changed during pagination; refresh again.");
        for (const item of page.items) byId.set(item.id, item);
        nextCursor = page.nextCursor;
        pages += 1;
      }
      required(byId.size === initial.total, "Hose Library response was partial.");
      data = { items: [...byId.values()], filters: initial.filters, total: initial.total };
    }
    return {
      data,
      etag: responseHeader(first.headers, "etag"),
      lastModified: responseHeader(first.headers, "last-modified")
    };
  }

  function memoryStorage() {
    const values = new Map();
    return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  }
  function storageOrFallback(storage) {
    if (storage) return storage;
    try { if (globalThis.localStorage) return globalThis.localStorage; } catch (_error) {}
    return memoryStorage();
  }
  function validCachedData(type, data) {
    if (!data || !Array.isArray(data.items)) return false;
    if (type === "hose" && (!Number.isInteger(data.total) || data.total !== data.items.length)) return false;
    return data.items.every(item => {
      if (!item || !text(item.id)) return false;
      if (["formulas", "quiz", "course"].includes(type)) {
        if (type === "formulas") return !!(text(item.title) && text(item.formula) && text(item.quizCategory));
        if (type === "quiz") return !!(text(item.prompt) && item.type === "concept" && Array.isArray(item.choices) && item.choices.length === 4 && Number.isInteger(item.correctIndex));
        return !!(text(item.title) && Number.isInteger(item.order) && Array.isArray(item.steps) && item.steps.length >= 5);
      }
      if (!canonicalResourceUrl(item.canonicalUrl, type)) return false;
      if (type === "training") return !!text(item.title);
      if (type === "hose") return !!(text(item.name) && text(item.manufacturer));
      return !!(text(item.title) && text(item.summary) && ["article", "field_note"].includes(item.contentType));
    });
  }
  function readCache(type, storage) {
    try {
      const parsed = JSON.parse(storageOrFallback(storage).getItem(CACHE_KEYS[type]) || "null");
      if (!parsed || parsed.version !== CACHE_VERSION || parsed.type !== type || !validCachedData(type, parsed.data) || !isoDate(parsed.fetchedAt)) return null;
      return parsed;
    } catch (_error) { return null; }
  }
  function writeCache(type, value, storage) {
    const payload = { version: CACHE_VERSION, type, fetchedAt: new Date().toISOString(), etag: value.etag || "", lastModified: value.lastModified || "", data: value.data };
    try { storageOrFallback(storage).setItem(CACHE_KEYS[type], JSON.stringify(payload)); }
    catch (_error) { /* Persistence is best-effort; valid live data still renders. */ }
    return payload;
  }

  class ResourceRepository {
    constructor(type, options = {}) {
      required(Object.prototype.hasOwnProperty.call(ENDPOINTS, type), "Unknown resource type.");
      this.type = type;
      this.options = options;
      this.storage = storageOrFallback(options.storage);
      this.listeners = new Set();
      this.lastAttemptAt = 0;
      this.cache = readCache(type, this.storage);
      this.state = this.cache
        ? { status: this.cache.data.items.length ? "cached" : "empty", items: this.cache.data.items, data: this.cache.data, fetchedAt: this.cache.fetchedAt, refreshing: false, stale: Date.now() - new Date(this.cache.fetchedAt).getTime() > STALE_AFTER_MS, message: "" }
        : { status: "idle", items: [], data: null, fetchedAt: "", refreshing: false, stale: false, message: "" };
    }
    subscribe(listener) { this.listeners.add(listener); listener(this.state); return () => this.listeners.delete(listener); }
    emit(next) { this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener(this.state)); }
    async refresh(options = {}) {
      const now = Date.now();
      if (!options.force && now - this.lastAttemptAt < MIN_REVALIDATE_MS) return this.state;
      this.lastAttemptAt = now;
      this.emit(this.cache ? { refreshing: true, message: "" } : { status: "loading", refreshing: true, message: "" });
      try {
        const result = await fetchCompleteResource(this.type, this.cache, this.options);
        if (result.notModified) {
          this.cache = writeCache(this.type, { data: this.cache.data, etag: this.cache.etag, lastModified: this.cache.lastModified }, this.storage);
        } else {
          this.cache = writeCache(this.type, result, this.storage);
        }
        const items = this.cache.data.items;
        this.emit({ status: items.length ? "ready" : "empty", items, data: this.cache.data, fetchedAt: this.cache.fetchedAt, refreshing: false, stale: false, message: "" });
      } catch (error) {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        this.emit(this.cache
          ? { status: "cached", refreshing: false, stale: true, message: offline ? "Offline — showing saved results." : "Could not refresh — showing saved results." }
          : { status: offline ? "offline" : "error", refreshing: false, message: offline ? "Connect to the internet to load this resource for the first time." : text(error && error.message) || "This resource could not be loaded." });
      }
      return this.state;
    }
  }

  function filterTraining(items, filters = {}) {
    const q = text(filters.search).toLowerCase();
    return items.filter(item => (!q || [item.title, item.summary, item.serviceArea, ...item.specialties].join(" ").toLowerCase().includes(q))
      && (!filters.topic || item.specialties.includes(filters.topic))
      && (!filters.location || item.statesServed.includes(filters.location) || item.serviceArea === filters.location));
  }
  function filterHose(items, filters = {}) {
    const q = text(filters.search).toLowerCase();
    const filtered = items.filter(item => (!q || [item.manufacturer, item.name, item.displaySize, item.identityQualifier].join(" ").toLowerCase().includes(q))
      && (!filters.manufacturer || item.manufacturerSlug === filters.manufacturer)
      && (!filters.diameterGroup || item.diameterGroup === filters.diameterGroup)
      && (!filters.diameter || String(item.nominalDiameter) === String(filters.diameter))
      && (!filters.lifecycle || item.lifecycle === filters.lifecycle));
    return filtered.sort((a, b) => filters.sort === "diameter" ? a.nominalDiameter - b.nominalDiameter || a.name.localeCompare(b.name) : filters.sort === "product" ? a.name.localeCompare(b.name) || a.manufacturer.localeCompare(b.manufacturer) : a.manufacturer.localeCompare(b.manufacturer) || a.nominalDiameter - b.nominalDiameter || a.name.localeCompare(b.name));
  }
  function filterArticles(items, filters = {}) {
    const q = text(filters.search).toLowerCase();
    return items.filter(item => (!q || [item.title, item.summary, item.category, item.authorName].join(" ").toLowerCase().includes(q))
      && (!filters.category || item.category === filters.category)
      && (!filters.contentType || item.contentType === filters.contentType)
      && (!filters.featured || item.featured));
  }

  return { CACHE_KEYS, CACHE_VERSION, ENDPOINTS, MIN_REVALIDATE_MS, STALE_AFTER_MS, ResourceRepository, canonicalResourceUrl, fetchCompleteResource, filterArticles, filterHose, filterTraining, normalizeArticlesPayload, normalizeCoursePayload, normalizeFormulasPayload, normalizeHosePage, normalizeQuizPayload, normalizeTrainingPayload, openCanonicalResourceUrl, readCache, requestJson, safeImageUrl, writeCache };
});
