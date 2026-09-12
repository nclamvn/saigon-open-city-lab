/* Baked-looking local shadow decals for depth; not a physically traced AO solution. */
'use strict';
const shadowItems=[];
for(const b of D.buildings){if(b.h<22)continue;const dx=b.center[0]-detailOrigin.x,dz=b.center[1]-detailOrigin.z;if(dx*dx+dz*dz>2300*2300)continue;const r=b.r[0],xs=r.map(p=>p[0]),zs=r.map(p=>p[1]);shadowItems.push({x:b.center[0]+2,z:b.center[1]+2,sx:Math.max(5,Math.max(...xs)-Math.min(...xs))*.62,sz:Math.max(5,Math.max(...zs)-Math.min(...zs))*.62})}
const shadowMat=new T.MeshBasicMaterial({color:'#06191b',transparent:true,opacity:.13,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
const contactShadows=new T.InstancedMesh(new T.CircleGeometry(1,20),shadowMat,shadowItems.length);shadowItems.forEach((p,i)=>{tmp.position.set(p.x,1.43,p.z);tmp.rotation.set(-Math.PI/2,0,0);tmp.scale.set(p.sx,p.sz,1);tmp.updateMatrix();contactShadows.setMatrixAt(i,tmp.matrix)});contactShadows.renderOrder=3;scene.add(contactShadows);
const visualPanel=document.createElement('details');visualPanel.id='visualPanel';visualPanel.innerHTML='<summary>ĐỒ HỌA NÂNG CAO</summary><div id="visualControls"></div><small>HDRI và các lớp chi tiết là môi trường tổng hợp, không phải dữ liệu khảo sát.</small>';experience.append(visualPanel);
window.addVisualControl=button=>$('#visualControls').append(button);
if($('#facadeDetail'))addVisualControl($('#facadeDetail'));
const shadowToggle=document.createElement('button');shadowToggle.id='contactShadow';shadowToggle.setAttribute('aria-pressed','true');shadowToggle.innerHTML='◍ <span>Bóng tiếp xúc · gần đúng</span>';addVisualControl(shadowToggle);shadowToggle.onclick=()=>{contactShadows.visible=!contactShadows.visible;shadowToggle.setAttribute('aria-pressed',contactShadows.visible)};
