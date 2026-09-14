'use strict';
// Standalone empty-page Worker QA: no city scene, no competing WebGL context.
const fs=require('fs'),path=require('path'),{chromium}=require('/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8768/shared/digital-twin-core/README.md');
 await page.addScriptTag({url:'http://127.0.0.1:8768/shared/digital-twin-core/raster-client-18.js'});
 const result=await page.evaluate(async()=>{
  const manifest=await(await fetch('/hcmc-poc/data/surface-18/manifest.json')).json(),assets=Array.isArray(manifest.assets)?manifest.assets:Object.entries(manifest.assets).map(([id,v])=>({id,...v}));
  const client=new RTRTwin.RasterClient18({workerUrl:'/shared/digital-twin-core/raster-worker-18.js'}),info=await client.init(manifest),rows=[];
  const imagery=assets.find(a=>a.kind==='rgb'),ground=assets.find(a=>a.kind==='ground');
  function summary(r){return {assetId:r.assetId,bbox:r.bbox,width:r.width,height:r.height,dtype:r.dtype,stats:r.stats,cache:r.cache,network:r.network,physicalScaleApplied:r.physicalScaleApplied,byteLength:r.values.byteLength};}
  async function fingerprint(r){const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');return {valuesSha256:hex(await crypto.subtle.digest('SHA-256',r.values)),validMaskSha256:hex(await crypto.subtle.digest('SHA-256',r.validMask))};}
  const b=imagery.bbox,dx=b[2]-b[0],dy=b[3]-b[1],window={assetId:imagery.id,bbox:[b[0]+dx*.4101,b[1]+dy*.4502,b[0]+dx*.5103,b[1]+dy*.5504],width:64,height:64};
  const patch=await client.read(window),cached=await client.read(window);rows.push({name:'imageryOffGrid',...summary(patch),...await fingerprint(patch)});rows.push({name:'imageryCache',...summary(cached),...await fingerprint(cached)});
  const coarse=await client.read({assetId:imagery.id,bbox:imagery.bbox,width:32,height:32});rows.push({name:'imageryOverview',...summary(coarse),...await fingerprint(coarse)});
  const native=await client.read({assetId:ground.id,bbox:ground.bbox,width:ground.width,height:ground.height}),values=new Float32Array(native.values),mask=new Uint8Array(native.validMask),indices=[0,Math.floor(values.length/2),values.length-1,Math.floor(ground.height/2)*ground.width+Math.floor(ground.width/2)];rows.push({name:'groundNative',...summary(native),...await fingerprint(native),samples:indices.map(i=>({index:i,value:Number.isFinite(values[i])?values[i]:null,valid:mask[i]}))});
  for(const asset of assets.filter(a=>a.kind==='dsm'||a.kind==='uncertainty')){const r=await client.read({assetId:asset.id,bbox:asset.bbox,width:asset.width,height:asset.height});rows.push({name:asset.kind+'Native',...summary(r),...await fingerprint(r)});}
  const bad=structuredClone(manifest),badAsset=Array.isArray(bad.assets)?bad.assets[0]:bad.assets[Object.keys(bad.assets)[0]];badAsset.hashVerified=false;let rejected=null;try{await client.init(bad);}catch(e){rejected=e.code;}
  client.destroy();return {schema:'rtr-browser-cog18/1.0',info,rows,rejectedSourceGate:rejected,pass:patch.network.cumulativeBytes<imagery.bytes&&cached.cache.hit&&cached.network.bytes===0&&coarse.stats.selectedOverview>0&&native.width===ground.width&&native.height===ground.height&&rejected==='SOURCE_GATE_BLOCKED'};
 });result.pageErrors=errors;result.pass=result.pass&&errors.length===0;fs.writeFileSync(path.join(__dirname,'cog-browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:result.pass,rows:result.rows.map(r=>({name:r.name,bytes:r.network.bytes,totalSourceBytes:r.network.fileBytes,selectedOverview:r.stats.selectedOverview,validPixels:r.stats.validPixels})),pageErrors:errors}));if(!result.pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
