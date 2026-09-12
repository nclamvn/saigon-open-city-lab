#!/usr/bin/env python3
"""Build a deterministic, plan-only terrestrial capture layout around Bitexco."""
from __future__ import annotations
import hashlib, json, math
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TARGET=(-788.0,795.0)
BINS=24

def contains(p,ring):
    x,z=p;inside=False
    for i,a in enumerate(ring):
        b=ring[i-1]
        if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:inside=not inside
    return inside

def main():
    d=json.loads((ROOT/'data/scene.json').read_text());lon0,lat0=d['meta']['center'];candidates=[]
    blockers=[b['r'][0] for b in d['buildings'] if math.hypot(b['center'][0]-TARGET[0],b['center'][1]-TARGET[1])<230]
    greens=[r[0] for r in d['green'] if any(math.hypot(p[0]-TARGET[0],p[1]-TARGET[1])<250 for p in r[0])]
    priority={'footway':0,'pedestrian':0,'cycleway':1,'service':1,'residential':2,'living_street':2,'tertiary':3,'primary':4}
    for ri,r in enumerate(d['roads']):
        if r.get('bridge') or r.get('tunnel') or r.get('type') not in priority:continue
        pts=r['c']
        for si in range(len(pts)-1):
            a,b=pts[si],pts[si+1];length=math.dist(a,b);steps=max(1,math.ceil(length/7))
            for j in range(steps+1):
                u=j/steps;x=a[0]+(b[0]-a[0])*u;z=a[1]+(b[1]-a[1])*u;dist=math.hypot(x-TARGET[0],z-TARGET[1])
                if not 48<=dist<=175 or any(contains((x,z),q) for q in blockers) or any(contains((x,z),q) for q in greens):continue
                angle=(math.atan2(z-TARGET[1],x-TARGET[0])+2*math.pi)%(2*math.pi);bucket=int((angle+math.pi/BINS)/(2*math.pi)*BINS)%BINS
                candidates.append({'x':x,'z':z,'distance':dist,'angle':angle,'bin':bucket,'roadType':r['type'],'roadId':r['id'],'score':abs(dist-105)+priority[r['type']]*12})
    stations=[]
    for bucket in range(BINS):
        options=[c for c in candidates if c['bin']==bucket]
        if not options:continue
        c=min(options,key=lambda q:(q['score'],q['roadId'],q['x'],q['z']));lon=lon0+c['x']/(111320*math.cos(math.radians(lat0)));lat=lat0-c['z']/110574
        stations.append({'id':f'GC-{len(stations)+1:02d}','azimuthBin':bucket,'positionLocal':[round(c['x'],3),1.7,round(c['z'],3)],'positionWgs84':[round(lon,7),round(lat,7)],'targetLocal':[TARGET[0],125,TARGET[1]],'distanceM':round(c['distance'],1),'roadType':c['roadType'],'roadId':c['roadId'],'access':'unverified_public_realm_candidate','status':'planned','plannedFrames':3})
    coverage=round(len({s['azimuthBin'] for s in stations})/BINS*100,1);missing=[i for i in range(BINS) if i not in {s['azimuthBin'] for s in stations}]
    plan={'version':'07C-1','status':'plan_only_no_images','target':{'name':'Bitexco Financial Tower','local':list(TARGET),'heightM':269,'geometry':'open-data/procedural; unverified'},'capture':{'method':'ground camera or phone','stations':len(stations),'plannedFrames':sum(s['plannedFrames'] for s in stations),'capturedFrames':0,'azimuthBins':BINS,'coveredBins':len(stations),'azimuthCoveragePercent':coverage,'missingBins':missing,'cameraHeightM':1.7,'verticalBands':['lower facade','mid facade','upper facade'],'recommendedOverlapPercent':70},'constraints':['Candidate stations sampled from archived mapped road/footway linework','Public access, obstruction and present-day safety require field verification','Upper roof cannot be closed from ground-only imagery','No image, control point or measured scale is included'], 'stations':stations}
    raw=json.dumps(plan,ensure_ascii=False,separators=(',',':')).encode();plan['sha256']=hashlib.sha256(raw).hexdigest();
    (ROOT/'data/ground-capture-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/ground-capture-plan.js').write_text('window.GROUND_CAPTURE_PLAN='+json.dumps(plan,ensure_ascii=False,separators=(',',':'))+';\n')
    print(json.dumps({'stations':len(stations),'plannedFrames':plan['capture']['plannedFrames'],'coverage':coverage,'missingBins':missing,'sha256':plan['sha256']}))

if __name__=='__main__':main()
