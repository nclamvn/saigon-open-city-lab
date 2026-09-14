# C05 Optical source research — Gia Lộc pilot AOI

AOI: `[106.3276338, 11.0830401, 106.3576338, 11.1130401]`, centre `[106.3426338, 11.0980401]`. This is the project pilot bbox, not an official ward boundary.

## Key findings

1. No public OAM/HOTOSM optical imagery item was found for the AOI. Both OpenAerialMap legacy API and HOTOSM Imagery STAC `collections=openaerialmap` returned zero features for the exact AOI and for a wider Tây Ninh envelope.
2. The strongest freely accessible new data is not RGB: Google Open Buildings 2.5D Temporal has Vietnam coverage and public GCS COGs. A bounded 2023 AOI crop was created for building presence/count/height at an effective 4 m grid. It helps building massing, not visual texture.
3. Planet/NICFI should not be treated as unconditional free RGB for an RtR city demo. The historical NICFI satellite data contract period ended on 2025-01-23 while a new phase was being developed; the current Planet Tropical Forest Observatory page describes non-commercial conservation access, with operational government/business routes pointing to sales. It may still be useful if eligibility and EULA fit, but current AOI asset dates/coverage and business entitlement were not verified.
4. Esri/Google/Bing basemaps likely display clearer imagery than Sentinel in a browser, but their terms prevent treating tiles as reusable survey rasters. They are visual-only/rights-blocked for Batch04 acquisition.
5. Maxar commercial Discovery and Airbus OneAtlas are credible high-resolution acquisition paths, but require credentials/payment. Maxar Open Data event catalog had no Vietnam/Tây Ninh event entry.
6. Copernicus VHR/Contributing Missions is restricted to eligible user categories; no public AOI asset was acquired.
7. LOCAL reported a primary NRSD lead: report `22/BC-VTQG` Appendix 2 row 13 lists SPOT6 acquisition for Tây Ninh (`ICR_SP_169737`) with 3 scenes total, only 1 scene under 25% cloud, scheduled 2026-04-01 to 2026-05-31. This is a strong lead, but this optical pass has not verified footprints, scene IDs, download rights, or free reuse. SPOT6/7 must be described accurately: panchromatic 1.5 m, multispectral 6 m, pansharpened products possible; not native RGB 1.5 m and not facade detail.

## Acquired bounded asset

Google Open Buildings 2.5D Temporal 2023 was cropped over the AOI from four public GCS COG tiles. Output is model-derived building data, not an optical basemap.

| Output | sha256 |
|---|---|
| `evidence/optical/google-open-buildings-temporal-2023-aoi-effective4m.tif` | `530761d4d1782b4686a8ebefe1cd785e9328ae79abcca321a775871e17d59897` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-presence.png` | `3731f8e14bbf0b3d088e4cb6733e73b9a8e09957c4659a7434982ae2716b95fb` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-height.png` | `dcb34ceeacfa2df078b57b0ba1400e06ee75e8d8e2bac053be974d202ed4f540` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-qa.json` | `adabfd86ddd4ffb751787fb82f47c5eaefd79835622559c885f608a821299887` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-source-manifest.json` | `0ee277dd0aae280e6fa0132668112cf2ea6cf627da3b46beda21535eece2addf` |
| `evidence/optical/reproduce_google_open_buildings_temporal_2023_aoi_crop.py` | `76bb12d4337602f3349f4594753468060ea1ff86e990281a634e856c0ea078d2` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-reproduction-README.md` | `2d10e1eb7df6b52122c9f0c80989490c0aeffae608ae24bb36ce377613ecc083` |

QA summary:

- CRS: EPSG:32648
- Derived grid: 823 × 833 at 4 m
- Requested AOI bounds EPSG:32648: `[644992.3672623612, 1225484.2373552984, 648284.4023861852, 1228817.0065319908]`
- Actual derived bounds EPSG:32648: `[644992.3672623612, 1225485.0065319908, 648284.3672623612, 1228817.0065319908]`
- Edge trim from 4 m rounded grid: south `0.769 m`, east `0.035 m`, west/north `0 m`
- Source file grid: 0.5 m; effective resolution is approximately 4 m
- Bands: `building_fractional_count`, `building_height`, `building_presence`
- Valid pixels: 685,559
- Presence > 0.5 pixels: 40,423
- Model height over presence > 0.5: mean 5.47 m, max 17.84 m

Limits:

- This is not RGB imagery.
- The model is derived from Sentinel-2 stacks and teacher labels; high-resolution training imagery is not publicly released.
- Height is model-derived, not measured. The reported height MAE on the Google page is not a Gia Lộc validation result.
- The 0.5 m file grid must not be marketed as 0.5 m effective imagery.
- The 4 m derived grid trims a subpixel south/east border and must not be described as exact full-subpixel AOI coverage.

## Source assessment

Detailed source records are in `research/optical-sources.json`.

| Source | Result | Practical meaning |
|---|---|---|
| OpenAerialMap legacy API | Exact AOI and wide envelope returned `found:0` | No public OAM GeoTIFF/tiles found. |
| HOTOSM Imagery STAC OAM collection | Exact AOI and wide envelope returned `features:[]` | No OAM imagery item found through current STAC collection. |
| HOTOSM unfiltered STAC | Returned COPDEM 30 m DEM | Endpoint works; result is not optical imagery. |
| Google Open Buildings Temporal | Public access and bounded AOI crop succeeded | Useful building raster supplement; not RGB. |
| Planet Tropical Forest Observatory / historical NICFI | Historical 4.77 m basemaps; current page describes non-commercial conservation access and sales route | Candidate only if eligibility/EULA or commercial licensing fits; not unconditional free RGB for RtR city demo. |
| Maxar Open Data | Public event catalog has no Vietnam/Tây Ninh event | No free Maxar open-data AOI asset found. |
| Maxar Discovery | AOI query requires JWT/API key | Commercial discovery candidate; coverage unknown without account. |
| Copernicus VHR/CCM | Restricted eligible-user access | Not publicly downloadable for this task. |
| Esri World Imagery | Service metadata public; terms restrict reuse | Visual reference only unless licensed/exported inside Esri terms. |
| Google Maps Tiles | Terms prohibit extraction/caching/off-service use | Visual reference only; not acquired. |
| Bing Maps Imagery | Terms prohibit raw tile saving | Visual reference only; not acquired. |
| Airbus OneAtlas | 30 cm/50 cm/1.5 m products exist; auth/payment required | Strong paid acquisition route; no free AOI asset verified. |

## Recommended next actions

1. Ask LOCAL/root to continue the NRSD/SPOT6 lead and obtain footprint, scene IDs, download/ordering path, license/reuse terms, and whether data can be used in RtR deliverables.
2. For Planet, first decide eligibility: conservation/non-commercial users may apply through Tropical Forest Observatory; operational government/business city-demo use should contact Planet sales. Do not assume current free entitlement or AOI dates from the historical NICFI/GEE docs.
3. If budget allows, run authenticated Maxar/Airbus searches and compare scene date/cloud/off-nadir/license before buying. These are the realistic routes for sub-meter optical basemap quality.
4. Feed Google Open Buildings Temporal crop only as a building-presence/height supplement after synthesis; label it as model-derived.
5. Do not harvest Google/Esri/Bing tiles into Batch04. They are useful for human visual comparison, not as project source rasters.
