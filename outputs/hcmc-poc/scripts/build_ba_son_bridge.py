#!/usr/bin/env python3
"""Derive an illustrative Ba Son Bridge structural anchor from mapped carriageways."""
import hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
 d=json.loads((ROOT/'data/scene.json').read_text());roads=[r for r in d['roads'] if r.get('bridge') and r.get('name')=='Cầu Ba Son']
 assert {r['id'] for r in roads}=={321564421,321564423}
 center=next(r['c'] for r in roads if r['id']==321564421)
 # The mapped centerline runs from Thu Thiem to District 1. Pylon is placed by the eastern water edge.
 pylon=[-84.0,-30.0];east=[118.4,80.88];vx,vz=east[0]-pylon[0],east[1]-pylon[1];n=math.hypot(vx,vz);direction=[vx/n,vz/n];perp=[-direction[1],direction[0]]
 supports=[{'id':'S1','position':[-319.0,-159.0],'kind':'river_pier_west'},{'id':'S2','position':pylon,'kind':'main_pylon_east'},{'id':'S3','position':[5.0,18.0],'kind':'approach_pier'},{'id':'S4','position':[74.0,56.0],'kind':'approach_pier'}]
 data={'version':'bridge-fix-1','name':'Cầu Ba Son','formerName':'Cầu Thủ Thiêm 2','classification':'illustrative_structure_anchored_to_mapped_centerline','surveyedGeometry':False,'mappedRoadIds':[r['id'] for r in roads],'centerline':center,'directionToThuThiem':direction,'perpendicular':perp,'supports':supports,'design':{'type':'asymmetric_cable_stayed','cablePlanes':2,'mainCableStayedLengthM':200,'pylonHeightM':113,'mainBridgeLengthM':885.7,'totalProjectLengthM':1465,'lanes':6,'pylonForm':'stylised dragon-head, inclined toward Thu Thiem'},'sources':[{'name':'Ho Chi Minh City Government Portal','url':'https://tphcm.chinhphu.vn/khanh-thanh-cau-thu-thiem-2-bieu-tuong-moi-cua-tphcm-10122042811124683.htm','claim':'200 m cable-stayed main section, two cable planes, one dragon-head pylon offset toward Thu Thiem, six lanes'},{'name':'Dai Quang Minh project page','url':'https://www.dqmcorp.vn/cau-thu-thiem-2','claim':'1,465 m total, 885.7 m bridge, six lanes, 113 m dragon-form pylon'}],'limitations':['Structural members are stylised, not construction drawings','Support positions are aligned to the archived map and water edges, not surveyed coordinates','Navigation clearance is illustrative']}
 raw=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode();data['sha256']=hashlib.sha256(raw).hexdigest();
 (ROOT/'data/ba-son-bridge-detail.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');(ROOT/'data/ba-son-bridge-detail.js').write_text('window.BA_SON_BRIDGE='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n');print(json.dumps({'roads':len(roads),'supports':len(supports),'pylonHeightM':113,'cablePlanes':2,'sha256':data['sha256']}))
if __name__=='__main__':main()
