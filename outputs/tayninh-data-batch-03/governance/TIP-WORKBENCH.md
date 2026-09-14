# TIP WORKBENCH - Batch 03

Builder: batch03_workbench. Contractor: /root. Date: 2026-09-14.

Scope: build deterministic Batch 03 registry, validators/gates, and a local key-free leadership workbench for temporal, vegetation and hydrology layers. Own only Batch 03 `registry`, `scripts`, `index.html`, `static`, `governance/TIP-WORKBENCH.md`, and `governance/COMPLETION-WORKBENCH.md`. Do not edit data Builder manifests, raw/derived data, Batch 02 history or HCMC PoC.

Inputs:

- Import Batch 02 `../tayninh-data-batch-02/registry/data-registry.json` as immutable history.
- Consume `sources/temporal-records.json` when present.
- Consume `sources/ecosystem-records.json` when present.

Acceptance criteria:

- AC1 registry imports Batch 02 records unchanged with provenance history.
- AC2 validator fails loudly for manifest not array, duplicate ID, missing/wrong snapshot or source hash, evidence span missing, AOI mismatch, derived hash mismatch, derived input hash mismatch, and temporal alignment/lineage gaps.
- AC3 bites prove the gates above using temporary fixtures only.
- AC4 workbench shows epoch A/B dates, clear A/B/side-by-side controls, candidate change toggles, canopy/uncertainty and water history layers when present.
- AC5 UI explicitly says candidate change is only a candidate layer, not a conclusion; raster layers sit below roads/water/buildings; QA JSON never becomes a map layer.
- AC6 run strict build, gates, JS syntax, local HTTP smoke and update Completion with exact final counts/coverage.

Non-claims:

- No official ward boundary, cadastral conclusion, 1 cm ortho, Hera/LiDAR result, individual-tree inventory, hydrological model, flood model, or confirmed construction change.
