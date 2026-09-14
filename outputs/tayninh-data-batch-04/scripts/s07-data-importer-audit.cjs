#!/usr/bin/env node
/* Independent QA-only audit for B04S07Importer. */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");
const B04 = path.join(ROOT, "outputs/tayninh-data-batch-04");
const IMPORTER_PATH = path.join(B04, "static/s07-importer.js");
const RECEIPT_PATH = path.join(B04, "derived/s07/importer-audit.json");

function sha256(bytes) {
  return crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

function loadImporter() {
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
    crypto: crypto.webcrypto,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(IMPORTER_PATH, "utf8"), sandbox, { filename: IMPORTER_PATH });
  if (!sandbox.B04S07Importer) throw new Error("B04S07Importer export missing");
  return sandbox.B04S07Importer;
}

function sourceRecord(overrides = {}) {
  return {
    kind: "modelled",
    units: "metres",
    crs: "canonical_scene_m",
    vertical_datum: "none",
    date: "2026-09-14",
    resolution: "synthetic fixture",
    bounds: [0, -2, 2, 0],
    nodata: null,
    rights: "synthetic QA fixture",
    sourcehash: "0".repeat(64),
    quality: "QA fixture, not source data",
    coverage: "single synthetic feature",
    available: false,
    ...overrides,
  };
}

function pad4(bytes, pad = 0x20) {
  const extra = (4 - (bytes.length % 4)) % 4;
  const out = new Uint8Array(bytes.length + extra);
  out.set(bytes);
  out.fill(pad, bytes.length);
  return out;
}

function makeGlb(options = {}) {
  const positions = options.positions || [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
  const indices = options.indices || [0, 1, 2];
  const positionComponentType = options.positionComponentType || 5126;
  const indexComponentType = options.indexComponentType || 5123;
  const indexAccessorType = options.indexAccessorType || "SCALAR";
  const positionAccessorType = options.positionAccessorType || "VEC3";
  const sparsePosition = Boolean(options.sparsePosition);
  const externalBuffer = Boolean(options.externalBuffer);
  const primitiveMode = options.primitiveMode;
  const declaredBufferByteLengthDelta = options.declaredBufferByteLengthDelta || 0;
  const positionByteOffset = options.positionByteOffset || 0;
  const indexByteOffsetDelta = options.indexByteOffsetDelta || 0;

  const posBytes = new Uint8Array(positions.length * 12);
  const posDv = new DataView(posBytes.buffer);
  positions.flat().forEach((v, i) => posDv.setFloat32(i * 4, v, true));
  const idxByteSize = indexComponentType === 5125 ? 4 : indexComponentType === 5121 ? 1 : 2;
  const idxBytes = new Uint8Array(indices.length * idxByteSize);
  const idxDv = new DataView(idxBytes.buffer);
  indices.forEach((v, i) => {
    if (indexComponentType === 5125) idxDv.setUint32(i * 4, v, true);
    else if (indexComponentType === 5121) idxDv.setUint8(i, v);
    else idxDv.setUint16(i * 2, v, true);
  });
  const binRaw = new Uint8Array(posBytes.length + idxBytes.length);
  binRaw.set(posBytes, 0);
  binRaw.set(idxBytes, posBytes.length);
  const bin = options.unalignedBinChunk ? binRaw : pad4(binRaw, 0x00);
  const primitive = { attributes: { POSITION: 0 }, indices: 1 };
  if (primitiveMode !== undefined) primitive.mode = primitiveMode;
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binRaw.length + declaredBufferByteLengthDelta }],
    bufferViews: [
      { buffer: 0, byteOffset: positionByteOffset, byteLength: posBytes.length },
      { buffer: 0, byteOffset: posBytes.length + indexByteOffsetDelta, byteLength: idxBytes.length },
    ],
    accessors: [
      { bufferView: 0, componentType: positionComponentType, count: positions.length, type: positionAccessorType },
      { bufferView: 1, componentType: indexComponentType, count: indices.length, type: indexAccessorType },
    ],
    meshes: [{ primitives: [primitive] }],
  };
  if (sparsePosition) json.accessors[0].sparse = { count: 1, indices: { bufferView: 1, componentType: 5123 }, values: { bufferView: 0 } };
  if (externalBuffer) json.buffers[0].uri = "external.bin";
  const jsonRaw = new TextEncoder().encode(JSON.stringify(json));
  const jsonChunk = options.unalignedJsonChunk ? jsonRaw : pad4(jsonRaw, 0x20);
  const chunks = [];
  chunks.push({ type: 0x4e4f534a, bytes: jsonChunk });
  if (!options.omitBinChunk) chunks.push({ type: 0x004e4942, bytes: bin });
  const total = 12 + chunks.reduce((n, c) => n + 8 + c.bytes.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  out.set([0x67, 0x6c, 0x54, 0x46], 0);
  dv.setUint32(4, options.version || 2, true);
  dv.setUint32(8, options.declaredLength || total, true);
  let off = 12;
  for (const chunk of chunks) {
    dv.setUint32(off, options.chunkLengthOverride || chunk.bytes.length, true);
    dv.setUint32(off + 4, chunk.type, true);
    off += 8;
    out.set(chunk.bytes, off);
    off += chunk.bytes.length;
  }
  return out;
}

function mutate(bytes, fn) {
  const copy = new Uint8Array(bytes);
  fn(copy, new DataView(copy.buffer));
  return copy;
}

function validRaster(source = sourceRecord()) {
  return { width: 2, height: 2, bands: 1, transform: [0, 1, 0, 0, 0, -1], source };
}

function validSceneGeo(source = sourceRecord()) {
  return {
    type: "FeatureCollection",
    source,
    features: [
      { type: "Feature", id: "g1", properties: { stable_id: "g1" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, -1], [0, -1], [0, 0]]] } },
    ],
  };
}

function validWgsGeo(source = sourceRecord({ crs: "EPSG:4326", bounds: [106.34, 11.08, 106.36, 11.1] })) {
  return {
    type: "FeatureCollection",
    origin_wgs84: [106.35, 11.09],
    source,
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    features: [
      { type: "Feature", id: "w1", properties: { stable_id: "w1" }, geometry: { type: "Polygon", coordinates: [[[106.35, 11.09], [106.3501, 11.09], [106.3501, 11.0901], [106.35, 11.0901], [106.35, 11.09]]] } },
    ],
  };
}

async function main() {
  const importer = loadImporter();
  const glb = makeGlb();
  const glbHash = sha256(glb);
  const glbSource = sourceRecord({ sourcehash: glbHash });

  const tests = [];
  const add = (name, severity, expect, fn) => tests.push({ name, severity, expect, fn });

  add("positive_glb_parse_model_valid_triangle_sha", "P0", "accept", async () => importer.parseGlbModel(glb, glbSource));
  add("positive_geojson_scene_polygon", "P0", "accept", () => importer.parseGeoJSONFootprints(validSceneGeo()));
  add("positive_geojson_wgs84_polygon", "P0", "accept", () => importer.parseGeoJSONFootprints(validWgsGeo()));
  add("positive_raster_metadata_affine_bounds", "P0", "accept", () => importer.parseRasterMetadata(validRaster()));

  add("glb_truncated_bytes_rejected", "P0", "reject", () => importer.parseGlbHeader(glb.slice(0, 18), glbSource));
  add("glb_chunk_exceeds_file_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ chunkLengthOverride: 999999 }), glbSource));
  add("glb_chunk_alignment_rejected", "P1", "reject", () => importer.parseGlbHeader(makeGlb({ unalignedJsonChunk: true }), glbSource));
  add("glb_accessor_offset_outside_bin_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ positionByteOffset: 9999 }), glbSource));
  add("glb_position_component_type_uint16_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ positionComponentType: 5123 }), glbSource));
  add("glb_index_accessor_vec3_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ indexAccessorType: "VEC3" }), glbSource));
  add("glb_index_out_of_range_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ indices: [0, 1, 8] }), glbSource));
  add("glb_nonfinite_position_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ positions: [[0, 0, 0], [Infinity, 0, 0], [0, 1, 0]] }), glbSource));
  add("glb_degenerate_triangle_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ positions: [[0, 0, 0], [1, 0, 0], [2, 0, 0]] }), glbSource));
  add("glb_sparse_accessor_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ sparsePosition: true }), glbSource));
  add("glb_external_buffer_rejected", "P0", "reject", () => importer.parseGlbHeader(makeGlb({ externalBuffer: true }), glbSource));
  add("glb_tamper_hash_rejected", "P0", "reject", () => importer.parseGlbModel(glb, sourceRecord({ sourcehash: "f".repeat(64) })));

  add("geojson_unclosed_ring_rejected", "P0", "reject", () => {
    const g = validSceneGeo(); g.features[0].geometry.coordinates = [[[0, 0], [1, 0], [1, -1], [0, -1]]]; return importer.parseGeoJSONFootprints(g);
  });
  add("geojson_bowtie_selfintersection_rejected", "P0", "reject", () => {
    const g = validSceneGeo(); g.features[0].geometry.coordinates = [[[0, 0], [1, -1], [1, 0], [0, -1], [0, 0]]]; return importer.parseGeoJSONFootprints(g);
  });
  add("geojson_duplicate_ids_rejected", "P1", "reject", () => {
    const g = validSceneGeo(); g.features.push(JSON.parse(JSON.stringify(g.features[0]))); return importer.parseGeoJSONFootprints(g);
  });
  add("geojson_nonfinite_coordinate_rejected", "P0", "reject", () => {
    const g = validSceneGeo(); g.features[0].geometry.coordinates[0][1][0] = "NaN"; return importer.parseGeoJSONFootprints(g);
  });
  add("geojson_unknown_crs_rejected", "P0", "reject", () => importer.parseGeoJSONFootprints(validSceneGeo(sourceRecord({ crs: "EPSG:32648" }))));
  add("geojson_holes_rejected", "P0", "reject", () => {
    const g = validSceneGeo(); g.features[0].geometry.coordinates.push([[0.2, -0.2], [0.4, -0.2], [0.4, -0.4], [0.2, -0.4], [0.2, -0.2]]); return importer.parseGeoJSONFootprints(g);
  });
  add("geojson_multipolygon_rejected", "P0", "reject", () => {
    const g = validSceneGeo(); g.features[0].geometry = { type: "MultiPolygon", coordinates: [] }; return importer.parseGeoJSONFootprints(g);
  });

  add("raster_singular_affine_rejected", "P0", "reject", () => importer.parseRasterMetadata({ ...validRaster(), transform: [0, 1, 0, 0, 2, 0] }));
  add("raster_affine_bounds_mismatch_rejected", "P0", "reject", () => importer.parseRasterMetadata({ ...validRaster(), source: sourceRecord({ bounds: [0, -3, 2, 0] }) }));
  add("raster_width_height_bounds_mismatch_rejected", "P0", "reject", () => importer.parseRasterMetadata({ ...validRaster(), width: 3 }));
  add("future_available_true_rejected", "P0", "reject", () => importer.requireSource(sourceRecord({ available: true })));

  const results = [];
  for (const test of tests) {
    try {
      const value = await test.fn();
      results.push({
        name: test.name,
        severity: test.severity,
        expected: test.expect,
        actual: "accepted",
        passed: test.expect === "accept",
        detail: summarize(value),
      });
    } catch (error) {
      results.push({
        name: test.name,
        severity: test.severity,
        expected: test.expect,
        actual: "rejected",
        passed: test.expect === "reject",
        error: String(error && error.message || error),
      });
    }
  }

  const failed = results.filter(r => !r.passed);
  const receipt = {
    schema: "tayninh-s07-importer-audit/v1",
    generated_at: process.env.S07_AUDIT_GENERATED_AT || new Date().toISOString(),
    importer_path: path.relative(ROOT, IMPORTER_PATH),
    importer_sha256: sha256(fs.readFileSync(IMPORTER_PATH)),
    importer_version: importer.VERSION,
    status: failed.length ? "FAIL" : "PASS",
    counts: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      positives: results.filter(r => r.expected === "accept").length,
      negatives: results.filter(r => r.expected === "reject").length,
      failed_p0: failed.filter(r => r.severity === "P0").length,
      failed_p1: failed.filter(r => r.severity === "P1").length,
    },
    valid_glb_fixture: {
      positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      indices_uint16: [0, 1, 2],
      byte_length: glb.byteLength,
      sha256: glbHash,
      expected_triangle_estimate: 1,
    },
    results,
    open_findings: failed.map(r => ({
      name: r.name,
      severity: r.severity,
      expected: r.expected,
      actual: r.actual,
      blocker: ["P0", "P1"].includes(r.severity),
      message: r.error || "invalid fixture was accepted",
    })),
    note: "QA-only Node audit. It does not edit product importer code and is not browser/GPU evidence.",
  };
  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({
    status: receipt.status,
    counts: receipt.counts,
    receipt: path.relative(ROOT, RECEIPT_PATH),
    open_findings: receipt.open_findings,
  }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}

function summarize(value) {
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of ["schema", "kind", "count", "coordinateMode", "width", "height", "bands", "triangleEstimate", "integrityVerified", "sha256", "primitiveCount", "meshCount"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) out[key] = value[key];
  }
  return out;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
