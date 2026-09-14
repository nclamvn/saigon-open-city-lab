# Contractor QA notes — S07

Independent review, 14/09/2026. These are engineering observations, not field measurements. Builders remain responsible for product code and their Completion reports.

## Before

Actual user IAB tab26, S06 URL `?v=s06-final&focus=cluster`, native screenshot reviewed at887×998. Same cluster/camera retained for the visual comparison. DOM probe: renderer s06.2; camera(x849.28,y73.25,z−698.74),radius125m; 656/657 footprints rendered; 482 Google modeled/174 proxy rendered;6 cached procedural64×64textures; 9geometries/7textures;10drawcalls/158804triangles. Single first-submit63.2ms is boot submission, not interaction benchmark or FPS. Idle counter1. Native RGB330×334at10m. Walls/panes/crowns visibly generic; individual site facade photos absent.

## Review issues routed before freeze

- B: dense wall segmentation reset U on every segment; requested cumulative perimeter/metre UV. Fine hipped roof seam fan must handle concave polygons without outside details. Sloping-ground opening fixtures requested.
- C: initial draft GLB header only accepted empty12-byte files; requested real JSON/BIN/accessor/model parser and valid triangle fixture. Unknown CRS, polygon holes and MultiPolygon components must be handled or rejected explicitly, never silently reinterpreted/dropped.
- C: initial chunk draft instantiated query IDs (cross-cell duplicates) and kept sample cells always fine at far camera. Requested centroid ownership, true distance/quality admission and cache bounds. Worker boot errors/timeouts and stale-generation catch must not hang/overwrite active state.
- A/B: ambientCGScatteredLeaves009 is a leaf-litter material. Photo material is not a photograph of Gia Lộc canopy or a specific house. Runtime maps≤1024px by agreed budget; source dimensions and actual semantic roles must be disclosed.

Final disposition and receipts belong in VERIFY-S07.md after code freeze and actual browser testing. This note does not claim the above issues are already fixed.

## Desktop baseline

Temporary IAB viewport1440×900 confirmed by read-only DOM (document width1440, no horizontal overflow). Native screenshot reviewed at the same radius125m: white generic walls/small repeated panes and simple roof colors; no site facade photographs. Actual tour sampled before upgrade:90 recent CPU/driver submission samples,median0.1ms,p950.2ms,max0.2ms;1127renders at snapshot,10geometries/8textures. Tour changes modes, so3drawcalls/69628triangles at that instant are a mode-specific observation, not comparable proof of speed improvement. Tour stopped with the actual button and actual “Đến cụm nhà” button used to restore focus.

Independent canonical sample computation from immutable S06 footprints: centre[928.023355,−778.339734];250m bounds[803.023355,−903.339734,1053.023355,−653.339734].52centroid members,57bbox intersections. Five border-only IDs:msft_0129,msft_0152,msft_0308,msft_0370,msft_0631. Membership rule must be explicit and aligned across manifest, worker, runtime and UI.

Nine S06 source fingerprints independently recomputed and matched9/9.657source heights remainNULL;0measured_height=true. Native/source observations must remain so after the visual work.

## Integration defects found by Contractor

At09:16–09:17UTC actual browser load `?v=s07-preview&focus=cluster` failed with “loadScriptOnce is not defined”,0renders and loader visible. Blocker routed back to C. The draft called a helper that was absent; syntax-only tests did not catch runtime undefined references.

Independent Node negative-format audit saved `/tmp/s07-root-importer-early.json`: all six malformed cases were accepted by the draft importer. GLB accessors outside BIN, invalid POSITION component type and invalid index type; GeoJSON unclosed ring and self-intersecting bowtie; raster affine/dimensions incompatible with declared source bounds. SeverityHigh, routed C. Also requested decoded GLB positions/indices with bounds/nonfinite/index checks rather than accessor counts alone. No importer readiness claim until these close.

## Material/geometry checks rerun

Contractor independently ran Builder B surface and material CLI scripts against current files: both exit0/PASS.57intersection buildings tested;19836fine extra triangles;0UV discontinuities,projectedOutside,aboveEnvelope;3fixturenear trees.12actual active map hashes/dimensions validated;55.999992MiB estimated RGBA+mips. Independently opened all15map files with PIL:15/15declared dimensions and SHA256 match, including inactive leaf-litter. Bricks1024×512; roof/plaster/asphalt/litter1024×1024. Actual source preview inspection found Road007 lane markings; active material changed to unmarked Asphalt033, old road asset retained only as downloaded/archive evidence. Ground litter remains inactive as canopy. All are generic material assets, not site observations.

## Actual desktop/mobile findings before final freeze

At 09:33 UTC, an actual 508-byte GLB selected through the browser file chooser decoded one triangle and matched SHA-256 `ee2224554ce49f77b18b2e10ddce43c8243211f325b32529e43cf72bfc5a3fd1`. The result remount then discarded the file input and JSON text. The next intended hash mismatch returned “Chưa chọn file GLB”. C was asked to preserve the original file-input DOM node, text, select and cursor; this needs a fresh browser check after patch.

At 390 × 844, Inter rendered correctly and document width/height matched the viewport. The source drawer fit without horizontal overflow. However, the collapsed narrative still displayed the full S07 grid and details: panel from y112 to y654, leaving little map space. C was asked to make mobile collapse retain a compact S07 header/A-B row and reveal the rest on expand.

At 09:38 UTC, the Contractor reproduced a visible hole across the sample by choosing “Đến cụm nhà” then A. DOM probe showed `detail=data`, `active=['c0_0']`; the fine group was hidden, while the coarse fallback was hidden because the chunk remained active. The sample houses actually disappeared in the screenshot, although objectCounts still claimed 656. The A/B buttons also remained stale. Root traced the early generation-key return (detail was in the key without rebuilding on detail switch), missing quality/mode admission, and coarse visibility using nominal rather than effective fine activity. C must close all three causes, then actual A/B and elevation screenshots must show the houses. Numeric total counts alone are not acceptable proof of visibility.

Six actual mode transitions, GEDTM→COPDEM→1.35×→proxy→GEDTM→1×→Google, picking `msft_0626`, keyboard pan/rotation/zoom, tour, reset, and hide/restore operated without a new browser error before the final patch. Source change retained the exact camera [849.28, 73.95, -698.74], radius125; memory returned to 15 geometries/16 textures. Tour CPU/driver submission samples: median0.2 ms, p950.3 ms, max0.4 ms; this is not GPU timing or guaranteed FPS.
