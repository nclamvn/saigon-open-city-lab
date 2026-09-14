'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Source=require('../source-core.js'),Gis=require('../gis.js');
const outputs=path.resolve(__dirname,'../../..');
function load(id){const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../projects/'+id+'.json')));const data=JSON.parse(fs.readFileSync(path.join(outputs,config.input.path)));const normalized=Source.normalizeScene(data,config);return {config,normalized,engine:Gis.createEngine(normalized)};}
test('HCMC actual sample normalizes 70719 representations and excludes 10 illustrations',()=>{
 const {normalized,engine}=load('hcmc');
 assert.equal(normalized.features.length,70719);assert.equal(normalized.normalization.excludedCount,0);
 assert.equal(engine.info().eligibleRepresentations,70709);assert.equal(engine.info().excludedRepresentations,10);assert.equal(engine.info().invalidRepresentations,0);
 const r=engine.query({mode:'corridor',geometry:{type:'LineString',coordinates:[[106.70057,10.77681],[106.70605,10.77247]]},distances:[25,50,100]});
 assert.deepEqual(r.scenarios.map(s=>s.summary.identityCount),[47,114,218]);
 assert.deepEqual(r.scenarios.map(s=>s.coverage.status),['within','within','within']);
 assert.ok(r.scenarios.every(s=>s.summary.unionAreaM2<=s.summary.intersectionAreaM2+.001));
 assert.ok(r.scenarios.every(s=>s.features.features.every(f=>f.properties.height.surveyed===false)));
 const sourceRoad=JSON.parse(fs.readFileSync(path.join(outputs,'hcmc-poc/data/scene.json'))).roads.find(r=>String(r.id)==='341504312');
 const mapped=engine.query({mode:'corridor',geometry:{type:'LineString',coordinates:sourceRoad.c.map(p=>Source.inverseLocal(p,normalized.frame))},distances:[25,50,100]});
 assert.deepEqual(mapped.scenarios.map(s=>s.summary.identityCount),[46,92,224]);
});
test('Gia Loc actual source adapter shares kernel while retaining north-positive frame and null source heights',()=>{
 const {config,normalized,engine}=load('gia-loc');assert.equal(config.frame.zAxis,'north');assert.equal(normalized.features.length,657);
 const [x0,y0,x1,y1]=config.bbox,r=engine.query({mode:'area',geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}}).scenarios[0];
 assert.equal(r.summary.identityCount,657);assert.equal(r.summary.sourceCounts.microsoft,657);
 assert.equal(r.summary.heightKinds.model_derived,482);assert.equal(r.summary.heightKinds.area_proxy,175);
 assert.ok(r.features.features.every(f=>f.properties.height.surveyed===false));
});
