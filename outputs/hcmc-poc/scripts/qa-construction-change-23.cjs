const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const data=json('data/construction-change-23.json');
const scene=json('data/scene.json');
const html=read('index.html');
const js=read('construction-change-23.js');
const errors=[];
const assert=(ok,msg)=>{if(!ok)errors.push(msg);};
assert(data.version==='23a','version must be 23a');
assert(data.additions.length===7,'must expose 7 additions');
assert(data.heightCorrections.length===87,'must expose 87 height corrections');
assert(data.geometryReview.length===127,'must expose 127 review candidates');
assert(data.summary.signals===221,'signal total must be 221');
assert(JSON.stringify(data.summary.reviewPriority)===JSON.stringify({high:31,medium:80,low:16}),'priority counts changed');
assert(data.policy.reviewAutoIntegrated===false&&data.policy.canonicalSceneMutatedByReview===false,'review policy must fail closed');
for(const item of [...data.additions,...data.heightCorrections]){
  assert(Number.isInteger(item.modelIndex)&&scene.buildings[item.modelIndex],'applied item has invalid model index');
  assert(Array.isArray(item.rings)&&item.rings[0]?.length>=3,'applied item has invalid footprint');
}
for(const item of data.geometryReview){
  assert(item.autoIntegrated===false&&item.decision==='manual_review_required','review candidate leaked into automatic integration');
  assert(['high','medium','low'].includes(item.priority),'invalid review priority');
  assert(item.rings[0].length>=3,'review candidate has invalid ring');
}
assert(new Set(data.geometryReview.map(x=>x.osmId)).size===127,'review OSM IDs must be unique');
assert(html.includes('data/construction-change-23.js?v=23a')&&html.includes('construction-change-23.js?v=23a'),'PoC 23 assets are not wired');
assert(html.indexOf('leadership-16.js?v=23a')<html.indexOf('src="construction-change-23.js?v=23a"'),'panel extension must load after leadership shell');
assert(!/new\s+T\.Line\b|new\s+THREE\.Line\b/.test(js),'change lens must not use thin WebGL lines');
assert(js.includes("canonicalReviewIntegrated:false"),'UI probe must disclose review exclusion');
assert(js.includes("['before','Trước snapshot']")&&js.includes("['after','Sau đối chiếu']"),'before/after controls missing');
if(errors.length){console.error(errors.map(x=>'FAIL '+x).join('\n'));process.exit(1);}
console.log(JSON.stringify({ok:true,version:data.version,signals:data.summary.signals,review:data.summary.reviewPriority,tourStops:data.tour.length}));
