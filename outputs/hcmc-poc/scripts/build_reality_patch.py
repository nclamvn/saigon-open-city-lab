from pathlib import Path
import csv, json, math

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
scene = json.loads((DATA / "scene.json").read_text())
source_registry = json.loads((ROOT / "research/reality-patch-sources.json").read_text())

# Roughly 1.55 km2 around Nguyen Hue, Bach Dang and Bitexco.
bounds = {"west": 106.6978, "south": 10.7675, "east": 106.7087, "north": 10.7803}
rows = cols = 4
center = scene["meta"]["center"]

def local(lon, lat):
    return [(lon-center[0])*111320*math.cos(math.radians(center[1])), (center[1]-lat)*110574]

def lonlat(x, z):
    return [center[0]+x/(111320*math.cos(math.radians(center[1]))), center[1]-z/110574]

def quality_counts(buildings):
    out = {"height": 0, "levels": 0, "estimated": 0, "podium": 0}
    for b in buildings:
        out[b["q"]] += 1
    return out

tiles = []
features = []
dx = (bounds["east"]-bounds["west"])/cols
dy = (bounds["north"]-bounds["south"])/rows
for row in range(rows):
    for col in range(cols):
        west, east = bounds["west"]+col*dx, bounds["west"]+(col+1)*dx
        south, north = bounds["south"]+row*dy, bounds["south"]+(row+1)*dy
        lo = local(west, north); hi = local(east, south)
        buildings = [b for b in scene["buildings"] if lo[0] <= b["center"][0] < hi[0] and lo[1] <= b["center"][1] < hi[1]]
        tid = f"rp-r{row+1}c{col+1}"
        q = quality_counts(buildings)
        tile = {
            "id": tid,
            "row": row+1,
            "col": col+1,
            "bounds": [west, south, east, north],
            "localBounds": [lo[0], hi[1], hi[0], lo[1]],
            "buildingCount": len(buildings),
            "heightQuality": q,
            "proxy": "ready",
            "realityMesh": "missing",
            "terrain": "flat_proxy",
            "futureContent": {"lod1": f"tiles/{tid}/lod1.glb", "lod2": f"tiles/{tid}/lod2.glb"}
        }
        tiles.append(tile)
        features.append({"type":"Feature","properties":{k:v for k,v in tile.items() if k not in ("bounds","localBounds","futureContent")},"geometry":{"type":"Polygon","coordinates":[[[west,south],[east,south],[east,north],[west,north],[west,south]]]}})

selected = [b for b in scene["buildings"] if bounds["west"] <= lonlat(*b["center"])[0] <= bounds["east"] and bounds["south"] <= lonlat(*b["center"])[1] <= bounds["north"]]
manifest = {
    "version": "07A-1",
    "status": "proxy_ready_reality_capture_missing",
    "crs": "EPSG:4326 source; local ENU-like display coordinates",
    "aoi": {"name":"Nguyen Hue - Bach Dang - Bitexco","bounds":bounds,"areaKm2":round((bounds["east"]-bounds["west"])*111.32*math.cos(math.radians(center[1]))*(bounds["north"]-bounds["south"])*110.574,3)},
    "grid": {"rows": rows, "cols": cols, "tileCount": len(tiles)},
    "proxy": {"buildingCount":len(selected),"heightQuality":quality_counts(selected),"terrain":"flat","imagery":"existing EOX 2016/2017 context"},
    "reality": {"meshCoveragePercent":0,"textureCoveragePercent":0,"groundControlPoints":0,"status":"awaiting authorised capture"},
    "lodContract": [
        {"level":0,"triggerDistanceM":2400,"content":"tile bounds and city base"},
        {"level":1,"triggerDistanceM":1200,"content":"proxy footprint extrusion and roof outlines"},
        {"level":2,"triggerDistanceM":450,"content":"future photogrammetry or Gaussian Splatting; missing"}
    ],
    "tileContentContract": {"format":"glTF 2.0 / GLB referenced by OGC 3D Tiles 1.1","origin":"per-tile local origin","verticalDatum":"must be declared by producer","requiredSidecar":["provenance.json","quality.json","license.txt"]},
    "tiles": tiles,
    "sources": source_registry["sources"]
}
(DATA / "reality-patch-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
(DATA / "reality-patch.js").write_text("window.REALITY_PATCH=" + json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + ";\n")
(DATA / "reality-patch-grid.geojson").write_text(json.dumps({"type":"FeatureCollection","features":features}, ensure_ascii=False, indent=2))

tileset_dir = DATA / "3dtiles"
tileset_dir.mkdir(exist_ok=True)
region = lambda b: [math.radians(b[0]),math.radians(b[1]),math.radians(b[2]),math.radians(b[3]),-5,600]
tileset = {"asset":{"version":"1.1","tilesetVersion":"07A-plan"},"geometricError":900,"root":{"boundingVolume":{"region":region([bounds["west"],bounds["south"],bounds["east"],bounds["north"]])},"geometricError":450,"refine":"ADD","extras":{"status":"planning manifest; renderable tile content is not yet available"},"children":[{"boundingVolume":{"region":region(t["bounds"])},"geometricError":120,"extras":{"id":t["id"],"proxy":t["proxy"],"realityMesh":t["realityMesh"],"futureContent":t["futureContent"]}} for t in tiles]}}
(tileset_dir / "tileset-plan.json").write_text(json.dumps(tileset, indent=2))

with (ROOT / "research/reality-patch-readiness.csv").open("w", newline="") as f:
    w = csv.writer(f); w.writerow(["tile_id","building_count","sourced_height","estimated_height","proxy","reality_mesh"])
    for t in tiles:w.writerow([t["id"],t["buildingCount"],t["heightQuality"]["height"]+t["heightQuality"]["levels"],t["heightQuality"]["estimated"]+t["heightQuality"]["podium"],t["proxy"],t["realityMesh"]])
print(json.dumps({"tiles":len(tiles),"buildings":len(selected),"areaKm2":manifest["aoi"]["areaKm2"],"realityCoverage":0}))
