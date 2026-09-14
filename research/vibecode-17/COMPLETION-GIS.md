# COMPLETION-GIS

**Status: DONE — delegated spatial-kernel scope.** Browser presentation and overall batch readiness are verified by the Contractor.

Delivered files:

- `outputs/shared/digital-twin-core/gis.js`: reusable WGS84 geometry/index/query engine, mandatory source-gate enforcement, exact polygon inclusion and clipping, overlap-aware unique area.
- `analysis-worker.js`: original-byte SHA-256 validation and UTF-8 JSON parsing, source normalization, indexing and queries isolated from the map rendering thread.
- `analysis-client.js`: asynchronous initialization/query, request cancellation and stale defense, isolated Worker generations on reinitialization, failure/timeout propagation, explicit small-data fallback.
- `vendor/turf-7.4.0.min.js`, `TURF-LICENSE.txt`, `dependencies.json`: stable official Turf 7.4.0 vendored locally, MIT attribution and SHA-256 fingerprints; no runtime CDN dependency.
- `tests/gis-kernel.cjs`, `gis-client.cjs`, `gis-projects.cjs`, `gis-worker.cjs`: 41 scenarios in the Node test runner, including the actual Worker endpoint with the complete 30 MB HCMC input file.
- `research/vibecode-17/qa/verify-oracle.py`, `gis-sample-result.json`, `oracle-corridor.json`, `gis-mapped-road-result.json`, `oracle-mapped-road.json`: independent computational geometry evidence for the straight-line fixture and actual mapped source road. Full normalized dataset is temporary at `/private/tmp/rtr-dt17-normalized-hcmc.json` rather than committed.

Acceptance verification:

| Acceptance | Result | Evidence |
|---|---|---|
| Holes, concave shapes and MultiPolygon inclusion | PASS | notch, hole, disjoint-region tests; actual polygon clipping rather than centroid selection |
| Edge contact, clipped and unique union area | PASS | edge-only counted at zero area; overlap fixtures show representation-summed area differs from unique area |
| Source identities, illustrations, source/height provenance | PASS | sourceKey+sourceId grouping only; cross-provider IDs stay separate; 10 HCMC illustrations excluded; source epoch and unsurveyed flags preserved |
| Meter corridor A/B/C analytical comparison | PASS | 15/40/80/140 m offset fixture produces monotonic 25/50/100 m selection; labels and reports disclose analytical scenarios |
| Invalid data/coverage/source admission | PASS | NaN, self-crossing, degenerate/unclosed rings, invalid holes and denied/missing source gate reject; outside/partial coverage explicit; broad queries refuse without truncation; byte-hash mismatch, malformed JSON and absent Web Crypto fail closed |
| Worker lifecycle and interaction safeguards | PASS | cancellation/stale/error/timeout/destroy; reinit during boot and query isolates old messages and timers; datasets above 3,000 features require a Worker |
| Reuse in actual HCMC and Gia Lộc projects | PASS | 70,709 eligible HCMC representations and 657 Gia Lộc source identities; respective south/north-positive local frames preserved by the source adapter |

Technical health: **41/41 tests PASS, 0 test failures, 3/3 syntax checks PASS.** Run:

```
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test outputs/shared/digital-twin-core/tests/gis*.cjs
```

Actual HCMC corridor fixture `[106.70057,10.77681] → [106.70605,10.77247]` is 768.908 m in the disclosed spherical model. At 25/50/100 m the source-identity selections are 47/114/218 and unique clipped areas are 11,412.266 / 28,586.873 / 66,624.914 m². A direct Node sample took approximately 173 ms normalization, 293 ms indexing and 516 ms corridor analysis; these are CPU measurements, not browser frame-rate guarantees.

Independent oracle: Shapely 2.1.2 / GEOS 3.13.1 performs STRtree selection, polygon intersection and unary union. Every selected representation ID matches for all three scenarios. Independent spherical ring integration differs from Turf unique area by relative 9.48e-13 / 2.35e-13 / 2.76e-9, within the stated 1e-6 computational tolerance. pyproj 3.8.0 / PROJ 9.8.1 records WGS84 ellipsoidal measurement-model differences separately. **This certifies computational behavior only; it does not establish data XY/Z accuracy or survey quality.**

Second independent oracle uses the actual mapped Nguyễn Huệ road, OSM identity `341504312`, with 17 vertices transformed through the documented source frame. Its 25/50/100 m analytical buffers select 46/92/224 source identities with unique clipped areas 6,426.343916 / 17,016.171083 / 54,064.013770 m². GEOS agrees on every selected representation ID and unique-area relative deltas are 3.35e-10 / 9.35e-10 / 1.10e-12. All six oracle scenarios PASS.

Verified ingestion is opt-in and backward-compatible:

```javascript
const response = await fetch(config.input.url);
const bytes = await response.arrayBuffer();
await client.init({ type: 'rtr-raw-json/1.0', bytes });
// ArrayBuffer ownership transfers to the Worker; bytes is now detached.
```

The Worker requires `config.input.sha256`, hashes original fetched bytes and parses JSON only after the digest matches. `ready.inputIntegrity` and `result.provenance.inputIntegrity` contain `{verified:true,sha256,bytes,method}`. Raw-byte mode never falls back to unverified or main-thread parsing. Legacy `init(sceneData)` remains supported and reports `verified:false`. The complete 30 MB actual HCMC file passes the expected source fingerprint and the mapped-road query through the actual Worker script endpoint in the isolated test runtime.

Deviations/limits:

- Turf 7.4.0 was chosen over older 7.x after official release research identified geometry correctness fixes; it remains a stable pinned dependency.
- Area/length are spherical approximations; buffers use local azimuthal-equidistant projection and 16 arc steps. The kernel supports local analysis extents up to two degrees and corridor radii up to 1,000 m, with a default 20,000 bbox-candidate processing bound. Broader analysis requires a server pipeline.
- Cancellation discards stale results immediately; it does not interrupt synchronous geometry computation already executing inside the Worker. Worker timeouts terminate failed/stalled execution and require reinitialization.
- `identityCount` means unique source identities, never verified physical houses. Distinct part IDs may belong to one real building; overlap union corrects area, not physical identity reconciliation.
- Source admission is enforced by SourceCore plus the mandatory normalized gate. Raw-byte ingestion verifies the expected fingerprint; a legacy parsed JSON object explicitly remains unverified. A verified byte hash identifies the source version, not its geographic or survey accuracy.
- Existing baseline source heights are used for statistics. Later legacy visual height corrections are not upgraded into surveyed geometry.
- No approved future geometry, LiDAR survey, cadastral ownership or hydrologic correctness is synthesized.

Open issues within delegated scope: **0 critical, 0 major.** Map-first UI visual QA and actual browser Worker timing remain Contractor acceptance tasks.
