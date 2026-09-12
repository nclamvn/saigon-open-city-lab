#!/usr/bin/env python3
"""Extract the mapped construction alignment and publish the approved design envelope."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WAY_IDS = [1504289918, 1504289919, 1504289920, 1504289921]


def main():
    scene = json.loads((ROOT / "data/scene.json").read_text())
    raw = json.loads((ROOT / "data/osm-raw.json").read_text())
    ways = {e["id"]: e for e in raw["elements"] if e.get("type") == "way" and e.get("id") in WAY_IDS}
    assert set(ways) == set(WAY_IDS)
    cx, cy = scene["meta"]["center"]
    minlon, minlat, maxlon, maxlat = scene["meta"]["bbox"]
    sx = scene["meta"]["width"] / (maxlon - minlon)
    sz = scene["meta"]["depth"] / (maxlat - minlat)

    def local(way):
        return [[round((q["lon"] - cx) * sx, 2), round(-(q["lat"] - cy) * sz, 2)] for q in way["geometry"]]

    for way in ways.values():
        tags = way["tags"]
        assert tags.get("highway") == "construction" and tags.get("construction") == "footway" and tags.get("bridge") == "yes"
    main_path = local(ways[1504289918]) + local(ways[1504289919])[1:]
    data = {
        "version": "footbridge-correction-1",
        "name": "Cầu đi bộ qua sông Sài Gòn",
        "connection": "Công viên Bến Bạch Đằng – Công viên bờ sông Thủ Thiêm",
        "status": "under_construction_main_span_not_installed",
        "statusDate": "2026-08-25",
        "operational": False,
        "mappedConstructionWayIds": WAY_IDS,
        "mainPath": main_path,
        "approachPaths": [local(ways[1504289920]), local(ways[1504289921])],
        "design": {
            "concept": "nipa_palm_leaf",
            "structure": "spatial_steel_arch",
            "routeLengthM": 720,
            "widthRangeM": [6, 11],
            "mainSpanM": 187,
            "navigationClearanceM": {"width": 80, "height": 10},
            "pedestrianAndCycleUse": True,
        },
        "renderPolicy": {
            "builtWork": "solid",
            "uninstalledMainSpan": "translucent_design_envelope",
            "classification": "construction_state_plus_illustrative_approved_design",
            "surveyedGeometry": False,
        },
        "sources": [
            {
                "name": "Ho Chi Minh City Government Portal",
                "url": "https://tphcm.chinhphu.vn/khoi-cong-xay-dung-cau-di-bo-qua-song-sai-gon-101250329111018964.htm",
                "claim": "720 m route, 6–11 m width, 187 m main span, 80 x 10 m navigation clearance, spatial steel arch and nipa-palm-leaf form",
            },
            {
                "name": "VOV",
                "url": "https://vov.gov.vn/cau-di-bo-qua-song-sai-gon-lo-hen-dip-29-dtnew-1161022?keyDevice=true",
                "claim": "On 25 August 2026 the main span had not been transported or installed and the planned 2 September opening was delayed",
            },
        ],
        "limitations": [
            "Solid members approximate reported construction state; no site survey was available",
            "The translucent leaf arch is an illustrative interpretation of the approved architectural concept",
            "Do not use for navigation, construction or structural analysis",
        ],
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    data["sha256"] = hashlib.sha256(payload).hexdigest()
    (ROOT / "data/bach-dang-footbridge.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "data/bach-dang-footbridge.js").write_text("window.BACH_DANG_FOOTBRIDGE=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"status": "PASS", "ways": len(ways), "mainSpanM": 187, "operational": False, "sha256": data["sha256"]}))


if __name__ == "__main__":
    main()
