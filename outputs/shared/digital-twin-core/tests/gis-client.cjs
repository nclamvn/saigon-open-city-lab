'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const Client=require('../analysis-client.js');
class WorkerMock {
 constructor(){this.messages=[];this.terminated=false;WorkerMock.last=this;}
 postMessage(m){this.messages.push(m);if(m.type==='init')setTimeout(()=>this.emit({type:'ready',token:m.token,info:{eligibleRepresentations:1},normalization:{surveyed:false}}),0);}
 emit(data){if(this.onmessage)this.onmessage({data});}
 terminate(){this.terminated=true;}
}
test('Worker client ready/query result exposes execution mode',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});const info=await c.init({});assert.equal(info.executionMode,'worker');
 const promise=c.query({geometry:'fixture'}), message=c.worker.messages.at(-1);
 c.worker.emit({type:'result',token:message.token,result:{scenarios:[]}});
 assert.equal((await promise).executionMode,'worker');c.destroy();
});
test('superseded requests reject immediately and stale Worker response ignored',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});
 const p1=c.query({}), check1=assert.rejects(p1,{name:'AbortError',code:'STALE_REQUEST'}), token1=c.worker.messages.at(-1).token;
 const p2=c.query({}), token2=c.worker.messages.at(-1).token;
 c.worker.emit({type:'result',token:token1,result:{stale:true}});assert.equal(c.pending.size,1);
 c.worker.emit({type:'result',token:token2,result:{fresh:true}});assert.equal((await p2).fresh,true);await check1;c.destroy();
});
test('cancelled requests reject and late result cannot restore selection',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});
 const p=c.query({}), check=assert.rejects(p,{name:'AbortError',code:'CANCELLED'}), token=c.worker.messages.at(-1).token;
 c.cancel();c.worker.emit({type:'result',token,result:{}});await check;assert.equal(c.pending.size,0);c.destroy();
});
test('Worker geometry failure retains code and does not silently fallback',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});const p=c.query({});
 c.worker.emit({type:'error',token:c.worker.messages.at(-1).token,error:{code:'INVALID_TOPOLOGY',message:'bad polygon'}});
 await assert.rejects(p,{code:'INVALID_TOPOLOGY'});assert.equal(c.executionMode,'worker');c.destroy();
});
test('Worker runtime errors reject pending operation and require reinitialization',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});const p=c.query({});
 c.worker.onerror({message:'runtime fixture failure'});await assert.rejects(p,{code:'WORKER_FAILED'});assert.equal(c.ready,false);assert.equal(WorkerMock.last.terminated,true);c.destroy();
});
test('Worker query timeout ends operation and terminates stalled Worker',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock,queryTimeoutMs:5});await c.init({});
 await assert.rejects(c.query({}),{code:'WORKER_TIMEOUT'});assert.equal(c.ready,false);assert.equal(WorkerMock.last.terminated,true);c.destroy();
});
test('large dataset unsupported Worker refuses main-thread freeze explicitly',async()=>{
 const c=new Client({WorkerClass:null});await assert.rejects(c.init({buildings:new Array(70719)}),{code:'WORKER_REQUIRED'});assert.equal(c.ready,false);c.destroy();
});
test('destroy rejects pending work and further requests',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});const p=c.query({});
 c.destroy();await assert.rejects(p,{code:'DESTROYED'});await assert.rejects(c.query({}),{code:'DESTROYED'});
});
test('reinitialization during boot isolates old Worker messages and timer',async()=>{
 class ManualWorker extends WorkerMock { postMessage(m){this.messages.push(m);} }
 const c=new Client({workerUrl:'fixture',WorkerClass:ManualWorker,initTimeoutMs:20});
 const first=c.init({}), old=c.worker, oldToken=old.messages[0].token, check=assert.rejects(first,{code:'STALE_INITIALIZATION'});
 const second=c.init({}), current=c.worker, newToken=current.messages[0].token;
 old.emit({type:'ready',token:oldToken,info:{eligibleRepresentations:999}});
 current.emit({type:'ready',token:newToken,info:{eligibleRepresentations:2}});
 assert.equal((await second).eligibleRepresentations,2);await check;
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(c.worker,current);assert.equal(current.terminated,false);assert.equal(c.ready,true);c.destroy();
});
test('reinitialize during query rejects old query; late old errors do not destroy fresh Worker',async()=>{
 const c=new Client({workerUrl:'fixture',WorkerClass:WorkerMock});await c.init({});
 const old=c.worker,p=c.query({}),check=assert.rejects(p,{code:'STALE_INITIALIZATION'}),token=old.messages.at(-1).token;
 await c.init({});old.emit({type:'result',token,result:{stale:true}});old.onerror({message:'old failure'});await check;
 assert.equal(c.ready,true);assert.notEqual(c.worker,old);assert.equal(c.worker.terminated,false);c.destroy();
});
test('bounded main-thread fallback is explicit, functional and cancellable',async()=>{
 const Gis=require('../gis.js');
 global.RTRTwin.SourceCore={normalizeScene(){return {features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]]]},properties:{id:'one',sourceId:'one',sourceKey:'test',classification:'building',modelIndex:0,height:{kind:'area_proxy',surveyed:false}}}],sources:[],project:{bbox:[-.01,-.01,.01,.01]},gates:{spatialAnalysis:{allowed:true,reasons:[]}}};}};
 global.RTRTwin.Gis=Gis;
 const c=new Client({WorkerClass:null});const info=await c.init({buildings:[{}]});assert.equal(info.executionMode,'main-thread-fallback');
 const request={mode:'area',geometry:{type:'Polygon',coordinates:[[[-.001,-.001],[.002,-.001],[.002,.002],[-.001,.002],[-.001,-.001]]]}};
 const result=await c.query(request);assert.equal(result.executionMode,'main-thread-fallback');assert.equal(result.scenarios[0].summary.representationCount,1);
 const pending=c.query(request);c.cancel();await assert.rejects(pending,{code:'CANCELLED'});c.destroy();
});
test('raw JSON client transfers buffer ownership to Worker and retains verified ready info',async()=>{
 class TransferWorker extends WorkerMock {
  postMessage(m,transfers){const cloned=structuredClone(m,{transfer:transfers});this.messages.push(cloned);if(m.type==='init')setTimeout(()=>this.emit({type:'ready',token:m.token,info:{eligibleRepresentations:1},inputIntegrity:{verified:true,sha256:'fixture',bytes:cloned.sceneData.bytes.byteLength}}),0);}
 }
 const c=new Client({workerUrl:'fixture',WorkerClass:TransferWorker}),bytes=new TextEncoder().encode('{}').buffer,expectedBytes=bytes.byteLength;
 const info=await c.init({type:'rtr-raw-json/1.0',bytes});assert.equal(bytes.byteLength,0);assert.equal(info.inputIntegrity.verified,true);assert.equal(info.inputIntegrity.bytes,expectedBytes);c.destroy();
});
test('raw JSON requires Worker and cannot silently fallback after integrity failure',async()=>{
 const input=()=>({type:'rtr-raw-json/1.0',bytes:new TextEncoder().encode('{}').buffer});
 const unsupported=new Client({WorkerClass:null});await assert.rejects(unsupported.init(input()),{code:'WORKER_REQUIRED'});unsupported.destroy();
 class BadHashWorker extends WorkerMock {postMessage(m){this.messages.push(m);setTimeout(()=>this.emit({type:'error',token:m.token,error:{code:'SOURCE_HASH_MISMATCH',message:'fixture byte mismatch'}}),0);}}
 const c=new Client({workerUrl:'fixture',WorkerClass:BadHashWorker});await assert.rejects(c.init(input()),{code:'SOURCE_HASH_MISMATCH'});assert.equal(c.ready,false);assert.equal(c.engine,null);c.destroy();
});
