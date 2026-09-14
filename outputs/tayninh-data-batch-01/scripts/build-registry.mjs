import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const batchRoot = path.resolve(new URL("..", import.meta.url).pathname);
const reviewRoot = path.resolve(batchRoot, "..", "review-gia-loc");
const args = new Set(process.argv.slice(2));
const useFixture = args.has("--fixture");
const strict = args.has("--strict");
const outArg = process.argv.find((arg) => arg.startsWith("--out="));
const inputRootArg = process.argv.find((arg) => arg.startsWith("--input-root="));
const outPath = path.resolve(batchRoot, outArg ? outArg.slice("--out=".length) : "registry/data-registry.json");
const defaultInputRoot = useFixture ? "registry/fixtures" : "sources";
const inputRoot = path.resolve(batchRoot, inputRootArg ? inputRootArg.slice("--input-root=".length) : defaultInputRoot);

const INPUTS = useFixture
  ? [
      { kind: "local", path: "registry/fixtures/local-records.json" },
      { kind: "global", path: "registry/fixtures/global-records.json" }
    ]
  : [
      { kind: "local", path: path.join(inputRoot, "local-records.json") },
      { kind: "global", path: path.join(inputRoot, "global-records.json") }
    ];

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
const FALLBACK_AOI = {
  label: "Tay Ninh / Gia Loc broad validation envelope until official ward geometry is acquired",
  bbox: [105.7, 10.7, 106.6, 11.9],
  official_geometry: null,
  source: "fallback",
  fallback: true
};

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

function sha256(relativePath) {
  const fullPath = path.resolve(batchRoot, relativePath);
  return createHash("sha256").update(readFileSync(fullPath)).digest("hex");
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(batchRoot, inputPath);
}

function readJson(inputPath) {
  const fullPath = resolveInputPath(inputPath);
  if (!existsSync(fullPath)) return { missing: true, data: [] };
  return { missing: false, data: JSON.parse(readFileSync(fullPath, "utf8")) };
}

function displayPath(inputPath) {
  const fullPath = resolveInputPath(inputPath);
  const relative = path.relative(batchRoot, fullPath);
  return relative.startsWith("..") ? fullPath : relative;
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
  const headers = headerRow.map((header) => header.replace(/^\uFEFF/, ""));
  return dataRows
    .filter((dataRow) => dataRow.length === headers.length)
    .map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index]])));
}

function readQuestions() {
  const inventoryPath = path.resolve(reviewRoot, "question-inventory.csv");
  if (!existsSync(inventoryPath)) return { questions: [], byId: {} };
  const questions = parseCsv(readFileSync(inventoryPath, "utf8"));
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
  return { questions, byId };
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

function readAoi() {
  const aoiPath = path.join(inputRoot, "aoi.json");
  if (!existsSync(aoiPath)) return FALLBACK_AOI;
  const aoi = JSON.parse(readFileSync(aoiPath, "utf8"));
  const bbox = aoi.bbox ?? aoi.bboxWGS84 ?? aoi.extent?.bbox ?? bboxFromGeoJson(aoi);
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some((number) => typeof number !== "number")) {
    throw new Error(`AOI_BBOX_INVALID:${displayPath(aoiPath)}`);
  }
  return {
    ...aoi,
    bbox,
    source: displayPath(aoiPath),
    fallback: false
  };
}

function validateRecord(record, inputKind, questionById, aoi) {
  const errors = [];
  const warnings = [];
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) errors.push(`FIELD_MISSING:${field}`);
  }
  if (!STATUS_VALUES.has(record.status)) errors.push(`STATUS_INVALID:${record.status}`);
  if (!Array.isArray(record.requirements)) errors.push("REQUIREMENTS_NOT_ARRAY");
  if (!Array.isArray(record.limitations)) errors.push("LIMITATIONS_NOT_ARRAY");
  if (!record.snapshot) {
    errors.push("SNAPSHOT_MISSING");
  } else {
    const snapshotPath = path.resolve(batchRoot, record.snapshot);
    if (!existsSync(snapshotPath)) {
      errors.push("SNAPSHOT_FILE_NOT_FOUND");
    } else {
      const actual = sha256(record.snapshot);
      if (record.snapshot_sha256 !== actual) errors.push("SNAPSHOT_HASH_MISMATCH");
      const snapshotText = readFileSync(snapshotPath, "utf8");
      if (!record.evidence_span || !snapshotText.includes(record.evidence_span)) errors.push("EVIDENCE_SPAN_NOT_FOUND");
    }
  }
  if (record.status === "acquired") {
    if (!record.local_file) {
      errors.push("ACQUIRED_LOCAL_FILE_MISSING");
    } else {
      const localPath = path.resolve(batchRoot, record.local_file);
      if (!existsSync(localPath)) {
        errors.push("ACQUIRED_LOCAL_FILE_NOT_FOUND");
      } else {
        const actual = sha256(record.local_file);
        if (record.local_sha256 !== actual) errors.push("ACQUIRED_LOCAL_HASH_MISMATCH");
      }
    }
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
  for (const requirement of Array.isArray(record.requirements) ? record.requirements : []) {
    if (/^[23]D-/.test(requirement) && !questionById[requirement]) warnings.push(`QUESTION_ID_UNKNOWN:${requirement}`);
  }
  return {
    id: record.id ?? null,
    input_kind: inputKind,
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function coverage(records, questions, reviewGroups) {
  const questionHits = new Map();
  const groupHits = new Map();
  const reviewHits = new Map();
  for (const record of records) {
    if (record.status !== "acquired") continue;
    for (const requirement of record.requirements ?? []) {
      if (/^R\d{2}$/.test(requirement)) reviewHits.set(requirement, (reviewHits.get(requirement) ?? 0) + 1);
      if (/^[23]D-/.test(requirement)) {
        questionHits.set(requirement, (questionHits.get(requirement) ?? 0) + 1);
        const [doc, group] = requirement.split("-");
        const key = `${doc}-${group}`;
        groupHits.set(key, (groupHits.get(key) ?? 0) + 1);
      }
    }
  }
  return {
    review_groups_total: reviewGroups.length,
    review_groups_touched_by_acquired: [...reviewHits.keys()].sort(),
    questions_total: questions.length,
    questions_touched_by_acquired: [...questionHits.keys()].sort(),
    document_groups_touched_by_acquired: [...groupHits.keys()].sort()
  };
}

function main() {
  const { questions, byId } = readQuestions();
  const reviewGroups = readReviewGroups();
  const aoi = readAoi();
  const inputReports = [];
  const records = [];
  for (const input of INPUTS) {
    const loaded = readJson(input.path);
    inputReports.push({ ...input, path: displayPath(input.path), exists: !loaded.missing, count: loaded.data.length });
    for (const record of loaded.data) records.push({ ...record, input_kind: input.kind });
  }
  records.sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const validations = records.map((record) => validateRecord(record, record.input_kind, byId, aoi));
  const errors = validations.flatMap((validation) => validation.errors.map((error) => `${validation.id}:${error}`));
  const statusCounts = { acquired: 0, candidate: 0, blocked: 0, missing: 0 };
  for (const record of records) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
  statusCounts.missing = inputReports.filter((input) => !input.exists).length;
  const registry = {
    schema: "rtr.tayninh.data_registry.v1",
    generated: "deterministic-build",
    mode: useFixture ? "fixture" : "source-records",
    aoi,
    input_reports: inputReports,
    status_counts: statusCounts,
    review_groups: reviewGroups,
    records,
    validations,
    coverage: coverage(records, questions, reviewGroups),
    missing_readiness_note: "No record is ready unless it is acquired, has verified local bytes, a verified snapshot, and mapped requirements."
  };
  writeFileSync(outPath, `${stableStringify(registry)}\n`);
  if (errors.length && (strict || records.length > 0)) {
    console.error(errors.join("\n"));
    process.exit(2);
  }
  console.log(`registry ${registry.mode}: ${records.length} records, ${errors.length} validation errors -> ${path.relative(process.cwd(), outPath)}`);
}

main();
