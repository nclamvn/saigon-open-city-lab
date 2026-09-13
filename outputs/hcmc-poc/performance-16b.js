/* Renderer timing reports CPU submission and frame cadence, not GPU timer-query time. */
(() => {
  'use strict';
  const status=document.createElement('output');status.id='performance16bStatus';status.hidden=true;status.setAttribute('aria-live','off');document.body.append(status);
  const samples=[],moduleTotals={},renderSamples=[];let frameStart=0,lastFrame=0,lastReport=0,frameCalls=0,frameTriangles=0,frameRenderCPU=0,frames=0,longFrames=0,reflectionPasses=0;
  const baseline=new URLSearchParams(location.search).get('perf')==='baseline';
  const originalRender=renderer.render;
  renderer.render=function(...args){const t=performance.now();try{return originalRender.apply(this,args);}finally{frameRenderCPU+=performance.now()-t;frameCalls+=this.info.render.calls;frameTriangles+=this.info.render.triangles;if(args[1]===window.riverCamera16b)reflectionPasses++;}};
  const moduleNames=['advanceExperience','advancePoc6','advanceRealityPatch','advanceRealityTile','advanceGroundCapture','advanceBridgeDetail','advanceFootbridge','advanceSemanticMaterials','advanceTextureAtlas','advanceUrbanDetail','advanceConfidenceMap','advanceCinematic12','advanceRealityEnrichment13','advanceSurface14','advanceFacades15'];
  for(const name of moduleNames){const fn=window[name];if(!fn)continue;window[name]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const d=performance.now()-start;const s=moduleTotals[name]||(moduleTotals[name]={ms:0,calls:0,maxMs:0});s.ms+=d;s.calls++;s.maxMs=Math.max(s.maxMs,d);}};}
  const quant=(arr,q)=>{if(!arr.length)return 0;const sorted=arr.slice().sort((a,b)=>a-b);return +sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))].toFixed(2);};
  const api=window.performance16b={optimized:false,mode:'initializing',beginFrame(now){frameStart=performance.now();frameCalls=frameTriangles=frameRenderCPU=0;if(lastFrame){const elapsed=now-lastFrame;if(elapsed<2000){samples.push(elapsed);if(samples.length>180)samples.shift();if(elapsed>50)longFrames++;}}lastFrame=now;},endFrame(now){frames++;renderSamples.push({cpu:performance.now()-frameStart,render:frameRenderCPU,calls:frameCalls,triangles:frameTriangles});if(renderSamples.length>180)renderSamples.shift();if(now-lastReport<1500)return;lastReport=now;const mean=k=>renderSamples.reduce((sum,x)=>sum+x[k],0)/Math.max(1,renderSamples.length);const report={version:'16b',mode:api.mode,baselineRequested:baseline,view:window.currentView,frames,windowFrames:samples.length,frameMs:{p50:quant(samples,.5),p95:quant(samples,.95),p99:quant(samples,.99)},rollingFPS:samples.length?+(1000/(samples.reduce((a,b)=>a+b,0)/samples.length)).toFixed(1):0,longFramesOver50ms:longFrames,renderCPUms:+mean('render').toFixed(2),frameCPUms:+mean('cpu').toFixed(2),drawCallsMean:+mean('calls').toFixed(1),trianglesMean:Math.round(mean('triangles')),reflectionPasses,shadowUpdates:api.shadowUpdates||0,interaction:api.interacting||false,qualityRestored:!api.interacting,qualityTransitions:api.qualityTransitions||[],requestedDPR:api.requestedDPR||renderer.getPixelRatio(),camera:{target:target.toArray().map(x=>+x.toFixed(3)),distance:+distance.toFixed(3),az:+az.toFixed(5),polar:+polar.toFixed(5)},currentDPR:renderer.getPixelRatio(),width:innerWidth,height:innerHeight,reflection:window.reflectionStatus,modules:Object.fromEntries(Object.entries(moduleTotals).map(([k,v])=>[k,{meanMs:+(v.ms/v.calls).toFixed(3),maxMs:+v.maxMs.toFixed(2),calls:v.calls}])),limit:'CPU submission timings; no measured GPU duration. Rolling last 180 frames; accumulated module means since load.'};status.dataset.json=JSON.stringify(report);window.performance16bStatus=report;}};
  // Camera interaction quality is temporary; scene geometry/materials stay intact.
  let lastInput=0,lastMotion=0,wasInteracting=false,lastShadow=0,lastReflect=0,lastShadowSignature='',lastCameraSignature='',lastLabel=0,labelSizeDirty=true;
  let requestedDPR=renderer.getPixelRatio(),requestedRiverResolution=riverResolution,requestedRiverInterval=riverInterval;
  let internalQualityChange=false;const originalSetPixelRatio=renderer.setPixelRatio.bind(renderer);
  renderer.setPixelRatio=value=>{if(!internalQualityChange)requestedDPR=value;return originalSetPixelRatio(value);};
  const noteInput=()=>{lastInput=performance.now();};
  canvas.addEventListener('pointerdown',noteInput,{passive:true});canvas.addEventListener('wheel',noteInput,{passive:true});
  window.addEventListener('keydown',event=>{if(!/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)&&/^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|[wasdqe+\-=])$/i.test(event.key))noteInput();});
  window.addEventListener('resize',()=>{labelSizeDirty=true;});
  const labelSizes=new Map();
  api.updateLabels=now=>{
    if(now-lastLabel<(api.interacting?50:180))return;lastLabel=now;
    for(const l of labels){const old=labelSizes.get(l);if(labelSizeDirty||!old||(old.pending&&l.el.style.display!=='none')){const w=l.el.offsetWidth,h=l.el.offsetHeight;labelSizes.set(l,{w:w||140,h:h||24,pending:!w});}}labelSizeDirty=false;
    const boxes=[];
    for(const l of labels){const p=l.pos.clone().project(camera),x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;let visible=!(p.z>1||x<innerWidth*.28||x>innerWidth-170||y<85||y>innerHeight-95);const size=labelSizes.get(l),box={x:x-size.w/2,y:y-size.h,...size};if(visible){visible=!boxes.some(b=>box.x<b.x+b.w+6&&box.x+box.w+6>b.x&&box.y<b.y+b.h+5&&box.y+box.h+5>b.y);if(visible)boxes.push(box);}const display=visible?'block':'none';if(l.el.style.display!==display)l.el.style.display=display;if(visible){l.el.style.left=Math.round(x)+'px';l.el.style.top=Math.round(y)+'px';}}
  };
  api.shouldReflect=now=>{const interval=api.interacting?150:250;if(now-lastReflect<interval)return false;lastReflect=now;return true;};
  api.beforeRender=now=>{
    if(!api.optimized)return;
    const cameraSignature=[target.x,target.y,target.z,distance,az,polar].map(v=>v.toFixed(4)).join(',');
    if(cameraSignature!==lastCameraSignature){lastMotion=now;lastCameraSignature=cameraSignature;}
    const interacting=down||!!desired||now-lastInput<450||now-lastMotion<450;
    if(interacting!==wasInteracting){
      if(interacting){requestedRiverResolution=riverResolution;requestedRiverInterval=riverInterval;}
      const nextDPR=interacting?Math.min(requestedDPR,1.25):requestedDPR;if(Math.abs(renderer.getPixelRatio()-nextDPR)>.001){internalQualityChange=true;renderer.setPixelRatio(nextDPR);internalQualityChange=false;}
      window.setRiverQuality(interacting?Math.min(requestedRiverResolution,512):requestedRiverResolution,requestedRiverInterval);
      document.body.classList.toggle('city-interacting',interacting);wasInteracting=interacting;
      api.qualityTransitions.push({timeMs:Math.round(now),interacting,dpr:renderer.getPixelRatio(),requestedDPR,reflectionResolution:riverResolution});if(api.qualityTransitions.length>20)api.qualityTransitions.shift();
    }
    api.interacting=interacting;api.requestedDPR=requestedDPR;
    renderer.shadowMap.autoUpdate=false;
    const span=Math.max(620,Math.min(3000,distance*1.22));
    const signature=[Math.round(target.x/40),Math.round(target.y/40),Math.round(target.z/40),Math.round(span/80),lightValue,window.currentView,window.facade15Status?.heightOverridesActive,audit,window.surface14Status?.visibleLeafCards].join('|');
    // Refresh for changed framing/light/geometry and at a bounded cadence for moving vehicles.
    if((signature!==lastShadowSignature&&now-lastShadow>=(interacting?180:0))||now-lastShadow>(interacting?250:750)){
      sun.target.position.copy(target);sun.position.set(target.x-2300,target.y+3400,target.z+1700);
      Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:60,far:9000});sun.shadow.camera.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;lastShadow=now;lastShadowSignature=signature;api.shadowUpdates=(api.shadowUpdates||0)+1;
    }
  };
  api.qualityTransitions=[];api.optimized=!baseline;api.mode=baseline?'baseline':'optimized';
})();
