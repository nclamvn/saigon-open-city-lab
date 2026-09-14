# Independent pre-verification audit — Batch 04

Auditor: leadership_ui · 2026-09-14 · Read-only product review. No product files changed.

Reviewed BLUEPRINT and ENGINE/FUSION/EXPERIENCE TIPs, all four product artifacts, compiler, and current fusion tests. Files are being revised concurrently: findings below describe the inspected snapshot and must be closed by explicit retest, not assumed to persist after Builder fixes.

## Decision

**NOT READY at pre-verification.** One boot-blocking P0 and several spatial/claim/interaction P1 issues require closure. Passing syntax and data integrity tests does not establish correct spatial rendering.

## P0 — Boot and inspection collection mismatch

`static/app.js`, world declaration around lines 64–97 and makeTerrain around line 369: only `state.pickables` is initialized, while every geometry builder calls `world.pickables.push(...)`. This throws during boot. The initial inspected `pick()` also selected `state.pickables || world.pickables`, so an empty state array would suppress all hits after only fixing the world declaration. A subsequent edit uses world.pickables in pick but the declaration was still absent at audit cutoff.

Required fix: initialize and consistently use one collection. Retest successful boot and actual selections of terrain, building and instanced canopy/water, not merely the existence of an inspector DOM element.

## P1 — Spatial and analytical integrity

1. **Building centroid numerical instability.** `scripts/compile_fusion_scene.py:104` computes shoelace products directly in longitude/latitude. Independent recomputation on translated local footprints found errors across all 657 records: minimum 0.123 m; median **26.384 m**; maximum **611.984 m** (`msft_0140`); **639/657 >1 m**, **502/657 >10 m**. Example `msft_0001`: stored centroid (416.296, −1373.173) lies about 158 m from its compact footprint near (574, −1357). Consequently base elevation may be sampled at the wrong site. Translate coordinates to a nearby origin before centroid arithmetic, rebuild and verify local centroid containment/distance and sampled DEM bases for all records. Do not just change renderer centroids while retaining erroneous compiled base elevations.

2. **Terrain and vector north/south disagreement in initial engine.** Compiler row zero is north (`raster_cell_lonlat`, line 82); AOI declares x=east,z=north (`compile_fusion_scene.py:436`). Initial terrain builder placed row zero at negative z and sampler used `(z + depth/2)/depth`. Thus DEM and Sentinel were mirrored relative to vectors/canopy. Builder has begun changing these to `(0.5-v)*depth` and `(depth/2-z)/depth`. Retest north-edge coordinates, draped RGB corner identities, terrain winding and north indicator. Code change alone is not closure.

3. **Vertical exaggeration alignment in initial engine.** Actual scene has exaggeration **2.5×**, DEM min/max **5.431/29.576 m**. Initial building, road, canopy and JRC bases were unscaled while terrain was scaled. Compiled building bases imply **17.565–39.660 m** vertical discrepancy from that omission alone. Builder has introduced `worldY`; retest every layer against the same terrain surface and check actual footprint vertices/interpolated surface, not a tautological base×factor assertion. This is independent of the centroid error.

4. **Extruded building caps face inward after coordinate swap.** `static/app.js`, makeBuildings around lines 435–454 maps extrusion `(x, shapeY, depth)` to `(x, depth, shapeY)`, a reflection with negative determinant. A read-only Node/Three.js probe using the exact transform gives both top-cap normals **Y=−1**, even after `computeVertexNormals()`. FrontSide material can cull roofs when viewed from above. Correct winding or use a proper axis transform; assert outward top normals and inspect a close oblique building. Also avoid unconditional `toNonIndexed()` on already nonindexed ExtrudeGeometry, which can produce repeated Three warnings.

5. **Numbers promised by analysis remain placeholders.** `static/app.js:6–37` and applyMode: the three metric cells render English placeholders such as “min/max/mean DEM”, “vertical exaggeration”, “657 footprints nếu scene-data cung cấp”, while static `<dt>` labels remain “Quy mô / Địa hình / Ảnh nền” for every mode. Bind actual min, max, mean, counts, dates and units with mode-specific labels. Verified data already contains 657 buildings, 3,412 canopy samples, 114 water cells, 629 road records and the actual DEM statistics. Do not label placeholder strings as verified metrics.

6. **History-change sign is lost visually.** makeWaterCells uses `Math.abs(value)` for both display height and colour brightness, and one pink hue for normalized change. Current 114 comparable cells contain **89 positive and 25 negative changes**; +100 and −100 become visually indistinguishable. Supply a diverging gain/loss legend and colour scale; retain zero and missing-value distinctions. Water mode also overlays occurrence and seasonality simultaneously at the same cell positions, so the two meanings need a selector or clearly separated visual encoding.

7. **Always-on claim boundary disappears on tablet.** `static/styles.css:1195` hides `.disclosure` at max-width820px, restored only below560px. At561–820px the user can view a 3D scene with neither the sample-boundary nor proxy warning visible. `updateDisclosure()` also overwrites the HTML's explicit proxy statement and only appends a positive proxy explanation in buildings mode. Keep a concise sample-bbox and proxy-height qualification visible in overview and every responsive layout. Keep DEM30m/Sentinel10m/ETH2020/JRC30m context accessible without implying survey accuracy.

8. **Hide UI has no touch recovery.** `toggleUI` applies opacity0 to the complete shell, including its own button; CSS disables pointer events on all descendants. Only keyboard H can recover, so touch/tablet viewers can be stranded. Keep a visible compact “Hiện giao diện” recovery control outside the hidden shell. User-triggered hiding should not remove required minimal claim context.

## P2 — Experience, performance and testability

- Navigation is inconsistent with the visible intent: Q/E changes target elevation instead of orbit; right-drag vertical movement changes target.y instead of panning the ground plane. `onKey` does not ignore modifier shortcuts, editable controls or open overlays, nor prevent browser default arrow scrolling. Define and test expected camera-relative pan/orbit behavior, pause tour during manual interaction, and preserve keyboard focus after UI navigation.
- The narrative panel has no independent collapse control although the TIP calls for one. Existing global hide removes all controls. Provide a compact collapse action without removing the analysis mode rail or disclosure.
- Drawer states update ARIA via the inline observer and Escape closes panels, which is good. Opening sources/inspector does not visibly move or restore focus and they can be open together. On mobile, inspector only makes the narrative opacity0; accessibility descendants remain present. Prefer explicit mutually exclusive panels and tested focus return.
- Initial overview contains a claim of “nguồn công khai đã kiểm chứng” although only source/hash/derivation checks are shown; use “đã đối chiếu nguồn” and keep spatial accuracy limits explicit. Inspector labels contain implementation terms (`Terrain`, `area_class_proxy_no_source_height`, `raster sample`) better translated for nontechnical leadership.
- Source records are escaped before HTML insertion, but drawer entries expose descriptions rather than clickable original/receipt links. “see Batch03 ecosystem manifest” is not enough for a reviewer to reach rights evidence. Provide a path/link to the exact evidence record without claiming rights that are not verified.
- DPR is capped1.5 and geometry is merged/instanced, but adaptive visual quality is not implemented in the inspected version. Idle RAF frequency is currently labelled FPS even when no scene frame renders. Separate render rate from animation callback rate if shown; avoid treating idle60RAF as proof of smooth interaction. Hide developer performance counters from primary leadership UI when possible.
- Large blur surfaces use18–20px filters; inspect compositing cost on actual intended hardware and lower blur while interacting if material. No claim of a measured performance problem from this static review alone.
- Texture fallback path does not await successful decode before clearing loading and has no error handler. Current scene embeds surface_rgb, so this is not the active boot route; a future external Sentinel image could fail while the UI says ready. Fail visibly or await required texture readiness.
- No WebGL probe context disposal is visible in the HTML preflight. Release the temporary context or let actual renderer construction provide the supported/unsupported result, avoiding an unnecessary extra context on constrained devices.

## Checks executed

- `node --check static/app.js`: PASS.
- `python3 scripts/test_fusion_scene.py`: PASS; 13 sources, 109×109 terrain, 657 buildings, 3,412 canopy samples, 114 JRC cells, 629 roads, one OSM water record. The current tests did not catch centroid instability.
- HTML parse: **21/21 required IDs present**, zero duplicate IDs, six expected modes, both directly referenced static assets present.
- Scene-data size **1,328,206 bytes** at inspection; standalone local Three.js is present.
- Independent translated-local centroid check: all657 records assessed; quantitative results above.
- Read-only Three geometry probe: reflected top normals [−1,−1], nonindexed ExtrudeGeometry confirmed.
- Browser visual/runtime verification: **not claimed here**. Contractor should first close P0, then capture1280×720,390×844 and a tablet width around768px, all six modes, inspector and source drawer, UI hide/recover, touch/pan/zoom and actual console logs.

Inspected scene hash: `22ab55e2f944f02fec70255b09191ba56c326f1cdd5263621296740cad048fbb`.

## Closure checklist

Boot and picks → stable centroid rebuild → north/RGB alignment → exaggerated anchors and outward roofs → actual metrics/diverging water meaning → persistent responsive claim boundary → touch UI recovery → visual and numerical regression evidence. Retain previous source hashes and record any regenerated scene hash in final VERIFY.
