# COMPLETION-SOURCES — Batch 18

Builder: twin_sources. Scope completed: source investigation, actual raster acquisition, geographic COG preparation, source/QC contracts, and bounded official archive/photo audit. UI, GIS, worker and Batch 17 core were not edited.

## Delivered results

Manifest: `outputs/hcmc-poc/data/surface-18/manifest.json`, schema `rtr-surface-project/1.0`, project `hcmc`. All four delivered COGs are north-up EPSG:4326, DEFLATE, 512-pixel tiled, with overviews. They have explicit URL, dimensions, source CRS/datum, NoData, native/effective resolution, physical units, representation, rights and SHA-256/byte fingerprints.

| Asset | Source and meaning | Native / derived effective grid | Size and overviews |
| --- | --- | --- | --- |
| imagery | Actual Sentinel-2B RGB, 26 April 2026 at 03:25:12.458 UTC | 10 m / 10.02 m | 601 × 645, 1,199,280 bytes, overview 2 |
| ground | GEDTM30 v1.2 predicted ground, source period label 2006–2015 | nominal 30 m / 31.09 m | 198 × 212, 185,142 bytes, overviews 2 and 4 |
| dsm | Copernicus GLO-30 surface, includes vegetation/infrastructure; tile capture date unknown | nominal 30 m / 31.09 m | 198 × 212, 184,603 bytes, overviews 2 and 4 |
| ground-uncertainty | GEDTM random-forest model spread, kind `uncertainty`; not absolute ground height or checkpoint accuracy | nominal 30 m / 31.09 m | 198 × 212, 192,320 bytes, overviews 2 and 4 |

Viewing scope remains [106.684, 10.750, 106.739, 10.808]. Height assets extend to [106.68339999999999, 10.7494, 106.73960000000001, 10.8086], providing approximately two native cells beyond each scope edge. Ground/DSM/uncertainty use identical derived grids. Source TIFFs for GEDTM actually report a 1 arc-second grid, scale 1, offset 0 and `VERTICAL_DATUM=EGM2008/EPSG:3855`; these are not the coarser Zenodo downloadable previews. Copernicus source uses pixel-is-point metadata; its actual transform is retained and reprojected by GDAL, without a guessed half-cell correction.

The modeled ground sample at frame origin [106.7115, 10.779] is `referenceHeightM = 3.8793262243270874`. Display height is source height minus this reference. Sampling uses strict pixel-centre bilinear interpolation: outside the pixel-centre domain or any positively weighted NoData/nonfinite neighbor rejects a sample; zero-weight neighbors are ignored. This is a relative visual reference, not surveyed geodetic elevation. GIS/UI received the ground URL, byte hash, grid and reference before optional sources finished.

Source windows are native-grid lossless re-encodings of bounded provider pixel windows, not full remote TIFF originals. Their metadata preserves source dimensions, grid/window, raw values, scale/offset, band tags and source URL. Source-window hashes differ from remote-object identity. Successful GEDTM acquisition also retains bounded HTTP range response bodies, range/ETag receipts and hashes; failed-transfer leftovers stay quarantined and are not admitted assets. No global raster was downloaded. Ground and uncertainty are licensed CC BY 4.0; producer documentation says this first release is for testing purposes. Sentinel and Copernicus terms/attribution remain applicable.

Eight actual Sentinel AOI SCL windows were screened. The selected 26 April candidate has 0% product-classified cloud/shadow and 0% NoData in this crop; it is the latest clear candidate **among those eight screened**, not a claim about all possible scenes. July's candidate had 59.04% local cloud/shadow, and 25 March had 18.93% local NoData. Product SCL is not independent atmospheric validation. The delivered RGB is real provider visual imagery, not calibrated surface-reflectance analytics or centimetre orthophotography.

DSM minus DTM on the padded common grid: 41,976 valid samples, mean 0.973 m, median 0.903 m, p05 −1.0 m, p95 3.138 m, and 7,422 negative differences. This compares two sources with different periods/methods. It is not a survey error statistic or a reliable building/canopy height inventory.

## Six acceptance criteria

1. **Completed investigation; operational official rights held.** The public DCAT snapshot contains 102 dataset records. Five spatial candidate groups are resolved through RDF dataset → distribution edges, with dataset pages, resource pages, download URLs, publication dates and unknown capture dates preserved. The 1/2000 resource is a downloaded 871,094-byte PDF database-field schema appendix, not planning geometry. The actual ThuaDat FeatureServer metadata returns 401; other discovered ArcGIS proxy metadata endpoints return HTTP 200 with zero-byte bodies. No authentication bypass or personal record request occurred. The newer 142-item official catalogue is a separate listing, not 142 acquired geospatial layers.
2. **Completed actual RGB and local quality acquisition.** Immutable native RGB/SCL windows, selected STAC item, eight candidate-quality results and actual COG/preview are retained.
3. **Completed actual modeled DTM, uncertainty and distinct DSM acquisition.** Native source scale/datum/grid verified; no DSM renamed ground, no surveyed height claim.
4. **Completed raster preparation.** Four geographic COGs, explicit masks/NoData, overviews, source/destination transforms and conservative derived effective grid values. Padded height assets protect edge sampling.
5. **Completed reusable preparation and QC.** Offline cache rebuild succeeds; 12 scientific/parser tests pass, four asset fingerprints/layout/bounds/reference checks pass, three SourceCore ingestion contracts pass. Cloned unknown/denied rights and lead-only acquisition contracts reject ingestion. This is declared source QC, not independent truth certification.
6. **Completed real-photo investigation; verified reconstruction assets remain unavailable.** Existing 20 real facade photograph hashes all match. Metadata for 100 geolocated Commons images was audited. Two CC BY-SA 4.0 Opera House same-day candidate sets were found: four photographs on 2 November 2023 and three on 10 December 2023. Focal EXIF is present; the December set includes GPS EXIF. Overlap, complete coverage, calibration, camera poses/control and registration remain unverified. These are useful leads; no new image bytes were ingested and no SfM/3DGS training or fabricated asset occurred.

Additional official archive: the 14,759,558-byte forest ZIP was acquired into quarantine with SHA-256 `4e0ba2cfb17a46509639904b3fe4cd0f65a218cdd37e1f341a93d61b2e1470d2`. It contains only a decision PDF, an XLSX inventory and a map PDF, with no native vector container or README/license. Native feature counts, CRS and central geometry overlap remain unknown/null; PDF registration and spreadsheet geometry fields were not validated. The archive is held and no members were extracted or operational layers generated. Public access did not establish raw-data reuse rights.

## Reproduction and checks

Successful runtime: Python 3.12.14 at `/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`, with `PYTHONPATH=/private/tmp/c05-optical-pylib`; rasterio 1.5.1, GDAL 3.12.4, numpy 2.5.3, Pillow 12.3.0. The default shell Python may differ; the exact successful command is:

```sh
PYTHONPATH=/private/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/shared/digital-twin-core/scripts/prepare-surfaces-18.py --self-test --verify --audit-sources
PYTHONPATH=/private/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/shared/digital-twin-core/scripts/prepare-surfaces-18.py --build --verify
PYTHONPATH=/private/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/shared/digital-twin-core/scripts/prepare-surfaces-18.py --acquire-official-forest
```

All succeed offline with the retained inputs. A fresh raster acquisition needs provider network access. Direct GDAL GEDTM tile transfers timed out; the tested relay splits large provider ranges into 256 KiB chunks with at most eight concurrent requests, verifies 206/range/body/ETag consistency, and retains byte evidence. The cap is 16 MiB per GDAL request and 64 MiB per source session, with a bounded 300-second GDAL transfer timeout. Cached source windows are fingerprinted, source-URL matched and checked for scope coverage before reuse. Existing source bytes are not overwritten. Failed downloads are never published as ready data.

For a clean runtime, these official PyPI dependency commands are documented as an alternative; they were not required or executed for this batch:

```sh
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m venv /private/tmp/rtr-twin18-venv
/private/tmp/rtr-twin18-venv/bin/python -m pip install --index-url https://pypi.org/simple rasterio==1.5.1 numpy==2.5.3 Pillow==12.3.0
/private/tmp/rtr-twin18-venv/bin/python outputs/shared/digital-twin-core/scripts/prepare-surfaces-18.py --self-test --verify
```

Verification evidence: `evidence-source-owned/verification-command.txt`, `source-gate-qc.json`, `surface-build-report.json`, `hcm-dcat-spatial-resolved.json`, original-source/provider receipts and STAC/SCL candidate snapshots. The source compiler also tests nonidentity provider scale/offset through native quarantine **and** actual COG conversion, including NoData preservation; interpolation domain/NoData rules; north-up source grids; conservative grid resolution; and RDF distribution joins/unresolved references. One generated manifest metadata refinement was snapshotted before adding conservative effective-grid spacing and explicit reference bbox; COG/native source bytes stayed unchanged.

## Primary sources and practical limits

- [Sentinel-2 official collection and resolution](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) and [Copernicus terms](https://dataspace.copernicus.eu/terms-and-conditions): open mission data rights differ from rights over other website content.
- [Earth Search Sentinel COG registry](https://registry.opendata.aws/sentinel-2-l2a-cogs/): source discovery/download provenance is retained in actual STAC records.
- [GEDTM producer release](https://github.com/openlandmap/GEDTM30/releases) and [Zenodo producer record](https://zenodo.org/records/18887460): model scope, testing-purpose note and CC BY 4.0, with actual v1.2 raster metadata taking precedence over preview-file resolution descriptions.
- [Copernicus DEM public AWS registry](https://registry.opendata.aws/copernicus-dem/) and [producer collection/datum specification](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM): DSM, EGM2008, public GLO-30 terms; capture dates for this tile remain unknown.
- [Official HCMC 142-item open catalogue notice](https://shtp.hochiminhcity.gov.vn/danh-muc-du-lieu-mo-cua-thanh-pho-ho-chi-minh-962.htm) and [public DCAT catalogue](https://opendata.hochiminhcity.gov.vn/catalog.xml): discovery evidence, not independent map accuracy or approved future-plan geometry.
- Commons primary file pages and licence metadata are retained in `photo-readiness.json` and audited API snapshots; each photograph has its own applicable attribution/share-alike terms.

The acquired raster stack supports an honest context map and common ingestion/streaming/LOD architecture. It does not provide 1 cm orthomosaics, engineering LiDAR, complete registered facade capture, independently checked absolute XY/Z, approved future planning geometry or a calibrated hydrological model. Those capabilities remain gated rather than manufactured from resampling or procedural detail.
