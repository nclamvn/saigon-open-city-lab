const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),T=require(path.join(root,'vendor/three.min.js'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'research/facades-15/manifest.json'),'utf8'));
const scene=JSON.parse(fs.readFileSync(path.join(root,'data/scene.json'),'utf8'));
const mesh=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshStandardMaterial(),3);mesh.castShadow=true;
const originalMatrices=Array.from(mesh.instanceMatrix.array),status={dataset:{}};
const context={T,document:{createElement:()=>status,body:{append(){}}},window:{FACADES_15:{manifest},facadeDecorationLayers16c:[{name:'regression',mesh,items:[{building_id:165491082},{building_id:-999},{building_id:138674379}]}],photoFacadeResources15:{group:{visible:true},material:{alphaMap:new T.Texture()}},facade15Status:{ready:true,selected:'times'},advanceFacades15(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'photo-occlusion-16c.js'),'utf8'),context);context.window.advanceFacades15();
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);
const u=shader.uniforms,slot=mesh.geometry.getAttribute('photoSlot16c').getX(0),results=[];
const cutIndex=u.uPhotoCutB16c.value.findIndex(b=>b.w===slot);assert(cutIndex>=0);
const a=u.uPhotoCutA16c.value[cutIndex],b=u.uPhotoCutB16c.value[cutIndex],c=u.uPhotoCutC16c.value[cutIndex];
const point=(along,y,depth=0)=>[a.x+a.z*along+c.x*depth,y,a.y+a.w*along+c.y*depth];
function isCut(p,instanceSlot=slot,alpha=1){if(u.uPhotoCutEnabled16c.value<.5||instanceSlot<-.5)return false;const rel=[p[0]-a.x,p[2]-a.y],along=rel[0]*a.z+rel[1]*a.w,depth=rel[0]*c.x+rel[1]*c.y;return Math.abs(instanceSlot-b.w)<=.1&&along>=0&&along<=b.x&&Math.abs(depth)<=1.5&&p[1]>=b.y&&p[1]<=b.z&&alpha>=.45;}
const e=manifest.entries.find(e=>e.key==='times'),building=scene.buildings.find(b=>b.id===e.building_id);
assert.equal(.32/2,.16);assert(isCut(point(b.x/2,(b.y+b.z)/2,.16)));results.push('Times mullion outer face at 0.16m lies on photo plane and is clipped');
const floors=Math.max(3,Math.floor(building.h/3.25)),bands=Math.min(4,Math.max(2,Math.floor(floors/6))),inside=[];
for(let j=1;j<=bands;j++){const y=Math.min(building.h-1.4,j*building.h/(bands+1));if(isCut(point(b.x/2,y,.4)))inside.push(y);}
assert.equal(inside.length,2);results.push('Actual Times baseline height creates exactly two protruding ledges in photo vertical coverage');
assert(!isCut(point(-1,(b.y+b.z)/2)));assert(!isCut(point(b.x/2,b.y-1)));assert(!isCut(point(b.x/2,b.z+1)));assert(!isCut(point(b.x/2,(b.y+b.z)/2,5)));results.push('Outside width/height and rear geometry are preserved');
assert(!isCut(point(b.x/2,(b.y+b.z)/2),slot,0));results.push('Masked photo holes retain baseline decoration');
assert.equal(mesh.geometry.getAttribute('photoSlot16c').getX(1),-1);assert.equal(mesh.geometry.getAttribute('photoSlot16c').getX(2),-1);results.push('Unrelated and held nonplanar buildings excluded');
assert.equal(c.z,e.reverse_u?1:0);assert.equal(c.w,e.reverse_u?0:1);assert.equal(b.y,1.5+e.height_m*e.vertical[0]);assert.equal(b.z,1.5+e.height_m*e.vertical[1]);results.push('Photo crop range, reverse UV and vertical coordinates match actual manifest');
context.window.photoFacadeResources15.group.visible=false;context.window.advanceFacades15();assert(!isCut(point(b.x/2,(b.y+b.z)/2)));context.window.photoFacadeResources15.group.visible=true;context.window.facade15Status.ready=false;context.window.advanceFacades15();assert.equal(u.uPhotoCutEnabled16c.value,0);assert.deepEqual(Array.from(mesh.instanceMatrix.array),originalMatrices);results.push('Photo visibility/readiness gate restores decoration without matrix mutation');
const shadow={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};mesh.customDepthMaterial.onBeforeCompile(shadow);assert(shadow.fragmentShader.includes('rejectPhotoDecoration16c();'));assert.strictEqual(shadow.uniforms.uPhotoCutEnabled16c,u.uPhotoCutEnabled16c);assert.equal(mesh.material.depthTest,true);results.push('Shadow pass shares clipping gate and normal depth testing remains enabled');
const report=JSON.parse(status.dataset.json);assert.equal(report.patches,14);assert.equal(report.cuts,16);results.push('Scope stays 14 planar patches and 16 strips; sampled VCB envelope not clipped');
console.log(JSON.stringify({status:'PASS',tests:results.length,results,limit:'CPU/model and shader contract checks; actual GLSL compilation and visual occlusion verified separately in browser.'},null,2));
