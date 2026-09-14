#!/usr/bin/env python3
"""Fail-loud contract and SHA-256 validator for the Batch 03 ecosystem manifest."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


BASE = Path(__file__).resolve().parents[2]
MANIFEST = BASE / "sources" / "ecosystem-records.json"
REQUIRED = {
    "id",
    "publisher",
    "title",
    "url",
    "status",
    "snapshot",
    "snapshot_sha256",
    "local_file",
    "local_sha256",
    "license",
    "license_url",
    "data_date",
    "captured_at",
    "crs",
    "vertical_datum",
    "resolution",
    "extent",
    "evidence_span",
    "requirements",
    "limitations",
    "input_files",
    "derived_files",
}
ALLOWED_PREFIXES = ("sources/ecosystem/", "raw/ecosystem/", "derived/ecosystem/")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check_file(reference: dict[str, object], errors: list[str], checked: set[str]) -> None:
    relative = str(reference.get("path", ""))
    expected_hash = str(reference.get("sha256", ""))
    if not relative.startswith(ALLOWED_PREFIXES):
        errors.append(f"path outside ecosystem ownership: {relative}")
        return
    path = BASE / relative
    if not path.is_file():
        errors.append(f"missing file: {relative}")
        return
    actual_hash = sha256(path)
    if actual_hash != expected_hash:
        errors.append(f"hash mismatch: {relative}: {actual_hash} != {expected_hash}")
    if "bytes" in reference and path.stat().st_size != int(reference["bytes"]):
        errors.append(f"byte-size mismatch: {relative}")
    checked.add(relative)


def main() -> int:
    records = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors: list[str] = []
    checked: set[str] = set()
    if not isinstance(records, list):
        errors.append("manifest root must be a JSON array")
        records = []
    ids: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            errors.append(f"record {index} is not an object")
            continue
        missing = sorted(REQUIRED - record.keys())
        if missing:
            errors.append(f"record {index} missing fields: {', '.join(missing)}")
        record_id = str(record.get("id", ""))
        if record_id in ids:
            errors.append(f"duplicate record id: {record_id}")
        ids.add(record_id)
        if record.get("status") != "acquired":
            errors.append(f"record {record_id} is not acquired")

        snapshot_ref = {
            "path": record.get("snapshot"),
            "sha256": record.get("snapshot_sha256"),
        }
        check_file(snapshot_ref, errors, checked)
        local_ref = {
            "path": record.get("local_file"),
            "sha256": record.get("local_sha256"),
        }
        check_file(local_ref, errors, checked)

        inputs = record.get("input_files", [])
        derivatives = record.get("derived_files", [])
        if not isinstance(inputs, list) or not inputs:
            errors.append(f"record {record_id} has no input_files")
            inputs = []
        if not isinstance(derivatives, list) or not derivatives:
            errors.append(f"record {record_id} has no derived_files")
            derivatives = []
        for reference in inputs + derivatives + record.get("source_snapshots", []):
            check_file(reference, errors, checked)

        input_pairs = {(item.get("path"), item.get("sha256")) for item in inputs}
        if (record.get("local_file"), record.get("local_sha256")) not in input_pairs:
            errors.append(f"record {record_id} local_file/hash is absent from input_files")

        snapshot = BASE / str(record.get("snapshot", ""))
        if snapshot.is_file():
            evidence = str(record.get("evidence_span", ""))
            text = snapshot.read_text(encoding="utf-8", errors="replace")
            if not evidence or evidence not in text:
                errors.append(f"record {record_id} evidence_span is absent from snapshot")
        for source in record.get("source_snapshots", []):
            evidence = source.get("evidence_span")
            if evidence:
                path = BASE / str(source.get("path", ""))
                text = path.read_text(encoding="utf-8", errors="replace")
                if str(evidence) not in text:
                    errors.append(f"source evidence_span is absent: {source.get('path')}")

        extent = record.get("extent", {})
        bbox = extent.get("bbox", []) if isinstance(extent, dict) else []
        requested = (106.3276338, 11.0830401, 106.3576338, 11.1130401)
        if len(bbox) != 4 or not (
            float(bbox[0]) <= requested[0]
            and float(bbox[1]) <= requested[1]
            and float(bbox[2]) >= requested[2]
            and float(bbox[3]) >= requested[3]
        ):
            errors.append(f"record {record_id} extent does not contain requested AOI")

    if errors:
        print(json.dumps({"status": "FAIL", "errors": errors}, indent=2))
        return 1
    print(
        json.dumps(
            {
                "status": "PASS",
                "records": len(records),
                "unique_referenced_files_checked": len(checked),
                "manifest_sha256": sha256(MANIFEST),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
