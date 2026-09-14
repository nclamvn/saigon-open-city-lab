# CONTRACTOR VERIFY — Batch 03

Verified: 2026-09-14  
Contractor: `/root`  
Decision: **READY WITH DEFERRED SURVEY INPUTS**

## Acceptance decision

Batch 03 satisfies all six requirements in `BLUEPRINT.md`:

- **R01 TEMPORAL — PASS.** Acquired Sentinel-2 L2A epoch `2024-12-20` on tile `T48PXT`, aligned it to the Batch 02 `2025-11-30` reference grid, applied SCL/nodata masks, and generated a candidate spectral-change heatmap and mask.
- **R02 VEGETATION — PASS.** Acquired ETH Global Canopy Height 2020 and its predictive-standard-deviation layer. Both contain nonempty data in the AOI and have reproducible AOI derivatives.
- **R03 HYDROLOGY — PASS.** Acquired JRC Global Surface Water v1.5 occurrence, 2024 seasonality, and normalized occurrence change for the correct `100E_20N` tile. AOI derivatives are nonempty.
- **R04 NORMALIZE — PASS.** Raw bytes, source snapshots, AOI numeric rasters, browser PNGs, georeferencing sidecars, statistics, input/output lineage, and SHA-256 values are present.
- **R05 REGISTRY + VISUAL — PASS.** Strict registry imports Batch 02 unchanged and adds three Batch 03 records. The key-free Workbench exposes A/B epochs, candidate change, canopy/uncertainty, and water-history layers beneath vector roads, water, and buildings.
- **R06 VERIFY — PASS.** Independent strict builds, hash recomputation, adversarial gates, HTTP smoke, browser interaction, visual inspection, and runtime-log inspection passed.

## Verified evidence

### Temporal

- Candidate epoch: `S2A_T48PXT_20241220T032629_L2A`; reference epoch: `S2B_T48PXT_20251130T033239_L2A`.
- TCI grid: EPSG:32648, `330 × 334`, 10 m; SCL grid: EPSG:32648, `166 × 167`, 20 m.
- Valid comparison: `109,338 / 110,220` pixels (`99.199782%`).
- Moderate-or-stronger candidate pixels: `10,922` (`9.989208%` of valid); strong pixels: `5,455` (`4.989116%`).
- The result is a Sentinel-resolution spectral-difference candidate layer. It is not a building detector, construction/violation conclusion, or ground truth.

### Vegetation

- ETH canopy AOI: `361 × 361`; `119,438` valid pixels; `10,883` nodata pixels (`8.350918%`).
- Valid canopy range `0–27 m`, mean `10.244989 m`, median `10 m`.
- Predictive-standard-deviation mean `5.969030 m`, median `6 m`; this is model uncertainty, not survey tolerance.
- The layer does not identify individual trees and is not airborne LiDAR.

### Surface-water history

- Correct JRC tile: `100E_20N`, source bounds `[100, 10, 110, 20]`; the initially tested wrong tile was rejected and removed.
- AOI subsets: `121 × 121` at `0.00025°` nominal 30 m.
- Occurrence: `114` water-history pixels, maximum `60%` occurrence.
- 2024 seasonality: `63` pixels with water in at least one month, including `33` permanent-water pixels.
- Normalized occurrence change: `131` comparable pixels; period comparison `1984–1999` versus `2000–2024`.
- These layers do not constitute a drainage, rainfall-runoff, water-depth, or calibrated flood model.

## Registry and gates

Final deterministic registry:

- `25` total records; `3` Batch 03 records.
- `13 acquired`, `9 candidate`, `3 blocked`, `0 missing inputs`.
- `0` validation errors.
- Acquired records touch `10 / 23` review groups: `R02,R04,R05,R06,R10,R12,R13,R14,R18,R20`.
- Acquired records touch `3 / 237` exact questions: `2D-B-01,3D-C-01,3D-F-01`.
- “Touched” means the data contributes evidence; it does not mean the requirement is fully answered.

Adversarial gates passed for snapshot hash, evidence span, duplicate ID, AOI mismatch, derived-input mismatch, missing temporal alignment, temporal lineage mismatch, and non-array manifests.

Seven raw provider rasters were rehashed independently. All SHA-256 values match their manifests; the Sentinel TCI/SCL hashes also match the provider STAC checksums.

## Browser and visual QA

- Workbench loaded from `http://127.0.0.1:8768/tayninh-data-batch-03/` with the canonical registry and all 19 tested page/data assets returning HTTP 200.
- Default map state is epoch B (`2025-11-30`) plus OSM roads, OSM water, and Microsoft building footprints.
- Enabling canopy increases raster images from `1` to `2`; enabling epoch A alongside epoch B also renders `2` raster images. Restoring the controls returns to the documented default state.
- Search `Microsoft` returns `1` visible record; clearing returns `25`. Status `Đã thu` returns `13`; `Tất cả` returns `25`.
- Accessibility tree exposes the filters, A/B controls, 18 layer toggles, dates, resolutions, source links, and limitations.
- Browser runtime warnings/errors after the interaction scenario: `[]`.
- Visual inspection confirmed the epoch images, candidate heatmap/mask, canopy/uncertainty, and water-history PNGs decode and show coherent nonempty spatial patterns.

## Deferred inputs and claim boundary

The AOI remains an OSM-derived technical bbox, not the official phường Gia Lộc boundary. Official boundary, cadastral/planning layers, GCP/CP, true orthophoto near 1 cm, dense airborne LiDAR, survey DTM/DSM, individual-tree inventory, drainage network, calibrated flood model, and field-verified change remain deferred until authoritative sharing or Hera capture.

Package size is approximately `1.1 GB`. No HCMC PoC raw data or prior-batch raw/derived bytes were modified during Batch 03 integration.

## Defect classification

- **P0:** none.
- **P1:** none open. The temporal evidence/alignment manifest and ecosystem requirement mapping were corrected before final verification.
- **P2:** leadership-facing layer labels mix Vietnamese and source-product English; acceptable for the technical Workbench, suitable for a dedicated presentation polish pass later.
