import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync('outputs/hcmc-poc/data/scene.js','utf8'),context);
vm.runInContext(fs.readFileSync('outputs/hcmc-poc/data/facades-15.js','utf8'),context);
const D=context.window.CITY_DATA,F=context.window.FACADES_15.manifest.entries.find(e=>e.key==='opera');
const a=F.strips[0].a,b=F.strips.at(-1).b,c=[(a[0]+b[0])/2,(a[1]+b[1])/2],n=F.normal;
const nearby=D.buildings.filter(x=>x.id!==F.building_id&&Math.hypot(x.center[0]-c[0],x.center[1]-c[1])<260);
function contains(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function blockers(normal,distance){const out=[];for(const building of D.buildings){if(building.id===F.building_id)continue;for(let i=1;i<=60;i++){const t=i/60,p=[c[0]+normal[0]*distance*t,c[1]+normal[1]*distance*t];if(contains(p,building.r[0])){out.push({id:building.id,name:building.name,h:building.h,d:+(distance*t).toFixed(1),center:building.center});break;}}}return out.sort((x,y)=>x.d-y.d).slice(0,10);}
function blocked(normal,distance){for(const building of nearby)for(let i=2;i<=32;i++){const t=i/32,p=[c[0]+normal[0]*distance*t,c[1]+normal[1]*distance*t];if(contains(p,building.r[0]))return true;}return false;}
const candidates=[];for(let deg=-78;deg<=78;deg+=3){const a=deg*Math.PI/180,v=[n[0]*Math.cos(a)-n[1]*Math.sin(a),n[0]*Math.sin(a)+n[1]*Math.cos(a)];for(const distance of [70,85,100,115,135,155])if(!blocked(v,distance))candidates.push({deg,distance,vector:v.map(x=>+x.toFixed(5)),camera:[c[0]+v[0]*distance,c[1]+v[1]*distance].map(x=>+x.toFixed(2))});}
const camera=[c[0]+n[0]*17,c[1]+n[1]*17];
console.log(JSON.stringify({front:c,normal:n,width:F.width_m,host:D.buildings.find(x=>x.id===F.building_id),camera,cameraInside:D.buildings.filter(x=>x.id!==F.building_id&&contains(camera,x.r[0])).map(x=>({id:x.id,name:x.name,h:x.h,center:x.center})),blockers17:blockers(n,17),outward:blockers(n,180),opposite:blockers([-n[0],-n[1]],180),candidates:candidates.sort((a,b)=>Math.abs(a.deg)-Math.abs(b.deg)||b.distance-a.distance).slice(0,20)},null,2));
