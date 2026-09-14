# COMPLETION — TIP-B04-VISUAL-ENGINE

Generated: 2026-09-14

## Status

DONE / INTEGRATE-READY for ENGINE. Native visual-data is present, loaded through the actual contract keys, and root browser checks reported native overview visual PASS. Final root screenshot reload remains the external acceptance step.

## Files changed

- `static/app.js`
- `index.html`
- `governance/COMPLETION-B04-VISUAL-ENGINE.md`

No source manifests, derived data, Inter font/CSS, index HTML, or other batches were edited by ENGINE.

## Visual data consumed

- `derived/visual/visual-data.json`
  - SHA-256: `215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682`
  - Sentinel RGB: `330×334`, native 10 m public Sentinel-2 visual texture
  - Terrain texture UV rows: `109×109`; valid nodes `11811`, outside-crop nodes `70`
  - ETH canopy field: `361×361`, valid pixels `119438`, nodata pixels `10883`
- `derived/visual/visual-qa.json`
  - SHA-256: `887a021dd894d9babd2066ed26854760c1d91c09b71436bcae032a4dbcbe9e67`
  - QA status: `PASS`

## Implemented closures

- Native Sentinel is no longer stretched from the DEM `109×109` RGB fallback. ENGINE uses `sentinel_rgb_10m_native.asset.path` and `terrain_node_texture_uv_rows`.
- DEM vertices use `terrain_frame.pixel_centers.first_pixel_center_scene_m` and `last_pixel_center_scene_m`; terrain is no longer positioned by `((u-.5)*width, (.5-v)*depth)` envelope squeezing.
- Native RGB is rendered as a separate terrain-following overlay. Triangles with UV outside the Sentinel crop are not rendered in the RGB overlay, so edge pixels are not clamped into false coverage.
- Canopy no longer uses cones, instanced trees, jitter, or the old 3412 stride sample surface. It uses the full `eth_canopy_field_10m` raster as a 361×361 transparent texture field on a light terrain-following mesh.
- Canopy nodata value `255` is transparent. Picking computes the source pixel from click coordinates and returns no canopy inspector payload for nodata pixels.
- Overview keeps canopy hidden; dedicated canopy mode shows the continuous field. The source RGB remains visible behind canopy nodata/transparent areas.
- Canopy inspector text is concise Vietnamese: modeled height, uncertainty, year 2020, and non-claim that it is not individual-tree inventory or LiDAR.
- Building metric copy no longer exposes database jargon; `null` became `chưa đo`.
- Probe fidelity diagnostics include actual imagery dimensions/status, UV status, canopy representation/counts, cone count zero, and terrain frame.
- Grounding diagnostics are labeled as `construction_reference` with `independent=false`: render bases use the terrain triangle sampler and the clearance check confirms construction consistency, not an independent terrain raycast audit.
- Idle render readout now shows `Đứng yên` to avoid interpreting non-rendering idle state as low FPS.
- `index.html` script cache query now points to `static/app.js?v=20260914-native1` so demo reloads fetch the native visual engine code.
- Runtime fail from `mergeNonIndexed()` was fixed by restoring `triangleToFeature[]` for building/road merged geometry.
- Canopy texture mesh now reuses DEM geometry positions with UVs computed from canopy edge bounds, avoiding half-pixel centre offset and keeping the layer terrain-following.
- Mode selectors are scoped to `button[data-mode]` in both `applyMode()` and `wireUi()`, so `body[data-mode]` is not treated as a mode button and map clicks/pans do not re-trigger mode changes.
- Mode button active state now toggles `is-active` to match HTML/CSS and removes any legacy `active` class, so only the selected mode stays highlighted.

## Root/browser evidence received

- Native overview visual PASS: clearer field/road detail, no green dots.
- Active tour check: water mode around `120 renders/s`; canopy mode while tour rotating around `97 renders/s`.
- Earlier `5 renders/s` readout was idle/non-continuous rendering, not active lag evidence.

## Checks run

```bash
node --check outputs/tayninh-data-batch-04/static/app.js
```

File hashes after final runtime fix:

```text
static/app.js=5ffbfb7197922a7c2bc9fbae801e69dfb7d82ca3e9e4e1c0ebd70b443c66726a
index.html=5fc85000844bf10a751d7b7a0e42074cac499a482632e7e60fc1f2664e7054e7
```

Static/data gate:

```text
actual_visual_keys=True
uv_rows_actual_dims=True
native_rgb_dims=True
canopy_field_dims=True
terrain_pixel_centres=True
native_overlay_masks_outside_uv=True
no_cone_geometry=True
no_instanced_canopy=True
canopy_uses_full_texture_field=True
canopy_pick_by_source_pixel=True
canopy_geometry_light=True
overview_canopy_hidden=True
ground_sampler_triangular=True
probe_fidelity=True
metric_polished=True
idle_readout=True
no_jitter_word=True
no_visible_method_id=True
grounding_labeled=True
merge_triangleToFeature_declared=True
cache_query=True
button_selector_count=True
no_broad_data_mode_selector=True
uses_is_active_toggle=True
removes_legacy_active=True
no_active_toggle=True
```

Cold runtime smoke from `http://127.0.0.1:8804/tayninh-data-batch-04/index.html?cold=runtime3`:

```text
console errors/warnings=[]
rendererReady=true
sceneReady=true
imageryReady=true
imageryDims=330×334
canopyMode.activeMode=canopy
canopyMode.visible.canopy=true
canopy.renderedPrimitive=dem_geometry_texture_mesh
canopy.renderedVertices=11772
canopy.renderedTriangles=23112
canopy.coneCount=0
fpsReadoutWhenIdle=Đứng yên
```

## Probe fields added/updated

- `diagnostics.imagery.ready/status/method/sourceWidth/sourceHeight/textureWidth/textureHeight/path/resolution/error/uvStatus/overlayTriangles`
- `diagnostics.canopy.representation/coneCount/sourceSamples/renderedVertices/renderedTriangles/renderedPrimitive/fieldWidth/fieldHeight/validPixels/nodataPixels`
- `diagnostics.terrainFrame`
- `diagnostics.grounding`
- `objectCounts.canopyConeCount`

## Acceptance status

- VENGINE-R01: PASS by ENGINE integration; root overview browser visual PASS received.
- VENGINE-R02: PASS — no cone/dot primitive; canopy is full continuous 361×361 model field with source-pixel picking and transparent nodata.
- VENGINE-R03: PASS by code/static and root active tour measurement; final root reload may still verify mode/nav/screenshots.
- VENGINE-R04: PASS — syntax/static checks and Completion recorded; data/typography/UI structure preserved.
