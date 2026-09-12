from pathlib import Path
import json,hashlib,datetime,csv
import numpy as np
r=Path(__file__).resolve().parents[1];j=json.loads((r/'data/height-region.json').read_text());d=json.loads((r/'data/scene.json').read_text());c=j['candidates'];ref=j['reference_comparison']
assert len({x['index']for x in c})==len(c)
for x in c:
 b=d['buildings'][x['index']];assert b['q']=='estimated' and b['min']<x['height']<95 and x['pixels']>=4
stats=lambda a:{'n':len(a),'median_delta_m':round(float(np.median([x['delta']for x in a])),2),'median_absolute_difference_m':round(float(np.median([abs(x['delta'])for x in a])),2),'p90_absolute_difference_m':round(float(np.percentile([abs(x['delta'])for x in a],90)),2)}if a else {'n':0}
report={'version':'PoC 03','bbox':[106.684,10.750,106.739,10.808],'sampled_raster':[1600,1600],'candidate_stats':stats(c),'source_height_comparison':stats([x for x in ref if x['quality']=='height']),'source_levels_comparison':stats([x for x in ref if x['quality']=='levels']),'estimated_blocks_total':sum(x['q']=='estimated' for x in d['buildings']),'coverage_percent_all_blocks':round(len(c)/len(d['buildings'])*100,2),'warning':'Differences between sources are not surveyed errors. Comparison filtered to usable pixels and source heights below 95m; selection bias applies. No accuracy improvement claim.'}
(r/'data/height-region-report.json').write_text(json.dumps(report,indent=2));
with (r/'data/height-region-comparison.csv').open('w',encoding='utf-8-sig',newline='')as f:
 w=csv.DictWriter(f,fieldnames=list(c[0]));w.writeheader();w.writerows(c+ref)
source={'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':'https://storage.googleapis.com/open-buildings-temporal-data/v1/geotiffs/31754_2023_06_30/tile_TJmqX_9eRXo.tif','license':'CC BY 4.0','source_date':'2023-06-30','sha256':hashlib.sha256((r/'data/google-height-region-2023.tif').read_bytes()).hexdigest(),'method':'HTTP range window; average resampling; see download_height_region.py','bands':['building_fractional_count','building_height','building_presence']}
(r/'data/google-height-region-provenance.json').write_text(json.dumps(source,indent=2));print(json.dumps(report))
