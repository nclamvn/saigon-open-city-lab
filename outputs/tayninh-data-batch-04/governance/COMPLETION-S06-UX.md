# COMPLETION S06 UX

STATUS: DONE implementation; final Contractor browser acceptance PASS (addendum below). Builder leadership_ui,2026-09-14. User authorization and Contractor TIP permitted implementation without another approval checkpoint. Vibecode + frontend-design applied.

## Files and implementation

- `index.html`: retains all31baseline IDs, six analysis modes. Default collapsed narrative, new focus button and collapsed display options, compact persistent model/sample disclosure, source details for GEDTM/Google/generic modelling and C05 link. Local Inter retained; script cache s06.
- `static/styles.css`: shared344px desktop panel width/16px edge;8px mobile edge; translucent76%lightglass and10px blur. Six equal mode columns including390px, compactfooter, scroll-bounded options/inspector, source overlay suppresses competing mobile panels. No new imagery/font/network asset.
- `static/solution-ui.js`: event-driven presentation only; changed text/attributes updated only when needed. No geometry, fetch, timer, render loop, command duplication or camera-state invention. Vietnamese loading/busy/fallback status; rawerror only in expandable source details.
- `governance/baseline-s06/index.html`, `styles.css`: pre-edit snapshots. `SCAN-S06-UX.md`: scan/design direction. `test-s06-ui.cjs`: bounded state-contract tests.

## Engine contract

Engine owns click delegation for nine buttons:

| Command | Values |
|---|---|
| detail | detailed,data |
| terrain | gedtm,copdem |
| scale | 1,1.35 |
| heights | google,proxy |
| focus | cluster |

Attributes `data-solution-command` + `data-solution-value`; focus ID `focusCluster`. UI does not dispatch a second command on button clicks. UI subscribes before engine module to `b04:solution-state`, requests `b04:solution-request-state`, and consumes `{ready,busy,terrain,scale,heights,detail,available:{gedtm,google},error}`. No source available flag is invented. All controls disabled before readiness and duringbusy; unavailableGEDTM/Google disabled individually. Four pressed-state groups follow actual choices. Engine controls mode/narrative/inspector.

## Verification

`node --check static/solution-ui.js`: PASS,zero syntax errors.

`node governance/test-s06-ui.cjs`:11PASS,0FAIL. Cases: initial-disabled, ready/4pressedgroups, busy-disabled, partialsourcefallback, scale/detailstate, safe literalerror text, recovererror, notreadyreset, malformednullstate, baselineIDs retained/unique, sixmodes/scriptorder. Ninecommandbuttons,31baselineIDs retained. These are state-contract tests with a DOM test double, not renderer or browser acceptance.

Static review: native localInter,font path present; no remote font/dependency; sourceC05index exists; templateGEDTM period/datum/resolution matches actual supplement metadata, including217edge-kernel fallbacknodes disclosed inside expandable source. Keyboardhelp corrected against engine:arrows/WASDpan,Q/Exrotate. Script installs UI listeners before engine. No app.js/data/compiler/C05 changes.

| Requirement | Implemented | Verification status |
|---|---|---|
| S06-U01 compact glass/responsive | Yes | CSS/static complete; actual1440/390viewport pending Contractor |
| S06-U02 real state/options | Yes |11state-contract scenarios pass; real engine clicks pending Contractor |
| S06-U03 focus/reset/provenance | Yes |focuscommand connected by contract; resetIDs preserved; actualcamera/sourceflow pending Contractor |
| S06-U04 accessibility/browser readiness | Yes |ARIA/nativebuttons/labels/Escape/reducedmotion retained; actualbrowser regression pending Contractor |

Browser attempt: Builder CUA iAB unavailable; separate Chrome QA tab created but DOM snapshot/getTab timed out. No screenshot/layout/rendering pass claimed. Contractor has a functioning iAB tab and owns final actual desktop/390QA after Engine/Data join. No additional browser tabs needed.

## QA selectors and expected result

- `.mode-button[data-mode]`:6buttons,onepressed after modechange.
- `#solutionControls > summary`:opens4optiongroups; closes narrative; Escape closes options.
- `#focusCluster`:enginefocuscluster; canvas receives keyboardfocus afterclick.
- `[data-solution-command="terrain"][data-solution-value="copdem"]`, correspondinggedtm: active label followsengine state and samecamera preserved byengine.
- `#solutionStatus[data-state]`:loading/busy/ready/error; `#solutionSourceStatus`: actual activeprofile; `#solutionErrorDetails` hidden unlesserror.
- `#sourceToggle` opensdrawer; newsourceexplanations are outside engine `[data-source-list]`, so engineinjection cannot overwrite them. Sourceclose returnsfocus.
- `#toggleNarrative`, `#toggleUI`, `#resetView`, `#tour`, `#inspectorClose` baselinebehavior retained. Hhiddencontext remains honest.

Limitations: generic facade/roof/canopy geometry is explicitly labelled; imagery stays native10m. The interface is not evidence of surveyed accuracy. Shared viewport layout and engine integration require Contractor screenshots/QA before READY publication. No commit/push/deploy.

## Final Contractor addendum — /root, 14/09/2026

The pending statements above describe the Builder's verification at handoff. Contractor independently completed final browser acceptance; see [VERIFY-S06.md](VERIFY-S06.md). S06-U01–U04 PASS. This addendum records Contractor evidence and does not claim that the Builder performed browser QA.

- Actual desktop1440×900/887×998 and mobile390×844 screenshots and DOM layout: desktop panels344px; mobile panels374px,x8; document scrollWidth equals clientWidth. Inter computed correctly. Final cache key `s06-final`.
- Six actual modes and eight source/scale/height/detail changes passed. After the Engine panel-refresh fix, options remain open and a closed Inspector stays closed during source changes.
- Actual focus/pick/provenance, Right/Q/+/-/R, tour start/stop, mouse rotation/wheel, hide/restore passed. Drawer exposes nine fingerprints and five null-safe future templates; unavailable sources are disabled in the missing-supplement browser fixture.
- Final idle render counter865→865, resources14geometries/8textures stable, no console error/warn in the primary map. Ready for S06 local demo; surveyed accuracy and native10m imagery limits remain.

Contractor wrote this governance-only addendum after stopping the optional Builder documentation follow-up. No product/UI code or test output changed.
