#!/usr/bin/env python3
"""Prepare S07-A data manifests from local S06 solution and acquired assets."""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import zipfile
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"
SOLUTION = B04 / "derived" / "solution" / "solution-data.json"
OUT = B04 / "derived" / "s07"
SOURCES = B04 / "sources" / "s07"
MATERIAL_ORIGINAL = OUT / "materials" / "original"
MATERIAL_MAPS = OUT / "materials" / "maps"
EVIDENCE = SOURCES / "evidence"
GENERATED_AT = "2026-09-14T09:08:41Z"

AOI_CENTER = [106.3426338, 11.0980401]
EARTH_RADIUS_M = 6378137.0
ROI_CENTER_ID = "msft_0615"
REQUIRED_TARGET_ID = "msft_0309"
ROI_SIZE_M = 250.0
TARGET_COUNT = 20

EXPECTED_SOLUTION_SHA256 = "caeb26c240090d7d18b864fc67805ae63859988670df78dd019391690e1fd6d3"

MATERIALS = [
    {
        "asset_id": "RoofingTiles013A",
        "role": "roof",
        "subtype": "roof_tiles",
        "title": "Roofing Tiles 013 A",
        "zip": "RoofingTiles013A_1K-JPG.zip",
        "source_search_receipt": "ambientcg-roof-search.json",
        "source_url": "https://ambientcg.com/a/RoofingTiles013A",
        "download_url": "https://ambientcg.com/get?file=RoofingTiles013A_1K-JPG.zip",
        "provider_dimensions_cm": [290, 290],
        "physical_size_m": [2.9, 2.9],
        "scale_basis": "provider_dimensions_cm",
        "active_runtime": True,
    },
    {
        "asset_id": "Plaster001",
        "role": "wall",
        "subtype": "light_plaster_primary",
        "title": "Plaster 001",
        "zip": "Plaster001_1K-JPG.zip",
        "source_search_receipt": "ambientcg-wall-search.json",
        "source_url": "https://ambientcg.com/a/Plaster001",
        "download_url": "https://ambientcg.com/get?file=Plaster001_1K-JPG.zip",
        "asset_receipt": "ambientcg-plaster001-asset.json",
        "provider_dimensions_cm": [0, 0],
        "physical_size_m": None,
        "scale_basis": "modeled_display_tiling_provider_physical_extent_not_published",
        "active_runtime": True,
    },
    {
        "asset_id": "Bricks104",
        "role": "wall",
        "subtype": "exposed_brick_sparse_variant",
        "title": "Bricks 104",
        "zip": "Bricks104_1K-JPG.zip",
        "source_search_receipt": "ambientcg-wall-search.json",
        "source_url": "https://ambientcg.com/a/Bricks104",
        "download_url": "https://ambientcg.com/get?file=Bricks104_1K-JPG.zip",
        "provider_dimensions_cm": [0, 0],
        "physical_size_m": None,
        "scale_basis": "modeled_display_tiling_provider_physical_extent_not_published",
        "active_runtime": True,
    },
    {
        "asset_id": "Asphalt033",
        "role": "road",
        "subtype": "unmarked_asphalt",
        "title": "Asphalt 033",
        "zip": "Asphalt033_1K-JPG.zip",
        "source_search_receipt": "ambientcg-road-search.json",
        "source_url": "https://ambientcg.com/a/Asphalt033",
        "download_url": "https://ambientcg.com/get?file=Asphalt033_1K-JPG.zip",
        "provider_dimensions_cm": [250, 250],
        "physical_size_m": [2.5, 2.5],
        "scale_basis": "provider_dimensions_cm",
        "active_runtime": True,
    },
    {
        "asset_id": "ScatteredLeaves009",
        "role": "foliage_ground_litter",
        "subtype": "leaf_litter_ground_only_not_tree_canopy",
        "title": "Scattered Leaves 009",
        "zip": "ScatteredLeaves009_1K-JPG.zip",
        "source_search_receipt": "ambientcg-foliage-search.json",
        "source_url": "https://ambientcg.com/a/ScatteredLeaves009",
        "download_url": "https://ambientcg.com/get?file=ScatteredLeaves009_1K-JPG.zip",
        "provider_dimensions_cm": [170, 170],
        "physical_size_m": [1.7, 1.7],
        "scale_basis": "provider_dimensions_cm",
        "active_runtime": False,
    },
]

MAP_SUFFIXES = {
    "albedo": "_Color.jpg",
    "normal": "_NormalGL.jpg",
    "roughness": "_Roughness.jpg",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def canonical_to_wgs84(x: float, z: float) -> list[float]:
    lon0, lat0 = AOI_CENTER
    lon = lon0 + math.degrees(x / (EARTH_RADIUS_M * math.cos(math.radians(lat0))))
    lat = lat0 + math.degrees(z / EARTH_RADIUS_M)
    return [round(lon, 12), round(lat, 12)]


def bbox_from_points(points: list[dict[str, float]]) -> list[float]:
    xs = [float(p["x"]) for p in points]
    zs = [float(p["z"]) for p in points]
    return [round(min(xs), 6), round(min(zs), 6), round(max(xs), 6), round(max(zs), 6)]


def intersects_bbox(a: list[float], b: list[float]) -> bool:
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])


def prepare_materials() -> dict[str, Any]:
    MATERIAL_MAPS.mkdir(parents=True, exist_ok=True)
    assets = []
    for spec in MATERIALS:
        zip_path = MATERIAL_ORIGINAL / spec["zip"]
        require(zip_path.exists(), f"missing material zip {zip_path}")
        original = {
            "path": rel(zip_path),
            "sha256": sha256(zip_path),
            "bytes": zip_path.stat().st_size,
        }
        maps = []
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
            for map_type, suffix in MAP_SUFFIXES.items():
                candidates = [name for name in names if name.endswith(suffix)]
                require(len(candidates) == 1, f"{spec['asset_id']} expected one {map_type} map")
                src_name = candidates[0]
                out_name = f"{spec['asset_id']}_{map_type}.jpg"
                out_path = MATERIAL_MAPS / out_name
                with zf.open(src_name) as src, out_path.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                with Image.open(out_path) as img:
                    width, height = img.size
                    mime = Image.MIME.get(img.format, "image/jpeg")
                maps.append(
                    {
                        "type": map_type,
                        "path": rel(out_path),
                        "source_member": src_name,
                        "sha256": sha256(out_path),
                        "width": width,
                        "height": height,
                        "dimension_note": "square_1k_provider_map" if width == height else "non_square_1k_provider_map",
                        "bytes": out_path.stat().st_size,
                        "mime": mime,
                        "color_space": "srgb" if map_type == "albedo" else "linear",
                    }
                )
        active_map_count = len(maps) if spec["active_runtime"] else 0
        assets.append(
            {
                "asset_id": spec["asset_id"],
                "role": spec["role"],
                "subtype": spec["subtype"],
                "title": spec["title"],
                "provider": "ambientCG",
                "license": "CC0 1.0",
                "license_url": "https://docs.ambientcg.com/license/",
                "source_url": spec["source_url"],
                "download_url": spec["download_url"],
                "source_search_receipt": rel(EVIDENCE / spec["source_search_receipt"]),
                "asset_receipt": rel(EVIDENCE / spec.get("asset_receipt", spec["source_search_receipt"])),
                "original": original,
                "maps": maps,
                "resolution_label": "1K-JPG",
                "provider_dimensions_cm": spec["provider_dimensions_cm"],
                "physical_size_m": spec["physical_size_m"],
                "scale_basis": spec["scale_basis"],
                "active_runtime": spec["active_runtime"],
                "estimated_gpu_bytes_rgba8_mipmapped": int(active_map_count * maps[0]["width"] * maps[0]["height"] * 4 * 4 / 3),
            }
        )
    active_assets = [a["asset_id"] for a in assets if a["active_runtime"]]
    active_maps = [m for a in assets if a["active_runtime"] for m in a["maps"]]
    manifest = {
        "schema": "tayninh-s07-materials/v1",
        "generated_at": GENERATED_AT,
        "provider": "ambientCG",
        "license": "CC0 1.0",
        "license_url": "https://docs.ambientcg.com/license/",
        "api_docs_receipt": rel(EVIDENCE / "ambientcg-api.html"),
        "license_receipt": rel(EVIDENCE / "ambientcg-license.html"),
        "runtime_selection": {
            "active_asset_ids": active_assets,
            "active_map_count": len(active_maps),
            "max_textures_budget": 12,
            "estimated_gpu_bytes_rgba8_mipmapped": int(sum(a["estimated_gpu_bytes_rgba8_mipmapped"] for a in assets)),
            "budget_bytes": 64 * 1024 * 1024,
            "optional_not_active_asset_ids": [a["asset_id"] for a in assets if not a["active_runtime"]],
        },
        "assets": assets,
    }
    write_json(OUT / "materials" / "manifest.json", manifest)
    return manifest


def prepare_scene_and_photos(material_manifest: dict[str, Any]) -> dict[str, Any]:
    require(sha256(SOLUTION) == EXPECTED_SOLUTION_SHA256, "S06 solution hash mismatch")
    solution = json.loads(SOLUTION.read_text(encoding="utf-8"))
    buildings = solution["buildings"]
    by_id = {b["id"]: b for b in buildings}
    center = by_id[ROI_CENTER_ID]["centroid_scene_m"]
    roi = [
        round(center[0] - ROI_SIZE_M / 2, 6),
        round(center[1] - ROI_SIZE_M / 2, 6),
        round(center[0] + ROI_SIZE_M / 2, 6),
        round(center[1] + ROI_SIZE_M / 2, 6),
    ]
    for b in buildings:
        b["bbox_scene_m"] = bbox_from_points(b["footprint_scene_m"])
    centroid_members = [b for b in buildings if roi[0] <= b["centroid_scene_m"][0] <= roi[2] and roi[1] <= b["centroid_scene_m"][1] <= roi[3]]
    footprint_intersections = [b for b in buildings if intersects_bbox(b["bbox_scene_m"], roi)]
    border_only = sorted(set(b["id"] for b in footprint_intersections) - set(b["id"] for b in centroid_members))
    ranked = sorted(
        centroid_members,
        key=lambda b: (math.hypot(b["centroid_scene_m"][0] - center[0], b["centroid_scene_m"][1] - center[1]), b["id"]),
    )
    targets = ranked[:TARGET_COUNT]
    require(any(t["id"] == REQUIRED_TARGET_ID for t in targets), "required target msft_0309 missing from nearest 20")
    target_ids = [t["id"] for t in targets]
    photo_receipts = [
        rel(EVIDENCE / "wikimedia-commons-geosearch-250m.json"),
        rel(EVIDENCE / "wikimedia-commons-geosearch-2500m.json"),
        rel(EVIDENCE / "kartaview-nearby-photos-250m.json"),
        rel(EVIDENCE / "kartaview-nearby-photos-2000m.json"),
        rel(EVIDENCE / "violet-thcs-gialoc-reference.html"),
    ]
    records = []
    for t in targets:
        records.append(
            {
                "target_id": t["id"],
                "status": "pending_no_verified_free_photo",
                "source": "S07 public web/photo-source search",
                "query": {
                    "centroid_wgs84": t["centroid_wgs84"],
                    "sample_roi_center_target": ROI_CENTER_ID,
                    "search_radii_m": [250, 2000, 2500],
                },
                "receipt_paths": photo_receipts,
                "candidate_url": None,
                "candidate_local_file": None,
                "rights": None,
                "license_url": None,
                "gps_wgs84": None,
                "epoch": None,
                "point_match": False,
                "confidence": 0.0,
                "pending_reason": "No public free photo with verified GPS, rights, and point match inside the 250m sample ROI was found in the bounded S07-A search. Reference-only pages are not applied to footprints.",
            }
        )
    registry = {
        "schema": "tayninh-s07-photo-registry/v1",
        "generated_at": GENERATED_AT,
        "sample_roi": {
            "center_target_id": ROI_CENTER_ID,
            "center_scene_m": center,
            "center_wgs84": by_id[ROI_CENTER_ID]["centroid_wgs84"],
            "bounds_scene_m": roi,
            "bounds_wgs84_approx": [canonical_to_wgs84(roi[0], roi[1]), canonical_to_wgs84(roi[2], roi[3])],
            "membership_rule_for_targets": "20 nearest building centroids inside roi_250m centroid_members; include msft_0615 and msft_0309",
        },
        "summary": {
            "records": len(records),
            "verified_usable_photos": 0,
            "pending_no_verified_free_photo": len(records),
        },
        "records": records,
        "global_search_receipts": photo_receipts,
        "reference_only_leads": [
            {
                "url": "https://thamvan.mae.gov.vn/Uploads/23012025/LL23.01.%20BC%20DTM%20NMN%20TRANG%20BANG%20-%20TAY%20NINH.pdf",
                "local_file": rel(EVIDENCE / "mae-eia-waterfactory-loc-khe-reference-download-failure.json"),
                "status": "download_failed_connection_reset_reference_only_no_footprint_claim",
            },
            {
                "url": "https://thcs-gialoc-tayninh.violet.vn/document/truong-gia-loc-7346873.html",
                "local_file": rel(EVIDENCE / "violet-thcs-gialoc-reference.html"),
                "status": "reference_only_rights_reserved_or_unverified_not_applied",
            },
        ],
    }
    write_json(SOURCES / "photo-registry.json", registry)
    target_records = []
    for t in targets:
        target_records.append(
            {
                "id": t["id"],
                "stable_id": t["id"],
                "rank_nearest_to_roi_center": target_ids.index(t["id"]) + 1,
                "centroid_scene_m": t["centroid_scene_m"],
                "centroid_wgs84": t["centroid_wgs84"],
                "bbox_scene_m": t["bbox_scene_m"],
                "footprint_scene_m": t["footprint_scene_m"],
                "display_height_m": t["display_height_m"],
                "height_kind": t["height_kind"],
                "model_height_m": t["model_height_m"],
                "photo_record_status": "pending_no_verified_free_photo",
            }
        )
    manifest = {
        "schema": "tayninh-s07-sample-manifest/v1",
        "generated_at": GENERATED_AT,
        "source_solution": {
            "path": rel(SOLUTION),
            "sha256": sha256(SOLUTION),
        },
        "frame": {
            "coordinate_frame": solution["frame"]["coordinate_frame"],
            "aoi_center_wgs84": solution["frame"]["aoi_center_wgs84"],
            "canonical_origin": "S06 visual local tangent metres; x east, z north",
        },
        "roi_250m": {
            "center_target_id": ROI_CENTER_ID,
            "center_scene_m": center,
            "center_wgs84": by_id[ROI_CENTER_ID]["centroid_wgs84"],
            "bounds_scene_m": roi,
            "bounds_wgs84_approx": [canonical_to_wgs84(roi[0], roi[1]), canonical_to_wgs84(roi[2], roi[3])],
            "membership_counts": {
                "centroid_members": len(centroid_members),
                "footprint_intersections": len(footprint_intersections),
                "border_only_intersections": len(border_only),
            },
            "centroid_member_ids": sorted(b["id"] for b in centroid_members),
            "footprint_intersection_ids": sorted(b["id"] for b in footprint_intersections),
            "border_only_intersection_ids": border_only,
        },
        "target_selection": {
            "rule": "20 nearest building centroids to msft_0615 among roi centroid_members; stable id tie-break",
            "target_count": len(target_records),
            "required_ids_present": {
                ROI_CENTER_ID: ROI_CENTER_ID in target_ids,
                REQUIRED_TARGET_ID: REQUIRED_TARGET_ID in target_ids,
            },
            "target_ids": target_ids,
        },
        "targets": target_records,
        "photo_registry_path": rel(SOURCES / "photo-registry.json"),
        "materials_manifest_path": rel(OUT / "materials" / "manifest.json"),
        "material_runtime_selection": material_manifest["runtime_selection"],
        "source_fingerprints": {
            rel(SOLUTION): sha256(SOLUTION),
            rel(SOURCES / "photo-registry.json"): sha256(SOURCES / "photo-registry.json"),
            rel(OUT / "materials" / "manifest.json"): sha256(OUT / "materials" / "manifest.json"),
        },
        "limitations": [
            "The 250m ROI is a sample visualization cell, not an administrative boundary.",
            "No public free photo was verified for any target footprint; all photo records are pending.",
            "Generic ambientCG materials are not observed Gia Loc facade or roof facts.",
            "ScatteredLeaves009 is a ground-litter material only, not a tree canopy or species claim.",
        ],
    }
    write_json(OUT / "sample-manifest.json", manifest)
    qa = {
        "schema": "tayninh-s07-data-qa/v1",
        "generated_at": GENERATED_AT,
        "status": "PASS",
        "counts": {
            "targets": len(target_records),
            "centroid_members": len(centroid_members),
            "footprint_intersections": len(footprint_intersections),
            "border_only_intersections": len(border_only),
            "verified_usable_photos": 0,
            "pending_photos": len(records),
            "material_assets": len(material_manifest["assets"]),
            "active_material_assets": len(material_manifest["runtime_selection"]["active_asset_ids"]),
            "active_material_maps": material_manifest["runtime_selection"]["active_map_count"],
        },
        "target_ids": target_ids,
        "border_only_intersection_ids": border_only,
        "sample_manifest_sha256": sha256(OUT / "sample-manifest.json"),
        "photo_registry_sha256": sha256(SOURCES / "photo-registry.json"),
        "materials_manifest_sha256": sha256(OUT / "materials" / "manifest.json"),
    }
    write_json(OUT / "qa.json", qa)
    return manifest


def main() -> None:
    material_manifest = prepare_materials()
    prepare_scene_and_photos(material_manifest)


if __name__ == "__main__":
    main()
