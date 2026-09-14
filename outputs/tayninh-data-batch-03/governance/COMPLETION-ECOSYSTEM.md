# Completion Report — Batch 03 Ecosystem

## Status

**COMPLETE — 6/6 TIP acceptance criteria pass.**

The package contains real AOI data for both required domains: ETH Global Canopy Height 2020 with its predictive standard deviation, and JRC Global Surface Water v1.5 occurrence, 2024 seasonality, and normalized occurrence change. Provider bytes, primary documentation, licenses, source-to-derived lineage, browser visuals, georeferencing, statistics, and SHA-256 checks are present.

Manifest: `sources/ecosystem-records.json` — 18,991 bytes — SHA-256 `3bbea8371abbe0137da8b7578f6b6b09ffb604521ce703fc1937c69cc6559d75`.

## Source selection and acquisition

### ETH Global Canopy Height 2020

- Selected official 3° tile `N09E105`, whose source bounds `[105, 9, 108, 12]` contain the requested AOI `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`.
- The official ETH tile browser supplied the exact LibDrive URLs for both `Map.tif` and `Map_SD.tif`; no filename was accepted solely from an unverified guess.
- Main canopy-height tile: `raw/ecosystem/ETH_GlobalCanopyHeight_10m_2020_N09E105_Map.tif` — 327,818,620 bytes — SHA-256 `9f4fa6db9f231263614378a61db5bcc40eb99c21614ecbf3bd58ff143782d7a4`.
- Predictive-standard-deviation tile: `raw/ecosystem/ETH_GlobalCanopyHeight_10m_2020_N09E105_Map_SD.tif` — 264,767,318 bytes — SHA-256 `fbdaa613a27618faf2b922e131784f410b63dfd3605462ec7a40bd24e84b3650`.
- Product: global canopy top height for 2020, 10 m ground sampling distance, EPSG:4326, integer metre values, nodata 255. The companion `Map_SD` raster is the product's predictive standard deviation.
- License evidence: official ETH project snapshot states CC BY 4.0 and free use with attribution. Snapshot `sources/ecosystem/eth-global-canopy-height.html` has SHA-256 `5568897e50157818debf607ae55e821eaeeefdab921d12458bdd1fae6df3d7b0`.
- Tile and exact CHM/STD link evidence: `sources/ecosystem/eth-global-canopy-height-tile-browser.html` — SHA-256 `c05f064c67c2afdcdf9765e2d95e1d48834070a91aa5e1c7a214cf2be95f5b64`.
- No vegetation fallback was needed because both preferred ETH layers downloaded successfully.

### JRC Global Surface Water v1.5 (1984–2024)

- Selected official 10° tile `100E_20N`. Its geotags give bounds `[100, 10, 110, 20]`, which contain the AOI.
- During validation, the initially tested `100E_10N` tile was rejected because its geotags showed bounds `[100, 0, 110, 10]`, outside the AOI. Those wrong-tile bytes were removed and are not referenced by the manifest.
- Occurrence tile: `raw/ecosystem/jrc-occurrence_100E_20N_v1_5_2024.tif` — 113,467,431 bytes — SHA-256 `37305b681ba9585e3fb5af28914e7b7690251e821eb1b77f921710f25a112698`.
- Seasonality tile: `raw/ecosystem/jrc-seasonality_100E_20N_v1_5_2024.tif` — 33,146,659 bytes — SHA-256 `c36b939363163d3a0192248e5f5c69adf5da9ef84544229c171af83976fe76ab`.
- Normalized occurrence-change tile: `raw/ecosystem/jrc-change_100E_20N_v1_5_2024.tif` — 101,834,865 bytes — SHA-256 `49483b0a54e3795e911e172ef73861d18388174b09115e391c8102dc21555316`.
- Product grid: EPSG:4326, 0.00025° pixels, nominal 30 m.
- Occurrence semantics: value 0 is not water; 1–100 is percentage occurrence from March 1984 through December 2024; 255 is no data.
- Seasonality semantics: value 0 is not water; 1–12 is the number of months water was present in 2024; 255 is no data.
- Change semantics: TIFF values 0–200 map to −100% through +100%, with 100 meaning no change; 253 is not water, 254 means no homologous months, and 255 is no data. Epochs are 16 March 1984–31 December 1999 and 1 January 2000–31 December 2024.
- License/access evidence: `sources/ecosystem/jrc-global-surface-water-download.html` — SHA-256 `bc07b9e5b6a7627d5c2082d9e314e90ed039359cce74c19f8fc71f8414228b7d` — states Copernicus data are free of charge without restriction of use.
- Official product semantics are preserved in `sources/ecosystem/jrc-global-surface-water-data-users-guide-v2024-v5.pdf` — SHA-256 `94aebddbb2d66bcbacea14326d84d0b9d9401c8ef95bc48b42991448f36b839b`.

## AOI derivatives and QA

The reproducible processing entry point is `derived/ecosystem/process_ecosystem.py`. It computes source-grid windows with floor/ceil containment, crops the provider raster, writes a numeric GeoTIFF with EPSG:4326 geotags and nodata, renders a browser PNG, and writes `.pgw` and `.prj` sidecars. Full distributions and output hashes are in `derived/ecosystem/ecosystem-aoi-qa.json` — 29,009 bytes — SHA-256 `9110dcb485bad00e7efca54381646d22509d4ef35da007110028978566ca6283`.

### Canopy and uncertainty

- Pixel window `[15931, 10643, 16292, 11004]`; derivative size 361 × 361.
- Pixel-aligned bounds `[106.32758333333334, 11.083, 106.35766666666666, 11.113083333333334]`; pixel size `1/12000°`.
- Canopy: 119,438 valid pixels; 10,883 nodata pixels; 119,418 positive-height pixels. Valid values range 0–27 m, mean 10.244989 m, median 10 m, standard deviation 2.986692 m.
- Predictive standard deviation: 119,438 valid pixels and 10,883 nodata pixels. Valid values range 0–199 m, mean 5.969030 m, median 6 m. Rare high values are retained from the provider bytes and must not be interpreted as survey error bounds.
- Numeric/browser groups: `derived/ecosystem/eth-canopy-height-2020-aoi.{tif,png,pgw,prj}` and `derived/ecosystem/eth-canopy-height-2020-uncertainty-aoi.{tif,png,pgw,prj}`.

### Surface-water history

- Pixel window `[25310, 35547, 25431, 35668]`; each derivative is 121 × 121.
- Pixel-aligned bounds `[106.3275, 11.083, 106.35775, 11.11325]`; pixel size `0.00025°`.
- Occurrence: 14,641 valid pixels, zero nodata pixels, 114 pixels with values 1–100, maximum 60% occurrence.
- 2024 seasonality: 14,641 valid pixels, zero nodata pixels, 63 pixels with water in at least one month, including 33 pixels at value 12.
- Normalized occurrence change: 131 comparable pixels with values 0–200; 14,510 pixels classified as not water (253); zero value-254 and value-255 pixels.
- Numeric/browser groups: `derived/ecosystem/jrc-water-occurrence-1984-2024-aoi.{tif,png,pgw,prj}`, `derived/ecosystem/jrc-water-seasonality-2024-aoi.{tif,png,pgw,prj}`, and `derived/ecosystem/jrc-water-change-1984-1999-vs-2000-2024-aoi.{tif,png,pgw,prj}`.

Visual inspection confirmed that all five PNGs decode, have the expected dimensions, and contain visible nonempty spatial patterns. GeoTIFF inspection confirmed EPSG:4326 geokeys, pixel scale, upper-left tiepoint, dimensions, compression, and nodata 255.

## Manifest contract and requirement mapping

`sources/ecosystem-records.json` is a top-level JSON array with two acquired records. Both contain the required Batch 01 fields plus exact `input_files` and `derived_files` path/hash pairs.

- `ecosystem-eth-canopy-height-2020-gialoc-aoi` maps conservatively to review groups `R02`, `R04`, `R05`, `R06`, `R13`, `R20`. It is only a partial modeled-height input to `R13`; it does not supply individual-tree evidence.
- `ecosystem-jrc-global-surface-water-v1-5-2024-gialoc-aoi` maps conservatively to review groups `R02`, `R04`, `R05`, `R06`, `R10`, `R18`, `R20`. It supplies public water history/change and a hydrology context input; it does not supply a flood or drainage model.

No record claims official ward coverage, cadastral precision, individual-tree inventory, airborne LiDAR, flood extent/depth, drainage capacity, rainfall-runoff calibration, or surveyed elevation.

## Acceptance criteria

1. **PASS** — Real ETH canopy-height provider bytes intersect the AOI; date/model, resolution, units, CRS, bounds, nodata, statistics, license, and hashes are recorded.
2. **PASS** — The matching ETH predictive-standard-deviation tile was acquired and normalized with exact lineage.
3. **PASS** — Real JRC occurrence, seasonality, and change provider bytes intersect the AOI; date ranges, resolution, semantics/classes, CRS, bounds, license, and hashes are recorded. Occurrence and seasonality subsets are nonempty.
4. **PASS** — Each PNG has `.pgw` and `.prj` sidecars; the recorded pixel-aligned bounds contain the requested AOI within one native source pixel.
5. **PASS** — All manifest references exist and SHA-256 recomputation matches; each record names its exact raw input paths and hashes. The Batch 03 strict registry build completed with 25 total records, 3 Batch 03 records, and zero validation errors; all adversarial registry-gate fixtures also passed.
6. **PASS** — Claims stay within canopy-model and surface-water-history scope and explicitly exclude individual-tree/LiDAR and flood/drainage-model interpretations.

## Limitations

- The AOI remains the Batch 01 OSM-derived technical bbox and does not prove the official boundary or full extent of phường Gia Lộc.
- ETH canopy height is a modeled 2020 wall-to-wall product, not current field observation. Nodata covers 8.350918% of the pixel-aligned AOI subset.
- Predictive standard deviation describes uncertainty of the ETH model; it is not a cadastral, engineering, or survey accuracy statement.
- JRC surface-water history is Landsat-derived at nominal 30 m. It does not resolve small drains reliably and cannot support parcel-level hydraulic conclusions.
- JRC v1.5 Collection 2 alignment changes can reach or exceed one 30 m pixel in some path/rows according to the official update note.
- Water occurrence, seasonality, and change remain descriptive remote-sensing evidence. They do not supply rainfall, terrain, drainage-network capacity, water depth, velocity, return period, or a calibrated flood model.

## Suggestions for integration

- Render canopy height and uncertainty as paired layers so users can inspect model value and uncertainty together.
- Expose occurrence, 2024 seasonality, and normalized change as separate water-history layers with their value semantics visible in the legend.
- Keep the 2020 and 1984–2024 dates, native resolution, AOI status, and exclusions visible in the Workbench source panel.
