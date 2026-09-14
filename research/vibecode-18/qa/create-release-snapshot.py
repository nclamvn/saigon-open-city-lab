"""Contractor QA freeze tool. Run only for a deliberate new release snapshot."""
import datetime
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / "outputs/hcmc-poc"
QA = Path(__file__).parent
paths = set()

def add(file):
    file = file.resolve()
    assert file.is_relative_to(ROOT) and file.is_file(), file
    paths.add(file)

def verified_asset(url, length, digest):
    file = ROOT / "outputs" / url.lstrip("/")
    data = file.read_bytes()
    assert len(data) == length and hashlib.sha256(data).hexdigest() == digest, file
    add(file)

core = ROOT / "outputs/shared/digital-twin-core"
for file in core.rglob("*"):
    if re.search(r" \d+\.", file.name):
        continue
    if file.is_file() and (file.suffix in [".js", ".cjs", ".py", ".json", ".md"] or "LICENSE" in file.name):
        add(file)
for name in ["README.md", "index.html", "app.js", "leadership-16.js", "leadership-16.css", "serve.py",
             "twin-analysis-17.js", "twin-analysis-17.css", "twin-surface-18.js", "twin-surface-18.css",
             "vendor/GLTFLoader-r128.js", "vendor/GLTFLoader-r128.LICENSE", "vendor/GLTFLoader-r128.SOURCE.md",
             "data/scene.json", "research/facades-15/manifest.json", "data/facades-15.js", "photo-facades-15.js"]:
    add(BASE / name)

# Enumerate referenced content only. Orphans/provider conflict copies are not
# release assets and must not be traversed/read by a scientific version check.
catalog_file = BASE / "data/tiles-18/catalog.json"
catalog = json.loads(catalog_file.read_bytes())
for tile in catalog["tiles"]:
    for level in ["fine", "coarse"]:
        content = tile[level]
        verified_asset(content["url"], content["byteLength"], content["sha256"])
        verified_asset(content["featureIndexUrl"], content["featureIndexBytes"], content["featureIndexSha256"])
add(catalog_file)
add(BASE / "data/tiles-18/tileset.json")
manifest_file = BASE / "data/surface-18/manifest.json"
manifest = json.loads(manifest_file.read_bytes())
for asset in manifest["assets"].values():
    verified_asset(asset["url"], asset["bytes"], asset["sha256"])
for file in (BASE / "data/surface-18").glob("*.json"):
    if not re.search(r" \d+\.", file.name):
        add(file)
for file in (BASE / "data/surface-18/cog").glob("*.qc.json"):
    if not re.search(r" \d+\.", file.name):
        add(file)
photos = json.loads((BASE / "research/facades-15/manifest.json").read_bytes())
for entry in photos["entries"]:
    add(BASE / entry["source_file"])
for file in (BASE / "scripts").glob("*18*"):
    if file.is_file() and not re.search(r" \d+\.", file.name):
        add(file)
for file in (ROOT / "research/vibecode-18").glob("*.md"):
    add(file)
for name in ["check-cog-browser.cjs", "check-ground-alignment.py", "check-produced-tiles.py", "validate-glb.cjs",
             "check-real-photos.py", "make-cog-fixtures.py", "verify-release.py", "create-release-snapshot.py",
             "cog-browser-results.json", "ground-alignment-oracle.json", "khronos-glb-validation.json",
             "real-photo-audit.json", "produced-tiles-oracle.json", "ui-results.json", "ui-integrity-results.json",
             "surface-desktop.png", "surface-overview.png", "surface-mobile.png", "surface-mobile-collapsed.png", "night-restored.png"]:
    add(QA / name)
add(ROOT / "outputs/DEMO-18-HUONG-DAN.md")
add(ROOT / "research/vibecode-18/evidence-source-owned/final-source-builder-snapshot.json")
ui = json.loads((QA / "ui-results.json").read_bytes())
assert len(ui["checks"]) == 24 and all(check["pass"] for check in ui["checks"]) and not ui["errors"]
assert "READY" in (ROOT / "research/vibecode-18/COMPLETION-UI.md").read_text()
assert catalog["provenance"]["surfaceManifest"]["sha256"] == hashlib.sha256(manifest_file.read_bytes()).hexdigest()

files = []
for index, file in enumerate(sorted(paths)):
    data = file.read_bytes()
    files.append({"path": str(file.relative_to(ROOT)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    if index % 100 == 0:
        print(f"Fingerprint progress {index + 1}/{len(paths)}", flush=True)
result = {"schema": "rtr-contractor-release-fingerprints/1.0", "release": "18b", "manifestVersion": "18a",
          "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "scope": "Core contracts/extensions; 18 UI/server; all catalog-referenced GLBs/sidecars; four COGs/QC; 20 retained photos; release docs and QA. Excludes unreferenced copies, full quarantine transfer bodies and historical standalone packages.",
          "files": files}
(QA / "release-fingerprints.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"status": "PASS", "files": len(files), "bytes": sum(file["bytes"] for file in files)}))
