#!/usr/bin/env python3
"""Independent computational geometry audit; never source survey-quality certification.

Run with --dataset /private/tmp/rtr-dt17-normalized-hcmc.json
--result research/vibecode-17/qa/gis-sample-result.json --out .../oracle.json.
Dependency versions are recorded; optional isolated install from the Contractor
is loaded from /private/tmp/rtr-twin17-oracle. Dataset need not be committed.
"""
import argparse, hashlib, json, math, pathlib, sys
sys.path.insert(0, '/private/tmp/rtr-twin17-oracle')
import shapely
from shapely.geometry import shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
import pyproj
from pyproj import Geod

RADIUS = 6371008.8
RELATIVE_TOLERANCE = 1e-6

def fingerprint(path):
    p=pathlib.Path(path)
    return {'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}

def ring_area(coords):
    points=list(coords)
    if points[0]!=points[-1]:points.append(points[0])
    area=sum((math.radians(a[0])-math.radians(b[0]))*(math.sin(math.radians(a[1]))+math.sin(math.radians(b[1]))) for a,b in zip(points,points[1:]))
    return abs(area)*RADIUS*RADIUS/2

def spherical_area(geometry):
    if geometry.is_empty:return 0.0
    if geometry.geom_type=='Polygon':return ring_area(geometry.exterior.coords)-sum(ring_area(r.coords) for r in geometry.interiors)
    if hasattr(geometry,'geoms'):return sum(spherical_area(g) for g in geometry.geoms)
    return 0.0

def ellipsoid_area(geometry,geod):
    if geometry.is_empty:return 0.0
    if geometry.geom_type=='Polygon':
        def ring(r):
            pts=list(r.coords)
            return abs(geod.polygon_area_perimeter([p[0] for p in pts],[p[1] for p in pts])[0])
        return ring(geometry.exterior)-sum(ring(r) for r in geometry.interiors)
    if hasattr(geometry,'geoms'):return sum(ellipsoid_area(g,geod) for g in geometry.geoms)
    return 0.0

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--dataset',required=True);parser.add_argument('--result',required=True);parser.add_argument('--out',required=True);args=parser.parse_args()
    dataset=json.loads(pathlib.Path(args.dataset).read_text());result=json.loads(pathlib.Path(args.result).read_text())
    eligible=[f for f in dataset['features'] if f['properties']['classification']=='building']
    geometries=[shape(f['geometry']) for f in eligible];tree=STRtree(geometries);geod=Geod(ellps='WGS84');rows=[]
    for scenario in result['scenarios']:
        boundary=shape(scenario['geometry']);indices=tree.query(boundary,predicate='intersects').tolist()
        oracle_ids={eligible[i]['properties']['id'] for i in indices};turf_ids={f['properties']['id'] for f in scenario['features']['features']}
        clips=[geometries[i].intersection(boundary) for i in indices]
        union=unary_union(clips);union_area=spherical_area(union);clipped_sum=sum(spherical_area(c) for c in clips);turf_union=scenario['summary']['unionAreaM2'];turf_sum=scenario['summary']['intersectionAreaM2']
        delta=abs(union_area-turf_union)/max(1,union_area);sum_delta=abs(clipped_sum-turf_sum)/max(1,clipped_sum);wgs_area=ellipsoid_area(union,geod)
        rows.append({'key':scenario['key'],'oracleIdentityCount':len(oracle_ids),'turfRepresentationCount':scenario['summary']['representationCount'],'exactIdsMatch':oracle_ids==turf_ids,'missingIds':sorted(oracle_ids-turf_ids),'extraIds':sorted(turf_ids-oracle_ids),'oracleUniqueAreaM2':union_area,'turfUniqueAreaM2':turf_union,'relativeUniqueAreaDelta':delta,'oracleClippedSumAreaM2':clipped_sum,'turfClippedSumAreaM2':turf_sum,'relativeClippedSumDelta':sum_delta,'wgs84EllipsoidalUniqueAreaM2':wgs_area,'sphericalMinusEllipsoidPercent':100*(union_area-wgs_area)/max(1,wgs_area),'pass':oracle_ids==turf_ids and delta<=RELATIVE_TOLERANCE and sum_delta<=RELATIVE_TOLERANCE})
    audit={'schema':'rtr-computational-oracle/1.0','versions':{'python':sys.version.split()[0],'shapely':shapely.__version__,'GEOS':shapely.geos_version_string,'pyproj':pyproj.__version__,'PROJ':pyproj.proj_version_str},'input':fingerprint(args.dataset),'result':fingerprint(args.result),'querySha256':hashlib.sha256(json.dumps(result['query'],sort_keys=True,separators=(',',':')).encode()).hexdigest(),'method':'Shapely/GEOS STRtree intersects + intersection + unary_union, independent spherical ring integration (radius6371008.8m). WGS84 ellipsoidal area is reported as measurement-model difference.','relativeTolerance':RELATIVE_TOLERANCE,'sourceSurveyAccuracyCertified':False,'disclosure':'This verifies computational geometry and mathematical implementation only. It does not establish source XY/Z accuracy, completeness, capture epoch, physical building identity, or cadastral status. Buffer polygons are the supplied test boundaries; Turf buffer generation is tested separately with meter-offset fixtures.','scenarios':rows,'pass':all(r['pass'] for r in rows)}
    pathlib.Path(args.out).write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'pass':audit['pass'],'scenarios':[{'key':r['key'],'count':r['oracleIdentityCount'],'idsMatch':r['exactIdsMatch'],'areaRelativeDelta':r['relativeUniqueAreaDelta']} for r in rows],'versions':audit['versions']},ensure_ascii=False))
    return 0 if audit['pass'] else 1

if __name__=='__main__':sys.exit(main())
