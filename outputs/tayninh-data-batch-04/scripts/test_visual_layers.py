#!/usr/bin/env python3
"""Fail-loud validation for Batch04 additive visual layer contract."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
B04 = ROOT / "tayninh-data-batch-04"
VISUAL = B04 / "derived" / "visual"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_from_b04(path_text: str) -> Path:
    return (B04 / path_text).resolve()


def image_size(path: Path) -> list[int]:
    im = Image.open(path)
    return [im.size[0], im.size[1]]


def single_band_array(path: Path) -> np.ndarray:
    arr = np.asarray(Image.open(path))
    if arr.ndim != 2:
        raise AssertionError(f"Expected single-band raster, found {arr.shape}: {path}")
    return arr


def assert_true(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> None:
    errors: list[str] = []
    visual_path = VISUAL / "visual-data.json"
    qa_path = VISUAL / "visual-qa.json"
    visual = read_json(visual_path)
    qa = read_json(qa_path)

    assert_true(visual["schema"] == "tayninh-b04-visual-data/v1", "wrong visual schema", errors)
    assert_true(qa["schema"] == "tayninh-b04-visual-qa/v1", "wrong QA schema", errors)
    assert_true(qa["status"] == "PASS", "QA status is not PASS", errors)
    assert_true(qa["visual_data"]["sha256"] == sha256(visual_path), "visual-data hash in QA is stale", errors)

    sentinel = visual["sentinel_rgb_10m_native"]
    terrain = visual["terrain_frame"]
    canopy = visual["eth_canopy_field_10m"]
    uv_grid = terrain["sentinel_rgb_texture_uv_for_terrain_pixel_centers"]

    assert_true(sentinel["dimensions"] == [330, 334], "Sentinel native dimensions changed", errors)
    assert_true(terrain["dimensions"] == [109, 109], "terrain DEM dimensions changed", errors)
    assert_true(canopy["dimensions"] == [361, 361], "canopy dimensions changed", errors)

    sentinel_asset = resolve_from_b04(sentinel["asset"]["path"])
    assert_true(image_size(sentinel_asset) == [330, 334], "Sentinel PNG is not 330x334", errors)
    assert_true(sha256(sentinel_asset) == sentinel["asset"]["sha256"], "Sentinel PNG hash mismatch", errors)
    assert_true(
        sentinel["source"]["tci_png"]["sha256"] == sentinel["asset"]["sha256"],
        "Sentinel output is not an exact copy of source PNG",
        errors,
    )

    height_asset = resolve_from_b04(canopy["assets"]["height_png"]["path"])
    uncertainty_asset = resolve_from_b04(canopy["assets"]["uncertainty_png"]["path"])
    assert_true(image_size(height_asset) == [361, 361], "height PNG is not 361x361", errors)
    assert_true(image_size(uncertainty_asset) == [361, 361], "uncertainty PNG is not 361x361", errors)

    height_tif = resolve_from_b04(canopy["source"]["height_tif"]["path"])
    uncertainty_tif = resolve_from_b04(canopy["source"]["uncertainty_tif"]["path"])
    height = single_band_array(height_tif)
    uncertainty = single_band_array(uncertainty_tif)
    assert_true(height.shape == (361, 361), "height TIFF shape mismatch", errors)
    assert_true(uncertainty.shape == (361, 361), "uncertainty TIFF shape mismatch", errors)
    assert_true(height.tolist() == canopy["height_grid_u8_rows"], "height grid does not match TIFF pixels", errors)
    assert_true(uncertainty.tolist() == canopy["uncertainty_grid_u8_rows"], "uncertainty grid does not match TIFF pixels", errors)

    nodata = canopy["source_nodata"]
    assert_true(int(np.count_nonzero(height != nodata)) == 119438, "height valid pixel count mismatch", errors)
    assert_true(int(np.count_nonzero(height == nodata)) == 10883, "height nodata pixel count mismatch", errors)
    assert_true(int(np.count_nonzero(uncertainty != nodata)) == 119438, "uncertainty valid pixel count mismatch", errors)
    assert_true(int(np.count_nonzero(uncertainty == nodata)) == 10883, "uncertainty nodata pixel count mismatch", errors)

    s2_px = sentinel["pixel_centers"]
    assert_true(
        s2_px["first_pixel_center_epsg32648_row0_col0"][1] > s2_px["last_pixel_center_epsg32648_row_last_col_last"][1],
        "Sentinel row direction is not north-to-south",
        errors,
    )
    assert_true(
        s2_px["first_pixel_center_epsg32648_row0_col0"][0] < s2_px["last_pixel_center_epsg32648_row_last_col_last"][0],
        "Sentinel column direction is not west-to-east",
        errors,
    )
    canopy_px = canopy["pixel_centers"]
    assert_true(
        canopy_px["first_pixel_center_wgs84_row0_col0"][1] > canopy_px["last_pixel_center_wgs84_row_last_col_last"][1],
        "Canopy row direction is not north-to-south",
        errors,
    )
    terrain_px = terrain["pixel_centers"]
    assert_true(
        terrain_px["first_pixel_center_wgs84_row0_col0"][1] > terrain_px["last_pixel_center_wgs84_row_last_col_last"][1],
        "Terrain row direction is not north-to-south",
        errors,
    )

    s2_scene = s2_px["source_crs_preserving_scene_bounds_m"]
    assert_true(round(s2_scene[2] - s2_scene[0], 6) == 3300.0, "Sentinel scene width is not 3300 m", errors)
    assert_true(round(s2_scene[3] - s2_scene[1], 6) == 3340.0, "Sentinel scene height is not 3340 m", errors)
    terrain_scene = terrain["edge_bounds_scene_m"]["bounds_m"]
    assert_true(
        abs((terrain_scene[2] - terrain_scene[0]) - (s2_scene[2] - s2_scene[0])) > 1.0,
        "Terrain and Sentinel frames unexpectedly collapsed to the same width",
        errors,
    )
    assert_true(
        "DIAGNOSTIC_ONLY" in sentinel["pixel_centers"]["source_crs_preserving_scene_bounds_status"],
        "axis-aligned Sentinel diagnostic bounds are not marked non-renderer",
        errors,
    )

    true_corners = sentinel["true_footprint_from_epsg32648_corners"]
    root_corners = {
        "north_west": [106.32761285582363, 11.113201106315177],
        "north_east": [106.35782374051875, 11.113066308692657],
        "south_east": [106.35768424704217, 11.082868057059079],
        "south_west": [106.32747646375863, 11.083002479433826],
    }
    for name, expected in root_corners.items():
        got = true_corners["corners"][name]["wgs84"]
        assert_true(max(abs(got[i] - expected[i]) for i in range(2)) < 1e-9, f"Sentinel {name} WGS84 corner mismatch", errors)

    refs = terrain["proj_reference_checks"]
    assert_true(refs["status"] == "PASS", "PROJ reference checks are not PASS", errors)
    assert_true(max(abs(refs["aoi_center_epsg32648_formula"][i] - refs["aoi_center_epsg32648_reference"][i]) for i in range(2)) < 0.001, "AOI center UTM reference mismatch", errors)
    assert_true(max(abs(refs["first_pixel_center_epsg32648_formula"][i] - refs["first_pixel_center_epsg32648_reference"][i]) for i in range(2)) < 0.001, "DEM first center UTM reference mismatch", errors)
    assert_true(max(abs(refs["last_pixel_center_epsg32648_formula"][i] - refs["last_pixel_center_epsg32648_reference"][i]) for i in range(2)) < 0.001, "DEM last center UTM reference mismatch", errors)

    assert_true(uv_grid["dimensions"] == [109, 109], "UV grid dimensions mismatch", errors)
    assert_true(len(uv_grid["grid_rows"]) == 109, "UV grid row count mismatch", errors)
    assert_true(all(len(row) == 109 for row in uv_grid["grid_rows"]), "UV grid column count mismatch", errors)
    assert_true(uv_grid["stats"]["total_nodes"] == 11881, "UV grid total nodes mismatch", errors)
    assert_true(uv_grid["stats"]["inside_sentinel_extent_nodes"] == 11811, "UV inside count mismatch", errors)
    assert_true(uv_grid["stats"]["outside_sentinel_extent_nodes"] == 70, "UV outside count mismatch", errors)
    assert_true(sentinel["terrain_node_texture_uv_rows"] == uv_grid["grid_rows"], "Sentinel UV rows alias does not match terrain UV grid", errors)
    assert_true(sentinel["terrain_node_texture_uv"]["stats"] == uv_grid["stats"], "Sentinel UV stats alias does not match terrain UV stats", errors)
    first_sample = uv_grid["sample_nodes"]["north_west"]["epsg32648"]
    last_sample = uv_grid["sample_nodes"]["south_east"]["epsg32648"]
    assert_true(max(abs(first_sample[i] - refs["first_pixel_center_epsg32648_reference"][i]) for i in range(2)) < 0.001, "UV NW sample UTM mismatch", errors)
    assert_true(max(abs(last_sample[i] - refs["last_pixel_center_epsg32648_reference"][i]) for i in range(2)) < 0.001, "UV SE sample UTM mismatch", errors)

    assert_true(visual["engine_contract"]["expected_dimensions"]["sentinel_rgb"] == [330, 334], "engine contract missing Sentinel dimensions", errors)
    assert_true(visual["engine_contract"]["expected_dimensions"]["eth_canopy"] == [361, 361], "engine contract missing canopy dimensions", errors)
    assert_true(visual["engine_contract"]["expected_dimensions"]["terrain_dem"] == [109, 109], "engine contract missing DEM dimensions", errors)

    print(json.dumps({"status": "PASS" if not errors else "FAIL", "errors": errors, "visual_data_sha256": sha256(visual_path)}, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
