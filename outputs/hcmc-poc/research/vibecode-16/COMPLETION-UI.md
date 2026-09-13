# Completion report — TIP-16-UI

STATUS: DONE (implementation and static integration); Contractor browser acceptance recorded separately in VERIFY.

## Files changed

Created `leadership-16.js`, `leadership-16.css`, `scripts/validate_leadership_16.py`, and the SCAN/TIP/completion/static validation files in this directory. Integrated local CSS, planning data and leadership script into `index.html`; original `demo-shell.js` still loads last. Extended `scripts/package_single.py` to inline all local stylesheets and preserve the photo-gallery link in the standalone export. Removed the old R loading mark; the finished loader becomes inaccessible to screen readers.

## Implemented acceptance requirements

1. Daylight overview default; explicit view query is preserved.
2. Four leadership tasks with compact attribution, current-state qualifier and navigation utilities; legacy technical HUDs and UAV controls hidden in leadership mode.
3. One mutually exclusive drawer, Escape/close focus restoration, map focus after choosing viewpoints, portrait scroll constraints.
4. All 20 existing photo entries remain selectable, with image/date/author/license and held-photo or sampled-envelope explanation.
5. Planning source cards use safe text nodes, links and collapsed publisher/date/limitations/rights. Geometry remains unavailable regardless of catalog presence; no invented future scene or timeline.
6. Eligible loaded facades use the existing reversible A/B button; selected-key and eligibility checks reject stale/held entries. No camera or geometry writes are performed by comparison handlers.
7. Four manually paced stops, previous/next/end, no endless camera autoplay.
8. Research mode explicit; returning suspends existing UAV, audit, height experiment and automatic camera motion.
9. Existing H/F/navigation preserved. Map canvas gains focusability so arrow keys work immediately after viewpoint selection.
10. Standalone export embeds added JS/CSS and correct local gallery link. Official external source pages still require connectivity.

## Test results

- JavaScript syntax: `node --check leadership-16.js` PASS.
- New static integration validator: 16/16 PASS (artifact `validation-ui.json`).
- Existing demo readiness validator: 19/19 PASS.
- Standalone packaging integration: 4/4 PASS (no external stylesheet or script tags, shell CSS embedded, photo attribution gallery path corrected).
- Build: static app, no bundler; standalone package generates successfully (~50.3 MB).
- Types/lint: no configured TypeScript or lint toolchain; not reported as zero errors.
- Browser scenarios: performed independently by Contractor; this report does not substitute static checks for visual/runtime verification.

## Issues and limitations

Full planning drawings are not available in this batch, so future geometry is deliberately unavailable. Existing model is an approximation, existing photo collection spans different dates, and five held entries remain untextured. This interface does not increase geometric accuracy. Browser/hardware performance and touchscreen presentation must be assessed on the intended demo device.

## Deviations

Contractor approved extending the single-file packaging hook when the scan identified new CSS would otherwise be omitted. Source links say “Mở trang nguồn” rather than claim all publications are original documents; originalPublisher and restrictions are shown in each expanded source record. Existing engine and PoC 15 geometry handlers were reused without a framework migration.

## Suggestions

Next increment should take the geometry audit's verified source requirements and fix one measured/photographed building at a time. Do not enable a future-date slider until actual approved and versioned planning geometry has been acquired and reviewed.

## Contractor browser review and refinement

Contractor reported PASS for default daylight, four source records, held-facade A/B disabled, same-camera A/B, four-stop tour with next/back/end, layouts at 390 px and 1440 px, research return, presenter hide/show, Escape and arrow navigation changing the camera. No errors were reported for those scenarios.

The embedded browser did not enter native fullscreen through the prior hidden-button proxy. Refined the leadership button and F key to invoke the browser API directly, then check the actual fullscreen element. Unsupported/rejected/no-op requests produce an accessible notice after at most 1.5 seconds; the notice suggests H for more map space. Fullscreen state is exposed in the QA status. Native fullscreen is **not claimed as passed** on an unavailable embedded surface. Also made overview reset explicitly focus the canvas.

After this refinement: JavaScript syntax and 16/16 static integration checks PASS; standalone package rebuilt to 50,320,540 bytes. Final browser confirmation of the fullscreen fallback is recorded by Contractor in VERIFY.
