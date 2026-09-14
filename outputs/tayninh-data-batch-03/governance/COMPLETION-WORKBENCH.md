# COMPLETION — Batch 03 WORKBENCH

Generated: 2026-09-14

## Scope completed

- Created `governance/TIP-WORKBENCH.md` before implementation.
- Maintained deterministic Batch03 registry builder at `scripts/build-registry.mjs`.
- Maintained adversarial gate suite at `scripts/test-registry-gates.mjs`.
- Integrated final temporal/ecosystem manifests into the static workbench:
  - `index.html`
  - `static/workbench.css`
  - `static/workbench.js`
- Rebuilt canonical registry at `registry/data-registry.json`.

No raw/source manifests or derived data manifests were edited by WORKBENCH.

## Final registry state

- Schema: `rtr.tayninh.batch03.registry.v1`
- Total records: `25`
- Batch03 manifest records: `3`
- Imported Batch02 records: `22`
- Validation failures: `0`
- Status counts:
  - acquired: `13`
  - candidate: `9`
  - blocked: `3`
  - missing inputs: `0`

Input reports:

- Batch02 registry: present, `22` records imported.
- `sources/temporal-records.json`: present, `1` record.
- `sources/ecosystem-records.json`: present, `2` records.

## Final map layers

Default visible layers remain visually clear: one base epoch plus vectors.

1. `landcover` — WorldCover land-cover, default off, inherited from Batch02.
2. `optical` — Sentinel-2 true-colour from Batch02, default off because Batch03 epoch B is available.
3. `epoch-a` — Epoch A — Sentinel-2 true-colour `2024-12-20`, default off.
4. `epoch-b` — Epoch B — Sentinel-2 true-colour `2025-11-30`, default on.
5. `quality` — Sentinel-2 SCL quality from Batch02, default off.
6. `quality` — Epoch A — Sentinel-2 SCL quality `2024-12-20`, default off.
7. `quality` — Epoch B — Sentinel-2 SCL quality `2025-11-30`, default off.
8. `temporal-mask` — Temporal valid-mask and candidate pixels, default off.
9. `water-occurrence` — JRC water occurrence `1984–2024`, default off.
10. `water-seasonality` — JRC water seasonality `2024`, default off.
11. `water-change` — JRC normalized water occurrence change `1984–1999 / 2000–2024`, default off.
12. `canopy` — ETH canopy height `2020`, default off.
13. `canopy-uncertainty` — ETH canopy uncertainty `2020`, default off.
14. `sentinel-change` — Sentinel candidate-change heatmap `2024-12-20 / 2025-11-30`, default off.
15. `elevation` — Batch 01 Copernicus DEM context, default off.
16. `roads` — Batch 01 OSM roads, default on.
17. `water` — Batch 01 OSM water, default on.
18. `buildings` — Microsoft building footprints, default on, `657` total features and `350` rendered features.

The UI keeps rasters below vectors, clips drawing to the AOI frame, and links inherited Batch02 assets using `../tayninh-data-batch-02/` so they resolve when serving from the `outputs/` directory. QA JSON, TIFF, PRJ, PGW/world files, and other sidecars are excluded from visual layer toggles.

Candidate-change wording remains screening-oriented: it is a candidate heatmap/toggle, not a conclusion.

## Requirement coverage from acquired records

- Review groups touched: `R02`, `R04`, `R05`, `R06`, `R10`, `R12`, `R13`, `R14`, `R18`, `R20`
- Question IDs touched: `2D-B-01`, `3D-C-01`, `3D-F-01`
- Document groups touched: `2D-B`, `3D-C`, `3D-F`
- Review group inventory total: `23`
- Question inventory total: `237`

## Validation gates

Commands run:

```bash
node --check outputs/tayninh-data-batch-03/scripts/build-registry.mjs
node --check outputs/tayninh-data-batch-03/scripts/test-registry-gates.mjs
node --check outputs/tayninh-data-batch-03/static/workbench.js
node outputs/tayninh-data-batch-03/scripts/test-registry-gates.mjs
node outputs/tayninh-data-batch-03/scripts/build-registry.mjs --strict --out=registry/data-registry.json
```

Gate output:

```text
batch03 registry gates passed: snapshot hash, evidence, duplicate id, aoi mismatch, derived input mismatch, temporal alignment, temporal lineage, manifest not array
batch03 registry: 25 records (3 batch03), 0 validation errors -> outputs/tayninh-data-batch-03/registry/data-registry.json
```

Adversarial gates covered:

- wrong snapshot hash fails
- missing evidence span fails
- duplicate ID fails
- AOI mismatch fails
- derived input hash mismatch fails
- missing temporal alignment fails
- temporal lineage/input hash mismatch fails
- object manifest fails loudly with `MANIFEST_NOT_ARRAY`

Final registry spot check:

```text
records=25
batch03=3
validation_errors=0
missing_inputs=0
default_visible=epoch-b, roads, water, buildings
visual_sidecar_layers=0
missing_assets=0
```

## HTTP smoke

The sandbox blocked binding a local HTTP server without escalation:

```text
PermissionError: [Errno 1] Operation not permitted
```

After approved local-only escalation, server was run from `outputs/`:

```bash
python3 -m http.server 8795 --bind 127.0.0.1 --directory outputs
```

Because the escalated server was in the elevated local network namespace, the final curl smoke was also run with local-only escalation against `127.0.0.1`.

Smoke results:

```text
HTTP smoke ok: 19 URLs
```

All of the following resolved with `HTTP/1.0 200 OK`:

- `/tayninh-data-batch-03/index.html`
- `/tayninh-data-batch-03/registry/data-registry.json`
- `/tayninh-data-batch-03/static/workbench.js`
- `/tayninh-data-batch-03/static/workbench.css`
- `/tayninh-data-batch-02/derived/surface/worldcover-2021-aoi.png`
- `/tayninh-data-batch-02/derived/surface/sentinel-2-20251130-aoi-tci.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20241220-aoi-tci.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20251130-reference-aoi-tci.png`
- `/tayninh-data-batch-02/derived/surface/sentinel-2-20251130-aoi-scl.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20241220-aoi-scl.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20251130-reference-aoi-scl.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20241220-vs-20251130-mask-candidates.png`
- `/tayninh-data-batch-03/derived/ecosystem/jrc-water-occurrence-1984-2024-aoi.png`
- `/tayninh-data-batch-03/derived/ecosystem/jrc-water-seasonality-2024-aoi.png`
- `/tayninh-data-batch-03/derived/ecosystem/jrc-water-change-1984-1999-vs-2000-2024-aoi.png`
- `/tayninh-data-batch-03/derived/ecosystem/eth-canopy-height-2020-aoi.png`
- `/tayninh-data-batch-03/derived/ecosystem/eth-canopy-height-2020-uncertainty-aoi.png`
- `/tayninh-data-batch-03/derived/temporal/sentinel-2-20241220-vs-20251130-change-heatmap.png`
- `/tayninh-data-batch-02/derived/buildings/microsoft-vietnam-132230111-aoi.geojson`

Serving directly from `outputs/tayninh-data-batch-03` is not the correct smoke mode because Batch03 inherits sibling Batch02 assets. Serving from `outputs/` matches the relative inter-batch link layout.

## Honest limitations

- Epoch A/B, candidate heatmap, canopy, uncertainty, and JRC water layers are public-source screening layers only.
- They are not official administrative boundaries, not 1 cm orthophoto, not LiDAR, and not Hera payload ground truth.
- The change heatmap remains a candidate-prioritization visual for review; it is not a confirmed change conclusion.
