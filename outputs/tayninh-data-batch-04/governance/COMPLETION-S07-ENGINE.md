# COMPLETION-S07-ENGINE

Builder: `/root/data_workbench`  
Date: 2026-09-14  
Status: READY FOR ROOT BROWSER QA. Static/runtime-admission work is frozen on the C side unless Root finds a new blocking defect. No edits were made to `static/solution-layer.js`, `static/s07-surface.js`, or data assets.

## Files changed

- `outputs/tayninh-data-batch-04/index.html`
- `outputs/tayninh-data-batch-04/static/styles.css`
- `outputs/tayninh-data-batch-04/static/app.js`
- `outputs/tayninh-data-batch-04/static/s07-importer.js`
- `outputs/tayninh-data-batch-04/static/s07-worker.js`
- `outputs/tayninh-data-batch-04/static/s07-chunks.js`
- `outputs/tayninh-data-batch-04/static/s07-ui.js`
- `outputs/tayninh-data-batch-04/scripts/s07-engine-fixtures.mjs`
- `outputs/tayninh-data-batch-04/governance/BASELINE-S07-ENGINE.json`
- `outputs/tayninh-data-batch-04/governance/S07-ENGINE-FIXTURES.json`
- `outputs/tayninh-data-batch-04/governance/COMPLETION-S07-ENGINE.md`

`static/solution-ui.js`, `static/solution-layer.js`, `static/s07-surface.js`, derived data, manifests, and raw assets were not changed by C.

## Implementation summary

- Added S07 chunk runtime with Web Worker partitioning, request IDs, generation tokens, stale rejection, timeout/error fallback, 250 m logical cells, centroid ownership, neighbor query metadata, bounded cache, and disposal cleanup.
- Consumed the exact A schema under `manifest.roi_250m`: center target `msft_0615`, 52 centroid members, 57 footprint intersections, and 5 border-only query IDs. Fallback remains only for absent A manifest.
- Removed boot-time fine construction of all 52 sample buildings. Sample coarse fallback is built once and remains visible in overview/buildings/elevation whenever a fine chunk is inactive, so A/B and elevation do not lose sample buildings.
- Focus now targets the actual `msft_0615` footprint with radius 125 m and refreshes inspector payload from rendered base/coarse/fine descriptors when available.
- Diagnostics now separate base and S07 sample counts instead of overwriting base QA fields. Total model/proxy height fields are reported separately and use the same `heightInfo()` path as rendering.
- Added importer module for admitted future-source formats:
  - raster metadata/georegistration JSON validation only, explicitly not a GeoTIFF pixel decoder;
  - GeoJSON single Polygon footprint parser to canonical descriptors, rejecting unsupported CRS, holes, MultiPolygon, duplicate IDs, unclosed rings, and self-intersections;
  - GLB 2.0 JSON/BIN metadata mesh descriptor validation with explicit rejection of nodes/TRS/matrix semantics, skins, animations, morph targets, Draco/required extensions, materials/textures/external resources, duplicate/unknown chunks, trailing bytes, bad chunk order, accessor bounds outside bufferView, bad stride, and misalignment. WebCrypto SHA-256 raw byte verification is required before integrity can be claimed.
- Added S07 UI panel in Vietnamese with real A/B detail toggle, compact leadership metrics, pending photo/source receipts, material status, and a collapsed developer validation path for metadata/GeoJSON/GLB. Receipt links with `tayninh-data-batch-04/...` are resolved from the outputs root to avoid double-Batch04 URLs. Panel refresh preserves JSON textarea value/selection, kind selector, focus, and the actual GLB file input DOM node so repeat hash-match/hash-mismatch checks keep the selected file.
- Integrated optional `B04S07Surface` APIs without owning B code: inline fine chunks, material arrays, shared texture protection, and optional vegetation enrichment.
- Probe now includes S07 schema/version/status, chunks, worker job timing (`workerLastMs`, `roundtripLastMs`), importer fixtures/result, material status, sample IDs/bounds, and explicit hash caveat: browser hash verification is claimed only when raw bytes are supplied to the async GLB hash gate.
- Cache keys are `s07-final`; baseline hashes are saved.

## Requirement coverage

| Requirement | Status | Evidence / limitation |
|---|---|---|
| S07-C01 chunks/cache/LOD | PASS static + fixtures; Root browser pending | Synthetic fixture proves centroid ownership, border-only query IDs, cache bound/eviction, and boot fallback. Runtime no longer builds all 52 fine sample buildings at boot. Fine chunks are disabled entirely unless detail=detailed and mode is overview/buildings; A/elevation updates return active=[] and create no fine chunks, leaving coarse sample fallback visible. Boot no longer forces a sample fine chunk before camera placement in either rebuild or initial setup, and mode changes call chunk admission refresh immediately so active/UI/probe do not stay stale. |
| S07-C02 WebWorker/stale/fallback | PASS static + fixtures; Root browser pending | Real `static/s07-worker.js`, request IDs, generation, timeout, messageerror/error handling, stale rejection, sync fallback, and worker/roundtrip timing in snapshot/probe. |
| S07-C03 importer | PASS for declared limited formats | 22 negative adversarial cases are rejected, including Root’s GLB alignment, duplicate GeoJSON ID, node/TRS, skin/animation, Draco, material/texture, morph target, unknown/duplicate chunk, trailing byte, accessor bounds/stride/alignment cases. No LAS decoder and no full GeoTIFF pixel decoder are claimed. |
| S07-C04 atomic source/scale/height | PASS static | Existing command queue preserved. Rebuild disposes chunks and recreates with generation key `[terrain,scale,heights,detail,materialStatus]`; active inspector refresh now searches base + S07 sample render descriptors. |
| S07-C05 UI | PASS static; Root browser pending | Vietnamese compact panel, A/B labels avoid implying all data are observed, full photo registry count remains pending with receipts, and validate-only importer UI is present. |
| S07-C06 six modes/nav/pick/probe | PASS static; Root browser pending | Existing controls kept. Fine/coarse pickables are lifecycle-managed and visibility-filtered by parent visibility. Probe expanded with S07 details and timing. |
| S07-C07 numeric tests/browser closure | PARTIAL browser | Syntax, importer/chunk fixtures, and S06 data validator pass. Browser visual/mobile/picking remains Root-owned. Latest C patches preserve importer inputs, report GLB results with `kind: glb`, `publish: false`, explicit `integrityVerified`, tighten the GLB subset, reduce mobile collapsed S07 height to header + A/B only, gate fine chunk admission so A/elevation keep coarse sample coverage, remove boot-time forced fine chunk creation, and refresh chunk admission on mode button changes. |

## Test results

```bash
node --check outputs/tayninh-data-batch-04/static/app.js
node --check outputs/tayninh-data-batch-04/static/s07-importer.js
node --check outputs/tayninh-data-batch-04/static/s07-worker.js
node --check outputs/tayninh-data-batch-04/static/s07-chunks.js
node --check outputs/tayninh-data-batch-04/static/s07-ui.js
# all exit 0
```

```bash
node outputs/tayninh-data-batch-04/scripts/s07-engine-fixtures.mjs
```

Fixture summary:

```json
{
  "allInvalidRejected": true,
  "invalid_count": 22,
  "chunks": {
    "centroidOwnedCount": 4,
    "queryIncludesBorderOnly": true,
    "cellCount": 4,
    "bootFailureFallback": true,
    "cacheBounded": true,
    "evictedAtLeastOne": true,
    "staleRejected": true,
    "disabledUpdateActiveEmptyNoCreate": true,
    "workerMsRecorded": true
  },
  "allChunkFixturesPassed": true
}
```

Rejected importer cases:

- `glb_position_bufferView_outside_bin`
- `glb_position_componentType_123`
- `glb_index_type_vec4`
- `glb_index_out_of_range`
- `glb_nonfinite_position`
- `glb_degenerate_triangle`
- `glb_chunk_not_4byte_aligned`
- `glb_accessor_outside_bufferView`
- `glb_accessor_bad_stride`
- `glb_accessor_misaligned`
- `glb_nodes_trs_rejected`
- `glb_skin_animation_rejected`
- `glb_draco_extension_rejected`
- `glb_material_texture_rejected`
- `glb_morph_target_rejected`
- `glb_unknown_chunk_rejected`
- `glb_duplicate_json_rejected`
- `glb_trailing_bytes_rejected`
- `geojson_unclosed_ring`
- `geojson_bowtie_selfintersection`
- `geojson_duplicate_id`
- `raster_affine_bounds_mismatch`

S06 solution validator remains PASS:

```json
{
  "status": "PASS",
  "errors": [],
  "solution_data_sha256": "caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3",
  "negative_bites": {
    "corrupt_source_hash": "PASS",
    "missing_immutable_input": "PASS",
    "malformed_template_missing_field": "PASS",
    "malformed_template_available_true": "PASS"
  }
}
```

HTTP HEAD was attempted against Root’s previous server on `127.0.0.1:8768`, but the port was no longer listening at the time of this completion (`curl: (7) Failed to connect`). I did not start another server or browser tab because Root owns primary browser QA.

## Current file hashes

| File | bytes | sha256 |
|---|---:|---|
| `index.html` | 21359 | `ebc5690b576e004a8095087195c5bc4efb151c624589fa05f8024773aa432181` |
| `static/styles.css` | 42224 | `c8bbc5ae43c66ffb22e3cee516dc4ab78b7212495c76d9601ba9ba3834f3765a` |
| `static/app.js` | 109534 | `6d7d6f5f0331cde67e268cced2afedd66a1569b1cda7e725351c49f964c1ac97` |
| `static/s07-importer.js` | 20102 | `675c4c03acd81011fcb1f34b2759f16fd9f5c2f6440caba8ea79e7c39d79df4e` |
| `static/s07-worker.js` | 4574 | `6d680bcc7ea6b8eb1553cb9e0c4a7a18df0975aef5eedf5114a27c716412465a` |
| `static/s07-chunks.js` | 11659 | `8ae4d3052793224c375f8ba685e3c3bdee25c9ecfe34407e584aa0cc7d393581` |
| `static/s07-ui.js` | 5646 | `cb7213de8ac8c2934b204ffc7eb8f618e3977eb1e73669b117372980a12c8026` |
| `scripts/s07-engine-fixtures.mjs` | 15372 | `78e7aa2e7403c6c6f94c074c2eb4236c0927afb140d241c11717cb1253ab7377` |
| `governance/S07-ENGINE-FIXTURES.json` | 4063 | `93e87fcbf71bcc549222d7eb4b3cb353c70d0c2ad2000cb0dedea86d0c6b9ee6` |
| `governance/BASELINE-S07-ENGINE.json` | 895 | `fc95d168c73d333e997239a237c40007339e4cd4dec5bc6ec051e0954184159f` |

## Known limitations / deferred truthfully

- Root browser QA is still required for visual, mobile, picking, source drawer, and performance observations.
- Raster importer validates metadata/georegistration JSON only; it does not decode GeoTIFF pixels.
- GeoJSON importer currently admits single Polygon footprints only; holes/MultiPolygon are rejected to avoid losing geometry semantics.
- GLB importer validates mesh descriptors and hash-gates raw bytes, but publishing a future GLB into the scene remains disabled until rights, quality, placement, and runtime admission are supplied.
- Public photo registry remains pending: no verified free point-matched photo is applied to buildings.
