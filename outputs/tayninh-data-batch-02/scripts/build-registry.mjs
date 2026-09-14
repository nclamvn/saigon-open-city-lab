import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const batchRoot = path.resolve(new URL("..", import.meta.url).pathname);
const batch01Root = path.resolve(batchRoot, "..", "tayninh-data-batch-01");
const reviewRoot = path.resolve(batchRoot, "..", "review-gia-loc");
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const sourceRootArg = process.argv.find((arg) => arg.startsWith("--source-root="));
const batch01Arg = process.argv.find((arg) => arg.startsWith("--batch01-root="));
const outPath = path.resolve(batchRoot, outArg ? outArg.slice("--out=".length) : "registry/data-registry.json");
const sourceRoot = path.resolve(batchRoot, sourceRootArg ? sourceRootArg.slice("--source-root=".length) : "sources");
const activeBatch01Root = path.resolve(batchRoot, batch01Arg ? batch01Arg.slice("--batch01-root=".length) : path.relative(batchRoot, batch01Root));

const REQUIRED_FIELDS = [
  "id",
  "publisher",
  "title",
  "url",
  "status",
  "snapshot",
  "snapshot_sha256",
  "local_file",
  "local_sha256",
  "license",
  "license_url",
  "data_date",
  "captured_at",
  "crs",
  "vertical_datum",
  "resolution",
  "extent",
  "evidence_span",
  "requirements",
  "limitations"
];
const STATUS_VALUES = new Set(["acquired", "candidate", "blocked"]);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Absolute(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function readJsonAbsolute(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function existsJson(file) {
  if (!existsSync(file)) return { exists: false, data: [] };
  return { exists: true, data: readJsonAbsolute(file) };
}

function displayPath(file) {
  const relative = path.relative(batchRoot, file);
  return relative.startsWith("..") ? file : relative;
}

function resolveRecordPath(recordPath, root = batchRoot) {
  if (!recordPath) return null;
  return path.isAbsolute(recordPath) ? recordPath : path.resolve(root, recordPath);
}

function bboxIntersects(left, right) {
  return left[0] <= right[2] && left[2] >= right[0] && left[1] <= right[3] && left[3] >= right[1];
}

function bboxFromGeoJson(value) {
  const points = [];
  function visit(node) {
    if (!node) return;
    if (Array.isArray(node) && typeof node[0] === "number" && typeof node[1] === "number") {
      points.push([node[0], node[1]]);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node.type === "FeatureCollection") {
      for (const feature of node.features ?? []) visit(feature.geometry);
    } else if (node.type === "Feature") {
      visit(node.geometry);
    } else if (node.coordinates) {
      visit(node.coordinates);
    }
  }
  visit(value);
  if (!points.length) return null;
  return [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1]))
  ];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headerRow, ...dataRows] = rows;
  const headers = (headerRow ?? []).map((header) => header.replace(/^\uFEFF/, ""));
  return dataRows
    .filter((dataRow) => dataRow.length === headers.length)
    .map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index]])));
}

function readQuestions() {
  const inventoryPath = path.resolve(reviewRoot, "question-inventory.csv");
  if (!existsSync(inventoryPath)) return { questions: [], byId: {} };
  const questions = parseCsv(readFileSync(inventoryPath, "utf8"));
  return { questions, byId: Object.fromEntries(questions.map((question) => [question.id, question])) };
}

function readReviewGroups() {
  const reportPath = path.resolve(reviewRoot, "DOI-CHIEU-GIA-LOC-VA-CITY-LAB.md");
  if (!existsSync(reportPath)) return [];
  return readFileSync(reportPath, "utf8")
    .split("\n")
    .filter((line) => /^\| R\d{2} \|/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return { id: cells[0], title: cells[1] ?? null, status: cells[2] ?? null, gap: cells[3] ?? null };
    });
}

function normalizeDerived(record) {
  const candidates = [
    ...(Array.isArray(record.derived_files) ? record.derived_files : []),
    ...(Array.isArray(record.derivatives) ? record.derivatives : []),
    ...(Array.isArray(record.browser_files) ? record.browser_files : [])
  ];
  if (record.derived_file || record.derived_sha256) {
    candidates.push({
      path: record.derived_file,
      sha256: record.derived_sha256,
      type: record.derived_type,
      role: record.derived_role,
      input_files: record.derived_inputs
    });
  }
  return candidates.map((item, index) => ({
    index,
    path: item.path ?? item.file ?? item.local_file ?? item.href ?? null,
    sha256: item.sha256 ?? item.hash ?? item.local_sha256 ?? null,
    type: item.type ?? item.kind ?? item.layer_type ?? null,
    role: item.role ?? item.layer ?? item.name ?? null,
    input_files: item.input_files ?? item.inputs ?? item.source_files ?? item.lineage ?? []
  }));
}

function normalizeInputs(inputs) {
  if (!Array.isArray(inputs)) return [];
  return inputs.map((input) => ({
    path: typeof input === "string" ? input : input.path ?? input.file ?? input.local_file ?? null,
    sha256: typeof input === "string" ? null : input.sha256 ?? input.hash ?? input.local_sha256 ?? null
  }));
}

function validateHash(file, expected, code, errors) {
  if (!file) {
    errors.push(`${code}_MISSING`);
    return;
  }
  if (!existsSync(file)) {
    errors.push(`${code}_FILE_NOT_FOUND`);
    return;
  }
  const actual = sha256Absolute(file);
  if (expected !== actual) errors.push(`${code}_HASH_MISMATCH`);
}

function validateRecord(record, manifestKind, aoi, questionById) {
  const errors = [];
  const warnings = [];
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) errors.push(`FIELD_MISSING:${field}`);
  }
  if (!STATUS_VALUES.has(record.status)) errors.push(`STATUS_INVALID:${record.status}`);
  if (!Array.isArray(record.requirements)) errors.push("REQUIREMENTS_NOT_ARRAY");
  if (!Array.isArray(record.limitations)) errors.push("LIMITATIONS_NOT_ARRAY");

  const snapshotPath = resolveRecordPath(record.snapshot);
  if (!record.snapshot) {
    errors.push("SNAPSHOT_MISSING");
  } else if (!existsSync(snapshotPath)) {
    errors.push("SNAPSHOT_FILE_NOT_FOUND");
  } else {
    const actual = sha256Absolute(snapshotPath);
    if (record.snapshot_sha256 !== actual) errors.push("SNAPSHOT_HASH_MISMATCH");
    const snapshotText = readFileSync(snapshotPath, "utf8");
    if (!record.evidence_span || !snapshotText.includes(record.evidence_span)) errors.push("EVIDENCE_SPAN_NOT_FOUND");
  }

  if (record.status === "acquired") {
    validateHash(resolveRecordPath(record.local_file), record.local_sha256, "ACQUIRED_LOCAL", errors);
  }

  if (record.extent && Array.isArray(record.extent.bbox)) {
    if (record.extent.bbox.length !== 4 || record.extent.bbox.some((number) => typeof number !== "number")) {
      errors.push("EXTENT_BBOX_INVALID");
    } else if (record.extent.scope !== "global" && record.extent.scope !== "catalog" && !bboxIntersects(record.extent.bbox, aoi.bbox)) {
      errors.push("EXTENT_SCOPE_MISMATCH");
    }
  } else if (record.status === "acquired") {
    errors.push("ACQUIRED_EXTENT_MISSING");
  }

  const derivedFiles = normalizeDerived(record);
  const recordInputs = normalizeInputs(record.input_files);
  if (record.status === "acquired" && manifestKind !== "batch01" && derivedFiles.length === 0) {
    errors.push("DERIVED_MISSING");
  }
  for (const derived of derivedFiles) {
    validateHash(resolveRecordPath(derived.path), derived.sha256, "DERIVED", errors);
    const inputs = normalizeInputs(derived.input_files);
    const effectiveInputs = inputs.length ? inputs : recordInputs;
    if (effectiveInputs.length === 0) {
      errors.push("DERIVED_INPUTS_MISSING");
    }
    for (const input of effectiveInputs) {
      validateHash(resolveRecordPath(input.path), input.sha256, "DERIVED_INPUT", errors);
    }
  }

  for (const requirement of Array.isArray(record.requirements) ? record.requirements : []) {
    if (/^[23]D-/.test(requirement) && !questionById[requirement]) warnings.push(`QUESTION_ID_UNKNOWN:${requirement}`);
  }
  return {
    id: record.id ?? null,
    manifest_kind: manifestKind,
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function importBatch01() {
  const registryPath = path.resolve(activeBatch01Root, "registry/data-registry.json");
  if (!existsSync(registryPath)) {
    return { registry: null, records: [], report: { kind: "batch01", path: displayPath(registryPath), exists: false, count: 0 } };
  }
  const registry = readJsonAbsolute(registryPath);
  const records = (registry.records ?? []).map((record) => ({
    ...record,
    source_batch: "batch01",
    provenance_history: {
      imported_from: displayPath(registryPath),
      imported_record_sha256: createHash("sha256").update(stableStringify(record)).digest("hex"),
      history_status: "preserved"
    }
  }));
  return { registry, records, report: { kind: "batch01", path: displayPath(registryPath), exists: true, count: records.length } };
}

function readManifest(name, kind) {
  const manifestPath = path.join(sourceRoot, name);
  const loaded = existsJson(manifestPath);
  if (loaded.exists && !Array.isArray(loaded.data)) {
    return {
      records: [],
      report: {
        kind,
        path: displayPath(manifestPath),
        exists: true,
        count: 0,
        errors: ["MANIFEST_NOT_ARRAY"]
      }
    };
  }
  const records = (loaded.data ?? []).map((record) => ({ ...record, source_batch: "batch02", manifest_kind: kind }));
  return { records, report: { kind, path: displayPath(manifestPath), exists: loaded.exists, count: records.length, errors: [] } };
}

function coverage(records, questions, reviewGroups) {
  const acquired = records.filter((record) => record.status === "acquired");
  const questionHits = new Set();
  const groupHits = new Set();
  const reviewHits = new Set();
  for (const record of acquired) {
    for (const requirement of record.requirements ?? []) {
      if (/^R\d{2}$/.test(requirement)) reviewHits.add(requirement);
      if (/^[23]D-/.test(requirement)) {
        questionHits.add(requirement);
        const [doc, group] = requirement.split("-");
        groupHits.add(`${doc}-${group}`);
      }
    }
  }
  return {
    review_groups_total: reviewGroups.length,
    review_groups_touched_by_acquired: [...reviewHits].sort(),
    questions_total: questions.length,
    questions_touched_by_acquired: [...questionHits].sort(),
    document_groups_touched_by_acquired: [...groupHits].sort()
  };
}

function simplifyLine(points, limit = 80) {
  if (points.length <= limit) return points;
  const step = Math.ceil(points.length / limit);
  const simplified = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (simplified[simplified.length - 1] !== last) simplified.push(last);
  return simplified;
}

function linesFromOverpass(file, tagKey, maxFeatures) {
  if (!existsSync(file)) return [];
  const json = readJsonAbsolute(file);
  return (json.elements ?? [])
    .filter((element) => Array.isArray(element.geometry) && (!tagKey || element.tags?.[tagKey]))
    .slice(0, maxFeatures)
    .map((element) => ({
      id: element.id,
      tags: element.tags ?? {},
      coordinates: simplifyLine(element.geometry.map((point) => [point.lon, point.lat]))
    }));
}

function countPolygonFeatures(value) {
  let count = 0;
  function visitGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      count += 1;
    } else if (geometry.type === "MultiPolygon") {
      count += geometry.coordinates?.length ?? 0;
    } else if (geometry.type === "Feature") {
      visitGeometry(geometry.geometry);
    } else if (geometry.type === "FeatureCollection") {
      for (const feature of geometry.features ?? []) visitGeometry(feature);
    }
  }
  visitGeometry(value);
  return count;
}

function polygonRingsFromGeoJson(value, maxFeatures = 350) {
  const features = [];
  function visitGeometry(geometry, properties = {}) {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      features.push({ properties, rings: geometry.coordinates.slice(0, 1) });
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates) features.push({ properties, rings: polygon.slice(0, 1) });
    } else if (geometry.type === "Feature") {
      visitGeometry(geometry.geometry, geometry.properties ?? {});
    } else if (geometry.type === "FeatureCollection") {
      for (const feature of geometry.features ?? []) {
        if (features.length >= maxFeatures) break;
        visitGeometry(feature, feature.properties ?? {});
      }
    }
  }
  visitGeometry(value);
  return features.slice(0, maxFeatures);
}

function mapLayerFromDerived(record, derived, roleFallback) {
  const fullPath = resolveRecordPath(derived.path);
  if (!fullPath || !existsSync(fullPath)) return null;
  const ext = path.extname(fullPath).toLowerCase();
  const role = [derived.role, derived.type, roleFallback, record.manifest_kind].filter(Boolean).join(" ").toLowerCase();
  if (/\bqa\b|qa_report|quality_report|inspection|world_file|\bprj\b|crs/.test(role)) return null;
  const layerLabel = (() => {
    const identity = `${record.id} ${record.title}`.toLowerCase();
    if (identity.includes("microsoft-buildings")) return "Microsoft building footprints";
    if (identity.includes("worldcover")) return "WorldCover land-cover";
    if (identity.includes("sentinel") && /quality|scl/.test(role)) return "Sentinel-2 SCL quality";
    if (identity.includes("sentinel") && /visual/.test(role)) return "Sentinel-2 true-colour";
    return derived.role ?? record.title;
  })();
  if ([".geojson", ".json"].includes(ext)) {
    try {
      const json = readJsonAbsolute(fullPath);
      const polygons = polygonRingsFromGeoJson(json);
      if (polygons.length) {
        return {
          id: `${record.id}:${derived.index}`,
          kind: role.includes("building") ? "buildings" : role.includes("land") || role.includes("surface") ? "landcover" : "vector",
          label: layerLabel,
          record_id: record.id,
          path: displayPath(fullPath),
          feature_count: countPolygonFeatures(json),
          rendered_count: polygons.length,
          polygons
        };
      }
      const bbox = json.bbox ?? json.bounds ?? bboxFromGeoJson(json);
      if (bbox) {
        return {
          id: `${record.id}:${derived.index}`,
          kind: role.includes("optical") ? "optical" : role.includes("land") ? "landcover" : "raster-context",
          label: layerLabel,
          record_id: record.id,
          path: displayPath(fullPath),
          bbox,
          summary: json.summary ?? json.stats ?? json
        };
      }
    } catch {
      return null;
    }
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) {
    const bbox = record.extent?.bbox ?? derived.bbox ?? null;
    const isSentinelOptical = /sentinel/i.test(`${record.id} ${record.title}`) && /visual/i.test(role) && !/quality|scl/i.test(role);
    const isQuality = /quality|scl/.test(role);
    const isWorldCover = /worldcover/i.test(`${record.id} ${record.title}`);
    return {
      id: `${record.id}:${derived.index}`,
      kind: role.includes("optical") || isSentinelOptical ? "optical" : isQuality ? "quality" : isWorldCover || role.includes("land") || role.includes("surface") ? "landcover" : "image",
      label: layerLabel,
      record_id: record.id,
      path: displayPath(fullPath),
      bbox,
      image: displayPath(fullPath)
    };
  }
  return null;
}

function buildMap(records, batch01Registry) {
  const aoi = batch01Registry?.aoi ?? {};
  const roadsPath = path.resolve(activeBatch01Root, "raw/local/osm-highway.json");
  const waterPath = path.resolve(activeBatch01Root, "raw/local/osm-water.json");
  const elevationPath = path.resolve(activeBatch01Root, "derived/global/copdem-glo30-aoi-inspection.json");
  const derivedLayers = [];
  for (const record of records.filter((item) => item.source_batch === "batch02" && item.status === "acquired")) {
    for (const derived of normalizeDerived(record)) {
      const layer = mapLayerFromDerived(record, derived, record.manifest_kind);
      if (layer) derivedLayers.push(layer);
    }
  }
  const layerRank = { landcover: 10, quality: 11, optical: 12, elevation: 20, roads: 30, water: 31, buildings: 40 };
  derivedLayers.sort((left, right) => (layerRank[left.kind] ?? 50) - (layerRank[right.kind] ?? 50) || String(left.id).localeCompare(String(right.id)));
  const baseDerivedLayers = derivedLayers.filter((layer) => layer.kind !== "buildings");
  const buildingLayers = derivedLayers.filter((layer) => layer.kind === "buildings");
  return {
    aoi_bbox: aoi.bbox ?? aoi.bboxWGS84 ?? null,
    aoi_label: aoi.label ?? "Gia Loc pilot AOI",
    warning: "Vung mau, khong phai ranh phuong.",
    layers: [
      ...baseDerivedLayers,
      {
        id: "batch01-elevation",
        kind: "elevation",
        label: "Batch 01 Copernicus DEM context",
        source: displayPath(elevationPath),
        summary: existsSync(elevationPath) ? readJsonAbsolute(elevationPath) : null
      },
      {
        id: "batch01-roads",
        kind: "roads",
        label: "Batch 01 OSM roads",
        source: displayPath(roadsPath),
        features: linesFromOverpass(roadsPath, "highway", 260)
      },
      {
        id: "batch01-water",
        kind: "water",
        label: "Batch 01 OSM water",
        source: displayPath(waterPath),
        features: linesFromOverpass(waterPath, null, 30)
      },
      ...buildingLayers
    ]
  };
}

function main() {
  const { questions, byId } = readQuestions();
  const reviewGroups = readReviewGroups();
  const imported = importBatch01();
  const aoi = imported.registry?.aoi ?? { bbox: null, fallback: true, label: "Batch 01 AOI missing" };
  const buildingManifest = readManifest("building-records.json", "buildings");
  const surfaceManifest = readManifest("surface-records.json", "surface");
  const batch02Records = [...buildingManifest.records, ...surfaceManifest.records];
  const allRecords = [...imported.records, ...batch02Records].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const validations = [];
  const idCounts = new Map();
  for (const record of allRecords) idCounts.set(record.id, (idCounts.get(record.id) ?? 0) + 1);
  for (const record of imported.records) {
    validations.push({ id: record.id, manifest_kind: "batch01", ok: true, errors: [], warnings: ["BATCH01_HISTORY_IMPORTED_NOT_REVALIDATED"] });
  }
  for (const record of batch02Records) {
    const validation = validateRecord(record, record.manifest_kind, aoi, byId);
    if (idCounts.get(record.id) > 1) validation.errors.push("DUPLICATE_ID");
    validation.ok = validation.errors.length === 0;
    validations.push(validation);
  }
  const inputReports = [imported.report, buildingManifest.report, surfaceManifest.report];
  const manifestErrors = inputReports.flatMap((report) => (report.errors ?? []).map((error) => `${report.kind}:${error}`));
  const statusCounts = { acquired: 0, candidate: 0, blocked: 0, missing: 0 };
  for (const record of allRecords) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
  statusCounts.missing = inputReports.filter((report) => !report.exists).length;
  const errors = [
    ...manifestErrors,
    ...validations.flatMap((validation) => validation.errors.map((error) => `${validation.id}:${error}`))
  ];
  const registry = {
    schema: "rtr.tayninh.batch02.registry.v1",
    generated: "deterministic-build",
    batch: "02",
    aoi,
    input_reports: inputReports,
    status_counts: statusCounts,
    review_groups: reviewGroups,
    records: allRecords,
    validations,
    coverage: coverage(allRecords, questions, reviewGroups),
    map: buildMap(allRecords, imported.registry),
    readiness_note: "Only Batch 02 acquired records with verified source, raw and derived hashes are visual-ready. Batch 01 records are preserved history."
  };
  writeFileSync(outPath, `${stableStringify(registry)}\n`);
  if (errors.length && (strict || batch02Records.length > 0 || manifestErrors.length > 0)) {
    console.error(errors.join("\n"));
    process.exit(2);
  }
  console.log(`batch02 registry: ${allRecords.length} records (${batch02Records.length} batch02), ${errors.length} validation errors -> ${path.relative(process.cwd(), outPath)}`);
}

main();
