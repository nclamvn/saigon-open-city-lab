# COMPLETION REPORT — TIP-SURFACE

**STATUS:** DONE

Completed 2026-09-14. The SURFACE handoff contains one acquired ESA WorldCover 2021 v200 land-cover tile and one acquired Sentinel-2B Collection 1 Level-2A scene with TCI and SCL assets. Both intersect the Batch 01 pilot AOI and have source evidence, raw provider bytes, SHA-256 lineage, AOI derivatives, browser PNGs, world files, CRS sidecars, and quantitative QA.

## FILES CHANGED

**Created:**

- `governance/TIP-SURFACE.md` — builder contract created before acquisition.
- `sources/surface-records.json` — two-record top-level contract array; SHA-256 `e7e97423c5966f3ee2c4c0f240462ab3d8cf50ad419bdab5efed7a8afaed568f` after semantic QA.
- `sources/surface/esa-worldcover-data-access.html` and `WorldCover_PUM_V2.0.pdf` — official WorldCover access/license and product-manual snapshots.
- `sources/surface/sentinel-2-aws-registry.html`, `Sentinel_Data_Legal_Notice.pdf`, `sentinel-2-c1-l2a-collection.json`, `sentinel-2-search.json`, and `sentinel-2-item-S2B_T48PXT_20251130T033239_L2A.json` — public registry, legal notice, STAC collection/search/item evidence.
- `raw/surface/ESA_WorldCover_10m_2021_v200_N09E105_Map.tif` — original WorldCover provider COG tile.
- `raw/surface/S2B_T48PXT_20251130T033239_L2A_TCI.tif` and `S2B_T48PXT_20251130T033239_L2A_SCL.tif` — original Sentinel-2 true-colour and scene-classification COGs.
- `derived/surface/process_surface.py` — deterministic crop, geotag, render, and QA pipeline; SHA-256 `ac1836e9f119de5dc3da00bd7601021b5342d28b0f3dac5ece79e53f6ff5dece`.
- `derived/surface/worldcover-2021-aoi.{tif,png,pgw,prj}` — AOI land-cover raster and browser assets.
- `derived/surface/sentinel-2-20251130-aoi-tci.{tif,png,pgw,prj}` — AOI optical visual and browser assets.
- `derived/surface/sentinel-2-20251130-aoi-scl.{tif,png,pgw,prj}` — AOI scene-classification QA raster and browser assets.
- `derived/surface/surface-aoi-qa.json` — machine-readable CRS, bounds, windows, dimensions, nodata, distributions, image statistics, local cloud QA, and derivative hashes.
- `governance/COMPLETION-SURFACE.md` — this report.

**Modified:** none outside the owned SURFACE paths.

## ACQUIRED DATA

### ESA WorldCover 2021 v200

- Provider asset: `ESA_WorldCover_10m_2021_v200_N09E105_Map.tif`.
- Source URL: `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N09E105_Map.tif`.
- Raw bytes: `92,338,709`; SHA-256 `7e9c655b7eefe460f92f0a15122295d33b33c3e1493afd56a463fb973dcc1cbc`.
- Source raster: EPSG:4326, bounds `[105, 9, 108, 12]`, `36000 × 36000`, pixel size `1/12000°`, nodata `0`.
- Embedded source metadata identifies product version `V2.0.0`, product year `2021`, tile `N09E105`, CC BY 4.0, and the eleven published class codes.
- Official snapshot states the product is free of charge without restriction of use under CC BY 4.0 and documents 3×3° EPSG:4326 COG tiles.

AOI derivative:

- Dimensions: `361 × 361`; EPSG:4326; nodata `0`.
- Pixel-aligned bounds: `[106.32758333333334, 11.083, 106.35766666666666, 11.113083333333334]`.
- Requested bbox: `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`; the source-grid crop contains it and extends less than one `1/12000°` pixel at every edge.
- Valid pixels: `130,321`; nodata pixels: `0`.
- Requirement `2D-B-01` is mapped only as a partial surface-classification input. This package has no parcel, cadastral, or legal land-use overlay.

| Class | Pixels | Share |
|---|---:|---:|
| Tree cover | 67,935 | 52.128974% |
| Grassland | 28,936 | 22.203636% |
| Cropland | 18,513 | 14.205692% |
| Built-up | 13,903 | 10.668273% |
| Bare / sparse vegetation | 529 | 0.405921% |
| Permanent water bodies | 449 | 0.344534% |
| Herbaceous wetland | 56 | 0.042971% |

### Sentinel-2B Collection 1 Level-2A

- Earth Search item: `S2B_T48PXT_20251130T033239_L2A`; acquisition datetime `2025-11-30T03:34:50.914000Z`.
- Platform/instrument/product: Sentinel-2B / MSI / `S2MSI2A`; processing baseline `05.11`; EPSG:32648.
- Search scope: the exact pilot bbox, `2025-01-01` through `2026-09-14`, sorted ascending by `eo:cloud_cover`; the selected item has the lowest catalog cloud cover among 100 returned items.
- STAC scene metadata: cloud cover `0.017494%`, nodata `6.57384%`, degraded MSI data `0.0212%`, cloud shadow `0.018861%`, medium-probability cloud `0.010196%`, high-probability cloud `0.007298%`, thin cirrus `0%`.
- Raw TCI: `306,086,947` bytes; SHA-256 `a55484db6427772adcb994d6b25b1b0fe5dce76356dc971376a97a115196c617`.
- Raw SCL: `3,750,890` bytes; SHA-256 `dbef89cd29fa907b6093e5fb718bcdb9270767db0070001b5c568f41f839a16f`.
- Both local SHA-256 values exactly match the SHA-256 payload inside their STAC multihash checksums.
- TCI comprises red/green/blue MSI bands at 10 m. SCL is 20 m and supplies AOI quality classes.

AOI derivatives:

- TCI: `330 × 334`, 10 m, EPSG:32648, native bounds `[644990, 1225480, 648290, 1228820]`; WGS84 envelope `[106.32747646376076, 11.08286805681983, 106.3578237405214, 11.113201106075287]`; all-band nodata pixels `0`.
- TCI RGB min `[4, 20, 0]`, max `[255, 255, 255]`, mean `[87.632181, 90.290673, 68.000617]`.
- SCL: `166 × 167`, 20 m, EPSG:32648, native bounds `[644980, 1225480, 648300, 1228820]`; valid pixels `27,722`; nodata `0`.
- Local SCL cloud codes 8/9/10: `0` pixels (`0%` of valid pixels); cloud-shadow code 3: `0` pixels (`0%`).
- Local SCL distribution: vegetation `18,470` (66.625785%), not vegetated `9,070` (32.717697%), unclassified `127` (0.458120%), water `45` (0.162326%), dark-area pixels `10` (0.036072%).
- Each native UTM crop contains the transformed AOI and extends less than one source pixel past its transformed envelope. The WGS84 envelope is reported separately because a north-up UTM rectangle is rotated relative to longitude/latitude axes.
- This is one optical epoch. It does not provide a temporal comparison and cannot answer whether buildings are newly appearing.

## TEST RESULTS

**Acceptance criteria tested: 6/6 passed.**

| AC | Result | Evidence |
|---|---|---|
| AC1 — acquired nonempty land cover, spatial/raster QA and distribution | PASS | 92,338,709-byte source COG; 361×361 derivative; 130,321 valid pixels; seven present classes; CRS/bounds/pixel/nodata/hash recorded. |
| AC2 — acquired dated optical visual with quality/cloud metadata | PASS | Dated Sentinel-2B L2A item; TCI + SCL raw COGs; 330×334 visual; scene and AOI SCL quality recorded. |
| AC3 — referenced evidence/raw/derived paths and hashes resolve | PASS | Independent contract check verified 28 referenced files plus both primary snapshot/local pairs; no missing or mismatched hash. |
| AC4 — exact AOI lineage and spatial tolerance | PASS | WorldCover EPSG:4326 and Sentinel EPSG:32648 pixel windows enclose the transformed AOI within one native source pixel; raw input paths/hashes are explicit. |
| AC5 — deterministic manifest and honest reuse/limits | PASS | Top-level two-record array contains all 20 Batch 01 required fields, source snapshots, raw inputs, derivatives, CC BY 4.0/Copernicus terms, and non-claims. |
| AC6 — report gives quantitative pass/fail and provider outcomes | PASS | This report records 6/6 PASS; both preferred providers succeeded, so no fallback was counted as acquisition. |

Additional verification:

- JSON parse passed for manifest and QA report.
- TIFF tag inspection confirmed correct derived tiepoints, pixel scales, CRS GeoKeys, dimensions, and nodata `0` for all three GeoTIFFs.
- File-type inspection confirmed three browser PNGs and three derived TIFFs are valid readable images.
- Pixel class sums equal raster totals: WorldCover `130,321`; SCL `27,722`.
- Visual inspection confirmed the TCI is a readable, clear AOI image; WorldCover palette and SCL QA render correctly.
- Exact manifest mappings after semantic QA: WorldCover → `R02`, `R04`, `R05`, `R06`, `R20`, `2D-B-01` (partial surface-classification input only); Sentinel-2 → `R02`, `R04`, `R05`, `R06`, `R20`. Contractor remains responsible for final Batch 02 coverage accounting across all 23 review groups and 237 questions.

## ISSUES

- P0/P1/P2 acceptance failures: none.
- The initial `tiffcrop` run hit its built-in 256 MiB allocation ceiling while decoding the 36,000×36,000 WorldCover tile. The deterministic pipeline now invokes libtiff with an explicit unlimited per-process allocation setting for the verified provider raster; output dimensions and hashes are checked afterward.

## DEVIATIONS

- None from the approved Blueprint or TIP. The selected Sentinel scene favors the lowest provider-reported cloud cover in the bounded 2025–2026 search instead of the newest date; acquisition date is fully preserved.

## LIMITATIONS

- The AOI is an OSM-derived pilot bbox and is not an official boundary of phường Gia Lộc.
- WorldCover is a 2021 thematic product and has no local field accuracy assessment in this package.
- WorldCover has no parcel, cadastral, or legal land-use overlay; its `2D-B-01` mapping is partial only.
- Sentinel TCI is 10 m public satellite imagery, not 1 cm orthophoto, survey-grade imagery, or Hera payload output.
- The single Sentinel acquisition cannot support change detection or newly appearing-building conclusions.
- Scene-wide cloud values are provider metadata. The local zero-cloud result is based on the product's 20 m SCL, not an independent meteorological or visual-quality certification.
- Neither product supplies cadastral/legal land use, control points, dense LiDAR, DTM/DSM survey validation, façade detail, or measured building heights.

## SUGGESTIONS

- The workbench should render `browser_visual` PNG assets using the manifest/QA bounds and show acquisition date, cloud metadata, product resolution, license, and AOI non-claim beside each layer.
- Keep the raw COGs immutable so later Hera calibration or replacement can compare against reproducible public-data baselines.
