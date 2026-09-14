# TIP DATA WORKBENCH - Batch 01

Builder: data_workbench replacing leadership_ui. Contractor: /root. Date: 2026-09-14.

Scope: build deterministic intake, registry validation, adversarial gate tests, and an inspectable static workbench for Gia Loc / Tay Ninh Batch 01. Own only scripts, registry, index/static, and this governance note. No HCMC app edits.

Contract accepted: source records must expose publisher, title, url, status, snapshot plus hash, local file plus hash for acquired records, license, data date, captured_at, CRS, vertical datum, resolution, extent, evidence span, requirement mapping, and limitations. Unknowns remain null.

Acceptance criteria:

- AC1 registry build reads `sources/local-records.json` and `sources/global-records.json` when present, while allowing an empty honest-missing state before other builders finish.
- AC2 fixture mode proves acquired and candidate records can pass with verified hashes and evidence spans.
- AC3 failure tests prove wrong hash, missing snapshot, acquired without local file, scope mismatch, and missing evidence all fail.
- AC4 workbench shows acquired/candidate/blocked/missing, filters by status, and exposes rights, limits, validation, and requirement coverage.
- AC5 output never claims full ward coverage or measured payload readiness from fixture data.
