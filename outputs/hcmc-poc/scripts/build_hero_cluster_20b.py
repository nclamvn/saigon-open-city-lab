#!/usr/bin/env python3
"""Create auditable HD textures and reference images for Hero Cluster 20B."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/hero20b"
RESEARCH = ROOT / "research/hero20b"
SELECTIONS = ROOT / "research/facades-15/selections.json"


SOURCES = {
    "continental": {
        "source": ASSETS / "continental-hd-source.jpg",
        "texture": ASSETS / "continental-facade-rectified-hd.jpg",
        "reference": ASSETS / "continental-reference.jpg",
        "size": 2048,
        "source_url": "https://commons.wikimedia.org/wiki/File:Hotel_Continental_Saigon_(53668610570).jpg",
        "author": "Hans Brian Brandsberg Berg",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0",
        "photo_date": "2018-12-30 15:38:18",
    },
    "caravelle": {
        "source": ASSETS / "caravelle-hd-source.jpg",
        "texture": ASSETS / "caravelle-wing-rectified-hd.jpg",
        "reference": ASSETS / "caravelle-reference.jpg",
        "size": 1600,
        "source_url": "https://commons.wikimedia.org/wiki/File:Caravelle_Hotel_Saigon_2013-02.jpg",
        "author": "BaonguyenCaravelas",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "photo_date": "2014-02-18",
    },
}

LAMSON = {
    "source": ASSETS / "lamson-dongkhoi-hd-source.jpg",
    "reference": ASSETS / "lamson-dongkhoi-reference.jpg",
    "source_url": "https://commons.wikimedia.org/wiki/File:Streetview_of_Dong_Khoi_Street_and_Lam_Son_Square_in_Ho_Chi_Minh_City.jpg",
    "author": "HĐ",
    "license": "CC BY-SA 4.0",
    "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
    "photo_date": "2016-11-19 12:37:21",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def coefficients(quad: list[list[float]], width: int, height: int, size: int) -> list[float]:
    matrix: list[list[float]] = []
    corners = [(0, 0), (size - 1, 0), (size - 1, size - 1), (0, size - 1)]
    for (x, y), (u, v) in zip(corners, quad):
        u *= width
        v *= height
        matrix.extend(
            [
                [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
                [0, 0, 0, x, y, 1, -v * x, -v * y, v],
            ]
        )
    for column in range(8):
        pivot = max(range(column, 8), key=lambda row: abs(matrix[row][column]))
        matrix[column], matrix[pivot] = matrix[pivot], matrix[column]
        divisor = matrix[column][column]
        if abs(divisor) <= 1e-10:
            raise ValueError("Degenerate perspective selection")
        matrix[column] = [value / divisor for value in matrix[column]]
        for row in range(8):
            if row == column:
                continue
            factor = matrix[row][column]
            matrix[row] = [a - factor * b for a, b in zip(matrix[row], matrix[column])]
    return [matrix[index][8] for index in range(8)]


def make_reference(image: Image.Image, output: Path, max_width: int = 1280) -> list[int]:
    copy = image.copy()
    if copy.width > max_width:
        copy.thumbnail((max_width, 1600), Image.Resampling.LANCZOS)
    copy.save(output, quality=88, optimize=True, progressive=True)
    return list(copy.size)


def main() -> None:
    selection_data = json.loads(SELECTIONS.read_text())
    selections = {entry["key"]: entry for entry in selection_data["entries"]}
    receipts = []
    for key, config in SOURCES.items():
        with Image.open(config["source"]) as opened:
            image = opened.convert("RGB")
            source_dimensions = list(image.size)
            size = config["size"]
            transform = coefficients(selections[key]["quad"], *image.size, size)
            rectified = image.transform(
                (size, size), Image.Transform.PERSPECTIVE, transform, Image.Resampling.BICUBIC
            )
            # Mild contrast compensation only; geometry and photographed content remain unchanged.
            rectified = ImageEnhance.Contrast(rectified).enhance(1.03)
            rectified.save(config["texture"], quality=94, optimize=True, progressive=True)
            reference_dimensions = make_reference(image, config["reference"])
        receipts.append(
            {
                "key": key,
                "building_id": selections[key]["building_id"],
                "source_url": config["source_url"],
                "author": config["author"],
                "license": config["license"],
                "license_url": config["license_url"],
                "photo_date": config["photo_date"],
                "source_dimensions": source_dimensions,
                "texture_dimensions": [size, size],
                "reference_dimensions": reference_dimensions,
                "source_sha256": sha256(config["source"]),
                "texture_sha256": sha256(config["texture"]),
                "quad_normalized": selections[key]["quad"],
                "transform": "Four-corner perspective rectification from original Commons pixels; 3% contrast compensation; no inpainting or generated fill.",
            }
        )

    with Image.open(LAMSON["source"]) as opened:
        image = opened.convert("RGB")
        lamson_dimensions = list(image.size)
        reference_dimensions = make_reference(image, LAMSON["reference"])
    receipts.append(
        {
            "key": "lamson-dongkhoi",
            "road_source_ids": [35112941, 35114970, 287132223, 1278461438, 1278461439, 1343964589],
            "source_url": LAMSON["source_url"],
            "author": LAMSON["author"],
            "license": LAMSON["license"],
            "license_url": LAMSON["license_url"],
            "photo_date": LAMSON["photo_date"],
            "source_dimensions": lamson_dimensions,
            "reference_dimensions": reference_dimensions,
            "source_sha256": sha256(LAMSON["source"]),
            "reference_sha256": sha256(LAMSON["reference"]),
            "transform": "Downsampled reference only; no pixel generation. Street geometry uses archived OSM linework.",
        }
    )
    receipt = {
        "version": "20b-1",
        "classification": "sourced_photos_and_open_map_anchors_with_explicit_approximations",
        "assets": receipts,
        "geometry_policy": {
            "continental": "Mapped facade and 24 m manifest envelope; facade relief is photo-derived approximation.",
            "caravelle_low_wing": "Mapped facade and 30 m source height.",
            "caravelle_tower": "24 storeys from Caravelle official history; visual dimensions and placement are approximate, not surveyed.",
            "lamson_dongkhoi": "Archived OSM road centerlines; widths, paving, furniture and planting are illustrative proxies.",
            "planning_geometry_enabled": False,
        },
    }
    RESEARCH.mkdir(parents=True, exist_ok=True)
    (RESEARCH / "asset-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
