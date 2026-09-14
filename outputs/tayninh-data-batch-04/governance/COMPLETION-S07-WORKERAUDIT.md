# COMPLETION-S07-WORKERAUDIT

Status: PASS

This bounded follow-up created QA-only worker/chunk audit artifacts. It did not edit product worker/chunk/importer/app/UI/surface code and did not rebuild or alter frozen S07 data manifests or B material receipts.

## Files

| Path | Role | sha256 |
|---|---|---|
| `scripts/s07-data-worker-audit.cjs` | QA-only VM worker/chunk/app admission audit | `103b705d22440a8f9aac897b9b479c49fd2c6a7cd07af5c8a18c87c38a3f4888` |
| `scripts/s07-a-qa/worker-audit.json` | persistent worker audit receipt | `dbc74486f724d251769e3b3378af484a3eedcad207dd7dfe97074a3023ce2b9b` |

Product code under audit:

- `static/s07-worker.js`: `6d680bcc7ea6b8eb1553cb9e0c4a7a18df0975aef5eedf5114a27c716412465a`
- `static/s07-chunks.js`: `8ae4d3052793224c375f8ba685e3c3bdee25c9ecfe34407e584aa0cc7d393581`
- `static/s07-importer.js`: `675c4c03acd81011fcb1f34b2759f16fd9f5c2f6440caba8ea79e7c39d79df4e`
- `static/app.js`: `6d7d6f5f0331cde67e268cced2afedd66a1569b1cda7e725351c49f964c1ac97`

## Scope

The audit exercises:

- actual `s07-worker.js` in a VM worker-like context with `importScripts("s07-importer.js")`;
- actual `B04S07Chunks.createRuntime` with a controlled Worker adapter for success, delay, stale, boot-error and timeout paths;
- current `static/app.js` coarse/fine visibility predicate as a static integration guard.

It is Node/VM QA evidence, not browser/GPU evidence.

## Results

Total cases: `10`

- passed: `10`
- failed: `0`
- failed P0: `0`
- failed P1: `0`

Cases:

| Case | Severity | Result |
|---|---|---|
| `worker_partition_centroid_ownership_query_neighbors` | P0 | PASS |
| `runtime_worker_success_request_generation_timings` | P0 | PASS |
| `runtime_no_fine_geometry_for_far_view` | P1 | PASS |
| `runtime_disabled_quality_near_gate_hides_cached_fine` | P1 | PASS |
| `runtime_max4_cache_eviction_and_disposals` | P0 | PASS |
| `runtime_out_of_order_stale_generation_newest_only` | P0 | PASS |
| `runtime_worker_boot_error_fallback` | P1 | PASS |
| `runtime_worker_timeout_fallback` | P1 | PASS |
| `runtime_final_dispose_terminates_worker_and_objects` | P0 | PASS |
| `app_static_effective_active_predicate_guard` | P1 | PASS |

Numeric highlights:

- Direct worker partition keeps centroid ownership unique and puts a border-only footprint in `queryFeatureIds`, not owned `featureIds`.
- Runtime success path records `requestId:1`, `generation:1`, worker use and completed job accounting.
- Far view creates `0` fine entries and cache size remains `0`.
- Disabled near view creates `0` fine entries before init and after init; enabled near view creates `c0_0`; disabling again clears `active` and hides the cached fine object.
- Synthetic `>4` cells are bounded to max cache size `4`, with disposals recorded.
- Out-of-order generation test rejects the stale first init and keeps generation `2`.
- Boot-error and timeout paths enter fallback with recorded errors.
- Final dispose terminates the worker and disposes cached objects.
- App static guard confirms coarse chunks ignore `snapshot.active` unless fine detail is actually enabled for overview/buildings mode.

## Command

```bash
S07_WORKER_AUDIT_GENERATED_AT=2026-09-14T09:40:00.000Z node outputs/tayninh-data-batch-04/scripts/s07-data-worker-audit.cjs
```

Current result:

```json
{
  "status": "PASS",
  "counts": {
    "total": 10,
    "passed": 10,
    "failed": 0,
    "failed_p0": 0,
    "failed_p1": 0
  },
  "open_findings": []
}
```

The receipt is byte-stable when replayed with `S07_WORKER_AUDIT_GENERATED_AT=2026-09-14T09:40:00.000Z`.

## Limits

- This audit does not prove real browser Worker availability; Root browser QA covers that separately.
- It does not render or inspect GPU resources.
- It does not change C budgets or B material hashes. S07-A hashes remain `sample=1cc8dd274ee6ea5699c3c1d0b3bd4fa7847f442061b6913ca2e29e5849c3ff4f`, `materials=22f4a39d44665a174f60af6c691a7d1203688dafe7fb42afb9eb386f8f35bed9`.
