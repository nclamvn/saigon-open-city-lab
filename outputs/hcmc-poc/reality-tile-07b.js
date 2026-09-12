/* PoC 07B: load one deterministic procedural GLB and hot-swap its proxy tile. */
'use strict';
const RT_ID='rp-r2c3',rtTile=RP.tiles.find(t=>t.id===RT_ID),rtBounds=rtTile.localBounds;
const rtCenter=new T.Vector3((rtBounds[0]+rtBounds[2])/2,42,(rtBounds[1]+rtBounds[3])/2),rtGroup=new T.Group();scene.add(rtGroup);
let rtLoaded=false,rtEnabled=true,rtActive=false,rtMesh=null,rtError=null;
sharedBuildingUniforms.realityBox.value.set(rtBounds[0],rtBounds[2],rtBounds[3],rtBounds[1]);

function rtDecodeBase64(s){const raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out.buffer}
function rtParseGlb(buffer){
 const dv=new DataView(buffer);if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw new Error('GLB 2.0 không hợp lệ');
 let off=12,json=null,bin=null;while(off<dv.byteLength){const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true),bytes=new Uint8Array(buffer,off+8,len);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(bytes).trim());else if(type===0x004e4942)bin=bytes;off+=8+len}
 if(!json||!bin)throw new Error('GLB thiếu JSON hoặc BIN');
 const primitive=json.meshes[0].primitives[0],geometry=new T.BufferGeometry();
 const itemSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 for(const [semantic,ai] of Object.entries(primitive.attributes)){const a=json.accessors[ai],v=json.bufferViews[a.bufferView],start=bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),arr=new Float32Array(bin.buffer,start,a.count*itemSize[a.type]),name={POSITION:'position',NORMAL:'normal',COLOR_0:'color',TEXCOORD_0:'uv'}[semantic];geometry.setAttribute(name,new T.BufferAttribute(arr,itemSize[a.type]))}
 geometry.computeBoundingSphere();const material=new T.MeshStandardMaterial({vertexColors:true,metalness:.12,roughness:.42,side:T.DoubleSide,envMapIntensity:1.15});
 material.color.set('#789195');material.roughness=.36;material.metalness=.22;
 const mesh=new T.Mesh(geometry,material),tr=json.nodes[0].translation||[0,0,0];mesh.position.fromArray(tr);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=RT_ID+' procedural LOD2';return mesh
}
async function rtLoad(){
 try{let buffer;if(window.REALITY_TILE_07B_BASE64)buffer=rtDecodeBase64(window.REALITY_TILE_07B_BASE64);else{const response=await fetch('tiles/'+RT_ID+'/lod2.glb');if(!response.ok)throw new Error('HTTP '+response.status);buffer=await response.arrayBuffer()}rtMesh=rtParseGlb(buffer);rtGroup.add(rtMesh);rtLoaded=true;rtHud.classList.add('loaded');rtHud.querySelector('.rt-state').textContent='GLB đã nạp · 193 công trình';rtToggle.querySelector('span').textContent='Reality Tile 07B · LOD2'}catch(e){rtError=String(e);rtHud.classList.add('failed');rtHud.querySelector('.rt-state').textContent='Không nạp được GLB';rtToggle.querySelector('span').textContent='Reality Tile 07B · lỗi'}
}

const rtOutlinePts=[],rtCorners=[[rtBounds[0],rtBounds[3]],[rtBounds[2],rtBounds[3]],[rtBounds[2],rtBounds[1]],[rtBounds[0],rtBounds[1]]];for(let i=0;i<4;i++){const a=rtCorners[i],b=rtCorners[(i+1)%4];rtOutlinePts.push(a[0],3,a[1],b[0],3,b[1])}const rtOutlineGeo=new T.BufferGeometry();rtOutlineGeo.setAttribute('position',new T.Float32BufferAttribute(rtOutlinePts,3));const rtOutline=new T.LineSegments(rtOutlineGeo,new T.LineBasicMaterial({color:'#f1bd72',transparent:true,opacity:.95}));rtOutline.renderOrder=8;scene.add(rtOutline);

const rtHud=document.createElement('aside');rtHud.id='tileHud';rtHud.innerHTML='<small>POC 07B / HOT-SWAP TILE</small><h3>rp-r2c3 · Bitexco</h3><p class="rt-state">Đang nạp GLB 2,3 MB…</p><div><b>193</b> công trình · <b>16.735</b> tam giác</div><p><strong>Procedural/open-data LOD2</strong><br>Không phải reality mesh khảo sát</p><button type="button" class="rt-compare">A/B: đang xem LOD2</button>';$('#viewport').append(rtHud);
const rtToggle=document.createElement('button');rtToggle.id='realityTile';rtToggle.setAttribute('aria-pressed','true');rtToggle.innerHTML='◫ <span>Reality Tile 07B · đang nạp</span>';addVisualControl(rtToggle);
function rtSet(on){rtEnabled=on;rtToggle.setAttribute('aria-pressed',on);rtHud.querySelector('.rt-compare').textContent=on?'A/B: đang xem LOD2':'A/B: đang xem proxy'}
rtToggle.onclick=()=>rtSet(!rtEnabled);rtHud.querySelector('.rt-compare').onclick=()=>rtSet(!rtEnabled);
presets.realitytile={target:xyz(106.70435,10.7716,104),distance:520,az:1.03,polar:1.13,label:'REALITY TILE 07B · PROCEDURAL LOD2'};const rtView=document.createElement('button');rtView.dataset.view='realitytile';rtView.innerHTML='<small>10</small> Reality Tile 07B';$('.views').append(rtView);rtView.onclick=()=>{stopCinema();follow=false;view('realitytile');document.body.classList.add('hero-view');rtSet(true);rpHud.hidden=true;rtHud.hidden=false};
window.advanceRealityTile=()=>{const cameraDistance=camera.position.distanceTo(rtCenter),active=rtLoaded&&rtEnabled&&cameraDistance<1800&&window.currentView==='realitytile';rtOutline.visible=window.currentView==='realitytile';rtGroup.visible=active;sharedBuildingUniforms.realityOn.value=active?1:0;rtActive=active;rtHud.hidden=window.currentView!=='realitytile';window.realityTileStatus={tileId:RT_ID,loaded:rtLoaded,enabled:rtEnabled,active:rtActive,classification:'procedural_open_data_lod2',surveyedRealityMesh:false,buildings:193,triangles:16735,bytes:2411224,cameraDistanceM:Math.round(cameraDistance),error:rtError}};
window.realityTileStatus={tileId:RT_ID,loaded:false,enabled:true,active:false,classification:'procedural_open_data_lod2',surveyedRealityMesh:false,buildings:193,triangles:16735,bytes:2411224,error:null};
rtLoad();
