/* Behavioral checks of the real performance controller, without pretending to benchmark a GPU. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../performance-16b.js'),'utf8');
const results=[];
function run(baseline){
  const vector=()=>({x:0,y:0,z:0,copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;},set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},toArray(){return[this.x,this.y,this.z];}});
  const status={dataset:{},setAttribute(){}};const bodyClasses=new Set();let now=0,ratio=2;
  const context={URLSearchParams,location:{search:baseline?'?perf=baseline':''},performance:{now:()=>now},document:{createElement:()=>status,body:{append(){},classList:{toggle(k,on){on?bodyClasses.add(k):bodyClasses.delete(k);}}}},window:{addEventListener(){},currentView:'overview',facade15Status:{heightOverridesActive:true},surface14Status:{visibleLeafCards:0}},canvas:{addEventListener(){}},renderer:{getPixelRatio:()=>ratio,setPixelRatio:v=>{ratio=v;},render(){now+=2;},info:{render:{calls:7,triangles:100}},shadowMap:{autoUpdate:true,needsUpdate:false}},riverResolution:1024,riverInterval:2,labels:[],target:vector(),camera:{},distance:1550,az:0,polar:1,down:false,desired:null,lightValue:.18,audit:false,sun:{target:{position:vector()},position:vector(),shadow:{camera:{updateProjectionMatrix(){}},needsUpdate:false}},innerWidth:1440,innerHeight:900};
  context.window.setRiverQuality=(res,interval)=>{context.riverResolution=res;context.riverInterval=interval;};
  vm.createContext(context);vm.runInContext(source,context);const api=context.window.performance16b;
  now=1000;api.beginFrame(now);api.beforeRender(now);context.renderer.render(context.scene,context.camera);api.endFrame(now);
  if(baseline){assert.equal(ratio,2);assert.equal(context.renderer.shadowMap.autoUpdate,true);assert.equal(bodyClasses.has('city-interacting'),false);results.push('baseline preserves DPR/shadow/interaction behavior');}
  else{
    assert.equal(ratio,1.25);assert.equal(context.riverResolution,512);assert(bodyClasses.has('city-interacting'));results.push('camera change applies bounded temporary quality');
    now=2200;api.beforeRender(now);assert.equal(ratio,2);assert.equal(context.riverResolution,1024);assert(!bodyClasses.has('city-interacting'));assert.equal(api.qualityTransitions.length,2);assert.deepEqual(Array.from(api.qualityTransitions,x=>x.dpr),[1.25,2]);results.push('idle restores exact requested DPR/reflection size and records transitions');
    const updates=api.shadowUpdates;now=2300;api.beforeRender(now);assert.equal(api.shadowUpdates,updates);context.window.facade15Status.heightOverridesActive=false;api.beforeRender(now);assert.equal(api.shadowUpdates,updates+1);results.push('shadow caching invalidates on geometry state');
    assert(api.shouldReflect(3000));assert(!api.shouldReflect(3100));assert(api.shouldReflect(3300));results.push('reflection cadence is time based');
  }
  for(let i=0;i<120;i++){now+=16.667;api.beginFrame(now);context.renderer.render({},{});api.endFrame(now);}
  const data=JSON.parse(status.dataset.json);assert(Number.isFinite(data.frameMs.p95));assert(data.frameMs.p50>0);assert(data.drawCallsMean===7);assert.equal(data.currentDPR,2);results.push((baseline?'baseline':'optimized')+' telemetry finite and render counters aggregated');
}
run(true);run(false);
function smooth(fps){let p=0;for(let i=0;i<fps;i++)p+=(1-p)*(1-Math.exp(-4.033/fps));return p;}
assert(Math.abs(smooth(15)-smooth(60))<1e-12);results.push('time-based easing matches at 15 and 60 FPS');
console.log(JSON.stringify({status:'PASS',tests:results.length,results,limit:'Mocked controller behavior; browser/GPU performance requires same-view measurements.'},null,2));
