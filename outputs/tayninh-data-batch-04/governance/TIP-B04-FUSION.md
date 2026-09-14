# TIP-B04-FUSION — Deterministic 2.5D scene data

Priority: P0  
Owner: Builder `local_data_recovery`  
Dependencies: Batches 01–03 local artifacts  
Owned paths: `outputs/tayninh-data-batch-04/scripts/`, `derived/fusion/`, `governance/COMPLETION-B04-FUSION.md`

## Task

Implement a deterministic Python compiler that emits the scene-data contract in `BLUEPRINT.md`. Use the Copernicus DEM AOI window, Microsoft building footprints, OSM roads/water, ETH canopy and uncertainty, and JRC water rasters already acquired. Compute local-metre coordinates, sample terrain bases, classify missing building heights using a documented deterministic area rule, sample canopy sparsely enough for instancing, and retain every nonzero JRC water cell.

Write `fusion-qa.json` with counts, distributions, bounds, source/output hashes, and explicit nonclaims. Do not download new data or edit prior batches.

## Acceptance criteria

- Compiler rebuild produces byte-stable scene content except a separately excluded timestamp, or uses a fixed source-derived generation timestamp.
- All source paths exist and hashes match before compiling; mismatch fails loudly.
- Terrain contains finite values and retains real min/max/mean.
- All usable building footprints are present; all have `height_method=area_class_proxy_no_source_height` and no measured-height claim.
- Roads/water are clipped or filtered to the AOI and follow sampled terrain.
- Canopy samples include modeled height and uncertainty; labels state raster sample, not individual tree.
- All nonzero JRC occurrence cells are retained with aligned seasonality/change values when available.
- Completion Report lists files, exact commands, counts, tests, deviations, and limitations.

