# COMPLETION-B04-VISUAL-DATA

Status: PASS

This pass implements `governance/TIP-B04-VISUAL-DATA.md` as an additive Batch04 visual-data layer. It does not modify Batch01–03 outputs, the existing Batch04 fusion compiler, `derived/fusion/scene-data.json`, or UI files.

## Outputs

| Path | Role | sha256 |
|---|---:|---|
| `scripts/prepare_visual_layers.py` | deterministic visual layer compiler | `b1d9b666d4018b8b8ecc03e92b740efd73389bcca93f3aaa14f86d3cf9ed7ddf` |
| `scripts/test_visual_layers.py` | fail-loud validator | `80daf31f6aef499493fb4c804e844e47fd924148cb08c2efe48a89a3ecdc6af6` |
| `derived/visual/visual-data.json` | renderer-facing machine contract | `215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682` |
| `derived/visual/visual-qa.json` | validation/hash report | `887a021dd894d9babd2066ed26854760c1d91c09b71436bcae032a4dbcbe9e67` |
| `derived/visual/ENGINE-CONTRACT.md` | quick handoff notes for ENGINE/data_workbench | `86848e0c39a6bd01ecc51df714004783df805bbdad20f40d1f30386e772d5a2f` |
| `derived/visual/sentinel-2-20251130-native-rgb.png` | exact native Sentinel TCI PNG copy | `8b5825bc1f7d525eacc70df7c145a8eff805ef600f29fb1c469887d998a66505` |
| `derived/visual/eth-canopy-height-2020-field.png` | exact ETH height PNG copy | `fcce89217fdc49063d4479467f84a85af6b5b2a9c64608338fdfde16cc8da3cf` |
| `derived/visual/eth-canopy-height-2020-uncertainty-field.png` | exact ETH uncertainty PNG copy | `4b67d1f9f59d84d9cdaf630b0d08082cd438f4582c903fdb24fe03b730e245b8` |

## Engine contract

Primary contract: `derived/visual/visual-data.json`.

Renderer-facing keys:

- `sentinel_rgb_10m_native.asset.path`: native 330×334 Sentinel RGB PNG.
- `sentinel_rgb_10m_native.terrain_node_texture_uv_rows`: 109×109 DEM pixel-centre UV grid, entries `[u, v_bottom_origin, inside]`.
- `sentinel_rgb_10m_native.terrain_node_texture_uv`: UV convention, stats, and sample nodes.
- `sentinel_rgb_10m_native.true_footprint_from_epsg32648_corners`: true Sentinel corner positions from EPSG:32648 inverse transform.
- `terrain_frame`: DEM edge bounds, pixel-centre semantics, PROJ reference checks, and the same UV grid under provenance key `terrain_frame.sentinel_rgb_texture_uv_for_terrain_pixel_centers`.
- `eth_canopy_field_10m.height_grid_u8_rows` and `eth_canopy_field_10m.uncertainty_grid_u8_rows`: full continuous canopy rasters.

Expected dimensions:

- Terrain DEM frame: `109 × 109`
- Sentinel-2 native RGB frame: `330 × 334`
- ETH canopy height/uncertainty frame: `361 × 361`

## Spatial facts and QA

### Terrain DEM

- CRS: EPSG:4326
- Edge bounds WGS84: `[106.3275, 11.082777777777778, 106.35777777777778, 11.113055555555556]`
- Scene edge bounds metres: `[-1653.181999, -1698.993938, 1654.293797, 1671.512866]`
- First DEM pixel centre UTM reference: `[644992.9841005881, 1228788.5539725202]`
- Last DEM pixel centre UTM reference: `[648285.0205004632, 1225485.3536492197]`
- Row 0 is north; rows increase southward. Column 0 is west; columns increase eastward.

### Sentinel-2 TCI

- CRS: EPSG:32648
- Native dimensions: `330 × 334`
- Native pixel size: `10 m × 10 m`
- GeoTIFF tiepoint upper-left EPSG:32648: `[644990.0, 1228820.0]`
- Edge bounds EPSG:32648: `[644990.0, 1225480.0, 648290.0, 1228820.0]`
- First pixel centre EPSG:32648 row0/col0: `[644995.0, 1228815.0]`
- Last pixel centre EPSG:32648 row333/col329: `[648285.0, 1225485.0]`
- First pixel centre scene metres from inverse UTM: `[-1635.875934, 1682.660522]`
- Last pixel centre scene metres from inverse UTM: `[1639.099779, -1683.888773]`
- `all_band_nodata_pixels`: `0`

True Sentinel footprint corners from inverse UTM:

- NW WGS84: `[106.327612855826, 11.113201106075]`, scene m: `[-1640.853885, 1687.715476]`
- NE WGS84: `[106.357823740521, 11.113066308453]`, scene m: `[1659.314663, 1672.709874]`
- SE WGS84: `[106.357684247045, 11.08286805682]`, scene m: `[1644.076711, -1688.944121]`
- SW WGS84: `[106.327476463761, 11.083002479195]`, scene m: `[-1655.753045, -1673.980291]`

`sentinel_rgb_10m_native.pixel_centers.source_crs_preserving_scene_bounds_m` is retained only as `APPROXIMATE_AXIS_ALIGNED_DIAGNOSTIC_ONLY`; renderer must not use it for placement.

### DEM-to-Sentinel UV

- UV grid key for ENGINE: `sentinel_rgb_10m_native.terrain_node_texture_uv_rows`
- Dimensions: `109 × 109`
- Total nodes: `11881`
- Inside Sentinel extent: `11811`
- Outside Sentinel extent: `70`
- `u = (UTM_easting - 644990) / 3300`
- `v_bottom_origin = (UTM_northing - 1225480) / 3340`
- Native PNG top-origin image row uses `1 - v_bottom_origin`.

### ETH canopy

- CRS: EPSG:4326
- Dimensions: `361 × 361`
- Edge bounds WGS84: `[106.32758333333334, 11.083, 106.35766666666666, 11.113083333333334]`
- Nodata: `255`
- Height valid pixels: `119438`
- Height nodata pixels: `10883`
- Uncertainty valid pixels: `119438`
- Uncertainty nodata pixels: `10883`

The canopy arrays in `visual-data.json` are full grids copied from source TIFF pixels and verified against the TIFF rasters. They are not the previous stride-6 sampled canopy vertices.

## Transform verification

Bundled Python 3.12 with Pillow/NumPy was used for raster IO. The local `PYTHONPATH=work/pylib python3` pyproj path hung during import, so the compiler uses deterministic pure-Python WGS84↔UTM zone 48N formulas with fail-loud reference checks.

Root independent PROJ/pyproj verification reported:

- Forward transform over all `11881` DEM nodes: max error `3.651136e-7 m`
- Inverse transform on four Sentinel corners: max error `2.670636e-5 m`
- PASS threshold: `< 0.01 m`

The validator also checks source hashes, image sizes, full canopy grid pixel equality against TIFF, north-up orientation, true Sentinel corner references, DEM first/last UTM references, UV grid dimensions/counts, and the ENGINE alias `sentinel_rgb_10m_native.terrain_node_texture_uv_rows`.

## Commands run

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/prepare_visual_layers.py
```

Result: visual assets and `visual-data.json` generated.

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/test_visual_layers.py
```

Result:

```json
{
  "status": "PASS",
  "errors": [],
  "visual_data_sha256": "215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682"
}
```

```bash
shasum -a 256 outputs/tayninh-data-batch-04/scripts/prepare_visual_layers.py outputs/tayninh-data-batch-04/scripts/test_visual_layers.py outputs/tayninh-data-batch-04/derived/visual/visual-data.json outputs/tayninh-data-batch-04/derived/visual/visual-qa.json outputs/tayninh-data-batch-04/derived/visual/ENGINE-CONTRACT.md outputs/tayninh-data-batch-04/derived/visual/sentinel-2-20251130-native-rgb.png outputs/tayninh-data-batch-04/derived/visual/eth-canopy-height-2020-field.png outputs/tayninh-data-batch-04/derived/visual/eth-canopy-height-2020-uncertainty-field.png
```

Result:

```text
b1d9b666d4018b8b8ecc03e92b740efd73389bcca93f3aaa14f86d3cf9ed7ddf  outputs/tayninh-data-batch-04/scripts/prepare_visual_layers.py
80daf31f6aef499493fb4c804e844e47fd924148cb08c2efe48a89a3ecdc6af6  outputs/tayninh-data-batch-04/scripts/test_visual_layers.py
215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682  outputs/tayninh-data-batch-04/derived/visual/visual-data.json
887a021dd894d9babd2066ed26854760c1d91c09b71436bcae032a4dbcbe9e67  outputs/tayninh-data-batch-04/derived/visual/visual-qa.json
86848e0c39a6bd01ecc51df714004783df805bbdad20f40d1f30386e772d5a2f  outputs/tayninh-data-batch-04/derived/visual/ENGINE-CONTRACT.md
8b5825bc1f7d525eacc70df7c145a8eff805ef600f29fb1c469887d998a66505  outputs/tayninh-data-batch-04/derived/visual/sentinel-2-20251130-native-rgb.png
fcce89217fdc49063d4479467f84a85af6b5b2a9c64608338fdfde16cc8da3cf  outputs/tayninh-data-batch-04/derived/visual/eth-canopy-height-2020-field.png
4b67d1f9f59d84d9cdaf630b0d08082cd438f4582c903fdb24fe03b730e245b8  outputs/tayninh-data-batch-04/derived/visual/eth-canopy-height-2020-uncertainty-field.png
```

## Acceptance criteria

| AC | Result | Evidence |
|---|---:|---|
| VDATA-R01: Native Sentinel TCI retained | PASS | `sentinel-2-20251130-native-rgb.png` is `330×334`, hash-identical to Batch02 PNG, and source TIFF/PNG sample pixels are verified. |
| VDATA-R02: Registered frame contract | PASS | `terrain_frame`, true Sentinel corners, DEM first/last UTM references, and 109×109 DEM→Sentinel UV rows are exported and validated. |
| VDATA-R03: Full continuous canopy field | PASS | `height_grid_u8_rows` and `uncertainty_grid_u8_rows` are full `361×361` grids with valid/nodata counts matching Batch03 QA. |
| VDATA-R04: Deterministic rebuild and validation | PASS | Compiler and validator rerun successfully; contract hash and output hashes are recorded above. |

## Limits

- Sentinel-2 is truthful 10 m public imagery; it is not a centimetre orthophoto.
- ETH canopy pixels are continuous model raster values with uncertainty and nodata. They are not individual tree detections and must not be rendered as a one-cone-per-record tree inventory.
- Root bounded OAM AOI lookup found zero verified open higher-resolution assets; this task did not broaden providers or download new imagery.
- The existing Batch04 fusion scene remains unchanged. ENGINE should consume `derived/visual/visual-data.json` to update rendering without changing lineage for compiled fusion data.
