#!/usr/bin/env python3
"""Create deterministic AOI subsets and QA for Batch 02 surface rasters."""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, TiffImagePlugin


BASE = Path(__file__).resolve().parents[2]
RAW = BASE / "raw" / "surface"
DERIVED = BASE / "derived" / "surface"
AOI_WGS84 = (106.3276338, 11.0830401, 106.3576338, 11.1130401)

WORLDCOVER_SOURCE = RAW / "ESA_WorldCover_10m_2021_v200_N09E105_Map.tif"
S2_TCI_SOURCE = RAW / "S2B_T48PXT_20251130T033239_L2A_TCI.tif"
S2_SCL_SOURCE = RAW / "S2B_T48PXT_20251130T033239_L2A_SCL.tif"

WORLDCOVER_CLASSES = {
    0: "NoData",
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare / sparse vegetation",
    70: "Snow and ice",
    80: "Permanent water bodies",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss and lichen",
}

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


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utm48n_forward(lon_deg: float, lat_deg: float) -> tuple[float, float]:
    """WGS84 longitude/latitude to UTM zone 48N using EPSG guidance formulas."""
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    k0 = 0.9996
    lon0 = math.radians(105.0)
    lon = math.radians(lon_deg)
    lat = math.radians(lat_deg)
    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)
    tan_lat = math.tan(lat)
    n = a / math.sqrt(1 - e2 * sin_lat * sin_lat)
    t = tan_lat * tan_lat
    c = ep2 * cos_lat * cos_lat
    aa = cos_lat * (lon - lon0)
    m = a * (
        (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * lat
        - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * lat)
        + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * lat)
        - (35 * e2**3 / 3072) * math.sin(6 * lat)
    )
    easting = 500000 + k0 * n * (
        aa
        + (1 - t + c) * aa**3 / 6
        + (5 - 18 * t + t**2 + 72 * c - 58 * ep2) * aa**5 / 120
    )
    northing = k0 * (
        m
        + n
        * tan_lat
        * (
            aa**2 / 2
            + (5 - t + 9 * c + 4 * c**2) * aa**4 / 24
            + (61 - 58 * t + t**2 + 600 * c - 330 * ep2) * aa**6 / 720
        )
    )
    return easting, northing


def utm48n_inverse(easting: float, northing: float) -> tuple[float, float]:
    """UTM zone 48N to WGS84 longitude/latitude."""
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    k0 = 0.9996
    x = easting - 500000.0
    m = northing / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    j1 = 3 * e1 / 2 - 27 * e1**3 / 32
    j2 = 21 * e1**2 / 16 - 55 * e1**4 / 32
    j3 = 151 * e1**3 / 96
    j4 = 1097 * e1**4 / 512
    fp = mu + j1 * math.sin(2 * mu) + j2 * math.sin(4 * mu) + j3 * math.sin(6 * mu) + j4 * math.sin(8 * mu)
    sin_fp = math.sin(fp)
    cos_fp = math.cos(fp)
    tan_fp = math.tan(fp)
    c1 = ep2 * cos_fp**2
    t1 = tan_fp**2
    n1 = a / math.sqrt(1 - e2 * sin_fp**2)
    r1 = a * (1 - e2) / (1 - e2 * sin_fp**2) ** 1.5
    d = x / (n1 * k0)
    lat = fp - (n1 * tan_fp / r1) * (
        d**2 / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * ep2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * ep2 - 3 * c1**2) * d**6 / 720
    )
    lon0 = math.radians(105.0)
    lon = lon0 + (
        d
        - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * ep2 + 24 * t1**2) * d**5 / 120
    ) / cos_fp
    return math.degrees(lon), math.degrees(lat)


def pixel_window(
    bounds: tuple[float, float, float, float],
    origin_x: float,
    origin_y: float,
    pixel_size: float,
) -> tuple[int, int, int, int]:
    min_x, min_y, max_x, max_y = bounds
    col0 = math.floor((min_x - origin_x) / pixel_size)
    col1 = math.ceil((max_x - origin_x) / pixel_size)
    row0 = math.floor((origin_y - max_y) / pixel_size)
    row1 = math.ceil((origin_y - min_y) / pixel_size)
    return col0, row0, col1, row1


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


def distribution(array: np.ndarray, classes: dict[int, str]) -> list[dict[str, object]]:
    values, counts = np.unique(array, return_counts=True)
    total = int(array.size)
    return [
        {
            "code": int(value),
            "name": classes.get(int(value), "Unknown class"),
            "pixels": int(count),
            "percent_of_all_pixels": round(100 * int(count) / total, 6),
        }
        for value, count in zip(values, counts)
    ]


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    DERIVED.mkdir(parents=True, exist_ok=True)

    # WorldCover source is a 3 x 3 degree EPSG:4326 tile with 1/12000 degree pixels.
    wc_pixel = 1 / 12000
    wc_window = pixel_window(AOI_WGS84, 105.0, 12.0, wc_pixel)
    wc_bounds = aligned_bounds(wc_window, 105.0, 12.0, wc_pixel)
    wc_extract = DERIVED / ".worldcover-extract.tif"
    extract_window(WORLDCOVER_SOURCE, wc_extract, wc_window)
    with Image.open(wc_extract) as image:
        image.load()
        expected_size = (wc_window[2] - wc_window[0], wc_window[3] - wc_window[1])
        if image.size != expected_size:
            raise RuntimeError(f"WorldCover extract size {image.size} != {expected_size}")
        wc_array = np.asarray(image)
        wc_tif = DERIVED / "worldcover-2021-aoi.tif"
        wc_png = DERIVED / "worldcover-2021-aoi.png"
        write_geotiff(
            image,
            wc_tif,
            WORLDCOVER_SOURCE,
            wc_pixel,
            wc_bounds,
            '<GDALMetadata><Item name="source">ESA WorldCover 2021 v200 N09E105</Item><Item name="subset">Gia Loc pilot AOI pixel-aligned envelope</Item><Item name="product_crs">EPSG:4326</Item></GDALMetadata>',
        )
        image.save(wc_png)
    wc_extract.unlink()
    write_world_file(DERIVED / "worldcover-2021-aoi.pgw", wc_pixel, wc_bounds)
    (DERIVED / "worldcover-2021-aoi.prj").write_text("EPSG:4326\n", encoding="utf-8")

    # Convert all AOI corners to UTM before deriving an axis-aligned source-grid window.
    west, south, east, north = AOI_WGS84
    utm_corners = [
        utm48n_forward(lon, lat)
        for lon, lat in ((west, south), (west, north), (east, south), (east, north))
    ]
    utm_bounds = (
        min(point[0] for point in utm_corners),
        min(point[1] for point in utm_corners),
        max(point[0] for point in utm_corners),
        max(point[1] for point in utm_corners),
    )

    s2_window = pixel_window(utm_bounds, 600000.0, 1300020.0, 10.0)
    s2_bounds = aligned_bounds(s2_window, 600000.0, 1300020.0, 10.0)
    s2_extract = DERIVED / ".sentinel-tci-extract.tif"
    extract_window(S2_TCI_SOURCE, s2_extract, s2_window)
    with Image.open(s2_extract) as image:
        image.load()
        expected_size = (s2_window[2] - s2_window[0], s2_window[3] - s2_window[1])
        if image.size != expected_size:
            raise RuntimeError(f"Sentinel TCI extract size {image.size} != {expected_size}")
        tci_array = np.asarray(image)
        tci_tif = DERIVED / "sentinel-2-20251130-aoi-tci.tif"
        tci_png = DERIVED / "sentinel-2-20251130-aoi-tci.png"
        write_geotiff(
            image,
            tci_tif,
            S2_TCI_SOURCE,
            10.0,
            s2_bounds,
            '<GDALMetadata><Item name="source">S2B_T48PXT_20251130T033239_L2A TCI</Item><Item name="subset">Gia Loc pilot AOI pixel-aligned envelope</Item><Item name="product_crs">EPSG:32648</Item></GDALMetadata>',
        )
        image.save(tci_png)
    s2_extract.unlink()
    write_world_file(DERIVED / "sentinel-2-20251130-aoi-tci.pgw", 10.0, s2_bounds)
    (DERIVED / "sentinel-2-20251130-aoi-tci.prj").write_text("EPSG:32648\n", encoding="utf-8")

    scl_window = pixel_window(utm_bounds, 600000.0, 1300020.0, 20.0)
    scl_bounds = aligned_bounds(scl_window, 600000.0, 1300020.0, 20.0)
    scl_extract = DERIVED / ".sentinel-scl-extract.tif"
    extract_window(S2_SCL_SOURCE, scl_extract, scl_window)
    with Image.open(scl_extract) as image:
        image.load()
        expected_size = (scl_window[2] - scl_window[0], scl_window[3] - scl_window[1])
        if image.size != expected_size:
            raise RuntimeError(f"Sentinel SCL extract size {image.size} != {expected_size}")
        scl_array = np.asarray(image)
        scl_tif = DERIVED / "sentinel-2-20251130-aoi-scl.tif"
        write_geotiff(
            image,
            scl_tif,
            S2_SCL_SOURCE,
            20.0,
            scl_bounds,
            '<GDALMetadata><Item name="source">S2B_T48PXT_20251130T033239_L2A SCL</Item><Item name="subset">Gia Loc pilot AOI pixel-aligned envelope</Item><Item name="product_crs">EPSG:32648</Item></GDALMetadata>',
        )
        rgb = np.zeros((scl_array.shape[0], scl_array.shape[1], 3), dtype=np.uint8)
        for code, color in SCL_COLORS.items():
            rgb[scl_array == code] = color
        Image.fromarray(rgb, mode="RGB").save(DERIVED / "sentinel-2-20251130-aoi-scl.png")
    scl_extract.unlink()
    write_world_file(DERIVED / "sentinel-2-20251130-aoi-scl.pgw", 20.0, scl_bounds)
    (DERIVED / "sentinel-2-20251130-aoi-scl.prj").write_text("EPSG:32648\n", encoding="utf-8")

    s2_wgs_corners = [
        utm48n_inverse(x, y)
        for x, y in (
            (s2_bounds[0], s2_bounds[1]),
            (s2_bounds[0], s2_bounds[3]),
            (s2_bounds[2], s2_bounds[1]),
            (s2_bounds[2], s2_bounds[3]),
        )
    ]
    s2_wgs_bounds = (
        min(point[0] for point in s2_wgs_corners),
        min(point[1] for point in s2_wgs_corners),
        max(point[0] for point in s2_wgs_corners),
        max(point[1] for point in s2_wgs_corners),
    )
    scl_wgs_corners = [
        utm48n_inverse(x, y)
        for x, y in (
            (scl_bounds[0], scl_bounds[1]),
            (scl_bounds[0], scl_bounds[3]),
            (scl_bounds[2], scl_bounds[1]),
            (scl_bounds[2], scl_bounds[3]),
        )
    ]
    scl_wgs_bounds = (
        min(point[0] for point in scl_wgs_corners),
        min(point[1] for point in scl_wgs_corners),
        max(point[0] for point in scl_wgs_corners),
        max(point[1] for point in scl_wgs_corners),
    )

    scl_dist = distribution(scl_array, SCL_CLASSES)
    scl_counts = {row["code"]: row["pixels"] for row in scl_dist}
    scl_total = int(scl_array.size)
    scl_valid = scl_total - int(scl_counts.get(0, 0))
    cloud_codes = (8, 9, 10)
    cloud_pixels = sum(int(scl_counts.get(code, 0)) for code in cloud_codes)

    derivatives = [
        DERIVED / "worldcover-2021-aoi.tif",
        DERIVED / "worldcover-2021-aoi.png",
        DERIVED / "worldcover-2021-aoi.pgw",
        DERIVED / "worldcover-2021-aoi.prj",
        DERIVED / "sentinel-2-20251130-aoi-tci.tif",
        DERIVED / "sentinel-2-20251130-aoi-tci.png",
        DERIVED / "sentinel-2-20251130-aoi-tci.pgw",
        DERIVED / "sentinel-2-20251130-aoi-tci.prj",
        DERIVED / "sentinel-2-20251130-aoi-scl.tif",
        DERIVED / "sentinel-2-20251130-aoi-scl.png",
        DERIVED / "sentinel-2-20251130-aoi-scl.pgw",
        DERIVED / "sentinel-2-20251130-aoi-scl.prj",
    ]

    report = {
        "aoi": {
            "id": "gialoc-pilot-01",
            "requested_bbox_wgs84": list(AOI_WGS84),
            "crs": "EPSG:4326",
            "official_boundary": False,
        },
        "worldcover": {
            "source_file": str(WORLDCOVER_SOURCE.relative_to(BASE)),
            "source_sha256": sha256(WORLDCOVER_SOURCE),
            "source_crs": "EPSG:4326",
            "source_bounds": [105.0, 9.0, 108.0, 12.0],
            "source_dimensions": [36000, 36000],
            "source_pixel_size_degrees": [wc_pixel, wc_pixel],
            "source_nodata": 0,
            "crop_window_col0_row0_col1_row1": list(wc_window),
            "derived_crs": "EPSG:4326",
            "derived_pixel_aligned_bounds": list(wc_bounds),
            "derived_dimensions": [int(wc_array.shape[1]), int(wc_array.shape[0])],
            "valid_pixels": int(np.count_nonzero(wc_array)),
            "nodata_pixels": int(np.count_nonzero(wc_array == 0)),
            "class_distribution": distribution(wc_array, WORLDCOVER_CLASSES),
            "derived_files": [
                str(path.relative_to(BASE))
                for path in derivatives
                if path.name.startswith("worldcover")
            ],
        },
        "sentinel_2": {
            "item_id": "S2B_T48PXT_20251130T033239_L2A",
            "acquisition_datetime": "2025-11-30T03:34:50.914000Z",
            "platform": "sentinel-2b",
            "product_type": "S2MSI2A",
            "processing_baseline": "05.11",
            "scene_cloud_cover_percent": 0.017494,
            "scene_nodata_percent": 6.57384,
            "source_crs": "EPSG:32648",
            "source_origin": [600000.0, 1300020.0],
            "tci_source_file": str(S2_TCI_SOURCE.relative_to(BASE)),
            "tci_source_sha256": sha256(S2_TCI_SOURCE),
            "tci_source_dimensions": [10980, 10980],
            "tci_source_pixel_size_m": [10.0, 10.0],
            "tci_source_nodata": 0,
            "tci_crop_window_col0_row0_col1_row1": list(s2_window),
            "tci_derived_bounds_epsg32648": list(s2_bounds),
            "tci_derived_envelope_wgs84": list(s2_wgs_bounds),
            "tci_derived_dimensions": [int(tci_array.shape[1]), int(tci_array.shape[0])],
            "tci_all_band_nodata_pixels": int(np.count_nonzero(np.all(tci_array == 0, axis=2))),
            "tci_band_min_rgb": [int(value) for value in np.min(tci_array, axis=(0, 1))],
            "tci_band_max_rgb": [int(value) for value in np.max(tci_array, axis=(0, 1))],
            "tci_band_mean_rgb": [round(float(value), 6) for value in np.mean(tci_array, axis=(0, 1))],
            "scl_source_file": str(S2_SCL_SOURCE.relative_to(BASE)),
            "scl_source_sha256": sha256(S2_SCL_SOURCE),
            "scl_source_dimensions": [5490, 5490],
            "scl_source_pixel_size_m": [20.0, 20.0],
            "scl_source_nodata": 0,
            "scl_crop_window_col0_row0_col1_row1": list(scl_window),
            "scl_derived_bounds_epsg32648": list(scl_bounds),
            "scl_derived_envelope_wgs84": list(scl_wgs_bounds),
            "scl_derived_dimensions": [int(scl_array.shape[1]), int(scl_array.shape[0])],
            "scl_valid_pixels": scl_valid,
            "scl_nodata_pixels": int(scl_counts.get(0, 0)),
            "scl_cloud_pixels_codes_8_9_10": cloud_pixels,
            "scl_cloud_percent_of_valid_pixels": round(100 * cloud_pixels / scl_valid, 6) if scl_valid else None,
            "scl_cloud_shadow_pixels_code_3": int(scl_counts.get(3, 0)),
            "scl_cloud_shadow_percent_of_valid_pixels": round(100 * int(scl_counts.get(3, 0)) / scl_valid, 6) if scl_valid else None,
            "scl_class_distribution": scl_dist,
            "derived_files": [
                str(path.relative_to(BASE))
                for path in derivatives
                if path.name.startswith("sentinel")
            ],
        },
        "derived_sha256": {
            str(path.relative_to(BASE)): sha256(path) for path in derivatives
        },
    }
    (DERIVED / "surface-aoi-qa.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
