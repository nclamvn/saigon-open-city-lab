#!/usr/bin/env python3
"""Prepare S06 data supplement from immutable Batch04/C05 artifacts."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import rasterio


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"
C05 = ROOT / "tayninh-imagery-campaign-05"
OUT = B04 / "derived" / "solution"

GENERATED_AT = "2026-09-14T08:12:00Z"
AOI_CENTER = [106.3426338, 11.0980401]
AOI_BBOX = [106.3276338, 11.0830401, 106.3576338, 11.1130401]
EARTH_RADIUS_M = 6378137.0

SCENE_PATH = B04 / "derived" / "fusion" / "scene-data.json"
VISUAL_PATH = B04 / "derived" / "visual" / "visual-data.json"
GOOGLE_TIF = C05 / "evidence" / "optical" / "google-open-buildings-temporal-2023-aoi-effective4m.tif"
GOOGLE_QA = C05 / "evidence" / "optical" / "google-open-buildings-temporal-2023-aoi-qa.json"
GOOGLE_MANIFEST = C05 / "evidence" / "optical" / "google-open-buildings-temporal-2023-aoi-source-manifest.json"
GEDTM_QA = C05 / "evidence" / "techniques" / "gedtm-pilot" / "qa.json"
GEDTM_DTM = C05 / "evidence" / "techniques" / "gedtm-pilot" / "dtm-provider-window.tif"
GEDTM_UNCERTAINTY = C05 / "evidence" / "techniques" / "gedtm-pilot" / "uncertainty-provider-window.tif"
MSFT_GEOJSON = ROOT / "tayninh-data-batch-02" / "derived" / "buildings" / "microsoft-vietnam-132230111-aoi.geojson"

EXPECTED_HASHES = {
    str(SCENE_PATH): "20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878",
    str(VISUAL_PATH): "215fc78e410abc7cd664477d0a0b49127d19c60d41dd01a9adb63425b447e682",
    str(GOOGLE_TIF): "530761d4d1782b4686a8ebefe1cd785e9328ae79abcca321a775871e17d59897",
    str(GOOGLE_QA): "adabfd86ddd4ffb751787fb82f47c5eaefd79835622559c885f608a821299887",
    str(GOOGLE_MANIFEST): "0ee277dd0aae280e6fa0132668112cf2ea6cf627da3b46beda21535eece2addf",
    str(GEDTM_QA): "f7127dfcb9039f0e2b24648782fa397f8348b47d766849cbb464db934801157d",
    str(GEDTM_DTM): "ca1fa8593cfb71cba44cfde70b33ec1b6c6c71d7ebdbec45f64642354c0f1c20",
    str(GEDTM_UNCERTAINTY): "59f00cb80ad82921b217538fb3c0c356db2e44f7c4d87bfda6a7e6bcf6885727",
    str(MSFT_GEOJSON): "74be4a0ae5962dc8672d67e09361dc41222105b1bae97bf472fa9225dc2b6ff7",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def lonlat_to_scene_m(lon: float, lat: float) -> tuple[float, float]:
    lon0, lat0 = AOI_CENTER
    x = math.radians(lon - lon0) * EARTH_RADIUS_M * math.cos(math.radians(lat0))
    z = math.radians(lat - lat0) * EARTH_RADIUS_M
    return x, z


def canonical_scene_m_to_lonlat(x: float, z: float) -> tuple[float, float]:
    lon0, lat0 = AOI_CENTER
    lon = lon0 + math.degrees(x / (EARTH_RADIUS_M * math.cos(math.radians(lat0))))
    lat = lat0 + math.degrees(z / EARTH_RADIUS_M)
    return lon, lat


def scene_m_to_lonlat(x: float, z: float) -> tuple[float, float]:
    """Inverse of the legacy Batch04 fusion local-metre frame."""
    center_lon, center_lat = AOI_CENTER
    metres_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(center_lat)) + 1.175 * math.cos(4 * math.radians(center_lat))
    metres_per_deg_lon = 111_412.84 * math.cos(math.radians(center_lat)) - 93.5 * math.cos(3 * math.radians(center_lat))
    return center_lon + x / metres_per_deg_lon, center_lat + z / metres_per_deg_lat


def legacy_to_canonical_scales() -> dict[str, float]:
    center_lat = AOI_CENTER[1]
    legacy_m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(center_lat)) + 1.175 * math.cos(4 * math.radians(center_lat))
    legacy_m_per_deg_lon = 111_412.84 * math.cos(math.radians(center_lat)) - 93.5 * math.cos(3 * math.radians(center_lat))
    canonical_m_per_deg_lat = math.pi / 180 * EARTH_RADIUS_M
    canonical_m_per_deg_lon = math.pi / 180 * EARTH_RADIUS_M * math.cos(math.radians(center_lat))
    return {
        "x_scale": canonical_m_per_deg_lon / legacy_m_per_deg_lon,
        "z_scale": canonical_m_per_deg_lat / legacy_m_per_deg_lat,
        "x_offset": 0.0,
        "z_offset": 0.0,
        "legacy_m_per_deg_lon": legacy_m_per_deg_lon,
        "legacy_m_per_deg_lat": legacy_m_per_deg_lat,
        "canonical_m_per_deg_lon": canonical_m_per_deg_lon,
        "canonical_m_per_deg_lat": canonical_m_per_deg_lat,
    }


def legacy_local_to_canonical(x: float, z: float) -> tuple[float, float]:
    scales = legacy_to_canonical_scales()
    return x * scales["x_scale"] + scales["x_offset"], z * scales["z_scale"] + scales["z_offset"]


def polygon_centroid_xy(points: list[tuple[float, float]]) -> tuple[float, float]:
    area2 = 0.0
    cx = 0.0
    cy = 0.0
    for i, (x0, y0) in enumerate(points):
        x1, y1 = points[(i + 1) % len(points)]
        cross = x0 * y1 - x1 * y0
        area2 += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(area2) < 1e-12:
        return sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points)
    return cx / (3 * area2), cy / (3 * area2)


def round_point(point: tuple[float, float] | list[float], digits: int = 6) -> list[float]:
    return [round(float(point[0]), digits), round(float(point[1]), digits)]


def make_coordinate_transform(scene: dict[str, Any]) -> dict[str, Any]:
    scales = legacy_to_canonical_scales()
    samples = []

    def add_sample(kind: str, point: dict[str, Any] | None) -> None:
        if not point:
            return
        lx = float(point["x"])
        lz = float(point["z"])
        lon, lat = scene_m_to_lonlat(lx, lz)
        cx, cz = legacy_local_to_canonical(lx, lz)
        rlon, rlat = canonical_scene_m_to_lonlat(cx, cz)
        samples.append(
            {
                "kind": kind,
                "legacy_local_m": [round(lx, 6), round(lz, 6)],
                "lonlat_from_legacy": [round(lon, 12), round(lat, 12)],
                "canonical_scene_m": [round(cx, 6), round(cz, 6)],
                "roundtrip_lonlat_from_canonical": [round(rlon, 12), round(rlat, 12)],
                "roundtrip_error_degrees": [round(rlon - lon, 15), round(rlat - lat, 15)],
            }
        )

    if scene.get("roads"):
        add_sample("road.path_local_m[0]", scene["roads"][0]["path_local_m"][0])
    if scene.get("osm_water"):
        add_sample("osm_water.path_local_m[0]", scene["osm_water"][0]["path_local_m"][0])
    if scene.get("canopy_samples"):
        add_sample("canopy_samples[0]", scene["canopy_samples"][0])
    elif scene.get("jrc_water_cells"):
        add_sample("jrc_water_cells[0]", scene["jrc_water_cells"][0])

    return {
        "canonical_frame": "visual-data local tangent metres using R=6378137; x east, z north, origin AOI center",
        "legacy_frame": "Batch04 fusion local metres using latitude-dependent metres-per-degree coefficients",
        "legacy_to_canonical": {
            "x_scale": round(scales["x_scale"], 12),
            "z_scale": round(scales["z_scale"], 12),
            "x_offset": 0.0,
            "z_offset": 0.0,
            "formula": "canonical_x = legacy_x * x_scale; canonical_z = legacy_z * z_scale",
        },
        "metres_per_degree": {k: round(v, 9) for k, v in scales.items() if k.endswith("lon") or k.endswith("lat")},
        "applies_to_legacy_geometry": [
            "roads[].path_local_m",
            "osm_water[].path_local_m",
            "canopy_samples[].local_m",
            "jrc_water_cells[].local_m",
            "legacy building centroid_local_m and footprint_local_m if consumed from fusion scene",
        ],
        "qa_samples": samples,
    }


def raw_wgs_roundtrip_sample(lon: float, lat: float) -> dict[str, Any]:
    x, z = lonlat_to_scene_m(lon, lat)
    rlon, rlat = canonical_scene_m_to_lonlat(x, z)
    return {
        "input_lonlat": [round(lon, 12), round(lat, 12)],
        "canonical_scene_m": [round(x, 6), round(z, 6)],
        "roundtrip_lonlat": [round(rlon, 12), round(rlat, 12)],
        "roundtrip_error_degrees": [round(rlon - lon, 15), round(rlat - lat, 15)],
    }


def pending_source_template(template_id: str, title: str, render_policy: str) -> dict[str, Any]:
    required_fields = [
        "kind",
        "units",
        "crs",
        "vertical_datum",
        "date",
        "resolution",
        "bounds",
        "nodata",
        "rights",
        "sourcehash",
        "quality",
        "coverage",
    ]
    return {
        "id": template_id,
        "title": title,
        "available": False,
        "contract_only": True,
        "kind": None,
        "units": None,
        "crs": None,
        "vertical_datum": None,
        "date": None,
        "resolution": None,
        "bounds": None,
        "nodata": None,
        "rights": None,
        "sourcehash": None,
        "quality": None,
        "coverage": None,
        "required_before_use": required_fields,
        "render_policy": {
            "status": "disabled_until_source_record_complete",
            "summary": render_policy,
            "must_verify_sourcehash": True,
            "must_verify_spatial_registration": True,
            "must_verify_license_or_rights": True,
            "must_label_modelled_vs_surveyed": True,
        },
    }


def make_future_data_adapter() -> dict[str, Any]:
    accepted_record_fields = [
        "kind",
        "units",
        "crs",
        "vertical_datum",
        "date",
        "resolution",
        "bounds",
        "nodata",
        "rights",
        "sourcehash",
        "quality",
        "coverage",
    ]
    return {
        "schema": "s06-future-source-adapter/v1",
        "contract_only": True,
        "available": False,
        "accepted_record_fields": accepted_record_fields,
        "kinds": ["modelled", "surveyed"],
        "templates": [
            pending_source_template(
                "rgb_orthomosaic",
                "RGB orthomosaic",
                "Do not render as current imagery until all required fields are populated and spatial QA passes.",
            ),
            pending_source_template(
                "lidar_point_cloud",
                "LiDAR point cloud",
                "Do not derive terrain/building measurements until CRS, datum, classification, density and rights are verified.",
            ),
            pending_source_template(
                "sfm_photogrammetry_mesh",
                "SfM/photogrammetry mesh",
                "Do not use mesh heights or textures until scale, georegistration, date and rights are verified.",
            ),
            pending_source_template(
                "surveyed_dtm",
                "Surveyed DTM",
                "May replace testing terrain only after datum, bounds, nodata, resolution, coverage and sourcehash are verified.",
            ),
            pending_source_template(
                "modelled_external_raster",
                "Modelled external raster",
                "Render only as modelled data with uncertainty/coverage disclosure after provenance and registration pass.",
            ),
        ],
        "note": "Contract only. No measured building heights, surveyed terrain, RGB orthomosaic, LiDAR, SfM mesh or other future payload is present in S06.",
    }


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


def point_in_poly(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def bilinear_sample(dataset: rasterio.io.DatasetReader, lon: float, lat: float) -> tuple[float | None, bool, dict[str, float | str | bool]]:
    inv = ~dataset.transform
    col_corner_f, row_corner_f = inv * (lon, lat)
    col_center_f = col_corner_f - 0.5
    row_center_f = row_corner_f - 0.5
    inside_bbox = 0 <= col_corner_f <= dataset.width and 0 <= row_corner_f <= dataset.height
    if not inside_bbox:
        return None, False, {
            "row_corner_f": float(row_corner_f),
            "col_corner_f": float(col_corner_f),
            "row_center_f": float(row_center_f),
            "col_center_f": float(col_center_f),
            "method": "outside_raster_bbox",
            "edge_fallback": False,
        }
    edge_fallback = not (0 <= col_center_f <= dataset.width - 1 and 0 <= row_center_f <= dataset.height - 1)
    if edge_fallback:
        c0 = c1 = min(max(int(round(col_center_f)), 0), dataset.width - 1)
        r0 = r1 = min(max(int(round(row_center_f)), 0), dataset.height - 1)
        dc = dr = 0.0
    else:
        c0 = int(math.floor(col_center_f))
        r0 = int(math.floor(row_center_f))
        c1 = min(c0 + 1, dataset.width - 1)
        r1 = min(r0 + 1, dataset.height - 1)
        dc = col_center_f - c0
        dr = row_center_f - r0
    window = rasterio.windows.Window(c0, r0, c1 - c0 + 1, r1 - r0 + 1)
    arr = dataset.read(1, window=window).astype("float64")
    nodata = dataset.nodata
    if nodata is not None and np.any(arr == nodata):
        return None, False, {
            "row_corner_f": float(row_corner_f),
            "col_corner_f": float(col_corner_f),
            "row_center_f": float(row_center_f),
            "col_center_f": float(col_center_f),
            "method": "nodata_in_kernel",
            "edge_fallback": edge_fallback,
        }
    v00 = arr[0, 0]
    v10 = arr[0, -1]
    v01 = arr[-1, 0]
    v11 = arr[-1, -1]
    value = (v00 * (1 - dc) + v10 * dc) * (1 - dr) + (v01 * (1 - dc) + v11 * dc) * dr
    return float(value), True, {
        "row_corner_f": float(row_corner_f),
        "col_corner_f": float(col_corner_f),
        "row_center_f": float(row_center_f),
        "col_center_f": float(col_center_f),
        "method": "nearest_edge_fallback" if edge_fallback else "bilinear_pixel_centres",
        "edge_fallback": edge_fallback,
    }


def stats(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"min": None, "max": None, "mean": None}
    arr = np.array(values, dtype=float)
    return {"min": round(float(arr.min()), 6), "max": round(float(arr.max()), 6), "mean": round(float(arr.mean()), 6)}


def terrain_node_lonlat(bounds: list[float], rows: int, cols: int, row: int, col: int) -> tuple[float, float]:
    west, south, east, north = bounds
    return west + (col + 0.5) * ((east - west) / cols), north - (row + 0.5) * ((north - south) / rows)


def prepare_terrain(scene: dict[str, Any], visual: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    terrain = scene["terrain"]
    rows = terrain["rows"]
    cols = terrain["cols"]
    bounds = visual["terrain_frame"]["edge_bounds_wgs84"]
    copdem_heights = terrain["heights_m"]
    copdem_validity = [[isinstance(v, (int, float)) and math.isfinite(v) for v in row] for row in copdem_heights]

    gedtm_rows: list[list[float | None]] = []
    uncertainty_rows: list[list[float | None]] = []
    validity_rows: list[list[bool]] = []
    edge_fallback_rows: list[list[bool]] = []
    terrain_samples = []
    with rasterio.open(GEDTM_DTM) as dtm, rasterio.open(GEDTM_UNCERTAINTY) as unc:
        for r in range(rows):
            h_row: list[float | None] = []
            u_row: list[float | None] = []
            v_row: list[bool] = []
            e_row: list[bool] = []
            for c in range(cols):
                lon, lat = terrain_node_lonlat(bounds, rows, cols, r, c)
                h, hv, h_native = bilinear_sample(dtm, lon, lat)
                u, uv, u_native = bilinear_sample(unc, lon, lat)
                valid = hv and uv and h is not None and u is not None and math.isfinite(h) and math.isfinite(u)
                edge_fallback = bool(h_native.get("edge_fallback") or u_native.get("edge_fallback"))
                h_row.append(round(h, 6) if valid else None)
                u_row.append(round(u, 6) if valid else None)
                v_row.append(valid)
                e_row.append(edge_fallback)
                if (r, c) in [(0, 0), (rows // 2, cols // 2), (rows - 1, cols - 1)]:
                    terrain_samples.append(
                        {
                            "row": r,
                            "col": c,
                            "lonlat": [round(lon, 12), round(lat, 12)],
                            "gedtm_native_grid": {
                                "dtm_row_corner_f": round(float(h_native["row_corner_f"]), 6),
                                "dtm_col_corner_f": round(float(h_native["col_corner_f"]), 6),
                                "dtm_row_center_f": round(float(h_native["row_center_f"]), 6),
                                "dtm_col_center_f": round(float(h_native["col_center_f"]), 6),
                                "uncertainty_row_corner_f": round(float(u_native["row_corner_f"]), 6),
                                "uncertainty_col_corner_f": round(float(u_native["col_corner_f"]), 6),
                                "uncertainty_row_center_f": round(float(u_native["row_center_f"]), 6),
                                "uncertainty_col_center_f": round(float(u_native["col_center_f"]), 6),
                                "method": h_native["method"],
                                "edge_fallback": edge_fallback,
                            },
                            "gedtm_height_m": round(h, 6) if h is not None else None,
                            "gedtm_uncertainty_m": round(u, 6) if u is not None else None,
                            "valid": valid,
                        }
                    )
            gedtm_rows.append(h_row)
            uncertainty_rows.append(u_row)
            validity_rows.append(v_row)
            edge_fallback_rows.append(e_row)

    flat_gedtm = [v for row, vr in zip(gedtm_rows, validity_rows) for v, valid in zip(row, vr) if valid and v is not None]
    flat_copdem = [float(v) for row in copdem_heights for v in row]
    valid_count = len(flat_gedtm)
    gedtm_profile = {
        "kind": "modelled_testing_only",
        "source": "GEDTM DTM 30 m, OpenGeoHub",
        "units": "metres",
        "vertical_datum": "EGM2008 / EPSG:3855",
        "epoch": "2006-01-01 to 2015-12-31 source period",
        "rows": rows,
        "cols": cols,
        "heights_m": gedtm_rows,
        "validity": validity_rows,
        "edge_fallback": edge_fallback_rows,
        "uncertainty_m": uncertainty_rows,
        "coverage": {
            "valid_nodes": valid_count,
            "missing_nodes": rows * cols - valid_count,
            "complete": valid_count == rows * cols,
            "edge_fallback_nodes": sum(1 for row in edge_fallback_rows for v in row if v),
        },
        "statistics": stats(flat_gedtm),
        "source_metadata": {
            "crs": "EPSG:4326",
            "bounds": read_json(GEDTM_QA)["layers"]["dtm"]["bounds"],
            "native_resolution_degrees": read_json(GEDTM_QA)["layers"]["dtm"]["pixel_size_deg"],
            "native_resolution_m_approx": 30,
            "resampling": "bilinear_to_existing_copdem_node_centres",
            "license": "CC BY 4.0",
            "use_recommendation": "testing-only for S06 evaluation until Contractor accepts accuracy/coverage for release",
            "dtm_provider_window_path": rel(GEDTM_DTM),
            "uncertainty_provider_window_path": rel(GEDTM_UNCERTAINTY),
        },
    }
    copdem_profile = {
        "kind": "baseline",
        "source": terrain["source"],
        "units": "metres",
        "vertical_datum": "not independently confirmed in Batch04",
        "epoch": "COPDEM source date not asserted in S06",
        "rows": rows,
        "cols": cols,
        "heights_m": copdem_heights,
        "validity": copdem_validity,
        "uncertainty_m": None,
        "coverage": {
            "valid_nodes": len(flat_copdem),
            "missing_nodes": rows * cols - len(flat_copdem),
            "complete": len(flat_copdem) == rows * cols,
        },
        "statistics": stats(flat_copdem),
        "source_metadata": {
            "crs": "EPSG:4326",
            "bounds": terrain["bbox_wgs84"],
            "resampling": "existing Batch04 fusion grid",
            "rights": "inherited from Batch01 COPDEM record",
        },
    }
    return {"copdem": copdem_profile, "gedtm": gedtm_profile}, {"terrain_samples": terrain_samples}


def prepare_buildings(scene: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    msft = read_json(MSFT_GEOJSON)
    features = msft["features"]
    require(len(features) == len(scene["buildings"]), "Microsoft GeoJSON feature count does not match Batch04 buildings")
    with rasterio.open(GOOGLE_TIF) as google:
        google_arr = google.read().astype("float64")
        nodata = google.nodata
        transform = google.transform
        width, height = google.width, google.height

    supplements = []
    lookup = {}
    accepted = []
    sample_candidates = []
    for index, b in enumerate(scene["buildings"]):
        expected_id = f"msft_{index + 1:04d}"
        require(b["id"] == expected_id, f"unexpected building order/id at index {index}: {b['id']} != {expected_id}")
        feature = features[index]
        require(abs(float(feature["properties"]["area_m2"]) - float(b["area_m2"])) < 0.02, f"area/order mismatch for {b['id']}")
        coords = feature["geometry"]["coordinates"][0]
        if coords[0] == coords[-1]:
            coords = coords[:-1]
        poly_lonlat = [(float(lon), float(lat)) for lon, lat in coords]
        poly_utm = [wgs84_to_utm48n(lon, lat) for lon, lat in poly_lonlat]
        poly_canonical = [lonlat_to_scene_m(lon, lat) for lon, lat in poly_lonlat]
        centroid_x, centroid_z = polygon_centroid_xy(poly_canonical)
        centroid_lonlat = canonical_scene_m_to_lonlat(centroid_x, centroid_z)
        legacy_centroid_lonlat = scene_m_to_lonlat(float(b["centroid_local_m"]["x"]), float(b["centroid_local_m"]["z"]))
        xs = [p[0] for p in poly_utm]
        ys = [p[1] for p in poly_utm]
        inv = ~transform
        cols_rows = [inv * (x, y) for x, y in poly_utm]
        min_col = max(0, int(math.floor(min(c for c, _ in cols_rows))) - 1)
        max_col = min(width - 1, int(math.ceil(max(c for c, _ in cols_rows))) + 1)
        min_row = max(0, int(math.floor(min(r for _, r in cols_rows))) - 1)
        max_row = min(height - 1, int(math.ceil(max(r for _, r in cols_rows))) + 1)
        sampled = []
        presence_hits = []
        height_values = []
        for row in range(min_row, max_row + 1):
            for col in range(min_col, max_col + 1):
                x, y = transform * (col + 0.5, row + 0.5)
                if point_in_poly(x, y, poly_utm):
                    count_v, height_v, presence_v = google_arr[:, row, col]
                    valid = not any(v == nodata for v in [count_v, height_v, presence_v])
                    if valid:
                        sampled.append((row, col, float(count_v), float(height_v), float(presence_v)))
                        if presence_v > 0.5:
                            presence_hits.append((row, col, float(count_v), float(height_v), float(presence_v)))
                            if 0.5 < height_v < 60:
                                height_values.append(float(height_v))
        sample_count = len(sampled)
        hit_count = len(presence_hits)
        support_ratio = hit_count / sample_count if sample_count else 0.0
        model_height = float(np.median(height_values)) if height_values and hit_count >= 1 and support_ratio >= 0.25 else None
        accepted_flag = model_height is not None and 1.0 <= model_height <= 30.0
        reason = "valid_model_height" if accepted_flag else ("no_polygon_pixels" if sample_count == 0 else "low_support_or_invalid_height")
        fallback = float(b["display_height_m"])
        display = round(model_height, 3) if accepted_flag else fallback
        supplement = {
            "id": b["id"],
            "stable_id": b["id"],
            "centroid_wgs84": [round(centroid_lonlat[0], 12), round(centroid_lonlat[1], 12)],
            "centroid_scene_m": [round(centroid_x, 6), round(centroid_z, 6)],
            "footprint_scene_m": [{"x": round(x, 6), "z": round(z, 6)} for x, z in poly_canonical],
            "raw_polygon_wgs84": [[round(lon, 12), round(lat, 12)] for lon, lat in poly_lonlat],
            "legacy_centroid_local_m": [round(float(b["centroid_local_m"]["x"]), 6), round(float(b["centroid_local_m"]["z"]), 6)],
            "legacy_centroid_wgs84": [round(legacy_centroid_lonlat[0], 12), round(legacy_centroid_lonlat[1], 12)],
            "source_height_m": None,
            "measured_height": False,
            "model_height_m": round(model_height, 3) if accepted_flag else None,
            "google_model_height_m": round(model_height, 3) if accepted_flag else None,
            "display_height_m": display,
            "fallback_height_m": fallback,
            "height_kind": "modelled" if accepted_flag else "proxy",
            "height_qualified": accepted_flag,
            "qualified": accepted_flag,
            "height_support": {
                "source": "Google Open Buildings 2.5D Temporal 2023",
                "threshold_presence": 0.5,
                "polygon_sample_pixels": sample_count,
                "presence_gt_threshold_pixels": hit_count,
                "height_valid_pixels": len(height_values),
                "support_ratio": round(support_ratio, 6),
                "accepted": accepted_flag,
                "reason": reason,
                "uncalibrated_thresholds": True,
            },
            "coordinate_support": {
                "source": "B02 Microsoft AOI GeoJSON raw WGS84 polygon by source order",
                "canonical_frame": "visual-data local tangent metres R=6378137",
                "legacy_frame_available": True,
                "legacy_to_canonical_max_vertex_shift_m_over_aoi": 10.561666,
            },
            "google_support": {
                "threshold_presence": 0.5,
                "polygon_sample_pixels": sample_count,
                "presence_gt_threshold_pixels": hit_count,
                "height_valid_pixels": len(height_values),
                "support_ratio": round(support_ratio, 6),
                "accepted": accepted_flag,
                "reason": reason,
            },
        }
        supplements.append(supplement)
        lookup[b["id"]] = {
            "display_height_m": display,
            "model_height_m": supplement["model_height_m"],
            "google_model_height_m": supplement["google_model_height_m"],
            "height_kind": supplement["height_kind"],
            "height_qualified": accepted_flag,
            "measured_height": False,
        }
        if accepted_flag:
            accepted.append(supplement)
        sample_candidates.append((accepted_flag, hit_count, sample_count, support_ratio, b, poly_lonlat, poly_utm, sampled, presence_hits, supplement))

    # Stable focus: densest accepted neighbourhood within 100 m, ties by id.
    focus = None
    if accepted:
        coords = {s["id"]: s["centroid_scene_m"] for s in accepted}
        ranked = []
        for s in accepted:
            x, z = coords[s["id"]]
            density = sum(1 for ox, oz in coords.values() if (ox - x) ** 2 + (oz - z) ** 2 <= 100**2)
            ranked.append((-density, s["id"], s))
        ranked.sort()
        chosen = ranked[0][2]
        focus = {
            "id": chosen["id"],
            "centroid_scene_m": chosen["centroid_scene_m"],
            "centroid_wgs84": chosen["centroid_wgs84"],
            "method": "accepted_google_height_building_with_largest_100m_neighbourhood_density_then_stable_id",
        }
    else:
        first = supplements[0]
        focus = {
            "id": first["id"],
            "centroid_scene_m": first["centroid_scene_m"],
            "centroid_wgs84": first["centroid_wgs84"],
            "method": "fallback_first_stable_building_no_accepted_google_heights",
        }

    sample_candidates.sort(key=lambda item: (not item[0], -item[1], item[4]["id"]))
    selected_samples = []
    roundtrip_samples = []
    for accepted_flag, hit_count, sample_count, support_ratio, b, poly_lonlat, poly_utm, sampled, presence_hits, supplement in sample_candidates[:5]:
        first_lon, first_lat = poly_lonlat[0]
        roundtrip_samples.append({"id": b["id"], **raw_wgs_roundtrip_sample(first_lon, first_lat)})
        selected_samples.append(
            {
                "id": b["id"],
                "accepted": accepted_flag,
                "raw_polygon_lonlat": [[round(lon, 12), round(lat, 12)] for lon, lat in poly_lonlat],
                "canonical_footprint_scene_m": supplement["footprint_scene_m"],
                "canonical_centroid_scene_m": supplement["centroid_scene_m"],
                "utm_polygon_epsg32648": [[round(x, 6), round(y, 6)] for x, y in poly_utm],
                "sample_pixel_rows_cols": [[r, c] for r, c, *_ in sampled[:80]],
                "presence_hit_rows_cols": [[r, c] for r, c, *_ in presence_hits[:80]],
                "support": supplement["height_support"],
                "model_height_m": supplement["model_height_m"],
                "fallback_height_m": supplement["fallback_height_m"],
                "display_height_m": supplement["display_height_m"],
            }
        )

    qa = {
        "building_samples": selected_samples,
        "raw_wgs84_canonical_roundtrip_samples": roundtrip_samples,
        "counts": {
            "total": len(supplements),
            "accepted_model_height": len(accepted),
            "proxy_height": len(supplements) - len(accepted),
        },
    }
    return supplements, lookup, {"building_qa": qa, "representative_focus": focus}


def main() -> None:
    for path, expected in EXPECTED_HASHES.items():
        actual = sha256(Path(path))
        require(actual == expected, f"hash mismatch {path}: {actual} != {expected}")

    scene = read_json(SCENE_PATH)
    visual = read_json(VISUAL_PATH)
    google_qa = read_json(GOOGLE_QA)
    gedtm_qa = read_json(GEDTM_QA)
    require(len(scene["buildings"]) == 657, "expected 657 stable buildings")
    require(google_qa["dimensions"] == [823, 833], "unexpected Google crop dimensions")

    terrain_profiles, terrain_qa = prepare_terrain(scene, visual)
    buildings, building_lookup, bq = prepare_buildings(scene)
    coordinate_transform = make_coordinate_transform(scene)
    focus = bq["representative_focus"]

    source_fingerprints = {
        rel(SCENE_PATH): sha256(SCENE_PATH),
        rel(VISUAL_PATH): sha256(VISUAL_PATH),
        rel(GOOGLE_TIF): sha256(GOOGLE_TIF),
        rel(GOOGLE_QA): sha256(GOOGLE_QA),
        rel(GOOGLE_MANIFEST): sha256(GOOGLE_MANIFEST),
        rel(GEDTM_QA): sha256(GEDTM_QA),
        rel(GEDTM_DTM): sha256(GEDTM_DTM),
        rel(GEDTM_UNCERTAINTY): sha256(GEDTM_UNCERTAINTY),
        rel(MSFT_GEOJSON): sha256(MSFT_GEOJSON),
    }

    solution = {
        "schema": "tayninh-s06-solution-data/v1",
        "generated_at": GENERATED_AT,
        "frame": {
            "coordinate_frame": "local tangent metres; x east, z north, y elevation",
            "aoi_bbox_wgs84": AOI_BBOX,
            "aoi_center_wgs84": AOI_CENTER,
            "terrain_rows": scene["terrain"]["rows"],
            "terrain_cols": scene["terrain"]["cols"],
            "terrain_edge_bounds_wgs84": visual["terrain_frame"]["edge_bounds_wgs84"],
            "terrain_pixel_centers": visual["terrain_frame"]["pixel_centers"],
        },
        "source_fingerprints": source_fingerprints,
        "coordinate_transform": coordinate_transform,
        "terrain_profiles": terrain_profiles,
        "building_supplements": buildings,
        "buildings": buildings,
        "building_height_by_id": building_lookup,
        "representative_focus": focus,
        "future_data_adapter": make_future_data_adapter(),
        "qa_summary": {
            "gedtm_complete": terrain_profiles["gedtm"]["coverage"]["complete"],
            "buildings_total": len(buildings),
            "google_model_heights_accepted": bq["building_qa"]["counts"]["accepted_model_height"],
            "google_model_heights_proxy": bq["building_qa"]["counts"]["proxy_height"],
            "source_height_m_all_null": all(b["source_height_m"] is None for b in buildings),
            "measured_height_all_false": all(not b["measured_height"] for b in buildings),
            "canonical_geometry_available": all("footprint_scene_m" in b and "centroid_scene_m" in b for b in buildings),
            "legacy_to_canonical_x_scale": coordinate_transform["legacy_to_canonical"]["x_scale"],
            "legacy_to_canonical_z_scale": coordinate_transform["legacy_to_canonical"]["z_scale"],
        },
        "disclosure": [
            "Google Open Buildings height is model-derived aboveground height, not absolute elevation and not measured survey height.",
            "GEDTM is a testing-only DTM supplement with EGM2008 vertical datum and 2006-2015 source period.",
            "0.5 m Google file grid is not 0.5 m effective optical imagery; C05 crop is effective approximately 4 m.",
            "Support threshold presence >0.5 and ratio >=0.25 are uncalibrated S06 gates disclosed for visual modelling only.",
        ],
    }

    solution_path = OUT / "solution-data.json"
    qa_path = OUT / "solution-qa.json"
    write_json(solution_path, solution)
    qa = {
        "schema": "tayninh-s06-solution-qa/v1",
        "generated_at": GENERATED_AT,
        "status": "PASS",
        "solution_data": {"path": rel(solution_path), "sha256": sha256(solution_path)},
        "source_fingerprints": source_fingerprints,
        "coordinate_transform": coordinate_transform,
        "terrain_samples": terrain_qa["terrain_samples"],
        "building_samples": bq["building_qa"]["building_samples"],
        "raw_wgs84_canonical_roundtrip_samples": bq["building_qa"]["raw_wgs84_canonical_roundtrip_samples"],
        "counts": {
            "terrain_nodes": scene["terrain"]["rows"] * scene["terrain"]["cols"],
            "gedtm_valid_nodes": terrain_profiles["gedtm"]["coverage"]["valid_nodes"],
            "buildings": len(buildings),
            **bq["building_qa"]["counts"],
        },
        "hash_checks": EXPECTED_HASHES,
        "limits": solution["disclosure"],
    }
    write_json(qa_path, qa)


if __name__ == "__main__":
    main()
