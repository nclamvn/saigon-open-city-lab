# TIP-B04-VISUAL-ENGINE — Correct degraded imagery and fake tree dots

Owner: Builder `data_workbench`. Contractor `/root`. Priority: P1 visual honesty.
Depends on additive visual-data contract from `local_data_recovery`.

## Context and decision

User screenshots show heavily blurred RGB and regular giant green dots. Sentinel original330×334 was reduced to109×109 by current renderer/compiler path; full source is10m, not street-scale photogrammetry. Canopy stride6 samples are displayed as cones with excessive radius at regular60m spacing. Fix within approved Batch04 without claiming photo-realistic individual trees. No extra approval checkpoint required.

## Scope

Own `static/app.js`, optional cache reference in `index.html` only if needed, and `governance/COMPLETION-B04-VISUAL-ENGINE.md`. Preserve Inter/CSS, UI structure, source scene contract and older batches. Coordinate additive `derived/visual/visual-data.json` with source Builder.

## Task

- Render properly registered full/native-scale Sentinel texture independently of DEM resolution. Await texture decode before ready; use correct sRGB/tone mapping and anisotropy; no artificial sharpening/upscale claims, no bloom/DoF blur. Reveal absent coverage accurately. Expose actual source vs texture dimensions in probe and inspector.
- Remove all regularly spaced cones/tree dots. Overview should show original vegetation from imagery, optionally a very subtle terrain-following canopy field. Dedicated canopy mode should render a continuous measured/modelled raster field (surface/tint), with modeled height and uncertainty available on pick. Do not render raster samples as individual trees; do not jitter fake trees. Keep existing3412 evidence samples traceable in source data but distinguish source count from rendered primitives.
- Keep all layers spatially registered including terrain frame/origin, correct north mapping and ground anchoring after any frame correction.
- Preserve six modes, pointer/keyboard/tour, visibility-aware raycast, metric semantics, local assets and performance refinements. Translate newly touched imagery/canopy inspector and explanatory copy to concise Vietnamese. Disclose10m imagery and canopy model2020 limits; distinguish continuous field from tree inventory.
- Add meaningful probe diagnostics: imagery width/height/method/ready, cone count0, canopy representation, true frame and sampling diagnostics. Do not count array length as proof of visual fidelity.

## Acceptance

- VENGINE-R01: Full/native Sentinel rendering, asynchronous ready/error behavior and accurate source metadata; demonstrably more detail than109×109 fallback.
- VENGINE-R02: No grid of fake green cones in any mode; continuous canopy field is spatially correct and honestly described; picks show height/uncertainty/source.
- VENGINE-R03: Six modes/navigation/picking/recovery remain correct; console clean; diagnostics cached/throttled; coherent desktop/mobile visual output.
- VENGINE-R04: Syntax/checks pass, exact files and Completion recorded, data/typography unchanged outside owned scope.

Contractor must inspect final screenshots before delivery; functional PASS alone is insufficient for image quality.
