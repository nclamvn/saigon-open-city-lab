#!/usr/bin/env python3
"""Build the deterministic, source-labelled construction-change lens for PoC 23."""
from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / "outputs" / "hcmc-poc"


def local_ring(coords: list[list[float]], center: list[float]) -> list[list[float]]:
    lon0, lat0 = center
    scale_x = 111320 * math.cos(math.radians(lat0))
    ring = [[round((lon - lon0) * scale_x, 2), round((lat0 - lat) * 110574, 2)] for lon, lat in coords]
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring.pop()
    return ring


def centroid(ring: list[list[float]]) -> list[float]:
    return [round(sum(p[0] for p in ring) / len(ring), 2), round(sum(p[1] for p in ring) / len(ring), 2)]


def review_priority(item: dict) -> tuple[int, str, str]:
    score = 0
    reasons: list[str] = []
    if item.get("after_overture_release"):
        score += 3
        reasons.append("biến động sau snapshot Overture")
    area = float(item.get("area_m2") or 0)
    if area >= 1200:
        score += 2
        reasons.append("footprint rất lớn")
    elif area >= 400:
        score += 1
        reasons.append("footprint lớn")
    if item.get("height") is not None or item.get("levels") is not None:
        score += 2
        reasons.append("có thuộc tính chiều cao")
    if item.get("name") or item.get("start_date") or item.get("addr_street"):
        score += 1
        reasons.append("có thuộc tính nhận dạng")
    if float(item.get("coverage_current") or 0) < 0.3:
        score += 1
        reasons.append("chồng phủ nền thấp")
    level = "high" if score >= 4 else "medium" if score >= 2 else "low"
    return score, level, ", ".join(reasons) or "cần kiểm tra ranh hình học"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", type=Path, default=APP / "data" / "scene.json")
    parser.add_argument("--gap", type=Path, default=APP / "data" / "building-gap-22.json")
    parser.add_argument("--registry", type=Path, default=ROOT / "research" / "vibecode-22-building-gap" / "candidate-registry.json")
    parser.add_argument("--out", type=Path, default=APP / "data" / "construction-change-23.json")
    parser.add_argument("--review-csv", type=Path, default=ROOT / "research" / "vibecode-23-change-lens" / "geometry-review-queue.csv")
    args = parser.parse_args()

    scene = json.loads(args.scene.read_text())
    gap = json.loads(args.gap.read_text())
    registry = json.loads(args.registry.read_text())
    buildings = scene["buildings"]
    center = scene["meta"]["center"]
    by_id = {str(b.get("id")): (i, b) for i, b in enumerate(buildings)}

    additions = []
    for item in gap["additions"]:
        model_index, building = by_id[str(item["osmId"])]
        additions.append({
            "modelIndex": model_index,
            "osmId": item["osmId"],
            "label": building.get("name") or f"OSM {item['osmId']}",
            "editTime": item["editTime"],
            "areaM2": item["areaM2"],
            "coverageBefore": item["coverageCurrent"],
            "heightM": building["h"],
            "quality": building["q"],
            "rings": building["r"],
            "center": building["center"],
            "decision": "integrated_from_osm_delta",
        })

    corrections = []
    for item in gap["heightCorrections"]:
        building = buildings[item["modelIndex"]]
        evidence = item.get("evidence") or []
        corrections.append({
            "modelIndex": item["modelIndex"],
            "modelId": item["modelId"],
            "label": next((e.get("name") or e.get("project") for e in evidence if e.get("name") or e.get("project")), None) or building.get("name") or f"Công trình {item['modelId']}",
            "address": next((e.get("address") for e in evidence if e.get("address")), None),
            "baselineHeightM": item["baselineHeightM"],
            "heightM": item["heightM"],
            "deltaM": round(item["heightM"] - item["baselineHeightM"], 2),
            "googleHeightM": item.get("googleHeightM"),
            "quality": building["q"],
            "rings": building["r"],
            "center": building["center"],
            "evidence": evidence,
            "decision": "crosschecked_height_applied",
        })

    review = []
    for item in registry["candidates"]:
        if item.get("action") != "REVIEW_GEOMETRY":
            continue
        ring = local_ring(item["coordinates"], center)
        score, priority, reason = review_priority(item)
        review.append({
            "osmId": item["osm_id"],
            "label": item.get("name") or f"OSM {item['osm_id']}",
            "editTime": item["edit_time"],
            "changeType": item["change_vs_may"],
            "areaM2": item["area_m2"],
            "coverageCurrent": item["coverage_current"],
            "height": item.get("height"),
            "levels": item.get("levels"),
            "startDate": item.get("start_date"),
            "addressStreet": item.get("addr_street"),
            "afterOvertureRelease": bool(item.get("after_overture_release")),
            "score": score,
            "priority": priority,
            "reviewReason": reason,
            "rings": [ring],
            "center": centroid(ring),
            "decision": "manual_review_required",
            "autoIntegrated": False,
        })
    review.sort(key=lambda x: (-x["score"], -x["areaM2"], x["osmId"]))

    priority_counts = {p: sum(x["priority"] == p for x in review) for p in ("high", "medium", "low")}
    tour = [
        {"key": "overview", "label": "Toàn vùng biến động", "target": [0, 0], "distance": 7900, "az": 0.45, "polar": 0.63},
    ]
    if additions:
        cluster = min(additions, key=lambda x: abs(x["center"][0]) + abs(x["center"][1]))
        tour.append({"key": "addition", "label": "Footprint mới đã bổ sung", "target": cluster["center"], "distance": 820, "az": 0.9, "polar": 0.9, "osmId": cluster["osmId"]})
    if corrections:
        focus = max(corrections, key=lambda x: abs(x["deltaM"]))
        tour.append({"key": "height", "label": "Chiều cao đã đối chiếu", "target": focus["center"], "distance": max(500, focus["heightM"] * 8), "az": 0.75, "polar": 1.0, "modelId": focus["modelId"]})
    if review:
        focus = review[0]
        tour.append({"key": "review", "label": "Ưu tiên kiểm chứng hình học", "target": focus["center"], "distance": 900, "az": 1.0, "polar": 0.88, "osmId": focus["osmId"]})

    out = {
        "version": "23a",
        "generatedFrom": {"sceneVersion": scene["meta"].get("buildingGap22", {}).get("version"), "sourceSnapshotAt": gap["sourceSnapshotAt"], "overtureRelease": scene["meta"]["overture"]["release"]},
        "status": "source-labelled change lens; review geometry is excluded from the canonical scene",
        "summary": {
            "signals": len(additions) + len(corrections) + len(review),
            "footprintsAdded": len(additions),
            "heightCorrections": len(corrections),
            "geometryReview": len(review),
            "reviewPriority": priority_counts,
        },
        "legend": {
            "addition": {"label": "Footprint mới đã áp dụng", "color": "#f2c078"},
            "height": {"label": "Chiều cao đã đối chiếu", "color": "#63e6c5"},
            "review": {"label": "Hình học chờ duyệt", "color": "#ff766b"},
        },
        "policy": {
            "reviewAutoIntegrated": False,
            "canonicalSceneMutatedByReview": False,
            "statement": "127 hình học chỉ là tín hiệu cần kiểm chứng; không được coi là hiện trạng đã xác nhận.",
        },
        "additions": additions,
        "heightCorrections": corrections,
        "geometryReview": review,
        "tour": tour,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    args.out.with_suffix(".js").write_text("window.CONSTRUCTION_CHANGE_23=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    args.review_csv.parent.mkdir(parents=True, exist_ok=True)
    fields = ["osmId", "priority", "score", "changeType", "editTime", "afterOvertureRelease", "areaM2", "coverageCurrent", "height", "levels", "label", "addressStreet", "reviewReason", "decision"]
    with args.review_csv.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(review)
    print(json.dumps(out["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
