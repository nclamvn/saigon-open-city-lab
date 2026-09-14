#!/usr/bin/env python3
"""Validate Batch04 fusion scene data and QA."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
B04 = ROOT / "outputs" / "tayninh-data-batch-04"
OUTPUTS = ROOT / "outputs"
SCENE = B04 / "derived" / "fusion" / "scene-data.json"
QA = B04 / "derived" / "fusion" / "fusion-qa.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_source(path_text: str) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return OUTPUTS / path


def main() -> None:
    errors: list[str] = []
    scene = json.loads(SCENE.read_text(encoding="utf-8"))
    qa = json.loads(QA.read_text(encoding="utf-8"))

    required = {
        "schema",
        "generated_at",
        "aoi",
        "sources",
        "disclosure",
        "terrain",
        "buildings",
        "roads",
        "osm_water",
        "canopy_samples",
        "jrc_water_cells",
        "statistics",
    }
    missing = sorted(required - set(scene))
    if missing:
        errors.append(f"scene missing keys: {missing}")

    if sha256(SCENE) != qa["scene_data"]["sha256"]:
        errors.append("scene-data sha does not match QA")

    for source in scene.get("sources", []):
        path = resolve_source(source["path"])
        if not path.exists():
            errors.append(f"source missing: {source['path']}")
        elif sha256(path) != source["sha256"]:
            errors.append(f"source hash mismatch: {source['path']}")

    terrain = scene["terrain"]
    if len(terrain["heights_m"]) != terrain["rows"]:
        errors.append("terrain row count mismatch")
    if any(len(row) != terrain["cols"] for row in terrain["heights_m"]):
        errors.append("terrain col count mismatch")
    if len(terrain["surface_rgb"]) != terrain["rows"]:
        errors.append("surface_rgb row count mismatch")
    if any(len(row) != terrain["cols"] for row in terrain["surface_rgb"]):
        errors.append("surface_rgb col count mismatch")

    if len(scene["buildings"]) != qa["counts"]["buildings"]:
        errors.append("building count mismatch")
    if any(building["height_method"] != "area_class_proxy_no_source_height" for building in scene["buildings"]):
        errors.append("building height method overclaim")
    if any(building.get("source_height_m") is not None or building.get("measured_height") for building in scene["buildings"]):
        errors.append("building measured-height claim present")
    if any(not building.get("centroid_in_bbox") for building in scene["buildings"]):
        errors.append("building centroid bbox gate failed")
    if any(not building.get("centroid_in_footprint") for building in scene["buildings"]):
        errors.append("building centroid footprint gate failed")
    centroid_stats = qa["buildings"].get("legacy_centroid_error_distance", {})
    if centroid_stats.get("count") != len(scene["buildings"]):
        errors.append("centroid error gate did not run across all buildings")
    if qa["buildings"].get("centroid_bbox_failures") != 0:
        errors.append("QA centroid bbox failures nonzero")
    if qa["buildings"].get("centroid_within_footprint_failures") != 0:
        errors.append("QA centroid footprint failures nonzero")

    if len(scene["canopy_samples"]) != qa["counts"]["canopy_samples"]:
        errors.append("canopy sample count mismatch")
    if any(sample["label"] != "raster_sample_not_individual_tree" for sample in scene["canopy_samples"]):
        errors.append("canopy individual-tree overclaim")

    if len(scene["jrc_water_cells"]) != qa["counts"]["jrc_water_cells"]:
        errors.append("JRC water count mismatch")
    if len(scene["jrc_water_cells"]) != qa["jrc_water"]["source_occurrence_water_pixels_1_to_100"]:
        errors.append("not all nonzero JRC occurrence cells retained")

    acceptance = qa["acceptance"]
    for key, value in acceptance.items():
        if value is not True:
            errors.append(f"acceptance failed: {key}")

    print(
        json.dumps(
            {
                "scene_sha256": sha256(SCENE),
                "qa_sha256": sha256(QA),
                "sources": len(scene["sources"]),
                "counts": qa["counts"],
                "errors": errors,
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
