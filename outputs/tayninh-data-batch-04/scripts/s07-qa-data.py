#!/usr/bin/env python3
"""Validate S07-A data manifests."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"
SAMPLE = B04 / "derived" / "s07" / "sample-manifest.json"
MATERIALS = B04 / "derived" / "s07" / "materials" / "manifest.json"
PHOTO = B04 / "sources" / "s07" / "photo-registry.json"
QA = B04 / "derived" / "s07" / "qa.json"
EXPECTED_SOLUTION_SHA256 = "caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3"
EXPECTED_BORDER_ONLY = ["msft_0129", "msft_0152", "msft_0308", "msft_0370", "msft_0631"]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> None:
    errors: list[str] = []
    sample = load(SAMPLE)
    materials = load(MATERIALS)
    photo = load(PHOTO)
    qa = load(QA)

    check(sample["schema"] == "tayninh-s07-sample-manifest/v1", "bad sample schema", errors)
    check(materials["schema"] == "tayninh-s07-materials/v1", "bad materials schema", errors)
    check(photo["schema"] == "tayninh-s07-photo-registry/v1", "bad photo schema", errors)
    check(qa["schema"] == "tayninh-s07-data-qa/v1", "bad QA schema", errors)
    check(sample["source_solution"]["sha256"] == EXPECTED_SOLUTION_SHA256, "wrong S06 input hash", errors)

    roi = sample["roi_250m"]
    check(roi["center_target_id"] == "msft_0615", "ROI center target changed", errors)
    check(roi["bounds_scene_m"] == [803.023355, -903.339734, 1053.023355, -653.339734], "ROI bounds changed", errors)
    check(roi["membership_counts"]["centroid_members"] == 52, "centroid member count changed", errors)
    check(roi["membership_counts"]["footprint_intersections"] == 57, "footprint intersection count changed", errors)
    check(roi["border_only_intersection_ids"] == EXPECTED_BORDER_ONLY, "border-only IDs changed", errors)

    targets = sample["targets"]
    target_ids = sample["target_selection"]["target_ids"]
    check(len(targets) == 20, "target count != 20", errors)
    check(len(set(target_ids)) == 20, "target ids are not unique", errors)
    check(target_ids[0] == "msft_0615", "first target not msft_0615", errors)
    check("msft_0309" in target_ids, "msft_0309 missing", errors)
    check(all(t["photo_record_status"] == "pending_no_verified_free_photo" for t in targets), "some target photo not pending", errors)

    check(photo["summary"]["records"] == 20, "photo record count != 20", errors)
    check(photo["summary"]["verified_usable_photos"] == 0, "unexpected verified usable photos", errors)
    check(photo["summary"]["pending_no_verified_free_photo"] == 20, "pending photo count != 20", errors)
    for record in photo["records"]:
        check(record["candidate_url"] is None, f"{record['target_id']} has candidate_url", errors)
        check(record["rights"] is None, f"{record['target_id']} has rights despite no verified photo", errors)
        check(record["gps_wgs84"] is None, f"{record['target_id']} has GPS despite no verified photo", errors)
        for receipt in record["receipt_paths"]:
            check((ROOT / receipt).exists(), f"missing photo receipt {receipt}", errors)

    active = materials["runtime_selection"]
    check(active["active_map_count"] == 12, "active material map count changed", errors)
    check(active["max_textures_budget"] == 12, "texture budget changed", errors)
    check(active["estimated_gpu_bytes_rgba8_mipmapped"] <= active["budget_bytes"], "active material GPU estimate exceeds budget", errors)
    check("ScatteredLeaves009" in active["optional_not_active_asset_ids"], "leaf litter should stay optional/inactive", errors)
    roles = [(a["role"], a["subtype"], a["active_runtime"]) for a in materials["assets"]]
    check(("foliage_ground_litter", "leaf_litter_ground_only_not_tree_canopy", False) in roles, "leaf litter role/active flag changed", errors)
    for asset in materials["assets"]:
        original = ROOT / asset["original"]["path"]
        check(original.exists(), f"missing original zip {asset['asset_id']}", errors)
        if original.exists():
            check(sha256(original) == asset["original"]["sha256"], f"original zip hash mismatch {asset['asset_id']}", errors)
        check(asset["license"] == "CC0 1.0", f"non-CC0 material {asset['asset_id']}", errors)
        for m in asset["maps"]:
            path = ROOT / m["path"]
            check(path.exists(), f"missing map {m['path']}", errors)
            if path.exists():
                check(sha256(path) == m["sha256"], f"map hash mismatch {m['path']}", errors)
            check(
                m["width"] in (1024, 2048) and m["height"] in (512, 1024, 2048),
                f"unexpected map dimensions {m['path']}",
                errors,
            )
            if m["height"] != m["width"]:
                check(m.get("dimension_note") == "non_square_1k_provider_map", f"non-square map not disclosed {m['path']}", errors)
            check(m["type"] in ("albedo", "normal", "roughness"), f"bad map type {m['path']}", errors)

    check(qa["counts"]["targets"] == 20, "QA target count stale", errors)
    check(qa["sample_manifest_sha256"] == sha256(SAMPLE), "QA sample hash stale", errors)
    check(qa["photo_registry_sha256"] == sha256(PHOTO), "QA photo hash stale", errors)
    check(qa["materials_manifest_sha256"] == sha256(MATERIALS), "QA material hash stale", errors)

    result = {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "sample_manifest_sha256": sha256(SAMPLE),
        "materials_manifest_sha256": sha256(MATERIALS),
        "photo_registry_sha256": sha256(PHOTO),
    }
    print(json.dumps(result, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
