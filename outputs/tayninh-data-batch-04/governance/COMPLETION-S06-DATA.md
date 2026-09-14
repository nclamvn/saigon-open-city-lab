# COMPLETION-S06-DATA

Status: PASS

Implemented `TIP-S06-DATA.md` and `BLUEPRINT-SOLUTION-06.md` as a bounded additive data supplement for the current map. No Batch04 raw/source/fusion/visual artifacts, app code, UI, index, CSS, or C05 source files were modified.

## Outputs

| Path | Role | sha256 |
|---|---|---|
| `DATA-CONTRACT-S06.md` | Engine/UI schema handoff | `3415bfdb1920cf0bb078401898232b867e2e41894f3b708d60496998f0b6effa` |
| `scripts/prepare_solution_layers.py` | deterministic compiler | `b41e397bc7ca52a802c8510c25f00ccf74ca3c5cac944909523522f9ee6363bc` |
| `scripts/test_solution_layers.py` | fail-loud validator | `bb2a90e934d1a0a5dc281c0a8cec3551628de87868a5f64a861569708f0ae3f8` |
| `derived/solution/solution-data.json` | browser-consumable supplement payload | `caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3` |
| `derived/solution/solution-qa.json` | numeric QA and recomputation samples | `952e2de5f90a49c67b9f934a0038db7661ab8b0c99b5ed4fc45304a9a1f25b3a` |
| `governance/AUDIT-S06-ADAPTER.md` | adapter closeout audit | `6b3597bbec0ba6021ee7eedc247e00ce79c5a257a7b59a66ae5399b4ac640cbe` |

Payload size: `2,584,269` bytes. QA size: `23,929` bytes.

## Contract summary

Engine/UI should consume `derived/solution/solution-data.json`, schema `tayninh-s06-solution-data/v1`.

Top-level keys:

- `terrain_profiles.copdem`
- `terrain_profiles.gedtm`
- `coordinate_transform`
- `buildings[]`
- `building_supplements[]`, identical alias for first contract draft consumers
- `building_height_by_id`
- `representative_focus`
- `future_data_adapter`

Important defaults:

- GEDTM is complete over all existing `109 × 109` terrain nodes after corrected pixel-centre sampling and documented nearest-edge kernel fallback for edge nodes.
- Google model heights are aboveground/modelled. `source_height_m` remains `null` and `measured_height` remains `false` for every building.
- S06 building render geometry is canonical: `buildings[].footprint_scene_m` and `buildings[].centroid_scene_m` are emitted from actual B02 Microsoft GeoJSON WGS84 polygons in the visual-data frame.
- Legacy Batch04 scene geometry from `scene-data.json` should use `coordinate_transform.legacy_to_canonical` before visual overlay.
- `future_data_adapter` is contract-only and currently unavailable; it now carries five pending source templates with null provenance placeholders and disabled render policies.

## Verified immutable inputs

The compiler verifies all listed source hashes before processing and fails the run on missing/corrupt input.

Key verified inputs:

- Batch04 fusion scene: `20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878`
- Batch04 visual data: `215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682`
- Batch02 Microsoft raw AOI GeoJSON: `74be4a0ae5962dc8672d67e09361dc41222105b1bae97bf472fa9225dc2b6ff7`
- C05 Google Open Buildings AOI crop: `530761d4d1782b4686a8ebefe1cd785e9328ae79abcca321a775871e17d59897`
- C05 Google Open Buildings QA: `adabfd86ddd4ffb751787fb82f47c5eaefd79835622559c885f608a821299887`
- C05 Google source manifest: `0ee277dd0aae280e6fa0132668112cf2ea6cf627da3b46beda21535eece2addf`
- C05 GEDTM DTM provider window: `ca1fa8593cfb71cba44cfde70b33ec1b6c6c71d7ebdbec45f64642354c0f1c20`
- C05 GEDTM uncertainty provider window: `59f00cb80ad82921b217538fb3c0c356db2e44f7c4d87bfda6a7e6bcf6885727`
- C05 GEDTM QA: `f7127dfcb9039f0e2b24648782fa397f8348b47d766849cbb464db934801157d`

## Terrain supplement

`terrain_profiles.copdem` preserves the existing Batch04 terrain profile.

`terrain_profiles.gedtm` samples GEDTM DTM and uncertainty to the existing `109 × 109` terrain node centres. Rasterio inverse coordinates are handled as pixel-corner coordinates; the compiler subtracts `0.5` before bilinear pixel-centre interpolation. Nodes inside the raster bbox whose bilinear kernel crosses the South/East edge use nearest-edge fallback and are flagged in `terrain_profiles.gedtm.edge_fallback`.

GEDTM result:

- nodes: `11,881`
- valid nodes: `11,881`
- missing nodes: `0`
- edge fallback nodes: `217`
- complete: `true`
- vertical datum: EGM2008 / EPSG:3855
- source period: 2006-01-01 to 2015-12-31
- source license: CC BY 4.0
- use recommendation: testing-only for S06 evaluation until Contractor accepts accuracy/coverage for release

GEDTM stats:

- min: `4.175 m`
- max: `24.424998 m`
- mean: `12.938195 m`

COPDEM stats retained:

- min: `5.43 m`
- max: `29.58 m`
- mean: `14.485494 m`

QA terrain samples:

- row 0 / col 0: valid, center-grid coords col `0.499999`, row `0.5`, GEDTM height `15.549999 m`, uncertainty `1.0675 m`
- row 54 / col 54: valid, center-grid coords col `54.499999`, row `54.5`, GEDTM height `13.674999 m`, uncertainty `0.4925 m`
- row 108 / col 108: valid with `nearest_edge_fallback`, center-grid coords col `108.499999`, row `108.5`, GEDTM height `14.5 m`, uncertainty `0.97 m`

Root independently recomputed all `11,881` target nodes against the native GEDTM/uncertainty rasters: finite `11,881`, edge fallback `217`, max rounded-payload error about `5e-7 m` for height and uncertainty.

## Building supplement

All `657` current Batch04 stable building IDs are joined. Google Open Buildings support gates use the actual B02 Microsoft AOI GeoJSON polygon coordinates by source order, validated against existing `msft_0001..msft_0657` IDs and area.

Sampling:

- source: Google Open Buildings 2.5D Temporal 2023
- source raster: effective approximately 4 m AOI crop; the 0.5 m file grid is not treated as 0.5 m optical imagery
- polygon frame: raw B02 WGS84 polygons projected to EPSG:32648 for raster sampling
- sampling kernel: pixel centres inside actual polygon
- presence threshold: `> 0.5`
- support gate: at least one valid height pixel and support ratio `>= 0.25`
- valid model height range: `0.5 < height < 60`
- thresholds: uncalibrated visual-modelling gates, disclosed in payload

Counts:

- buildings: `657`
- accepted Google model heights: `482`
- proxy fallback heights: `175`
- `source_height_m_all_null`: `true`
- `measured_height_all_false`: `true`

For unsupported buildings, `display_height_m` remains the existing baseline proxy height.

QA includes 5 building samples with raw lon/lat polygon, canonical footprint scene metres, EPSG:32648 polygon, Google pixel rows/cols, support counts, accepted/fallback height:

- `msft_0193`
- `msft_0446`
- `msft_0316`
- `msft_0334`
- `msft_0277`

The first QA sample `msft_0193` starts with raw polygon point `[106.35447029702, 11.0870743542]`; Google support is `205` polygon pixels, `169` presence pixels, model height `8.159 m`. Root independently recomputed all `657` raw polygons with PROJ/GDAL centre-pixel rasterization and found `482` accepted / `175` proxy, with zero support/count/height mismatches against the supplement.

Representative focus:

- id: `msft_0381`
- centroid scene metres: `[800.63152, -1166.483607]`
- centroid WGS84: `[106.349963057941, 11.087561399475]`
- method: accepted Google-height building with largest 100 m accepted-neighbour density, stable-id tie break

## Canonical render coordinate frame

S06 adds `coordinate_transform` because the earlier Batch04 fusion geometry used latitude-dependent metre/degree coefficients while the visual-data frame uses `R=6378137`. Raw source bytes remain immutable; S06 provides additive canonical geometry and transform metadata.

Canonical frame:

- origin: `[106.3426338, 11.0980401]`
- axes: `x` east, `z` north
- formula: visual-data local tangent metres using `R=6378137`

Legacy-to-canonical transform:

- `x_scale`: `0.99987688691`
- `z_scale`: `1.006364994037`
- `x_offset`: `0`
- `z_offset`: `0`
- max vertex shift over the AOI from legacy to canonical: `10.561666 m`

S06 building geometry:

- `buildings[].footprint_scene_m`: canonical render footprint from raw B02 WGS84 polygon
- `buildings[].centroid_scene_m`: canonical centroid from the canonical footprint
- `buildings[].legacy_centroid_local_m`: old Batch04 scene centroid retained only for lineage

Legacy scene layers that should be transformed when consumed from `scene-data.json`:

- `roads[].path_local_m`
- `osm_water[].path_local_m`
- `canopy_samples[]`
- `jrc_water_cells[]`
- fallback legacy building geometry if a consumer still reads it

`solution-qa.json.coordinate_transform.qa_samples` includes road, water and canopy examples with exact legacy WGS84 to canonical roundtrip. `solution-qa.json.raw_wgs84_canonical_roundtrip_samples` includes 5 building-source WGS84 points roundtripped through canonical scene metres with zero rounded error.

## Future data adapter templates

The independent S06-D04 adapter audit found that the previous `future_data_adapter` listed fields but did not provide concrete per-source templates. This revision adds explicit pending templates while preserving the existing numeric data.

`future_data_adapter` now has:

- `schema`: `s06-future-source-adapter/v1`
- `contract_only`: `true`
- `available`: `false`
- `kinds`: `["modelled", "surveyed"]`
- `templates`: 5 pending records

Template IDs:

- `rgb_orthomosaic`
- `lidar_point_cloud`
- `sfm_photogrammetry_mesh`
- `surveyed_dtm`
- `modelled_external_raster`

Each template keeps these fields present and `null` until a future source exists:

- `kind`
- `units`
- `crs`
- `vertical_datum`
- `date`
- `resolution`
- `bounds`
- `nodata`
- `rights`
- `sourcehash`
- `quality`
- `coverage`

Every template has `available:false`, `contract_only:true`, `required_before_use`, and a `render_policy` disabled until source record completion. No UAV UI feature, renderer behavior, RGB availability, LiDAR availability, SfM availability, surveyed DTM availability, or external raster availability is claimed in S06.

## Commands run

```bash
PYTHONPATH=/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/prepare_solution_layers.py
```

Result: `solution-data.json` and `solution-qa.json` rebuilt deterministically.

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/test_solution_layers.py
```

Result:

```json
{
  "status": "PASS",
  "errors": [],
  "solution_data_sha256": "caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3",
  "negative_bites": {
    "corrupt_source_hash": "PASS",
    "missing_immutable_input": "PASS",
    "malformed_template_missing_field": "PASS",
    "malformed_template_available_true": "PASS"
  }
}
```

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m py_compile outputs/tayninh-data-batch-04/scripts/prepare_solution_layers.py outputs/tayninh-data-batch-04/scripts/test_solution_layers.py
```

Result: syntax compile PASS.

```bash
shasum -a 256 outputs/tayninh-data-batch-04/DATA-CONTRACT-S06.md outputs/tayninh-data-batch-04/scripts/prepare_solution_layers.py outputs/tayninh-data-batch-04/scripts/test_solution_layers.py outputs/tayninh-data-batch-04/derived/solution/solution-data.json outputs/tayninh-data-batch-04/derived/solution/solution-qa.json outputs/tayninh-data-batch-04/governance/AUDIT-S06-ADAPTER.md
```

Result hashes are listed in Outputs.

## Acceptance

| AC | Result | Evidence |
|---|---|---|
| D01 source hashes verified | PASS | Compiler verifies Batch04, Batch02 and C05 hashes before processing; payload records source fingerprints. |
| D02 terrain registered and masked | PASS | GEDTM sampled to existing 109×109 node centres with pixel-centre convention; 11,881 valid / 0 missing / 217 edge fallbacks disclosed. |
| D03 657 building joins honest | PASS | 657 stable IDs joined using B02 raw GeoJSON polygons; 482 accepted model heights; 175 proxy; all `source_height_m:null`, all `measured_height:false`. |
| D04 canonical render geometry | PASS | Buildings have canonical footprints/centroids from raw WGS84; legacy road/water/canopy transform coefficients and QA samples emitted. |
| D05 deterministic compiler/contract/QA | PASS | Compiler, validator, payload, QA and contract hashes recorded; strict validator returns PASS. |
| D06 concrete future adapter contract | PASS | Five pending source templates added with null placeholders, disabled render policies and strict negative bites for corrupt/missing inputs and malformed templates. |

## Limits

- GEDTM is testing-only; 217 edge nodes use documented nearest-edge kernel fallback.
- Google Open Buildings height is model-derived aboveground height, not measured height and not absolute elevation.
- No roof, facade, material, window, tree species or real facade texture facts are inferred here.
- Google support thresholds are visual-modelling gates, not calibrated accuracy claims.
- Future adapter is a contract for later measured/modelled records; no future payload is imported in S06.
- Future adapter templates are pending placeholders only; they do not imply current RGB orthomosaic, LiDAR, SfM mesh, surveyed DTM or external raster availability.
