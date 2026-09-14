'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const turf = require('../vendor/turf-7.4.0.min.js');
const Gis = require('../gis.js');
function ring(x,y,w,h=w) { return [[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]; }
function polygon(x,y,w,h=w,holes=[]) { return {type:'Polygon',coordinates:[ring(x,y,w,h),...holes]}; }
function building(id,geometry,props={}) { return {type:'Feature',id,geometry,properties:{id,sourceId:id,sourceKey:'fixture-source',classification:'building',height:{value:5,kind:'area_proxy',surveyed:false},modelIndex:id,...props}}; }
function normalized(features,bbox=[-.1,-.1,.1,.1]) { return {features,sources:[{id:'fixture-source',license:'test-fixture-only',epoch:'2026-09-14'}],project:{id:'fixtures',bbox},frame:{axis:'xEast/zNorth'},normalization:{surveyed:false},gates:{spatialAnalysis:{allowed:true,reasons:[]}}}; }
function query(engine,geometry) { return engine.query({mode:'area',geometry}).scenarios[0]; }
test('holes exclude entirely contained footprint and subtract hole area',()=>{
 const e=Gis.createEngine(normalized([building('outer',polygon(0,0,.01))]));
 const g=polygon(0,0,.01,.01,[ring(.002,.002,.006)]), r=query(e,g);
 assert.equal(r.summary.representationCount,1);
 assert.ok(Math.abs(r.summary.unionAreaM2-turf.area({type:'Feature',geometry:g}))/r.summary.unionAreaM2<1e-10);
 const donut=Gis.createEngine(normalized([building('donut',g)]));
 assert.equal(query(donut,polygon(.003,.003,.001)).summary.representationCount,0);
});
test('concave notch excludes polygon whose bbox/center would be misleading',()=>{
 const shape={type:'Polygon',coordinates:[[[0,0],[.01,0],[.01,.002],[.002,.002],[.002,.01],[0,.01],[0,0]]]};
 const e=Gis.createEngine(normalized([building('in-notch',polygon(.004,.004,.001)),building('on-arm',polygon(.0005,.004,.0005))]));
 assert.deepEqual(query(e,shape).features.features.map(f=>f.id),['on-arm']);
});
test('edge-only intersection counts contact with zero clipped area',()=>{
 const e=Gis.createEngine(normalized([building('edge',polygon(.01,0,.005))]));
 const r=query(e,polygon(0,0,.01));
 assert.equal(r.summary.representationCount,1);assert.equal(r.summary.unionAreaM2,0);
 assert.equal(r.features.features[0].properties.analysis.edgeContactOnly,true);
});
test('actual clipping finds polygon overlap when centroid lies outside query',()=>{
 const e=Gis.createEngine(normalized([building('crossing',polygon(.009,0,.01))]));
 const r=query(e,polygon(0,0,.01)); assert.equal(r.summary.representationCount,1);
 assert.ok(r.summary.unionAreaM2>0 && r.summary.unionAreaM2<turf.area(polygon(.009,0,.01)));
});
test('duplicate source IDs group conservatively and unique area removes overlaps',()=>{
 const shape=polygon(0,0,.001), e=Gis.createEngine(normalized([building('representation-1',shape,{sourceId:'same'}),building('representation-2',shape,{sourceId:'same'})]));
 const r=query(e,polygon(-.001,-.001,.004));
 assert.equal(r.summary.representationCount,2);assert.equal(r.summary.identityCount,1);
 assert.ok(Math.abs(r.summary.intersectionAreaM2-2*r.summary.unionAreaM2)<.00001);
});
test('cross-provider identical IDs are not merged as physical buildings',()=>{
 const shape=polygon(0,0,.001), e=Gis.createEngine(normalized([building('one',shape,{sourceId:'same',sourceKey:'OSM'}),building('two',shape,{sourceId:'same',sourceKey:'Overture'})]));
 assert.equal(query(e,polygon(-.001,-.001,.004)).summary.identityCount,2);
});
test('unknown source IDs retain separate representation identities',()=>{
 const e=Gis.createEngine(normalized([building('one',polygon(0,0,.001),{sourceId:null}),building('two',polygon(.002,0,.001),{sourceId:null})]));
 assert.equal(query(e,polygon(-.001,-.001,.01)).summary.identityCount,2);
});
test('illustrative/nonbuilding features are excluded from statistics',()=>{
 const e=Gis.createEngine(normalized([building('real',polygon(0,0,.001)),building('visual',polygon(0,0,.001),{classification:'illustrative'})]));
 const r=e.query({mode:'area',geometry:polygon(-.001,-.001,.01)});
 assert.equal(r.scenarios[0].summary.representationCount,1);assert.equal(r.provenance.excludedIllustrativeOrUnclassified,1);
});
test('MultiPolygon query retains disjoint regions and holes',()=>{
 const g={type:'MultiPolygon',coordinates:[polygon(0,0,.01,.01,[ring(.002,.002,.006)]).coordinates,polygon(.02,0,.001).coordinates]};
 const e=Gis.createEngine(normalized([building('hole',polygon(.003,.003,.001)),building('island',polygon(.02,0,.001))]));
 assert.deepEqual(query(e,g).features.features.map(f=>f.id),['island']);
});
test('corridor distances are meters with monotonic area and selected counts',()=>{
 const center=[106.71,10.77], line={type:'LineString',coordinates:[turf.destination(center,100,180,{units:'meters'}).geometry.coordinates,turf.destination(center,100,0,{units:'meters'}).geometry.coordinates]};
 const buildings=[15,40,80,140].map((meters,i)=>{const p=turf.destination(center,meters,90,{units:'meters'}).geometry.coordinates;return building(String(i),polygon(p[0]-.00001,p[1]-.00001,.00002));});
 const e=Gis.createEngine(normalized(buildings,[106.70,10.76,106.72,10.78]));
 const r=e.query({mode:'corridor',geometry:line,distances:[25,50,100]});
 assert.deepEqual(r.scenarios.map(s=>s.summary.representationCount),[1,2,3]);
 assert.ok(Math.abs(r.query.lengthM-200)<.01);
 assert.ok(r.scenarios[0].summary.queryAreaM2<r.scenarios[1].summary.queryAreaM2 && r.scenarios[1].summary.queryAreaM2<r.scenarios[2].summary.queryAreaM2);
 assert.match(r.query.measurementMethod,/not cadastral or survey/);
});
test('self-crossing query rejected before any statistics',()=>{
 const e=Gis.createEngine(normalized([building('one',polygon(0,0,.001))]));
 assert.throws(()=>query(e,{type:'Polygon',coordinates:[[[0,0],[.01,.01],[0,.01],[.01,0],[0,0]]]}),{code:'INVALID_TOPOLOGY'});
});
test('NaN/infinite/string coordinates and wrong axis range rejected',()=>{
 [NaN,Infinity,'106'].forEach(value=>assert.throws(()=>Gis.validateGeometry({type:'LineString',coordinates:[[value,0],[.001,0]]},['LineString'],100),{code:'INVALID_COORDINATE'}));
 assert.throws(()=>Gis.validateGeometry({type:'LineString',coordinates:[[0,90],[.001,0]]},['LineString'],100),{code:'INVALID_COORDINATE'});
});
test('unclosed, degenerate and external-hole geometry rejected',()=>{
 assert.throws(()=>Gis.validateGeometry({type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1]]]},['Polygon'],100),{code:'INVALID_RING'});
 assert.throws(()=>Gis.validateGeometry(polygon(0,0,.01,.01,[ring(.02,.02,.001)]),['Polygon'],100),{code:'INVALID_HOLE'});
 assert.throws(()=>Gis.validateGeometry({type:'LineString',coordinates:[[0,0],[0,0]]},['LineString'],100),{code:'INVALID_LINE'});
});
test('outside source extent and partial coverage explicitly labeled',()=>{
 const e=Gis.createEngine(normalized([building('one',polygon(0,0,.001))],[0,0,.01,.01]));
 assert.equal(query(e,polygon(.03,.03,.001)).coverage.status,'outside');
 assert.equal(query(e,polygon(.03,.03,.001)).summary.representationCount,0);
 assert.equal(query(e,polygon(-.001,0,.002)).coverage.status,'partial');
});
test('invalid source geometry is rejected and its evidence is reported',()=>{
 const e=Gis.createEngine(normalized([building('valid',polygon(0,0,.001)),building('bad',{type:'Polygon',coordinates:[[[0,0],[1,1],[0,1],[1,0],[0,0]]]})]));
 assert.equal(e.info().invalidRepresentations,1); assert.equal(e.info().invalidDetails[0].id,'bad');
});
test('source, epoch, unsurveyed height and model linkage preserved in exports',()=>{
 const e=Gis.createEngine(normalized([building('one',polygon(0,0,.001),{modelIndex:43,name:'Source building',sourceEpoch:'2025'})]));
 const r=e.query({mode:'area',geometry:polygon(-.001,-.001,.01)}), p=r.scenarios[0].features.features[0].properties;
 assert.equal(p.modelIndex,43);assert.equal(p.height.surveyed,false);assert.equal(p.sourceEpoch,'2025');assert.equal(r.provenance.sources[0].epoch,'2026-09-14');
});
test('broad candidate query refuses; never returns capped partial selection',()=>{
 const e=Gis.createEngine(normalized([building('a',polygon(0,0,.001)),building('b',polygon(.002,0,.001))]),{maxCandidates:1});
 assert.throws(()=>query(e,polygon(-.001,-.001,.01)),{code:'QUERY_TOO_BROAD'});
});
test('scenario distances reject zero, negative, excessive and duplicates',()=>{
 const e=Gis.createEngine(normalized([building('a',polygon(0,0,.001))]));
 for (const distances of [[0],[-1],[1001],[25,25]]) assert.throws(()=>e.query({mode:'corridor',geometry:{type:'LineString',coordinates:[[0,0],[.01,.01]]},distances}),{code:'INVALID_DISTANCES'});
});
test('untrusted source keys do not invoke object prototype properties',()=>{
 const e=Gis.createEngine(normalized([building('one',polygon(0,0,.001),{sourceKey:'__proto__',height:{kind:'constructor',surveyed:false}})]));
 const r=query(e,polygon(-.001,-.001,.01)); assert.equal(r.summary.sourceCounts.__proto__,1);assert.equal(r.summary.heightKinds.constructor,1);
});
test('missing or denied source gate refuses all spatial counts',()=>{
 const valid=normalized([building('one',polygon(0,0,.001))]);
 delete valid.gates;assert.throws(()=>Gis.createEngine(valid),{code:'SOURCE_GATE_BLOCKED'});
 valid.gates={spatialAnalysis:{allowed:false,reasons:['commercial_use_not_verified']}};
 assert.throws(()=>Gis.createEngine(valid),{code:'SOURCE_GATE_BLOCKED'});
});
