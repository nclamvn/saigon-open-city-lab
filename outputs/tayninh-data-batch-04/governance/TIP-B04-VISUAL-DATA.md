# TIP-B04-VISUAL-DATA — Preserve native imagery and canopy evidence

Owner: Builder `local_data_recovery`. Contractor `/root`. Priority: P1 visual honesty.
User 2026-09-14 reports poor imagery and unrealistic regularly spaced green tree dots.

## Decision

Existing Sentinel derivative is 330×334 at native 10 m; current RGB is sampled to DEM109×109 then magnified. Current canopy geometry is one oversized cone per stride6 raster sample, not a real tree. Correct source-preservation and representation within approved Batch04 scope. User critique authorizes the fix; no extra Blueprint gate. No invented trees, super-resolution, downloaded commercial basemap or changed upstream artifacts.

## Ownership

Create `scripts/prepare_visual_layers.py`, its focused validation if needed, `derived/visual/` and `governance/COMPLETION-B04-VISUAL-DATA.md`. Do not change earlier batches, existing scene-data or compiler, app.js, HTML or CSS.

## Task

Prepare deterministic, spatially registered native-scale Sentinel RGB and full canopy-height/uncertainty field from local verified TIFFs. Preserve the original 10 m information independently of DEM tessellation; no 109×109 color downsample. Keep source native sampling or reproject at no coarser than nominal10m, declare interpolation/nodata and actual output dimensions. Terrain frame must reflect DEM bbox in localAOI metre coordinates, with x east/z north and source pixel center semantics. Verify source raster transforms; use pyproj/rasterio if available or equivalent proven transforms, not raw envelope stretching.

Agree additive `derived/visual/visual-data.json` contract with ENGINE promptly: schema, source hashes/metadata, terrain frame, imagery path/dimensions/registration, continuous canopy field with heights and uncertainty/coverage, method/nonclaim. Existing3412 sample records remain intact for traceability, but new field is not individual-tree inventory. Evidence outside coverage remains absent/nodata. No cosmetic jitter/random individual-tree placement.

## Acceptance

- VDATA-R01: Full-scale real Sentinel information retained; exact inputs/hashes/dimensions/date/resolution recorded.
- VDATA-R02: Texture/height field registered to DEM/OSM frame; north/south, corners and pixel centers independently checked; no clamped fake coverage.
- VDATA-R03: Canopy continuous field derived from actual ETH raster, retaining units, uncertainty and nodata; no invented geometry measurements.
- VDATA-R04: Deterministic rebuild and focused validations pass, Completion and additive contract supplied to ENGINE.

Coordinate via collaboration messages; Contractor independently runs data checks and browser QA.
