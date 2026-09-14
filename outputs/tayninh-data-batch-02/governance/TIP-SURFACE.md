# TIP-SURFACE: Gia Lộc pilot surface enrichment

## HEADER

- TIP-ID: TIP-SURFACE
- Project: Batch 02 — Gia Lộc visual data enrichment before Hera
- Module: Surface land cover and dated optical imagery
- Depends on: Batch 01 `sources/aoi.json`; Batch 02 `governance/BLUEPRINT.md`
- Priority: P0
- Estimated effort: 90–150 minutes

## CONTEXT

- Working directory: `outputs/tayninh-data-batch-02`
- Pilot AOI: Batch 01 bbox `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`, EPSG:4326.
- AOI meaning: an OSM-derived pilot box around relation 14929839, not the official boundary of phường Gia Lộc.
- Reference patterns: Batch 01 `sources/global-records.json`, `registry/RECORD_CONTRACT.json`, and GLOBAL completion report.
- Ownership: only `sources/surface`, `raw/surface`, `derived/surface`, `sources/surface-records.json`, this TIP, and `governance/COMPLETION-SURFACE.md`.

## TASK

Acquire, preserve, subset, and verify two real public geospatial products intersecting the exact pilot AOI:

1. A land-cover raster, prioritizing ESA WorldCover 2021 v200 at 10 m.
2. A dated optical visual, prioritizing a Sentinel-2 Level-2A scene discoverable through a public STAC/API and carrying scene date plus cloud/quality metadata.

Preserve primary-source/license evidence, raw bytes, hashes, and deterministic source-to-derived lineage. Produce browser-consumable clipped derivatives with explicit georeferencing metadata. If a preferred provider fails, use another primary public provider without weakening the evidence or spatial QA requirements.

## SPECIFICATIONS

- Save source catalog/STAC/license snapshots below `sources/surface/` and hash each snapshot.
- Save unmodified provider bytes below `raw/surface/`; never represent a catalog page as acquired data.
- Clip/subset data to the AOI and save outputs below `derived/surface/`.
- Emit a visual PNG and machine-readable georeferencing/QA metadata for every rendered raster. Retain a georeferenced raster derivative where the source format supports it.
- Verify source/derived CRS, bounds, pixel size, nodata, nonempty AOI intersection, and raw/derived SHA-256 values.
- For land cover, report valid/nodata pixel counts and class distribution using the publisher's class codes/names.
- For optical imagery, report product/item ID, acquisition datetime, platform/product level, provider cloud-cover metadata, bands or rendering asset, dimensions, and AOI bounds.
- Record limitations honestly: 10 m satellite/thematic context is not 1 cm orthophoto, legal land use, field validation, or full-ward coverage.
- Write `sources/surface-records.json` as deterministic records consumable by the Batch 02 registry builder.

## ACCEPTANCE CRITERIA

1. Given the Batch 01 pilot bbox, when the land-cover source and derivative are inspected, then both intersect the AOI, the derivative is nonempty, and its CRS, bounds, pixel size, nodata, dimensions, hashes, and class distribution are recorded.
2. Given the same bbox, when the optical source and derivative are inspected, then the selected public item intersects the AOI and records an exact acquisition datetime, cloud/quality metadata, product/platform identity, source assets, hashes, and rendered dimensions/bounds.
3. Given any acquired record, when local files and evidence snapshots are checked, then every referenced path exists and every recorded SHA-256 equals the local bytes.
4. Given every derivative record, when lineage is checked, then its input paths/hashes resolve to the preserved raw source and its spatial extent matches the exact pilot AOI within one output pixel.
5. Given the manifest, when reviewed against the Batch 01 contract, then it distinguishes source snapshots, raw acquired bytes, and derived bytes, and states license/reuse terms plus limitations without unsupported accuracy claims.
6. Given the Completion Report, when all scenarios are counted, then each criterion is marked pass/fail with exact measurements and any provider failure or deviation is documented.

## CONSTRAINTS

- Do not edit Batch 01, the HCMC app, Batch 02 UI/registry/buildings paths, or files owned by other builders.
- Do not add or change project dependencies.
- Do not claim the AOI is an official ward boundary or that satellite products are survey-grade.
- Do not infer cloud-free quality from appearance alone; preserve provider metadata and state its scope.
- Use only inspectable primary/public source URLs and actual acquired bytes.

## DECISIONS LOG

- D-S01: Reuse the approved Batch 02 Blueprint and existing Batch 01 AOI; no additional human checkpoint is required for this bounded builder task.
- D-S02: Prefer provider-native COG/STAC assets and local clipping so source/derived lineage remains auditable.

## REPORT FORMAT

Create `governance/COMPLETION-SURFACE.md` with status, exact files, source identity, QA measurements, acceptance-criterion results, issues, deviations, limitations, and suggestions.
