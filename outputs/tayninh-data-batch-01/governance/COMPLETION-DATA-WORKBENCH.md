# Completion - Data Workbench Builder

Builder: data_workbench replacing failed leadership_ui. Date: 2026-09-14.

Completed within assigned scope:

- Added `registry/RECORD_CONTRACT.json` for planning_sources, geometry_audit, and future Hera payload intake.
- Added deterministic registry builder at `scripts/build-registry.mjs`.
- Added `--input-root=` support so tests and alternate source manifests never need to overwrite `sources/local-records.json` or `sources/global-records.json`.
- Added AOI loading from `sources/aoi.json` when present, including `bbox`, `bboxWGS84`, `extent.bbox`, or GeoJSON-derived bbox; the broad Tay Ninh / Gia Loc envelope is now only an explicit fallback.
- Added adversarial validation tests at `scripts/test-registry-gates.mjs`.
- Added fixture source records, snapshots, and local GeoJSON bytes under `registry/fixtures/`.
- Added static workbench at `index.html` with `static/workbench.css` and `static/workbench.js`.
- Updated the workbench UI to Vietnamese leadership-facing copy: Gia Lộc Data Workbench, Đã thu / Ứng viên / Bị chặn / Đầu vào thiếu metrics, AOI panel labelled vùng mẫu không phải ranh phường, status filter, search, source/evidence/rights/time/CRS-resolution/limits/local-file fields, validation status, responsive layout, and fetch error state.
- Built current honest registry at `registry/data-registry.json`.
- Built fixture registry at `registry/fixture-output.json`.

Validation performed:

```text
node outputs/tayninh-data-batch-01/scripts/build-registry.mjs --fixture --strict --out=registry/fixture-output.json
PASS: registry fixture: 2 records, 0 validation errors

node outputs/tayninh-data-batch-01/scripts/build-registry.mjs --strict --out=registry/data-registry.json
PASS: registry source-records: 18 records, 0 validation errors

node outputs/tayninh-data-batch-01/scripts/test-registry-gates.mjs
PASS: wrong hash, missing snapshot, acquired without local file, fallback scope mismatch, aoi scope mismatch, evidence missing

node --check outputs/tayninh-data-batch-01/static/workbench.js
PASS

node -e "const r=require('./outputs/tayninh-data-batch-01/registry/data-registry.json'); console.log(JSON.stringify({aoi:r.aoi,status_counts:r.status_counts,input_reports:r.input_reports}, null, 2))"
PASS: aoi.source is sources/aoi.json, aoi.fallback is false, bbox is [106.3276338, 11.0830401, 106.3576338, 11.1130401], status_counts is 7 acquired, 9 candidate, 2 blocked, 0 missing.

rg -n "Gia Lộc Data Workbench|Đã thu|Ứng viên|Bị chặn|Đầu vào thiếu|vùng mẫu|không phải ranh phường|Tìm kiếm|Validation|Không tải được" outputs/tayninh-data-batch-01/index.html outputs/tayninh-data-batch-01/static/workbench.js outputs/tayninh-data-batch-01/static/workbench.css
PASS: all required UI labels and fetch-error copy present.

find outputs/tayninh-data-batch-01/registry -maxdepth 2 -name '*test-output*' -print
PASS: no leftover adversarial test output files.
```

Current real-data state:

- `sources/local-records.json`: present and validated through the registry builder.
- `sources/global-records.json`: present and validated through the registry builder.
- `sources/aoi.json`: present and used for validation bbox.
- `registry/data-registry.json`: 18 records: 7 acquired, 9 candidate, 2 blocked, 0 missing inputs, 0 validation errors.
- Requirement inventory loaded from `outputs/review-gia-loc/question-inventory.csv`: 237 questions.
- Review matrix loaded from `outputs/review-gia-loc/DOI-CHIEU-GIA-LOC-VA-CITY-LAB.md`: 23 review groups.
- Acquired data currently touches 6 review groups (`R01`, `R02`, `R03`, `R12`, `R14`, `R20`) and 4 question IDs (`2D-C-01`, `2D-G-01`, `3D-C-01`, `3D-F-01`).

Known limits:

- Fixture data is only for validator/workbench tests and does not claim official ward coverage, real source acquisition, 1 cm ortho readiness, LiDAR readiness, or payload-derived measurement accuracy.
- The HTML workbench reads `registry/data-registry.json`; rerun `node outputs/tayninh-data-batch-01/scripts/build-registry.mjs --out=registry/data-registry.json` after other builders add real source records.
- Direct agent messaging tools were not available in this subagent toolset; the shared contract is saved in the filesystem at `registry/RECORD_CONTRACT.json`.
