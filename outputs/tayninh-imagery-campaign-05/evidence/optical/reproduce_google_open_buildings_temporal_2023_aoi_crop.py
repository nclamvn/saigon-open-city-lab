#!/usr/bin/env python3
"""Reproduce the bounded Google Open Buildings Temporal 2023 AOI crop.

This script intentionally reads the four public Google Cloud Storage COGs listed
in google-open-buildings-temporal-2023-aoi-source-manifest.json with rasterio
range requests and writes the same 4 m effective AOI crop used by C05 OPTICAL.

Runtime used during C05:
  /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
Temporary dependencies:
  python -m pip install --target /tmp/c05-optical-pylib rasterio s2sphere
Command:
  PYTHONPATH=/tmp/c05-optical-pylib <python> reproduce_google_open_buildings_temporal_2023_aoi_crop.py
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.merge import merge


HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "google-open-buildings-temporal-2023-aoi-source-manifest.json"
OUT_TIF = HERE / "google-open-buildings-temporal-2023-aoi-effective4m.tif"
OUT_PRESENCE = HERE / "google-open-buildings-temporal-2023-aoi-presence.png"
OUT_HEIGHT = HERE / "google-open-buildings-temporal-2023-aoi-height.png"
OUT_QA = HERE / "google-open-buildings-temporal-2023-aoi-qa.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def wgs84_to_utm48n(lon: float, lat: float) -> tuple[float, float]:
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    k0 = 0.9996
    lon0 = math.radians(105.0)
    phi = math.radians(lat)
    lam = math.radians(lon)
    sin_phi = math.sin(phi)
    cos_phi = math.cos(phi)
    tan_phi = math.tan(phi)
    n = a / math.sqrt(1 - e2 * sin_phi * sin_phi)
    t = tan_phi * tan_phi
    c = ep2 * cos_phi * cos_phi
    aa = cos_phi * (lam - lon0)
    m = a * (
        (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2**3 / 256) * phi
        - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * phi)
        + (15 * e2 * e2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * phi)
        - (35 * e2**3 / 3072) * math.sin(6 * phi)
    )
    easting = 500000.0 + k0 * n * (
        aa
        + (1 - t + c) * aa**3 / 6
        + (5 - 18 * t + t * t + 72 * c - 58 * ep2) * aa**5 / 120
    )
    northing = k0 * (
        m
        + n
        * tan_phi
        * (
            aa * aa / 2
            + (5 - t + 9 * c + 4 * c * c) * aa**4 / 24
            + (61 - 58 * t + t * t + 600 * c - 330 * ep2) * aa**6 / 720
        )
    )
    return easting, northing


def aoi_bounds_epsg32648(bbox_wgs84: list[float]) -> tuple[float, float, float, float]:
    west, south, east, north = bbox_wgs84
    corners = [
        wgs84_to_utm48n(west, south),
        wgs84_to_utm48n(west, north),
        wgs84_to_utm48n(east, south),
        wgs84_to_utm48n(east, north),
    ]
    return (
        min(e for e, _ in corners),
        min(n for _, n in corners),
        max(e for e, _ in corners),
        max(n for _, n in corners),
    )


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bbox = manifest["aoi_bbox_wgs84"]
    bounds = aoi_bounds_epsg32648(bbox)

    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        datasets = [rasterio.open(url) for url in manifest["source_cog_urls"]]
        try:
            arr, transform = merge(
                datasets,
                bounds=bounds,
                res=(manifest["derived_resampled_grid_m"], manifest["derived_resampled_grid_m"]),
                indexes=[1, 2, 3],
                nodata=manifest["nodata"],
                resampling=Resampling.average,
            )
            profile = datasets[0].profile.copy()
        finally:
            for ds in datasets:
                ds.close()

    profile.update(
        driver="GTiff",
        height=arr.shape[1],
        width=arr.shape[2],
        count=3,
        dtype="float32",
        transform=transform,
        compress="deflate",
        predictor=3,
        tiled=True,
        nodata=manifest["nodata"],
    )
    with rasterio.open(OUT_TIF, "w", **profile) as dst:
        dst.write(arr.astype("float32"))
        dst.set_band_description(1, "building_fractional_count_resampled_4m")
        dst.set_band_description(2, "building_height_model_resampled_4m")
        dst.set_band_description(3, "building_presence_resampled_4m")
    with rasterio.open(OUT_TIF) as check:
        actual_bounds = [
            float(check.bounds.left),
            float(check.bounds.bottom),
            float(check.bounds.right),
            float(check.bounds.top),
        ]

    count, height, presence = arr
    valid = presence != manifest["nodata"]
    presence_mask = valid & (presence > 0.5)
    height_valid = presence_mask & (height != manifest["nodata"])

    Image.fromarray((np.where(valid, np.clip(presence, 0, 1), 0) * 255).astype("uint8"), mode="L").save(
        OUT_PRESENCE
    )
    Image.fromarray(
        (np.where(height_valid, np.clip(height, 0, 30), 0) / 30 * 255).astype("uint8"),
        mode="L",
    ).save(OUT_HEIGHT)

    qa = {
        "source": manifest["dataset"],
        "year": manifest["year"],
        "aoi_bbox_wgs84": bbox,
        "aoi_bounds_epsg32648": list(bounds),
        "actual_bounds_epsg32648": actual_bounds,
        "coverage_edge_trim_m": {
            "west": max(0.0, actual_bounds[0] - bounds[0]),
            "south": max(0.0, actual_bounds[1] - bounds[1]),
            "east": max(0.0, bounds[2] - actual_bounds[2]),
            "north": max(0.0, bounds[3] - actual_bounds[3]),
        },
        "source_tile_urls": manifest["source_cog_urls"],
        "bands": manifest["bands"],
        "source_raster_grid_m": manifest["source_raster_grid_m"],
        "derived_resampled_grid_m": manifest["derived_resampled_grid_m"],
        "effective_resolution_m_approx": manifest["effective_resolution_m_approx"],
        "crs": manifest["crs"],
        "dimensions": [int(arr.shape[2]), int(arr.shape[1])],
        "nodata": manifest["nodata"],
        "valid_pixels": int(valid.sum()),
        "presence_gt_0_5_pixels": int(presence_mask.sum()),
        "height_model_pixels_with_presence_gt_0_5": int(height_valid.sum()),
        "presence_stats_valid": {
            "min": float(presence[valid].min()),
            "max": float(presence[valid].max()),
            "mean": float(presence[valid].mean()),
        },
        "height_stats_presence_gt_0_5": None
        if not height_valid.any()
        else {
            "min": float(height[height_valid].min()),
            "max": float(height[height_valid].max()),
            "mean": float(height[height_valid].mean()),
        },
        "limitations": manifest["limits"]
        + [
            "The 4 m derived grid is rounded to whole pixels; it trims a subpixel border and must not be described as exact full-subpixel AOI coverage."
        ],
        "outputs": {
            str(OUT_TIF): sha256(OUT_TIF),
            str(OUT_PRESENCE): sha256(OUT_PRESENCE),
            str(OUT_HEIGHT): sha256(OUT_HEIGHT),
        },
    }
    OUT_QA.write_text(json.dumps(qa, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(qa, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
