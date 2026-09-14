# AUDIT-S06-ADAPTER

Auditor: `/root/data_workbench`  
Closure audit timestamp: 2026-09-14  
Scope: bounded read-only closure audit for S06 adapter. This audit wrote only this file. It did not edit engine, data payload, raw evidence, renderer module, source reports, or browser state.

## Files read

- `outputs/tayninh-data-batch-04/governance/BLUEPRINT-SOLUTION-06.md`
- `outputs/tayninh-data-batch-04/DATA-CONTRACT-S06.md`
- `outputs/tayninh-data-batch-04/scripts/prepare_solution_layers.py`
- `outputs/tayninh-data-batch-04/scripts/test_solution_layers.py`
- `outputs/tayninh-data-batch-04/derived/solution/solution-data.json`
- `outputs/tayninh-data-batch-04/derived/solution/solution-qa.json`
- `outputs/tayninh-data-batch-04/derived/fusion/scene-data.json`
- `outputs/tayninh-data-batch-04/static/app.js`
- `outputs/tayninh-data-batch-04/static/solution-layer.js`
- `outputs/tayninh-data-batch-04/static/solution-ui.js`
- `outputs/tayninh-data-batch-04/governance/COMPLETION-S06-DATA.md`
- `outputs/tayninh-data-batch-04/governance/COMPLETION-S06-UX.md`

## Current hashes

| File | sha256 |
|---|---|
| `DATA-CONTRACT-S06.md` | `3415bfdb1920cf0bb078401898232b867e2e41894f3b708d60496998f0b6effa` |
| `scripts/prepare_solution_layers.py` | `b41e397bc7ca52a802c8510c25f00ccf74ca3c5cac944909523522f9ee6363bc` |
| `scripts/test_solution_layers.py` | `bb2a90e934d1a0a5dc281c0a8cec3551628de87868a5f64a861569708f0ae3f8` |
| `derived/solution/solution-data.json` | `caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3` |
| `derived/solution/solution-qa.json` | `952e2de5f90a49c67b9f934a0038db7661ab8b0c99b5ed4fc45304a9a1f25b3a` |
| `static/app.js` | `7a24fe8b1c746cc01bd64c758940872a7ab943a0e259ec035c2edbc1273792ca` |
| `static/solution-layer.js` | `b1ffc0a2e7ab343a0a72fb809e2c38b004a6aa0d418231445d1491b42f2d36ef` |
| `static/solution-ui.js` | `9dc9e1d683766f64a67e12d4a357129a18a3a793a68ba02dc771324907d9dd09` |
| `governance/COMPLETION-S06-DATA.md` | `36e6852dc3bf87cf1eb6decc11a6c301df2aa9e37e10bf30b643f8c21ebbcbe8` |
| `governance/COMPLETION-S06-UX.md` | `85ce89d3585d25050ae2fd2befd4a17f5b9d4f5dad6b636ddd3d62a20acbf3cc` |

## Commands run

```bash
python3 outputs/tayninh-data-batch-04/scripts/test_solution_layers.py
node --check outputs/tayninh-data-batch-04/static/app.js
node <in-memory fixture audit for B04SolutionLayers.admitSolution and acceptedGoogle>
```

Validator result:

```json
{
  "status": "PASS",
  "errors": [],
  "solution_data_sha256": "caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3",
  "negative_bites": {
    "corrupt_source_hash": "PASS",
    "missing_immutable_input": "PASS",
    "malformed_template_missing_field": "PASS",
    "malformed_template_available_true": "PASS"
  }
}
```

## Closure status

No new critical defect was found in the bounded closure scope.

The earlier audit findings were re-tested against current code and are closed in the current snapshot:

- Runtime no longer admits Google heights by `height > 0`; `app.js` calls `world.layers.acceptedGoogle(model)`.
- `solution-layer.js` exports pure `B04SolutionLayers.acceptedGoogle(model)` and `B04SolutionLayers.admitSolution(s, baseline)`.
- Admission is pure and runs before runtime state mutation.
- Browser admission now checks schema, source fingerprint shape, frame center, expected transform, terrain grids, nodata/coverage consistency, building count/IDs, source/measured flags, Google support semantics, summary counts, and future adapter templates.
- Future adapter has 5 null-safe templates and remains `available:false`, `contract_only:true`.
- Source drawer now includes a collapsed S06 technical section with terrain metadata, Google provenance, future adapter contract, and all 9 `source_fingerprints` with sha256 values. Browser still discloses that hash verification is build-time, not browser runtime hashing.
- Invalid supplement fallback now fails closed to `gedtm:false`, `google:false`, `copdem/proxy`, records `admitted:false`, and applies canonical fallback coefficients from the original AOI center. The fallback still correctly states it uses rounded scene geometry and not direct raw polygons.

## Pure-function fixture audit

The fixture loaded current `solution-data.json`, current `scene-data.json`, and current `static/solution-layer.js` in Node without mutating raw/product files.

Current-data positive check:

```json
{
  "version": "s06.2",
  "buildings": 657,
  "accepted": 482,
  "proxy": 175,
  "available": {
    "gedtm": true,
    "google": true
  },
  "future_templates": 5
}
```

Failure fixtures all failed loud as expected:

| Fixture | Result |
|---|---|
| Missing `height_support` | FAIL loud: explicit height support invalid |
| Low support ratio `< 0.25` | FAIL loud: height admission inconsistent |
| Wrong support ratio | FAIL loud: height support counts invalid |
| Empty `frame.aoi_center_wgs84` | FAIL loud: frame incompatible |
| Wrong canonical transform | FAIL loud: canonical transform differs from source frame |
| Surveyed/measured flag injected into model record | FAIL loud: observed/modelled flags |
| Ragged GEDTM grid | FAIL loud: GEDTM grid shape invalid |
| `validity=false` with finite height still present | FAIL loud: GEDTM nodata/value inconsistent |
| Wrong coverage counts | FAIL loud: GEDTM coverage inconsistent |
| Wrong threshold presence | FAIL loud: height support counts invalid |
| Count ordering invalid | FAIL loud: height support counts invalid |
| Accepted model height above 30 m | FAIL loud: height admission inconsistent |
| Proxy fallback height at 60 m | FAIL loud: fallback height invalid |
| Future template missing required field | FAIL loud: future adapter must remain contract-only |
| Future template marked available | FAIL loud: future adapter must remain contract-only |

Template check:

```json
{
  "template_count": 5,
  "templates": [
    "rgb_orthomosaic",
    "lidar_point_cloud",
    "sfm_photogrammetry_mesh",
    "surveyed_dtm",
    "modelled_external_raster"
  ],
  "all_available_false": true,
  "all_required_fields_present": true
}
```

## Non-findings / cleared checks

- No evidence that S06 mutates raw/source C05 or Batch04 artifacts at runtime.
- No evidence that GEDTM is presented as surveyed terrain; current metadata marks it as modelled/testing terrain input.
- No evidence that Google model height is presented as measured height in current data; final payload keeps `measured_height=false` and `source_height_m=null` for all 657 buildings.
- No current source fingerprint mismatch in `solution-data.json`.
- No current semantic mismatch in the 482 accepted / 175 proxy building split.
- No syntax error in current `static/app.js`.

## Residual notes for Root browser/runtime QA

These are not product defects found by this audit; they are the remaining scope boundaries:

- Browser does not recompute sha256 hashes. It correctly labels hash verification as build-time.
- This audit did not open a browser and did not test WebGL rendering, UI interaction, or memory behavior. Root owns actual browser/runtime verification.
- Fallback geometry remains a degraded mode by design because raw canonical source polygons live in the admitted supplement. The degraded warning and diagnostics should remain visible.
