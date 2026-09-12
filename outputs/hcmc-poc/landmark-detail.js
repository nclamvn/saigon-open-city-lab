/* Landmark 81 refinement is an illustrative layer over archived open footprints. */
'use strict';
const lmParts=D.buildings.filter(b=>b.type==='illustrative-landmark-part');
const lmDetails=[];
for(const b of lmParts){
 const ring=b.r[0],xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
 const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
 const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
 for(let y=16.5;y<b.h;y+=16.5)lmDetails.push({x:cx,y:y+1.5,z:cz,sx:w+.7,sy:.42,sz:d+.7,kind:0});
 for(const x of [x0-.28,x1+.28])for(const z of [z0-.28,z1+.28])lmDetails.push({x,y:b.h/2+1.5,z,sx:.42,sy:b.h,sz:.42,kind:1});
 lmDetails.push({x:cx,y:b.h+2,z:cz,sx:w+1.4,sy:.7,sz:d+1.4,kind:2});
}
const lmGeom=new T.BoxGeometry(1,1,1),lmMat=new T.MeshStandardMaterial({color:'#a8c7c9',metalness:.72,roughness:.25,envMapIntensity:1.5});
const lmMesh=new T.InstancedMesh(lmGeom,lmMat,lmDetails.length);
lmDetails.forEach((p,i)=>{tmp.position.set(p.x,p.y,p.z);tmp.scale.set(p.sx,p.sy,p.sz);tmp.rotation.set(0,0,0);tmp.updateMatrix();lmMesh.setMatrixAt(i,tmp.matrix);lmMesh.setColorAt(i,new T.Color(p.kind===2?'#d4be8c':p.kind===1?'#7ba5a9':'#b5c9c4'))});
lmMesh.castShadow=true;lmMesh.receiveShadow=true;scene.add(lmMesh);
const lmCenter=xyz(106.7219,10.7949,0),crown=new T.Group();crown.position.copy(lmCenter);scene.add(crown);
for(let i=0;i<6;i++){const mast=new T.Mesh(new T.CylinderGeometry(.7+i*.04,.9+i*.08,8,8),new T.MeshStandardMaterial({color:'#c8d7d4',metalness:.88,roughness:.2,emissive:i>3?'#6f927e':'#000000',emissiveIntensity:.45}));mast.position.y=414+i*8;crown.add(mast)}
const beacon=new T.PointLight('#f4b47a',3.5,900,2);beacon.position.y=463;crown.add(beacon);
const lmToggle=document.createElement('button');lmToggle.id='landmarkDetail';lmToggle.setAttribute('aria-pressed','true');lmToggle.innerHTML='⌁ <span>Landmark 81 · chi tiết minh họa</span>';addVisualControl(lmToggle);
lmToggle.onclick=()=>{lmMesh.visible=!lmMesh.visible;crown.visible=lmMesh.visible;lmToggle.setAttribute('aria-pressed',lmMesh.visible)};
presets.landmarkclose={target:xyz(106.7219,10.7949,205),distance:710,az:.94,polar:1.12,label:'LANDMARK 81 · CẬN CẢNH MINH HỌA'};
const lmView=document.createElement('button');lmView.dataset.view='landmarkclose';lmView.innerHTML='<small>06</small> Landmark 81 · cận cảnh';$('.views').append(lmView);lmView.onclick=()=>{stopCinema();follow=false;view('landmarkclose');document.body.classList.add('hero-view')};
