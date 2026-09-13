/* PoC 06 visual ceiling: synthetic atmosphere, moving context and adaptive render quality. */
'use strict';
const p6={quality:'ultra',light:0,frame:0};

// A procedural sky keeps the panorama coherent without presenting unrelated photography as HCMC.
const p6SkyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{uLight:{value:0},uSunDir:{value:new T.Vector3(-.48,.72,.38).normalize()}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uLight;uniform vec3 uSunDir;
void main(){vec3 d=normalize(vP);float h=clamp(d.y*.5+.5,0.,1.);float dusk=smoothstep(.28,.85,uLight);vec3 zen=mix(vec3(.32,.56,.67),vec3(.055,.085,.19),dusk);vec3 hor=mix(vec3(.78,.74,.64),vec3(.67,.30,.25),min(1.,uLight*1.25));vec3 col=mix(hor,zen,smoothstep(.08,.92,h));float sun=pow(max(dot(d,uSunDir),0.),900.);float halo=pow(max(dot(d,uSunDir),0.),28.);col+=mix(vec3(1.,.82,.55),vec3(1.,.34,.13),dusk)*(sun*4.+halo*.25);float haze=exp(-sqrt(d.y*d.y+.003)*6.);col=mix(col,mix(vec3(.71,.72,.66),vec3(.43,.28,.34),dusk),haze*.22);gl_FragColor=vec4(col,1.);}`});
const p6Sky=new T.Mesh(new T.SphereGeometry(18000,48,24),p6SkyMat);p6Sky.visible=false;scene.add(p6Sky);
const p6SkyCanvas=document.createElement('canvas');p6SkyCanvas.width=1024;p6SkyCanvas.height=512;const p6SkyCtx=p6SkyCanvas.getContext('2d');const p6SkyTexture=new T.CanvasTexture(p6SkyCanvas);p6SkyTexture.mapping=T.EquirectangularReflectionMapping;p6SkyTexture.colorSpace=T.SRGBColorSpace;
function p6PaintSky(v){const dusk=smoothstep(.28,.85,v),g=p6SkyCtx.createLinearGradient(0,0,0,512);g.addColorStop(0,`rgb(${Math.round(80-30*dusk)},${Math.round(139-50*dusk)},${Math.round(165-45*dusk)})`);g.addColorStop(1,`rgb(${Math.round(205-20*dusk)},${Math.round(175-65*dusk)},${Math.round(155-40*dusk)})`);p6SkyCtx.fillStyle=g;p6SkyCtx.fillRect(0,0,1024,512);const sx=744,sy=280-v*78,halo=p6SkyCtx.createRadialGradient(sx,sy,2,sx,sy,100);halo.addColorStop(0,'rgba(255,245,205,1)');halo.addColorStop(.08,`rgba(255,${Math.round(213-55*dusk)},110,.95)`);halo.addColorStop(.3,'rgba(255,149,82,.18)');halo.addColorStop(1,'rgba(255,120,70,0)');p6SkyCtx.fillStyle=halo;p6SkyCtx.fillRect(sx-110,sy-110,220,220);p6SkyTexture.needsUpdate=true;scene.background=p6SkyTexture}

// Lightweight animated context. Candidate road segments are rejected when they cross mapped buildings or green areas.
const p6Cars=[];let p6Seed=6102026;const p6Rand=()=>((p6Seed=(1664525*p6Seed+1013904223)>>>0)/4294967296),p6Cell=160,p6ObstacleGrid=new Map();
function p6IndexObstacle(rings){const ring=rings[0],xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),box={rings,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};for(let x=Math.floor(box.minX/p6Cell);x<=Math.floor(box.maxX/p6Cell);x++)for(let z=Math.floor(box.minZ/p6Cell);z<=Math.floor(box.maxZ/p6Cell);z++){const k=x+','+z;if(!p6ObstacleGrid.has(k))p6ObstacleGrid.set(k,[]);p6ObstacleGrid.get(k).push(box)}}
for(const b of D.buildings)p6IndexObstacle(b.r);for(const g of D.green)p6IndexObstacle(g);
function p6Blocked(p){const items=p6ObstacleGrid.get(Math.floor(p[0]/p6Cell)+','+Math.floor(p[1]/p6Cell))||[];for(const o of items)if(p[0]>=o.minX&&p[0]<=o.maxX&&p[1]>=o.minZ&&p[1]<=o.maxZ&&contains(p,o.rings[0])&&!o.rings.slice(1).some(h=>contains(p,h)))return true;return false}
function p6RoadClear(a,b){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;for(let i=0;i<=12;i++){const u=i/12;for(const margin of [-3.5,0,3.5])if(p6Blocked([a[0]+dx*u+nx*margin,a[1]+dz*u+nz*margin]))return false}return true}
for(const r of D.roads){if(p6Cars.length>=360)break;if(r.tunnel||r.bridge||!['motorway','trunk','primary','secondary','tertiary'].includes(r.type))continue;for(let i=0;i<r.c.length-1&&p6Cars.length<360;i++){const a=r.c[i],b=r.c[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<28||p6Rand()>.48||!p6RoadClear(a,b))continue;p6Cars.push({a,b,phase:p6Rand(),speed:(7+p6Rand()*12)/len,side:p6Rand()>.5?1:-1,lane:Math.max(.7,Math.min(1.8,(widths[r.type]||6)*.15))})}}
const p6CarBody=new T.InstancedMesh(new T.BoxGeometry(4.2,1.35,1.8),new T.MeshStandardMaterial({color:'#aab9b6',metalness:.62,roughness:.3}),p6Cars.length);
const p6CarLight=new T.InstancedMesh(new T.BoxGeometry(.35,.32,1.5),new T.MeshStandardMaterial({color:'#fff2c8',emissive:'#ffb45d',emissiveIntensity:5,roughness:.2}),p6Cars.length);
p6CarBody.castShadow=true;p6CarBody.frustumCulled=false;p6CarLight.frustumCulled=false;scene.add(p6CarBody,p6CarLight);

// Boats follow a curved illustrative centerline sampled within the Saigon River, with narrow lane offsets.
const p6Boats=Array.from({length:14},(_,i)=>({phase:i/14+.03*p6Rand(),speed:.004+.003*p6Rand(),lane:(i%3-1)*8}));
const p6BoatMesh=new T.InstancedMesh(new T.BoxGeometry(13,2.3,4.2),new T.MeshStandardMaterial({color:'#d7d1bd',metalness:.15,roughness:.46}),p6Boats.length);p6BoatMesh.castShadow=true;p6BoatMesh.frustumCulled=false;scene.add(p6BoatMesh);
const p6BoatNodes=[[106.71235,10.764,3],[106.70913,10.768,3],[106.70808,10.772,3],[106.70838,10.776,3],[106.70960,10.780,3],[106.71365,10.784,3],[106.72223,10.788,3],[106.72608,10.792,3]].map(p=>xyz(...p)),p6BoatLengths=p6BoatNodes.slice(1).map((p,i)=>p.distanceTo(p6BoatNodes[i])),p6BoatTotal=p6BoatLengths.reduce((a,b)=>a+b,0);const p6Obj=new T.Object3D();
function p6BoatAt(u){let d=u*p6BoatTotal,i=0;while(i<p6BoatLengths.length-1&&d>p6BoatLengths[i])d-=p6BoatLengths[i++];const a=p6BoatNodes[i],b=p6BoatNodes[i+1],q=Math.min(1,d/p6BoatLengths[i]);return {p:a.clone().lerp(b,q),dir:b.clone().sub(a).normalize()}}
function p6InWater(p){return D.water.some(w=>contains(p,w[0])&&!w.slice(1).some(h=>contains(p,h)))}
let p6BoatAuditSamples=0,p6BoatOutside=0;for(let i=0;i<=1000;i++){const state=p6BoatAt(i/1000),nx=-state.dir.z,nz=state.dir.x;for(const lane of [-8,0,8]){p6BoatAuditSamples++;if(!p6InWater([state.p.x+nx*lane,state.p.z+nz*lane]))p6BoatOutside++}}
const p6MotionAudit={clearCarSegments:p6Cars.filter(c=>p6RoadClear(c.a,c.b)).length,totalCarSegments:p6Cars.length,boatSamples:p6BoatAuditSamples,boatSamplesOutsideWater:p6BoatOutside};

// A subtle beacon makes Landmark 81 legible at dusk without changing its claimed geometry.
const p6BeaconPos=xyz(106.7219,10.7949,486);const p6BeaconMat=new T.SpriteMaterial({color:'#ff6e55',transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending});const p6Beacon=new T.Sprite(p6BeaconMat);p6Beacon.position.copy(p6BeaconPos);p6Beacon.scale.set(18,18,1);scene.add(p6Beacon);

// Ultra prioritizes presentation; Balanced is the escape hatch for integrated GPUs.
const p6QualityButton=document.createElement('button');p6QualityButton.id='poc6Quality';p6QualityButton.setAttribute('aria-pressed','true');p6QualityButton.innerHTML='◆ <span>Chất lượng Ultra · PoC 06</span>';addVisualControl(p6QualityButton);
function p6SetQuality(mode){p6.quality=mode;const ultra=mode==='ultra';renderer.setPixelRatio(Math.min(devicePixelRatio,ultra?2:1.25));renderer.setSize(innerWidth,innerHeight);sun.shadow.mapSize.set(ultra?4096:2048,ultra?4096:2048);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;if(window.setRiverQuality)window.setRiverQuality(ultra?1024:512,ultra?2:4);p6CarBody.visible=p6CarLight.visible=ultra;p6BoatMesh.visible=true;p6QualityButton.setAttribute('aria-pressed',ultra);p6QualityButton.querySelector('span').textContent='Chất lượng '+(ultra?'Ultra':'Balanced')+' · PoC 06';window.poc6Status={quality:mode,cars:ultra?p6Cars.length:0,boats:p6Boats.length,proceduralSky:true,dynamicShadow:true,motionAudit:p6MotionAudit}}
p6QualityButton.onclick=()=>p6SetQuality(p6.quality==='ultra'?'balanced':'ultra');

presets.showcase={target:xyz(106.7064,10.7765,82),distance:1830,az:-.78,polar:1.34,label:'SÀI GÒN VEN SÔNG · SHOWCASE'};
const p6View=document.createElement('button');p6View.dataset.view='showcase';p6View.innerHTML='<small>08</small> Showcase ven sông';$('.views').append(p6View);p6View.onclick=()=>{stopCinema();follow=false;view('showcase');document.body.classList.add('hero-view');illumination(.58)};

window.setPoc6Light=v=>{p6.light=v;const dusk=smoothstep(.28,.85,v),r=Math.round(((80-30*dusk)+(205-20*dusk))*.5),g=Math.round(((139-50*dusk)+(175-65*dusk))*.5),b=Math.round(((165-45*dusk)+(155-40*dusk))*.5);p6SkyMat.uniforms.uLight.value=v;p6SkyMat.uniforms.uSunDir.value.set(-.48,.72-v*.58,.38).normalize();p6BeaconMat.opacity=.18+.82*smoothstep(.52,.95,v);p6PaintSky(v);scene.fog.color.setStyle(`rgb(${r},${g},${b})`)};
function smoothstep(a,b,x){x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)}
window.advancePoc6=(dt,now)=>{p6.frame++;const t=now*.001;
 if(p6CarBody.visible){for(let i=0;i<p6Cars.length;i++){const c=p6Cars[i],u=.03+.94*((c.phase+t*c.speed)%1),dx=c.b[0]-c.a[0],dz=c.b[1]-c.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;p6Obj.position.set(c.a[0]+dx*u+nx*c.side*c.lane,2.25,c.a[1]+dz*u+nz*c.side*c.lane);p6Obj.rotation.set(0,-Math.atan2(dz,dx),0);p6Obj.scale.set(1,1,1);p6Obj.updateMatrix();p6CarBody.setMatrixAt(i,p6Obj.matrix);p6Obj.position.x+=dx/len*1.65;p6Obj.position.z+=dz/len*1.65;p6Obj.updateMatrix();p6CarLight.setMatrixAt(i,p6Obj.matrix)}p6CarBody.instanceMatrix.needsUpdate=true;p6CarLight.instanceMatrix.needsUpdate=true}
 for(let i=0;i<p6Boats.length;i++){const b=p6Boats[i],u=(b.phase+t*b.speed)%1,state=p6BoatAt(u),p=state.p,dir=state.dir,nx=-dir.z,nz=dir.x;p6Obj.position.set(p.x+nx*b.lane,3,p.z+nz*b.lane);p6Obj.rotation.set(0,-Math.atan2(dir.z,dir.x),0);p6Obj.scale.set(1,1,1);p6Obj.updateMatrix();p6BoatMesh.setMatrixAt(i,p6Obj.matrix)}p6BoatMesh.instanceMatrix.needsUpdate=true;
 p6BeaconMat.opacity=(.12+.55*smoothstep(.45,.9,p6.light))*(.72+.28*Math.sin(t*4.)**2);
 if(!window.performance16b?.optimized&&p6.frame%20===0){const span=Math.max(620,Math.min(3000,distance*1.22));sun.target.position.copy(target);sun.position.set(target.x-2300,target.y+3400,target.z+1700);Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:60,far:9000});sun.shadow.camera.updateProjectionMatrix()}
};
buildingMat.envMapIntensity=1.12;waterMat.envMapIntensity=1.8;waterMat.ior=1.333;waterMat.reflectivity=.72;facadeRelief.material.envMapIntensity=1.35;
p6SetQuality('ultra');window.setPoc6Light(0);
