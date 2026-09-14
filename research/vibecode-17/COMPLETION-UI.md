# Completion UI17 — City Lab spatial analysis

Builder: leadership_ui. Status: complete, frozen for Contractor verification. Final UI asset cache suffix: `17b`; source catalogue semantic version remains `17a`.

## Delivered against TIP

- **UI01:** A fifth, compact “Phân tích” task uses the existing 360px glass panel through an optional panel registry. Existing exploration, planning, photo comparison, tours and research mode remain available. Default overview stays daylight; explicit night and facade query parameters remain respected. One bounded 120ms replay checks registered view buttons to resolve the existing cold-load facade initialization race; no repeating timer was added.
- **UI02:** Real polygon/line input uses ray intersection with the displayed flat datum. Enter/double click finishes, Escape cancels, Backspace/Delete undoes. Pointer and navigation capture exist only during drawing and are removed on panel exit. Drawing stops tour, cinematic director and follow motion before accepting points. The Nguyễn Huệ sample uses actual source road ID `341504312`. Area mode displays “Vùng chọn”; corridor distances support three distinct values between 5 and 500m.
- **UI03:** Results appear above the fold; query settings collapse after a result and remain editable. Scenario and highlight changes preserve the camera. Overlays use at most four batched render objects, with a visible 1.5m tube for the selected route; overlays are disposed when replaced. Counts distinguish model representations and groups of source IDs. Sources distinguish data actually used from reference leads. Survey-only functions stay disabled with an explanation.
- **UI04:** A lazy Worker validates the downloaded scene bytes against the catalogue SHA256 before parsing. Hash mismatch blocks analysis, keeps the map available and supports retry. This proves file identity, not survey accuracy. JSON, CSV and printable HTML downloads include geometry, result/provenance, camera, limitations and source hash context. CSV includes metadata rows and formula-safe cells. File-protocol and worker failures have visible explanations. Read-only `#twin17Probe[data-json]` updates on state changes, without background polling.
- **UI05:** Bounded automated browser tests and Contractor visual checks completed. No city scene, source dataset or GIS algorithm was modified by this Builder.

## Verification and reproducibility

Run from repository root with the existing local outputs server at `http://127.0.0.1:8768`:

```sh
node outputs/hcmc-poc/scripts/qa-twin-17-ui.cjs
node outputs/hcmc-poc/scripts/qa-twin-17-regression.cjs
```

Scripts use the bundled Playwright dependency at `/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`. The bundled Node executable is `/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. They launch full Chromium headless with `channel: 'chromium'` and `--use-angle=metal`; default headless-shell stalled under this host's software rendering and was not used for the passing run. This host required the permitted local browser launch outside the shell sandbox. Both scripts are retained under the product scripts directory; their relative output location assumes repository-root invocation.

- **UI browser suite: 14/14 PASS**, recorded in `qa/ui-results.json`: default day view, worker readiness, source-road sample, bounded overlays, camera preservation, disposal, export escaping, actual map-click drawing and Enter completion, Escape/panel lifecycle, 390px layout and no JavaScript errors.
- **Regression browser suite: 18/18 PASS**, recorded in `qa/regression-results.json`: cold-load explicit facade, verified raw-byte ingestion, query SHA256, actual JSON/CSV/HTML downloads, self-contained CSV metadata, invalid width rejection, uppercase navigation capture only while drawing, restored keyboard navigation, explicit night view, stopping the cinematic director before drawing, deliberate hash corruption rejection and successful retry, with no JavaScript errors.
- Actual browser screenshots: `qa/desktop-sample.png`, `qa/mobile-analysis.png`, `qa/night-regression.png`. Actual downloaded artifacts: `qa/export.json`, `qa/export.csv`, `qa/export.html`.
- Contractor independently reviewed the live in-app browser and screenshots: A = 46 source-ID groups / 6,426.3m² union; C = 224 / 54,064m², immediately visible. Actual polygon clicks produced results. Source byte verification was visible. Explicit night/facade and keyboard movement also passed Contractor review.
- Contractor independently parsed the downloaded CSV: 380 rows, 13 columns, 17 metadata rows plus 362 feature rows, with actual CRLF. Downloaded JSON contains A/B/C counts 46/92/224 and verified 30,200,554-byte scene integrity. These are Contractor checks, distinct from this Builder's scripts.
- Shared core verification is owned by the other Builders/Contractor: reported 76/76 tests (35 source + 41 GIS), not duplicated as UI test assertions. See `COMPLETION-GIS.md` for Worker/verified-byte API details and limits, and `COMPLETION-SOURCES.md` for source normalization.

## Limits and scope

This is approximate source-footprint analysis on a flat display datum at y=1.5m, not an approved planning boundary, surveyed parcel database or validated physical building count. AOIs drawn by the user and sample corridors are analytical examples. Source identities and epochs can overlap; union and intersection sums are deliberately separate. Large queries fail visibly rather than truncate beyond the core's 20,000 candidate limit. HCMC requires Worker execution; the core's small-data fallback is limited to 3,000 features. Flood, cut/fill and line-of-sight remain unavailable without suitable verified survey data. No automatic commit, push or publication was performed.

Only cache query strings and relocation of unchanged passing test scripts followed the final browser runs; final JavaScript syntax checks cover the frozen files. Contractor owns final integrated VERIFY and release recommendation.
