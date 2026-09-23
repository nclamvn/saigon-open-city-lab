#!/usr/bin/env python3
"""Capture authoritative flood-model sources with immutable hashes.

The raw response is retained beside a normalized text snapshot. Claims point to
the text snapshot while capture-manifest.json binds it to the raw response.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "snapshots" / "raw"
SNAPSHOTS = ROOT / "snapshots"

SOURCES = [
    {
        "id": "hcmc-warning-markers",
        "url": "https://dost.hochiminhcity.gov.vn/hoat-dong-so-khcn/tp-ho-chi-minh-xay-dung-he-thong-moc-canh-bao-ngap-lut-tang-kha-nang-ung-pho-thien-tai-do-thi/",
        "type": "html",
    },
    {
        "id": "hcmc-thao-dien-2025",
        "url": "https://hdnd.hochiminhcity.gov.vn/tin-tuc/tin-tong-hop/tphcm-mua-lon-ket-hop-trieu-cuong-gay-ngap-nhieu-noi",
        "type": "html",
    },
    {
        "id": "hcmc-early-warning-report",
        "url": "https://ttqlhtkt.hochiminhcity.gov.vn/documents/20197/31303/3.%2BBCTongHop_CanhBaoSomNgapLut-AI.pdf/5068c1da-04ed-4580-b7b6-127c7a40d74e",
        "type": "pdf",
    },
    {
        "id": "epa-swmm",
        "url": "https://www.epa.gov/water-research/storm-water-management-model-swmm",
        "type": "html",
    },
    {
        "id": "hec-ras-2d-rainfall",
        "url": "https://www.hec.usace.army.mil/confluence/rasdocs/r2dum/6.5/boundary-and-initial-conditions-for-2d-flow-areas/global-boundary-conditions",
        "type": "html",
    },
    {
        "id": "nasa-imerg-v07",
        "url": "https://gpm.nasa.gov/data/imerg",
        "type": "html",
    },
    {
        "id": "era5-land",
        "url": "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=overview",
        "type": "html",
    },
    {
        "id": "copernicus-dem-glo30",
        "url": "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
        "type": "html",
    },
    {
        "id": "sentinel-1-grd",
        "url": "https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-1",
        "type": "html",
    },
]


class VisibleText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg"}:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        text = " ".join(data.split())
        if not self.skip and text:
            self.parts.append(text)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def capture(source: dict, fetched_at: str) -> dict:
    extension = ".pdf" if source["type"] == "pdf" else ".html"
    raw_path = RAW / f'{source["id"]}{extension}'
    # `.html` is retained for compatibility with Refinery's adversarial bite
    # harness; the body itself is normalized visible text, bound to the raw hash.
    text_path = SNAPSHOTS / f'{source["id"]}.html'
    subprocess.run(
        [
            "curl", "-L", "--fail", "--retry", "2", "--connect-timeout", "20",
            "--max-time", "120", "-A", "RtR-HCMC-Flood-Registry/25A", "-sS",
            "-o", str(raw_path), source["url"],
        ],
        check=True,
    )
    if source["type"] == "pdf":
        subprocess.run(["pdftotext", "-layout", str(raw_path), str(text_path)], check=True)
        body = text_path.read_text(encoding="utf-8", errors="replace")
    else:
        raw_text = raw_path.read_text(encoding="utf-8", errors="replace")
        parser = VisibleText()
        parser.feed(raw_text)
        body = "\n".join(parser.parts)
    header = (
        f'CAPTURE_ID: {source["id"]}\nURL: {source["url"]}\n'
        f'FETCHED_AT: {fetched_at}\nRAW_SHA256: {sha256(raw_path)}\n'
        'CONTENT: normalized visible text; raw response retained beside snapshot\n---\n'
    )
    text_path.write_text(header + body, encoding="utf-8")
    return {
        **source,
        "fetched_at": fetched_at,
        "raw": str(raw_path.relative_to(ROOT)),
        "snapshot": str(text_path.relative_to(ROOT)),
        "raw_sha256": sha256(raw_path),
        "snapshot_sha256": sha256(text_path),
        "bytes": raw_path.stat().st_size,
    }


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    fetched_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    records = [capture(source, fetched_at) for source in SOURCES]
    manifest = {
        "version": "25a",
        "generated_at": fetched_at,
        "policy": "Raw response retained; claims use normalized text bound to raw SHA-256.",
        "sources": records,
    }
    (ROOT / "capture-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"captured": len(records), "bytes": sum(r["bytes"] for r in records)}, indent=2))


if __name__ == "__main__":
    main()
