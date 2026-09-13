# SCAN — Leadership interface

2026-09-13 · Builder / TIP-16-UI

Existing application is static HTML, CSS and Vanilla JavaScript, with a shared Three.js scene and data embedded into scripts. There is no package manifest, type checker or lint configuration. Python validators and browser verification are the existing quality gates. `demo-shell.js` runs last and owns H/F/0 shortcuts. `cinematic-night-12.js` owns the legacy collapsible panels and delayed URL view selection. `photo-facades-15.js` owns real-photo selection, eligibility checks and reversible geometry/UV A/B.

Reusable: existing view buttons, `setCityView`, day lighting, hidden photo selector and A/B button, source manifest, modal research view and keyboard navigation. Risks: fixed legacy panels overlap; view names leak PoC labels; programmatic view selection does not always reset lighting; research state may leave UAV or audit overlays enabled when returning to leadership mode. New interface must close old panels and suspend those optional overlays on return.

Implementation scope: additive leadership JS/CSS plus script integration, no scene rewrite and no modifications to the PoC 15 geometry correction. New source catalog supplied independently. Offline packager currently inlines only `style.css`; extend to local stylesheet links. Browser performance depends on existing renderer and hardware; no new render passes planned.
