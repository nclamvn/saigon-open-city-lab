# COMPLETION-S06-ENGINE

Builder: `/root/surface_enrichment`. Scope: Batch04 engine and renderer, applied to the existing map. Product frozen at `s06.2`, module/app cache key `s06-final`. No index/CSS, compiler, raw source, or earlier-batch file was changed by this Builder.

## Applied behavior

- Default is GEDTM testing terrain at 1×, with Google model heights where explicitly supported. COPDEM, 1.35×, area proxy and data-only detail remain selectable through the shared command/state contract. Source/scale/height changes rebuild dependent layers and selection, retain camera/mode, and dispose prior geometry/materials. Mode/camera changes do not rebuild terrain or buildings.
- All geometry uses the visual canonical `R=6378137` frame. Buildings use raw-GeoJSON-derived canonical footprint/centroid descriptors. Roads, OSM water, canopy samples and JRC cells use the exact legacy-to-canonical transform (`x_scale=0.99987688691`, `z_scale=1.006364994037`, offsets 0). Original fusion/visual bytes stay intact.
- Buildings have merged PBR walls, constrained flat/gable/hipped roofs and generic facade panes/sills. Total input height includes roof rise; wall height is reduced to allocate the roof, with top at `max terrain perimeter + input height`. The inspector states this ground reference and that roof/windows/materials are simulated. Concave polygons use flat roofs.
- Foundation edges split at ≤4 m and every terrain grid/diagonal boundary. Wall bottoms follow the actual TIN segments with a nominal 0.02 m separation. Independent verification uses THREE.Raycaster on the actual rendered Float32 terrain/index, with spatial triangle-index shortlists and restoration of the full terrain index.
- Roads retain original OSM straight segments, render as asphalt ribbons and modeled markings, and are clipped/subdivided to actual terrain triangle planes. Generic ribbon widening is subtracted from building polygons. Source centerline conflicts are recorded, without moving source paths. OSM water and JRC evidence glyphs are also clipped/draped to terrain.
- Graphic vegetation uses deterministic irregular placement constrained by ETH canopy height/uncertainty and building/road/water exclusions. Near crowns use four irregular lobes and trunks; far crowns use one lobe. Continuous ETH canopy remains the analytic canopy-mode layer. None of the graphic positions are detected individual trees.
- Six shared procedural 64×64 textures provide subtle plaster/roof/asphalt grain and normal maps, with mipmaps and bounded anisotropy. They are cached once, shared across rebuilds, protected from layer disposal and released on viewer teardown. The native Sentinel RGB texture remains 330×334, 10 m; no observed detail was generated or sharpened.
- Rendering is on demand when idle. Diagnostic image readback runs once at boot or on explicit debug request. Probe metrics report render submissions, draws, triangles, resource counts, command/rebuild duration and render-submit CPU median/p95/max; they do not claim GPU time or guaranteed FPS.
- `focus=cluster` or the focus command frames a dense rendered house cluster at 125 m radius, exposes stable IDs/target in the DOM probe and opens localized interpretation. Default URL keeps global overview. Canvas has keyboard focus and an accessible Vietnamese label; typing fields are excluded from navigation shortcuts.

## Source admission and disclosure

`admitSolution` is pure and validates before a single descriptor commit: exact schema/top-level fields, nine well-formed source fingerprint entries, frame dimensions and two-value AOI center, exact canonical transform, stable 657 IDs, finite polygons/centroids, terrain validity/grid/coverage consistency, source/model flags, explicit Google support and future contract-only templates.

Google admission requires `height_support.accepted=true`, consistent `qualified/height_qualified`, null source height, `measured_height=false`, height 1–30 m, presence threshold 0.5, support ratio ≥0.25 with pixel-ratio consistency, and `height_valid_pixels ≤ presence_pixels ≤ polygon_samples`. Missing/rejected support cannot enable Google based on a positive height alone. Proxy heights must be positive and <60 m. Incomplete GEDTM is disabled; missing/malformed supplement falls back to COPDEM/proxy, canonicalizing the original scene once using the exact fusion compiler formula.

Disclosure follows the active source/options. GEDTM is predicted 2006–2015, EGM2008, testing-only. COPDEM is DSM with source vertical datum not independently confirmed locally; the product does not assert EGM2008 for that profile. Google is modeled 2023 height, not surveyed height. The source drawer includes source paths plus SHA-256 and a collapsed technical view of epoch, CRS, datum, grid, bounds, nodata policy, rights, quality/coverage and future templates. Browser admission checks semantics; source-byte/hash validation is a build-time check.

## Exact coverage and geometry

| Layer | Source / rendered | Domain/interpretation |
|---|---:|---|
| Footprints | 657 / 656 | 656 whole polygons in node-center mesh domain; 0 partially clipped; `msft_0165` excluded outside that domain. Original source/support unchanged. |
| Google/proxy | Source 482 / 175 | Rendered 482 modeled / 174 proxy; excluded footprint is proxy. Proxy-only option renders 656 proxy houses. All 657 source heights remain null and measured flags false. |
| Roofs | 149 flat / 365 gable / 142 hipped | Generic types; 9,320 roof triangles and 25,292 wall triangles. Google detail contains 9,170 modeled panes, 36,680 detail triangles, hidden at far/data views. |
| Roads | 629 / 628 | 15 rendered paths clipped near domain edge, 1 excluded; 24,673 asphalt surface triangles plus 12,903 marking triangles. No arbitrary feature cap. |
| OSM water | 1 / 1 | 590 triangles, no domain clipping/exclusion. Descriptive water ribbon. |
| JRC per mode | 114 / 113 | 3 glyphs clipped, 1 excluded; 558 triangles per mode. Graphic glyph 12 m; source nominal resolution 30 m. |
| Graphic vegetation | 1,200 candidates | Far test: 1,200 crowns; tested close target: 13 near trees and 12 far trees. Near budget 500, four crown lobes per near tree. Positions modeled. |
| Terrain | 109×109 | GEDTM 11,881 valid nodes, 217 declared nearest-edge-support nodes; complete grid. Node-center mesh extent differs from outer raster/AOI pixel edges. |

Thirteen original OSM centerline conflict IDs were retained in road QA: `776603408`, `776614929`, `776623077`, `909931991`, `909934589`, `909934598`, `909938569`, `910332383`, `911203936`, `912322833`, `912322854`, `912607475`, `912607476`. The graphic ribbon is clipped away from footprint interiors; the conflicting source paths still need site/source reconciliation. The 1,386 clipping-operation counter is an implementation-operation count, not a count of surveyed conflicts.

## Verification

`node --check` passes for app and module. The eight terrain × scale × height combinations pass independent source-polygon/actual-geometry checks in `scripts/engine-s06-qa/{copdem|gedtm}-{1|1.35}-{proxy|google}.json`:

- Roof triangle centroids outside source footprint: 0; downward top faces: 0; nonfinite vertices: 0. Actual maximum roof/wall/detail top agrees with total input height within 0.00000190 m across all cases (Float32 construction check, not field accuracy).
- Per case, 25,292 foundation vertex/grid-cut/midpoint rays cover all 656 rendered buildings: 0 misses, 0 tolerance failures. Across cases, min/max clearance 0.019987–0.020016 m around the nominal 0.02 m lift. A deliberate +0.5 m displaced foundation is detected.
- Per case, 98,692 actual asphalt-surface vertex/triangle-centroid rays: 0 misses, 0 tolerance failures; clearance range 0.069968–0.070029 m around 0.07 m. Actual ribbon triangle centroids entering source footprint interiors: 0.
- `scripts/engine-s06-qa/natural-gedtm-1-google.json` verifies 2,360 actual water vertex/centroid rays and full JRC surface rays per mode: 0 misses/tolerance failures. Vegetation mask/exclusion violations: 0; repeated placement identical. Six procedural textures retain identity and receive no disposal on a layer rebuild.
- `engine-s06-admission-check.cjs`: 23 copied negative fixtures rejected; honest incomplete GEDTM disabled; positive height alone rejected; source payload unchanged.
- Baseline app snapshot hash matches the prior app. Vendor/fusion/visual baseline hashes remain identical. All nine `source_fingerprints` were checked against local file bytes and match.

Runtime uses full building grounding coverage and stratified six surface triangles per road/water feature to bound interaction QA cost. Offline verification above checks every asphalt surface triangle/vertex. This is independent constructed-mesh grounding, not a test of source height accuracy or terrain accuracy at the site.

The Contractor's earlier actual browser preview booted in <2.2 s, showed visibly improved roofs/windows/crowns/roads and no console error. That preview preceded final admission/height/material closure and is not final acceptance evidence. Final frozen desktop/mobile, six-mode, interaction, fallback and repeated-resource browser QA belongs to Contractor's independent addendum.

| Acceptance | Builder result | Final browser evidence |
|---|---|---|
| S06-E01 | PASS: complete default 1×/source gate; canonical/dependent geometry tested in eight cases | Contractor final addendum |
| S06-E02 | PASS: full independent foundation rays and displacement bite | DOM actual-mesh probe / Contractor |
| S06-E03 | PASS: constrained roofs, total envelope height, UV/PBR/model labels | Contractor final visual addendum |
| S06-E04 | PASS: exact ribbon drape, polygon exclusions, bounded graphic vegetation and water/JRC | Contractor final mode/visual addendum |
| S06-E05 | PASS implementation/static: merged/instanced LOD, on-demand render, cached texture lifetime and disposal | Actual render/resource/perf values in Contractor addendum |
| S06-E06 | PASS implementation/admission: command replay, selection/pick/provenance/focus/input/fallback preserved | Contractor final interaction/fallback addendum |

## Files and fingerprints

- Product: `static/app.js`, `static/solution-layer.js`.
- QA: `scripts/engine-s06-geometry-check.cjs`, `scripts/engine-s06-admission-check.cjs`, `scripts/engine-s06-panel-check.cjs`, eleven QA receipts and `scripts/engine-s06-qa/fingerprints.json` (22 product/input/evidence file hashes).
- Baseline: `governance/baseline-s06/app.js`, `governance/baseline-s06/fingerprint.json`.
- Final Data payload SHA-256: `caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3`; Data QA: `952e2de5f90a49c67b9f934a0038db7661ab8b0c99b5ed4fc45304a9a1f25b3a`.

No individual tree inventory, observed roof/facade detail, centimeter true ortho, LiDAR survey or flood/drainage model is claimed. Generic visual detail makes the current map easier to read; it does not increase the observation resolution.

## Browser regression closure: passive selected-payload refresh

Contractor found that `focus cluster → close Inspector → open display controls → select COPDEM` reopened Inspector during source rebuild. The UI's hidden-attribute observer then collapsed the controls, preventing the next scale selection.

`rebuildSolution` now calls `renderInspectorPayload` to update the selected data/content without writing Inspector or SourceDrawer visibility. Active pick/focus still uses `showInspector` to open the intended panel. Source/scale/height refresh preserves the previously open/closed panels.

`engine-s06-panel-check.cjs` executes the actual app rebuild/content/show functions with geometry dependencies stubbed: four Inspector/SourceDrawer visibility combinations preserve state, produce zero hidden-attribute writes and refresh selected contents; active pick/focus still opens Inspector. Node syntax passes. Geometry and renderer module are unchanged, so the eight geometry cases were not repeated for this panel-only fix. Contractor verifies the exact browser observer/control workflow after reload.

| Frozen product | SHA-256 after panel fix |
|---|---|
| `static/app.js` | `2cfec906129e0670553937530601fcdf28e4ebb4a9bdda18abf7ac06f9077410` |
| `static/solution-layer.js` | `b1ffc0a2e7ab343a0a72fb809e2c38b004a6aa0d418231445d1491b42f2d36ef` |
