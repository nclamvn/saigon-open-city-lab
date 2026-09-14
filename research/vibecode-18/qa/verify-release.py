"""Verify the Contractor's frozen release snapshot. Does not rewrite it."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
report = json.loads(Path(__file__).with_name("release-fingerprints.json").read_text())
errors = []
for entry in report["files"]:
    file = (ROOT / entry["path"]).resolve()
    if not file.is_relative_to(ROOT) or not file.is_file():
        errors.append({"path": entry["path"], "error": "missing_or_outside_root"})
        continue
    data = file.read_bytes()
    if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
        errors.append({"path": entry["path"], "error": "fingerprint_mismatch"})
print(json.dumps({"status": "FAIL" if errors else "PASS", "files": len(report["files"]), "errors": errors}))
raise SystemExit(bool(errors))
