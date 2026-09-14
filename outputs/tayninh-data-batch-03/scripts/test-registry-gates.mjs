import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const batchRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptPath = path.resolve(batchRoot, "scripts/build-registry.mjs");

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd: batchRoot, encoding: "utf8" });
}

function expectPass(name, result) {
  if (result.status !== 0) throw new Error(`${name} expected pass, got ${result.status}\n${result.stderr}`);
}

function expectFail(name, result, gate) {
  if (result.status !== 2 || !result.stderr.includes(gate)) throw new Error(`${name} expected ${gate}, got ${result.status}\n${result.stderr}`);
}

function makeFixture(mutator = () => {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "batch03-registry-gate-"));
  const sources = path.join(dir, "sources");
  const raw = path.join(dir, "raw");
  const derived = path.join(dir, "derived");
  mkdirSync(sources);
  mkdirSync(raw);
  mkdirSync(derived);
  const snapshot = path.join(sources, "snapshot.html");
  const local = path.join(raw, "epoch-b.tif");
  const derivative = path.join(derived, "candidate-change.geojson");
  writeFileSync(snapshot, "<p>Fixture temporal layer has candidate change pixels after alignment.</p>");
  writeFileSync(local, "fixture-local");
  writeFileSync(derivative, JSON.stringify({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { candidate: true },
      geometry: { type: "Polygon", coordinates: [[[106.34, 11.09], [106.341, 11.09], [106.341, 11.091], [106.34, 11.091], [106.34, 11.09]]] }
    }]
  }));
  const record = {
    id: "fixture-temporal",
    publisher: "Fixture",
    title: "Fixture temporal candidate change layer",
    url: "https://example.test/temporal",
    status: "acquired",
    snapshot: path.relative(batchRoot, snapshot),
    snapshot_sha256: sha256(snapshot),
    local_file: path.relative(batchRoot, local),
    local_sha256: sha256(local),
    license: "Fixture license",
    license_url: null,
    data_date: "2025-11-30/2026-01-29",
    captured_at: "2026-09-14T00:00:00Z",
    crs: "EPSG:32648",
    vertical_datum: null,
    resolution: "10 m",
    extent: { type: "bbox", bbox: [106.34, 11.09, 106.341, 11.091], scope: "pilot_aoi" },
    evidence_span: "Fixture temporal layer has candidate change pixels after alignment.",
    requirements: ["R04", "2D-L-01"],
    limitations: ["Candidate screening only."],
    input_files: [{ path: path.relative(batchRoot, local), sha256: sha256(local) }],
    derived_files: [{
      path: path.relative(batchRoot, derivative),
      sha256: sha256(derivative),
      role: "candidate_change",
      input_files: [{ path: path.relative(batchRoot, local), sha256: sha256(local) }]
    }],
    temporal_alignment: {
      epochs: ["2025-11-30", "2026-01-29"],
      crs_match: true,
      same_grid: true,
      method: "fixture threshold",
      input_files: [{ path: path.relative(batchRoot, local), sha256: sha256(local) }]
    }
  };
  const temporalRecords = [record];
  const ecosystemRecords = [];
  mutator(temporalRecords, ecosystemRecords, { dir, sources, raw, derived, snapshot, local, derivative });
  writeFileSync(path.join(sources, "temporal-records.json"), JSON.stringify(temporalRecords, null, 2));
  writeFileSync(path.join(sources, "ecosystem-records.json"), JSON.stringify(ecosystemRecords, null, 2));
  return { dir, sources };
}

function withFixture(mutator, callback) {
  const fixture = makeFixture(mutator);
  try {
    return callback(fixture);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
}

withFixture(() => {}, ({ dir, sources }) => {
  expectPass("valid fixture", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]));
});

withFixture((records) => {
  records[0].snapshot_sha256 = "0".repeat(64);
}, ({ dir, sources }) => {
  expectFail("wrong snapshot hash", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "SNAPSHOT_HASH_MISMATCH");
});

withFixture((records) => {
  records[0].evidence_span = "not in snapshot";
}, ({ dir, sources }) => {
  expectFail("missing evidence", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "EVIDENCE_SPAN_NOT_FOUND");
});

withFixture((records) => {
  records.push({ ...records[0] });
}, ({ dir, sources }) => {
  expectFail("duplicate id", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "DUPLICATE_ID");
});

withFixture((records) => {
  records[0].extent.bbox = [10, 10, 11, 11];
}, ({ dir, sources }) => {
  expectFail("aoi mismatch", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "EXTENT_SCOPE_MISMATCH");
});

withFixture((records) => {
  records[0].derived_files[0].input_files[0].sha256 = "1".repeat(64);
}, ({ dir, sources }) => {
  expectFail("derived input mismatch", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "DERIVED_INPUT_HASH_MISMATCH");
});

withFixture((records) => {
  delete records[0].temporal_alignment;
}, ({ dir, sources }) => {
  expectFail("temporal alignment missing", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "TEMPORAL_ALIGNMENT_MISSING");
});

withFixture((records) => {
  records[0].temporal_alignment.input_files[0].sha256 = "2".repeat(64);
}, ({ dir, sources }) => {
  expectFail("temporal lineage mismatch", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "TEMPORAL_INPUT_HASH_MISMATCH");
});

withFixture(() => {}, ({ dir, sources }) => {
  writeFileSync(path.join(sources, "temporal-records.json"), JSON.stringify({ records: [] }, null, 2));
  expectFail("manifest object", run(["--strict", `--source-root=${sources}`, `--out=${path.join(dir, "registry.json")}`]), "MANIFEST_NOT_ARRAY");
});

console.log("batch03 registry gates passed: snapshot hash, evidence, duplicate id, aoi mismatch, derived input mismatch, temporal alignment, temporal lineage, manifest not array");
