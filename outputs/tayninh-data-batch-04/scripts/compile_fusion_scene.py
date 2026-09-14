#!/usr/bin/env python3
"""Compile deterministic Batch04 2.5D fusion scene data from local artifacts.

The compiler reads only Batches 01-03 local artifacts. It verifies every declared
input hash before emitting scene-data.json and fusion-qa.json.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
B01 = ROOT / "outputs" / "tayninh-data-batch-01"
B02 = ROOT / "outputs" / "tayninh-data-batch-02"
B03 = ROOT / "outputs" / "tayninh-data-batch-03"
B04 = ROOT / "outputs" / "tayninh-data-batch-04"
DERIVED = B04 / "derived" / "fusion"

SCHEMA = "tayninh.batch04.fusion.scene-data.v1"
FIXED_GENERATED_AT = "2026-09-14T03:45:49Z"
VERTICAL_EXAGGERATION = 2.5
CANOPY_STRIDE = 6


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def require_hash(path: Path, expected: str) -> str:
    if not path.exists():
        raise FileNotFoundError(str(path))
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"hash mismatch for {path}: expected {expected}, got {actual}")
    return actual


def round_f(value: float, digits: int = 3) -> float:
    if value is None:
        return value
    return round(float(value), digits)


def lonlat_to_local(lon: float, lat: float, center_lon: float, center_lat: float) -> tuple[float, float]:
    metres_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(center_lat)) + 1.175 * math.cos(4 * math.radians(center_lat))
    metres_per_deg_lon = 111_412.84 * math.cos(math.radians(center_lat)) - 93.5 * math.cos(3 * math.radians(center_lat))
    return ((lon - center_lon) * metres_per_deg_lon, (lat - center_lat) * metres_per_deg_lat)


def local_to_lonlat(x: float, z: float, center_lon: float, center_lat: float) -> tuple[float, float]:
    metres_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * math.radians(center_lat)) + 1.175 * math.cos(4 * math.radians(center_lat))
    metres_per_deg_lon = 111_412.84 * math.cos(math.radians(center_lat)) - 93.5 * math.cos(3 * math.radians(center_lat))
    return (center_lon + x / metres_per_deg_lon, center_lat + z / metres_per_deg_lat)


def bbox_intersects(a: list[float], b: list[float]) -> bool:
    return a[0] <= b[2] and a[2] >= b[0] and a[1] <= b[3] and a[3] >= b[1]


def point_in_bbox(lon: float, lat: float, bbox: list[float]) -> bool:
    return bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]


def raster_cell_lonlat(bounds: list[float], cols: int, rows: int, col: int, row: int) -> tuple[float, float]:
    west, south, east, north = bounds
    lon = west + (col + 0.5) * (east - west) / cols
    lat = north - (row + 0.5) * (north - south) / rows
    return lon, lat


def sample_raster_nearest(array: np.ndarray, bounds: list[float], lon: float, lat: float) -> float:
    rows, cols = array.shape[:2]
    west, south, east, north = bounds
    if not (west <= lon <= east and south <= lat <= north):
        lon = min(max(lon, west), east)
        lat = min(max(lat, south), north)
    col = int((lon - west) / (east - west) * cols)
    row = int((north - lat) / (north - south) * rows)
    col = min(max(col, 0), cols - 1)
    row = min(max(row, 0), rows - 1)
    value = array[row, col]
    if isinstance(value, np.ndarray):
        return value
    return float(value)


def polygon_centroid(coords: list[list[float]]) -> tuple[float, float]:
    """Legacy raw-coordinate centroid, retained only for adversarial diagnostics."""
    if len(coords) < 3:
        return coords[0][0], coords[0][1]
    area2 = 0.0
    cx = 0.0
    cy = 0.0
    for index, point in enumerate(coords):
        x1, y1 = point
        x2, y2 = coords[(index + 1) % len(coords)]
        cross = x1 * y2 - x2 * y1
        area2 += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    if abs(area2) < 1e-9:
        return (sum(point[0] for point in coords) / len(coords), sum(point[1] for point in coords) / len(coords))
    return (cx / (3 * area2), cy / (3 * area2))


def polygon_centroid_local(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Stable polygon centroid in local metres.

    Points are already translated into a local metre coordinate system, avoiding
    catastrophic cancellation from applying shoelace arithmetic to raw lon/lat
    values around 106E/11N with very small building rings.
    """
    if len(points) < 3:
        return points[0]
    area2 = 0.0
    cx = 0.0
    cz = 0.0
    for index, point in enumerate(points):
        x1, z1 = point
        x2, z2 = points[(index + 1) % len(points)]
        cross = x1 * z2 - x2 * z1
        area2 += cross
        cx += (x1 + x2) * cross
        cz += (z1 + z2) * cross
    if abs(area2) < 1e-9:
        return (sum(point[0] for point in points) / len(points), sum(point[1] for point in points) / len(points))
    return (cx / (3 * area2), cz / (3 * area2))


def point_in_ring(point: tuple[float, float], ring: list[tuple[float, float]]) -> bool:
    x, z = point
    inside = False
    previous_x, previous_z = ring[-1]
    for current_x, current_z in ring:
        crosses = (current_z > z) != (previous_z > z)
        if crosses:
            x_intersection = (previous_x - current_x) * (z - current_z) / (previous_z - current_z) + current_x
            if x < x_intersection:
                inside = not inside
        previous_x, previous_z = current_x, current_z
    return inside


def proxy_height(area_m2: float) -> tuple[float, str]:
    if area_m2 < 50:
        return 4.0, "area_lt_50m2"
    if area_m2 < 150:
        return 6.0, "area_50_150m2"
    if area_m2 < 500:
        return 9.0, "area_150_500m2"
    return 12.0, "area_gte_500m2"


def road_width_proxy(highway: str | None) -> float:
    table = {
        "motorway": 14.0,
        "trunk": 12.0,
        "primary": 11.0,
        "secondary": 9.0,
        "tertiary": 7.0,
        "residential": 5.0,
        "unclassified": 5.0,
        "service": 4.0,
        "track": 3.0,
        "path": 2.0,
    }
    return table.get(str(highway or "").lower(), 4.0)


def tiff_array(path: Path, mode: str | None = None) -> np.ndarray:
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(path) as image:
        if mode:
            image = image.convert(mode)
        image.load()
        return np.asarray(image)


def source_record(path: Path, role: str, product: str, date: str, resolution: str, license_text: str, provenance: str, expected_sha: str | None = None) -> dict[str, Any]:
    actual = require_hash(path, expected_sha) if expected_sha else sha256(path)
    return {
        "path": str(path.relative_to(B04.parent)),
        "sha256": actual,
        "bytes": path.stat().st_size,
        "role": role,
        "product": product,
        "date": date,
        "resolution": resolution,
        "license": license_text,
        "provenance": provenance,
    }


def main() -> None:
    DERIVED.mkdir(parents=True, exist_ok=True)

    aoi = read_json(B01 / "sources" / "aoi.json")
    bbox = [float(value) for value in aoi["bboxWGS84"]]
    center_lon, center_lat = [float(value) for value in aoi["centerWGS84"]]

    copdem = read_json(B01 / "derived" / "global" / "copdem-glo30-aoi-inspection.json")
    buildings_qa = read_json(B02 / "derived" / "buildings" / "microsoft-vietnam-132230111-aoi-qa.json")
    surface_qa = read_json(B02 / "derived" / "surface" / "surface-aoi-qa.json")
    ecosystem_qa = read_json(B03 / "derived" / "ecosystem" / "ecosystem-aoi-qa.json")
    temporal_qa = read_json(B03 / "derived" / "temporal" / "temporal-aoi-qa.json")
    b02_building_records = read_json(B02 / "sources" / "building-records.json")
    b01_local_records = read_json(B01 / "sources" / "local-records.json")
    b02_surface_records = read_json(B02 / "sources" / "surface-records.json")
    b03_ecosystem_records = read_json(B03 / "sources" / "ecosystem-records.json")
    b03_temporal_records = read_json(B03 / "sources" / "temporal-records.json")

    def manifest_sha(records: list[dict[str, Any]], record_path: str) -> str:
        for record in records:
            if record.get("local_file") == record_path:
                return record["local_sha256"]
            if record.get("snapshot") == record_path:
                return record["snapshot_sha256"]
            for key in ("input_files", "derived_files", "sidecar_files", "source_snapshots"):
                for item in record.get(key, []):
                    if item.get("path") == record_path and item.get("sha256"):
                        return item["sha256"]
        raise KeyError(f"manifest sha not found for {record_path}")

    copdem_path = B01 / copdem["source_file"]
    building_geojson_path = B02 / "derived" / "buildings" / "microsoft-vietnam-132230111-aoi.geojson"
    osm_highway_path = B01 / "raw" / "local" / "osm-highway.json"
    osm_water_path = B01 / "raw" / "local" / "osm-water.json"
    sentinel_tci_path = B02 / "derived" / "surface" / "sentinel-2-20251130-aoi-tci.tif"
    canopy_height_path = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-aoi.tif"
    canopy_uncert_path = B03 / "derived" / "ecosystem" / "eth-canopy-height-2020-uncertainty-aoi.tif"
    jrc_occ_path = B03 / "derived" / "ecosystem" / "jrc-water-occurrence-1984-2024-aoi.tif"
    jrc_season_path = B03 / "derived" / "ecosystem" / "jrc-water-seasonality-2024-aoi.tif"
    jrc_change_path = B03 / "derived" / "ecosystem" / "jrc-water-change-1984-1999-vs-2000-2024-aoi.tif"

    # Fail-loud hash verification for all primary inputs.
    source_items = [
        source_record(B01 / "sources" / "aoi.json", "aoi", "Batch01 pilot AOI", aoi["retrievedAt"], "WGS84 bbox", "local project evidence", "OSM relation-derived pilot bbox; not official boundary"),
        source_record(copdem_path, "terrain", "COPDEM GLO-30", "2026-09-14 capture", "30 m-class public DEM", "Copernicus DEM terms via Batch01 manifest", "Batch01 acquired DEM tile", copdem["source_sha256"]),
        source_record(B01 / "derived" / "global" / "copdem-glo30-aoi-inspection.json", "terrain_qa", "COPDEM AOI inspection", copdem["inspected_at"], "109 x 109 AOI window", "local derived QA", "Batch01 deterministic inspection report"),
        source_record(building_geojson_path, "buildings", "Microsoft Global ML Building Footprints", "2026-08-13", "ML footprints; no height/confidence in AOI", "CDLA Permissive 2.0 via Batch02 manifest", "Batch02 AOI GeoJSON", buildings_qa["derivedGeojsonSha256"]),
        source_record(osm_highway_path, "roads", "OpenStreetMap highways", "2026-09-14", "OSM ways", "ODbL", "Batch01 Overpass highway response", manifest_sha(b01_local_records, "raw/local/osm-highway.json")),
        source_record(osm_water_path, "osm_water", "OpenStreetMap waterway", "2026-09-14", "OSM ways", "ODbL", "Batch01 Overpass water response", manifest_sha(b01_local_records, "raw/local/osm-water.json")),
        source_record(sentinel_tci_path, "terrain_surface_color", "Sentinel-2 L2A TCI", surface_qa["sentinel_2"]["acquisition_datetime"], "10 m visual", "Copernicus Sentinel Data Legal Notice", "Batch02 AOI TCI derivative", surface_qa["derived_sha256"][str(Path("derived/surface/sentinel-2-20251130-aoi-tci.tif"))]),
        source_record(canopy_height_path, "canopy_height", "ETH Global Canopy Height 2020", "2020", "10 m modeled canopy height", "see Batch03 ecosystem manifest", "Batch03 AOI canopy-height derivative", manifest_sha(b03_ecosystem_records, "derived/ecosystem/eth-canopy-height-2020-aoi.tif")),
        source_record(canopy_uncert_path, "canopy_uncertainty", "ETH Global Canopy Height 2020 uncertainty", "2020", "10 m predictive standard deviation", "see Batch03 ecosystem manifest", "Batch03 AOI canopy-uncertainty derivative", manifest_sha(b03_ecosystem_records, "derived/ecosystem/eth-canopy-height-2020-uncertainty-aoi.tif")),
        source_record(jrc_occ_path, "jrc_occurrence", "JRC Global Surface Water occurrence", "1984-03/2024-12", "0.00025 degree nominal 30 m", "Copernicus Programme", "Batch03 AOI occurrence derivative", manifest_sha(b03_ecosystem_records, "derived/ecosystem/jrc-water-occurrence-1984-2024-aoi.tif")),
        source_record(jrc_season_path, "jrc_seasonality", "JRC Global Surface Water seasonality", "2024", "0.00025 degree nominal 30 m", "Copernicus Programme", "Batch03 AOI seasonality derivative", manifest_sha(b03_ecosystem_records, "derived/ecosystem/jrc-water-seasonality-2024-aoi.tif")),
        source_record(jrc_change_path, "jrc_change", "JRC Global Surface Water normalized occurrence change", "1984-1999 vs 2000-2024", "0.00025 degree nominal 30 m", "Copernicus Programme", "Batch03 AOI normalized change derivative", manifest_sha(b03_ecosystem_records, "derived/ecosystem/jrc-water-change-1984-1999-vs-2000-2024-aoi.tif")),
        source_record(B03 / "derived" / "temporal" / "temporal-aoi-qa.json", "temporal_change_context", "Batch03 Sentinel temporal QA", "2024-12-20 compared with 2025-11-30", "10 m candidate RGB distance", "local derived QA", "Temporal candidate change QA", b03_temporal_records[0]["qa_sha256"]),
    ]

    # Terrain from COPDEM AOI window.
    dem_full = tiff_array(copdem_path).astype(np.float32)
    col0, row0, col1, row1 = [int(value) for value in copdem["aoi_window_pixels"]]
    terrain_array = dem_full[row0:row1, col0:col1]
    if terrain_array.shape != (int(copdem["aoi_window_height"]), int(copdem["aoi_window_width"])):
        raise RuntimeError(f"terrain shape mismatch {terrain_array.shape}")
    if not np.isfinite(terrain_array).all():
        raise RuntimeError("terrain contains non-finite values")
    terrain_bounds = [float(value) for value in copdem["aoi_window_bounds_wgs84"]]
    terrain_rows, terrain_cols = terrain_array.shape

    # Sentinel RGB sampled to the terrain grid for texture/drape use.
    tci_array = tiff_array(sentinel_tci_path, "RGB")
    tci_bounds = [float(value) for value in surface_qa["sentinel_2"]["tci_derived_envelope_wgs84"]]
    surface_rgb: list[list[list[int]]] = []
    for row in range(terrain_rows):
        rgb_row = []
        for col in range(terrain_cols):
            lon, lat = raster_cell_lonlat(terrain_bounds, terrain_cols, terrain_rows, col, row)
            rgb = sample_raster_nearest(tci_array, tci_bounds, lon, lat)
            rgb_row.append([int(rgb[0]), int(rgb[1]), int(rgb[2])])
        surface_rgb.append(rgb_row)

    terrain_grid = []
    for row in range(terrain_rows):
        height_row = []
        for col in range(terrain_cols):
            height_row.append(round_f(float(terrain_array[row, col]), 2))
        terrain_grid.append(height_row)

    def terrain_at(lon: float, lat: float) -> float:
        return round_f(sample_raster_nearest(terrain_array, terrain_bounds, lon, lat), 2)

    def local_point(lon: float, lat: float, include_y: bool = True) -> dict[str, float]:
        x, z = lonlat_to_local(lon, lat, center_lon, center_lat)
        point = {"x": round_f(x), "z": round_f(z)}
        if include_y:
            point["y"] = terrain_at(lon, lat)
        return point

    # Buildings.
    building_geojson = read_json(building_geojson_path)
    buildings = []
    height_rule_counts: Counter[str] = Counter()
    centroid_error_distances_m: list[float] = []
    centroid_bbox_failures = 0
    centroid_within_footprint_failures = 0
    for index, feature in enumerate(building_geojson["features"]):
        geometry = feature["geometry"]
        if geometry["type"] != "Polygon":
            continue
        ring = geometry["coordinates"][0]
        if len(ring) >= 2 and ring[0] == ring[-1]:
            ring = ring[:-1]
        if len(ring) < 3:
            continue
        old_lon_c, old_lat_c = polygon_centroid(ring)
        local_ring = [lonlat_to_local(lon, lat, center_lon, center_lat) for lon, lat in ring]
        centroid_x, centroid_z = polygon_centroid_local(local_ring)
        lon_c, lat_c = local_to_lonlat(centroid_x, centroid_z, center_lon, center_lat)
        old_x, old_z = lonlat_to_local(old_lon_c, old_lat_c, center_lon, center_lat)
        centroid_error_distances_m.append(math.hypot(centroid_x - old_x, centroid_z - old_z))
        min_x = min(point[0] for point in local_ring)
        max_x = max(point[0] for point in local_ring)
        min_z = min(point[1] for point in local_ring)
        max_z = max(point[1] for point in local_ring)
        centroid_in_bbox = min_x - 1e-9 <= centroid_x <= max_x + 1e-9 and min_z - 1e-9 <= centroid_z <= max_z + 1e-9
        centroid_in_footprint = point_in_ring((centroid_x, centroid_z), local_ring)
        if not centroid_in_bbox:
            centroid_bbox_failures += 1
        if not centroid_in_footprint:
            centroid_within_footprint_failures += 1
        area = float(feature["properties"].get("area_m2") or 0.0)
        display_height, height_rule = proxy_height(area)
        height_rule_counts[height_rule] += 1
        points = [local_point(lon, lat, include_y=False) for lon, lat in ring]
        buildings.append(
            {
                "id": f"msft_{index + 1:04d}",
                "source": "Microsoft Global ML Building Footprints",
                "source_quadkey": feature["properties"].get("source_quadkey"),
                "footprint_local_m": points,
                "centroid_local_m": {"x": round_f(centroid_x), "z": round_f(centroid_z), "y": terrain_at(lon_c, lat_c)},
                "area_m2": round_f(area, 2),
                "base_elevation_m": terrain_at(lon_c, lat_c),
                "display_height_m": display_height,
                "height_method": "area_class_proxy_no_source_height",
                "height_rule": height_rule,
                "source_height_m": None,
                "measured_height": False,
                "centroid_method": "stable_local_metre_shoelace",
                "centroid_in_bbox": centroid_in_bbox,
                "centroid_in_footprint": centroid_in_footprint,
            }
        )

    # OSM roads.
    roads_json = read_json(osm_highway_path)
    roads = []
    for element in roads_json.get("elements", []):
        bounds = element.get("bounds")
        if not bounds:
            continue
        ebbox = [bounds["minlon"], bounds["minlat"], bounds["maxlon"], bounds["maxlat"]]
        if not bbox_intersects(ebbox, bbox):
            continue
        geometry = element.get("geometry", [])
        inside = [point for point in geometry if point_in_bbox(point["lon"], point["lat"], bbox)]
        selected = inside if len(inside) >= 2 else geometry
        tags = element.get("tags", {})
        path_points = [local_point(point["lon"], point["lat"]) for point in selected]
        if len(path_points) < 2:
            continue
        roads.append(
            {
                "id": str(element["id"]),
                "class": tags.get("highway"),
                "name": tags.get("name") or tags.get("ref") or "",
                "width_proxy_m": road_width_proxy(tags.get("highway")),
                "terrain_following": True,
                "path_local_m": path_points,
            }
        )

    # OSM water.
    water_json = read_json(osm_water_path)
    osm_water = []
    for element in water_json.get("elements", []):
        bounds = element.get("bounds")
        if not bounds:
            continue
        ebbox = [bounds["minlon"], bounds["minlat"], bounds["maxlon"], bounds["maxlat"]]
        if not bbox_intersects(ebbox, bbox):
            continue
        geometry = element.get("geometry", [])
        inside = [point for point in geometry if point_in_bbox(point["lon"], point["lat"], bbox)]
        selected = inside if len(inside) >= 2 else geometry
        tags = element.get("tags", {})
        osm_water.append(
            {
                "id": str(element["id"]),
                "type": tags.get("waterway") or tags.get("natural") or tags.get("water") or "water",
                "name": tags.get("name") or "",
                "path_local_m": [local_point(point["lon"], point["lat"]) for point in selected],
            }
        )

    # Canopy samples.
    canopy_array = tiff_array(canopy_height_path).astype(np.uint8)
    uncertainty_array = tiff_array(canopy_uncert_path).astype(np.uint8)
    canopy_meta = ecosystem_qa["eth_canopy_height_2020"]
    canopy_bounds = [float(value) for value in canopy_meta["derived_pixel_aligned_bounds"]]
    canopy_samples = []
    for row in range(0, canopy_array.shape[0], CANOPY_STRIDE):
        for col in range(0, canopy_array.shape[1], CANOPY_STRIDE):
            height = int(canopy_array[row, col])
            uncertainty = int(uncertainty_array[row, col])
            if height == 255 or height <= 0:
                continue
            lon, lat = raster_cell_lonlat(canopy_bounds, canopy_array.shape[1], canopy_array.shape[0], col, row)
            x, z = lonlat_to_local(lon, lat, center_lon, center_lat)
            canopy_samples.append(
                {
                    "row": row,
                    "col": col,
                    "x": round_f(x),
                    "z": round_f(z),
                    "base_elevation_m": terrain_at(lon, lat),
                    "modeled_height_m": float(height),
                    "predictive_sd_m": None if uncertainty == 255 else float(uncertainty),
                    "label": "raster_sample_not_individual_tree",
                }
            )

    # JRC water cells, retaining every nonzero occurrence pixel.
    occurrence = tiff_array(jrc_occ_path).astype(np.uint8)
    seasonality = tiff_array(jrc_season_path).astype(np.uint8)
    change = tiff_array(jrc_change_path).astype(np.uint8)
    jrc_meta = ecosystem_qa["jrc_global_surface_water_v1_5_2024"]
    jrc_bounds = [float(value) for value in jrc_meta["derived_pixel_aligned_bounds"]]
    jrc_water_cells = []
    for row in range(occurrence.shape[0]):
        for col in range(occurrence.shape[1]):
            occ = int(occurrence[row, col])
            if occ <= 0 or occ == 255:
                continue
            lon, lat = raster_cell_lonlat(jrc_bounds, occurrence.shape[1], occurrence.shape[0], col, row)
            x, z = lonlat_to_local(lon, lat, center_lon, center_lat)
            raw_change = int(change[row, col])
            jrc_water_cells.append(
                {
                    "row": row,
                    "col": col,
                    "x": round_f(x),
                    "z": round_f(z),
                    "base_elevation_m": terrain_at(lon, lat),
                    "occurrence_percent": occ,
                    "seasonality_2024_months": None if int(seasonality[row, col]) == 255 else int(seasonality[row, col]),
                    "normalized_change_raw": raw_change,
                    "normalized_change_percent": None if raw_change in (253, 254, 255) else raw_change - 100,
                    "label": "surface_water_history_cell_not_flood_model",
                }
            )

    disclosure = {
        "aoi": "AOI is an OSM-derived pilot bbox and not an official Gia Loc ward boundary.",
        "terrain": "COPDEM is a public 30 m-class context DEM; not survey DTM/DSM or LiDAR.",
        "sentinel": "Sentinel-2 TCI is 10 m public satellite visual data, not 1 cm orthophoto.",
        "buildings": "Microsoft building heights are unavailable in this AOI; displayed heights are deterministic area-class proxies.",
        "canopy": "ETH canopy values are modeled raster samples, not individual-tree inventory.",
        "water": "JRC water history is remote-sensing evidence, not drainage, flood-depth, or hydraulic modelling.",
        "temporal": "Sentinel temporal heatmap is candidate spectral difference only and not a violation or new-building detector.",
    }

    terrain_min = float(np.min(terrain_array))
    terrain_max = float(np.max(terrain_array))
    terrain_mean = float(np.mean(terrain_array))
    building_area_values = [item["area_m2"] for item in buildings]
    centroid_errors = np.asarray(centroid_error_distances_m, dtype=np.float64)
    centroid_error_stats = {
        "count": int(centroid_errors.size),
        "min_m": round_f(float(np.min(centroid_errors)), 6) if centroid_errors.size else None,
        "median_m": round_f(float(np.median(centroid_errors)), 6) if centroid_errors.size else None,
        "mean_m": round_f(float(np.mean(centroid_errors)), 6) if centroid_errors.size else None,
        "max_m": round_f(float(np.max(centroid_errors)), 6) if centroid_errors.size else None,
        "gt_1m_count": int(np.count_nonzero(centroid_errors > 1.0)),
        "gt_10m_count": int(np.count_nonzero(centroid_errors > 10.0)),
        "source_of_distance": "legacy_raw_lonlat_shoelace_centroid_to_corrected_stable_local_metre_centroid",
    }
    road_classes = Counter(item["class"] or "unknown" for item in roads)
    scene = {
        "schema": SCHEMA,
        "generated_at": FIXED_GENERATED_AT,
        "aoi": {
            "id": aoi["id"],
            "label": aoi["label"],
            "bbox_wgs84": bbox,
            "center_wgs84": [center_lon, center_lat],
            "local_crs": "local tangent metres, x=east, z=north, y=elevation metres",
            "official_boundary": False,
        },
        "sources": source_items,
        "disclosure": disclosure,
        "terrain": {
            "rows": terrain_rows,
            "cols": terrain_cols,
            "heights_m": terrain_grid,
            "surface_rgb": surface_rgb,
            "bbox_wgs84": terrain_bounds,
            "min_m": round_f(terrain_min, 3),
            "max_m": round_f(terrain_max, 3),
            "mean_m": round_f(terrain_mean, 3),
            "vertical_exaggeration": VERTICAL_EXAGGERATION,
            "display_method": "real_copdem_grid_with_sentinel_tci_sampled_to_terrain",
            "source": {
                "path": str(copdem_path.relative_to(B04.parent)),
                "sha256": copdem["source_sha256"],
                "resolution": "30 m-class",
            },
        },
        "buildings": buildings,
        "roads": roads,
        "osm_water": osm_water,
        "canopy_samples": canopy_samples,
        "jrc_water_cells": jrc_water_cells,
        "temporal_change": {
            "qa_file": str((B03 / "derived" / "temporal" / "temporal-aoi-qa.json").relative_to(B04.parent)),
            "candidate_epoch": temporal_qa["candidate_epoch"]["item_id"],
            "reference_epoch": temporal_qa["reference_epoch"]["item_id"],
            "valid_comparison_percent": temporal_qa["masking"]["valid_comparison_percent"],
            "strong_pixels": temporal_qa["candidate_difference_pixels"]["strong_pixels"],
            "display_method": "candidate_rgb_spectral_difference_only",
            "nonclaim": temporal_qa["candidate_difference_pixels"]["non_claim"],
        },
        "statistics": {
            "terrain": {
                "finite_pixel_count": int(np.isfinite(terrain_array).sum()),
                "min_m": round_f(terrain_min, 3),
                "max_m": round_f(terrain_max, 3),
                "mean_m": round_f(terrain_mean, 3),
            },
            "buildings": {
                "count": len(buildings),
                "source_height_null_count": buildings_qa["height"]["null"],
                "proxy_height_rule_counts": dict(sorted(height_rule_counts.items())),
                "area_m2_min": round_f(min(building_area_values), 2) if building_area_values else None,
                "area_m2_max": round_f(max(building_area_values), 2) if building_area_values else None,
                "area_m2_total": round_f(sum(building_area_values), 2),
                "centroid_method": "stable_local_metre_shoelace",
                "centroid_bbox_failures": centroid_bbox_failures,
                "centroid_within_footprint_failures": centroid_within_footprint_failures,
                "legacy_centroid_error_distance": centroid_error_stats,
            },
            "roads": {
                "count": len(roads),
                "class_counts": dict(sorted(road_classes.items())),
            },
            "osm_water": {
                "count": len(osm_water),
            },
            "canopy": {
                "sample_stride_pixels": CANOPY_STRIDE,
                "samples": len(canopy_samples),
                "source_valid_pixels": canopy_meta["height_valid_pixels"],
                "source_positive_pixels": canopy_meta["height_positive_pixels"],
                "height_min_m": canopy_meta["height_statistics"]["min"],
                "height_max_m": canopy_meta["height_statistics"]["max"],
                "height_mean_m": canopy_meta["height_statistics"]["mean"],
                "uncertainty_mean_m": canopy_meta["uncertainty_statistics"]["mean"],
            },
            "jrc_water": {
                "nonzero_occurrence_cells": len(jrc_water_cells),
                "source_occurrence_water_pixels_1_to_100": jrc_meta["occurrence"]["water_pixels_value_1_to_100"],
                "seasonality_2024_water_pixels_1_to_12": jrc_meta["seasonality"]["water_pixels_value_1_to_12"],
                "normalized_change_comparable_pixels": jrc_meta["normalized_occurrence_change"]["comparable_pixels_value_0_to_200"],
            },
            "temporal_change": {
                "valid_comparison_percent": temporal_qa["masking"]["valid_comparison_percent"],
                "moderate_or_stronger_pixels": temporal_qa["candidate_difference_pixels"]["moderate_or_stronger_pixels"],
                "strong_pixels": temporal_qa["candidate_difference_pixels"]["strong_pixels"],
            },
        },
    }

    scene_path = DERIVED / "scene-data.json"
    scene_path.write_text(json.dumps(scene, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    scene_sha = sha256(scene_path)

    qa = {
        "schema": "tayninh.batch04.fusion.qa.v1",
        "generated_at": FIXED_GENERATED_AT,
        "scene_data": {
            "path": str(scene_path.relative_to(B04)),
            "sha256": scene_sha,
            "bytes": scene_path.stat().st_size,
            "byte_stable_generation": "PASS: fixed generated_at and sorted compact JSON",
        },
        "source_count": len(source_items),
        "source_hashes_verified": True,
        "counts": {
            "terrain_rows": terrain_rows,
            "terrain_cols": terrain_cols,
            "buildings": len(buildings),
            "roads": len(roads),
            "osm_water": len(osm_water),
            "canopy_samples": len(canopy_samples),
            "jrc_water_cells": len(jrc_water_cells),
        },
        "terrain": scene["statistics"]["terrain"],
        "buildings": scene["statistics"]["buildings"],
        "roads": scene["statistics"]["roads"],
        "canopy": scene["statistics"]["canopy"],
        "jrc_water": scene["statistics"]["jrc_water"],
        "temporal_change": scene["statistics"]["temporal_change"],
        "bounds": {
            "aoi_wgs84": bbox,
            "terrain_wgs84": terrain_bounds,
            "building_bounds_wgs84": buildings_qa["bounds"],
            "canopy_wgs84": canopy_bounds,
            "jrc_wgs84": jrc_bounds,
        },
        "lineage": {
            "sources": [{key: item[key] for key in ("path", "sha256", "role", "product")} for item in source_items],
            "building_manifest_record": b02_building_records[0]["id"],
            "ecosystem_manifest_records": [record["id"] for record in b03_ecosystem_records],
            "temporal_manifest_record": b03_temporal_records[0]["id"],
        },
        "nonclaims": list(disclosure.values()),
        "acceptance": {
            "finite_terrain": bool(np.isfinite(terrain_array).all()),
            "all_buildings_have_proxy_height_method": all(item["height_method"] == "area_class_proxy_no_source_height" and item["source_height_m"] is None for item in buildings),
            "all_building_centroids_within_bbox": centroid_bbox_failures == 0,
            "all_building_centroids_within_footprint": centroid_within_footprint_failures == 0,
            "centroid_error_gate_ran_all_buildings": int(centroid_errors.size) == len(buildings) == buildings_qa["featureCount"],
            "all_nonzero_jrc_occurrence_cells_retained": len(jrc_water_cells) == int(jrc_meta["occurrence"]["water_pixels_value_1_to_100"]),
            "canopy_samples_are_raster_samples": all(item["label"] == "raster_sample_not_individual_tree" for item in canopy_samples),
            "no_measured_building_height_claim": all(not item["measured_height"] for item in buildings),
        },
    }
    qa_path = DERIVED / "fusion-qa.json"
    qa_path.write_text(json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
