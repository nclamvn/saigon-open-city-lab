# COMPLETION REPORT — TIP-GIS18

**STATUS: DONE** for the delegated shared raster-streaming, tile-producer, LOD-selector and computational-verification scope. Contractor owns final city UI acceptance.

**Files created and purpose**

- `outputs/shared/digital-twin-core/raster-worker-18.js`: shared source admission, verified HTTP206 transport, actual TIFF window/overview decoding and bounded caches in a Worker.
- `raster-client-18.js`: asynchronous init/read/cancel/destroy with stale-result, generation, timeout and error handling; no main-thread decoder fallback.
- `lod-18.js`: engine-independent camera/frustum/SSE selection under tile-count and byte budgets.
- `vendor/geotiff-3.0.5.js`, MIT license and `geotiff-18-dependency.json`: pinned local official dependency; no runtime CDN fetch.
- `scripts/build-tiles-18.cjs`: reproducible original-scene footprint tiler, ground sampler, explicit source/input fingerprint checks and staged publication.
- `tests/streaming-18.cjs`, `tests/cog-18.cjs`, `tests/tiles-18.cjs`: transport/admission/lifecycle/coordinate tests, actual numerical COG decoding and every produced GLB/sidecar.
- `outputs/hcmc-poc/data/tiles-18/`: 189 chunks, 378 GLB contents, 378 feature-index sidecars, catalog and standard 3D Tiles1.1 tileset JSON.
- `research/vibecode-18/qa/check-cog-browser.cjs`, `check-ground-alignment.py`, `make-cog-fixtures.py`: browser HTTP206 evidence and independent Rasterio/GDAL registration oracle; synthetic numerical fixtures are explicitly test data.

**API delivered**

```js
const reader = new RTRTwin.RasterClient18({workerUrl, timeoutMs: 30000});
await reader.init(manifest);
const patch = await reader.read({assetId, bbox, width, height});
// patch.values: ArrayBuffer, RGBA8 for RGB; Float32 physical values for scalar.
// patch.validMask: Uint8 ArrayBuffer. Scalar NoData is NaN, never fabricated zero.
// patch.bbox describes the actual snapped grid; width/height can be source-capped.
// Scalar values already have scale/offset applied once.
reader.cancel(); reader.destroy();
const selector = RTRTwin.Lod18.create({maxTiles:32, maxBytes:33554432, sseThreshold:16});
const selected = selector.select(catalog, cameraInLocalEastUpSouth);
```

One mesh primitive and one UInt32 index space per GLB. Feature sidecar `indexRange:[start,count]` contains `hit.faceIndex*3`; it resolves `canonicalId`, source identity and original `modelIndex`. Fine/coarse share the same 70,709 canonical representation identities. The ten illustrative scene parts are excluded.

**Verified produced inputs and output**

- Actual scene SHA256 `92c7b70bebbe7c0c35cc9c4cb972a60ee72777558619d675e456ea247f1bb804` is checked before publication. All five local registered OSM/Overture asset hashes and lengths were also reread and verified. Catalog contains producer-config fingerprint, admitted source records, normalization gate and verified asset evidence.
- GEDTM v1.2 padded Float32 ground COG: 198×212, SHA256 `9117a55df9c29d3f4753eb625e4414c01abb70404c39ab4b4c598bdcf6260a77`, 185,142 bytes; 41,976 valid pixels; reference at frame origin 3.8793262243270874 m. Source datum EGM2008/EPSG:3855; geometry uses display height relative to that reference.
- Actual final manifest SHA256 `3d429eb4ea8539f878406b92d786aafc7d35dbd961e34603921a450efa43b3b5`.
- Actual final catalog SHA256 `e4a3f163e126145c4cd6ec6ac145550b6039f542a409f61e35963c508a0773f8`.
- 70,709 source representations, 189 chunks, 128,371,656 total GLB bytes across both render levels.
- glTF is Y-up East-Up-South. Standard tile bounding boxes are ENU and the root transform has East/North/Up columns into WGS84 ECEF. The standard glTF Rx(π/2) axis conversion is accounted for. The local Three adapter deliberately renders glTF directly in East-Up-South.
- Only current catalog-referenced output remains: 758 files. Removed 1,512 unreferenced generated flat-build artifacts, 356,976,824 bytes; current referenced hashes remained verified.

**Test results — acceptance 8/8 passed**

1. Common source rights, acquisition and exact asset-path/hash admission; substituted CRS/NoData/origin and whole-file HTTP200 rejected.
2. Actual source byte ranges, expected strong ETag, exact Content-Range/body length; bounded recent logs and cumulative telemetry.
3. Worker window and internal-overview decoder; explicit output-pixel-center nearest sampling matches the returned bbox.
4. Native scalar grid, scale/offset exactly once, valid-mask/NaN behavior and positive-weight-only bilinear NoData handling.
5. Cancel/stale/reinit/timeout behavior, including reinit during real asynchronous COG open and old boot timers unable to kill a newer Worker.
6. Output dimensions ≤512, decoded block/window ≤8MiB, read-byte budget 8MiB, source-block cache 2MiB per asset, patch cache ≤8 entries/16MiB; LOD ≤32 selected tiles/32MiB by default.
7. All 378 actual GLB binary/accessor/index-space bounds and all stable fine/coarse sidecar identities; standard ENU/ECEF numeric placement.
8. Actual browser Worker reads and independent Rasterio/GDAL computed registration.

Final automated command: **18/18 PASS**. An additional timeout/old-boot-timer case was added after the Contractor's earlier 17-test snapshot.

```sh
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test outputs/shared/digital-twin-core/tests/streaming-18.cjs outputs/shared/digital-twin-core/tests/cog-18.cjs outputs/shared/digital-twin-core/tests/tiles-18.cjs
```

All four owned JavaScript implementation syntax checks pass.

Actual standalone empty-page browser evidence: `qa/cog-browser-results.json` — PASS, zero page errors, no WebGL scene. Small off-grid RGB patch reads 786,432/1,199,280 source bytes via validated 206; repeat patch reads 0 bytes; far-view overview 1 reads an additional 131,072 bytes. Full native ground/DSM/uncertainty reads preserve 41,976 / 41,976 / 41,609 valid pixels; uncertainty keeps 367 NoData pixels.

Independent oracle: `qa/ground-alignment-oracle.json` generated by `qa/check-ground-alignment.py`, Rasterio 1.5.1 / GDAL 3.12.4 / NumPy 2.5.3. All 70,709 base offsets and the origin reference agree exactly with independently decoded source samples, maximum 0m difference at computational tolerance 1e-9m. Every one of six browser output buffer and validity-mask hashes matches direct independent TIFF-directory decoding, including off-grid RGB and odd-dimension overview. This is computational verification, not source survey accuracy.

```sh
PYTHONPATH=/private/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 research/vibecode-18/qa/check-ground-alignment.py
```

Contractor independent final producer oracle: 378 GLBs/189 chunks/70,709 IDs PASS (`qa/check-produced-tiles.py`). Official Khronos validator: 378/378 GLBs, zero errors and warnings (`qa/validate-glb.cjs`, `qa/khronos-glb-validation.json`).

**Issues found and resolved**

- GeoTIFF's built-in nearest resize uses a different index origin. Replaced it with explicit output-center sampling and verified every output pixel against an independent decoder.
- Source-cell centers near AOI edges need padded ground coverage. Final ground asset has padded bbox; project scope remains unchanged. NoData or outside-center samples fail rather than clamp or invent zero.
- Source booleans alone were insufficient. Runtime and producer now reuse SourceCore admission, exact streamed asset membership and actual offline hash checks. Input bytes identify versions, not physical truth.
- Old asynchronous read/boot callbacks could otherwise affect later sessions. Generation checks now prevent old cache insertion and newer Worker termination.

**Deviations and practical limits**

- No scope-changing deviation. Render fine/coarse levels are not surveyed CityGML LoDs. Sidecar metadata is implemented; `EXT_mesh_features`, full 3D Tiles viewer certification and arbitrary CRS/rotated raster support are not claimed.
- Terrain remains a modeled approximately 31m grid, imagery approximately 10m; finer geometry/material rendering cannot recover cm-level source detail. Each footprint receives one flat base at its bbox center. Vertical ECEF placement uses an artificial relative display reference, not certified absolute surveyed height.
- Current 512px COG blocks cause substantial byte overhead for small windows. Contractor elected to retain final sources this batch; narrower producer blocks/extra overviews are a future optimization. Full-native tiny 185kB ground reads intentionally consume the complete local COG through explicit ranges; there is no HTTP200 whole-file fallback.
- Offline full-file SHA verification and controlled server strong ETags bind streamed versions. The browser does not cryptographically hash an entire COG for each partial window. Decoder abort is cooperative; stale-result suppression remains enforced even when an underlying decode finishes after cancellation.
- All source accuracy, physical identity reconciliation, capture epochs, rights obligations and planning approval limitations remain explicit in source records. No future planning geometry or payload survey data was fabricated.

**Suggestions for Contractor**

- Retain exact native ground sampling for UI roads and overlays; scalar patch values are already physical metres. Subtract the declared reference only for display.
- Treat legacy flat analysis and terrain display as distinct documented views until a true 3D analytical/geodetic model is available.
- Future ingestion should produce immutable COGs with smaller spatial blocks/appropriate overviews and bind the same source/coordinate/NoData contract before activation.
