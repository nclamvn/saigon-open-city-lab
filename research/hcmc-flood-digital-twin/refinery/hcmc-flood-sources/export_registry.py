#!/usr/bin/env python3
"""Export the verified Refinery registry without flattening provenance."""
from __future__ import annotations

import hashlib
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[3]
ENGINE_PATH = PROJECT / "outputs/hcmc-poc/research/refinery.py"
PUBLIC_OUT = PROJECT / "outputs/hcmc-poc/data/flood-source-registry-25.json"

spec = importlib.util.spec_from_file_location("hcmc_refinery", ENGINE_PATH)
refinery = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(refinery)


def stable_digest(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def main() -> None:
    cfg, claims, registry, _aggregates, _canonical = refinery.run_pipeline(ROOT)

    captures = defaultdict(list)
    for item in claims:
        key = (refinery.canonicalize(cfg, item["entity"]), item["field"])
        cap = item["capture"]
        captures[key].append(
            {
                "source": cap["source"],
                "url": cap.get("url"),
                "fetchedAt": cap.get("fetched_at"),
                "snapshot": cap["snapshot"],
                "rawSha256": cap.get("raw_sha256"),
                "tier": item["tier"],
                "evidenceSpan": item["evidence_span"],
                "extraction": item["extraction"],
            }
        )

    entities = []
    for entity, record in sorted(registry.items()):
        fields = {}
        for field, cell in record["fields"].items():
            output = {"state": cell["state"], "value": cell.get("value")}
            if cell["state"] != "null":
                output["sources"] = captures[(entity, field)]
            if cell["state"] == "disputed":
                output["claims"] = cell.get("claims", [])
            fields[field] = output
        entities.append({"id": entity, "role": record["entity_type"], "fields": fields})

    capture_manifest = json.loads((ROOT / "capture-manifest.json").read_text(encoding="utf-8"))
    document = {
        "version": "25a",
        "status": "refinery_verified",
        "generatedBy": "hcmc-flood-sources/export_registry.py",
        "sourceCount": len(entities),
        "claimCount": len(claims),
        "truthPolicy": {
            "honestNull": True,
            "disputedValuesNotAutoResolved": True,
            "verbatimEvidenceRequired": True,
            "rawCapturesBoundBySha256": True,
        },
        "captureManifestDigest": stable_digest(capture_manifest),
        "entities": entities,
    }
    document["registryDigest"] = stable_digest(document)
    rendered = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
    (ROOT / "registry.json").write_text(rendered, encoding="utf-8")
    PUBLIC_OUT.write_text(rendered, encoding="utf-8")
    print(json.dumps({"sources": len(entities), "claims": len(claims), "digest": document["registryDigest"]}, indent=2))


if __name__ == "__main__":
    main()
