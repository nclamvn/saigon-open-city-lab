# COMPLETION-GLOBAL — Batch 01

Status: completed for GLOBAL handoff on 2026-09-14T02:38:11Z.

## Scope honored

- AOI used: `sources/aoi.json`, bbox `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`.
- AOI basis: OSM-derived pilot bbox around relation 14929839, explicitly not an official ward boundary.
- No HCMC app, registry builder, static UI, or CityLab application file was edited.
- No global DEM/DSM product is described as LiDAR, centimetre orthophoto, dense point cloud, DTM with survey QC, or full ward coverage.

## Acquired data

One real raster sample was acquired into `raw/global/`:

- `raw/global/copdem-glo30-n11-e106.tif`
- Source URL: `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N11_00_E106_00_DEM/Copernicus_DSM_COG_10_N11_00_E106_00_DEM.tif`
- SHA-256: `49cea98dfdc9e721659dacf85b2e9e58334cc753bb94d52d0854681c51fa15bf`
- File size: 49,261,307 bytes
- Record status: `acquired` in `sources/global-records.json`

The acquired file intersects the pilot AOI. Inspection is saved at `derived/global/copdem-glo30-aoi-inspection.json`.

## Raster inspection

- Format/mode: TIFF float (`F`), 4 frames/overviews visible through Pillow.
- Raster size: 3600 x 3600.
- CRS read from GeoTIFF keys: EPSG:4326 / WGS 84.
- Bounds: `[106.0, 11.0, 107.0, 12.0]`.
- Pixel scale: `[0.0002777777777777778, 0.0002777777777777778, 0.0]`, approximately 1 arc-second / 30 m class.
- AOI pixel window: `[1179, 3193, 1288, 3302]`, 109 x 109 pixels.
- AOI window bounds: `[106.3275, 11.082777777777778, 106.35777777777778, 11.113055555555556]`.
- Nodata tag: `null` in local TIFF tag read.
- AOI finite pixels: 11,881.
- AOI NaN pixels: 0.
- AOI elevation sample stats from local pixels: min `5.430793285369873`, max `29.575841903686523`, mean `14.485491035301852`, std `2.898682851274801`.

Limit: GDAL/rasterio were not installed in the available runtimes. Inspection used Pillow TIFF tags and numpy pixel sampling.

## Source research registry

`sources/global-records.json` contains 8 records:

- 1 `acquired`: Copernicus DEM GLO-30 Public COG tile N11/E106.
- 6 `candidate`: ESA WorldCover, Sentinel-2 L2A COG, JRC Global Surface Water, ETH Global Canopy Height, Google Open Buildings Temporal, NASA GEDI products.
- 1 `blocked`: OpenTopography API/catalog acquisition blocked by API key requirement.

Each record includes publisher, URL, status, snapshot path/hash, local file/hash when acquired, license/access notes, date/resolution where known, extent, exact evidence span, mapped requirements, and limitations.

## Key limitations

- Official machine-readable Gia Loc ward geometry remains unavailable in this GLOBAL package; AOI is a sourced pilot bbox only.
- Copernicus DEM GLO-30 is a public 30 m-class DSM/DEM context layer. It does not satisfy R12 LiDAR/point-cloud, R03 1 cm orthophoto, or engineering-grade DTM/QC requirements.
- GEDI provides relevant spaceborne lidar footprint/gridded products but was not downloaded and is not dense municipal LiDAR.
- OpenTopography is useful as a catalog/API lead, but direct API acquisition was not authorized because an API key is required.

## Verification commands run

- `curl -I` against the Copernicus DEM S3 tile: HTTP 200, `Content-Length: 49261307`, `Content-Type: image/tiff`.
- `curl -L` downloaded the Copernicus DEM S3 tile into `raw/global/`.
- `sha256sum` verified raw raster and source snapshots.
- Bundled Python with Pillow/numpy read GeoTIFF tags and sampled the AOI window.

Pending integration step for Contractor: run the deterministic registry builder/tests after LOCAL records are present, so `registry/data-registry.json` reflects both local and global source records.
