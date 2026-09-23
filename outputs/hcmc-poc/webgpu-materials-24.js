import * as THREE from 'three/webgpu';
import {
  attribute, cameraPosition, color, distance as nodeDistance, dot, float, floor,
  fract, mix, normalWorldGeometry, positionWorld, select, sin, smoothstep,
  step, time, uniform, uv, varying, vec2, vec3
} from 'three/tsl';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const D=window.CITY_DATA;
const SM=window.SEMANTIC_MATERIALS_08||{records:{},directTaggedBuildings:0,directCoveragePercent:0};
const CORRECTIONS=window.WEBGPU_CORRECTIONS_24;
if(!CORRECTIONS)throw new Error('WEBGPU_CORRECTIONS_24 không khả dụng');
const APP_VERSION=CORRECTIONS.version;
const $=selector=>document.querySelector(selector);
const params=new URLSearchParams(location.search);
const forceWebGL=params.get('backend')==='webgl';
const loading=$('#loading'),loaderText=$('#loaderText'),loaderProgress=$('#loaderProgress');
const setProgress=(value,text)=>{loaderProgress.style.width=`${Math.max(3,Math.min(100,value))}%`;if(text)loaderText.textContent=text;};
const yieldMain=()=>new Promise(resolve=>setTimeout(resolve,0));
const materialStatus=window.webgpuMaterials24={version:APP_VERSION,state:'initializing'};

if(!D?.buildings?.length)throw new Error('CITY_DATA không khả dụng');

let renderer;
try{
  renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  await renderer.init();
}catch(error){
  console.warn('WebGPU init failed; retrying universal renderer with WebGL 2 backend.',error);
  renderer=new THREE.WebGPURenderer({antialias:true,forceWebGL:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;
  await renderer.init();
}

$('#scene').append(renderer.domElement);
const actualWebGPU=!!renderer.backend?.isWebGPUBackend;
const backendElement=$('#backend');
if(backendElement)backendElement.textContent=actualWebGPU?'WEBGPU / TSL':'WEBGL 2 / TSL FALLBACK';
document.body.dataset.backend=actualWebGPU?'webgpu':'webgl2';
setProgress(10,'Đang dựng hệ vật liệu PBR…');

const scene=new THREE.Scene();
scene.background=new THREE.Color('#9bb7bd');
scene.fog=new THREE.FogExp2('#9bb7bd',0.000145);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,3,30000);

const hemi=new THREE.HemisphereLight('#d9eef2','#806f59',1.5);
scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0ce',3.15);
sun.position.set(-2300,3500,1800);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-3300,right:3300,top:3300,bottom:-3300,near:80,far:11000});
sun.shadow.bias=-0.0001;
sun.shadow.normalBias=1.6;
scene.add(sun,sun.target);

// The HDRI is lighting context only and is never represented as captured HCMC imagery.
new HDRLoader().load('data/venice_sunset_1k.hdr',texture=>{
  texture.mapping=THREE.EquirectangularReflectionMapping;
  scene.environment=texture;
  materialStatus.environment={loaded:true,source:'Poly Haven Venice Sunset 1K',license:'CC0'};
},undefined,()=>{materialStatus.environment={loaded:false};});

const center=D.meta.center;
const xyz=(lon,lat,y=0)=>new THREE.Vector3((lon-center[0])*111320*Math.cos(center[1]*Math.PI/180),y,(center[1]-lat)*110574);
const hash01=id=>{let x=(Number(id)||1)>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;return(x>>>0)/4294967295;};
const families={GENERIC:0,RESIDENTIAL:1,GLASS:2,CIVIC:3,INDUSTRIAL:4,CENTRAL:5,RELIGIOUS:6,MIXED:7};
const marinaParts=new Map(Object.entries(CORRECTIONS.marinaCentral.parts).map(([id,value])=>[Number(id),value]));
// Four large OSM construction footprints immediately north of Marina Central are stale low proxies.
// Official project updates identify the built/high-rise Lake, Sea, Cove and Lagoon residential cluster.
// Heights remain floor-count proxies until surveyed/BIM geometry is licensed; tower-name-to-footprint mapping is deliberately withheld.
const grandMarinaHeightCorrections=new Map(Object.entries(CORRECTIONS.grandMarina.parts).map(([id,value])=>[Number(id),value]));
const renderBuildings=D.buildings.map(source=>{
  const id=Number(source.id),heightCorrection=grandMarinaHeightCorrections.get(id),marinaCorrection=marinaParts.get(id);
  if(heightCorrection)return {...source,...heightCorrection,...CORRECTIONS.grandMarina.shared};
  if(marinaCorrection&&!source.name)return {...source,...marinaCorrection};
  return source;
});

function classify(b){
  const d=SM.records[String(b.id)]||{};
  const type=(b.type||'').toLowerCase();
  if(b.glass||d['building:material']==='glass'||b.h>105)return families.GLASS;
  if(/house|apartment|residential|terrace/.test(type))return families.RESIDENTIAL;
  if(/school|university|college|hospital|civic|kindergarten|palace/.test(type))return families.CIVIC;
  if(/industrial|warehouse|shed|construction/.test(type))return families.INDUSTRIAL;
  if(/temple|church|chapel|mosque/.test(type))return families.RELIGIOUS;
  if(/office|commercial|hotel|retail|train_station/.test(type))return families.CENTRAL;
  if(b.center[0]>-1100&&b.center[0]<800&&b.center[1]>-600&&b.center[1]<1750)return families.CENTRAL;
  return b.h<22?families.GENERIC:families.MIXED;
}

const palettes=[
  ['#d6c7b2','#c3b4a1','#e0d2bd','#b9b3a8'],
  ['#d8aa91','#e0c0a0','#c99078','#d8c7a8'],
  ['#7396a0','#5c7f8d','#84a7a8','#6e8998'],
  ['#dbc79a','#cbb27d','#e1d2ad','#c7b99f'],
  ['#918a7d','#81796f','#a39b8a','#77766f'],
  ['#88a6a8','#77969b','#9bb2ac','#6f8b94'],
  ['#d5ad73','#c58a59','#e0c792','#bd7e55'],
  ['#b5afa3','#c7bba8','#a6aaa4','#d0c4b0']
];
const roofPalettes=[
  ['#8a7565','#94867b','#776f68'],['#9d553b','#b46d48','#87503d'],
  ['#526c71','#657b7d','#4f6067'],['#ab8f63','#8f775c','#b4a27f'],
  ['#66645f','#74716b','#595b59'],['#687b7d','#758889','#596c70'],
  ['#a5653f','#bd8051','#8e4f36'],['#79756e','#8b8377','#686b68']
];

function taggedColor(value,fallback){
  try{
    if(!value)return fallback;
    const parsed=new THREE.Color(value),hsl={h:0,s:0,l:0};parsed.getHSL(hsl);
    parsed.setHSL(hsl.h,Math.min(.42,hsl.s),Math.max(.22,Math.min(.76,hsl.l)));
    return parsed;
  }catch{return fallback;}
}
function baseColors(b,kind){
  const d=SM.records[String(b.id)]||{};
  const seed=hash01(b.id);
  const p=palettes[kind],rp=roofPalettes[kind];
  const wall=taggedColor(d['building:colour'],new THREE.Color(p[Math.floor(seed*p.length)]));
  const roof=taggedColor(d['roof:colour'],new THREE.Color(rp[Math.floor(hash01(Number(b.id)+913)*rp.length)]));
  return {wall,roof,direct:!!(d['building:colour']||d['roof:colour']||d['building:material']||d['roof:material'])};
}

const positions=[],uvs=[],baseRgb=[],surfaces=[],classes=[],seeds=[],directs=[],faceEnds=[];
const roofFixtures=[];
function vertex(p,tex,c,surface,kind,seed,direct){
  positions.push(p[0],p[1],p[2]);uvs.push(tex[0],tex[1]);baseRgb.push(c.r,c.g,c.b);
  surfaces.push(surface);classes.push(kind);seeds.push(seed);directs.push(direct?1:0);
}
function tri(a,b,c,ta,tb,tc,tint,surface,kind,seed,direct){
  vertex(a,ta,tint,surface,kind,seed,direct);vertex(b,tb,tint,surface,kind,seed,direct);vertex(c,tc,tint,surface,kind,seed,direct);
}

for(let bi=0;bi<renderBuildings.length;bi++){
  const b=renderBuildings[bi];
  const kind=classify(b),seed=hash01(b.id),tones=baseColors(b,kind);
  const y=b.h+1.5,base=b.min+1.5,ring=b.r[0];
  const flat=[],holes=[];let count=0;
  for(let ri=0;ri<b.r.length;ri++){
    if(ri)holes.push(count);
    for(const p of b.r[ri]){flat.push(p[0],p[1]);count++;}
  }
  const rd=(b.roofDirection||127.5)*Math.PI/180;
  const ds=ring.map(p=>p[0]*Math.sin(rd)-p[1]*Math.cos(rd));
  const dmin=Math.min(...ds),dmax=Math.max(...ds);
  const roofY=(x,z)=>b.roof==='skillion'&&b.roofHeight?y-b.roofHeight*((x*Math.sin(rd)-z*Math.cos(rd)-dmin)/Math.max(.01,dmax-dmin)):y;
  const indices=window.earcut(flat,holes,2);
  for(let j=0;j<indices.length;j+=3){
    const vs=[indices[j],indices[j+2],indices[j+1]].map(k=>[flat[k*2],roofY(flat[k*2],flat[k*2+1]),flat[k*2+1]]);
    tri(vs[0],vs[1],vs[2],[0,0],[0,0],[0,0],tones.roof,0,kind,seed,tones.direct);
  }
  for(const r of b.r){
    for(let j=0;j<r.length;j++){
      const a=r[j],bb=r[(j+1)%r.length],length=Math.hypot(a[0]-bb[0],a[1]-bb[1]);
      const v0=[a[0],base,a[1]],v1=[bb[0],base,bb[1]],v2=[a[0],roofY(a[0],a[1]),a[1]],v3=[bb[0],roofY(bb[0],bb[1]),bb[1]];
      const surface=kind===families.GLASS?2:1;
      tri(v0,v1,v2,[0,base],[length,base],[0,roofY(a[0],a[1])],tones.wall,surface,kind,seed,tones.direct);
      tri(v1,v3,v2,[length,base],[length,y],[0,roofY(a[0],a[1])],tones.wall,surface,kind,seed,tones.direct);
    }
  }
  faceEnds.push(positions.length/9);
  if(b.h>18&&b.h<190&&Number(b.id)%4===0){
    const area=Math.abs(ring.reduce((sum,p,i)=>sum+p[0]*ring[(i+1)%ring.length][1]-ring[(i+1)%ring.length][0]*p[1],0))/2;
    roofFixtures.push({x:b.center[0],z:b.center[1],y:y+1.1,scale:Math.min(5,Math.max(1.4,Math.sqrt(area)*.11)),seed});
  }
  if(bi%5000===0){setProgress(12+bi/renderBuildings.length*42,`Đang phân loại ${bi.toLocaleString('vi-VN')} / ${renderBuildings.length.toLocaleString('vi-VN')} công trình…`);await yieldMain();}
}

setProgress(57,'Đang biên dịch vật liệu TSL…');
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
geometry.setAttribute('baseColor24',new THREE.Float32BufferAttribute(baseRgb,3));
geometry.setAttribute('surface24',new THREE.Float32BufferAttribute(surfaces,1));
geometry.setAttribute('class24',new THREE.Float32BufferAttribute(classes,1));
geometry.setAttribute('seed24',new THREE.Float32BufferAttribute(seeds,1));
geometry.setAttribute('direct24',new THREE.Float32BufferAttribute(directs,1));
geometry.computeVertexNormals();

const realism=uniform(1);
const nightLevel=uniform(0);
const base=varying(attribute('baseColor24','vec3'));
const surface=varying(attribute('surface24','float'));
const materialClass=varying(attribute('class24','float'));
const buildingSeed=varying(attribute('seed24','float'));
const directTag=varying(attribute('direct24','float'));
const facadeUv=uv();
const detailFade=float(1).sub(smoothstep(800,3600,nodeDistance(positionWorld,cameraPosition)));
const bayWidth=mix(float(2.45),float(4.3),fract(buildingSeed.mul(17.17)));
const floorHeight=mix(float(3.05),float(4.15),fract(buildingSeed.mul(31.73)));
const cell=fract(vec2(facadeUv.x.div(bayWidth),facadeUv.y.div(floorHeight)));
const room=floor(vec2(facadeUv.x.div(bayWidth),facadeUv.y.div(floorHeight)));
const roomRandom=fract(sin(dot(room.add(buildingSeed.mul(113.7)),vec2(12.9898,78.233))).mul(43758.5453));
const insideX=smoothstep(.12,.2,cell.x).mul(float(1).sub(smoothstep(.78,.88,cell.x)));
const insideY=smoothstep(.18,.28,cell.y).mul(float(1).sub(smoothstep(.67,.79,cell.y)));
const isWall=surface.greaterThan(.5);
const isGlass=surface.greaterThan(1.5).or(materialClass.equal(families.GLASS));
const windowMask=insideX.mul(insideY).mul(isWall).mul(detailFade);
const facadeNoise=fract(sin(dot(positionWorld.xz,vec2(.06711056,.00584731)).add(buildingSeed.mul(91.17))).mul(19341.734));
const verticalShade=mix(.83,1.05,smoothstep(1.5,85,facadeUv.y));
const wallWeather=mix(.86,1.08,facadeNoise).mul(verticalShade);
const wallColor=base.mul(wallWeather);
const glassDay=mix(color('#58727a'),color('#91aaac'),smoothstep(.2,.86,roomRandom));
const glassNight=mix(color('#29414a'),color('#667c7d'),roomRandom);
const glassColor=mix(glassDay,glassNight,nightLevel.mul(.75));
const concreteWindow=mix(color('#566b70'),color('#859693'),roomRandom.mul(.7));
const windowColor=select(isGlass,glassColor,concreteWindow);
const windowBlend=windowMask.mul(mix(float(.38),float(.72),nightLevel));
const floorBand=float(1).sub(smoothstep(.02,.095,cell.y)).mul(isWall).mul(detailFade);
const lowerStorey=float(1).sub(smoothstep(5.5,9.5,positionWorld.y)).mul(isWall).mul(detailFade);
const shopMask=insideX.mul(float(1).sub(smoothstep(.82,.94,cell.x))).mul(lowerStorey);
const roofWarm=select(materialClass.equal(families.RESIDENTIAL).or(materialClass.equal(families.RELIGIOUS)),color('#92573e'),base.mul(.63));
const roofColor=mix(base.mul(.72),roofWarm,.72).mul(mix(.9,1.06,facadeNoise));
let rich=mix(roofColor,wallColor,isWall);
rich=mix(rich,windowColor,windowBlend);
rich=mix(rich,rich.mul(.66),floorBand.mul(.34));
rich=mix(rich,color('#263d40'),shopMask.mul(.48));
rich=mix(rich,base.mul(1.08),directTag.mul(.12));

const cityMaterial=new THREE.MeshStandardNodeMaterial({side:THREE.DoubleSide});
cityMaterial.colorNode=mix(base,rich,realism);
cityMaterial.roughnessNode=mix(float(.86),mix(float(.82),float(.16),windowMask),realism);
cityMaterial.metalnessNode=mix(float(.04),select(isGlass,float(.14),float(.015)),realism);
const litRoom=windowMask.mul(step(.955,roomRandom)).mul(nightLevel).mul(realism).mul(.42);
cityMaterial.emissiveNode=color('#ffc47f').mul(litRoom);

const city=new THREE.Mesh(geometry,cityMaterial);
city.castShadow=true;
city.receiveShadow=true;
scene.add(city);

// Context layers keep the PBR facade readable without inventing surveyed detail.
function flatGeometry(rings,y=0){
  const flat=[],holes=[];let count=0;
  for(let i=0;i<rings.length;i++){if(i)holes.push(count);for(const p of rings[i]){flat.push(p[0],p[1]);count++;}}
  const ids=window.earcut(flat,holes,2),out=[];
  for(let i=0;i<ids.length;i+=3)for(const k of [ids[i],ids[i+2],ids[i+1]])out.push(flat[k*2],y,flat[k*2+1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();return g;
}
function mergeGeometry(items){
  const out=[];for(const g of items)out.push(...g.attributes.position.array);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();return g;
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(D.meta.width,D.meta.depth),new THREE.MeshStandardNodeMaterial({color:'#b2b2a2',roughness:1}));
ground.geometry.rotateX(-Math.PI/2);ground.position.y=-1;ground.receiveShadow=true;scene.add(ground);
new THREE.TextureLoader().load('data/sentinel-2016.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;ground.material.map=texture;ground.material.color.set('#c0c2b3');ground.material.needsUpdate=true;});
const outside=new THREE.Mesh(new THREE.PlaneGeometry(60000,60000),new THREE.MeshStandardNodeMaterial({color:'#758a7b',roughness:1}));outside.rotation.x=-Math.PI/2;outside.position.y=-3;scene.add(outside);
const parks=new THREE.Mesh(mergeGeometry(D.green.map(r=>flatGeometry(r,.35))),new THREE.MeshStandardNodeMaterial({color:'#47694b',roughness:.96,side:THREE.DoubleSide}));parks.receiveShadow=true;scene.add(parks);

const waterMaterial=new THREE.MeshStandardNodeMaterial({roughness:.42,metalness:.04,side:THREE.DoubleSide});
const waterWave=sin(positionWorld.x.mul(.018).add(time.mul(.42))).add(sin(positionWorld.z.mul(.026).sub(time.mul(.31)))).mul(.5).add(.5);
waterMaterial.colorNode=mix(color('#244e59'),color('#4f7777'),waterWave.mul(.24));
const water=new THREE.Mesh(mergeGeometry(D.water.map(r=>flatGeometry(r,.7))),waterMaterial);water.receiveShadow=true;scene.add(water);

const roadGroups={edge:[],asphalt:[],pedestrian:[],marking:[]};
const widths={motorway:16,trunk:15,primary:14,secondary:11,tertiary:8,residential:5,living_street:4,service:3.5,unclassified:5,footway:2.5,pedestrian:12,cycleway:2,path:1.5};
function ribbon(coords,width,y,target){
  for(let i=0;i<coords.length-1;i++){
    const a=coords[i],b=coords[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.1)continue;
    const ox=-dz/length*width/2,oz=dx/length*width/2;
    const vs=[[a[0]+ox,y,a[1]+oz],[b[0]+ox,y,b[1]+oz],[a[0]-ox,y,a[1]-oz],[b[0]-ox,y,b[1]-oz]];
    for(const k of [0,2,1,1,2,3])target.push(...vs[k]);
  }
}
for(const road of D.roads){
  if(road.tunnel)continue;
  const width=road.lanes?Math.max(widths[road.type]||4,road.lanes*3.1):widths[road.type]||4;
  const y=road.bridge?13:1.0;
  ribbon(road.c,width+1.8,y,roadGroups.edge);
  ribbon(road.c,width,y+.09,roadGroups[road.type==='pedestrian'||road.type==='footway'?'pedestrian':'asphalt']);
  if(['motorway','trunk','primary','secondary'].includes(road.type))ribbon(road.c,.16,y+.18,roadGroups.marking);
}
const roadColors={edge:'#aaa99f',asphalt:'#444b49',pedestrian:'#b6ab96',marking:'#decf9f'};
for(const [name,data] of Object.entries(roadGroups)){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.computeVertexNormals();
  const m=new THREE.MeshStandardNodeMaterial({color:roadColors[name],roughness:name==='asphalt'?.76:.9,metalness:name==='asphalt'?.05:0,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;scene.add(mesh);
}

// Flood 25A visual calibration layer. The ribbons follow named OSM road centrelines
// in the observed Thao Dien corridor. Their depth is a bounded visual proxy tied to
// the documented near-200 mm event, never a hydraulic solver output or forecast.
const floodCorridors=[
  {name:'Quốc Hương',maxDepthM:.40,color:'#2f92ad'},
  {name:'Thảo Điền',maxDepthM:.40,color:'#258aa8'},
  {name:'Nguyễn Văn Hưởng',maxDepthM:.25,color:'#397f9c'}
];
const floodRoadMeshes=[];
let floodAlertLabels=[];
for(const corridor of floodCorridors){
  const points=[];
  for(const road of D.roads){
    if(road.bridge||road.tunnel||road.name!==corridor.name)continue;
    const width=road.lanes?Math.max(widths[road.type]||5,road.lanes*3.1):widths[road.type]||5;
    ribbon(road.c,width+2.2,1.18,points);
  }
  if(!points.length)continue;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.computeVertexNormals();
  const m=new THREE.MeshPhysicalNodeMaterial({color:corridor.color,roughness:.22,metalness:.08,transmission:.08,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.name=`Flood proxy · ${corridor.name}`;mesh.visible=false;mesh.renderOrder=8;mesh.userData={...corridor};scene.add(mesh);floodRoadMeshes.push(mesh);
}
const alertRoadNames=['Quốc Hương','Thảo Điền','Nguyễn Văn Hưởng','Tống Hữu Định','Xuân Thủy','Nguyễn Hữu Cảnh','Điện Biên Phủ','Mai Chí Thọ'];
const floodAlertPoints=alertRoadNames.map(name=>{
  const roads=D.roads.filter(road=>road.name===name&&!road.tunnel),coords=roads.flatMap(road=>road.c);
  if(!coords.length)return null;
  return{name,x:coords.reduce((sum,p)=>sum+p[0],0)/coords.length,z:coords.reduce((sum,p)=>sum+p[1],0)/coords.length};
}).filter(Boolean);
const floodAlertGroup=new THREE.Group();floodAlertGroup.name='IOC flood alert beacons';floodAlertGroup.visible=false;scene.add(floodAlertGroup);
const alertBeamMaterial=new THREE.MeshStandardNodeMaterial({color:'#ff3c32',emissive:'#c41414',emissiveIntensity:2.2,transparent:true,opacity:.64,depthWrite:false});
const alertRingMaterial=new THREE.MeshStandardNodeMaterial({color:'#ffb19a',emissive:'#ff281f',emissiveIntensity:1.7,transparent:true,opacity:.88,depthWrite:false});
for(const point of floodAlertPoints){
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(2.4,7.5,145,10,1,true),alertBeamMaterial);beam.position.set(point.x,73,point.z);beam.userData=point;floodAlertGroup.add(beam);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(17,1.2,8,32),alertRingMaterial);ring.rotation.x=Math.PI/2;ring.position.set(point.x,3.8,point.z);ring.userData=point;floodAlertGroup.add(ring);
}
let floodTideM=1.4;
function setFloodScenario(amountMm,tideM=floodTideM){
  const mm=Math.max(0,Math.min(200,Number(amountMm)||0));
  floodTideM=Math.max(1.4,Math.min(1.8,Number(tideM)||1.4));
  const rainRatio=mm/200,tideRatio=(floodTideM-1.4)/.4,severity=Math.min(1,rainRatio*.64+tideRatio*.36),proxyDepthM=Math.max(0,(severity-.08)/.92*.5);
  for(const mesh of floodRoadMeshes){
    mesh.visible=severity>=.07;
    mesh.material.opacity=Math.min(.82,Math.max(0,(severity-.03)*.92));
    mesh.position.y=.04+severity*(.08+mesh.userData.maxDepthM*.34);
    mesh.scale.y=1+severity*mesh.userData.maxDepthM;
  }
  const alertLevel=severity>=.78?'red':severity>=.55?'orange':severity>=.3?'yellow':'monitor';
  floodAlertGroup.visible=severity>=.3;
  alertBeamMaterial.opacity=.32+severity*.45;alertRingMaterial.opacity=.48+severity*.48;
  floodAlertGroup.scale.y=.55+severity*.7;
  for(const label of floodAlertLabels)label.active=severity>=.3;
  materialStatus.floodVisual={amountMm:mm,tideM:floodTideM,referenceEventMm:200,severity,alertLevel,proxyDepthM,mode:'bounded_visual_proxy',hydraulicOutput:false,corridors:floodRoadMeshes.map(mesh=>mesh.userData.name),alertRoads:floodAlertPoints.map(point=>point.name)};
  return materialStatus.floodVisual;
}
function setFloodRain(amountMm){return setFloodScenario(amountMm,floodTideM);}

// Ba Son bridge: WebGPU-native structural layer, anchored to the mapped bridge centerline.
const BS=window.BA_SON_BRIDGE;
if(!BS?.centerline?.length)throw new Error('BA_SON_BRIDGE không khả dụng');
const bridgeGroup=new THREE.Group();bridgeGroup.name='Cầu Ba Son · kết cấu dây văng';scene.add(bridgeGroup);
const bridgeDeckGroup=new THREE.Group(),bridgeSupportGroup=new THREE.Group(),bridgeCableGroup=new THREE.Group();
bridgeGroup.add(bridgeDeckGroup,bridgeSupportGroup,bridgeCableGroup);
const bridgeConcrete=new THREE.MeshStandardNodeMaterial({color:'#888e89',roughness:.76,metalness:.05});
const bridgeUnderside=new THREE.MeshStandardNodeMaterial({color:'#455256',roughness:.68,metalness:.18});
const bridgeGold=new THREE.MeshStandardNodeMaterial({color:'#d3a35a',roughness:.34,metalness:.48});
bridgeGold.emissiveNode=color('#2b1808').mul(.18);
const bridgeCableMaterial=new THREE.MeshStandardNodeMaterial({color:'#ffd27d',roughness:.23,metalness:.65});
bridgeCableMaterial.emissiveNode=color('#a9691d').mul(.48);
function bridgeBeam(a,b,radius,material,parent=bridgeSupportGroup,radial=8){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),vector=bv.clone().sub(av);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,vector.length(),radial),material);
  mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
  mesh.castShadow=radius>.5;mesh.receiveShadow=radius>.5;parent.add(mesh);return mesh;
}
function bridgeDeckSegment(a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mesh=new THREE.Mesh(new THREE.BoxGeometry(24,3.2,length),bridgeUnderside);
  mesh.position.set((a[0]+b[0])*.5,11.25,(a[1]+b[1])*.5);mesh.rotation.y=Math.atan2(dx,dz);mesh.castShadow=true;mesh.receiveShadow=true;bridgeDeckGroup.add(mesh);
}
for(let i=0;i<BS.centerline.length-1;i++)bridgeDeckSegment(BS.centerline[i],BS.centerline[i+1]);
const bridgeAxis=new THREE.Vector3(BS.directionToThuThiem[0],0,BS.directionToThuThiem[1]);
const bridgePerp=new THREE.Vector3(BS.perpendicular[0],0,BS.perpendicular[1]);
const pylonBase=new THREE.Vector3(BS.supports[1].position[0],1.5,BS.supports[1].position[1]);
function bridgePier(support,isMain=false){
  const p=new THREE.Vector3(support.position[0],0,support.position[1]);
  const foundation=new THREE.Mesh(new THREE.CylinderGeometry(isMain?9:4.2,isMain?11:5.2,4,16),bridgeConcrete);
  foundation.position.set(p.x,3,p.z);foundation.castShadow=true;foundation.receiveShadow=true;bridgeSupportGroup.add(foundation);
  if(isMain)return;
  for(const side of [-1,1]){const q=p.clone().addScaledVector(bridgePerp,side*5.4);bridgeBeam([q.x,2,q.z],[q.x,10.8,q.z],2.35,bridgeConcrete);}
  const cap=new THREE.Mesh(new THREE.BoxGeometry(15,2.3,4.3),bridgeConcrete);cap.position.set(p.x,11.1,p.z);cap.rotation.y=Math.atan2(bridgeAxis.x,bridgeAxis.z);cap.castShadow=true;bridgeSupportGroup.add(cap);
}
for(const support of BS.supports)bridgePier(support,support.id==='S2');
for(const side of [-1,1]){
  const foot=pylonBase.clone().addScaledVector(bridgePerp,side*7),shoulder=pylonBase.clone().addScaledVector(bridgePerp,side*4);shoulder.y=18;
  bridgeBeam(foot.toArray(),shoulder.toArray(),3.2,bridgeGold);let previous=shoulder;
  for(let i=1;i<=9;i++){
    const t=i/9,curve=bridgeAxis.clone().multiplyScalar(22*t*t),point=pylonBase.clone().add(curve).addScaledVector(bridgePerp,side*(4-2.7*t));point.y=18+t*95;
    bridgeBeam(previous.toArray(),point.toArray(),1.55+.65*(1-t),bridgeGold);previous=point;
  }
}
const pylonCross=new THREE.Mesh(new THREE.BoxGeometry(20,2.5,3.4),bridgeGold);pylonCross.position.copy(pylonBase).setY(18);pylonCross.rotation.y=Math.atan2(bridgeAxis.x,bridgeAxis.z);pylonCross.castShadow=true;bridgeSupportGroup.add(pylonCross);
function bridgeCable(anchor,top,side){
  const lateral=bridgePerp.clone().multiplyScalar(side*6.8),a=pylonBase.clone().add(anchor).add(lateral);a.y=14.8;
  const t=pylonBase.clone().add(top).addScaledVector(bridgePerp,side*(3.8-top.y/113*2.2));bridgeBeam(a.toArray(),t.toArray(),.32,bridgeCableMaterial,bridgeCableGroup,6);
}
for(const side of [-1,1]){
  for(let i=0;i<9;i++){const anchor=bridgeAxis.clone().multiplyScalar(-(28+i*23)),top=bridgeAxis.clone().multiplyScalar(4+12*(i/8));top.y=34+i*8.4;bridgeCable(anchor,top,side);}
  for(let i=0;i<5;i++){const anchor=bridgeAxis.clone().multiplyScalar(25+i*22),top=bridgeAxis.clone().multiplyScalar(5+12*(i/4));top.y=42+i*13;bridgeCable(anchor,top,side);}
}

// Marina Central Tower: official 240 m / 55 floors, anchored to three current OSM building parts.
// The bands visualize the documented terraced networking floors; they are schematic, not survey geometry.
const marinaDetail=new THREE.Group();marinaDetail.name='Marina Central Tower · nhận diện 24B';scene.add(marinaDetail);
const marinaCenter=new THREE.Vector3(CORRECTIONS.marinaCentral.center[0],0,CORRECTIONS.marinaCentral.center[1]),marinaRotation=CORRECTIONS.marinaCentral.rotation;
const marinaBandMaterial=new THREE.MeshStandardNodeMaterial({color:'#9eb6b5',roughness:.27,metalness:.26});
marinaBandMaterial.emissiveNode=color('#183339').mul(.16);
const marinaCanopyMaterial=new THREE.MeshStandardNodeMaterial({color:'#d3c29e',roughness:.42,metalness:.18});
for(let i=0;i<6;i++){
  const height=158+i*8.1,stepOut=i*.72,band=new THREE.Mesh(new THREE.BoxGeometry(55+stepOut,1.05,43+stepOut*.55),marinaBandMaterial);
  band.position.set(marinaCenter.x,height,marinaCenter.z);band.rotation.y=marinaRotation;band.castShadow=true;marinaDetail.add(band);
}
const marinaCrown=new THREE.Mesh(new THREE.BoxGeometry(47,2.2,35),marinaCanopyMaterial);marinaCrown.position.set(marinaCenter.x,240.6,marinaCenter.z);marinaCrown.rotation.y=marinaRotation;marinaCrown.castShadow=true;marinaDetail.add(marinaCrown);
const marinaCanopy=new THREE.Mesh(new THREE.BoxGeometry(55,1.2,9),marinaCanopyMaterial);marinaCanopy.position.set(marinaCenter.x+18,23,marinaCenter.z+18);marinaCanopy.rotation.set(0,marinaRotation,-Math.PI/6);marinaCanopy.castShadow=true;marinaDetail.add(marinaCanopy);

// Grand Marina residential cluster: identity details sit on the corrected open footprints.
const grandMarinaDetail=new THREE.Group();grandMarinaDetail.name='Grand Marina Residences · cụm 4 tháp hiện hữu';scene.add(grandMarinaDetail);
const grandMarinaFrameMaterial=new THREE.MeshStandardNodeMaterial({color:'#a7b5aa',roughness:.31,metalness:.22});
grandMarinaFrameMaterial.emissiveNode=color('#20382d').mul(.13);
const grandMarinaCrownMaterial=new THREE.MeshStandardNodeMaterial({color:'#cbb98f',roughness:.46,metalness:.16});
const correctedGrandMarina=[];
for(const [id,correction] of grandMarinaHeightCorrections){
  const building=renderBuildings.find(item=>Number(item.id)===id);if(!building)continue;
  correctedGrandMarina.push(building);
  const ring=building.r[0],edgeA=new THREE.Vector2(ring[1][0]-ring[0][0],ring[1][1]-ring[0][1]),rotation=Math.atan2(edgeA.x,edgeA.y);
  const area=Math.abs(ring.reduce((sum,p,i)=>sum+p[0]*ring[(i+1)%ring.length][1]-ring[(i+1)%ring.length][0]*p[1],0))*.5;
  const crownWidth=Math.min(47,Math.max(31,Math.sqrt(area)*.9)),crownDepth=crownWidth*.68;
  const crown=new THREE.Mesh(new THREE.BoxGeometry(crownWidth,2.1,crownDepth),grandMarinaCrownMaterial);
  crown.position.set(building.center[0],correction.h+1.1,building.center[1]);crown.rotation.y=rotation;crown.castShadow=true;grandMarinaDetail.add(crown);
  const axis=new THREE.Vector3(Math.sin(rotation),0,Math.cos(rotation)),perp=new THREE.Vector3(-axis.z,0,axis.x);
  for(const side of [-1,0,1]){
    const base=new THREE.Vector3(building.center[0],12,building.center[1]).addScaledVector(perp,side*crownWidth*.24).addScaledVector(axis,crownDepth*.51);
    const top=base.clone();top.y=correction.h-7;bridgeBeam(base.toArray(),top.toArray(),.28,grandMarinaFrameMaterial,grandMarinaDetail,5);
  }
  for(const y of [correction.h*.34,correction.h*.67]){
    const band=new THREE.Mesh(new THREE.BoxGeometry(crownWidth+1.2,.72,crownDepth+1.2),grandMarinaFrameMaterial);
    band.position.set(building.center[0],y,building.center[1]);band.rotation.y=rotation;grandMarinaDetail.add(band);
  }
}

setProgress(73,'Đang gieo tán cây và chi tiết mái…');
let randomState=2401;const random=()=>{randomState=(1664525*randomState+1013904223)>>>0;return randomState/4294967296;};
function contains(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
const trees=[];
for(const rings of D.green){
  const r=rings[0],xs=r.map(p=>p[0]),zs=r.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  const count=Math.min(650,Math.ceil((x1-x0)*(z1-z0)/180));
  for(let i=0;i<count;i++){const p=[x0+random()*(x1-x0),z0+random()*(z1-z0)];if(contains(p,r)&&!rings.slice(1).some(h=>contains(p,h)))trees.push({x:p[0],z:p[1],h:5+random()*10,s:random()});}
}
const dummy=new THREE.Object3D();
const trunkMaterial=new THREE.MeshStandardNodeMaterial({color:'#665343',roughness:.98});
const leafMaterial=new THREE.MeshStandardNodeMaterial({color:'#315f3b',roughness:.92});
const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.32,.52,1,6),trunkMaterial,trees.length);
const canopies=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),leafMaterial,trees.length*2);
trees.forEach((tree,i)=>{
  dummy.position.set(tree.x,tree.h*.28,tree.z);dummy.rotation.set(0,tree.s*5,0);dummy.scale.set(1,tree.h*.56,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let l=0;l<2;l++){
    const scale=tree.h*(l?.28:.36);dummy.position.set(tree.x+(l?tree.s-.5:0)*2.2,tree.h*(l?.72:.62)+1,tree.z+(l?.5-tree.s:0)*2.1);dummy.rotation.set(tree.s*.3,tree.s*6+l,tree.s*.2);dummy.scale.set(scale*(1.05+l*.1),scale*.8,scale);dummy.updateMatrix();canopies.setMatrixAt(i*2+l,dummy.matrix);
    canopies.setColorAt(i*2+l,new THREE.Color().setHSL(.25+tree.s*.055,.32+tree.s*.12,.22+l*.035));
  }
});
trunks.castShadow=canopies.castShadow=true;trunks.receiveShadow=canopies.receiveShadow=true;scene.add(trunks,canopies);

const fixtureMaterial=new THREE.MeshStandardNodeMaterial({color:'#858c88',roughness:.68,metalness:.2});
const fixtures=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),fixtureMaterial,roofFixtures.length);
roofFixtures.forEach((item,i)=>{dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(0,item.seed*5.3,0);dummy.scale.set(item.scale,1.4+item.seed*1.8,item.scale*.62);dummy.updateMatrix();fixtures.setMatrixAt(i,dummy.matrix);});
fixtures.castShadow=true;scene.add(fixtures);
let sceneMeshCount=0;scene.traverse(object=>{if(object.isMesh)sceneMeshCount++;});$('#draws').textContent=sceneMeshCount;

setProgress(84,'Đang hoàn tất cảnh và biên dịch pipeline…');

const places=[['BITEXCO',106.70435,10.7716,278],['NGUYỄN HUỆ',106.7035,10.7751,18],['BẾN BẠCH ĐẰNG',106.7067,10.7762,16],['LANDMARK 81',106.7219,10.7949,470],['MARINA CENTRAL · 240 M',106.707826,10.782198,252],['GRAND MARINA · 4 THÁP',106.70895,10.78472,184],['CẦU BA SON',106.71073,10.77927,122],['THẢO ĐIỀN · VÙNG HIỆU CHỈNH',106.7312,10.8037,34],['QUỐC HƯƠNG',106.7322,10.8044,15],['NGUYỄN VĂN HƯỞNG',106.7282,10.8022,15]];
const labels=places.map(place=>{const el=document.createElement('div');el.className='label';el.textContent=place[0];$('#labels').append(el);return{el,pos:xyz(place[1],place[2],place[3])};});
floodAlertLabels=floodAlertPoints.map(point=>{const el=document.createElement('div');el.className='label alert-label';el.textContent=point.name;$('#labels').append(el);const item={el,pos:new THREE.Vector3(point.x,155,point.z),active:false};labels.push(item);return item;});

const presets={
  materials:{target:xyz(106.7060,10.7764,68),distance:1120,az:.92,polar:1.08,label:'MATERIAL DISTRICT'},
  river:{target:xyz(106.7022,10.7723,72),distance:2200,az:.92,polar:1.16,label:'BẾN BẠCH ĐẰNG'},
  boulevard:{target:xyz(106.7039,10.7747,43),distance:1180,az:1.1,polar:1.05,label:'NGUYỄN HUỆ'},
  overview:{target:new THREE.Vector3(0,0,0),distance:7600,az:.45,polar:.63,label:'TOÀN VÙNG · 38,57 KM²'},
  bason:{target:new THREE.Vector3(-300,76,-360),distance:930,az:2.43,polar:1.03,label:'BA SON · MARINA CENTRAL + GRAND MARINA'},
  flood25:{target:xyz(106.7305,10.8030,24),distance:1280,az:-.92,polar:1.01,label:'THẢO ĐIỀN · MÔ PHỎNG NGẬP 25A'}
};
const initial=presets[params.get('view')]||presets.materials;
let target=initial.target.clone(),cameraDistance=initial.distance,azimuth=initial.az,polar=initial.polar,desired=null;
function selectView(key){
  const p=presets[key];if(!p)return;desired={...p,target:p.target.clone()};
  document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===key));
  $('#viewLabel').textContent=p.label;history.replaceState(null,'',`?v=${APP_VERSION}&view=${key}${forceWebGL?'&backend=webgl':''}`);
}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>selectView(button.dataset.view));
selectView(params.get('view') in presets?params.get('view'):'materials');
materialStatus.selectView=selectView;
materialStatus.setFloodRain=setFloodRain;
materialStatus.setFloodScenario=setFloodScenario;
materialStatus.floodPresets={pilot:'flood25',referenceRainMm:200};
setFloodRain(0);

const lightStates={
  day:{background:'#9bb7bd',fog:'#9bb7bd',sun:'#fff0ce',sunIntensity:3.15,hemi:1.5,exposure:1.02,night:0,pos:[-2300,3500,1800]},
  golden:{background:'#a89d94',fog:'#a89d94',sun:'#ffb66f',sunIntensity:3.8,hemi:1.05,exposure:.96,night:.12,pos:[-4200,1250,1700]},
  night:{background:'#071725',fog:'#071725',sun:'#7796c7',sunIntensity:.45,hemi:.46,exposure:.78,night:1,pos:[-1800,2600,900]}
};
function setLight(key){
  const state=lightStates[key];if(!state)return;
  scene.background.set(state.background);scene.fog.color.set(state.fog);sun.color.set(state.sun);sun.intensity=state.sunIntensity;hemi.intensity=state.hemi;renderer.toneMappingExposure=state.exposure;nightLevel.value=state.night;sun.position.set(...state.pos);
  document.querySelectorAll('[data-light]').forEach(button=>button.classList.toggle('active',button.dataset.light===key));
  materialStatus.light=key;
}
document.querySelectorAll('[data-light]').forEach(button=>button.onclick=()=>setLight(button.dataset.light));
setLight('day');

const realismInput=$('#realism'),realismValue=$('#realismValue');
function setRealism(value){const number=Math.max(0,Math.min(100,Number(value)));realism.value=number/100;realismInput.value=number;realismValue.value=`${Math.round(number)}%`;materialStatus.realism=number;}
realismInput.oninput=()=>setRealism(realismInput.value);setRealism(100);
const compare=$('#compare');let compareRestore=100;
const compareDown=event=>{event.preventDefault();compareRestore=Number(realismInput.value);compare.classList.add('active');setRealism(0);};
const compareUp=()=>{if(!compare.classList.contains('active'))return;compare.classList.remove('active');setRealism(compareRestore);};
compare.addEventListener('pointerdown',compareDown);window.addEventListener('pointerup',compareUp);window.addEventListener('pointercancel',compareUp);

function savedPanelState(key,fallback){
  try{const value=localStorage.getItem(key);return value===null?fallback:value==='true';}catch{return fallback;}
}
function bindCollapsible(panel,button,key,defaultCollapsed){
  const icon=button.querySelector('span'),label=button.querySelector('b');
  const apply=collapsed=>{
    panel.classList.toggle('collapsed',collapsed);
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'Mở rộng bảng thông tin':'Thu gọn bảng thông tin');
    if(icon)icon.textContent=collapsed?'⌄':'⌃';
    if(label)label.textContent=collapsed?'Mở':'Gọn';
    try{localStorage.setItem(key,String(collapsed));}catch{}
  };
  apply(savedPanelState(key,defaultCollapsed));
  button.addEventListener('click',()=>apply(!panel.classList.contains('collapsed')));
  return apply;
}
bindCollapsible($('#story'),$('#collapseStory'),'citylab.panel.story.collapsed',true);
bindCollapsible($('#controls'),$('#collapse'),'citylab.panel.controls.collapsed',true);
bindCollapsible($('#selection'),$('#collapseSelection'),'citylab.panel.selection.collapsed',false);
const toggleUi=()=>document.body.classList.toggle('ui-hidden');$('#toggleUi').onclick=toggleUi;

const canvas=renderer.domElement;canvas.tabIndex=0;canvas.style.touchAction='none';
let pointerDown=false,panning=false,moved=false,lastX=0,lastY=0,startX=0,startY=0;
canvas.addEventListener('pointerdown',event=>{pointerDown=true;panning=event.button===2||event.shiftKey;moved=false;lastX=startX=event.clientX;lastY=startY=event.clientY;desired=null;canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(!pointerDown)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;if(Math.hypot(event.clientX-startX,event.clientY-startY)>5)moved=true;if(panning){const scale=cameraDistance*.00072;target.x-=dx*Math.cos(azimuth)*scale+dy*Math.sin(azimuth)*scale;target.z+=dx*Math.sin(azimuth)*scale-dy*Math.cos(azimuth)*scale;}else{azimuth-=dx*.004;polar=Math.max(.16,Math.min(1.43,polar+dy*.003));}});
canvas.addEventListener('pointerup',event=>{pointerDown=false;if(!moved&&event.button===0)pick(event.clientX,event.clientY);});
canvas.addEventListener('pointercancel',()=>pointerDown=false);canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('wheel',event=>{event.preventDefault();desired=null;cameraDistance=Math.max(180,Math.min(13000,cameraDistance*Math.exp(event.deltaY*.001)));},{passive:false});
window.addEventListener('keydown',event=>{
  if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName))return;
  const key=event.key.toLowerCase();if(key==='h'){toggleUi();return;}if(key==='0'){selectView('materials');return;}
  if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e','+','=','-','_'].includes(key))return;
  event.preventDefault();desired=null;const stride=Math.max(18,Math.min(240,cameraDistance*.055));
  const forward=new THREE.Vector3(target.x-camera.position.x,0,target.z-camera.position.z).normalize(),right=new THREE.Vector3(-forward.z,0,forward.x);
  if(key==='arrowup'||key==='w')target.addScaledVector(forward,stride);else if(key==='arrowdown'||key==='s')target.addScaledVector(forward,-stride);else if(key==='arrowleft'||key==='a')target.addScaledVector(right,-stride);else if(key==='arrowright'||key==='d')target.addScaledVector(right,stride);else if(key==='q')azimuth-=.12;else if(key==='e')azimuth+=.12;else if(key==='+'||key==='=')cameraDistance=Math.max(180,cameraDistance*.88);else cameraDistance=Math.min(13000,cameraDistance*1.14);
});

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pick(x,y){
  pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(city,false)[0];if(!hit){$('#selection').hidden=true;return;}
  const face=hit.faceIndex;let low=0,high=faceEnds.length-1;while(low<high){const mid=(low+high)>>1;if(faceEnds[mid]>face)high=mid;else low=mid+1;}
  const building=renderBuildings[low],kind=classify(building),direct=SM.records[String(building.id)]||{};
  $('#selectedName').textContent=building.name||`Công trình ${building.id}`;
  $('#selectedBody').innerHTML=`<p>Chiều cao dựng: <b>${building.h.toLocaleString('vi-VN')} m</b> · ${building.q==='estimated'?'ước lượng':'có đối chiếu nguồn'}</p><p>Họ vật liệu: <b>${['Phổ thông','Nhà ở','Kính thương mại','Công cộng','Công nghiệp','Trung tâm','Tôn giáo','Hỗn hợp'][kind]}</b></p><p>${Object.keys(direct).length?'Có thẻ vật liệu/màu từ dữ liệu mở; shader thêm độ nhám, ô cửa và phong hóa.':'Màu và nhịp mặt đứng được suy luận ổn định từ loại công trình, chiều cao, khu vực và ID.'}</p>`;
  $('#selection').hidden=false;
}
$('#closeSelection').onclick=()=>{$('#selection').hidden=true;};

$('#buildingCount').textContent=D.meta.renderedBuildings.toLocaleString('vi-VN');
Object.assign(materialStatus,{
  version:APP_VERSION,threeRevision:THREE.REVISION,backend:actualWebGPU?'webgpu':'webgl2-fallback',
  buildings:D.meta.renderedBuildings,areaKm2:D.meta.areaKm2,materialFamilies:8,
  directlyTaggedBuildings:SM.directTaggedBuildings,directCoveragePercent:SM.directCoveragePercent,
  inferredBuildings:D.meta.renderedBuildings-SM.directTaggedBuildings,realism:100,light:'day',
  bridge:{name:'Cầu Ba Son',pylonHeightM:113,cablePlanes:2,cables:28,surveyedGeometry:false},
  marinaCentral:{heightM:240,floors:55,osmParts:[1432358258,1432358259,1432358260],classification:'official_attributes_anchored_to_open_footprint'},
  grandMarinaResidences:{correctedTowers:4,osmParts:[1151026864,1151026865,1151026866,1151026867],heightsM:[170,170,170,162],heightClass:'official_floor_count_proxy',towerNameMapping:'withheld_pending_official_geospatial_plan'},
  limitations:['Không phải ảnh mặt đứng khảo sát','Hầu hết chiều cao còn ước lượng','Kết cấu cầu và chi tiết giật cấp Marina Central là mô hình cách điệu có neo nguồn'],state:'ready'
});

let lastTime=performance.now(),frameCount=0,fpsTime=lastTime,lastLabel=0;
function render(now){
  const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
  if(desired){const ease=1-Math.exp(-4.4*dt);target.lerp(desired.target,ease);cameraDistance+=(desired.distance-cameraDistance)*ease;azimuth+=(desired.az-azimuth)*ease;polar+=(desired.polar-polar)*ease;if(Math.abs(cameraDistance-desired.distance)<.4&&target.distanceTo(desired.target)<.2)desired=null;}
  camera.position.set(target.x+cameraDistance*Math.sin(polar)*Math.sin(azimuth),target.y+cameraDistance*Math.cos(polar),target.z+cameraDistance*Math.sin(polar)*Math.cos(azimuth));camera.lookAt(target);
  scene.fog.density=Math.min(.000145,.48/cameraDistance);
  if(now-lastLabel>120){lastLabel=now;for(const label of labels){const projected=label.pos.clone().project(camera),x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;const visible=(label.active!==false)&&projected.z<1&&x>30&&x<innerWidth-30&&y>85&&y<innerHeight-55;label.el.style.display=visible?'block':'none';if(visible){label.el.style.left=`${Math.round(x)}px`;label.el.style.top=`${Math.round(y)}px`;}}}
  renderer.info?.reset?.();renderer.render(scene,camera);frameCount++;
  if(now-fpsTime>1000){const fps=Math.round(frameCount*1000/(now-fpsTime));frameCount=0;fpsTime=now;$('#fps').textContent=fps;const triangles=renderer.info?.render?.triangles??0;$('#triangles').textContent=triangles>1e6?`${(triangles/1e6).toFixed(1)}M`:Math.round(triangles/1000)+'K';materialStatus.fps=fps;materialStatus.meshes=sceneMeshCount;materialStatus.triangles=triangles||null;}
}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
setProgress(94,'Đang nạp pipeline GPU lần đầu…');
renderer.setAnimationLoop(render);
await renderer.compileAsync(scene,camera);
setProgress(100,'Sẵn sàng');
window.dispatchEvent(new CustomEvent('citylab:renderer-ready',{detail:materialStatus}));
setTimeout(()=>loading.classList.add('done'),220);
