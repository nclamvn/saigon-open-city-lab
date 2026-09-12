#!/usr/bin/env python3
"""Build a provenance-aware colour/material registry for PoC 08."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEYS = ("building:colour", "roof:colour", "building:material", "roof:material")


def main():
    scene = json.loads((ROOT / "data/scene.json").read_text())
    raw = json.loads((ROOT / "data/osm-raw.json").read_text())
    rendered_osm = {b["id"] for b in scene["buildings"] if b.get("origin") != "Overture"}
    records = {}
    for element in raw["elements"]:
        if element.get("id") not in rendered_osm:
            continue
        tags = element.get("tags", {})
        picked = {k: tags[k] for k in KEYS if tags.get(k)}
        if picked:
            records[str(element["id"])] = picked
    counts = {k: sum(k in r for r in records.values()) for k in KEYS}
    data = {
        "version": "poc-08-semantic-materials-1",
        "mode": "observed_tags_plus_deterministic_simulation",
        "renderedBuildings": len(scene["buildings"]),
        "directTaggedBuildings": len(records),
        "directTagCounts": counts,
        "directCoveragePercent": round(len(records) / len(scene["buildings"]) * 100, 3),
        "records": records,
        "simulationRules": [
            "Direct OSM building:colour and roof:colour take precedence",
            "OSM building:material=glass selects a cool reflective family",
            "Known building use selects residential, civic, commercial, religious or industrial families",
            "Tall buildings and the Thu Thiem zone receive cooler contemporary families",
            "All remaining variation is deterministic from building ID",
        ],
        "classification": "simulated_city_colour_not_observed_photogrammetry",
        "limitations": [
            "Most buildings have no direct colour/material tag",
            "Colour appearance changes with illumination, tone mapping and display calibration",
            "Sentinel ground imagery is not used as facade colour evidence",
            "No street-level imagery or UAV texture has been ingested",
        ],
        "sources": [
            {"name": "OpenStreetMap building:colour", "url": "https://wiki.openstreetmap.org/wiki/Key:building:colour"},
            {"name": "OpenStreetMap building:material", "url": "https://wiki.openstreetmap.org/wiki/Key:building:material"},
        ],
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    data["sha256"] = hashlib.sha256(payload).hexdigest()
    (ROOT / "data/semantic-materials-08.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "data/semantic-materials-08.js").write_text("window.SEMANTIC_MATERIALS_08=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"status": "PASS", "buildings": len(scene["buildings"]), "directTagged": len(records), "counts": counts, "sha256": data["sha256"]}))


if __name__ == "__main__":
    main()
