# TIP-B04-ENGINE — Fused Three.js analytical scene

Priority: P0  
Owner: Builder `data_workbench`  
Dependency: scene-data contract in `BLUEPRINT.md`  
Owned paths: `outputs/tayninh-data-batch-04/static/app.js`, `vendor/`, `governance/COMPLETION-B04-ENGINE.md`

## Task

Implement the Three.js engine against `derived/fusion/scene-data.json`. Drape Batch 03 reference Sentinel imagery on the DEM mesh; render merged building geometry, terrain-following roads/water, instanced canopy raster samples, and JRC water evidence. Implement six analysis modes through the fixed DOM contract below.

DOM IDs/classes supplied by EXPERIENCE: `#scene`, `[data-mode]`, `#tour`, `#resetView`, `#toggleUI`, `#sourceDrawer`, `#sourceToggle`, `#sourceClose`, `#inspector`, `#inspectorClose`, `#inspectorBody`, `#modeTitle`, `#modeCopy`, `#metricA`, `#metricB`, `#metricC`, `#fps`, `#loading`, `#loadingStatus`, `#disclosure`, `#northNeedle`, `#uiShell`.

Required modes: `overview`, `elevation`, `buildings`, `canopy`, `water`, `change`. Pointer orbit/pan/zoom and keyboard arrows/WASD, Q/E, +/−, R, T, H must work. Raycast selection must populate the inspector with source/method/date/resolution or model limitation.

## Acceptance criteria

- Local Three.js loads without Internet/CDN dependence.
- Scene boots, camera is above terrain, and loading overlay clears only after core assets/data are ready.
- All six modes produce distinct, reversible material/visibility/camera/legend behavior.
- Buildings follow terrain and use proxy-height styling/disclosure; canopy represents raster samples; water history cannot be mistaken for flood depth.
- DPR capped at 1.5; buildings merged and canopy/water cells instanced; animation hot path avoids rebuilding geometry.
- Resize, pointer, touch, keyboard, reset, tour, UI hide, source drawer, and inspector work.
- Expose numerical QA in `window.__B04_PROBE__()` for renderer state, object counts, active mode, camera, FPS text, and disclosure flags.
- JavaScript syntax check passes and Completion Report is complete.

