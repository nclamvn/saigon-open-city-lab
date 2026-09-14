# Batch04 native imagery and continuous canopy — Contractor verification

Verified 2026-09-14. Scope: correct degraded RGB and unrealistic tree-dot grid reported by the user. Status: **PASS, 8/8 scoped acceptance requirements**. This is source-preservation and representation correction, not acceptance of a survey-grade or photorealistic digital twin.

## Verified result

- Sentinel RGB texture is the exact native330×334 PNG from Batch02, nominal10m, acquired2025-11-30. It is no longer reduced to109×109 DEM colours.
- Native image uses per-DEM-pixel-centre WGS84→UTM48N UV. Full exported11,881-node grid independently matches PROJ: maximum ground-equivalent UV error0.000002597m. Coverage flags match;11,811 inside and70 outside. Outside triangles do not sample clamped border colour. Numerical conversion accuracy does not establish observational accuracy.
- ETH canopy is the full361×361 model field2020,119,438 valid and10,883 nodata pixels. There are zero cones or individual-tree instances. Source3412 earlier samples remain unchanged for lineage. Overview shows actual image vegetation; canopy field appears only in its dedicated mode.
- Continuous canopy texture reuses DEM positions, with UV from canopy pixel-area edge bounds and source-pixel picking. Render geometry11,772 vertices/23,112 triangles retains361×361 raster information. Nodata remains transparent.
- Grounding diagnostics are explicitly `construction_reference`, `independent=false`; zero clearance is not independent survey/mesh-accuracy proof.

## Browser verification

Cold reload of `static/app.js?v=20260914-native1` starts successfully: rendererReady/sceneReady/imageryReady true, loading hidden. Final navigation produced no new warnings/errors. An earlier pre-fix ReferenceError remains in the tab's retained development log; it was fixed and did not recur on final reload.

| Scenario | Result |
|---|---|
| Six modes | PASS: overview/elevation/buildings/canopy/water/change ready, correct layer visibility, cones0. |
| Mode selection | PASS: exactly one `is-active` button and one `aria-pressed=true` button in every mode; BODY no longer receives mode-button listeners. |
| Canopy pick | PASS: centre click opens persistent inspector with modeled6m height,4m uncertainty,2020 source and model disclosure. |
| Keyboard/zoom/reset | PASS: Right changes x by67.79m; `=` changes radius1936.96→1704.52; reset restores1936.96; H hides/shows controls. |
| Tour | PASS: cycles modes and moves camera. Final water mode observed120 renders/s; earlier full-field canopy moving test97 renders/s. These are test-environment observations, not guaranteed device FPS. Idle now reads “Đứng yên”. |
| Desktop visual | PASS: native farm plots, roads and settlement clusters distinguishable; grid of oversized green dots removed.1280×720 inspected. |
| Mobile visual | PASS:390×844, page clientWidth=scrollWidth=390; no overlap/page overflow; narrative collapse works. Temporary viewport override reset. |

## Data/build verification

`test_visual_layers.py` and `test_fusion_scene.py`: PASS, no errors. Deterministic visual compiler rebuild: all six output file hashes unchanged. Final `node --check static/app.js`: PASS. Fusion data/QA, CSS and Inter font hashes remain unchanged.

| Requirement | Result |
|---|---|
| VDATA-R01 native imagery/source metadata | PASS |
| VDATA-R02 spatial registration and coverage | PASS: independent PROJ plus edge/centre checks |
| VDATA-R03 actual continuous canopy/nodata/uncertainty | PASS |
| VDATA-R04 deterministic build and contract | PASS |
| VENGINE-R01 native decoded RGB and recovery metadata | PASS |
| VENGINE-R02 no fake tree grid, correct continuous field/pick | PASS |
| VENGINE-R03 modes/navigation/visibility/visual checks | PASS |
| VENGINE-R04 syntax, owned scope and completion | PASS |

## Final artifact fingerprints

```text
static/app.js 5ffbfb7197922a7c2bc9fbae801e69dfb7d82ca3e9e4e1c0ebd70b443c66726a
index.html 5fc85000844bf10a751d7b7a0e42074cac499a482632e7e60fc1f2664e7054e7
static/styles.css 8dd9be7d77593220bdaffb517f95e97e4a4f90bf142f232ff2a44eb8f66c832e
derived/visual/visual-data.json 215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682
derived/fusion/scene-data.json 20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878
derived/fusion/fusion-qa.json 32180bcae1abb429df03e64ebdbeab3ecd8a48ebf3a662fe99ca63d0a8e17bed
```

Evidence: `evidence/proj-transform-reference.json`, `evidence/exported-uv-proj-reference.json`, DATA/ENGINE Completion reports and `VISUAL-DIAGNOSIS.md` including the bounded sharper-imagery lookup receipt.

Native10m imagery still cannot resolve individual crowns, detailed facades or small roads. Tree inventory and finer scene reconstruction require appropriately detailed observations; this correction does not invent them.
