#!/usr/bin/env node
/* Independent QA-only audit for S07 worker/chunk runtime. */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");
const B04 = path.join(ROOT, "outputs/tayninh-data-batch-04");
const WORKER_PATH = path.join(B04, "static/s07-worker.js");
const CHUNKS_PATH = path.join(B04, "static/s07-chunks.js");
const IMPORTER_PATH = path.join(B04, "static/s07-importer.js");
const APP_PATH = path.join(B04, "static/app.js");
const RECEIPT_PATH = path.join(B04, "scripts/s07-a-qa/worker-audit.json");

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function feature(id, west, south, east, north) {
  return {
    id,
    footprint_local_m: [
      { x: west, z: south },
      { x: east, z: south },
      { x: east, z: north },
      { x: west, z: north },
    ],
  };
}

function loadWorkerContext() {
  const messages = [];
  const sandbox = {
    console,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    DataView,
    Number,
    Math,
    JSON,
    RegExp,
    Error,
    performance: { now: () => Date.now() },
    crypto: crypto.webcrypto,
    postMessage: msg => messages.push(msg),
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.importScripts = (...files) => {
    for (const file of files) {
      const resolved = path.join(path.dirname(WORKER_PATH), file);
      vm.runInContext(fs.readFileSync(resolved, "utf8"), sandbox, { filename: resolved });
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(WORKER_PATH, "utf8"), sandbox, { filename: WORKER_PATH });
  return { sandbox, messages };
}

async function sendWorkerJob(ctx, data) {
  const before = ctx.messages.length;
  ctx.sandbox.onmessage({ data });
  await delay(0);
  const msg = ctx.messages.slice(before).at(-1);
  if (!msg) throw new Error("worker produced no message");
  return msg;
}

class FakeWorker {
  static scripts = [];
  static instances = [];
  static mode = "success";
  static delayPlan = [];
  static responseFactory = null;

  constructor(url) {
    this.url = url;
    this.listeners = { message: new Set(), error: new Set(), messageerror: new Set() };
    this.terminated = false;
    this.posts = [];
    FakeWorker.instances.push(this);
    if (FakeWorker.mode === "boot-error") {
      setTimeout(() => this.emit("error", { message: "synthetic worker boot error" }), 0);
    }
  }
  addEventListener(type, fn) { this.listeners[type]?.add(fn); }
  removeEventListener(type, fn) { this.listeners[type]?.delete(fn); }
  terminate() { this.terminated = true; }
  emit(type, event) { for (const fn of [...(this.listeners[type] || [])]) fn(event); }
  postMessage(data) {
    this.posts.push(data);
    if (FakeWorker.mode === "timeout") return;
    if (FakeWorker.mode === "boot-error") return;
    const delayMs = FakeWorker.delayPlan.length ? FakeWorker.delayPlan.shift() : 0;
    const result = FakeWorker.responseFactory ? FakeWorker.responseFactory(data) : { cells: [], features: [], stats: {} };
    setTimeout(() => this.emit("message", { data: { ok: true, requestId: data.requestId, generation: data.generation, type: data.type, version: "fake-worker", ms: delayMs, result } }), delayMs);
  }
}

function loadChunksWithFakeWorker() {
  FakeWorker.instances = [];
  const sandbox = {
    console,
    Number,
    Math,
    JSON,
    Set,
    Map,
    Error,
    performance: { now: () => Date.now() },
    setTimeout,
    clearTimeout,
    Worker: FakeWorker,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(CHUNKS_PATH, "utf8"), sandbox, { filename: CHUNKS_PATH });
  return sandbox.B04S07Chunks;
}

function partitionForCells(cellIds) {
  return {
    cells: cellIds.map((id, index) => ({
      id,
      col: index,
      row: 0,
      bounds: { west: index * 250, east: index * 250 + 250, south: 0, north: 250 },
      featureIds: [`f${index}`],
      queryFeatureIds: [`f${index}`],
    })),
    features: cellIds.map((id, index) => ({ id: `f${index}` })),
    stats: { featureCount: cellIds.length, queryFeatureCount: cellIds.length, cellCount: cellIds.length, cellSizeM: 250 },
  };
}

function rawFeatures(count) {
  return Array.from({ length: count }, (_, i) => feature(`f${i}`, i * 250 + 20, 20, i * 250 + 60, 60));
}

async function runCase(name, severity, fn) {
  try {
    const detail = await fn();
    return { name, severity, status: "PASS", detail: stableDetail(detail) };
  } catch (error) {
    return { name, severity, status: "FAIL", error: String(error && error.message || error) };
  }
}

function stableDetail(value) {
  if (Array.isArray(value)) return value.map(stableDetail);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (["workerLastMs", "roundtripLastMs", "lastUpdateMs", "ms"].includes(key)) continue;
    out[key] = stableDetail(val);
  }
  return out;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const results = [];

  results.push(await runCase("worker_partition_centroid_ownership_query_neighbors", "P0", async () => {
    const ctx = loadWorkerContext();
    const payload = {
      cellSizeM: 250,
      sampleBounds: { west: 0, south: 0, east: 500, north: 250 },
      centroidMemberIds: ["ownedA", "ownedB"],
      footprintIntersectionIds: ["ownedA", "ownedB", "borderOnly"],
      features: [
        { id: "ownedA", points: [{ x: 20, z: 20 }, { x: 80, z: 20 }, { x: 80, z: 80 }, { x: 20, z: 80 }] },
        { id: "ownedB", points: [{ x: 270, z: 20 }, { x: 330, z: 20 }, { x: 330, z: 80 }, { x: 270, z: 80 }] },
        { id: "borderOnly", points: [{ x: 240, z: 10 }, { x: 265, z: 10 }, { x: 265, z: 60 }, { x: 240, z: 60 }] },
      ],
    };
    const msg = await sendWorkerJob(ctx, { requestId: 11, generation: 3, type: "partition", payload });
    assert(msg.ok, msg.error || "worker partition failed");
    const cells = msg.result.cells;
    assert(cells.length === 2, `expected 2 owned cells, got ${cells.length}`);
    const owned = cells.flatMap(c => c.featureIds);
    assert(owned.filter(id => id === "borderOnly").length === 0, "border-only feature became owned");
    assert(new Set(owned).size === owned.length, "owned feature duplicated across cells");
    assert(cells.some(c => c.queryFeatureIds.includes("borderOnly")), "border-only feature missing from query neighbors");
    return { cells: cells.map(c => ({ id: c.id, featureIds: c.featureIds, queryFeatureIds: c.queryFeatureIds })), workerMessages: ctx.messages.length };
  }));

  results.push(await runCase("runtime_worker_success_request_generation_timings", "P0", async () => {
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [5];
    FakeWorker.responseFactory = data => partitionForCells(["c0_0"]);
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({ createChunk: (cell, raw) => ({ object: { visible: false, id: cell.id }, qa: { raw: raw.length } }) });
    const snap = await runtime.init(rawFeatures(1), { roi_250m: { bounds_scene_m: [0, 0, 250, 250], centroid_member_ids: ["f0"], footprint_intersection_ids: ["f0"] } });
    assert(snap.workerUsed === true, "workerUsed not true");
    assert(snap.jobs.requested === 1 && snap.jobs.completed === 1, "job counts wrong");
    const post = FakeWorker.instances[0].posts[0];
    assert(post.requestId === 1 && post.generation === 1 && post.type === "partition", "requestId/generation/type not propagated");
    runtime.dispose();
    assert(FakeWorker.instances[0].terminated, "worker not terminated on dispose");
    return { snapshot: snap, post };
  }));

  results.push(await runCase("runtime_no_fine_geometry_for_far_view", "P1", async () => {
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [0];
    FakeWorker.responseFactory = () => partitionForCells(["c0_0"]);
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({ createChunk: (cell, raw) => ({ object: { visible: false, id: cell.id } }) });
    await runtime.init(rawFeatures(1), {});
    const entries = runtime.update({ target: { x: 5000, z: 5000 }, radius: 2000 });
    const snap = runtime.snapshot();
    runtime.dispose();
    assert(entries.length === 0, `expected no far fine entries, got ${entries.length}`);
    assert(snap.cacheSize === 0, `expected cache 0, got ${snap.cacheSize}`);
    return { entries: entries.length, snapshot: snap };
  }));

  results.push(await runCase("runtime_disabled_quality_near_gate_hides_cached_fine", "P1", async () => {
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [0];
    FakeWorker.responseFactory = () => partitionForCells(["c0_0"]);
    const chunks = loadChunksWithFakeWorker();
    const createdObjects = [];
    const runtime = chunks.createRuntime({
      createChunk: cell => {
        const object = { visible: false, id: cell.id };
        createdObjects.push(object);
        return { object };
      },
    });
    const beforeBoot = runtime.update({ target: { x: 125, z: 125 }, radius: 100, enabled: false, forceSample: true });
    const beforeBootSnap = runtime.snapshot();
    await runtime.init(rawFeatures(1), {});
    const disabledNear = runtime.update({ target: { x: 125, z: 125 }, radius: 100, enabled: false, forceSample: true });
    const disabledNearSnap = runtime.snapshot();
    const enabledNear = runtime.update({ target: { x: 125, z: 125 }, radius: 100, enabled: true, forceSample: true });
    const enabledSnap = runtime.snapshot();
    const visibleAfterEnable = createdObjects.map(o => o.visible);
    const disabledAgain = runtime.update({ target: { x: 125, z: 125 }, radius: 100, enabled: false, forceSample: true });
    const disabledAgainSnap = runtime.snapshot();
    const visibleAfterDisable = createdObjects.map(o => o.visible);
    runtime.dispose();
    assert(beforeBoot.length === 0 && beforeBootSnap.active.length === 0 && beforeBootSnap.cacheSize === 0, "disabled before init created active fine chunks");
    assert(disabledNear.length === 0 && disabledNearSnap.active.length === 0 && disabledNearSnap.cacheSize === 0, "disabled near view created fine chunks");
    assert(enabledNear.length === 1 && enabledSnap.active.includes("c0_0") && enabledSnap.cacheSize === 1, "enabled near view did not activate c0_0");
    assert(visibleAfterEnable.every(Boolean), "enabled near chunk object was not visible");
    assert(disabledAgain.length === 0 && disabledAgainSnap.active.length === 0 && disabledAgainSnap.cacheSize === 1, "disabled after cache did not clear active while preserving cache");
    assert(visibleAfterDisable.every(v => v === false), "cached fine group remained visible after enabled=false");
    return {
      beforeBoot: { entries: beforeBoot.length, active: beforeBootSnap.active, cacheSize: beforeBootSnap.cacheSize },
      disabledNear: { entries: disabledNear.length, active: disabledNearSnap.active, cacheSize: disabledNearSnap.cacheSize },
      enabledNear: { entries: enabledNear.length, active: enabledSnap.active, cacheSize: enabledSnap.cacheSize, visible: visibleAfterEnable },
      disabledAgain: { entries: disabledAgain.length, active: disabledAgainSnap.active, cacheSize: disabledAgainSnap.cacheSize, visible: visibleAfterDisable },
    };
  }));

  results.push(await runCase("runtime_max4_cache_eviction_and_disposals", "P0", async () => {
    let disposed = 0;
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [0];
    FakeWorker.responseFactory = () => partitionForCells(["c0_0", "c1_0", "c2_0", "c3_0", "c4_0", "c5_0"]);
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({
      maxFineChunks: 4,
      createChunk: cell => ({ object: { visible: false, id: cell.id } }),
      disposeObject: () => { disposed += 1; },
    });
    await runtime.init(rawFeatures(6), {});
    runtime.update({ target: { x: 0, z: 125 }, radius: 100 });
    let snap = runtime.snapshot();
    assert(snap.cacheSize <= 4, `cache after first update >4: ${snap.cacheSize}`);
    runtime.update({ target: { x: 1400, z: 125 }, radius: 100 });
    snap = runtime.snapshot();
    runtime.dispose();
    assert(snap.cacheSize <= 4, `cache after second update >4: ${snap.cacheSize}`);
    assert(disposed >= 4, `expected disposals during eviction/final dispose, got ${disposed}`);
    return { cacheSize: snap.cacheSize, disposed };
  }));

  results.push(await runCase("runtime_out_of_order_stale_generation_newest_only", "P0", async () => {
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [40, 0];
    FakeWorker.responseFactory = data => data.generation === 1 ? partitionForCells(["old"]) : partitionForCells(["new"]);
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({ createChunk: cell => ({ object: { visible: false, id: cell.id } }) });
    const p1 = runtime.init(rawFeatures(1), {});
    const p2 = runtime.init(rawFeatures(1), {});
    const second = await p2;
    let staleRejected = false;
    try { await p1; } catch (error) { staleRejected = /stale/i.test(String(error.message)); }
    await delay(50);
    const snap = runtime.snapshot();
    runtime.dispose();
    assert(staleRejected, "older init did not reject as stale");
    assert(second.generation === 2 && snap.generation === 2, "newest generation not retained");
    return { second, snapshot: snap, staleRejected };
  }));

  results.push(await runCase("runtime_worker_boot_error_fallback", "P1", async () => {
    FakeWorker.mode = "boot-error";
    FakeWorker.delayPlan = [];
    FakeWorker.responseFactory = null;
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({ createChunk: cell => ({ object: { visible: false, id: cell.id } }) });
    const snap = await runtime.init([feature("f0", 0, 0, 50, 50)], { roi_250m: { bounds_scene_m: [0, 0, 250, 250], centroid_member_ids: ["f0"], footprint_intersection_ids: ["f0"] } });
    runtime.dispose();
    assert(snap.fallback === true, "boot error did not enter fallback");
    assert(snap.errors.some(e => /boot/.test(e)), "boot error not recorded");
    return { snapshot: snap };
  }));

  results.push(await runCase("runtime_worker_timeout_fallback", "P1", async () => {
    FakeWorker.mode = "timeout";
    FakeWorker.delayPlan = [];
    FakeWorker.responseFactory = null;
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({ createChunk: cell => ({ object: { visible: false, id: cell.id } }) });
    const snap = await runtime.init([feature("f0", 0, 0, 50, 50)], { roi_250m: { bounds_scene_m: [0, 0, 250, 250], centroid_member_ids: ["f0"], footprint_intersection_ids: ["f0"] } });
    runtime.dispose();
    assert(snap.fallback === true, "timeout did not enter fallback");
    assert(snap.jobs.failed === 1, "timeout failed count missing");
    assert(snap.errors.some(e => /timeout/.test(e)), "timeout error not recorded");
    return { snapshot: snap };
  }));

  results.push(await runCase("runtime_final_dispose_terminates_worker_and_objects", "P0", async () => {
    let disposed = 0;
    FakeWorker.mode = "success";
    FakeWorker.delayPlan = [0];
    FakeWorker.responseFactory = () => partitionForCells(["c0_0", "c1_0"]);
    const chunks = loadChunksWithFakeWorker();
    const runtime = chunks.createRuntime({
      createChunk: cell => ({ object: { visible: false, id: cell.id } }),
      disposeObject: () => { disposed += 1; },
    });
    await runtime.init(rawFeatures(2), {});
    runtime.update({ target: { x: 0, z: 125 }, radius: 100 });
    runtime.dispose();
    assert(FakeWorker.instances[0].terminated, "worker not terminated");
    assert(disposed >= 1, "cached objects not disposed");
    return { disposed, terminated: FakeWorker.instances[0].terminated };
  }));

  results.push(await runCase("app_static_effective_active_predicate_guard", "P1", async () => {
    const app = fs.readFileSync(APP_PATH, "utf8");
    assert(/function\s+syncS07CoarseVisibility\s*\(\)\s*\{/.test(app), "syncS07CoarseVisibility missing");
    assert(/const\s+fineVisible\s*=\s*state\.solution\.detail\s*===\s*"detailed"\s*&&\s*\["overview",\s*"buildings"\]\.includes\(state\.mode\);/.test(app), "fineVisible detail/mode predicate missing");
    assert(/const\s+active\s*=\s*fineVisible\s*\?\s*new Set\(state\.s07\.chunks\?\.snapshot\?\.\(\)\.active\s*\|\|\s*\[\]\)\s*:\s*new Set\(\);/.test(app), "coarse visibility still consumes active chunks while fine disabled");
    assert(/entry\.group\.visible\s*=\s*!active\.has\(id\)\s*&&\s*\["overview",\s*"buildings",\s*"elevation"\]\.includes\(state\.mode\);/.test(app), "coarse visibility mode predicate missing or changed");
    return {
      appPath: path.relative(ROOT, APP_PATH),
      appSha256: sha256File(APP_PATH),
      guardedPredicate: "coarse chunks ignore snapshot.active unless detail=detailed and mode is overview/buildings",
    };
  }));

  const failed = results.filter(r => r.status !== "PASS");
  const receipt = {
    schema: "tayninh-s07-worker-audit/v1",
    generated_at: process.env.S07_WORKER_AUDIT_GENERATED_AT || new Date().toISOString(),
    worker_path: path.relative(ROOT, WORKER_PATH),
    worker_sha256: sha256File(WORKER_PATH),
    chunks_path: path.relative(ROOT, CHUNKS_PATH),
    chunks_sha256: sha256File(CHUNKS_PATH),
    importer_path: path.relative(ROOT, IMPORTER_PATH),
    importer_sha256: sha256File(IMPORTER_PATH),
    app_path: path.relative(ROOT, APP_PATH),
    app_sha256: sha256File(APP_PATH),
    status: failed.length ? "FAIL" : "PASS",
    counts: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      failed_p0: failed.filter(r => r.severity === "P0").length,
      failed_p1: failed.filter(r => r.severity === "P1").length,
    },
    results,
    open_findings: failed.map(r => ({ name: r.name, severity: r.severity, message: r.error, blocker: ["P0", "P1"].includes(r.severity) })),
    note: "QA-only VM audit. It does not edit product worker/chunk/importer code and is not browser/GPU evidence.",
  };
  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({ status: receipt.status, counts: receipt.counts, receipt: path.relative(ROOT, RECEIPT_PATH), open_findings: receipt.open_findings }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
