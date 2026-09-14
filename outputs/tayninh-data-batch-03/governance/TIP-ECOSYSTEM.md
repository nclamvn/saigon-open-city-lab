# TIP-ECOSYSTEM: Gia Lộc vegetation and hydrology enrichment

## HEADER

- TIP-ID: TIP-ECOSYSTEM
- Project: Batch 03 — Gia Lộc Temporal, Vegetation & Hydrology
- Module: Public vegetation/canopy and surface-water history
- Depends on: Batch 01 `sources/aoi.json`; Batch 03 `governance/BLUEPRINT.md`
- Priority: P0
- Estimated effort: 90–180 minutes

## CONTEXT

- Working directory: `outputs/tayninh-data-batch-03`.
- Pilot AOI: `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`, EPSG:4326.
- AOI is an OSM-derived technical bbox, not the official boundary of phường Gia Lộc.
- Ownership is limited to `sources/ecosystem`, `raw/ecosystem`, `derived/ecosystem`, `sources/ecosystem-records.json`, this TIP, and `governance/COMPLETION-ECOSYSTEM.md`.
- Follow the Batch 02 source/raw/derived hash-lineage pattern and top-level manifest-array contract.

## TASK

Acquire and normalize the maximum useful public ecosystem evidence that can be obtained in bounded time while satisfying both minimum deliverables:

1. A nonempty canopy-height or vegetation-structure raster intersecting the AOI. Prefer ETH Global Canopy Height 2020 at 10 m with its uncertainty raster. If it is inaccessible or empty, use an inspectable scientific/official public alternative and document the reason.
2. A nonempty official/scientific historical surface-water raster intersecting the AOI. Prefer JRC Global Surface Water occurrence, seasonality, and change products where available.

Preserve primary documentation and license snapshots, unmodified provider bytes, checksums, exact AOI subsets, browser PNGs, georeferencing metadata, quantitative distributions, and explicit source-to-derived lineage.

## SPECIFICATIONS

- Verify provider tile/index selection from primary metadata or a public bucket listing before acquisition; do not guess filenames without a successful response.
- Save provider documentation, product metadata, tile indexes/listings, and license/reuse evidence under `sources/ecosystem/` with SHA-256.
- Save unmodified downloaded provider assets under `raw/ecosystem/`; catalog-only pages do not count as acquired data.
- Create AOI GeoTIFF and PNG derivatives under `derived/ecosystem/`, with `.pgw` and `.prj` sidecars or equally explicit browser-consumable georeferencing.
- Report source and derivative CRS, bounds, dimensions, pixel size, nodata, valid-pixel counts, min/max/mean and class/distribution statistics appropriate to each product.
- For canopy height, report units, product/model date, finite/nodata distribution, and uncertainty if acquired.
- For surface water, report product date range, occurrence/seasonality/change semantics and class/nodata distribution without converting water history into a flood or drainage conclusion.
- Write `sources/ecosystem-records.json` as a top-level array. Each acquired record must include the Batch 01 fields plus `input_files` and `derived_files` with exact path/hash pairs.
- Validate every referenced file/hash and ensure each acquired source and derivative intersects the pilot AOI.

## ACCEPTANCE CRITERIA

1. Given the pilot AOI, when the vegetation/canopy package is inspected, then at least one real acquired raster has a nonempty AOI subset with product date/model, resolution, units, CRS, bounds, nodata, statistics, license, and raw/derived hashes.
2. Given the preferred ETH dataset, when its companion uncertainty is publicly accessible for the selected source tile, then uncertainty is acquired and normalized; otherwise the specific access/availability result is captured without inventing uncertainty.
3. Given the pilot AOI, when the surface-water package is inspected, then at least one real official/scientific history raster has a nonempty AOI subset with date range, resolution, semantics, CRS, bounds, nodata/classes, license, and raw/derived hashes.
4. Given each browser raster, when its sidecars and manifest are checked, then the PNG can be placed at the recorded AOI bounds and its pixel-aligned extent contains the AOI within one native source pixel in the source CRS.
5. Given any manifest file reference, when SHA-256 is recomputed, then the local bytes exist and the recorded hash matches; each derived record names its exact raw input path/hash.
6. Given the Completion Report, when claims are audited, then canopy is not described as individual-tree inventory or urban LiDAR, and water history is not described as a calibrated flood, drainage, rainfall-runoff, or hydrologic-elevation model.

## CONSTRAINTS

- Do not edit Batch 01, Batch 02, HCMC PoC, Batch 03 temporal, registry, workbench, static assets, or files owned by other builders.
- Do not add or change project dependencies.
- Do not claim official ward coverage, survey accuracy, individual trees, dense LiDAR, flood extent, drainage capacity, or calibrated hydrologic behavior.
- Do not expose missing/unknown uncertainty, dates, units, or license terms as inferred facts.
- Do not count a provider catalog or failed download as acquired data.

## DECISIONS LOG

- D-E01: Reuse the approved Blueprint and Batch 01 AOI; no extra checkpoint is needed for this bounded Builder task.
- D-E02: Prefer full provider tiles plus local pixel-aligned clipping so raw provenance and derivatives remain independently reproducible.
- D-E03: Acquire multiple JRC water-history dimensions when the public tile pattern is verified and download cost remains modest.

## REPORT FORMAT

Create `governance/COMPLETION-ECOSYSTEM.md` with status, exact files, source selection/fallbacks, product semantics, QA measurements, acceptance-criterion results, issues, deviations, limitations, and suggestions.
