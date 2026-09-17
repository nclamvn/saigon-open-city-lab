"""Build the reviewed HCMC building delta used by the demo.

The script never treats a single scraped source as truth. New footprints must be
absent from the current scene and come from the live OSM change query. Height
corrections require an official HCMGIS point inside the footprint, a compatible
official footprint area, and independent Google Temporal 2023 height support.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import hashlib
import json
import statistics


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[1]
CAMPAIGN = WORKSPACE / "research" / "vibecode-22-building-gap"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    scene_path = ROOT / "data" / "scene.json"
    gap_path = CAMPAIGN / "candidate-registry.json"
    official_path = CAMPAIGN / "hcmgis-highrise-match.json"
    temporal_path = ROOT / "data" / "height-region.json"
    osm_source_path = CAMPAIGN / "osm-delta-source.json"
    hcmgis_snapshot = CAMPAIGN / "snapshots" / "hcmgis-highrise-bbox.geojson"

    scene = json.loads(scene_path.read_text())
    gap = json.loads(gap_path.read_text())
    official = json.loads(official_path.read_text())
    temporal = json.loads(temporal_path.read_text())
    osm_source = json.loads(osm_source_path.read_text())
    google = {row["index"]: row for row in temporal["candidates"]}

    # Re-running after prepare_scene has applied an earlier patch must produce
    # the same manifest. Restore the recorded baseline in memory first.
    previous_path = ROOT / "data" / "building-gap-22.json"
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
    original_quality = {
        row["model_index"]: row["model_quality"]
        for row in official["records"]
        if row.get("model_index") is not None and row.get("model_quality")
    }
    for correction in previous.get("heightCorrections", []):
        index = correction["modelIndex"]
        if index >= len(scene["buildings"]):
            continue
        native = scene["buildings"][index]
        native["h"] = correction["baselineHeightM"]
        native["q"] = correction.get("baselineQuality") or original_quality.get(index, "estimated")

    additions = []
    for row in gap["candidates"]:
        if row["action"] != "ADD_NOW":
            continue
        additions.append(
            {
                "osmId": row["osm_id"],
                "editTime": row["edit_time"],
                "version": row["version"],
                "name": row["name"],
                "building": row["building"],
                "levels": row["levels"],
                "height": row["height"],
                "addressStreet": row["addr_street"],
                "areaM2": row["area_m2"],
                "coverageCurrent": row["coverage_current"],
                "coordinates": row["coordinates"],
            }
        )

    candidates = defaultdict(list)
    for row in official["records"]:
        height = row["official_height_m"]
        model_index = row["model_index"]
        official_area = row["official_area_m2"]
        footprint_area = row["footprint_area_m2"]
        if row["match_method"] != "inside":
            continue
        if not isinstance(height, (int, float)) or not 12 <= height <= 300:
            continue
        if not official_area or not footprint_area:
            continue
        area_ratio = footprint_area / official_area
        if not 0.35 <= area_ratio <= 2.85:
            continue
        if model_index not in google:
            continue
        google_height = google[model_index]["height"]
        tolerance = max(10, min(30, height * 0.32))
        if abs(google_height - height) > tolerance:
            continue
        if row["model_quality"] not in ("estimated", "podium", "levels"):
            continue
        if height <= row["model_height_m"] + 5:
            continue
        candidates[model_index].append(
            {
                **row,
                "google_height_m": google_height,
                "source_delta_m": round(google_height - height, 1),
                "area_ratio": round(area_ratio, 3),
            }
        )

    corrections = []
    for model_index, rows in sorted(candidates.items()):
        heights = [row["official_height_m"] for row in rows]
        if max(heights) - min(heights) > 10:
            continue
        native = scene["buildings"][model_index]
        corrections.append(
            {
                "modelIndex": model_index,
                "modelId": native["id"],
                "gers": native.get("gers"),
                "center": native["center"],
                "baselineHeightM": native["h"],
                "baselineQuality": native["q"],
                "heightM": round(statistics.median(heights), 2),
                "googleHeightM": round(
                    statistics.median(row["google_height_m"] for row in rows), 1
                ),
                "evidence": [
                    {
                        "featureId": row["feature_id"],
                        "name": row["name"],
                        "project": row["project"],
                        "address": row["address"],
                        "officialHeightM": row["official_height_m"],
                        "officialAreaM2": row["official_area_m2"],
                        "areaRatio": row["area_ratio"],
                        "googleHeightM": row["google_height_m"],
                    }
                    for row in rows
                ],
            }
        )

    result = {
        "version": "22a",
        "sourceSnapshotAt": osm_source["retrieved_at"],
        "status": "reviewed public-data delta; not an as-built survey",
        "rules": {
            "footprintAddition": "Live OSM change since the canonical snapshot and <=10% coverage by the current scene.",
            "heightCorrection": "HCMGIS point inside footprint; official/model area ratio 0.35-2.85; Google Temporal 2023 height within max(10m,min(30m,32%)); official height 12-300m; baseline not source-height.",
            "excluded": "Near/far point matches, implausible numbers, planned-only records without temporal height support, and geometry changes with >10% current coverage.",
        },
        "sources": {
            "osm": {
                "url": osm_source["url"],
                "retrievedAt": osm_source["retrieved_at"],
                "snapshotSha256": osm_source["sha256"],
                "license": "ODbL 1.0",
            },
            "hcmgis": {
                "url": "https://hcmgis-geoserver.hcmgis.vn/geoserver/ows",
                "layer": "kinhte_vanhoa_xahoi_hcm:QHXD_NhaCaoTang_point",
                "snapshotSha256": sha256(hcmgis_snapshot),
                "reuseStatus": "Public WFS; reuse terms not found in layer metadata. Internal evaluation pending written permission.",
            },
            "googleTemporal": {
                "dataset": temporal["source"],
                "snapshotSha256": temporal["raster_sha256"],
                "license": "CC BY 4.0",
            },
        },
        "summary": {
            "osmChangesReviewed": gap["report"]["changed_osm_buildings"],
            "alreadyCovered": gap["report"]["classification"]["ALREADY_COVERED"],
            "geometryReviewQueue": gap["report"]["classification"]["REVIEW_GEOMETRY"],
            "footprintsAdded": len(additions),
            "heightCorrections": len(corrections),
        },
        "additions": additions,
        "heightCorrections": corrections,
    }
    out = ROOT / "data" / "building-gap-22.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    (ROOT / "data" / "building-gap-22.js").write_text(
        "window.BUILDING_GAP_22=" + json.dumps(result, ensure_ascii=False) + ";"
    )
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
