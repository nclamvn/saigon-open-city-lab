#!/usr/bin/env python3
"""Validate S06 solution data supplement."""

from __future__ import annotations

import hashlib
import json
import math
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"
DATA = B04 / "derived" / "solution" / "solution-data.json"
QA = B04 / "derived" / "solution" / "solution-qa.json"
ADAPTER_REQUIRED_FIELDS = [
    "kind",
    "units",
    "crs",
    "vertical_datum",
    "date",
    "resolution",
    "bounds",
    "nodata",
    "rights",
    "sourcehash",
    "quality",
    "coverage",
]
ADAPTER_TEMPLATE_IDS = [
    "rgb_orthomosaic",
    "lidar_point_cloud",
    "sfm_photogrammetry_mesh",
    "surveyed_dtm",
    "modelled_external_raster",
]


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


def collect_source_fingerprint_errors(fingerprints: dict[str, str]) -> list[str]:
    errors: list[str] = []
    for path_text, expected in fingerprints.items():
        path = ROOT / path_text
        check(path.exists(), f"missing source fingerprint path {path_text}", errors)
        if path.exists():
            check(sha256(path) == expected, f"source fingerprint mismatch {path_text}", errors)
    return errors


def collect_future_adapter_errors(adapter: dict) -> list[str]:
    errors: list[str] = []
    check(adapter.get("schema") == "s06-future-source-adapter/v1", "bad future adapter schema", errors)
    check(adapter.get("contract_only") is True, "future adapter is not contract_only", errors)
    check(adapter.get("available") is False, "future adapter unexpectedly available", errors)
    check(adapter.get("accepted_record_fields") == ADAPTER_REQUIRED_FIELDS, "future adapter required field list changed", errors)
    templates = adapter.get("templates")
    check(isinstance(templates, list), "future adapter templates missing", errors)
    if not isinstance(templates, list):
        return errors
    ids = [t.get("id") for t in templates if isinstance(t, dict)]
    check(ids == ADAPTER_TEMPLATE_IDS, "future adapter template ids/order changed", errors)
    for template in templates:
        if not isinstance(template, dict):
            errors.append("future adapter template is not an object")
            continue
        tid = template.get("id", "<missing-id>")
        check(template.get("available") is False, f"{tid} template unexpectedly available", errors)
        check(template.get("contract_only") is True, f"{tid} template is not contract_only", errors)
        check(template.get("required_before_use") == ADAPTER_REQUIRED_FIELDS, f"{tid} required_before_use changed", errors)
        policy = template.get("render_policy")
        check(isinstance(policy, dict), f"{tid} render_policy missing", errors)
        if isinstance(policy, dict):
            check(policy.get("status") == "disabled_until_source_record_complete", f"{tid} render_policy status changed", errors)
            check(policy.get("must_verify_sourcehash") is True, f"{tid} sourcehash gate missing", errors)
            check(policy.get("must_verify_spatial_registration") is True, f"{tid} spatial gate missing", errors)
            check(policy.get("must_verify_license_or_rights") is True, f"{tid} rights gate missing", errors)
            check(policy.get("must_label_modelled_vs_surveyed") is True, f"{tid} model/survey label gate missing", errors)
        for field in ADAPTER_REQUIRED_FIELDS:
            check(field in template, f"{tid} missing required placeholder {field}", errors)
            check(template.get(field) is None, f"{tid} placeholder {field} must stay null until source exists", errors)
    return errors


def run_negative_bites(data: dict) -> dict[str, str]:
    bites: dict[str, str] = {}

    corrupt = deepcopy(data)
    first_path = next(iter(corrupt["source_fingerprints"]))
    corrupt["source_fingerprints"][first_path] = "0" * 64
    corrupt_errors = collect_source_fingerprint_errors(corrupt["source_fingerprints"])
    check(any("source fingerprint mismatch" in e for e in corrupt_errors), "corrupt source hash bite did not fail", [])
    if not any("source fingerprint mismatch" in e for e in corrupt_errors):
        raise AssertionError("corrupt source hash bite did not fail")
    bites["corrupt_source_hash"] = "PASS"

    missing = deepcopy(data)
    missing["source_fingerprints"]["outputs/tayninh-data-batch-04/derived/solution/__missing_immutable_input__.json"] = "0" * 64
    missing_errors = collect_source_fingerprint_errors(missing["source_fingerprints"])
    if not any("missing source fingerprint path" in e for e in missing_errors):
        raise AssertionError("missing immutable input bite did not fail")
    bites["missing_immutable_input"] = "PASS"

    malformed = deepcopy(data)
    del malformed["future_data_adapter"]["templates"][0]["sourcehash"]
    malformed_errors = collect_future_adapter_errors(malformed["future_data_adapter"])
    if not any("missing required placeholder sourcehash" in e for e in malformed_errors):
        raise AssertionError("malformed template bite did not fail")
    bites["malformed_template_missing_field"] = "PASS"

    available = deepcopy(data)
    available["future_data_adapter"]["templates"][1]["available"] = True
    available_errors = collect_future_adapter_errors(available["future_data_adapter"])
    if not any("unexpectedly available" in e for e in available_errors):
        raise AssertionError("available pending template bite did not fail")
    bites["malformed_template_available_true"] = "PASS"

    return bites


def main() -> None:
    errors: list[str] = []
    data = load(DATA)
    qa = load(QA)

    check(data["schema"] == "tayninh-s06-solution-data/v1", "bad data schema", errors)
    check(qa["schema"] == "tayninh-s06-solution-qa/v1", "bad QA schema", errors)
    check(qa["status"] == "PASS", "QA status not PASS", errors)
    check(qa["solution_data"]["sha256"] == sha256(DATA), "QA solution-data hash stale", errors)

    check(data["frame"]["terrain_rows"] == 109, "terrain rows != 109", errors)
    check(data["frame"]["terrain_cols"] == 109, "terrain cols != 109", errors)
    for key in ["copdem", "gedtm"]:
        profile = data["terrain_profiles"][key]
        check(profile["rows"] == 109 and profile["cols"] == 109, f"{key} dimensions mismatch", errors)
        check(len(profile["heights_m"]) == 109, f"{key} height row count mismatch", errors)
        check(all(len(row) == 109 for row in profile["heights_m"]), f"{key} height col count mismatch", errors)
        check(len(profile["validity"]) == 109, f"{key} validity row count mismatch", errors)
        check(all(len(row) == 109 for row in profile["validity"]), f"{key} validity col count mismatch", errors)

    gedtm = data["terrain_profiles"]["gedtm"]
    check(gedtm["coverage"]["valid_nodes"] == 11881, "GEDTM valid node count changed", errors)
    check(gedtm["coverage"]["missing_nodes"] == 0, "GEDTM missing node count changed", errors)
    check(gedtm["coverage"]["complete"] is True, "GEDTM unexpectedly incomplete", errors)
    check(gedtm["coverage"]["edge_fallback_nodes"] == 217, "GEDTM edge fallback count changed", errors)

    transform = data["coordinate_transform"]
    check(transform["legacy_to_canonical"]["x_scale"] == 0.99987688691, "legacy->canonical x scale changed", errors)
    check(transform["legacy_to_canonical"]["z_scale"] == 1.006364994037, "legacy->canonical z scale changed", errors)
    check(len(transform["qa_samples"]) >= 3, "coordinate transform QA samples missing", errors)
    check(
        all(max(abs(v) for v in s["roundtrip_error_degrees"]) <= 1e-12 for s in transform["qa_samples"]),
        "legacy/canonical QA roundtrip error too large",
        errors,
    )

    buildings = data["buildings"]
    check(data["building_supplements"] == data["buildings"], "building_supplements and buildings alias diverged", errors)
    check(len(buildings) == 657, "building supplement count != 657", errors)
    check(len(data["building_height_by_id"]) == 657, "building lookup count != 657", errors)
    ids = [b["id"] for b in buildings]
    check(len(set(ids)) == 657, "building ids not unique", errors)
    check(all(b["source_height_m"] is None for b in buildings), "some source_height_m is not null", errors)
    check(all(b["measured_height"] is False for b in buildings), "some measured_height is not false", errors)
    accepted = [b for b in buildings if b["height_support"]["accepted"]]
    proxy = [b for b in buildings if not b["height_support"]["accepted"]]
    check(len(accepted) + len(proxy) == 657, "accepted/proxy counts do not sum to 657", errors)
    check(len(accepted) > 0, "no accepted Google model heights", errors)
    check(len(proxy) > 0, "no proxy fallback heights", errors)
    check(all(b["model_height_m"] is not None for b in accepted), "accepted building missing model height", errors)
    check(all(b["model_height_m"] is None for b in proxy), "proxy building has model height", errors)
    check(all(0 < b["display_height_m"] < 60 for b in buildings), "display height out of range", errors)
    check(all("footprint_scene_m" in b and "centroid_scene_m" in b for b in buildings), "canonical building geometry missing", errors)
    check(all("raw_polygon_wgs84" in b for b in buildings), "raw WGS84 building polygon missing", errors)

    check(len(qa["terrain_samples"]) == 3, "expected 3 terrain QA samples", errors)
    check(len(qa["building_samples"]) == 5, "expected 5 building QA samples", errors)
    check(all("utm_polygon_epsg32648" in s for s in qa["building_samples"]), "building QA samples missing UTM polygon", errors)
    check(all("canonical_footprint_scene_m" in s for s in qa["building_samples"]), "building QA samples missing canonical footprint", errors)
    check(all("sample_pixel_rows_cols" in s for s in qa["building_samples"]), "building QA samples missing pixel rows/cols", errors)
    check(
        qa["building_samples"][0]["raw_polygon_lonlat"][0] == [106.35447029702, 11.0870743542],
        "first QA building sample does not use raw B02 GeoJSON coordinates",
        errors,
    )
    first_canonical = qa["building_samples"][0]["canonical_footprint_scene_m"][0]
    lon, lat = qa["building_samples"][0]["raw_polygon_lonlat"][0]
    lon0, lat0 = data["frame"]["aoi_center_wgs84"]
    radius = 6378137.0
    expected_x = math.radians(lon - lon0) * radius * math.cos(math.radians(lat0))
    expected_z = math.radians(lat - lat0) * radius
    check(abs(first_canonical["x"] - expected_x) < 1e-6, "canonical building x does not match raw WGS84", errors)
    check(abs(first_canonical["z"] - expected_z) < 1e-6, "canonical building z does not match raw WGS84", errors)
    check(len(qa["raw_wgs84_canonical_roundtrip_samples"]) == 5, "expected 5 raw WGS84 roundtrip samples", errors)
    check(
        all(max(abs(v) for v in s["roundtrip_error_degrees"]) <= 1e-12 for s in qa["raw_wgs84_canonical_roundtrip_samples"]),
        "raw WGS84 canonical roundtrip error too large",
        errors,
    )

    errors.extend(collect_source_fingerprint_errors(data["source_fingerprints"]))
    errors.extend(collect_future_adapter_errors(data["future_data_adapter"]))
    negative_bites = run_negative_bites(data)

    print(
        json.dumps(
            {
                "status": "PASS" if not errors else "FAIL",
                "errors": errors,
                "solution_data_sha256": sha256(DATA),
                "negative_bites": negative_bites,
            },
            indent=2,
        )
    )
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
