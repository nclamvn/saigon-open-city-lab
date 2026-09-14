/* Actual app rebuild/inspector functions: panel visibility must survive a passive payload refresh. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const base=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(base,'static/app.js'),'utf8');
function section(start,end){const a=app.indexOf(start),b=app.indexOf(end,a+start.length);assert(a>=0&&b>a,'Actual function boundary missing');return app.slice(a,b);}
const functions=section('  async function rebuildSolution()','  function focusCluster()')+
 section('  function escapeHtml(value)','  function inspectPayload(hit)')+
 section('  function showInspector(payload)','  function onPointerDown(event)');
const payload={featureId:'msft_0002',title:'Selected house',method:'Refreshed COPDEM/Google method',date:'2023',resolution:'Total envelope 4.02 m',limitation:'Model height'};
const scenarios=[];
(async()=>{
 for(const [inspectorHidden,drawerHidden]of [[true,true],[true,false],[false,true],[false,false]]){
  let hiddenAssignments=0;
  const panel=initial=>{let value=initial;return{get hidden(){return value;},set hidden(next){hiddenAssignments++;value=next;}};};
  const dom={inspector:panel(inspectorHidden),sourceDrawer:panel(drawerHidden),inspectorBody:{innerHTML:''}},state={activeSelection:{featureId:payload.featureId},mode:'buildings',perf:{rebuildMs:0}};
  const world={pickables:[],buildingLayer:{buildings:[{id:payload.featureId,payload}]}};
  const context=vm.createContext({dom,state,world,performance:{now:()=>10},makeTerrain:async()=>{},makeBuildings:()=>{},makeLineLayers:()=>{},makeCanopy:()=>{},makeWaterCells:()=>{},disposeLayer:()=>{},updateFogForExtent:()=>{},updateCamera:()=>{},applyMode:()=>{}});
  await vm.runInContext(functions+'rebuildSolution();',context);
  assert.equal(dom.inspector.hidden,inspectorHidden,'Rebuild reopened/closed Inspector');assert.equal(dom.sourceDrawer.hidden,drawerHidden,'Rebuild changed SourceDrawer');
  assert.equal(hiddenAssignments,0,'Rebuild must not write hidden attributes observed by UI');
  assert.strictEqual(state.activeSelection,payload);assert(dom.inspectorBody.innerHTML.includes(payload.method),'Selected contents refreshed');
  scenarios.push({inspectorHidden,drawerHidden,preserved:true,hiddenAttributeWrites:0,payloadRefreshed:true});
  vm.runInContext('showInspector(state.activeSelection);',context);
  assert.equal(dom.inspector.hidden,false,'Active pick/focus opens Inspector');assert.equal(dom.sourceDrawer.hidden,true,'Active pick/focus closes drawer');
 }
 const output=path.join(base,'scripts/engine-s06-qa/panel-refresh.json');
 fs.writeFileSync(output,JSON.stringify({schema:'s06.engine.panel-refresh.v1',status:'PASS',actualAppFunctionsExecuted:true,appSha256:crypto.createHash('sha256').update(app).digest('hex'),scenarios,activePickFocusStillOpensInspector:true,scopeNote:'Tests actual orchestration/content functions with geometry/render dependencies stubbed; Contractor verifies browser MutationObserver/control workflow.'},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',passiveRefreshScenarios:scenarios.length,output}));
})().catch(e=>{console.error(e);process.exitCode=1;});
