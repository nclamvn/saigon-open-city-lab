#!/usr/bin/env python3
"""Create deterministic AOI subsets and QA for Batch 03 ecosystem rasters."""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, TiffImagePlugin


BASE = Path(__file__).resolve().parents[2]
RAW = BASE / "raw" / "ecosystem"
DERIVED = BASE / "derived" / "ecosystem"
AOI_WGS84 = (106.3276338, 11.0830401, 106.3576338, 11.1130401)
EPSG4326_PRJ = (
    'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,'
    '298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],'
    'AUTHORITY["EPSG","4326"]]\n'
)

ETH_HEIGHT = RAW / "ETH_GlobalCanopyHeight_10m_2020_N09E105_Map.tif"
ETH_UNCERTAINTY = RAW / "ETH_GlobalCanopyHeight_10m_2020_N09E105_Map_SD.tif"
JRC_OCCURRENCE = RAW / "jrc-occurrence_100E_20N_v1_5_2024.tif"
JRC_SEASONALITY = RAW / "jrc-seasonality_100E_20N_v1_5_2024.tif"
JRC_CHANGE = RAW / "jrc-change_100E_20N_v1_5_2024.tif"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_window(
    bounds: tuple[float, float, float, float],
    origin_x: float,
    origin_y: float,
    pixel_size: float,
) -> tuple[int, int, int, int]:
    min_x, min_y, max_x, max_y = bounds
    return (
        math.floor((min_x - origin_x) / pixel_size),
        math.floor((origin_y - max_y) / pixel_size),
        math.ceil((max_x - origin_x) / pixel_size),
        math.ceil((origin_y - min_y) / pixel_size),
    )


def aligned_bounds(
    window: tuple[int, int, int, int],
    origin_x: float,
    origin_y: float,
    pixel_size: float,
) -> tuple[float, float, float, float]:
    col0, row0, col1, row1 = window
    return (
        origin_x + col0 * pixel_size,
        origin_y - row1 * pixel_size,
        origin_x + col1 * pixel_size,
        origin_y - row0 * pixel_size,
    )


def extract_window(source: Path, destination: Path, window: tuple[int, int, int, int]) -> None:
    col0, row0, col1, row1 = window
    subprocess.run(
        [
            "tiffcrop",
            "-k",
            "0",
            "-c",
            "lzw:2",
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
        return {
            key: image.tag_v2[key]
            for key in (34735, 34736, 34737)
            if key in image.tag_v2
        }


def write_geotiff(
    array: np.ndarray,
    destination: Path,
    source: Path,
    pixel_size: float,
    bounds: tuple[float, float, float, float],
    nodata: int,
    source_label: str,
) -> None:
    info = TiffImagePlugin.ImageFileDirectory_v2()
    info[33550] = (pixel_size, pixel_size, 0.0)
    info[33922] = (0.0, 0.0, 0.0, bounds[0], bounds[3], 0.0)
    for key, value in source_geo_tags(source).items():
        info[key] = value
    info[42112] = (
        '<GDALMetadata><Item name="source">'
        + source_label
        + '</Item><Item name="subset">Gia Loc pilot AOI pixel-aligned envelope</Item>'
        + '<Item name="product_crs">EPSG:4326</Item></GDALMetadata>'
    )
    info[42113] = str(nodata)
    Image.fromarray(array.astype(np.uint8), mode="L").save(
        destination, compression="tiff_deflate", tiffinfo=info
    )


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


def write_sidecars(stem: str, pixel_size: float, bounds: tuple[float, float, float, float]) -> None:
    write_world_file(DERIVED / f"{stem}.pgw", pixel_size, bounds)
    (DERIVED / f"{stem}.prj").write_text(EPSG4326_PRJ, encoding="utf-8")


def values_distribution(array: np.ndarray) -> list[dict[str, object]]:
    values, counts = np.unique(array, return_counts=True)
    total = int(array.size)
    return [
        {
            "value": int(value),
            "pixels": int(count),
            "percent_of_all_pixels": round(100 * int(count) / total, 6),
        }
        for value, count in zip(values, counts)
    ]


def numeric_stats(array: np.ndarray, valid_mask: np.ndarray) -> dict[str, object]:
    values = array[valid_mask].astype(np.float64)
    if not values.size:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None, "std": None}
    return {
        "count": int(values.size),
        "min": int(values.min()),
        "max": int(values.max()),
        "mean": round(float(values.mean()), 6),
        "median": round(float(np.median(values)), 6),
        "std": round(float(values.std()), 6),
    }


def gradient(array: np.ndarray, stops: list[tuple[int, tuple[int, int, int]]], alpha: np.ndarray) -> Image.Image:
    rgb = np.zeros((*array.shape, 3), dtype=np.uint8)
    values = array.astype(np.float64)
    for index in range(len(stops) - 1):
        low_value, low_color = stops[index]
        high_value, high_color = stops[index + 1]
        if index == len(stops) - 2:
            mask = (values >= low_value) & (values <= high_value)
        else:
            mask = (values >= low_value) & (values < high_value)
        if not np.any(mask):
            continue
        span = high_value - low_value
        weight = np.clip((values[mask] - low_value) / span, 0, 1)[:, None]
        start = np.array(low_color, dtype=np.float64)
        end = np.array(high_color, dtype=np.float64)
        rgb[mask] = np.rint(start + weight * (end - start)).astype(np.uint8)
    rgba = np.dstack([rgb, alpha.astype(np.uint8)])
    return Image.fromarray(rgba, mode="RGBA")


def read_extract(source: Path, window: tuple[int, int, int, int], label: str) -> np.ndarray:
    temporary = DERIVED / f".{label}-extract.tif"
    extract_window(source, temporary, window)
    try:
        with Image.open(temporary) as image:
            image.load()
            array = np.asarray(image)
            if array.ndim != 2:
                raise RuntimeError(f"{label} extract has unexpected array shape {array.shape}")
            expected = (window[3] - window[1], window[2] - window[0])
            if array.shape != expected:
                raise RuntimeError(f"{label} extract shape {array.shape} != {expected}")
            return array.copy()
    finally:
        temporary.unlink(missing_ok=True)


def emit_layer(
    *,
    stem: str,
    source: Path,
    source_label: str,
    array: np.ndarray,
    pixel_size: float,
    bounds: tuple[float, float, float, float],
    nodata: int,
    browser_image: Image.Image,
) -> list[Path]:
    tif = DERIVED / f"{stem}.tif"
    png = DERIVED / f"{stem}.png"
    write_geotiff(array, tif, source, pixel_size, bounds, nodata, source_label)
    browser_image.save(png, optimize=True)
    write_sidecars(stem, pixel_size, bounds)
    return [tif, png, DERIVED / f"{stem}.pgw", DERIVED / f"{stem}.prj"]


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    DERIVED.mkdir(parents=True, exist_ok=True)

    eth_pixel = 1 / 12000
    eth_window = pixel_window(AOI_WGS84, 105.0, 12.0, eth_pixel)
    eth_bounds = aligned_bounds(eth_window, 105.0, 12.0, eth_pixel)
    canopy = read_extract(ETH_HEIGHT, eth_window, "eth-canopy")
    uncertainty = read_extract(ETH_UNCERTAINTY, eth_window, "eth-uncertainty")

    canopy_valid = canopy != 255
    uncertainty_valid = uncertainty != 255
    canopy_png = gradient(
        canopy,
        [(0, (242, 232, 199)), (3, (187, 210, 139)), (10, (77, 155, 83)), (25, (18, 93, 64)), (80, (3, 48, 34)), (254, (3, 48, 34))],
        np.where(canopy_valid, 255, 0),
    )
    uncertainty_png = gradient(
        uncertainty,
        [(0, (247, 252, 245)), (5, (199, 233, 192)), (10, (116, 196, 118)), (20, (35, 139, 69)), (40, (0, 90, 50)), (254, (0, 40, 20))],
        np.where(uncertainty_valid, 255, 0),
    )

    derivative_files: list[Path] = []
    derivative_files += emit_layer(
        stem="eth-canopy-height-2020-aoi",
        source=ETH_HEIGHT,
        source_label="ETH Global Canopy Height 10 m 2020 N09E105 Map",
        array=canopy,
        pixel_size=eth_pixel,
        bounds=eth_bounds,
        nodata=255,
        browser_image=canopy_png,
    )
    derivative_files += emit_layer(
        stem="eth-canopy-height-2020-uncertainty-aoi",
        source=ETH_UNCERTAINTY,
        source_label="ETH Global Canopy Height 10 m 2020 N09E105 standard deviation",
        array=uncertainty,
        pixel_size=eth_pixel,
        bounds=eth_bounds,
        nodata=255,
        browser_image=uncertainty_png,
    )

    jrc_pixel = 0.00025
    jrc_window = pixel_window(AOI_WGS84, 100.0, 20.0, jrc_pixel)
    jrc_bounds = aligned_bounds(jrc_window, 100.0, 20.0, jrc_pixel)
    occurrence = read_extract(JRC_OCCURRENCE, jrc_window, "jrc-occurrence")
    seasonality = read_extract(JRC_SEASONALITY, jrc_window, "jrc-seasonality")
    change = read_extract(JRC_CHANGE, jrc_window, "jrc-change")

    occurrence_valid = occurrence <= 100
    seasonality_valid = seasonality <= 12
    change_valid = change <= 200
    occurrence_png = gradient(
        occurrence,
        [(0, (245, 245, 240)), (1, (255, 204, 229)), (25, (224, 128, 210)), (50, (154, 92, 190)), (75, (78, 82, 180)), (100, (0, 55, 180))],
        np.where(occurrence != 255, 255, 0),
    )
    seasonality_png = gradient(
        seasonality,
        [(0, (245, 245, 240)), (1, (153, 217, 234)), (6, (65, 150, 210)), (12, (0, 0, 170))],
        np.where(seasonality != 255, 255, 0),
    )
    change_rgb = np.zeros((*change.shape, 4), dtype=np.uint8)
    lower = change <= 100
    upper = (change > 100) & (change <= 200)
    change_rgb[lower, :3] = np.column_stack(
        [np.full(np.count_nonzero(lower), 255), change[lower] * 2.55, change[lower] * 2.55]
    ).astype(np.uint8)
    change_rgb[upper, :3] = np.column_stack(
        [(200 - change[upper]) * 2.55, np.full(np.count_nonzero(upper), 190), (200 - change[upper]) * 2.0]
    ).astype(np.uint8)
    change_rgb[change == 253, :3] = (245, 245, 240)
    change_rgb[change == 254, :3] = (136, 136, 136)
    change_rgb[change != 255, 3] = 255
    change_png = Image.fromarray(change_rgb, mode="RGBA")

    derivative_files += emit_layer(
        stem="jrc-water-occurrence-1984-2024-aoi",
        source=JRC_OCCURRENCE,
        source_label="JRC Global Surface Water occurrence 1984-2024 v1.5 tile 100E_20N",
        array=occurrence,
        pixel_size=jrc_pixel,
        bounds=jrc_bounds,
        nodata=255,
        browser_image=occurrence_png,
    )
    derivative_files += emit_layer(
        stem="jrc-water-seasonality-2024-aoi",
        source=JRC_SEASONALITY,
        source_label="JRC Global Surface Water seasonality 2024 v1.5 tile 100E_20N",
        array=seasonality,
        pixel_size=jrc_pixel,
        bounds=jrc_bounds,
        nodata=255,
        browser_image=seasonality_png,
    )
    derivative_files += emit_layer(
        stem="jrc-water-change-1984-1999-vs-2000-2024-aoi",
        source=JRC_CHANGE,
        source_label="JRC Global Surface Water normalized occurrence change intensity 1984-1999 vs 2000-2024 v1.5 tile 100E_20N",
        array=change,
        pixel_size=jrc_pixel,
        bounds=jrc_bounds,
        nodata=255,
        browser_image=change_png,
    )

    qa_file = DERIVED / "ecosystem-aoi-qa.json"
    report = {
        "aoi": {
            "id": "gialoc-pilot-01",
            "requested_bbox_wgs84": list(AOI_WGS84),
            "crs": "EPSG:4326",
            "official_boundary": False,
        },
        "eth_canopy_height_2020": {
            "source_tile": "N09E105",
            "source_bounds": [105.0, 9.0, 108.0, 12.0],
            "source_dimensions": [36000, 36000],
            "source_crs": "EPSG:4326",
            "source_pixel_size_degrees": [eth_pixel, eth_pixel],
            "nominal_ground_sampling_distance_m": 10,
            "source_nodata": 255,
            "crop_window_col0_row0_col1_row1": list(eth_window),
            "derived_pixel_aligned_bounds": list(eth_bounds),
            "derived_dimensions": [int(canopy.shape[1]), int(canopy.shape[0])],
            "height_unit": "metres (integer raster values)",
            "height_valid_pixels": int(np.count_nonzero(canopy_valid)),
            "height_nodata_pixels": int(np.count_nonzero(~canopy_valid)),
            "height_positive_pixels": int(np.count_nonzero(canopy_valid & (canopy > 0))),
            "height_positive_percent_of_valid": round(100 * np.count_nonzero(canopy_valid & (canopy > 0)) / np.count_nonzero(canopy_valid), 6),
            "height_statistics": numeric_stats(canopy, canopy_valid),
            "height_distribution": values_distribution(canopy),
            "uncertainty_measure": "predictive standard deviation",
            "uncertainty_unit": "metres (integer raster values)",
            "uncertainty_valid_pixels": int(np.count_nonzero(uncertainty_valid)),
            "uncertainty_nodata_pixels": int(np.count_nonzero(~uncertainty_valid)),
            "uncertainty_statistics": numeric_stats(uncertainty, uncertainty_valid),
            "uncertainty_distribution": values_distribution(uncertainty),
        },
        "jrc_global_surface_water_v1_5_2024": {
            "source_tile": "100E_20N",
            "source_bounds": [100.0, 10.0, 110.0, 20.0],
            "source_dimensions": [40000, 40000],
            "source_crs": "EPSG:4326",
            "source_pixel_size_degrees": [jrc_pixel, jrc_pixel],
            "nominal_resolution_m": 30,
            "crop_window_col0_row0_col1_row1": list(jrc_window),
            "derived_pixel_aligned_bounds": list(jrc_bounds),
            "derived_dimensions": [int(occurrence.shape[1]), int(occurrence.shape[0])],
            "occurrence": {
                "period": "1984-03 to 2024-12",
                "semantics": "0 not water; 1-100 percent occurrence; 255 no data",
                "valid_pixels": int(np.count_nonzero(occurrence_valid)),
                "nodata_pixels": int(np.count_nonzero(occurrence == 255)),
                "water_pixels_value_1_to_100": int(np.count_nonzero((occurrence >= 1) & (occurrence <= 100))),
                "statistics_including_valid_not_water_zero": numeric_stats(occurrence, occurrence_valid),
                "value_distribution": values_distribution(occurrence),
            },
            "seasonality": {
                "year": 2024,
                "semantics": "0 not water; 1-12 number of months water was present; 255 no data",
                "valid_pixels": int(np.count_nonzero(seasonality_valid)),
                "nodata_pixels": int(np.count_nonzero(seasonality == 255)),
                "water_pixels_value_1_to_12": int(np.count_nonzero((seasonality >= 1) & (seasonality <= 12))),
                "permanent_water_pixels_value_12": int(np.count_nonzero(seasonality == 12)),
                "statistics_including_valid_not_water_zero": numeric_stats(seasonality, seasonality_valid),
                "value_distribution": values_distribution(seasonality),
            },
            "normalized_occurrence_change": {
                "epochs": ["1984-03-16/1999-12-31", "2000-01-01/2024-12-31"],
                "semantics": "TIFF 0-200 maps to -100 to +100 percent; 100 no change; 253 not water; 254 no homologous months; 255 no data",
                "comparable_pixels_value_0_to_200": int(np.count_nonzero(change_valid)),
                "not_water_pixels_value_253": int(np.count_nonzero(change == 253)),
                "no_homologous_months_pixels_value_254": int(np.count_nonzero(change == 254)),
                "nodata_pixels_value_255": int(np.count_nonzero(change == 255)),
                "statistics_tiff_scale_0_to_200": numeric_stats(change, change_valid),
                "value_distribution": values_distribution(change),
            },
        },
    }
    report["derived_sha256"] = {
        str(path.relative_to(BASE)): sha256(path) for path in derivative_files
    }
    qa_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
