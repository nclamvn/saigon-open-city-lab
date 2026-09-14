import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

const importerCode = fs.readFileSync('outputs/tayninh-data-batch-04/static/s07-importer.js', 'utf8');
const chunksCode = fs.readFileSync('outputs/tayninh-data-batch-04/static/s07-chunks.js', 'utf8');
const appCode = fs.readFileSync('outputs/tayninh-data-batch-04/static/app.js', 'utf8');
const ctx = { TextEncoder, TextDecoder, console, crypto: crypto.webcrypto };
vm.createContext(ctx);
vm.runInContext(importerCode, ctx);
const I = ctx.B04S07Importer;
function loadChunks(extra = {}) {
  const c = { console, performance: { now: () => Number(process.hrtime.bigint() / 1000000n) }, setTimeout, clearTimeout, ...extra };
  vm.createContext(c);
  vm.runInContext(chunksCode, c);
  return c.B04S07Chunks;
}

function source(hash, overrides = {}) {
  return { kind: 'modelled', units: 'metres', crs: 'canonical_scene_m', vertical_datum: 'none', date: '2026-09-14', resolution: 'fixture', bounds: [0, -2, 2, 0], nodata: 'none', rights: 'synthetic fixture', sourcehash: hash, quality: 'fixture', coverage: 'fixture', available: false, ...overrides };
}
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function makeGlb({ posOffset = 0, posComponent = 5126, indexType = 'SCALAR', indexComponent = 5123, indices = [0, 1, 2], positions = [[0,0,0],[1,0,0],[0,1,0]], mutateGltf = null } = {}) {
  const posBytes = positions.length * 12;
  const idxSize = indexComponent === 5125 ? 4 : indexComponent === 5123 ? 2 : 1;
  const idxOffset = Math.max(posBytes, 36);
  const binPayloadLen = idxOffset + indices.length * idxSize;
  const binLen = binPayloadLen + ((4 - binPayloadLen % 4) % 4);
  const gltf = { asset: { version: '2.0' }, buffers: [{ byteLength: binPayloadLen }], bufferViews: [{ buffer: 0, byteOffset: posOffset, byteLength: posBytes }, { buffer: 0, byteOffset: idxOffset, byteLength: indices.length * idxSize }], accessors: [{ bufferView: 0, componentType: posComponent, count: positions.length, type: 'VEC3' }, { bufferView: 1, componentType: indexComponent, count: indices.length, type: indexType }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }] };
  if (mutateGltf) mutateGltf(gltf);
  const raw = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - raw.length % 4) % 4;
  const bin = new Uint8Array(binLen);
  const bdv = new DataView(bin.buffer);
  positions.flat().forEach((v, i) => bdv.setFloat32(i * 4, v, true));
  indices.forEach((v, i) => { if (idxSize === 4) bdv.setUint32(idxOffset + i * idxSize, v, true); else if (idxSize === 2) bdv.setUint16(idxOffset + i * idxSize, v, true); else bdv.setUint8(idxOffset + i, v); });
  const total = 12 + 8 + raw.length + pad + 8 + bin.length;
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  out.set([103,108,84,70]); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, raw.length + pad, true); dv.setUint32(16, 0x4E4F534A, true); out.set(raw, 20); out.fill(32, 20 + raw.length, 20 + raw.length + pad); const bo = 20 + raw.length + pad; dv.setUint32(bo, bin.length, true); dv.setUint32(bo + 4, 0x004E4942, true); out.set(bin, bo + 8);
  return out;
}
function makeUnalignedGlb() {
  const b = makeGlb();
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  dv.setUint32(12, dv.getUint32(12, true) - 1, true);
  return b;
}
function appendChunk(glb, type, payload) {
  const pad = (4 - payload.length % 4) % 4;
  const extra = new Uint8Array(8 + payload.length + pad);
  const dv = new DataView(extra.buffer);
  dv.setUint32(0, payload.length + pad, true);
  dv.setUint32(4, type, true);
  extra.set(payload, 8);
  extra.fill(32, 8 + payload.length);
  const out = new Uint8Array(glb.length + extra.length);
  out.set(glb); out.set(extra, glb.length);
  new DataView(out.buffer).setUint32(8, out.length, true);
  return out;
}
function makeUnknownChunkGlb() { return appendChunk(makeGlb(), 0x12345678, new Uint8Array([1,2,3,4])); }
function makeDuplicateJsonGlb() { return appendChunk(makeGlb(), 0x4E4F534A, new TextEncoder().encode('{"asset":{"version":"2.0"}}')); }
function makeTrailingGlb() {
  const b = makeGlb();
  const out = new Uint8Array(b.length + 2);
  out.set(b); out.set([0, 0], b.length);
  new DataView(out.buffer).setUint32(8, out.length, true);
  return out;
}
async function expectReject(name, fn) {
  try { await fn(); return { name, rejected: false }; }
  catch (error) { return { name, rejected: true, error: error.message }; }
}
const validGlb = makeGlb();
const validSource = source(hash(validGlb));
const valid = await I.parseGlbModel(validGlb, validSource);
const cases = [];
cases.push(await expectReject('glb_position_bufferView_outside_bin', async () => { const b = makeGlb({ posOffset: 100000 }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_position_componentType_123', async () => { const b = makeGlb({ posComponent: 123 }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_index_type_vec4', async () => { const b = makeGlb({ indexType: 'VEC4' }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_index_out_of_range', async () => { const b = makeGlb({ indices: [0, 1, 9] }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_nonfinite_position', async () => { const b = makeGlb({ positions: [[0,0,0],[NaN,0,0],[0,1,0]] }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_degenerate_triangle', async () => { const b = makeGlb({ positions: [[0,0,0],[1,0,0],[2,0,0]] }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_chunk_not_4byte_aligned', async () => { const b = makeUnalignedGlb(); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_accessor_outside_bufferView', async () => { const b = makeGlb({ mutateGltf: g => { g.bufferViews[0].byteLength = 8; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_accessor_bad_stride', async () => { const b = makeGlb({ mutateGltf: g => { g.bufferViews[0].byteStride = 4; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_accessor_misaligned', async () => { const b = makeGlb({ mutateGltf: g => { g.accessors[0].byteOffset = 2; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_nodes_trs_rejected', async () => { const b = makeGlb({ mutateGltf: g => { g.nodes = [{ mesh: 0, translation: [1, 0, 0] }]; g.scenes = [{ nodes: [0] }]; g.scene = 0; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_skin_animation_rejected', async () => { const b = makeGlb({ mutateGltf: g => { g.skins = [{}]; g.animations = [{}]; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_draco_extension_rejected', async () => { const b = makeGlb({ mutateGltf: g => { g.extensionsRequired = ['KHR_draco_mesh_compression']; g.meshes[0].primitives[0].extensions = { KHR_draco_mesh_compression: {} }; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_material_texture_rejected', async () => { const b = makeGlb({ mutateGltf: g => { g.materials = [{}]; g.meshes[0].primitives[0].material = 0; g.images = [{ uri: 'x.png' }]; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_morph_target_rejected', async () => { const b = makeGlb({ mutateGltf: g => { g.meshes[0].primitives[0].targets = [{ POSITION: 0 }]; } }); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_unknown_chunk_rejected', async () => { const b = makeUnknownChunkGlb(); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_duplicate_json_rejected', async () => { const b = makeDuplicateJsonGlb(); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('glb_trailing_bytes_rejected', async () => { const b = makeTrailingGlb(); await I.parseGlbModel(b, source(hash(b))); }));
cases.push(await expectReject('geojson_unclosed_ring', () => I.parseGeoJSONFootprints({ type: 'FeatureCollection', source: source('a'.repeat(64)), features: [{ type: 'Feature', properties: { stable_id: 'g1' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1]]] } }] })));
cases.push(await expectReject('geojson_bowtie_selfintersection', () => I.parseGeoJSONFootprints({ type: 'FeatureCollection', source: source('a'.repeat(64)), features: [{ type: 'Feature', properties: { stable_id: 'g2' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[1,1],[1,0],[0,1],[0,0]]] } }] })));
cases.push(await expectReject('geojson_duplicate_id', () => I.parseGeoJSONFootprints({ type: 'FeatureCollection', source: source('a'.repeat(64)), features: [
  { type: 'Feature', properties: { stable_id: 'dup' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } },
  { type: 'Feature', properties: { stable_id: 'dup' }, geometry: { type: 'Polygon', coordinates: [[[2,0],[3,0],[3,1],[2,1],[2,0]]] } },
] })));
cases.push(await expectReject('raster_affine_bounds_mismatch', () => I.parseRasterMetadata({ ...source('a'.repeat(64), { bounds: [0,0,1,1] }), width: 2, height: 2, bands: 1, transform: [0,1,0,0,0,-1] })));
function feature(id, x, z, size = 20) {
  return { id, footprint_local_m: [{ x: x - size / 2, z: z - size / 2 }, { x: x + size / 2, z: z - size / 2 }, { x: x + size / 2, z: z + size / 2 }, { x: x - size / 2, z: z + size / 2 }] };
}
const chunksApi = loadChunks();
const rawFeatures = [feature('a', 40, 40), feature('b', 300, 40), feature('c', 40, 300), feature('d', 300, 300), feature('q', 252, 40, 80)];
const descriptors = rawFeatures.map(chunksApi._test.descriptor);
const manifest = { cell_size_m: 250, roi_250m: { bounds_scene_m: [0, 0, 500, 500], center_target_id: 'a', centroid_member_ids: ['a', 'b', 'c', 'd'], footprint_intersection_ids: ['a', 'b', 'c', 'd', 'q'] } };
const partition = chunksApi._test.syncPartition(descriptors, { west: 0, south: 0, east: 500, north: 500 }, 250, manifest);
let created = 0, disposed = 0;
const runtime = chunksApi.createRuntime({ maxFineChunks: 2, cellSizeM: 250, fallbackFocusId: 'a', createChunk: (cell, feats) => ({ object: { id: cell.id, visible: true }, pickables: [], qa: { n: feats.length } }), disposeObject: () => { disposed += 1; } });
await runtime.init(rawFeatures, manifest);
for (const target of [{ x: 40, z: 40 }, { x: 300, z: 40 }, { x: 40, z: 300 }, { x: 300, z: 300 }]) { runtime.update({ target, radius: 100, forceSample: false }); created = Math.max(created, runtime.snapshot().cacheSize + disposed); }
const cacheSnapshot = runtime.snapshot();
runtime.dispose();
let disabledCreated = 0;
const disabledRuntime = chunksApi.createRuntime({ maxFineChunks: 2, cellSizeM: 250, fallbackFocusId: 'a', createChunk: () => { disabledCreated += 1; return { object: {}, pickables: [] }; }, disposeObject: () => {} });
await disabledRuntime.init(rawFeatures, manifest);
disabledRuntime.update({ target: { x: 40, z: 40 }, radius: 100, enabled: false, forceSample: true });
const disabledSnapshot = disabledRuntime.snapshot();
disabledRuntime.dispose();
const initiallyHidden = { visible: false };
const hiddenRuntime = chunksApi.createRuntime({ maxFineChunks: 1, cellSizeM: 250, fallbackFocusId: 'a', createChunk: () => ({ object: initiallyHidden, pickables: [] }), disposeObject: () => {} });
await hiddenRuntime.init([feature('a', 40, 40)], { cell_size_m: 250, roi_250m: { bounds_scene_m: [0, 0, 250, 250], centroid_member_ids: ['a'], footprint_intersection_ids: ['a'] } });
hiddenRuntime.update({ target: { x: 40, z: 40 }, radius: 100, enabled: true });
const freshObjectMadeVisible = initiallyHidden.visible === true;
hiddenRuntime.dispose();
class FakeWorker {
  constructor() { this.listeners = { message: new Set(), error: new Set(), messageerror: new Set() }; }
  addEventListener(type, fn) { this.listeners[type]?.add(fn); }
  removeEventListener(type, fn) { this.listeners[type]?.delete(fn); }
  postMessage(msg) {
    const delay = msg.requestId === 1 ? 20 : 0;
    setTimeout(() => {
      const result = { cells: [{ id: 'c0_0', col: 0, row: 0, bounds: { west: 0, east: 250, south: 0, north: 250 }, featureIds: ['a'], queryFeatureIds: ['a'] }] };
      for (const fn of this.listeners.message) fn({ data: { ok: true, requestId: msg.requestId, generation: msg.generation, type: msg.type, ms: 1.234, result } });
    }, delay);
  }
  terminate() {}
}
const chunksWithWorker = loadChunks({ Worker: FakeWorker });
const staleRuntime = chunksWithWorker.createRuntime({ maxFineChunks: 1, cellSizeM: 250, fallbackFocusId: 'a', createChunk: () => ({ object: {}, pickables: [] }), disposeObject: () => {} });
const staleFirst = staleRuntime.init([feature('a', 40, 40)], manifest).then(() => false, () => true);
const staleSecond = staleRuntime.init([feature('a', 40, 40)], manifest);
await Promise.allSettled([staleFirst, staleSecond]);
const staleSnapshot = staleRuntime.snapshot();
staleRuntime.dispose();
const chunks = {
  centroidOwnedCount: partition.stats.featureCount,
  queryIncludesBorderOnly: partition.cells.some(c => c.queryFeatureIds.includes('q') && !c.featureIds.includes('q')),
  cellCount: partition.cells.length,
  bootFailureFallback: cacheSnapshot.fallback === true && cacheSnapshot.errors.some(e => /worker unavailable/i.test(e)),
  cacheBounded: cacheSnapshot.cacheSize <= 2,
  evictedAtLeastOne: disposed >= 1,
  disabledUpdateActiveEmptyNoCreate: disabledSnapshot.active.length === 0 && disabledSnapshot.cacheSize === 0 && disabledCreated === 0,
  freshCreatedObjectMadeVisible: freshObjectMadeVisible,
  staleRejected: staleSnapshot.jobs.stale >= 1,
  workerMsRecorded: staleSnapshot.jobs.workerLastMs === 1.234 && Number.isFinite(staleSnapshot.jobs.roundtripLastMs),
};
const generationKeyBody = appCode.match(/function s07GenerationKey\\(\\) \\{([\\s\\S]*?)\\n  \\}/)?.[1] || '';
const integration = {
  generationKeyIgnoresDetail: !generationKeyBody.includes('state.solution.detail'),
  detailCommandDoesNotRebuild: appCode.includes('command === "detail"') && appCode.includes('applyMode(state.mode); updateCamera();'),
  updatePassesFineEnabled: appCode.includes('state.s07.chunks.update({') && appCode.includes('enabled: fineEnabled'),
  bootDoesNotForceSampleFine: !/makeBuildings\(\);\s*updateS07Chunks\(true\);/.test(appCode),
  applyModeRefreshesChunkAdmission: /function applyMode\([\s\S]*updateS07Chunks\(false\);[\s\S]*updateDisclosure\(\);/.test(appCode),
};
const result = { schema: 's07-engine-fixtures/v1', valid: { triangleEstimate: valid.triangleEstimate, integrityVerified: valid.integrityVerified }, invalid: cases, allInvalidRejected: cases.every(c => c.rejected), chunks, allChunkFixturesPassed: Object.values(chunks).every(Boolean), integration, allIntegrationFixturesPassed: Object.values(integration).every(Boolean) };
fs.writeFileSync('outputs/tayninh-data-batch-04/governance/S07-ENGINE-FIXTURES.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.allInvalidRejected || !result.allChunkFixturesPassed || !result.allIntegrationFixturesPassed) process.exit(1);
