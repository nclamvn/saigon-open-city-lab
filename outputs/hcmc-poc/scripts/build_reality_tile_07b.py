#!/usr/bin/env python3
"""Build a deterministic procedural GLB dry-run for Reality Tile rp-r2c3."""
from __future__ import annotations

import hashlib
import json
import math
import struct
from array import array
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TILE_ID = "rp-r2c3"
OUT = ROOT / "tiles" / TILE_ID


def area(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


def inside_tri(p, a, b, c):
    def cross(u, v, w):
        return (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0])
    x, y, z = cross(a, b, p), cross(b, c, p), cross(c, a, p)
    return not ((x < -1e-8 or y < -1e-8 or z < -1e-8) and (x > 1e-8 or y > 1e-8 or z > 1e-8))


def triangulate(poly):
    pts = poly[:-1] if len(poly) > 2 and poly[0] == poly[-1] else poly[:]
    if len(pts) < 3:
        return []
    order = list(range(len(pts)))
    if area(pts) < 0:
        order.reverse()
    tris, guard = [], 0
    while len(order) > 3 and guard < len(pts) * len(pts):
        guard += 1
        found = False
        for j, i in enumerate(order):
            ia, ic = order[j - 1], order[(j + 1) % len(order)]
            a, b, c = pts[ia], pts[i], pts[ic]
            if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 1e-8:
                continue
            if any(inside_tri(pts[k], a, b, c) for k in order if k not in (ia, i, ic)):
                continue
            tris.append((a, b, c)); del order[j]; found = True; break
        if not found:
            break
    if len(order) == 3:
        tris.append(tuple(pts[i] for i in order))
    if not tris:
        tris = [(pts[0], pts[i], pts[i + 1]) for i in range(1, len(pts) - 1)]
    return tris


def main():
    scene = json.loads((ROOT / "data" / "scene.json").read_text())
    manifest = json.loads((ROOT / "data" / "reality-patch-manifest.json").read_text())
    tile = next(t for t in manifest["tiles"] if t["id"] == TILE_ID)
    minx, maxz, maxx, minz = tile["localBounds"]
    ox, oz = (minx + maxx) / 2, (minz + maxz) / 2
    buildings = [b for b in scene["buildings"] if minx <= b["center"][0] <= maxx and minz <= b["center"][1] <= maxz]

    pos, normal, color, uv = array("f"), array("f"), array("f"), array("f")
    triangles = 0

    def vertex(x, y, z, nx, ny, nz, col, u=0, v=0):
        pos.extend((x - ox, y, z - oz)); normal.extend((nx, ny, nz)); color.extend(col); uv.extend((u, v))

    def tri(a, b, c, n, col, ta=(0, 0), tb=(0, 0), tc=(0, 0)):
        nonlocal triangles
        for q, t in ((a, ta), (b, tb), (c, tc)):
            vertex(*q, *n, col, *t)
        triangles += 1

    def quad(a, b, c, d, n, col, u0=0, u1=1, v0=0, v1=1):
        tri(a, b, c, n, col, (u0, v0), (u1, v0), (u1, v1))
        tri(a, c, d, n, col, (u0, v0), (u1, v1), (u0, v1))

    for bi, b in enumerate(buildings):
        ring = b["r"][0]
        if len(ring) < 3:
            continue
        base, top = b.get("min", 0) + 1.5, b["h"] + 1.5
        if top <= base:
            continue
        glass = bool(b.get("glass")) or top > 55
        tone = 0.88 + (int(b["id"]) % 11) * 0.008
        wall = (0.48 * tone, 0.62 * tone, 0.64 * tone, 1.0) if glass else (0.72 * tone, 0.70 * tone, 0.64 * tone, 1.0)
        roof = tuple(min(1, c * 1.08) for c in wall[:3]) + (1.0,)
        grid = (0.025, 0.07, 0.085, 1.0) if glass else (0.12, 0.13, 0.12, 1.0)
        for a, mid, c in triangulate(ring):
            tri((a[0], top, a[1]), (c[0], top, c[1]), (mid[0], top, mid[1]), (0, 1, 0), roof)
        for i, a in enumerate(ring):
            c = ring[(i + 1) % len(ring)]
            dx, dz = c[0] - a[0], c[1] - a[1]
            length = math.hypot(dx, dz)
            if length < 0.25:
                continue
            nx, nz = dz / length, -dx / length
            p0, p1, p2, p3 = (a[0], base, a[1]), (c[0], base, c[1]), (c[0], top, c[1]), (a[0], top, a[1])
            quad(p0, p1, p2, p3, (nx, 0, nz), wall, 0, length, base, top)
            if top - base > 7 and length > 3:
                off = 0.08
                ax, az, cx, cz = a[0] + nx * off, a[1] + nz * off, c[0] + nx * off, c[1] + nz * off
                for y in range(math.ceil((base + 2.8) / 3.2), math.floor((top - 1.0) / 3.2) + 1):
                    yy = y * 3.2
                    quad((ax, yy, az), (cx, yy, cz), (cx, yy + .13, cz), (ax, yy + .13, az), (nx, 0, nz), grid)
                panes = min(18, max(1, int(length / 3.1)))
                for j in range(1, panes):
                    t = j / panes; x, z = ax + (cx - ax) * t, az + (cz - az) * t
                    sx, sz = dx / length * .07, dz / length * .07
                    quad((x - sx, base + .6, z - sz), (x + sx, base + .6, z + sz), (x + sx, top - .55, z + sz), (x - sx, top - .55, z - sz), (nx, 0, nz), grid)

    arrays = [("POSITION", pos, 3), ("NORMAL", normal, 3), ("COLOR_0", color, 4), ("TEXCOORD_0", uv, 2)]
    blob, views, accessors = bytearray(), [], []
    for semantic, values, size in arrays:
        while len(blob) % 4: blob.append(0)
        offset = len(blob); raw = values.tobytes(); blob.extend(raw)
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(raw), "target": 34962})
        acc = {"bufferView": len(views) - 1, "componentType": 5126, "count": len(values) // size, "type": {2:"VEC2",3:"VEC3",4:"VEC4"}[size]}
        if semantic == "POSITION":
            vals = list(zip(*(iter(values),) * 3)); acc["min"] = [min(v[i] for v in vals) for i in range(3)]; acc["max"] = [max(v[i] for v in vals) for i in range(3)]
        accessors.append(acc)

    gltf = {
        "asset": {"version": "2.0", "generator": "Open City Lab PoC 07B deterministic procedural tile"},
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "translation": [ox, 0, oz], "name": TILE_ID}],
        "meshes": [{"name": f"{TILE_ID}-procedural-lod2", "primitives": [{"attributes": {a[0]: i for i, a in enumerate(arrays)}, "material": 0, "mode": 4}]}],
        "materials": [{"name": "procedural-open-data", "pbrMetallicRoughness": {"baseColorFactor": [1,1,1,1], "metallicFactor": .12, "roughnessFactor": .42}, "doubleSided": True}],
        "buffers": [{"byteLength": len(blob)}], "bufferViews": views, "accessors": accessors,
        "extras": {"tileId": TILE_ID, "classification": "procedural_open_data_lod2", "surveyedRealityMesh": False, "buildingCount": len(buildings)}
    }
    js = json.dumps(gltf, separators=(",", ":")).encode(); js += b" " * ((4 - len(js) % 4) % 4)
    blob += b"\x00" * ((4 - len(blob) % 4) % 4)
    body = struct.pack("<I4s", len(js), b"JSON") + js + struct.pack("<I4s", len(blob), b"BIN\x00") + blob
    glb = struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body
    OUT.mkdir(parents=True, exist_ok=True)
    glb_path = OUT / "lod2.glb"; glb_path.write_bytes(glb)
    sha = hashlib.sha256(glb).hexdigest()
    provenance = {
        "tileId": TILE_ID, "status": "procedural_open_data_dry_run", "surveyedRealityMesh": False,
        "contentUri": "lod2.glb", "source": "Archived OpenStreetMap/Overture-derived scene footprints and existing PoC height-quality registry",
        "license": "See project source catalog and per-source attribution", "captureDate": None,
        "horizontalCrs": "Local display coordinates derived from EPSG:4326", "verticalDatum": "illustrative local height; not surveyed",
        "quality": {"status": "unverified", "positionAccuracyM": None, "textureGsdCm": None},
        "buildingCount": len(buildings), "triangleCount": triangles, "sha256": sha,
        "generatedAt": datetime.now(timezone.utc).isoformat()
    }
    (OUT / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n")
    (OUT / "quality.json").write_text(json.dumps({"geometry":"footprint extrusion with procedural facade bands", "roofs":"flat approximation", "textures":"none", "surveyGrade":False}, indent=2) + "\n")
    (OUT / "license.txt").write_text("Procedural derivative. Preserve the attributions declared in ../../research/source-catalog.json.\n")
    tileset = {"asset":{"version":"1.1"},"geometricError":350,"root":{"boundingVolume":{"box":[ox,135,oz,(maxx-minx)/2,0,0,0,135,0,0,0,(maxz-minz)/2]},"geometricError":0,"refine":"REPLACE","content":{"uri":"../../tiles/rp-r2c3/lod2.glb"},"extras":{"classification":"procedural_open_data_lod2","surveyedRealityMesh":False,"tileId":TILE_ID}}}
    (ROOT / "data" / "3dtiles" / "tileset-07b.json").write_text(json.dumps(tileset, indent=2) + "\n")
    print(json.dumps({"tile":TILE_ID,"buildings":len(buildings),"triangles":triangles,"bytes":len(glb),"sha256":sha}))


if __name__ == "__main__":
    main()
