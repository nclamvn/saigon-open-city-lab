import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const batchRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptPath = path.resolve(batchRoot, "scripts/build-registry.mjs");
const fixtureLocal = path.resolve(batchRoot, "registry/fixtures/local-records.json");
const fixtureGlobal = path.resolve(batchRoot, "registry/fixtures/global-records.json");

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: batchRoot,
    encoding: "utf8"
  });
}

function expectPass(name, result) {
  if (result.status !== 0) {
    throw new Error(`${name} expected pass, got ${result.status}\n${result.stderr}`);
  }
}

function expectFail(name, result, gate) {
  if (result.status !== 2 || !result.stderr.includes(gate)) {
    throw new Error(`${name} expected ${gate}, got status ${result.status}\n${result.stderr}`);
  }
}

function withMutatedSources(mutator, options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "tayninh-registry-gate-"));
  const sourceDir = path.join(dir, "sources");
  mkdirSync(sourceDir);
  const local = JSON.parse(readFileSync(fixtureLocal, "utf8"));
  const global = JSON.parse(readFileSync(fixtureGlobal, "utf8"));
  mutator(local, global);
  writeFileSync(path.join(sourceDir, "local-records.json"), JSON.stringify(local, null, 2));
  writeFileSync(path.join(sourceDir, "global-records.json"), JSON.stringify(global, null, 2));
  if (options.aoiBbox) {
    writeFileSync(
      path.join(sourceDir, "aoi.json"),
      JSON.stringify(
        {
          label: "Temporary adversarial AOI",
          bbox: options.aoiBbox,
          official_geometry: null
        },
        null,
        2
      )
    );
  }
  try {
    return run(["--strict", `--input-root=${sourceDir}`, `--out=${path.join(dir, "test-output.json")}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

expectPass("valid fixture", run(["--fixture", "--strict", "--out=registry/fixture-output.json"]));

expectFail(
  "wrong hash",
  withMutatedSources((local) => {
    local[0].snapshot_sha256 = "0".repeat(64);
  }),
  "SNAPSHOT_HASH_MISMATCH"
);

expectFail(
  "missing snapshot",
  withMutatedSources((local) => {
    local[0].snapshot = "registry/fixtures/snapshots/does-not-exist.html";
  }),
  "SNAPSHOT_FILE_NOT_FOUND"
);

expectFail(
  "acquired without local file",
  withMutatedSources((local) => {
    local[0].local_file = null;
  }),
  "ACQUIRED_LOCAL_FILE_MISSING"
);

expectFail(
  "scope mismatch",
  withMutatedSources((local) => {
    local[0].extent.bbox = [10, 10, 11, 11];
  }),
  "EXTENT_SCOPE_MISMATCH"
);

expectFail(
  "aoi scope mismatch",
  withMutatedSources((local) => {
    local[0].extent.bbox = [106.14, 11.04, 106.17, 11.07];
  }, { aoiBbox: [105, 9, 105.1, 9.1] }),
  "EXTENT_SCOPE_MISMATCH"
);

expectFail(
  "evidence missing",
  withMutatedSources((local) => {
    local[0].evidence_span = "This sentence is not in the snapshot.";
  }),
  "EVIDENCE_SPAN_NOT_FOUND"
);

console.log("registry gate tests passed: wrong hash, missing snapshot, acquired without local file, fallback scope mismatch, aoi scope mismatch, evidence missing");
