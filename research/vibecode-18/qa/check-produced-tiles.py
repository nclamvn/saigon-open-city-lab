#!/usr/bin/env python3
"""Contractor oracle: inspect actual produced files, not producer internals."""
import array, hashlib, json, math, pathlib, struct, sys
ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / 'outputs/hcmc-poc/data/tiles-18'
cat = json.loads((OUT / 'catalog.json').read_text())
tileset = json.loads((OUT / 'tileset.json').read_text())
scene_raw = (ROOT / 'outputs/hcmc-poc/data/scene.json').read_bytes()
scene = json.loads(scene_raw)
assert hashlib.sha256(scene_raw).hexdigest() == cat['sourceInput']['sha256']
assert len(scene_raw) == cat['sourceInput']['bytes']
assert tileset['asset']['version'] == '1.1'
matrix = tileset['root']['transform']
assert len(matrix) == 16 and matrix[15] == 1
# Independent geodetic origin via PROJ, not producer's ECEF function.
from pyproj import Transformer
origin = json.loads((ROOT / 'outputs/shared/digital-twin-core/projects/hcmc.json').read_text())['frame']['origin']
ecef = Transformer.from_crs(4979, 4978, always_xy=True).transform(*origin, 0)
assert max(abs(matrix[12+i] - ecef[i]) for i in range(3)) < 1e-6
lon, lat = map(math.radians, origin)
east = [-math.sin(lon), math.cos(lon), 0]
north = [-math.sin(lat)*math.cos(lon), -math.sin(lat)*math.sin(lon), math.cos(lat)]
up = [math.cos(lat)*math.cos(lon), math.cos(lat)*math.sin(lon), math.sin(lat)]
for v in ([170, 35, -80], [-2600, -4, 3100], [0, 0, 0]):
    enu = [v[0], -v[2], v[1]]  # glTF Y-up → tile Z-up, Rx(+pi/2)
    actual = [matrix[12+i] + sum(matrix[4*j+i]*enu[j] for j in range(3)) for i in range(3)]
    expected = [ecef[i] + east[i]*v[0] - north[i]*v[2] + up[i]*v[1] for i in range(3)]
    assert max(abs(a-b) for a,b in zip(actual,expected)) < 1e-6

seen = set(); vertices = triangles = glbs = 0; max_roof_error = 0
for tile, child in zip(cat['tiles'], tileset['root']['children']):
    fine_ids = None
    for level in ('fine', 'coarse'):
        content = tile[level]
        file = ROOT / 'outputs' / content['url'].lstrip('/')
        raw = file.read_bytes()
        assert len(raw) == content['byteLength']
        assert hashlib.sha256(raw).hexdigest() == content['sha256']
        magic, version, length = struct.unpack_from('<III', raw)
        assert magic == 0x46546c67 and version == 2 and length == len(raw)
        jlen, jtype = struct.unpack_from('<II', raw, 12)
        assert jtype == 0x4e4f534a and jlen % 4 == 0
        doc = json.loads(raw[20:20+jlen])
        blen, btype = struct.unpack_from('<II', raw, 20+jlen)
        assert btype == 0x004e4942 and 28+jlen+blen == len(raw)
        binraw = raw[28+jlen:]
        assert doc['asset']['version'] == '2.0' and len(doc['meshes']) == 1
        attrs = []
        for ai in range(4):
            acc = doc['accessors'][ai]; view = doc['bufferViews'][acc['bufferView']]
            count = acc['count']*(3 if acc['type'] == 'VEC3' else 1)
            assert view.get('byteOffset', 0) % 4 == 0
            assert view['byteLength'] == count*4
            a = array.array('f' if acc['componentType'] == 5126 else 'I')
            a.frombytes(binraw[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])
            if sys.byteorder != 'little': a.byteswap()
            attrs.append(a)
        pos, norms, colors, idx = attrs
        assert len(pos) == len(norms) == len(colors)
        assert all(math.isfinite(v) for v in pos)
        assert len(idx) % 3 == 0 and max(idx) < len(pos)//3
        for axis in range(3):
            assert abs(min(pos[axis::3])-doc['accessors'][0]['min'][axis]) < .002
            assert abs(max(pos[axis::3])-doc['accessors'][0]['max'][axis]) < .002
        sidepath = ROOT / 'outputs' / content['featureIndexUrl'].lstrip('/')
        sideraw = sidepath.read_bytes(); side = json.loads(sideraw)
        if content.get('featureIndexSha256'):
            assert hashlib.sha256(sideraw).hexdigest() == content['featureIndexSha256']
        fs = side['features']; ids = [f['canonicalId'] for f in fs]
        assert len(ids) == len(set(ids)) == tile['featureCount']
        assert sum(f['indexRange'][1] for f in fs) == len(idx)
        assert sum(f['vertexRange'][1] for f in fs) == len(pos)//3
        for f in fs:
            native = scene['buildings'][f['modelIndex']]
            expected_source_id = native.get('gers') if native.get('origin') == 'Overture' else native['id']
            assert str(expected_source_id) == str(f['sourceId'])
            assert abs(f['height']['value']-native['h']) < 1e-9
            if level == 'fine':
                start, count = f['indexRange']; roof_area = 0
                for t in range(start, start+count, 3):
                    ii = idx[t:t+3]
                    if all(norms[k*3+1] > .999 for k in ii):
                        a,b,c = [[pos[k*3],pos[k*3+2]] for k in ii]
                        roof_area += abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
                def area(r):
                    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(r,r[1:]+r[:1])))/2
                expected_area = area(native['r'][0])-sum(area(r) for r in native['r'][1:])
                error = abs(roof_area-expected_area)
                max_roof_error = max(max_roof_error,error)
                assert error <= max(.15, expected_area*2e-4), (f['canonicalId'], roof_area, expected_area)
        if level == 'fine': fine_ids = ids; seen.update(ids)
        else: assert ids == fine_ids
        vertices += len(pos)//3; triangles += len(idx)//3; glbs += 1
    # Box convention: standard ENU center vs local East-Up-South.
    center = tile['centerLocal']; b = child['boundingVolume']['box']
    assert max(abs(a-b) for a,b in zip(b[:3], [center[0],-center[2],center[1]])) < 1e-8
assert len(seen) == cat['featureCount'] == 70709
assert len(cat['tiles']) == len(tileset['root']['children']) == cat['tileCount']
print(json.dumps({'status':'PASS','glbs':glbs,'tiles':cat['tileCount'],'stableRepresentations':len(seen),
 'vertices':vertices,'triangles':triangles,'maxRoofAreaDifferenceM2':max_roof_error,
 'axisOracle':'independent PROJ ECEF origin + glTF/ENU math, 3 positions',
 'limits':'Checks produced subset only; not Khronos/OGC conformance or survey accuracy.'},indent=2))
