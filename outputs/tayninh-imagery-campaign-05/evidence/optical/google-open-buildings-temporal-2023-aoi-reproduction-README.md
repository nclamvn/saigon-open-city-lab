# Google Open Buildings Temporal 2023 AOI crop reproduction

This folder contains the bounded acquisition recipe for the Google Open Buildings 2.5D Temporal 2023 crop used by C05 OPTICAL.

Files:

- `google-open-buildings-temporal-2023-aoi-source-manifest.json`: AOI, public GCS COG URLs, CRS, resampling, expected output hashes.
- `reproduce_google_open_buildings_temporal_2023_aoi_crop.py`: deterministic crop script.
- `google-open-buildings-temporal-2023-aoi-effective4m.tif`: derived three-band GeoTIFF.
- `google-open-buildings-temporal-2023-aoi-presence.png`: presence preview.
- `google-open-buildings-temporal-2023-aoi-height.png`: model-height preview.
- `google-open-buildings-temporal-2023-aoi-qa.json`: QA and statistics.

Runtime used:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pip install --target /tmp/c05-optical-pylib rasterio s2sphere
PYTHONPATH=/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-imagery-campaign-05/evidence/optical/reproduce_google_open_buildings_temporal_2023_aoi_crop.py
```

The script reads four public Google Cloud Storage COGs by rasterio/GDAL range requests. It does not need to download whole 25,000 × 25,000 source tiles.

Parameters:

- AOI bbox WGS84: `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`
- CRS: EPSG:32648
- Source file grid: 0.5 m
- Derived crop grid: 4 m
- Effective resolution: approximately 4 m
- Bands: `building_fractional_count`, `building_height`, `building_presence`
- Nodata: `-99.0`

Interpretation limits:

- This is not RGB imagery.
- The 0.5 m file grid is not 0.5 m effective optical imagery.
- Building height is model-derived, not measured survey height.
- The high-resolution training imagery is not publicly released.
- The crop may support building massing or presence analysis after synthesis, but it does not solve the clearer-RGB-basemap problem.
