# TIP WORKBENCH - Batch 02

Builder: batch02_workbench. Contractor: /root. Date: 2026-09-14.

Scope: build deterministic Batch 02 registry, validator/bites, and a local key-free visual workbench. Own only `registry`, `scripts`, `static`, `index.html`, and `governance/COMPLETION-WORKBENCH.md` in Batch 02. Batch 01, raw/derived outputs from other builders, HCMC app, and Batch 02 builder manifests are read-only inputs.

Inputs to consume:

- Batch 01 registry and AOI from `../tayninh-data-batch-01`.
- Batch 02 `sources/building-records.json`.
- Batch 02 `sources/surface-records.json`.
- Any source/raw/derived files referenced by those manifests.

Acceptance criteria:

- AC1 imports Batch 01 records without rewriting their historical provenance.
- AC2 validates Batch 02 records for missing snapshot/local/derived hashes, evidence spans, AOI intersection, duplicate IDs, and derived input hash mismatch.
- AC3 adversarial bites prove the gates fail for wrong hash, missing evidence, duplicate ID, AOI mismatch, and derived input mismatch.
- AC4 visual workbench renders offline/local: AOI, Batch 01 roads/water/elevation context, and building/land-cover/optical derivative layers when present.
- AC5 UI includes layer toggles, legend, source/quality/limitations panels, status filters, and explicit “vùng mẫu, không phải ranh phường” warning.
- AC6 final build waits for builder manifests and reports exact registry/JS/visual QA.

Non-claims:

- No full ward coverage, official boundary, cadastral/legal planning layer, 1 cm orthophoto, airborne LiDAR, survey-grade DTM/DSM, or measured building heights.
