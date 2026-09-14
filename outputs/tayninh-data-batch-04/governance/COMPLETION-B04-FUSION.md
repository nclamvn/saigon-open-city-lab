# COMPLETION REPORT — TIP-B04-FUSION

**STATUS:** DONE

Completed 2026-09-14 and refined after centroid audit. The fusion compiler builds a deterministic Batch04 `scene-data.json` from local Batches 01–03 artifacts only. It verifies upstream hashes before compiling, writes fail-loud QA, and preserves all claim boundaries: terrain is COPDEM context, Sentinel is 10 m visual drape, Microsoft building heights are proxy classes, canopy samples are raster samples, and JRC water cells are water-history evidence rather than a flood/drainage model.

## Files changed

Created under owned Batch04 FUSION paths:

- `scripts/compile_fusion_scene.py`
- `scripts/test_fusion_scene.py`
- `derived/fusion/scene-data.json`
- `derived/fusion/fusion-qa.json`
- `governance/COMPLETION-B04-FUSION.md`

No Batch01, Batch02, Batch03, UI, engine, experience, registry-builder, raw-provider, or legacy data files were modified.

## Outputs

| File | Bytes | SHA-256 |
|---|---:|---|
| `scripts/compile_fusion_scene.py` | 32,999 | `4bb102efac3abe77c86a63fd621091019db817ab22fc46bb6d70d0b793f17f2c` |
| `scripts/test_fusion_scene.py` | 4,646 | `f1804c128bf6b0f3bc6834bcbcbce045a0d8b7629f882eb6ddd32883863c4ea6` |
| `derived/fusion/scene-data.json` | 1,394,949 | `20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878` |
| `derived/fusion/fusion-qa.json` | 8,006 | `32180bcae1abb429df03e64ebdbeab3ecd8a48ebf3a662fe99ca63d0a8e17bed` |

## Scene-data contents

`scene-data.json` includes the required top-level contract keys:

```text
schema, generated_at, aoi, sources, disclosure, terrain, buildings, roads, osm_water, canopy_samples, jrc_water_cells, statistics
```

It also includes `temporal_change` as additional local context for the Batch03 Sentinel candidate heatmap.

Counts:

| Layer | Count |
|---|---:|
| Terrain grid | `109 × 109` = `11,881` finite COPDEM cells |
| Buildings | `657` Microsoft footprints |
| Roads | `629` OSM highway ways |
| OSM water | `1` OSM waterway |
| Canopy samples | `3,412` sampled ETH raster cells at stride 6 |
| JRC water cells | `114` cells, matching every nonzero occurrence cell |
| Sources | `13` hashed inputs |

Key statistics:

- Terrain min/mean/max: `5.431 m`, `14.485 m`, `29.576 m`
- Building source height fields: `657/657` null
- Building proxy height rules:
  - `<50 m²`: `154`
  - `50–150 m²`: `241`
  - `150–500 m²`: `238`
  - `>=500 m²`: `24`
- Building footprint area total: `111,042.5 m²`
- Building centroid method: stable shoelace in local metre coordinates.
- Centroid gates: `0` bbox failures, `0` footprint failures, `657/657` buildings checked.
- Legacy raw-lon/lat centroid error versus corrected centroid: median `26.38334 m`, mean `50.374566 m`, max `611.983967 m`, `639/657` greater than `1 m`, `502/657` greater than `10 m`.
- ETH canopy source valid pixels: `119,438`; positive pixels: `119,418`; source mean height: `10.244989 m`
- JRC occurrence water pixels retained: `114/114`
- Batch03 temporal context: `99.199782%` valid comparison pixels; `5,455` strong candidate pixels

## Deterministic methods

- Local coordinates use a tangent-metre approximation centered on the Batch01 AOI center. `x` is east, `z` is north, and `y` is sampled terrain elevation in metres.
- Terrain uses the COPDEM AOI pixel window from Batch01 inspection and includes a Sentinel-2 TCI RGB sample at every terrain cell for draping.
- Building display height uses deterministic area classes only:
  - `<50 m² → 4 m`
  - `50–150 m² → 6 m`
  - `150–500 m² → 9 m`
  - `>=500 m² → 12 m`
- Every building has `height_method="area_class_proxy_no_source_height"`, `source_height_m=null`, and `measured_height=false`.
- Building centroids are computed in translated local-metre coordinates using stable shoelace arithmetic, then converted back to WGS84 only for terrain sampling. The raw lon/lat shoelace method is retained only as an adversarial diagnostic in QA.
- Roads and OSM water are AOI-filtered from Batch01 OSM responses and terrain-sampled along retained vertices.
- Canopy uses every 6th ETH height pixel where height is valid and positive; each instance is labeled `raster_sample_not_individual_tree`.
- JRC water retains every occurrence pixel with value `1..100` and joins seasonality/change values from aligned derivatives.
- `generated_at` is fixed to the source-derived timestamp `2026-09-14T03:45:49Z`; JSON is sorted and compact for byte-stable output.

## Exact commands

Compile:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/compile_fusion_scene.py
```

Byte-stability check:

```bash
shasum -a 256 outputs/tayninh-data-batch-04/derived/fusion/scene-data.json outputs/tayninh-data-batch-04/derived/fusion/fusion-qa.json
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/compile_fusion_scene.py
shasum -a 256 outputs/tayninh-data-batch-04/derived/fusion/scene-data.json outputs/tayninh-data-batch-04/derived/fusion/fusion-qa.json
```

Result: both runs produced identical hashes:

```text
20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878  scene-data.json
32180bcae1abb429df03e64ebdbeab3ecd8a48ebf3a662fe99ca63d0a8e17bed  fusion-qa.json
```

Validate:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/test_fusion_scene.py
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m py_compile outputs/tayninh-data-batch-04/scripts/compile_fusion_scene.py outputs/tayninh-data-batch-04/scripts/test_fusion_scene.py
```

Validation result:

```json
{
  "sources": 13,
  "counts": {
    "buildings": 657,
    "canopy_samples": 3412,
    "jrc_water_cells": 114,
    "osm_water": 1,
    "roads": 629,
    "terrain_cols": 109,
    "terrain_rows": 109
  },
  "errors": []
}
```

## Acceptance criteria

| AC | Result | Evidence |
|---|---|---|
| Deterministic rebuild | PASS | Fixed timestamp, sorted compact JSON, identical `scene-data.json` and `fusion-qa.json` hashes across two runs. |
| Source paths and hashes | PASS | Compiler verifies 13 input hashes before writing scene output; validation script rechecks scene source hashes. |
| Terrain finite and real stats retained | PASS | `11,881` finite COPDEM cells; min `5.431`, mean `14.485`, max `29.576`. |
| All usable buildings present | PASS | `657` buildings match Batch02 QA; every building uses `area_class_proxy_no_source_height`; no measured-height claim. |
| Building centroid refinement | PASS | `657/657` corrected centroids checked; `0` bbox failures; `0` footprint failures; old raw-lon/lat shoelace error median `26.38334 m`, max `611.983967 m`. |
| Roads/water filtered and terrain-following | PASS | `629` OSM road ways and `1` OSM waterway are AOI-filtered and include sampled terrain elevations. |
| Canopy samples with height and uncertainty | PASS | `3,412` positive ETH raster samples include modeled height, predictive standard deviation, and terrain base. |
| JRC nonzero occurrence cells retained | PASS | `114` scene cells equal Batch03 source occurrence water pixels `1..100`. |
| Completion report | PASS | This report lists files, commands, counts, tests, deviations, and limitations. |

## Deviations

- The scene includes `terrain.surface_rgb`, a sampled Sentinel-2 RGB grid aligned to the DEM. This is an additive field to support the Batch04 terrain-drape requirement and does not change the required top-level contract.
- Roads/water are AOI-filtered rather than topologically clipped at the exact AOI boundary. Vertices inside the AOI are retained when available; otherwise intersecting source geometry is preserved to avoid inventing clipped coordinates without a GIS engine.

## Limitations and nonclaims

- The AOI is an OSM-derived pilot bbox, not an official Gia Lộc boundary.
- COPDEM is public 30 m-class context terrain, not surveyed DTM/DSM or airborne LiDAR.
- Sentinel-2 TCI is 10 m visual data, not a 1 cm orthophoto.
- Microsoft footprints are ML-derived and sparse in the western AOI span; absence of footprints is not absence of buildings.
- Building heights are deterministic display proxies from footprint area and must not be used as measured height.
- ETH canopy samples are modeled raster samples, not individual trees.
- JRC water history is remote-sensing evidence, not drainage infrastructure, flood depth, or a calibrated hydraulic model.
- Batch03 temporal-change context is candidate spectral difference only and is not a new-building, construction, or violation detector.
