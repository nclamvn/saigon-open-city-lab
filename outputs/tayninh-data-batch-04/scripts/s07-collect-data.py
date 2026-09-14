#!/usr/bin/env python3
"""S07-A acquisition helper.

Default mode checks that the bounded acquired files are present. Pass
`--download` to re-fetch public receipts/assets from their source URLs.
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"

SOURCES = [
    ("ambientCG license", "https://docs.ambientcg.com/license/", "sources/s07/evidence/ambientcg-license.html"),
    ("ambientCG API", "https://docs.ambientcg.com/api/", "sources/s07/evidence/ambientcg-api.html"),
    ("ambientCG roof search", "https://ambientcg.com/api/v3/assets?type=material&q=roof&limit=5&include=downloads,maps,title,url,dimensions,tags", "sources/s07/evidence/ambientcg-roof-search.json"),
    ("ambientCG wall search", "https://ambientcg.com/api/v3/assets?type=material&q=wall&limit=5&include=downloads,maps,title,url,dimensions,tags", "sources/s07/evidence/ambientcg-wall-search.json"),
    ("ambientCG road search", "https://ambientcg.com/api/v3/assets?type=material&q=asphalt&limit=5&include=downloads,maps,title,url,dimensions,tags", "sources/s07/evidence/ambientcg-road-search.json"),
    ("ambientCG foliage search", "https://ambientcg.com/api/v3/assets?type=material&q=leaves&limit=5&include=downloads,maps,title,url,dimensions,tags", "sources/s07/evidence/ambientcg-foliage-search.json"),
    ("ambientCG Plaster001 asset", "https://ambientcg.com/api/v3/assets?type=material&id=Plaster001&include=downloads,maps,title,url,dimensions,tags", "sources/s07/evidence/ambientcg-plaster001-asset.json"),
    ("Wikimedia Commons 250m", "https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=11.091048155205%7C106.351129246874&gsradius=250&gslimit=50&gsnamespace=6&format=json", "sources/s07/evidence/wikimedia-commons-geosearch-250m.json"),
    ("KartaView 250m", "https://api.openstreetcam.org/2.0/photo/?lat=11.091048155205&lng=106.351129246874&radius=250&page=1&itemsPerPage=50", "sources/s07/evidence/kartaview-nearby-photos-250m.json"),
    ("Violet THCS Gia Loc reference", "https://thcs-gialoc-tayninh.violet.vn/document/truong-gia-loc-7346873.html", "sources/s07/evidence/violet-thcs-gialoc-reference.html"),
    ("RoofingTiles013A 1K", "https://ambientcg.com/get?file=RoofingTiles013A_1K-JPG.zip", "derived/s07/materials/original/RoofingTiles013A_1K-JPG.zip"),
    ("Plaster001 1K", "https://ambientcg.com/get?file=Plaster001_1K-JPG.zip", "derived/s07/materials/original/Plaster001_1K-JPG.zip"),
    ("Bricks104 1K", "https://ambientcg.com/get?file=Bricks104_1K-JPG.zip", "derived/s07/materials/original/Bricks104_1K-JPG.zip"),
    ("Asphalt033 1K", "https://ambientcg.com/get?file=Asphalt033_1K-JPG.zip", "derived/s07/materials/original/Asphalt033_1K-JPG.zip"),
    ("ScatteredLeaves009 1K", "https://ambientcg.com/get?file=ScatteredLeaves009_1K-JPG.zip", "derived/s07/materials/original/ScatteredLeaves009_1K-JPG.zip"),
]


def fetch(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "CodexS07Data/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response, path.open("wb") as f:
        f.write(response.read())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true", help="download public source URLs")
    args = parser.parse_args()
    results = []
    errors = []
    for label, url, rel_path in SOURCES:
        path = B04 / rel_path
        if args.download:
            fetch(url, path)
        exists = path.exists() and path.stat().st_size > 0
        results.append({"label": label, "url": url, "path": str(path.relative_to(ROOT)), "exists": exists, "bytes": path.stat().st_size if path.exists() else 0})
        if not exists:
            errors.append(f"missing acquisition artifact: {label} -> {rel_path}")
    print(json.dumps({"status": "PASS" if not errors else "FAIL", "errors": errors, "results": results}, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
