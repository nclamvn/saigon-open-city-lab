"""Contractor audit of retained original/reference image bytes, not 3D accuracy."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / "outputs/hcmc-poc"
manifest_file = BASE / "research/facades-15/manifest.json"
manifest_bytes = manifest_file.read_bytes()
manifest = json.loads(manifest_bytes)
checks = []
for entry in manifest["entries"]:
    file = BASE / entry["source_file"]
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    with Image.open(file) as image:
        dimensions = list(image.size)
    check = {"key": entry["key"], "sourceFile": entry["source_file"],
             "sha256": digest, "dimensions": dimensions,
             "hashMatches": digest == entry["source_sha256"],
             "dimensionsMatch": dimensions == entry["source_dimensions"]}
    assert check["hashMatches"] and check["dimensionsMatch"], check
    checks.append(check)
result = {"status": "PASS", "files": len(checks),
          "manifestSha256": hashlib.sha256(manifest_bytes).hexdigest(),
          "limits": "Checks image identity and dimensions, not inferred facade geometry or current appearance.",
          "checks": checks}
Path(__file__).with_name("real-photo-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({k: v for k, v in result.items() if k != "checks"}))
