# COMPLETION-B04-EXPERIENCE — Leadership UI and visual shell

Status: **PASS**

Owner: Builder `surface_enrichment`

Scope: `index.html`, `static/styles.css`, this report

Completed: 2026-09-14 (Asia/Ho_Chi_Minh)

## Delivered experience

The Batch 04 shell is a full-viewport, map-first executive interface for Gia Lộc 2.5D. The scene remains the main visual field while warm-ivory analysis surfaces, a restrained amber selection cue, and a deep green-blue disclosure dock establish a consistent hierarchy over both light and dark terrain.

- The top rail contains the identity, six analysis modes, tour, reset, and the global interface control.
- The narrative card contains one short interpretation, three mode-aware metrics, evidence/proxy marks, and a dedicated collapse control.
- The bottom dock keeps the legend, exact nonclaims, extended disclosure, source drawer, and keyboard help available without covering the central scene.
- The source drawer uses the 13 records supplied by `scene-data.json`; every record exposes a concrete `evidence/path` link and its literal local path. All 13 referenced files exist under `outputs/`.
- The inspector, loading state, north indicator, WebGL fallback, keyboard overlay, focus-visible states, reduced-motion behavior, and touch-safe controls are styled in the same system.

## Contract closure

All ENGINE contract nodes are present exactly once:

`#scene`, `[data-mode]`, `#tour`, `#resetView`, `#toggleUI`, `#sourceDrawer`, `#sourceToggle`, `#sourceClose`, `#inspector`, `#inspectorClose`, `#inspectorBody`, `#modeTitle`, `#modeCopy`, `#metricA`, `#metricB`, `#metricC`, `#fps`, `#loading`, `#loadingStatus`, `#disclosure`, `#northNeedle`, and `#uiShell`.

The shell also supplies `#toggleNarrative`, `#narrativeBody`, and `#metricLabelA` / `B` / `C`. These label IDs let ENGINE change metric meaning and value together for each mode.

Browser interaction confirmed this mode contract:

| Mode | Title | Metric labels | Displayed values |
|---|---|---|---|
| `overview` | Tổng quan 2.5D | DEM / Công trình / Tán cây | 109×109 / 657 / 3412 |
| `elevation` | Phân tích cao độ | Cao độ / Phóng đứng / Trung bình | 5.4–29.6m / 2.5× / 14.5m |
| `buildings` | Công trình | Dấu chân / Thiếu cao / Phương pháp | 657 / 657 null / xấp xỉ |
| `canopy` | Tán cây | Mẫu raster / Cao TB / Bất định | 3412 / 10.2m / σ6.0m |
| `water` | Thủy hệ | Ô JRC / Mùa / Danh nghĩa | 114 / 2024 / 30m |
| `change` | Biến động ứng viên | Tăng / Giảm / S2 mạnh | +89 / -25 / 5455 |

Each selected button reports `aria-pressed="true"`, the other five report `false`, and `body[data-mode]` matches the selected mode.

## Disclosure and recovery

The two required nonclaims are visible in the default state at every tested breakpoint:

- `Vùng mẫu — không phải ranh phường`
- `Chiều cao công trình là proxy`

The extended disclosure also states that the AOI is an open-data bbox, vertical exaggeration is 2.50×, and Sentinel/JRC/ETH evidence is not LiDAR, 1 cm imagery, measured building height, or a flood model. The wording uses `đã đối chiếu nguồn` rather than implying independent truth verification.

Narrative collapse is independent of global UI visibility. At 390×844 it reduces the card from 200.7 px to 62.9 px high, hides `#narrativeBody`, and changes `aria-expanded` plus the accessible label. Global hide leaves `#toggleUI` outside `#uiShell`; it becomes a 118×34 px `Hiện giao diện` control and preserves a 185.9×44.5 px claim-context card. This avoids a touch dead end and retains the minimum provenance context. The source drawer closes with Escape and keeps `aria-expanded` synchronized.

## Source disclosure

The drawer explicitly includes the six required products:

- Copernicus DEM GLO-30
- Sentinel-2 L2A
- Microsoft Global ML Building Footprints
- OpenStreetMap highways and waterway
- ETH Global Canopy Height 2020, including its uncertainty layer
- JRC Global Surface Water v1.5 occurrence, seasonality, and normalized occurrence change

The clean outputs-root browser run resolved the first relative evidence link as `/tayninh-data-batch-01/sources/aoi.json`; the remaining paths use the same `../tayninh-data-batch-N/...` convention. A filesystem audit found zero missing files across all 13 source records.

## Responsive verification

| Viewport | Result |
|---|---|
| 1280×720 | No page overflow. Top rail 1248×72 at y=14; narrative 354×232.5 at y=98; bottom dock 1248×60.5 at y=645.5. Primary controls do not overlap. |
| 768×720 | No page overflow. Top rail 736×117 at y=14; narrative starts at y=151; bottom dock starts at y=627.9. The compact claims and extended disclosure remain visible. |
| 390×844 | No page overflow. Top rail 374×107 at y=8; narrative starts at y=119; bottom dock starts at y=696.7; north control ends at y=686, leaving a 10.7 px gap. Disclosure remains visible at y=806. |

The six-mode rail scrolls horizontally on narrow screens. The source drawer becomes an inset full-height sheet, the inspector becomes a bottom sheet, and the FPS readout is hidden at the mobile breakpoint. FPS remains a low-contrast 8 px diagnostic on larger screens and is not presented as an executive metric.

## Static and browser QA

- HTML parser: 0 missing contract IDs; 0 duplicate IDs; exact mode order `overview`, `elevation`, `buildings`, `canopy`, `water`, `change`.
- Resource policy: 0 external `http://`, `https://`, or protocol-relative references in HTML. Fonts, icons, Three.js, CSS, JavaScript, data, and images are local.
- Required claims and all six required source product names are present in the initial HTML before JavaScript enhancement.
- CSS check: balanced delimiters; tablet, mobile, and `prefers-reduced-motion` rules present; browser CSSOM parsed 173 rules.
- JavaScript integration syntax: `node --check static/app.js` passed.
- Runtime: loading completed; all six mode interactions passed; narrative collapse, global hide/recovery, source open/close, evidence links, and Escape dismissal passed.
- Visual browser runs showed the fused terrain, Sentinel texture, canopy samples, road/water lines, and controls together at 1280×720 and 390×844; the interface remained legible over the rendered scene.
- Clean browser tab: 0 console warnings and 0 console errors.
- WebGL-capable run keeps the fallback hidden. The fallback supplies a readable recovery instruction when `body.no-webgl` is set.

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| Desktop, tablet, and mobile preserve the scene and avoid primary-control overlap | PASS | Visible fused scene plus measurements at 1280×720, 768×720, and 390×844 with exact viewport-sized document bounds |
| Consistent translucent surfaces, spacing, focus, and contrast | PASS | Warm-ivory and deep-green surface system; keyboard focus and reduced-motion CSS present |
| Required nonclaims visible immediately | PASS | Persistent disclosure at all three breakpoints and minimum context during global hide |
| Six exact source products listed | PASS | Initial HTML list plus 13-record runtime evidence drawer |
| Accessible names/states and keyboard dismissal | PASS | `aria-pressed`, `aria-expanded`, `aria-controls`, labels, Escape close, and focus-visible checks |
| No external services or unrelated assets | PASS | Static resource scan returned zero external references |
| HTML/CSS checks and Completion Report | PASS | Parser, CSS delimiter/CSSOM, whitespace, and browser checks passed |

## Limitations

The UI presents public evidence and display proxies. It does not claim an official ward boundary, individual-tree inventory, measured building height, LiDAR, true orthophoto at 1 cm, flood model, or operational change conclusion. The EXPERIENCE scope supplies the semantic shell and presentation behavior; scene geometry, camera, picking, and fused-data rendering remain owned by ENGINE.
