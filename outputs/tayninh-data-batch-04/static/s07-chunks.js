(function (global) {
  "use strict";
  const VERSION = "s07-chunks.1";
  function finite(n) { return Number.isFinite(Number(n)); }
  function boundsOf(points) { return points.reduce((a, p) => ({ west: Math.min(a.west, p.x), east: Math.max(a.east, p.x), south: Math.min(a.south, p.z), north: Math.max(a.north, p.z) }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }); }
  function centroid(points) { const n = Math.max(1, points.length); return points.reduce((a, p) => ({ x: a.x + p.x / n, z: a.z + p.z / n }), { x: 0, z: 0 }); }
  function points(feature) { return (feature.footprint_local_m || []).map(p => ({ x: Number(p.x), z: Number(p.z) })).filter(p => finite(p.x) && finite(p.z)); }
  function intersects(a, b) { return !!a && !!b && a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south; }
  function expand(b, m) { return { west: b.west - m, east: b.east + m, south: b.south - m, north: b.north + m }; }
  function centerOf(b) { return { x: (b.west + b.east) / 2, z: (b.south + b.north) / 2 }; }
  function deriveFocusBounds(features, manifest, fallbackId) {
    const roi = manifest?.roi_250m || manifest?.sample || null;
    const explicit = roi?.bounds_scene_m || manifest?.sample_bounds_scene_m || manifest?.bounds_scene_m || manifest?.bounds;
    if (explicit) {
      const b = Array.isArray(explicit) ? { west: explicit[0], south: explicit[1], east: explicit[2], north: explicit[3] } : explicit;
      if ([b.west, b.east, b.south, b.north].every(finite)) return { ...b, source: manifest ? "manifest_roi_250m" : "explicit", focusId: roi?.center_target_id || manifest?.focus_id };
    }
    const focusId = roi?.center_target_id || manifest?.focus_id || fallbackId || "msft_0615";
    const f = features.find(v => v.id === focusId) || features[0];
    const c = f?.centroid || { x: 0, z: 0 };
    return { west: c.x - 125, east: c.x + 125, south: c.z - 125, north: c.z + 125, source: "fallback_from_current_scene", focusId };
  }
  function descriptor(feature) { const pts = points(feature), b = boundsOf(pts), c = centroid(pts); return { id: String(feature.id), points: pts, bbox: b, centroid: c }; }
  function syncPartition(features, sampleBounds, cellSizeM, manifest) {
    const roi = manifest?.roi_250m || manifest?.sample || null;
    const centroidSet = Array.isArray(roi?.centroid_member_ids) ? new Set(roi.centroid_member_ids.map(String)) : null;
    const querySet = Array.isArray(roi?.footprint_intersection_ids) ? new Set(roi.footprint_intersection_ids.map(String)) : null;
    const sample = features.filter(f => centroidSet ? centroidSet.has(f.id) : intersects(f.bbox, sampleBounds));
    const query = features.filter(f => querySet ? querySet.has(f.id) : intersects(f.bbox, sampleBounds));
    const cells = new Map();
    for (const f of sample) {
      const col = Math.floor((f.centroid.x - sampleBounds.west) / cellSizeM), row = Math.floor((f.centroid.z - sampleBounds.south) / cellSizeM);
      const id = `c${col}_${row}`;
      const bounds = { west: sampleBounds.west + col * cellSizeM, east: sampleBounds.west + (col + 1) * cellSizeM, south: sampleBounds.south + row * cellSizeM, north: sampleBounds.south + (row + 1) * cellSizeM };
      if (!cells.has(id)) cells.set(id, { id, col, row, bounds, featureIds: [], queryFeatureIds: [] });
      cells.get(id).featureIds.push(f.id);
    }
    for (const cell of cells.values()) cell.queryFeatureIds = query.filter(f => intersects(f.bbox, cell.bounds)).map(f => f.id).sort();
    return { cells: [...cells.values()].sort((a, b) => a.id.localeCompare(b.id)), features: sample, stats: { featureCount: sample.length, queryFeatureCount: query.length, cellCount: cells.size, cellSizeM, sampleBounds } };
  }
  function createRuntime(options) {
    const state = { version: VERSION, generation: 0, requestId: 0, worker: null, workerUsed: false, fallback: false, errors: [], jobs: { requested: 0, completed: 0, stale: 0, failed: 0, workerLastMs: null, roundtripLastMs: null }, cells: [], descriptors: [], sampleBounds: null, sampleIds: new Set(), cache: new Map(), active: new Set(), maxFineChunks: options.maxFineChunks || 4, maxEstimatedFeatures: 0, lastUpdateMs: 0 };
    const featureMap = new Map();
    function disposeEntry(entry) { try { options.disposeObject?.(entry.object); } catch (_) {} }
    function evict(except = new Set()) {
      const entries = [...state.cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      for (const [key, entry] of entries) {
        if (state.cache.size <= state.maxFineChunks) break;
        if (except.has(key)) continue;
        disposeEntry(entry); state.cache.delete(key);
      }
    }
    async function askWorker(type, payload) {
      state.jobs.requested += 1;
      const generation = state.generation, requestId = ++state.requestId, sentAt = performance.now();
      if (!state.worker) throw new Error("worker unavailable");
      return new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => { clearTimeout(timer); state.worker?.removeEventListener("message", onMessage); state.worker?.removeEventListener("error", onError); state.worker?.removeEventListener("messageerror", onError); };
        const fail = error => { if (settled) return; settled = true; cleanup(); state.jobs.failed += 1; reject(error instanceof Error ? error : new Error(String(error?.message || error || "worker failed"))); };
        const timer = setTimeout(() => fail(new Error("worker timeout")), 3500);
        const onError = event => fail(new Error(event.message || "worker boot/message error"));
        const onMessage = event => {
          const msg = event.data || {};
          if (msg.requestId !== requestId) return;
          if (settled) return; settled = true; cleanup();
          state.jobs.roundtripLastMs = Number((performance.now() - sentAt).toFixed(3));
          state.jobs.workerLastMs = Number.isFinite(Number(msg.ms)) ? Number(msg.ms) : null;
          if (msg.generation !== state.generation) { state.jobs.stale += 1; reject(new Error("stale worker result")); return; }
          if (!msg.ok) { state.jobs.failed += 1; reject(new Error(msg.error || "worker failed")); return; }
          state.workerUsed = true; state.jobs.completed += 1; resolve(msg);
        };
        state.worker.addEventListener("message", onMessage);
        state.worker.addEventListener("error", onError);
        state.worker.addEventListener("messageerror", onError);
        state.worker.postMessage({ requestId, generation, type, payload });
      });
    }
    async function init(rawFeatures, manifest) {
      const token = state.generation + 1;
      state.generation = token; state.errors = []; state.cache.forEach(disposeEntry); state.cache.clear(); state.active.clear(); featureMap.clear(); state.fallback = false;
      const descriptors = rawFeatures.map(descriptor).filter(f => f.points.length >= 3);
      descriptors.forEach(f => featureMap.set(f.id, rawFeatures.find(v => String(v.id) === f.id)));
      const sampleBounds = deriveFocusBounds(descriptors, manifest, options.fallbackFocusId || "msft_0615");
      const cellSizeM = manifest?.cell_size_m || options.cellSizeM || 250;
      try {
        if (typeof Worker !== "undefined") state.worker = state.worker || new Worker(options.workerUrl || "static/s07-worker.js");
        const roi = manifest?.roi_250m || manifest?.sample || null;
        const msg = await askWorker("partition", { features: descriptors, sampleBounds, cellSizeM, centroidMemberIds: roi?.centroid_member_ids || null, footprintIntersectionIds: roi?.footprint_intersection_ids || null });
        if (token !== state.generation) throw new Error("stale init result");
        state.descriptors = descriptors; state.sampleBounds = sampleBounds; state.cells = msg.result.cells || [];
        state.maxEstimatedFeatures = Math.max(0, ...state.cells.map(c => c.featureIds.length));
      } catch (error) {
        if (token !== state.generation) throw error;
        state.fallback = true; state.errors.push(error.message);
        const result = syncPartition(descriptors, sampleBounds, cellSizeM, manifest);
        state.descriptors = descriptors; state.sampleBounds = sampleBounds; state.cells = result.cells;
        state.maxEstimatedFeatures = Math.max(0, ...state.cells.map(c => c.featureIds.length));
      }
      state.sampleIds = new Set(state.cells.flatMap(c => c.featureIds));
      return snapshot();
    }
    function cellDistance(cell, target) { const c = centerOf(cell.bounds); return Math.hypot(c.x - target.x, c.z - target.z); }
    function ensureCell(cell, now) {
      let entry = state.cache.get(cell.id);
      if (entry) { entry.lastUsed = now; if (entry.object) entry.object.visible = true; return entry; }
      const raw = cell.featureIds.map(id => featureMap.get(id)).filter(Boolean);
      const created = options.createChunk?.(cell, raw) || null;
      entry = { key: cell.id, cell, featureIds: cell.featureIds.slice(), queryFeatureIds: cell.queryFeatureIds.slice(), object: created?.object || created?.group || null, qa: created?.qa || null, pickables: created?.pickables || [], createdAt: now, lastUsed: now, estimatedFeatures: raw.length };
      if (entry.object) entry.object.visible = true;
      state.cache.set(cell.id, entry);
      return entry;
    }
    function update(view = {}) {
      const started = performance.now(), now = started;
      if (view.enabled === false) {
        for (const entry of state.cache.values()) if (entry.object) entry.object.visible = false;
        state.active = new Set();
        state.lastUpdateMs = performance.now() - started;
        return [];
      }
      const target = view.target || centerOf(state.sampleBounds || { west: 0, east: 0, south: 0, north: 0 });
      const radius = Number(view.radius || Infinity);
      const activeLimit = radius < 950 ? 420 : 260;
      let candidates = state.cells.filter(c => cellDistance(c, target) <= activeLimit).sort((a, b) => cellDistance(a, target) - cellDistance(b, target)).slice(0, state.maxFineChunks);
      if (!candidates.length && view.forceSample && state.cells.length) candidates = [state.cells.slice().sort((a, b) => cellDistance(a, centerOf(state.sampleBounds)) - cellDistance(b, centerOf(state.sampleBounds)))[0]];
      const active = new Set(candidates.map(c => c.id));
      for (const entry of state.cache.values()) if (entry.object) entry.object.visible = active.has(entry.key);
      const entries = candidates.map(c => ensureCell(c, now));
      state.active = active; evict(active); state.lastUpdateMs = performance.now() - started;
      return entries;
    }
    function dispose() { state.cache.forEach(disposeEntry); state.cache.clear(); if (state.worker) { state.worker.terminate(); state.worker = null; } }
    function snapshot() { return { version: VERSION, generation: state.generation, workerUsed: state.workerUsed, fallback: state.fallback, errors: state.errors.slice(-3), jobs: { ...state.jobs }, cells: state.cells.length, sampleIds: state.sampleIds.size, sampleBounds: state.sampleBounds, cacheSize: state.cache.size, active: [...state.active], maxFineChunks: state.maxFineChunks, maxEstimatedFeatures: state.maxEstimatedFeatures, lastUpdateMs: Number(state.lastUpdateMs.toFixed(3)) }; }
    return { init, update, dispose, snapshot, get sampleIds() { return state.sampleIds; }, get sampleBounds() { return state.sampleBounds; }, get cells() { return state.cells; } };
  }
  global.B04S07Chunks = { VERSION, createRuntime, _test: { descriptor, syncPartition, deriveFocusBounds } };
}(typeof window !== "undefined" ? window : globalThis));
