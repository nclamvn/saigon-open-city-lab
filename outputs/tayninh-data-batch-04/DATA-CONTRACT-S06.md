# DATA-CONTRACT-S06

Early contract for Engine/UI integration. Final hashes are recorded in `governance/COMPLETION-S06-DATA.md`.

## Files

- Payload: `derived/solution/solution-data.json`
- QA: `derived/solution/solution-qa.json`
- Compiler: `scripts/prepare_solution_layers.py`
- Validator: `scripts/test_solution_layers.py`

## `solution-data.json`

Top-level schema:

```json
{
  "schema": "tayninh-s06-solution-data/v1",
  "generated_at": "fixed deterministic timestamp",
  "frame": {
    "coordinate_frame": "local tangent metres, x east, z north, origin AOI center",
    "aoi_bbox_wgs84": [106.3276338, 11.0830401, 106.3576338, 11.1130401],
    "aoi_center_wgs84": [106.3426338, 11.0980401],
    "terrain_rows": 109,
    "terrain_cols": 109
  },
  "source_fingerprints": {},
  "coordinate_transform": {},
  "terrain_profiles": {
    "copdem": {},
    "gedtm": {}
  },
  "buildings": [],
  "building_supplements": [],
  "building_height_by_id": {},
  "representative_focus": {},
  "future_data_adapter": {},
  "qa_summary": {}
}
```

## Coordinate frame and transform

S06 distinguishes two local metre frames:

- canonical frame: the `visual-data` local tangent frame using `R=6378137`, `x` east, `z` north, origin `[106.3426338, 11.0980401]`;
- legacy fusion frame: the original Batch04 fusion frame using latitude-dependent metres-per-degree coefficients.

`buildings[].footprint_scene_m` and `buildings[].centroid_scene_m` are already emitted in the canonical frame from the raw B02 Microsoft GeoJSON WGS84 polygons. Engine should prefer these over `scene-data.json` building footprint/centroid fields when rendering S06.

For legacy scene layers still consumed from `scene-data.json` (`roads[].path_local_m`, `osm_water[].path_local_m`, `canopy_samples[]`, `jrc_water_cells[]`, and any fallback legacy building geometry), apply:

```json
{
  "coordinate_transform": {
    "legacy_to_canonical": {
      "x_scale": 0.99987688691,
      "z_scale": 1.006364994037,
      "x_offset": 0.0,
      "z_offset": 0.0,
      "formula": "canonical_x = legacy_x * x_scale; canonical_z = legacy_z * z_scale"
    }
  }
}
```

`solution-qa.json.coordinate_transform.qa_samples` includes road, water and canopy samples with legacy local metres, inferred WGS84, canonical scene metres and exact roundtrip error. `solution-qa.json.raw_wgs84_canonical_roundtrip_samples` includes building-source WGS84 to canonical scene and back.

## Terrain profiles

Both `terrain_profiles.copdem` and `terrain_profiles.gedtm` use the existing Batch04/B04 visual terrain frame: `109 × 109` node grid, row 0 north, col 0 west.

Required fields:

```json
{
  "kind": "baseline" ,
  "source": "COPDEM|GEDTM",
  "units": "metres",
  "vertical_datum": "unknown|EGM2008",
  "epoch": "source date or range",
  "rows": 109,
  "cols": 109,
  "heights_m": [[0.0]],
  "validity": [[true]],
  "uncertainty_m": null,
  "coverage": {
    "valid_nodes": 11881,
    "missing_nodes": 0,
    "complete": true
  },
  "statistics": {
    "min": 0,
    "max": 0,
    "mean": 0
  },
  "source_metadata": {
    "crs": "EPSG:4326",
    "bounds": [],
    "native_resolution_m": null,
    "resampling": "bilinear_to_copdem_node_centres",
    "rights": "testing-only|public"
  }
}
```

Engine should default to `gedtm` only when `terrain_profiles.gedtm.coverage.complete === true`; otherwise use `copdem`. Do not clamp missing GEDTM nodes and call them covered.

## Buildings

`buildings` is the Engine-facing array and has one item per existing stable Batch04 building, expected count `657`. `building_supplements` is currently an identical alias for Data/QA consumers that already integrated the first contract draft.

Required fields:

```json
{
  "id": "stable building id from existing scene-data",
  "stable_id": "same as id",
  "centroid_wgs84": [106.0, 11.0],
  "centroid_scene_m": [0.0, 0.0],
  "footprint_scene_m": [{"x": 0.0, "z": 0.0}],
  "raw_polygon_wgs84": [[106.0, 11.0]],
  "legacy_centroid_local_m": [0.0, 0.0],
  "legacy_centroid_wgs84": [106.0, 11.0],
  "source_height_m": null,
  "measured_height": false,
  "model_height_m": null,
  "google_model_height_m": null,
  "display_height_m": 6.0,
  "fallback_height_m": 6.0,
  "height_kind": "modelled|proxy",
  "height_qualified": false,
  "qualified": false,
  "height_support": {
    "source": "Google Open Buildings 2.5D Temporal 2023",
    "threshold_presence": 0.5,
    "polygon_sample_pixels": 0,
    "presence_gt_threshold_pixels": 0,
    "height_valid_pixels": 0,
    "support_ratio": 0.0,
    "accepted": false,
    "reason": "low_support|valid_model_height|outside_crop|invalid_value"
  },
  "coordinate_support": {
    "source": "B02 Microsoft AOI GeoJSON raw WGS84 polygon by source order",
    "canonical_frame": "visual-data local tangent metres R=6378137",
    "legacy_frame_available": true,
    "legacy_to_canonical_max_vertex_shift_m_over_aoi": 10.561666
  }
}
```

`source_height_m` stays `null` and `measured_height` stays `false` for all Google-derived entries. Engine/UI must label Google height as modelled. If support is low, use `display_height_m = fallback_height_m`.

Engine aliases:

- `google_model_height_m` is identical to `model_height_m`.
- `height_qualified` and `qualified` are identical to `height_support.accepted`.
- `google_support` repeats the compact support fields for renderer modules that do not need full provenance text.

`building_height_by_id` is a compact lookup:

```json
{
  "building-id": {
    "display_height_m": 6.0,
    "model_height_m": null,
    "height_kind": "proxy",
    "measured_height": false
  }
}
```

## Future data adapter

`future_data_adapter` declares accepted future measured/modelled payload records. It is documentation/contract only, not a claim that measured data exists now. The top-level adapter must keep:

```json
{
  "schema": "s06-future-source-adapter/v1",
  "contract_only": true,
  "available": false,
  "accepted_record_fields": [
    "kind",
    "units",
    "crs",
    "vertical_datum",
    "date",
    "resolution",
    "bounds",
    "nodata",
    "rights",
    "sourcehash",
    "quality",
    "coverage"
  ],
  "kinds": ["modelled", "surveyed"],
  "templates": []
}
```

Template IDs emitted in `future_data_adapter.templates`:

- `rgb_orthomosaic`
- `lidar_point_cloud`
- `sfm_photogrammetry_mesh`
- `surveyed_dtm`
- `modelled_external_raster`

Each template is pending and disabled until a real future source record exists. No UAV feature or UI behavior is implied by these templates.

Required placeholder shape per future source template:

```json
{
  "id": "rgb_orthomosaic",
  "title": "RGB orthomosaic",
  "available": false,
  "contract_only": true,
  "kind": null,
  "units": null,
  "crs": null,
  "vertical_datum": null,
  "date": null,
  "resolution": null,
  "bounds": null,
  "nodata": null,
  "rights": null,
  "sourcehash": null,
  "quality": null,
  "coverage": null,
  "required_before_use": [
    "kind",
    "units",
    "crs",
    "vertical_datum",
    "date",
    "resolution",
    "bounds",
    "nodata",
    "rights",
    "sourcehash",
    "quality",
    "coverage"
  ],
  "render_policy": {
    "status": "disabled_until_source_record_complete",
    "summary": "Do not render until all required fields are populated and spatial QA passes.",
    "must_verify_sourcehash": true,
    "must_verify_spatial_registration": true,
    "must_verify_license_or_rights": true,
    "must_label_modelled_vs_surveyed": true
  }
}
```

The validator rejects missing templates, missing required placeholders, non-null placeholder claims in pending templates, `available:true`, `contract_only:false`, and missing render-policy gates.

## QA samples

`solution-qa.json` includes independently recomputable samples:

- 5 building samples with stable id, raw lon/lat polygon vertices, canonical footprint scene metres, UTM polygon vertices, Google pixel row/col coverage, support counts and selected/fallback height.
- 3 GEDTM terrain node samples with row/col, lon/lat, native grid coordinate, bilinear sample, uncertainty/RF spread, validity.
- 3 coordinate-transform samples for legacy road/water/canopy geometry.
- 5 raw WGS84 to canonical scene roundtrip samples.
- Validator output includes non-mutating negative bites for corrupt source hash, missing immutable input, missing template field, and pending template marked available.

These samples are for Contractor/root recomputation and should not be required in browser runtime.
