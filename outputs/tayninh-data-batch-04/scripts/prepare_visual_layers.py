#!/usr/bin/env python3
"""
Prepare additive Batch04 visual layers from already-acquired local artifacts.

This script intentionally does not alter Batch01-03 outputs and does not touch
the existing Batch04 fusion scene/compiler.  It writes a renderer-facing visual
contract with native Sentinel-2 10 m imagery and the complete ETH canopy field.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
B01 = ROOT / "tayninh-data-batch-01"
B02 = ROOT / "tayninh-data-batch-02"
B03 = ROOT / "tayninh-data-batch-03"
B04 = ROOT / "tayninh-data-batch-04"
OUT = B04 / "derived" / "visual"

GENERATED_AT = "2026-09-14T06:42:42Z"
AOI_BBOX = [106.3276338, 11.0830401, 106.3576338, 11.1130401]
AOI_CENTER = [106.3426338, 11.0980401]
EARTH_RADIUS_M = 6378137.0


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def rel(path: Path) -> str:
    return str(path.relative_to(B04)) if path.is_relative_to(B04) else str(path.relative_to(ROOT))


def rel_from_b04(path: Path) -> str:
    return str(path.relative_to(B04)) if path.is_relative_to(B04) else str(Path("..") / path.relative_to(ROOT))


def lonlat_to_scene_m(lon: float, lat: float) -> list[float]:
    lon0, lat0 = AOI_CENTER
    x = math.radians(lon - lon0) * EARTH_RADIUS_M * math.cos(math.radians(lat0))
    z = math.radians(lat - lat0) * EARTH_RADIUS_M
    return [round(x, 6), round(z, 6)]


def bounds_wgs84_to_scene_m(bounds: list[float]) -> dict[str, Any]:
    west, south, east, north = bounds
    sw = lonlat_to_scene_m(west, south)
    ne = lonlat_to_scene_m(east, north)
    nw = lonlat_to_scene_m(west, north)
    se = lonlat_to_scene_m(east, south)
    return {
        "bounds_m": [sw[0], sw[1], ne[0], ne[1]],
        "corners_m": {
            "north_west": nw,
            "north_east": ne,
            "south_east": se,
            "south_west": sw,
        },
    }


def pixel_centers_from_wgs84_bounds(bounds: list[float], width: int, height: int) -> dict[str, Any]:
    west, south, east, north = bounds
    px_lon = (east - west) / width
    px_lat = (north - south) / height
    first = [west + px_lon / 2.0, north - px_lat / 2.0]
    last = [east - px_lon / 2.0, south + px_lat / 2.0]
    return {
        "edge_bounds_wgs84": bounds,
        "pixel_size_degrees": [px_lon, px_lat],
        "first_pixel_center_wgs84_row0_col0": first,
        "last_pixel_center_wgs84_row_last_col_last": last,
        "first_pixel_center_scene_m": lonlat_to_scene_m(first[0], first[1]),
        "last_pixel_center_scene_m": lonlat_to_scene_m(last[0], last[1]),
        "row_direction": "southward: row index increases while latitude decreases",
        "column_direction": "eastward: column index increases while longitude increases",
    }


def utm48n_to_wgs84(easting: float, northing: float) -> list[float]:
    """Inverse Transverse Mercator for WGS84 / UTM zone 48N.

    The formula is deterministic and only used to anchor the already verified
    Sentinel crop in the scene-local metre frame; the native source CRS bounds
    remain the authoritative geotransform for image pixels.
    """

    a = 6378137.0
    f = 1 / 298.257223563
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    k0 = 0.9996
    lon0 = math.radians(105.0)

    x = easting - 500000.0
    y = northing
    m = y / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    j1 = 3 * e1 / 2 - 27 * e1**3 / 32
    j2 = 21 * e1 * e1 / 16 - 55 * e1**4 / 32
    j3 = 151 * e1**3 / 96
    j4 = 1097 * e1**4 / 512
    fp = mu + j1 * math.sin(2 * mu) + j2 * math.sin(4 * mu) + j3 * math.sin(6 * mu) + j4 * math.sin(8 * mu)

    sin_fp = math.sin(fp)
    cos_fp = math.cos(fp)
    tan_fp = math.tan(fp)
    c1 = ep2 * cos_fp * cos_fp
    t1 = tan_fp * tan_fp
    n1 = a / math.sqrt(1 - e2 * sin_fp * sin_fp)
    r1 = a * (1 - e2) / (1 - e2 * sin_fp * sin_fp) ** 1.5
    d = x / (n1 * k0)

    lat = fp - (n1 * tan_fp / r1) * (
        d * d / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d**6 / 720
    )
    lon = lon0 + (
        d
        - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d**5 / 120
    ) / cos_fp

    return [math.degrees(lon), math.degrees(lat)]


def wgs84_to_utm48n(lon: float, lat: float) -> list[float]:
    """Forward Transverse Mercator for WGS84 / UTM zone 48N."""

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
    return [easting, northing]


def epsg32648_corners_to_scene(bounds: list[float]) -> dict[str, Any]:
    xmin, ymin, xmax, ymax = bounds
    source = {
        "north_west": [xmin, ymax],
        "north_east": [xmax, ymax],
        "south_east": [xmax, ymin],
        "south_west": [xmin, ymin],
        "center": [(xmin + xmax) / 2.0, (ymin + ymax) / 2.0],
    }
    out: dict[str, Any] = {}
    for name, (easting, northing) in source.items():
        lon, lat = utm48n_to_wgs84(easting, northing)
        out[name] = {
            "epsg32648": [round(easting, 6), round(northing, 6)],
            "wgs84": [round(lon, 12), round(lat, 12)],
            "scene_m": lonlat_to_scene_m(lon, lat),
        }
    lons = [v["wgs84"][0] for k, v in out.items() if k != "center"]
    lats = [v["wgs84"][1] for k, v in out.items() if k != "center"]
    return {
        "corners": {k: v for k, v in out.items() if k != "center"},
        "center": out["center"],
        "corner_envelope_wgs84": [min(lons), min(lats), max(lons), max(lats)],
    }


def pixel_centers_from_epsg32648_bounds(bounds: list[float], width: int, height: int) -> dict[str, Any]:
    xmin, ymin, xmax, ymax = bounds
    px_x = (xmax - xmin) / width
    px_y = (ymax - ymin) / height
    first_src = [xmin + px_x / 2.0, ymax - px_y / 2.0]
    last_src = [xmax - px_x / 2.0, ymin + px_y / 2.0]
    center_src = [(xmin + xmax) / 2.0, (ymin + ymax) / 2.0]
    first_wgs84 = utm48n_to_wgs84(first_src[0], first_src[1])
    last_wgs84 = utm48n_to_wgs84(last_src[0], last_src[1])
    center_wgs84 = utm48n_to_wgs84(center_src[0], center_src[1])
    center_scene = lonlat_to_scene_m(center_wgs84[0], center_wgs84[1])
    return {
        "edge_bounds_epsg32648": bounds,
        "pixel_size_m": [px_x, px_y],
        "first_pixel_center_epsg32648_row0_col0": first_src,
        "last_pixel_center_epsg32648_row_last_col_last": last_src,
        "first_pixel_center_wgs84_row0_col0": [round(first_wgs84[0], 12), round(first_wgs84[1], 12)],
        "last_pixel_center_wgs84_row_last_col_last": [round(last_wgs84[0], 12), round(last_wgs84[1], 12)],
        "anchor": {
            "source_center_epsg32648": center_src,
            "source_center_wgs84": [round(center_wgs84[0], 12), round(center_wgs84[1], 12)],
            "scene_center_m": center_scene,
            "source_to_scene_m": "scene_x = scene_center_x + (easting - source_center_easting); scene_z = scene_center_z + (northing - source_center_northing)",
        },
        "source_crs_preserving_scene_bounds_m": [
            round(center_scene[0] + xmin - center_src[0], 6),
            round(center_scene[1] + ymin - center_src[1], 6),
            round(center_scene[0] + xmax - center_src[0], 6),
            round(center_scene[1] + ymax - center_src[1], 6),
        ],
        "source_crs_preserving_scene_bounds_status": "APPROXIMATE_AXIS_ALIGNED_DIAGNOSTIC_ONLY: not renderer placement; use true_footprint_corners and terrain_to_sentinel_texture_uv_grid instead",
        "first_pixel_center_scene_m": [
            *lonlat_to_scene_m(first_wgs84[0], first_wgs84[1]),
        ],
        "last_pixel_center_scene_m": [
            *lonlat_to_scene_m(last_wgs84[0], last_wgs84[1]),
        ],
        "row_direction": "southward in image rows: source northing decreases as row index increases",
        "column_direction": "eastward in image columns: source easting increases as column index increases",
    }


def terrain_to_sentinel_uv_grid(terrain_bounds: list[float], width: int, height: int, sentinel_bounds: list[float]) -> dict[str, Any]:
    west, south, east, north = terrain_bounds
    xmin, ymin, xmax, ymax = sentinel_bounds
    px_lon = (east - west) / width
    px_lat = (north - south) / height
    rows: list[list[list[Any]]] = []
    us: list[float] = []
    vs: list[float] = []
    inside_count = 0
    for row in range(height):
        lat = north - (row + 0.5) * px_lat
        out_row: list[list[Any]] = []
        for col in range(width):
            lon = west + (col + 0.5) * px_lon
            easting, northing = wgs84_to_utm48n(lon, lat)
            u = (easting - xmin) / (xmax - xmin)
            v_bottom_origin = (northing - ymin) / (ymax - ymin)
            inside = 0 <= u <= 1 and 0 <= v_bottom_origin <= 1
            inside_count += 1 if inside else 0
            us.append(u)
            vs.append(v_bottom_origin)
            out_row.append([round(u, 9), round(v_bottom_origin, 9), inside])
        rows.append(out_row)

    def sample(row: int, col: int) -> dict[str, Any]:
        lon = west + (col + 0.5) * px_lon
        lat = north - (row + 0.5) * px_lat
        easting, northing = wgs84_to_utm48n(lon, lat)
        u, v, inside = rows[row][col]
        return {
            "row": row,
            "col": col,
            "wgs84": [round(lon, 12), round(lat, 12)],
            "epsg32648": [round(easting, 6), round(northing, 6)],
            "u": u,
            "v_bottom_origin": v,
            "image_col_float": round(u * (xmax - xmin) / 10.0 - 0.5, 6),
            "image_row_float_top_origin": round((1 - v) * (ymax - ymin) / 10.0 - 0.5, 6),
            "inside_sentinel_extent": inside,
        }

    return {
        "description": "Per-DEM-pixel-centre UV coordinates into native Sentinel RGB texture.",
        "grid_rows": rows,
        "uv_convention": {
            "u": "(UTM_easting - 644990) / 3300, west-to-east",
            "v_bottom_origin": "(UTM_northing - 1225480) / 3340, south-to-north; image row uses 1-v for top-origin native PNG sampling",
            "inside_flag": "true when the DEM pixel centre falls inside the Sentinel crop extent",
        },
        "dimensions": [width, height],
        "stats": {
            "total_nodes": width * height,
            "inside_sentinel_extent_nodes": inside_count,
            "outside_sentinel_extent_nodes": width * height - inside_count,
            "u_min": round(min(us), 9),
            "u_max": round(max(us), 9),
            "v_bottom_origin_min": round(min(vs), 9),
            "v_bottom_origin_max": round(max(vs), 9),
        },
        "sample_nodes": {
            "north_west": sample(0, 0),
            "center": sample(height // 2, width // 2),
            "south_east": sample(height - 1, width - 1),
        },
    }


def image_info(path: Path) -> dict[str, Any]:
    img = Image.open(path)
    arr = np.asarray(img)
    return {
        "path": rel_from_b04(path),
        "sha256": sha256(path),
        "mode": img.mode,
        "width": img.size[0],
        "height": img.size[1],
        "sample_pixels": {
            "row0_col0": arr[0, 0].tolist() if hasattr(arr[0, 0], "tolist") else int(arr[0, 0]),
            "center": arr[arr.shape[0] // 2, arr.shape[1] // 2].tolist()
            if hasattr(arr[arr.shape[0] // 2, arr.shape[1] // 2], "tolist")
            else int(arr[arr.shape[0] // 2, arr.shape[1] // 2]),
            "last": arr[-1, -1].tolist() if hasattr(arr[-1, -1], "tolist") else int(arr[-1, -1]),
        },
    }


def raster_u8_grid(path: Path) -> tuple[np.ndarray, dict[str, Any]]:
    img = Image.open(path)
    arr = np.asarray(img)
    if arr.ndim != 2:
        raise ValueError(f"Expected single-band raster for {path}, found shape {arr.shape}")
    if arr.dtype != np.uint8:
        arr = arr.astype(np.uint8)
    info = {
        "path": rel_from_b04(path),
        "sha256": sha256(path),
        "mode": img.mode,
        "width": img.size[0],
        "height": img.size[1],
        "sample_pixels": {
            "row0_col0": int(arr[0, 0]),
            "center": int(arr[arr.shape[0] // 2, arr.shape[1] // 2]),
            "last": int(arr[-1, -1]),
        },
    }
    return arr, info


def stats_u8(arr: np.ndarray, nodata: int) -> dict[str, Any]:
    mask = arr != nodata
    vals = arr[mask]
    return {
        "valid_pixels": int(mask.sum()),
        "nodata_pixels": int((~mask).sum()),
        "min": int(vals.min()),
        "max": int(vals.max()),
        "mean": round(float(vals.mean()), 6),
        "median": round(float(np.median(vals)), 6),
        "std": round(float(vals.std()), 6),
    }


def copy_exact(src: Path, dst: Path) -> dict[str, Any]:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    if sha256(src) != sha256(dst):
        raise RuntimeError(f"copy hash mismatch: {src} -> {dst}")
    return {
        "path": rel_from_b04(dst),
        "sha256": sha256(dst),
        "source_path": rel_from_b04(src),
        "source_sha256": sha256(src),
    }


def requirement(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    surface_qa_path = B02 / "derived" / "surface" / "surface-aoi-qa.json"
    ecosystem_qa_path = B03 / "derived" / "ecosystem" / "ecosystem-aoi-qa.json"
    dem_inspection_path = B01 / "derived" / "global" / "copdem-glo30-aoi-inspection.json"
    fusion_scene_path = B04 / "derived" / "fusion" / "scene-data.json"

    surface_qa = read_json(surface_qa_path)
    ecosystem_qa = read_json(ecosystem_qa_path)
    dem = read_json(dem_inspection_path)

    sentinel_tif = B02 / "derived" / "surface" / "sentinel-2-20251130-aoi-tci.tif"
    sentinel_png = B02 / "derived" / "surface" / "sentinel-2-20251130-aoi-tci.png"
    canopy_height_tif = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-aoi.tif"
    canopy_height_png = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-aoi.png"
    canopy_unc_tif = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-uncertainty-aoi.tif"
    canopy_unc_png = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-uncertainty-aoi.png"

    sentinel_copy = copy_exact(sentinel_png, OUT / "sentinel-2-20251130-native-rgb.png")
    canopy_height_copy = copy_exact(canopy_height_png, OUT / "eth-canopy-height-2020-field.png")
    canopy_unc_copy = copy_exact(canopy_unc_png, OUT / "eth-canopy-height-2020-uncertainty-field.png")

    sentinel_tif_info = image_info(sentinel_tif)
    sentinel_png_info = image_info(sentinel_png)
    sentinel_out_info = image_info(OUT / "sentinel-2-20251130-native-rgb.png")
    height_grid, height_tif_info = raster_u8_grid(canopy_height_tif)
    uncertainty_grid, uncertainty_tif_info = raster_u8_grid(canopy_unc_tif)

    s2 = surface_qa["sentinel_2"]
    eth = ecosystem_qa["eth_canopy_height_2020"]
    tci_dims = s2["tci_derived_dimensions"]
    canopy_dims = eth["derived_dimensions"]
    dem_bounds = dem["aoi_window_bounds_wgs84"]

    requirement(tci_dims == [sentinel_tif_info["width"], sentinel_tif_info["height"]], "TCI TIFF dimensions do not match QA")
    requirement(tci_dims == [sentinel_out_info["width"], sentinel_out_info["height"]], "TCI copied PNG dimensions do not match QA")
    requirement(canopy_dims == [height_tif_info["width"], height_tif_info["height"]], "canopy height dimensions do not match QA")
    requirement(canopy_dims == [uncertainty_tif_info["width"], uncertainty_tif_info["height"]], "canopy uncertainty dimensions do not match QA")
    requirement(sha256(sentinel_tif) == surface_qa["derived_sha256"]["derived/surface/sentinel-2-20251130-aoi-tci.tif"], "TCI TIFF hash mismatch")
    requirement(sha256(canopy_height_tif) == ecosystem_qa["derived_sha256"]["derived/ecosystem/eth-canopy-height-2020-aoi.tif"], "canopy height TIFF hash mismatch")
    requirement(sha256(canopy_unc_tif) == ecosystem_qa["derived_sha256"]["derived/ecosystem/eth-canopy-height-2020-uncertainty-aoi.tif"], "canopy uncertainty TIFF hash mismatch")

    terrain_centers = pixel_centers_from_wgs84_bounds(dem_bounds, dem["aoi_window_width"], dem["aoi_window_height"])
    sentinel_centers = pixel_centers_from_epsg32648_bounds(s2["tci_derived_bounds_epsg32648"], tci_dims[0], tci_dims[1])
    sentinel_true_geometry = epsg32648_corners_to_scene(s2["tci_derived_bounds_epsg32648"])
    terrain_sentinel_uv = terrain_to_sentinel_uv_grid(
        dem_bounds,
        dem["aoi_window_width"],
        dem["aoi_window_height"],
        s2["tci_derived_bounds_epsg32648"],
    )
    canopy_centers = pixel_centers_from_wgs84_bounds(eth["derived_pixel_aligned_bounds"], canopy_dims[0], canopy_dims[1])

    height_stats = stats_u8(height_grid, eth["source_nodata"])
    uncertainty_stats = stats_u8(uncertainty_grid, eth["source_nodata"])
    requirement(height_stats["valid_pixels"] == eth["height_valid_pixels"], "canopy height valid count mismatch")
    requirement(height_stats["nodata_pixels"] == eth["height_nodata_pixels"], "canopy height nodata count mismatch")
    requirement(uncertainty_stats["valid_pixels"] == eth["uncertainty_valid_pixels"], "canopy uncertainty valid count mismatch")
    requirement(uncertainty_stats["nodata_pixels"] == eth["uncertainty_nodata_pixels"], "canopy uncertainty nodata count mismatch")
    aoi_center_utm = wgs84_to_utm48n(AOI_CENTER[0], AOI_CENTER[1])
    root_aoi_center_utm = [646638.301445244, 1227150.570346724]
    requirement(abs(aoi_center_utm[0] - root_aoi_center_utm[0]) < 0.001, "AOI center UTM easting mismatch")
    requirement(abs(aoi_center_utm[1] - root_aoi_center_utm[1]) < 0.001, "AOI center UTM northing mismatch")
    terrain_first_center = terrain_centers["first_pixel_center_wgs84_row0_col0"]
    terrain_last_center = terrain_centers["last_pixel_center_wgs84_row_last_col_last"]
    terrain_first_utm = wgs84_to_utm48n(terrain_first_center[0], terrain_first_center[1])
    terrain_last_utm = wgs84_to_utm48n(terrain_last_center[0], terrain_last_center[1])
    root_terrain_first_utm = [644992.9841005881, 1228788.5539725202]
    root_terrain_last_utm = [648285.0205004632, 1225485.3536492197]
    requirement(max(abs(terrain_first_utm[i] - root_terrain_first_utm[i]) for i in range(2)) < 0.001, "DEM first pixel centre UTM mismatch")
    requirement(max(abs(terrain_last_utm[i] - root_terrain_last_utm[i]) for i in range(2)) < 0.001, "DEM last pixel centre UTM mismatch")
    envelope_from_true_corners = sentinel_true_geometry["corner_envelope_wgs84"]
    envelope_from_qa = s2["tci_derived_envelope_wgs84"]
    requirement(max(abs(envelope_from_true_corners[i] - envelope_from_qa[i]) for i in range(4)) < 1e-9, "Sentinel true corner envelope differs from Batch02 QA")

    visual_data = {
        "schema": "tayninh-b04-visual-data/v1",
        "generated_at": GENERATED_AT,
        "purpose": "Renderer-facing additive native visual layers for Batch04; does not replace fusion scene-data.json.",
        "strict_non_claims": [
            "Sentinel RGB is native 10 m public imagery, not centimetre orthophoto imagery.",
            "Canopy grid is a continuous ETH raster field; pixels are not individual tree detections or tree cones.",
            "No OAM/high-resolution open asset was acquired in this bounded local pass.",
        ],
        "aoi": {
            "id": "gialoc-pilot-01",
            "bbox_wgs84": AOI_BBOX,
            "center_wgs84": AOI_CENTER,
            "official_boundary": False,
        },
        "scene_coordinate_frame": {
            "crs": "local tangent metres derived from WGS84 longitude/latitude around AOI center",
            "origin_wgs84": AOI_CENTER,
            "axis_x": "east metres from AOI center",
            "axis_z": "north metres from AOI center",
            "axis_y": "elevation metres",
            "earth_radius_m": EARTH_RADIUS_M,
            "lonlat_to_scene_m": "x = radians(lon-origin_lon)*R*cos(origin_lat); z = radians(lat-origin_lat)*R",
        },
        "terrain_frame": {
            "source": {
                "path": rel_from_b04(dem_inspection_path),
                "sha256": sha256(dem_inspection_path),
                "raw_dem_path": rel_from_b04(B01 / dem["source_file"]),
                "raw_dem_sha256": dem["source_sha256"],
            },
            "crs": "EPSG:4326",
            "dimensions": [dem["aoi_window_width"], dem["aoi_window_height"]],
            "edge_bounds_wgs84": dem_bounds,
            "edge_bounds_scene_m": bounds_wgs84_to_scene_m(dem_bounds),
            "pixel_centers": terrain_centers,
            "model_pixel_scale_degrees": dem["model_pixel_scale"][:2],
            "aoi_window_pixels_col0_row0_col1_row1": dem["aoi_window_pixels"],
            "finite_pixel_count": dem["finite_pixel_count"],
            "proj_reference_checks": {
                "aoi_center_epsg32648_formula": [round(aoi_center_utm[0], 6), round(aoi_center_utm[1], 6)],
                "aoi_center_epsg32648_reference": root_aoi_center_utm,
                "first_pixel_center_epsg32648_formula": [round(terrain_first_utm[0], 6), round(terrain_first_utm[1], 6)],
                "first_pixel_center_epsg32648_reference": root_terrain_first_utm,
                "last_pixel_center_epsg32648_formula": [round(terrain_last_utm[0], 6), round(terrain_last_utm[1], 6)],
                "last_pixel_center_epsg32648_reference": root_terrain_last_utm,
                "status": "PASS",
            },
            "sentinel_rgb_texture_uv_for_terrain_pixel_centers": terrain_sentinel_uv,
            "north_mapping_check": {
                "row0_center_lat_gt_last_row_center_lat": terrain_centers["first_pixel_center_wgs84_row0_col0"][1]
                > terrain_centers["last_pixel_center_wgs84_row_last_col_last"][1],
                "col0_center_lon_lt_last_col_center_lon": terrain_centers["first_pixel_center_wgs84_row0_col0"][0]
                < terrain_centers["last_pixel_center_wgs84_row_last_col_last"][0],
                "status": "PASS",
            },
            "renderer_guidance": "Use edge_bounds_scene_m to place the DEM mesh, but generate mesh vertices from first/last pixel centres when sampling 109x109 elevation values.",
        },
        "sentinel_rgb_10m_native": {
            "source": {
                "qa_path": rel_from_b04(surface_qa_path),
                "qa_sha256": sha256(surface_qa_path),
                "tci_tif": sentinel_tif_info,
                "tci_png": sentinel_png_info,
            },
            "asset": sentinel_copy | sentinel_out_info,
            "source_item": {
                "item_id": s2["item_id"],
                "acquisition_datetime": s2["acquisition_datetime"],
                "platform": s2["platform"],
                "product_type": s2["product_type"],
                "scene_cloud_cover_percent": s2["scene_cloud_cover_percent"],
                "scene_nodata_percent": s2["scene_nodata_percent"],
            },
            "crs": s2["source_crs"],
            "dimensions": tci_dims,
            "edge_bounds_epsg32648": s2["tci_derived_bounds_epsg32648"],
            "geotiff_tiepoint_upper_left_epsg32648": [644990.0, 1228820.0],
            "geotiff_pixel_scale_m": [10.0, 10.0],
            "envelope_wgs84": s2["tci_derived_envelope_wgs84"],
            "true_footprint_from_epsg32648_corners": sentinel_true_geometry,
            "envelope_scene_m": bounds_wgs84_to_scene_m(s2["tci_derived_envelope_wgs84"]),
            "pixel_centers": sentinel_centers,
            "terrain_node_texture_uv_rows": terrain_sentinel_uv["grid_rows"],
            "terrain_node_texture_uv": {
                "alias_of": "terrain_frame.sentinel_rgb_texture_uv_for_terrain_pixel_centers",
                "description": terrain_sentinel_uv["description"],
                "uv_convention": terrain_sentinel_uv["uv_convention"],
                "dimensions": terrain_sentinel_uv["dimensions"],
                "stats": terrain_sentinel_uv["stats"],
                "sample_nodes": terrain_sentinel_uv["sample_nodes"],
            },
            "all_band_nodata_pixels": s2["tci_all_band_nodata_pixels"],
            "band_min_rgb": s2["tci_band_min_rgb"],
            "band_max_rgb": s2["tci_band_max_rgb"],
            "band_mean_rgb": s2["tci_band_mean_rgb"],
            "native_status": "PASS: retained 330x334 native 10 m crop; not downsampled to DEM 109x109",
            "renderer_guidance": "Place image using pixel_centers.source_crs_preserving_scene_bounds_m and dimensions 330x334. Do not stretch to the 109x109 DEM bbox; sample/UV independently.",
        },
        "eth_canopy_field_10m": {
            "source": {
                "qa_path": rel_from_b04(ecosystem_qa_path),
                "qa_sha256": sha256(ecosystem_qa_path),
                "height_tif": height_tif_info,
                "uncertainty_tif": uncertainty_tif_info,
            },
            "assets": {
                "height_png": canopy_height_copy | image_info(OUT / "eth-canopy-height-2020-field.png"),
                "uncertainty_png": canopy_unc_copy | image_info(OUT / "eth-canopy-height-2020-uncertainty-field.png"),
            },
            "crs": eth["source_crs"],
            "dimensions": canopy_dims,
            "edge_bounds_wgs84": eth["derived_pixel_aligned_bounds"],
            "edge_bounds_scene_m": bounds_wgs84_to_scene_m(eth["derived_pixel_aligned_bounds"]),
            "pixel_centers": canopy_centers,
            "nominal_ground_sampling_distance_m": eth["nominal_ground_sampling_distance_m"],
            "source_nodata": eth["source_nodata"],
            "height_unit": eth["height_unit"],
            "height_stats": height_stats,
            "uncertainty_unit": eth["uncertainty_unit"],
            "uncertainty_stats": uncertainty_stats,
            "height_grid_u8_rows": height_grid.astype(int).tolist(),
            "uncertainty_grid_u8_rows": uncertainty_grid.astype(int).tolist(),
            "field_status": "PASS: full 361x361 continuous raster field exported; no stride-6 sampling and no individual-tree cone interpretation",
            "renderer_guidance": "Render as a continuous canopy-height/uncertainty surface or texture; ignore pixels with nodata value 255.",
        },
        "engine_contract": {
            "version": "visual-data-json-v1",
            "required_renderer_changes": [
                "Use sentinel_rgb_10m_native.asset.path as the RGB texture at 330x334 pixels.",
                "Use sentinel_rgb_10m_native.terrain_node_texture_uv_rows when texturing the DEM mesh with the native Sentinel RGB image. This is an alias of terrain_frame.sentinel_rgb_texture_uv_for_terrain_pixel_centers.grid_rows.",
                "Use sentinel_rgb_10m_native.true_footprint_from_epsg32648_corners for precise corner positions. The older axis-aligned diagnostic bounds are not renderer placement.",
                "Use terrain_frame.edge_bounds_scene_m and terrain_frame.pixel_centers; DEM bounds are edge bounds, not first/last centres.",
                "Use eth_canopy_field_10m.height_grid_u8_rows and uncertainty_grid_u8_rows as continuous rasters; do not instantiate one cone per sampled record.",
                "Preserve north-up mapping: row 0 is the north edge for all three rasters.",
            ],
            "expected_dimensions": {
                "terrain_dem": [109, 109],
                "sentinel_rgb": [330, 334],
                "eth_canopy": [361, 361],
            },
        },
        "qa_checks": {
            "sentinel_native_dimensions_match_source": tci_dims == [330, 334],
            "canopy_full_dimensions_match_source": canopy_dims == [361, 361],
            "terrain_dimensions_match_inspection": [dem["aoi_window_width"], dem["aoi_window_height"]] == [109, 109],
            "aoi_center_utm_reference_pass": abs(aoi_center_utm[0] - root_aoi_center_utm[0]) < 0.001
            and abs(aoi_center_utm[1] - root_aoi_center_utm[1]) < 0.001,
            "sentinel_true_corner_envelope_matches_batch02_qa": max(
                abs(envelope_from_true_corners[i] - envelope_from_qa[i]) for i in range(4)
            )
            < 1e-9,
            "terrain_to_sentinel_uv_grid_nodes": terrain_sentinel_uv["stats"]["total_nodes"],
            "terrain_to_sentinel_uv_inside_nodes": terrain_sentinel_uv["stats"]["inside_sentinel_extent_nodes"],
            "dem_first_last_pixel_center_utm_reference_pass": max(abs(terrain_first_utm[i] - root_terrain_first_utm[i]) for i in range(2)) < 0.001
            and max(abs(terrain_last_utm[i] - root_terrain_last_utm[i]) for i in range(2)) < 0.001,
            "sentinel_north_mapping_pass": sentinel_centers["first_pixel_center_epsg32648_row0_col0"][1]
            > sentinel_centers["last_pixel_center_epsg32648_row_last_col_last"][1],
            "canopy_north_mapping_pass": canopy_centers["first_pixel_center_wgs84_row0_col0"][1]
            > canopy_centers["last_pixel_center_wgs84_row_last_col_last"][1],
            "sample_pixels_verified_from_files": True,
            "status": "PASS",
        },
    }

    visual_data_path = OUT / "visual-data.json"
    write_json(visual_data_path, visual_data)

    qa = {
        "schema": "tayninh-b04-visual-qa/v1",
        "generated_at": GENERATED_AT,
        "status": "PASS",
        "visual_data": {"path": rel_from_b04(visual_data_path), "sha256": sha256(visual_data_path)},
        "outputs": {
            "sentinel_rgb_png": {"path": sentinel_copy["path"], "sha256": sha256(OUT / "sentinel-2-20251130-native-rgb.png")},
            "canopy_height_png": {"path": canopy_height_copy["path"], "sha256": sha256(OUT / "eth-canopy-height-2020-field.png")},
            "canopy_uncertainty_png": {"path": canopy_unc_copy["path"], "sha256": sha256(OUT / "eth-canopy-height-2020-uncertainty-field.png")},
        },
        "input_hashes": {
            rel_from_b04(surface_qa_path): sha256(surface_qa_path),
            rel_from_b04(ecosystem_qa_path): sha256(ecosystem_qa_path),
            rel_from_b04(dem_inspection_path): sha256(dem_inspection_path),
            rel_from_b04(fusion_scene_path): sha256(fusion_scene_path),
            rel_from_b04(sentinel_tif): sha256(sentinel_tif),
            rel_from_b04(sentinel_png): sha256(sentinel_png),
            rel_from_b04(canopy_height_tif): sha256(canopy_height_tif),
            rel_from_b04(canopy_unc_tif): sha256(canopy_unc_tif),
        },
        "dimension_checks": {
            "sentinel_rgb": tci_dims,
            "terrain_dem": [dem["aoi_window_width"], dem["aoi_window_height"]],
            "eth_canopy": canopy_dims,
        },
        "pixel_sample_checks": {
            "sentinel_rgb_source": sentinel_tif_info["sample_pixels"],
            "sentinel_rgb_output": sentinel_out_info["sample_pixels"],
            "canopy_height": height_tif_info["sample_pixels"],
            "canopy_uncertainty": uncertainty_tif_info["sample_pixels"],
            "aoi_center_utm_formula": [round(aoi_center_utm[0], 6), round(aoi_center_utm[1], 6)],
            "aoi_center_utm_root_reference": root_aoi_center_utm,
        },
        "orientation_checks": visual_data["qa_checks"],
        "counts": {
            "canopy_height_valid_pixels": height_stats["valid_pixels"],
            "canopy_height_nodata_pixels": height_stats["nodata_pixels"],
            "canopy_uncertainty_valid_pixels": uncertainty_stats["valid_pixels"],
            "canopy_uncertainty_nodata_pixels": uncertainty_stats["nodata_pixels"],
            "sentinel_all_band_nodata_pixels": s2["tci_all_band_nodata_pixels"],
        },
        "limitations": visual_data["strict_non_claims"],
    }
    write_json(OUT / "visual-qa.json", qa)


if __name__ == "__main__":
    main()
