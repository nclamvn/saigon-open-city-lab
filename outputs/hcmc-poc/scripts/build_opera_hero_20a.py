#!/usr/bin/env python3
"""Build the Opera House HD identity texture from the reviewed source quad.

The operation is deterministic perspective rectification only. It does not
inpaint, sharpen with generated pixels, or alter architectural content.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/hero20/opera-hd-source.jpg"
OUTPUT = ROOT / "assets/hero20/opera-arch-rectified-hd.jpg"
RECEIPT = ROOT / "research/hero20/opera-hd-receipt.json"
SELECTIONS = ROOT / "research/facades-15/selections.json"
OUTPUT_SIZE = 1600


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def perspective_coefficients(quad: list[list[float]], width: int, height: int, size: int) -> list[float]:
    matrix: list[list[float]] = []
    output_corners = [(0, 0), (size - 1, 0), (size - 1, size - 1), (0, size - 1)]
    for (x, y), (u, v) in zip(output_corners, quad):
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


def main() -> None:
    selection_data = json.loads(SELECTIONS.read_text())
    opera = next(entry for entry in selection_data["entries"] if entry["key"] == "opera")
    with Image.open(SOURCE) as source_image:
        image = source_image.convert("RGB")
        coefficients = perspective_coefficients(opera["quad"], *image.size, OUTPUT_SIZE)
        rectified = image.transform(
            (OUTPUT_SIZE, OUTPUT_SIZE),
            Image.Transform.PERSPECTIVE,
            coefficients,
            Image.Resampling.BICUBIC,
        )
        rectified.save(OUTPUT, quality=94, optimize=True, progressive=True)
        source_dimensions = list(image.size)

    receipt = {
        "version": "20a-hd1",
        "asset": "Nhà hát Thành phố · central sourced identity patch",
        "source_url": "https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_Opera_House.jpg",
        "download_url": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ho%20Chi%20Minh%20City%20Opera%20House.jpg",
        "author": "HĐ",
        "license": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
        "photo_date": "2016-11-19",
        "source_dimensions": source_dimensions,
        "derived_dimensions": [OUTPUT_SIZE, OUTPUT_SIZE],
        "source_sha256": sha256(SOURCE),
        "derived_sha256": sha256(OUTPUT),
        "quad_normalized": opera["quad"],
        "transform": "Four-corner perspective rectification from original Commons pixels; no inpainting or generated fill.",
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
