#!/usr/bin/env python3
"""Publish the PoC 09 procedural texture-atlas and calibration contract."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    semantic = json.loads((ROOT / "data/semantic-materials-08.json").read_text())
    data = {
        "version": "poc-09-texture-atlas-1",
        "title": "Color Calibration & Texture Atlas",
        "status": "procedural_atlas_calibration_sandbox_no_captured_images",
        "atlas": {
            "width": 1024,
            "height": 512,
            "columns": 4,
            "rows": 2,
            "tileSize": 256,
            "runtimeGenerated": True,
            "channels": ["baseColor_detail", "roughness_proxy"],
            "families": [
                "warm_plaster", "painted_residential", "glass_curtain_wall", "limestone_civic",
                "oxide_industrial", "cool_contemporary", "religious_warm", "generic_concrete"
            ],
        },
        "assignment": {
            "buildings": semantic["renderedBuildings"],
            "directTaggedBuildings": semantic["directTaggedBuildings"],
            "simulatedBuildings": semantic["renderedBuildings"] - semantic["directTaggedBuildings"],
            "deterministic": True,
        },
        "calibration": {
            "capturedImages": 0,
            "measuredCharts": 0,
            "deltaE2000": None,
            "defaultExposureEV": 0,
            "defaultWhiteBalanceK": 6500,
            "defaultSaturation": 1,
            "controlsAreExploratory": True,
        },
        "upgradeContract": [
            "Capture RAW or fixed-profile images with a reference colour chart in each light regime",
            "Linearize camera response and solve white balance/exposure against measured chart values",
            "Segment facades, rectify perspective and bake atlas patches with per-image provenance",
            "Publish median and 95th-percentile Delta E 2000 before marking colours calibrated",
        ],
        "classification": "illustrative_procedural_texture_atlas_not_observed_facade_texture",
        "sources": semantic["sources"],
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    data["sha256"] = hashlib.sha256(payload).hexdigest()
    (ROOT / "data/texture-atlas-09.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "data/texture-atlas-09.js").write_text("window.TEXTURE_ATLAS_09=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(json.dumps({"status": "PASS", "families": 8, "buildings": data["assignment"]["buildings"], "capturedImages": 0, "deltaE2000": None, "sha256": data["sha256"]}))


if __name__ == "__main__": main()
