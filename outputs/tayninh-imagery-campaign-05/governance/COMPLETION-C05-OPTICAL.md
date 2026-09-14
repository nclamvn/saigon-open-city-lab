# COMPLETION-C05-OPTICAL

Status: PASS

Scope implemented: optical/source research for `outputs/tayninh-imagery-campaign-05/governance/TIP-C05-OPTICAL.md`. No Batch04 files were modified.

## Files created

| Path | Role | sha256 |
|---|---:|---|
| `research/optical.md` | source assessment report | `4a803599641cc2de7edea88cb18e9846bb51cd4bacd6e0efdfac45004981fac7` |
| `research/optical-sources.json` | machine-readable source records | `9bbecb5ca3e09ae6be4165871a06bd6f4177c7ea2f2bfba970fcac09707bdf4a` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-effective4m.tif` | bounded model-derived building raster crop | `530761d4d1782b4686a8ebefe1cd785e9328ae79abcca321a775871e17d59897` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-presence.png` | browser preview of building presence | `3731f8e14bbf0b3d088e4cb6733e73b9a8e09957c4659a7434982ae2716b95fb` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-height.png` | browser preview of model height | `dcb34ceeacfa2df078b57b0ba1400e06ee75e8d8e2bac053be974d202ed4f540` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-qa.json` | crop QA | `adabfd86ddd4ffb751787fb82f47c5eaefd79835622559c885f608a821299887` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-source-manifest.json` | source manifest for reproducible crop | `0ee277dd0aae280e6fa0132668112cf2ea6cf627da3b46beda21535eece2addf` |
| `evidence/optical/reproduce_google_open_buildings_temporal_2023_aoi_crop.py` | reproduction script for crop | `76bb12d4337602f3349f4594753468060ea1ff86e990281a634e856c0ea078d2` |
| `evidence/optical/google-open-buildings-temporal-2023-aoi-reproduction-README.md` | reproduction notes | `2d10e1eb7df6b52122c9f0c80989490c0aeffae608ae24bb36ce377613ecc083` |
| `evidence/optical/nicfi-2025-program-new-phase.html` | current NICFI transition page snapshot | `edcf3cbddf01ad79d0af402cc0c6328677f10cfed46d4426bf5cc476a1c06d65` |
| `evidence/optical/planet-tropical-forest-observatory.html` | current Planet TFO page snapshot | `d6570727ec9eb54d3950ff2b8fe14aa30cc4367c64b29ad209e12f9e9dfc83d6` |

Additional evidence snapshots/receipts are under `evidence/optical/` and referenced from `research/optical-sources.json`.

## Key results

- No OAM/HOTOSM public optical imagery item was found for the exact AOI or wider Tây Ninh envelope.
- Google Open Buildings 2.5D Temporal was publicly accessible and cropped for AOI year 2023. It is building presence/count/height raster data, not RGB imagery.
- Planet/NICFI is not an unconditional free RGB source for RtR city-demo use. NICFI says the prior satellite data contract period ended on 2025-01-23 while a new phase was being developed; the current Planet Tropical Forest Observatory page describes non-commercial conservation access and a sales route for other operational users. No signup, qualification, AOI export, or business entitlement was verified.
- Esri/Google/Bing basemaps are visual-only/rights-blocked for project raster acquisition.
- Maxar/Airbus are credible high-resolution paid/authenticated routes; no free AOI asset was verified.
- Copernicus VHR/CCM is restricted to eligible user categories.
- LOCAL’s NRSD/SPOT6 Tây Ninh lead should be pursued: row 13 reports 3 scenes total and only 1 scene under 25% cloud, scheduled 2026-04-01 to 2026-05-31. This optical pass has not verified footprint, scene ID, download path, or reuse rights.

## Google Open Buildings Temporal crop QA

- Year: 2023
- CRS: EPSG:32648
- Derived grid: `823 × 833`
- Derived grid spacing: `4 m`
- Requested AOI bounds EPSG:32648: `[644992.3672623612, 1225484.2373552984, 648284.4023861852, 1228817.0065319908]`
- Actual derived bounds EPSG:32648: `[644992.3672623612, 1225485.0065319908, 648284.3672623612, 1228817.0065319908]`
- Edge trim from 4 m rounded grid: south `0.769 m`, east `0.035 m`, west/north `0 m`
- Source file grid: `0.5 m`
- Effective resolution: approximately `4 m`
- Valid pixels: `685559`
- `building_presence > 0.5` pixels: `40423`
- Model height over presence mask: mean `5.4666547775268555 m`, max `17.844974517822266 m`

This crop must be labelled model-derived. It is not measured building height and not an RGB basemap. The 4 m rounded grid trims a subpixel south/east edge; do not describe it as exact full-subpixel AOI coverage.

## Commands run

```bash
curl -L 'https://api.openaerialmap.org/meta?bbox=106.3276338,11.0830401,106.3576338,11.1130401' -H 'Accept: application/json' -o outputs/tayninh-imagery-campaign-05/evidence/optical/oam-api-exact-aoi.json
curl -L 'https://api.imagery.hotosm.org/stac/search?collections=openaerialmap&bbox=106.3276338,11.0830401,106.3576338,11.1130401&limit=10' -H 'Accept: application/geo+json' -o outputs/tayninh-imagery-campaign-05/evidence/optical/hotosm-stac-oam-exact-aoi.json
curl -L 'https://api.imagery.hotosm.org/stac/search?collections=openaerialmap&bbox=105.7,10.7,106.6,11.9&limit=20' -H 'Accept: application/geo+json' -o outputs/tayninh-imagery-campaign-05/evidence/optical/hotosm-stac-oam-wide-tayninh-envelope.json
curl -L 'https://api.openaerialmap.org/meta?bbox=105.7,10.7,106.6,11.9' -H 'Accept: application/json' -o outputs/tayninh-imagery-campaign-05/evidence/optical/oam-api-wide-tayninh-envelope.json
```

Result: OAM/HOTOSM OAM collection returned zero imagery features.

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pip install --target /tmp/c05-optical-pylib s2sphere
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pip install --target /tmp/c05-optical-pylib rasterio
```

Result: temporary `/tmp` dependencies used for S2 token calculation and COG window reads; no repo dependency change.

```bash
PYTHONPATH=/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
```

Used to calculate S2 token `31`, inspect Google Open Buildings Temporal manifests, and create a bounded 2023 AOI crop from four remote COG tiles.

```bash
PYTHONPATH=/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-imagery-campaign-05/evidence/optical/reproduce_google_open_buildings_temporal_2023_aoi_crop.py
```

Result: reproduction script records the same four public GCS COGs, EPSG:32648 transform, 4 m resampling, output stats, actual derived bounds, and edge trim metadata.

```bash
python3 -m json.tool outputs/tayninh-imagery-campaign-05/research/optical-sources.json >/tmp/c05-optical-sources.pretty.json
```

Result: JSON valid; `11` source records.

```bash
shasum -a 256 outputs/tayninh-imagery-campaign-05/research/optical.md outputs/tayninh-imagery-campaign-05/research/optical-sources.json outputs/tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-effective4m.tif outputs/tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-qa.json
```

Result hashes are recorded above.

## Acceptance criteria

| AC | Result | Evidence |
|---|---:|---|
| C05-O01 primary-source breadth | PASS | OAM/HOTOSM, Google Open Buildings Temporal, NICFI/Planet, Maxar, Copernicus VHR, Esri, Google Maps, Bing, Airbus reviewed with snapshots/receipts. |
| C05-O02 actual AOI checks | PASS | OAM/HOTOSM exact and wide AOI receipts; Maxar/Planet auth receipts; Google Open Buildings AOI tile/crop generated. |
| C05-O03 exact pixel/date/license distinctions | PASS | Report separates RGB imagery from model rasters, file grid from effective resolution, visual-only basemap rights from reusable data, and paid/auth routes from free exports. |
| C05-O04 reproducible receipts/completion | PASS | `research/optical-sources.json`, `research/optical.md`, evidence files, QA JSON, source manifest, reproduction script, README and hashes produced. |

## Limits

- No higher-resolution reusable RGB raster was acquired.
- Google Open Buildings Temporal improves building/massing evidence but does not solve blurry RGB texture.
- Commercial basemaps may look better in browsers, but they were not acquired because reuse/export rights are blocked or unverified.
- The NRSD/SPOT6 lead is promising but remains pending primary receipt/footprint/rights confirmation from LOCAL/root synthesis; current known detail is 3 scenes total, only 1 under 25% cloud.
