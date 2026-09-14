# COMPLETION BUILDINGS — Batch 02 Gia Lộc public building footprints

STATUS: DONE

FILES CHANGED:
- governance/TIP-BUILDINGS.md
- sources/buildings/microsoft-2026-08-13-dataset-links.csv
- sources/buildings/microsoft-globalmlbuildingfootprints-readme.md
- sources/buildings/microsoft-globalmlbuildingfootprints-license.txt
- sources/buildings/provider-crosscheck-attempts.json
- raw/buildings/microsoft-vietnam-132230111.csv.gz
- derived/buildings/microsoft-vietnam-132230111-aoi.geojson
- derived/buildings/microsoft-vietnam-132230111-aoi-qa.json
- sources/building-records.json (top-level Batch 01 contract-compatible record array)
- governance/COMPLETION-BUILDINGS.md

SOURCE AND ACQUISITION:
- Source: Microsoft Global ML Building Footprints, release 2026-08-13.
- Dataset row: Vietnam quadkey 132230111, 185.5MB, upload date 2026-08-13.
- README evidence: 1.4B buildings from Bing Maps imagery between 2014 and 2024, CDLA Permissive 2.0.
- Raw gzip: raw/buildings/microsoft-vietnam-132230111.csv.gz, SHA-256 77638b74e1cbabf7d9895251ab8539e51413be40a5c0fe42b86fe352c0e1f1a2, 194537400 bytes.
- Derived GeoJSON: derived/buildings/microsoft-vietnam-132230111-aoi.geojson, SHA-256 74be4a0ae5962dc8672d67e09361dc41222105b1bae97bf472fa9225dc2b6ff7, 380701 bytes.

NORMALIZATION / QA:
- AOI: [106.3276338, 11.0830401, 106.3576338, 11.1130401], EPSG:4326, OSM-derived pilot only.
- Source lines parsed: 2305243.
- Source candidates by bbox: 657.
- Derived feature count: 657.
- Geometry types: {"Polygon":657}.
- Invalid/empty geometries: 0; validation found 0 unclosed/zero-area/outside-AOI derived rings.
- Derived bounds: [106.34764410699349,11.0830401,106.3576338,11.1130401].
- Area field: area_m2 present on all 657 features; min 12.79 m2, max 3289.7 m2, total 111042.5 m2.
- Height: height_m null on all 657 features because Microsoft source height is -1 placeholder; no measured height is claimed.
- Confidence: confidence null on all 657 features because Microsoft source confidence is -1 placeholder; source_confidence_raw preserves -1.
- Western sparsity: Microsoft-derived bounds start at lon 106.34764410699349, while AOI west is 106.3276338, leaving 0.02001030699348 degrees (~2186 m at AOI latitude) of western AOI span without Microsoft footprints. This is recorded as source detection/coverage sparsity only, not absence of real buildings.

SECOND PROVIDER CROSS-CHECK:
- Attempted Overture via AWS S3 listing/curl and temporary DuckDB install; blocked by endpoint/tooling/time and then cancelled per Contractor request to prioritize completion.
- Attempted Google Open Buildings prefix check; prefix returned HTTP 404 and no shard URL was resolved within bounded time.
- These are blocked attempts, not acquired datasets and not evidence of absence.

EXACT COMMANDS RUN:

```bash
sed -n '1,260p' outputs/tayninh-data-batch-02/governance/BLUEPRINT.md
sed -n '1,220p' outputs/tayninh-data-batch-01/sources/aoi.json
sed -n '1,620p' outputs/tayninh-data-batch-01/sources/local-records.json
curl -L -sS 'https://bfppub.blob.core.windows.net/$web/2026-08-13/dataset-links.csv' -o outputs/tayninh-data-batch-02/sources/buildings/microsoft-2026-08-13-dataset-links.csv
curl -L -sS 'https://raw.githubusercontent.com/microsoft/GlobalMLBuildingFootprints/main/README.md' -o outputs/tayninh-data-batch-02/sources/buildings/microsoft-globalmlbuildingfootprints-readme.md
curl -L -sS 'https://raw.githubusercontent.com/microsoft/GlobalMLBuildingFootprints/main/LICENSE' -o outputs/tayninh-data-batch-02/sources/buildings/microsoft-globalmlbuildingfootprints-license.txt
rg -n '132230111|Vietnam|Viet' outputs/tayninh-data-batch-02/sources/buildings/microsoft-2026-08-13-dataset-links.csv
curl -L --fail --retry 3 --retry-delay 2 'https://bfppub.z5.web.core.windows.net/2026-08-13/global-buildings.geojsonl/RegionName=Vietnam/quadkey=132230111/part-00184-110f5303-ff85-4c71-a2bf-c6070024fec8.c000.csv.gz' -o outputs/tayninh-data-batch-02/raw/buildings/microsoft-vietnam-132230111.csv.gz
node - <<'NODE'  # stream-decompressed gzip, bbox-filtered, Sutherland-Hodgman clipped to AOI, wrote derived GeoJSON + QA
# inline normalizer used in the build turn; outputs are validated below
NODE
gzip -t outputs/tayninh-data-batch-02/raw/buildings/microsoft-vietnam-132230111.csv.gz
shasum -a 256 outputs/tayninh-data-batch-02/raw/buildings/microsoft-vietnam-132230111.csv.gz outputs/tayninh-data-batch-02/derived/buildings/microsoft-vietnam-132230111-aoi.geojson outputs/tayninh-data-batch-02/derived/buildings/microsoft-vietnam-132230111-aoi-qa.json
node - <<'NODE'  # validated derived feature count, rings, outside-AOI vertices, height/confidence/area fields
# inline validator used in the build turn
NODE
aws s3 ls --no-sign-request s3://overturemaps-us-west-2/release/ | tail -20
curl -I -L 'https://overturemaps-us-west-2.s3.amazonaws.com/release/'
curl -I -L 'https://storage.googleapis.com/open-buildings-data/v3/polygons_s2_level_4_gzip/'
pip3 install --target /tmp/buildings_py duckdb==1.1.3  # cancelled after Contractor prioritized manifest/completion
```

ACCEPTANCE CRITERIA:
- AC1 PASS: Acquired Microsoft raw gzip is nonempty and derived layer has 657 clipped footprint polygons intersecting AOI.
- AC2 PASS: Source dataset-links, README/license snapshots, raw bytes and hashes are saved.
- AC3 PASS: Derived GeoJSON is browser-consumable FeatureCollection, EPSG:4326, clipped to exact AOI; validation found 0 outside-AOI vertices.
- AC4 PASS: QA reports feature count, geometry type, invalid/empty count, bounds, area field, height/confidence fields and confidence limitation. Height is null because source provides -1 placeholder, not measured height.
- AC5 PASS: sources/building-records.json is a top-level Batch 01 contract-compatible record array; it records Microsoft as acquired and second-provider attempts as blocked, with required fields, hashes/evidence, and derived_files lineage.
- AC6 PASS: Completion report lists commands and AC pass/fail.

DEVIATIONS:
- Overture/Google were attempted only as bounded cross-checks after Microsoft sparsity was found; no second-provider acquired layer was produced. This does not affect R01 because Microsoft satisfies required acquisition.
- The normalizer was executed as an inline Node command rather than saved as a reusable script because this Builder owns only building data artifacts in Batch 02.

LIMITATIONS:
- AOI is not official ward boundary or full coverage.
- Microsoft ML footprints are not cadastral/survey-grade and must not be treated as authoritative building inventory.
- No real-world absence is inferred from Microsoft no-footprint areas, especially the western AOI span.


INTEGRATION GATE PATCH:
- Converted sources/building-records.json from an object with records[] to a top-level record array using Batch 01 required fields.
- Added derived_files lineage entries for GeoJSON and QA with input_files pointing to the raw Microsoft gzip.
- Corrected manifest requirements to map to the 23 Gia Lộc review groups in outputs/review-gia-loc/DOI-CHIEU-GIA-LOC-VA-CITY-LAB.md: Microsoft acquired record uses R04/R05/R06/R13/R20; blocked second-provider cross-check uses R04/R05/R13/R20.
