/* Observed sign/front pixels + explicitly inferred blue-glass finish; no repeated logo. */
(() => {
  'use strict';
  const data=window.TIMES_FACADE_16D;if(!data)return;
  const entry=window.FACADES_15.manifest.entries.find(e=>e.key==='times');
  const resources=window.photoFacadeResources15,mesh=resources.group.children.find(m=>m.name==='Facade15_times');
  const bi=D.buildings.findIndex(b=>b.id===data.manifest.building_id),start=bi?faceEnds[bi-1]*3:0,end=faceEnds[bi]*3;
  const marker=new Float32Array(bg.attributes.position.count);marker.fill(1,start,end);bg.setAttribute('times16d',new T.BufferAttribute(marker,1));
  const enabled={value:0},rgb=data.manifest.glass_srgb,glass={value:new T.Color(`rgb(${rgb.join(',')})`)},frame={value:new T.Color('#608295')};
  const previous=buildingMat.onBeforeCompile,previousKey=buildingMat.customProgramCacheKey.bind(buildingMat);
  buildingMat.onBeforeCompile=shader=>{
    previous(shader);shader.uniforms.uTimes16d=enabled;shader.uniforms.uTimesGlass16d=glass;shader.uniforms.uTimesFrame16d=frame;
    shader.vertexShader='attribute float times16d;varying float vTimes16d;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTimes16d=times16d;');
    shader.fragmentShader='uniform float uTimes16d;uniform vec3 uTimesGlass16d,uTimesFrame16d;varying float vTimes16d;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
if(uTimes16d>.5&&vTimes16d>.5&&vSurface>.5){
  vec2 cell=fract(vFacade/vec2(1.45,3.15));vec2 edge=min(cell,1.-cell)*vec2(1.45,3.15);
  float mullion=1.-smoothstep(.025,.06,min(edge.x,edge.y));
  diffuseColor.rgb=mix(uTimesGlass16d,uTimesFrame16d,mullion*.48);roughnessFactor=.38;
}`);
  };
  buildingMat.customProgramCacheKey=()=>previousKey()+'|times-source-finish-16d';buildingMat.needsUpdate=true;
  const state={ready:false,errors:[]};const loader=new T.TextureLoader();let wrapper=null;
  const load=(url,color)=>new Promise((resolve,reject)=>loader.load(url,texture=>{texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(texture);},undefined,reject));
  Promise.all([load(data.color,true),load(data.mask,false),load(data.extension,true),load(data.glass,true)]).then(([photo,mask,extension,glassTexture])=>{
    const positions=[],uvs=[],classes=[],b=D.buildings[bi];let faces=0;
    for(let ri=0;ri<b.r.length;ri++){const ring=b.r[ri],area=ring.reduce((s,p,i)=>s+p[0]*ring[(i+1)%ring.length][1]-ring[(i+1)%ring.length][0]*p[1],0);
      for(let i=0;i<ring.length;i++){const a=ring[i],z=ring[(i+1)%ring.length],dx=z[0]-a[0],dz=z[1]-a[1],length=Math.hypot(dx,dz);if(length<.01)continue;const nx=(area>0?dz:-dz)/length,nz=(area>0?-dx:dx)/length,y0=b.min+1.5,y1=b.h+1.5;
        const points=[[a[0]+nx*.16,y0,a[1]+nz*.16],[z[0]+nx*.16,y0,z[1]+nz*.16],[a[0]+nx*.16,y1,a[1]+nz*.16],[z[0]+nx*.16,y1,z[1]+nz*.16]],tex=[[0,y0],[length,y0],[0,y1],[length,y1]];
        for(const j of [0,1,2,1,3,2]){positions.push(...points[j]);uvs.push(...tex[j]);classes.push(ri===0&&entry.edges.includes(i)?1:0);}faces++;
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('timesMainFace16d',new T.Float32BufferAttribute(classes,1));geometry.computeVertexNormals();
    const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.86,metalness:0,envMapIntensity:.25,side:T.DoubleSide,map:photo});
    const y0=1.5+entry.height_m*entry.vertical[0],y1=1.5+entry.height_m*entry.vertical[1],extensionHeight=(y1-y0)*512/1856;
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{uTimesPhoto16d:{value:photo},uTimesMask16d:{value:mask},uTimesExtension16d:{value:extension},uTimesGlassTexture16d:{value:glassTexture}});
      shader.vertexShader='attribute float timesMainFace16d;varying float vTimesMainFace16d;varying vec2 vTimesWallUV16d;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTimesMainFace16d=timesMainFace16d;vTimesWallUV16d=uv;');
      shader.fragmentShader='uniform sampler2D uTimesPhoto16d,uTimesMask16d,uTimesExtension16d,uTimesGlassTexture16d;varying float vTimesMainFace16d;varying vec2 vTimesWallUV16d;float timesMirror16d(float x){return 1.-abs(mod(x,2.)-1.); }\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
vec2 glassUV=vec2(timesMirror16d(vTimesWallUV16d.x/4.96),timesMirror16d(vTimesWallUV16d.y/20.72));
vec4 finish=texture2D(uTimesGlassTexture16d,glassUV);
if(vTimesMainFace16d>.5){float along=vTimesWallUV16d.x/${entry.width_m.toFixed(6)};if(along>=${entry.horizontal[0].toFixed(6)}&&along<=1.){
  float photoU=1.-(along-${entry.horizontal[0].toFixed(6)})/${(entry.horizontal[1]-entry.horizontal[0]).toFixed(6)};
  float photoV=(vTimesWallUV16d.y-${y0.toFixed(6)})/${(y1-y0).toFixed(6)};
  if(photoV<0.)finish=texture2D(uTimesExtension16d,vec2(photoU,timesMirror16d((vTimesWallUV16d.y-${y0.toFixed(6)})/${extensionHeight.toFixed(6)})));
  else if(photoV<=1.){vec2 observedUV=vec2(photoU,photoV);vec4 observed=texture2D(uTimesPhoto16d,observedUV);float coverage=step(.45,texture2D(uTimesMask16d,observedUV).g);finish=mix(finish,observed,coverage);}
}}
diffuseColor*=finish;
`);
    };
    material.customProgramCacheKey=()=> 'times-observed-and-inferred-continuous-wrap-16d';wrapper=new T.Mesh(geometry,material);wrapper.name='TimesContinuousCurtainWall16d';wrapper.receiveShadow=true;resources.group.add(wrapper);mesh.visible=false;state.wallFaces=faces;state.ready=true;
  }).catch(error=>state.errors.push(String(error?.message||'Times texture unavailable')));
  const output=document.createElement('output');output.id='timesFacade16dStatus';output.hidden=true;document.body.append(output);
  const oldAdvance=window.advanceFacades15;
  window.advanceFacades15=(...args)=>{
    oldAdvance(...args);const facade=window.facade15Status,active=!!(state.ready&&facade?.enabled&&facade.ready&&!audit);enabled.value=active?1:0;
    const clip=window.photoDecorationClipping16c;clip.wholeSlot.value=clip.byBuilding.get(entry.building_id);clip.wholeEnabled.value=active?1:0;
    const report={version:'16d',ready:state.ready,active,photoVisible:active&&resources.group.visible,selected:facade?.selected,textureDimensions:data.manifest.texture_dimensions,sourcePixelsOnly:true,inferredFinish:true,wholeDecorationSuppression:active,targetBuildingId:entry.building_id,geometryUnchanged:true,wallFaces:state.wallFaces,continuousMaterial:true,signFreeExtension:true,photoHorizontal:entry.horizontal,photoVertical:entry.vertical,maskedFraction:data.manifest.masked_fraction,errors:state.errors};
    const json=JSON.stringify(report);if(output.dataset.json!==json)output.dataset.json=json;window.timesFacade16dStatus=report;
  };
})();
