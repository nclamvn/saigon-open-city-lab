# Completion - Batch 02 Workbench

Builder: batch02_workbench. Date: 2026-09-14.

Completed in owned scope:

- Added Batch 02 deterministic registry builder: `scripts/build-registry.mjs`.
- Added Batch 02 adversarial bites: `scripts/test-registry-gates.mjs`.
- Added local key-free visual workbench: `index.html`, `static/workbench.css`, `static/workbench.js`.
- Added governance TIP and this completion report.
- Imported Batch 01 registry history without mutating Batch 01 records.
- Consumed Batch 02 `sources/building-records.json` and `sources/surface-records.json`.
- Rendered AOI context with Batch 01 roads, water and elevation; Batch 02 building polygons; WorldCover land-cover PNG; Sentinel-2 optical PNG; Sentinel-2 SCL quality PNG.
- Fixed Contractor review items: Batch 01 link prefixing, SVG image rendering with AOI/bbox placement, rendered_count vs feature_count, AOI clipPath for full OSM ways, and `MANIFEST_NOT_ARRAY` gate.
- Reopened after browser QA and fixed final layer behavior: base rasters render first, optional elevation renders above them, roads/water/buildings render on top, QA JSON is excluded from map layers, and default visible layers are Sentinel-2 true-colour + roads + water + buildings.

Final registry state:

```text
node outputs/tayninh-data-batch-02/scripts/build-registry.mjs --strict --out=registry/data-registry.json
PASS: batch02 registry: 22 records (4 batch02), 0 validation errors
```

Records:

- Total records: 22.
- Status counts: 10 acquired, 9 candidate, 3 blocked, 0 missing.
- Batch 02 records: 4.
- Batch 02 acquired records: Microsoft building footprints, ESA WorldCover land-cover, Sentinel-2 visual/SCL.
- Building layer: 657 total polygons, 350 rendered in SVG for performance.
- Surface image layers: WorldCover PNG, Sentinel-2 true-colour PNG, Sentinel-2 SCL PNG.

Coverage:

- Review groups touched by acquired data: `R02`, `R04`, `R05`, `R06`, `R12`, `R13`, `R14`, `R20`.
- Question IDs touched by acquired data: `2D-B-01`, `3D-C-01`, `3D-F-01`.
- Document groups touched: `2D-B`, `3D-C`, `3D-F`.

Validation gates:

```text
node outputs/tayninh-data-batch-02/scripts/test-registry-gates.mjs
PASS: source hash, evidence, duplicate id, aoi mismatch, derived input mismatch, manifest not array

node --check outputs/tayninh-data-batch-02/scripts/build-registry.mjs
PASS

node --check outputs/tayninh-data-batch-02/static/workbench.js
PASS
```

Integration checks:

```text
rg -n "clipPath|<image|recordHref|rendered_count|feature_count|MANIFEST_NOT_ARRAY|recordInputs" \
  outputs/tayninh-data-batch-02/scripts/build-registry.mjs \
  outputs/tayninh-data-batch-02/static/workbench.js \
  outputs/tayninh-data-batch-02/scripts/test-registry-gates.mjs
PASS: Batch01 href prefixing, AOI clipPath, SVG image rendering, rendered/total counts, MANIFEST_NOT_ARRAY and record-level input lineage are present.

node - <<'NODE'
...assert registry.map.layers...
PASS:
- map layers are ordered `landcover > quality > optical > elevation > roads > water > buildings`.
- QA/report derivatives are not present as map layers.
- default ON layers are `Sentinel-2 true-colour`, `Batch 01 OSM roads`, `Batch 01 OSM water`, `Microsoft building footprints`.
- default OFF layers include `WorldCover land-cover`, `Sentinel-2 SCL quality`, `Batch 01 Copernicus DEM context`.
- building layer exposes `feature_count: 657` and `rendered_count: 350`.
NODE
```

Local HTTP workbench QA:

```text
python3 -m http.server 8793 --bind 127.0.0.1 --directory outputs/tayninh-data-batch-02
PASS after approval outside sandbox.

GET /index.html
PASS: HTTP 200

GET /static/workbench.js
PASS: HTTP 200

GET /registry/data-registry.json
PASS: HTTP 200

HEAD /derived/surface/worldcover-2021-aoi.png
PASS: HTTP 200, image/png, Content-Length 16537

HEAD /derived/surface/sentinel-2-20251130-aoi-tci.png
PASS: HTTP 200, image/png, Content-Length 244992

HEAD /derived/surface/sentinel-2-20251130-aoi-scl.png
PASS: HTTP 200, image/png, Content-Length 5942
```

Important limitations preserved in UI and registry:

- AOI is an OSM-derived pilot sample, not an official ward boundary.
- Public satellite visual layers are not 1 cm orthophotos.
- Batch 02 does not claim LiDAR, survey-grade DTM/DSM, cadastral authority, official planning authority, or measured building heights.
- Batch 01 imported records are preserved history and marked as not revalidated in Batch 02.
