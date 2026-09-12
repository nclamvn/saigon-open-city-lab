#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, math, statistics

ROOT=Path(__file__).resolve().parents[1]
scene=json.loads((ROOT/'data/scene.json').read_text())
semantic=json.loads((ROOT/'data/semantic-materials-08.json').read_text())
direct=set(semantic['records'])
buildings=scene['buildings']
x0,x1,z0,z1=-3200,3200,-3400,3400
cols=rows=8; dx=(x1-x0)/cols; dz=(z1-z0)/rows

def confidence(b):
    q={'height':72,'levels':60,'estimated':31,'podium':26}[b['q']]
    if str(b['id']) in direct:q+=11
    if b.get('name'):q+=2
    if b.get('origin')=='Overture' and b.get('sourceRecords'):q+=2
    return min(88,q)

building_conf=[confidence(b) for b in buildings]
bins=[[] for _ in range(cols*rows)]
for i,b in enumerate(buildings):
    x,z=b['center']; c=max(0,min(cols-1,int((x-x0)/dx))); r=max(0,min(rows-1,int((z-z0)/dz)))
    bins[r*cols+c].append(i)
tiles=[]
for r in range(rows):
  for c in range(cols):
    idx=r*cols+c; ids=bins[idx]; count=len(ids)
    conf=statistics.fmean(building_conf[i] for i in ids) if ids else 0
    direct_h=sum(buildings[i]['q'] in ('height','levels') for i in ids)
    direct_m=sum(str(buildings[i]['id']) in direct for i in ids)
    tall=sum(buildings[i]['h']>=60 for i in ids)
    avg_h=statistics.fmean(buildings[i]['h'] for i in ids) if ids else 0
    cx=x0+(c+.5)*dx; cz=z0+(r+.5)*dz
    hero=math.exp(-((cx+800)**2+(cz-500)**2)/(2*1500**2))
    density=min(1,count/1800); vertical=min(1,tall/18)
    importance=.48*hero+.32*density+.20*vertical
    data_gap=1-conf/100
    priority=round(100*(.62*data_gap+.38*importance),1) if count else 0
    if tall>=8 or avg_h>=32:mode='uav_oblique_plus_ground_control'
    elif count>=1150:mode='ground_facade_corridors'
    else:mode='hybrid_reconnaissance'
    reasons=[]
    if direct_h/max(1,count)<.03:reasons.append('height_source_gap')
    if direct_m/max(1,count)<.01:reasons.append('material_observation_gap')
    if hero>.55:reasons.append('high_visual_importance')
    if tall>=8:reasons.append('vertical_complexity')
    tiles.append({'id':f'cf-r{r+1}c{c+1}','row':r+1,'column':c+1,'bounds':[round(x0+c*dx,2),round(z0+r*dz,2),round(x0+(c+1)*dx,2),round(z0+(r+1)*dz,2)],'center':[round(cx,2),round(cz,2)],'buildingCount':count,'directHeightOrLevels':direct_h,'directMaterialTags':direct_m,'averageConfidence':round(conf,1),'tallBuildings':tall,'averageHeightM':round(avg_h,1),'visualImportance':round(importance,3),'priorityScore':priority,'recommendedMode':mode,'reasons':reasons,'capturedImages':0,'surveyedRealityCoveragePercent':0})
ranked=sorted((t for t in tiles if t['buildingCount']),key=lambda t:(-t['priorityScore'],t['id']))
for rank,t in enumerate(ranked,1):t['rank']=rank
payload={'version':'poc-11-confidence-map-1','title':'Confidence Map & Acquisition Priority','status':'planning_only_no_new_capture','classification':'derived_priority_model_not_survey_validation','grid':{'rows':rows,'columns':cols,'tileCount':len(tiles),'bounds':[x0,z0,x1,z1],'crs':'local_metric_approximation'},'weights':{'dataGap':.62,'visualImportance':.38,'visualImportanceComponents':{'heroProximity':.48,'buildingDensity':.32,'verticalComplexity':.20}},'confidenceScale':{'podium':26,'estimated':31,'levels':60,'height':72,'directMaterialBonus':11,'nameBonus':2,'overtureProvenanceBonus':2,'maximum':88},'coverage':{'capturedImages':0,'calibratedImages':0,'surveyedRealityTiles':0,'surveyedRealityCoveragePercent':0},'buildingConfidence':building_conf,'tiles':tiles,'priorityQueue':[t['id'] for t in ranked[:12]],'summary':{'buildings':len(buildings),'medianBuildingConfidence':statistics.median(building_conf),'meanBuildingConfidence':round(statistics.fmean(building_conf),2),'priorityTiles':12,'highestPriorityScore':ranked[0]['priorityScore'],'lowestNonemptyPriorityScore':ranked[-1]['priorityScore']},'constraints':['Priority is derived from current data gaps and visual importance, not flight authorization','No access, airspace, weather or operational risk assessment is included','All capture counts remain zero until verified files are ingested'],'upgradeContract':['Review priority queue with flight operations and local authority constraints','Collect licensed imagery with capture time, camera parameters and control evidence','Ingest only after provenance and quality gates pass','Recompute confidence from observed validation metrics rather than visual inspection']}
canonical=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':'))
payload['sha256']=hashlib.sha256(canonical.encode()).hexdigest()
(ROOT/'data/confidence-map-11.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
(ROOT/'data/confidence-map-11.js').write_text('window.CONFIDENCE_MAP_11='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'research/acquisition-priority-11.csv').write_text('rank,tile_id,priority_score,average_confidence,buildings,tall_buildings,recommended_mode,reasons\n'+'\n'.join(f"{t['rank']},{t['id']},{t['priorityScore']},{t['averageConfidence']},{t['buildingCount']},{t['tallBuildings']},{t['recommendedMode']},{'|'.join(t['reasons'])}" for t in ranked))
print(json.dumps({'status':'PASS',**payload['summary'],'sha256':payload['sha256']},ensure_ascii=False))
