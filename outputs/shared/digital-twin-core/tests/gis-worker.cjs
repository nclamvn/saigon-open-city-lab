'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash,webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
function fixture(){return {meta:{center:[106.7115,10.779]},buildings:[{id:1,r:[[[0,0],[10,0],[10,10],[0,10],[0,0]]],h:5}]};}
function configFor(bytes){const c=JSON.parse(fs.readFileSync(path.join(root,'projects/hcmc.json')));c.input.sha256=createHash('sha256').update(new Uint8Array(bytes)).digest('hex');return c;}
function raw(value){return {type:'rtr-raw-json/1.0',bytes:new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).buffer};}
function loadWorker(crypto=webcrypto){
 const messages=[];const context=vm.createContext({console,URL,TextDecoder,TextEncoder,performance,crypto});context.self=context;
 context.postMessage=m=>messages.push(m);
 context.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name}));
 vm.runInContext(fs.readFileSync(path.join(root,'analysis-worker.js'),'utf8'),context,{filename:'analysis-worker.js'});
 return {context,messages,send:m=>context.onmessage({data:m})};
}
const area={type:'Polygon',coordinates:[[[106.7114,10.7788],[106.7117,10.7788],[106.7117,10.7791],[106.7114,10.7791],[106.7114,10.7788]]]};
test('actual Worker hashes UTF8 bytes, parses and propagates verified provenance into query',async()=>{
 const w=loadWorker(),input=raw(fixture()),bytes=input.bytes.byteLength,c=configFor(input.bytes);
 await w.send({type:'init',token:1,sceneData:input,config:c});const ready=w.messages.at(-1);
 assert.equal(ready.type,'ready');assert.equal(ready.inputIntegrity.verified,true);assert.equal(ready.inputIntegrity.sha256,c.input.sha256);assert.equal(ready.inputIntegrity.bytes,bytes);
 await w.send({type:'query',token:2,request:{mode:'area',geometry:area}});const r=w.messages.at(-1);
 assert.equal(r.type,'result');assert.equal(r.result.scenarios[0].summary.representationCount,1);assert.equal(r.result.provenance.inputIntegrity.verified,true);
});
test('mismatching source hash fails closed and removes a previously initialized dataset',async()=>{
 const w=loadWorker(),input=raw(fixture()),c=configFor(input.bytes);
 await w.send({type:'init',token:1,sceneData:input,config:c});c.input.sha256='0'.repeat(64);
 await w.send({type:'init',token:2,sceneData:input,config:c});assert.equal(w.messages.at(-1).error.code,'SOURCE_HASH_MISMATCH');
 await w.send({type:'query',token:3,request:{mode:'area',geometry:area}});assert.equal(w.messages.at(-1).error.code,'NOT_READY');
});
test('valid hash for malformed JSON fails parsing; unavailable crypto never admits unverified bytes',async()=>{
 const input=raw('{"buildings": broken'),c=configFor(input.bytes),w=loadWorker();
 await w.send({type:'init',token:1,sceneData:input,config:c});assert.equal(w.messages.at(-1).error.code,'JSON_INVALID');
 const noCrypto=loadWorker(null);await noCrypto.send({type:'init',token:1,sceneData:input,config:c});assert.equal(noCrypto.messages.at(-1).error.code,'INTEGRITY_UNAVAILABLE');
 const badCrypto=loadWorker({subtle:{digest(){return Promise.reject(new Error('crypto execution fixture'));}}});await badCrypto.send({type:'init',token:1,sceneData:input,config:c});assert.equal(badCrypto.messages.at(-1).error.code,'INTEGRITY_UNAVAILABLE');
});
test('legacy parsed input remains compatible and explicitly unverified',async()=>{
 const w=loadWorker(),data=fixture(),c=configFor(raw(data).bytes);
 await w.send({type:'init',token:1,sceneData:data,config:c});assert.equal(w.messages.at(-1).inputIntegrity.verified,false);
 await w.send({type:'query',token:2,request:{mode:'area',geometry:area}});assert.equal(w.messages.at(-1).result.provenance.inputIntegrity.verified,false);
});
test('late asynchronous hash completion from older initialization cannot replace fresh dataset',async()=>{
 let resolveFirst,calls=0;const delayedCrypto={subtle:{digest(algo,bytes){if(++calls===1)return new Promise(resolve=>{resolveFirst=async()=>resolve(await webcrypto.subtle.digest(algo,bytes));});return webcrypto.subtle.digest(algo,bytes);}}};
 const w=loadWorker(delayedCrypto),input=raw(fixture()),c=configFor(input.bytes);
 const first=w.send({type:'init',token:1,sceneData:input,config:c});await w.send({type:'init',token:2,sceneData:fixture(),config:c});
 await resolveFirst();await first;assert.equal(w.messages.length,1);assert.equal(w.messages[0].token,2);assert.equal(w.messages[0].inputIntegrity.verified,false);
});
test('actual HCMC 30MB file passes expected SHA256 and mapped-road query through Worker endpoint',async()=>{
 const c=JSON.parse(fs.readFileSync(path.join(root,'projects/hcmc.json'))),source=fs.readFileSync(path.resolve(root,'../..',c.input.path));
 const input={type:'rtr-raw-json/1.0',bytes:source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength)},w=loadWorker();
 await w.send({type:'init',token:1,sceneData:input,config:c});const ready=w.messages.at(-1);
 assert.equal(ready.type,'ready');assert.equal(ready.inputIntegrity.verified,true);assert.equal(ready.inputIntegrity.sha256,c.input.sha256);assert.equal(ready.inputIntegrity.bytes,c.input.bytes);assert.equal(ready.info.eligibleRepresentations,70716);
 const original=JSON.parse(source.toString('utf8')),road=original.roads.find(r=>String(r.id)==='341504312');
 const geometry={type:'LineString',coordinates:road.c.map(p=>w.context.RTRTwin.SourceCore.inverseLocal(p,c.frame))};
 await w.send({type:'query',token:2,request:{mode:'corridor',geometry,distances:[25,50,100]}});
 const result=w.messages.at(-1);assert.equal(result.type,'result');assert.deepEqual(Array.from(result.result.scenarios,s=>s.summary.identityCount),[46,92,224]);assert.equal(result.result.provenance.inputIntegrity.verified,true);
});
