#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, math

ROOT = Path(__file__).resolve().parents[1]
scene = json.loads((ROOT / "data/scene.json").read_text())

def score(value, salt):
    return int(hashlib.sha256(f"{value}:{salt}".encode()).hexdigest()[:12], 16)

def area(ring):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring, ring[1:]+ring[:1]))) / 2

roof_candidates=[]
sign_candidates=[]
for index,b in enumerate(scene["buildings"]):
    x,z=b["center"]
    if math.hypot(x+800,z-500) < 1600 and 12 <= b["h"] <= 180 and b["r"]:
        footprint=max(8, area(b["r"][0]))
        roof_candidates.append((score(b["id"],"roof"),{
            "buildingIndex":index,"buildingId":b["id"],"x":round(x,2),"z":round(z,2),
            "y":round(b["h"]+0.8,2),"size":round(max(1.2,min(5.5,math.sqrt(footprint)*.12)),2),
            "kind":["water_tank","hvac_cluster","service_core","antenna"][score(b["id"],"kind")%4]
        }))
    if math.hypot(x+800,z-500) < 1050 and 7 <= b["h"] <= 32 and b["r"]:
        ring=b["r"][0]
        edges=[]
        for a,c in zip(ring,ring[1:]+ring[:1]):
            dx,dz=c[0]-a[0],c[1]-a[1]
            edges.append((math.hypot(dx,dz),a,c))
        length,a,c=max(edges,key=lambda e:e[0])
        if length>=4:
            mx,mz=(a[0]+c[0])/2,(a[1]+c[1])/2
            nx,nz=-(c[1]-a[1])/length,(c[0]-a[0])/length
            if (mx+nx*2-x)**2+(mz+nz*2-z)**2 < (mx-nx*2-x)**2+(mz-nz*2-z)**2: nx,nz=-nx,-nz
            sign_candidates.append((score(b["id"],"sign"),{
                "buildingIndex":index,"buildingId":b["id"],"x":round(mx+nx*.38,2),"z":round(mz+nz*.38,2),
                "y":round(min(b["h"]-1.2,max(3.6,b["h"]*.42)),2),"width":round(min(13,max(2.8,length*.52)),2),
                "height":round(min(1.65,max(.65,length*.075)),2),"angle":round(-math.atan2(c[1]-a[1],c[0]-a[0]),5),
                "style":score(b["id"],"style")%4
            }))

rooftops=[v for _,v in sorted(roof_candidates,key=lambda item:(item[0],item[1]["buildingIndex"]))[:600]]
signs=[v for _,v in sorted(sign_candidates,key=lambda item:(item[0],item[1]["buildingIndex"]))[:240]]
haze=[{"x":-1200+i*240,"z":1750+(i%3)*260,"y":150+(i%4)*45,"scale":520+(i%5)*80} for i in range(12)]
haze += [{"x":-600+i*310,"z":-1050-(i%2)*320,"y":120+(i%3)*55,"scale":440+(i%4)*75} for i in range(12)]

payload={
 "version":"poc-10-urban-detail-1","title":"Urban Detail & Perceptual Realism",
 "classification":"illustrative_procedural_microdetail_not_surveyed_or_observed",
 "counts":{"rooftopAssets":len(rooftops),"signBands":len(signs),"hazeVolumes":len(haze),"facadeShaderBuildings":scene["meta"]["renderedBuildings"]},
 "principles":["Deterministic placement tied to existing building footprints","Generic non-branded sign graphics","No claim of surveyed rooftop equipment or observed facade detail","Screen-space impression is prioritized over object-level accuracy"],
 "rooftops":rooftops,"signs":signs,"haze":haze,
 "performanceBudget":{"newDrawCallsTarget":10,"instancingRequired":True,"maximumRooftopAssets":600,"maximumSignBands":240},
 "upgradeContract":["Replace procedural rooftop assets only after oblique imagery or surveyed roof plans are available","Replace generic sign bands only with licensed dated facade imagery","Retain per-object provenance and capture date","Measure frame time at the same camera and viewport before increasing density"]
}
canonical=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(",",":"))
payload["sha256"]=hashlib.sha256(canonical.encode()).hexdigest()
(ROOT/"data/urban-detail-10.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2))
(ROOT/"data/urban-detail-10.js").write_text("window.URBAN_DETAIL_10="+json.dumps(payload,ensure_ascii=False,separators=(",",":"))+";\n")
print(json.dumps({"status":"PASS",**payload["counts"],"sha256":payload["sha256"]},ensure_ascii=False))
