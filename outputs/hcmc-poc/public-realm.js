/* Street furniture positions are illustrative samples along mapped public-space axes. */
'use strict';
const realm=new T.Group();scene.add(realm);
const poleMat=new T.MeshStandardMaterial({color:'#354b4d',metalness:.78,roughness:.35}),glowMat=new T.MeshStandardMaterial({color:'#fff0c5',emissive:'#ffb55f',emissiveIntensity:4,roughness:.25});
const polePositions=[];
function sampleAxis(a,b,n,offset){const p0=xyz(a[0],a[1]),p1=xyz(b[0],b[1]),dx=p1.x-p0.x,dz=p1.z-p0.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;for(let i=0;i<=n;i++){const t=i/n;for(const side of [-1,1])polePositions.push({x:p0.x+dx*t+nx*offset*side,z:p0.z+dz*t+nz*offset*side})}}
sampleAxis([106.70302,10.7719],[106.70202,10.77755],18,12);sampleAxis([106.70515,10.7695],[106.70815,10.7812],24,9);
const poles=new T.InstancedMesh(new T.CylinderGeometry(.13,.18,7,6),poleMat,polePositions.length),lamps=new T.InstancedMesh(new T.SphereGeometry(.7,8,6),glowMat,polePositions.length);
polePositions.forEach((p,i)=>{tmp.position.set(p.x,4.7,p.z);tmp.scale.set(1,1,1);tmp.rotation.set(0,0,0);tmp.updateMatrix();poles.setMatrixAt(i,tmp.matrix);tmp.position.y=8.35;tmp.updateMatrix();lamps.setMatrixAt(i,tmp.matrix)});realm.add(poles,lamps);
const promenade=new T.Mesh(new T.BoxGeometry(760,.28,13),new T.MeshStandardMaterial({color:'#a8a28f',roughness:.72,metalness:.08}));promenade.position.copy(xyz(106.70665,10.7754,1.55));promenade.rotation.y=-.24;realm.add(promenade);
const plazaA=xyz(106.70302,10.7719,1.55),plazaB=xyz(106.70202,10.77755,1.55),plazaDx=plazaB.x-plazaA.x,plazaDz=plazaB.z-plazaA.z,plazaLen=Math.hypot(plazaDx,plazaDz);
const plazaWater=new T.Mesh(new T.BoxGeometry(8,.16,plazaLen),new T.MeshPhysicalMaterial({color:'#47777b',metalness:.2,roughness:.2,clearcoat:1,emissive:'#173b42',emissiveIntensity:.25}));plazaWater.position.copy(plazaA).lerp(plazaB,.5);plazaWater.rotation.y=Math.atan2(plazaDx,plazaDz);realm.add(plazaWater);
for(let i=1;i<10;i++){const p=plazaA.clone().lerp(plazaB,i/10),jet=new T.Mesh(new T.CylinderGeometry(.12,.26,3+(i%3)*1.4,8),new T.MeshStandardMaterial({color:'#c8f4f0',emissive:'#78c9c8',emissiveIntensity:1.3,transparent:true,opacity:.72}));jet.position.set(p.x,3.1,p.z);realm.add(jet)}
const realmToggle=document.createElement('button');realmToggle.id='publicRealm';realmToggle.setAttribute('aria-pressed','true');realmToggle.innerHTML='⋮ <span>Nguyễn Huệ–Bạch Đằng · minh họa</span>';addVisualControl(realmToggle);realmToggle.onclick=()=>{realm.visible=!realm.visible;realmToggle.setAttribute('aria-pressed',realm.visible)};
presets.realmclose={target:xyz(106.70275,10.7739,18),distance:760,az:.05,polar:1.28,label:'NGUYỄN HUỆ–BẠCH ĐẰNG · CẬN CẢNH'};
const realmView=document.createElement('button');realmView.dataset.view='realmclose';realmView.innerHTML='<small>07</small> Nguyễn Huệ–Bạch Đằng';$('.views').append(realmView);realmView.onclick=()=>{stopCinema();follow=false;view('realmclose');document.body.classList.add('hero-view')};
