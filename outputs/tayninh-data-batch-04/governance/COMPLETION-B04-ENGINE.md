# COMPLETION — TIP-B04-ENGINE

Generated: 2026-09-14

## Status

DONE for the Batch04 Three.js engine and probe handoff.

Contractor browser reverify after the fog/frame refinement reported the scene visible and bright (`litPixelRatio≈0.985`), clean logs, all six modes switching correctly, `anchoring.maxAbs=0`, and `northMappingOk=true`. The final polish after that browser pass fixed the two remaining probe/copy gates: `diagnostics.topNormalY` now measures only horizontal roof triangles at maximum Y, disclosure flags scan the full disclosure/sources/statistics payload, and metric labels/fallbacks are Vietnamese.

## Files changed

- `static/app.js`
- `vendor/three.min.js`
- `governance/COMPLETION-B04-ENGINE.md`

No `index.html`, `static/styles.css`, earlier batches, source manifests, or fusion compiler/data files were edited by ENGINE.

## Implemented scope

- Local Three.js vendor loading with no CDN dependency.
- `derived/fusion/scene-data.json` loader against final Batch04 fusion contract.
- DEM terrain mesh using `terrain.heights_m`, `terrain.surface_rgb`, north-up raster mapping, adaptive fog, and vertical exaggeration disclosure.
- Merged proxy building mesh from all usable footprints, with deterministic area-class proxy-height language.
- Terrain-following OSM roads/water as merged tube geometry with road simplification/cap for browser performance.
- Instanced ETH canopy samples; each instance represents a raster sample, not an individual tree.
- Instanced JRC occurrence/seasonality/change cells; normalized change uses diverging gain/loss colors.
- Six modes: `overview`, `elevation`, `buildings`, `canopy`, `water`, `change`.
- Pointer orbit/pan/zoom, keyboard navigation, reset, tour, UI hide, source drawer, and raycast inspector.
- `window.__B04_PROBE__()` exists immediately after app script load and returns renderer readiness, active mode, camera, object counts, pickables, mode metrics, disclosure flags, anchoring diagnostics, top-normal diagnostic, and north-mapping diagnostic.
- Probe JSON is mirrored to DOM-readable locations: hidden `#b04Probe`, `#b04Probe[data-probe]`, `body[data-b04-probe]`, and `#experience[data-probe]` when that wrapper exists.

## Final scene-data input

- Path: `outputs/tayninh-data-batch-04/derived/fusion/scene-data.json`
- SHA-256: `20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878`
- Schema: `tayninh.batch04.fusion.scene-data.v1`
- Terrain: `109×109`, DEM `5.431–29.576 m`, mean `14.485 m`
- Buildings: `657`
- Roads: `629`
- Canopy samples: `3412`
- JRC water cells: `114`
- JRC normalized change: `89` gain cells, `25` loss cells
- Sources exposed in drawer: `13`

## Audit closures

- `world.pickables` is the single raycast collection; probe reports `objectCounts.pickables`.
- Terrain row mapping is north-up: raster row 0 maps to `z=+depth/2`, and sampler uses `depth / 2 - z`.
- Terrain triangle winding was flipped for upward normals after north-up mapping.
- All terrain-following object anchors use `worldY(elevation) = elevation × vertical_exaggeration`, so buildings/roads/canopy/water do not sink under the exaggerated terrain.
- Probe exposes anchoring deltas and `worldYApplied`.
- Building rings are reversed before `Shape` construction, and `diagnostics.topNormalY` measures only top horizontal roof triangles at maximum Y.
- Fog density was reduced/adapted to the scene extent (`0.000045–0.00016`) after browser QA found the previous `FogExp2` density made the canvas effectively blank at the reset radius.
- Terrain material uses a bright `MeshBasicMaterial` with `DoubleSide` so the surface remains visible across browser/headless lighting differences.
- `mergeNonIndexed()` no longer calls `toNonIndexed()` on already non-indexed geometry, eliminating the repeated Three.js warning.
- JRC change cells use diverging gain/loss encoding (`#39c6a3` for gain, `#e08a3e` for loss); occurrence and seasonality remain separate modes/layers.
- Metrics are short exact values with optional label IDs `#metricLabelA/B/C`, and labels/fallbacks are Vietnamese.
- Copy changed from “đã kiểm chứng” to “đã đối chiếu nguồn”.
- Source drawer shows evidence/path text and prefixes source hrefs with `../` for sibling batch paths.
- Disclosure flags now scan `disclosure`, `sources`, and `statistics` together, so `buildingProxy`, `noLidar`, and `noFloodModel` are not lost when the disclosures are split across scene-data sections.
- `toggleUI()` now mirrors the probe immediately after changing `state.hiddenUI`, so `#b04Probe` and `uiHidden` telemetry do not remain stale while waiting for a later render.
- Raycast candidates are filtered through visible object/parent state before `intersectObjects()`, so hidden canopy/JRC/OSM/building layers cannot win clicks in modes where they are not displayed; terrain and roads remain pickable when their mode visibility allows.
- R07 hot-path telemetry is throttled: `litPixelRatio` reuses one diagnostic canvas/context and samples about once per second, `mirrorProbe()` is throttled to about 4 Hz during continuous tour/render loops while immediate mirror calls remain after boot/mode/UI changes, and the on-screen diagnostic reports actual `renders/s` rather than idle RAF rate.

## Commands run

```bash
node --check outputs/tayninh-data-batch-04/static/app.js
node --check outputs/tayninh-data-batch-04/vendor/three.min.js
```

Both syntax checks passed.

Static contract check:

```text
no_english_mean_label=True
no_visible_proxy_value=True
top_normal_max_y_only=True
probe_dom_mirror=True
toggle_ui_mirrors_probe=True
disclosure_all=True
vietnamese_metric_labels=True
fog_refine=True
jrc_diverging=True
source_prefix=True
pickables_single_collection=True
raycast_visible_candidates_only=True
lit_canvas_cached=True
lit_sampling_throttled=True
probe_throttled_in_render_loop=True
render_rate_label_honest=True
```

Scene-data contract check:

```text
scene_sha256=20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878
schema=tayninh.batch04.fusion.scene-data.v1
terrain=109x109
dem_min_max_mean=5.431/29.576/14.485
buildings=657
roads=629
canopy=3412
jrc=114
gain=89
loss=25
sources=13
```

HTTP smoke from `outputs/` root on `127.0.0.1:8798`:

```text
HEAD /tayninh-data-batch-04/static/app.js -> 200
HEAD /tayninh-data-batch-04/vendor/three.min.js -> 200
HEAD /tayninh-data-batch-04/derived/fusion/scene-data.json -> 200
```

Browser evidence supplied by Contractor after fog/frame refinement:

```text
scene_visible=True
litPixelRatio≈0.985
logs=[]
six_modes_switch=True
anchoring.maxAbs=0
northMappingOk=True
```

## Probe contract

`window.__B04_PROBE__()` returns at least:

- `rendererReady`
- `sceneReady`
- `activeMode`
- `camera`
- `fpsText`
- `dpr`
- `litPixelRatio`
- `objectCounts.buildings`
- `objectCounts.canopy`
- `objectCounts.jrcWaterCells`
- `objectCounts.pickables`
- `objectCounts.roadsRendered`
- `objectCounts.osmWaterRendered`
- `anchoring.samples`
- `anchoring.minClearanceM`
- `anchoring.maxAbsClearanceM`
- `anchoring.verticalExaggeration`
- `anchoring.worldYApplied`
- `diagnostics.topNormalY`
- `diagnostics.northMappingOk`
- `diagnostics.fogDensity`
- `diagnostics.jrcGainCells`
- `diagnostics.jrcLossCells`
- `diagnostics.modeMetrics`
- `diagnostics.metricLabels`
- `disclosureFlags`
- `loadingHidden`
- `uiHidden`

## Handoff notes

- Roads render is performance-capped/simplified in the engine while source count remains `629`; probe reports `roadsRendered`.
- Source links with `../` work when the page is served in the intended sibling-batch layout under `outputs/`. If served from a narrow Batch04-only root, sibling evidence files are outside that server root.
- Do not treat FPS text alone as performance proof; use visual/browser interaction, visible-scene probe fields, and object counts during final Contractor verify.
