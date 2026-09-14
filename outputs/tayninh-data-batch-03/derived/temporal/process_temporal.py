#!/usr/bin/env python3
"""Create Batch 03 temporal Sentinel-2 derivatives and QA.

The script intentionally uses only local provider bytes plus lightweight TIFF/Pillow
tools so the derived artifacts can be reproduced without a GIS runtime.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, TiffImagePlugin


BATCH03 = Path(__file__).resolve().parents[2]
ROOT = BATCH03.parents[1]
BATCH02 = ROOT / "outputs" / "tayninh-data-batch-02"

SOURCES = BATCH03 / "sources" / "temporal"
RAW = BATCH03 / "raw" / "temporal"
DERIVED = BATCH03 / "derived" / "temporal"

ITEM_NEW_ID = "S2A_T48PXT_20241220T032629_L2A"
ITEM_OLD_ID = "S2B_T48PXT_20251130T033239_L2A"

NEW_TCI_SOURCE = RAW / f"{ITEM_NEW_ID}_TCI.tif"
NEW_SCL_SOURCE = RAW / f"{ITEM_NEW_ID}_SCL.tif"
OLD_TCI_DERIVED = BATCH02 / "derived" / "surface" / "sentinel-2-20251130-aoi-tci.tif"
OLD_SCL_DERIVED = BATCH02 / "derived" / "surface" / "sentinel-2-20251130-aoi-scl.tif"

TCI_WINDOW = (4499, 7120, 4829, 7454)
TCI_BOUNDS = (644990.0, 1225480.0, 648290.0, 1228820.0)
TCI_DIMS = (330, 334)
SCL_WINDOW = (2249, 3560, 2415, 3727)
SCL_BOUNDS = (644980.0, 1225480.0, 648300.0, 1228820.0)
SCL_DIMS = (166, 167)
AOI_WGS84 = (106.3276338, 11.0830401, 106.3576338, 11.1130401)
TCI_ENVELOPE_WGS84 = (
    106.32747646376076,
    11.08286805681983,
    106.3578237405214,
    11.113201106075287,
)
SCL_ENVELOPE_WGS84 = (
    106.327384924434,
    11.082867644886191,
    106.35791528806256,
    11.113201509946908,
)

SCL_CLASSES = {
    0: "No data",
    1: "Saturated or defective",
    2: "Dark area pixels",
    3: "Cloud shadows",
    4: "Vegetation",
    5: "Not vegetated",
    6: "Water",
    7: "Unclassified",
    8: "Cloud medium probability",
    9: "Cloud high probability",
    10: "Thin cirrus",
    11: "Snow or ice",
}

SCL_COLORS = {
    0: (0, 0, 0),
    1: (255, 0, 0),
    2: (47, 47, 47),
    3: (100, 50, 0),
    4: (0, 160, 0),
    5: (255, 230, 90),
    6: (0, 0, 255),
    7: (128, 128, 128),
    8: (192, 192, 192),
    9: (255, 255, 255),
    10: (100, 200, 255),
    11: (255, 150, 255),
}

BAD_SCL_CODES = {0, 1, 3, 7, 8, 9, 10, 11}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_window(source: Path, destination: Path, window: tuple[int, int, int, int]) -> None:
    col0, row0, col1, row1 = window
    subprocess.run(
        [
            "tiffcrop",
            "-k",
            "0",
            "-N",
            "1",
            "-U",
            "px",
            "-z",
            f"{col0},{row0},{col1 - 1},{row1 - 1}",
            str(source),
            str(destination),
        ],
        check=True,
    )


def source_geo_tags(source: Path) -> dict[int, object]:
    with Image.open(source) as image:
        tags = image.tag_v2
        return {
            key: tags[key]
            for key in (34735, 34736, 34737)
            if key in tags
        }


def write_geotiff(
    image: Image.Image,
    destination: Path,
    source: Path,
    pixel_size: float,
    bounds: tuple[float, float, float, float],
    metadata_xml: str,
) -> None:
    geo = source_geo_tags(source)
    info = TiffImagePlugin.ImageFileDirectory_v2()
    info[33550] = (pixel_size, pixel_size, 0.0)
    info[33922] = (0.0, 0.0, 0.0, bounds[0], bounds[3], 0.0)
    for key, value in geo.items():
        info[key] = value
    info[42112] = metadata_xml
    info[42113] = "0"
    image.save(destination, compression="tiff_deflate", tiffinfo=info)


def write_world_file(path: Path, pixel_size: float, bounds: tuple[float, float, float, float]) -> None:
    path.write_text(
        "\n".join(
            [
                f"{pixel_size:.15f}",
                "0.0",
                "0.0",
                f"{-pixel_size:.15f}",
                f"{bounds[0] + pixel_size / 2:.15f}",
                f"{bounds[3] - pixel_size / 2:.15f}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def copy_with_world_prj(source_stem: Path, dest_stem: Path) -> None:
    for suffix in (".tif", ".png", ".pgw", ".prj"):
        shutil.copy2(source_stem.with_suffix(suffix), dest_stem.with_suffix(suffix))


def distribution(array: np.ndarray) -> list[dict[str, object]]:
    values, counts = np.unique(array, return_counts=True)
    total = int(array.size)
    rows: list[dict[str, object]] = []
    for value, count in zip(values, counts):
        rows.append(
            {
                "code": int(value),
                "name": SCL_CLASSES.get(int(value), "Unknown class"),
                "pixels": int(count),
                "percent_of_all_pixels": round(100 * int(count) / total, 6),
            }
        )
    return rows


def render_scl(array: np.ndarray, destination: Path) -> None:
    rgb = np.zeros((array.shape[0], array.shape[1], 3), dtype=np.uint8)
    for code, color in SCL_COLORS.items():
        rgb[array == code] = color
    Image.fromarray(rgb, mode="RGB").save(destination)


def upsample_scl_to_tci(scl: np.ndarray) -> np.ndarray:
    rows, cols = TCI_DIMS[1], TCI_DIMS[0]
    result = np.zeros((rows, cols), dtype=np.uint8)
    for r in range(rows):
        y = TCI_BOUNDS[3] - (r + 0.5) * 10.0
        sr = int(np.floor((SCL_BOUNDS[3] - y) / 20.0))
        sr = min(max(sr, 0), scl.shape[0] - 1)
        for c in range(cols):
            x = TCI_BOUNDS[0] + (c + 0.5) * 10.0
            sc = int(np.floor((x - SCL_BOUNDS[0]) / 20.0))
            sc = min(max(sc, 0), scl.shape[1] - 1)
            result[r, c] = scl[sr, sc]
    return result


def heat_color(values: np.ndarray, valid: np.ndarray, threshold_moderate: float, threshold_strong: float) -> np.ndarray:
    rgb = np.zeros((values.shape[0], values.shape[1], 3), dtype=np.uint8)
    rgb[~valid] = (48, 48, 48)
    safe = np.clip(values, 0.0, 1.0)
    low = valid & (safe < threshold_moderate)
    mid = valid & (safe >= threshold_moderate) & (safe < threshold_strong)
    high = valid & (safe >= threshold_strong)
    rgb[low, 2] = np.clip((safe[low] / max(threshold_moderate, 1e-6)) * 180, 0, 180).astype(np.uint8)
    span = max(threshold_strong - threshold_moderate, 1e-6)
    midv = (safe[mid] - threshold_moderate) / span
    rgb[mid, 0] = np.clip(255 * midv, 0, 255).astype(np.uint8)
    rgb[mid, 1] = np.clip(220 * midv, 0, 220).astype(np.uint8)
    rgb[mid, 2] = np.clip(180 * (1 - midv), 0, 180).astype(np.uint8)
    rgb[high, 0] = 255
    rgb[high, 1] = np.clip(80 * (1 - safe[high]), 0, 80).astype(np.uint8)
    return rgb


def mask_visual(valid: np.ndarray, moderate: np.ndarray, strong: np.ndarray) -> np.ndarray:
    rgb = np.zeros((valid.shape[0], valid.shape[1], 3), dtype=np.uint8)
    rgb[~valid] = (72, 72, 72)
    rgb[valid] = (25, 100, 70)
    rgb[moderate] = (220, 170, 0)
    rgb[strong] = (220, 30, 30)
    return rgb


def stats_rgb(name: str, array: np.ndarray) -> dict[str, object]:
    return {
        "name": name,
        "band_min_rgb": [int(value) for value in np.min(array, axis=(0, 1))],
        "band_max_rgb": [int(value) for value in np.max(array, axis=(0, 1))],
        "band_mean_rgb": [round(float(value), 6) for value in np.mean(array, axis=(0, 1))],
        "all_band_nodata_pixels": int(np.count_nonzero(np.all(array == 0, axis=2))),
    }


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    DERIVED.mkdir(parents=True, exist_ok=True)

    old_stem = BATCH02 / "derived" / "surface" / "sentinel-2-20251130-aoi-tci"
    copy_with_world_prj(old_stem, DERIVED / "sentinel-2-20251130-reference-aoi-tci")
    old_scl_stem = BATCH02 / "derived" / "surface" / "sentinel-2-20251130-aoi-scl"
    copy_with_world_prj(old_scl_stem, DERIVED / "sentinel-2-20251130-reference-aoi-scl")

    tci_extract = DERIVED / ".sentinel-20241220-tci-extract.tif"
    extract_window(NEW_TCI_SOURCE, tci_extract, TCI_WINDOW)
    with Image.open(tci_extract) as image:
        image.load()
        if image.size != TCI_DIMS:
            raise RuntimeError(f"TCI extract size {image.size} != {TCI_DIMS}")
        new_tci_array = np.asarray(image.convert("RGB"))
        write_geotiff(
            image.convert("RGB"),
            DERIVED / "sentinel-2-20241220-aoi-tci.tif",
            NEW_TCI_SOURCE,
            10.0,
            TCI_BOUNDS,
            '<GDALMetadata><Item name="source">S2A_T48PXT_20241220T032629_L2A TCI</Item><Item name="subset">Gia Loc pilot AOI Batch02-aligned envelope</Item><Item name="product_crs">EPSG:32648</Item></GDALMetadata>',
        )
        image.convert("RGB").save(DERIVED / "sentinel-2-20241220-aoi-tci.png")
    tci_extract.unlink()
    write_world_file(DERIVED / "sentinel-2-20241220-aoi-tci.pgw", 10.0, TCI_BOUNDS)
    (DERIVED / "sentinel-2-20241220-aoi-tci.prj").write_text("EPSG:32648\n", encoding="utf-8")

    scl_extract = DERIVED / ".sentinel-20241220-scl-extract.tif"
    extract_window(NEW_SCL_SOURCE, scl_extract, SCL_WINDOW)
    with Image.open(scl_extract) as image:
        image.load()
        if image.size != SCL_DIMS:
            raise RuntimeError(f"SCL extract size {image.size} != {SCL_DIMS}")
        new_scl_array = np.asarray(image)
        write_geotiff(
            image,
            DERIVED / "sentinel-2-20241220-aoi-scl.tif",
            NEW_SCL_SOURCE,
            20.0,
            SCL_BOUNDS,
            '<GDALMetadata><Item name="source">S2A_T48PXT_20241220T032629_L2A SCL</Item><Item name="subset">Gia Loc pilot AOI Batch02-aligned envelope</Item><Item name="product_crs">EPSG:32648</Item></GDALMetadata>',
        )
        render_scl(new_scl_array, DERIVED / "sentinel-2-20241220-aoi-scl.png")
    scl_extract.unlink()
    write_world_file(DERIVED / "sentinel-2-20241220-aoi-scl.pgw", 20.0, SCL_BOUNDS)
    (DERIVED / "sentinel-2-20241220-aoi-scl.prj").write_text("EPSG:32648\n", encoding="utf-8")

    with Image.open(OLD_TCI_DERIVED) as image:
        old_tci_array = np.asarray(image.convert("RGB"))
    with Image.open(OLD_SCL_DERIVED) as image:
        old_scl_array = np.asarray(image)
    if old_tci_array.shape != new_tci_array.shape:
        raise RuntimeError(f"TCI alignment failed: old {old_tci_array.shape}, new {new_tci_array.shape}")
    if old_scl_array.shape != new_scl_array.shape:
        raise RuntimeError(f"SCL alignment failed: old {old_scl_array.shape}, new {new_scl_array.shape}")

    old_scl_up = upsample_scl_to_tci(old_scl_array)
    new_scl_up = upsample_scl_to_tci(new_scl_array)
    old_bad = np.isin(old_scl_up, list(BAD_SCL_CODES))
    new_bad = np.isin(new_scl_up, list(BAD_SCL_CODES))
    old_nodata = np.all(old_tci_array == 0, axis=2)
    new_nodata = np.all(new_tci_array == 0, axis=2)
    valid = ~(old_bad | new_bad | old_nodata | new_nodata)

    old_float = old_tci_array.astype(np.float32)
    new_float = new_tci_array.astype(np.float32)
    rgb_distance = np.sqrt(np.sum((new_float - old_float) ** 2, axis=2)) / (np.sqrt(3.0) * 255.0)
    luma_old = (0.2126 * old_float[:, :, 0] + 0.7152 * old_float[:, :, 1] + 0.0722 * old_float[:, :, 2]) / 255.0
    luma_new = (0.2126 * new_float[:, :, 0] + 0.7152 * new_float[:, :, 1] + 0.0722 * new_float[:, :, 2]) / 255.0
    luma_delta = np.abs(luma_new - luma_old)

    valid_scores = rgb_distance[valid]
    threshold_moderate = float(max(0.12, np.percentile(valid_scores, 90))) if valid_scores.size else 0.12
    threshold_strong = float(max(0.18, np.percentile(valid_scores, 95))) if valid_scores.size else 0.18
    moderate = valid & (rgb_distance >= threshold_moderate) & (luma_delta >= 0.05)
    strong = valid & (rgb_distance >= threshold_strong) & (luma_delta >= 0.08)

    diff_u8 = np.clip(np.round(rgb_distance * 255), 0, 255).astype(np.uint8)
    diff_image = Image.fromarray(diff_u8, mode="L")
    write_geotiff(
        diff_image,
        DERIVED / "sentinel-2-20241220-vs-20251130-rgb-distance.tif",
        NEW_TCI_SOURCE,
        10.0,
        TCI_BOUNDS,
        '<GDALMetadata><Item name="algorithm">normalized RGB Euclidean distance, SCL/nodata masked</Item><Item name="subset">Gia Loc pilot AOI Batch02-aligned envelope</Item><Item name="product_crs">EPSG:32648</Item></GDALMetadata>',
    )
    Image.fromarray(heat_color(rgb_distance, valid, threshold_moderate, threshold_strong), mode="RGB").save(
        DERIVED / "sentinel-2-20241220-vs-20251130-change-heatmap.png"
    )
    Image.fromarray(mask_visual(valid, moderate, strong), mode="RGB").save(
        DERIVED / "sentinel-2-20241220-vs-20251130-mask-candidates.png"
    )
    write_world_file(DERIVED / "sentinel-2-20241220-vs-20251130-change-heatmap.pgw", 10.0, TCI_BOUNDS)
    (DERIVED / "sentinel-2-20241220-vs-20251130-change-heatmap.prj").write_text("EPSG:32648\n", encoding="utf-8")
    write_world_file(DERIVED / "sentinel-2-20241220-vs-20251130-mask-candidates.pgw", 10.0, TCI_BOUNDS)
    (DERIVED / "sentinel-2-20241220-vs-20251130-mask-candidates.prj").write_text("EPSG:32648\n", encoding="utf-8")

    derived_paths = sorted(
        path
        for path in DERIVED.iterdir()
        if path.is_file() and path.name != "process_temporal.py" and not path.name.startswith(".")
    )
    new_scl_dist = distribution(new_scl_array)
    old_scl_dist = distribution(old_scl_array)
    new_counts = {row["code"]: row["pixels"] for row in new_scl_dist}
    old_counts = {row["code"]: row["pixels"] for row in old_scl_dist}
    total_tci_pixels = int(valid.size)
    valid_pixels = int(np.count_nonzero(valid))
    moderate_pixels = int(np.count_nonzero(moderate))
    strong_pixels = int(np.count_nonzero(strong))

    qa = {
        "aoi": {
            "id": "gialoc-pilot-01",
            "requested_bbox_wgs84": list(AOI_WGS84),
            "official_boundary": False,
        },
        "reference_epoch": {
            "item_id": ITEM_OLD_ID,
            "datetime": "2025-11-30T03:34:50.914000Z",
            "source": "Batch02 surface acquired Sentinel-2 L2A derivative",
            "tci_file": str(OLD_TCI_DERIVED.relative_to(ROOT)),
            "tci_sha256": sha256(OLD_TCI_DERIVED),
            "scl_file": str(OLD_SCL_DERIVED.relative_to(ROOT)),
            "scl_sha256": sha256(OLD_SCL_DERIVED),
            "tci_stats": stats_rgb("reference_tci", old_tci_array),
            "scl_distribution": old_scl_dist,
            "scl_cloud_pixels_codes_8_9_10": sum(int(old_counts.get(code, 0)) for code in (8, 9, 10)),
            "scl_shadow_pixels_code_3": int(old_counts.get(3, 0)),
        },
        "candidate_epoch": {
            "item_id": ITEM_NEW_ID,
            "datetime": "2024-12-20T03:34:56.687000Z",
            "tile": "T48PXT",
            "tci_source_file": str(NEW_TCI_SOURCE.relative_to(BATCH03)),
            "tci_source_sha256": sha256(NEW_TCI_SOURCE),
            "scl_source_file": str(NEW_SCL_SOURCE.relative_to(BATCH03)),
            "scl_source_sha256": sha256(NEW_SCL_SOURCE),
            "tci_stats": stats_rgb("candidate_tci", new_tci_array),
            "scl_distribution": new_scl_dist,
            "scl_cloud_pixels_codes_8_9_10": sum(int(new_counts.get(code, 0)) for code in (8, 9, 10)),
            "scl_shadow_pixels_code_3": int(new_counts.get(3, 0)),
        },
        "grid_alignment": {
            "crs": "EPSG:32648",
            "tci_dimensions": list(TCI_DIMS),
            "tci_bounds_epsg32648": list(TCI_BOUNDS),
            "tci_envelope_wgs84": list(TCI_ENVELOPE_WGS84),
            "tci_pixel_size_m": [10.0, 10.0],
            "scl_dimensions": list(SCL_DIMS),
            "scl_bounds_epsg32648": list(SCL_BOUNDS),
            "scl_envelope_wgs84": list(SCL_ENVELOPE_WGS84),
            "scl_pixel_size_m": [20.0, 20.0],
            "alignment_check": "PASS: candidate epoch uses the same tile transform, crop windows, dimensions and EPSG:32648 bounds as Batch02 Sentinel derivatives.",
        },
        "masking": {
            "bad_scl_codes": sorted(BAD_SCL_CODES),
            "bad_scl_code_meanings": {str(code): SCL_CLASSES[code] for code in sorted(BAD_SCL_CODES)},
            "total_tci_pixels": total_tci_pixels,
            "valid_comparison_pixels": valid_pixels,
            "valid_comparison_percent": round(100 * valid_pixels / total_tci_pixels, 6),
            "masked_pixels": total_tci_pixels - valid_pixels,
            "masked_percent": round(100 * (total_tci_pixels - valid_pixels) / total_tci_pixels, 6),
            "old_tci_nodata_pixels": int(np.count_nonzero(old_nodata)),
            "new_tci_nodata_pixels": int(np.count_nonzero(new_nodata)),
            "old_scl_bad_pixels_on_tci_grid": int(np.count_nonzero(old_bad)),
            "new_scl_bad_pixels_on_tci_grid": int(np.count_nonzero(new_bad)),
        },
        "difference_algorithm": {
            "name": "masked_rgb_distance",
            "formula": "sqrt((dR^2+dG^2+dB^2))/(sqrt(3)*255) using TCI uint8 RGB, after combined old/new SCL and all-band nodata masks",
            "luma_formula": "abs(0.2126*dR + 0.7152*dG + 0.0722*dB)/255 used as a secondary threshold",
            "moderate_threshold_rgb_distance": round(threshold_moderate, 6),
            "moderate_threshold_luma_delta": 0.05,
            "strong_threshold_rgb_distance": round(threshold_strong, 6),
            "strong_threshold_luma_delta": 0.08,
            "valid_score_min": round(float(np.min(valid_scores)), 6) if valid_scores.size else None,
            "valid_score_mean": round(float(np.mean(valid_scores)), 6) if valid_scores.size else None,
            "valid_score_p50": round(float(np.percentile(valid_scores, 50)), 6) if valid_scores.size else None,
            "valid_score_p90": round(float(np.percentile(valid_scores, 90)), 6) if valid_scores.size else None,
            "valid_score_p95": round(float(np.percentile(valid_scores, 95)), 6) if valid_scores.size else None,
            "valid_score_max": round(float(np.max(valid_scores)), 6) if valid_scores.size else None,
        },
        "candidate_difference_pixels": {
            "moderate_or_stronger_pixels": moderate_pixels,
            "moderate_or_stronger_percent_of_valid": round(100 * moderate_pixels / valid_pixels, 6) if valid_pixels else None,
            "strong_pixels": strong_pixels,
            "strong_percent_of_valid": round(100 * strong_pixels / valid_pixels, 6) if valid_pixels else None,
            "non_claim": "Pixels are candidate Sentinel-resolution spectral differences only; they are not building detections, new construction, violations, or ground truth.",
        },
        "derived_files": {
            str(path.relative_to(BATCH03)): {
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in derived_paths
        },
    }
    (DERIVED / "temporal-aoi-qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

