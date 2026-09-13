/* Source-photo surfaces own their covered pixels. Clip only conflicting illustrative trim. */
(() => {
  'use strict';
  const entries=window.FACADES_15.manifest.entries;
  const patches=entries.filter(e=>e.surface_fit?.eligible===true&&e.render_mode!=='sampled_envelope');
  const byBuilding=new Map(patches.map((e,i)=>[e.building_id,i]));
  const cuts=[];
  for(let index=0;index<patches.length;index++){
    const e=patches[index],range=e.horizontal||[0,1];
    for(const strip of e.strips){
      const lo=Math.max(range[0],strip.u0),hi=Math.min(range[1],strip.u1);if(hi<=lo)continue;
      const blend=u=>{const t=(u-strip.u0)/(strip.u1-strip.u0);return [strip.a[0]+(strip.b[0]-strip.a[0])*t,strip.a[1]+(strip.b[1]-strip.a[1])*t];};
      const a=blend(lo),b=blend(hi),length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const f0=(lo-range[0])/(range[1]-range[0]),f1=(hi-range[0])/(range[1]-range[0]);
      cuts.push({key:e.key,index,origin:a,tangent:[(b[0]-a[0])/length,(b[1]-a[1])/length],normal:strip.normal,length,y0:1.5+e.height_m*e.vertical[0],y1:1.5+e.height_m*e.vertical[1],u0:e.reverse_u?1-f0:f0,u1:e.reverse_u?1-f1:f1,rect:e.atlas_rect});
    }
  }
  const enabled={value:0},mask={value:null},wholeEnabled={value:0},wholeSlot={value:-1};
  window.photoDecorationClipping16c={wholeEnabled,wholeSlot,byBuilding};
  const uniforms={uWholeEnvelope16d:wholeEnabled,uWholeSlot16d:wholeSlot,uPhotoCutEnabled16c:enabled,uPhotoCutMask16c:mask,
    uPhotoCutA16c:{value:cuts.map(c=>new T.Vector4(...c.origin,...c.tangent))},
    uPhotoCutB16c:{value:cuts.map(c=>new T.Vector4(c.length,c.y0,c.y1,c.index))},
    uPhotoCutC16c:{value:cuts.map(c=>new T.Vector4(...c.normal,c.u0,c.u1))},
    uPhotoCutAtlas16c:{value:cuts.map(c=>new T.Vector4(...c.rect))}};
  const fragment=`
uniform float uPhotoCutEnabled16c,uWholeEnvelope16d,uWholeSlot16d;
uniform sampler2D uPhotoCutMask16c;
uniform vec4 uPhotoCutA16c[${cuts.length}],uPhotoCutB16c[${cuts.length}],uPhotoCutC16c[${cuts.length}],uPhotoCutAtlas16c[${cuts.length}];
varying vec3 vPhotoWorld16c;varying float vPhotoSlot16c;
void rejectPhotoDecoration16c(){
  if(uWholeEnvelope16d>.5&&abs(vPhotoSlot16c-uWholeSlot16d)<.1)discard;
  if(uPhotoCutEnabled16c<.5||vPhotoSlot16c<-.5)return;
  for(int i=0;i<${cuts.length};i++){
    vec4 a=uPhotoCutA16c[i],b=uPhotoCutB16c[i],c=uPhotoCutC16c[i];
    if(abs(vPhotoSlot16c-b.w)>.1)continue;
    vec2 relative=vPhotoWorld16c.xz-a.xy;float along=dot(relative,a.zw),depth=dot(relative,c.xy);
    if(along<0.||along>b.x||abs(depth)>1.5||vPhotoWorld16c.y<b.y||vPhotoWorld16c.y>b.z)continue;
    vec2 uv=vec2(mix(c.z,c.w,along/b.x),(vPhotoWorld16c.y-b.y)/(b.z-b.y));
    vec4 atlas=uPhotoCutAtlas16c[i];
    if(texture2D(uPhotoCutMask16c,atlas.xy+uv*atlas.zw).g>=.45)discard;
  }
}
`;
  function install(material){
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=shader=>{previous(shader);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='attribute float photoSlot16c;varying vec3 vPhotoWorld16c;varying float vPhotoSlot16c;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPhotoWorld16c=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;vPhotoSlot16c=photoSlot16c;');
      shader.fragmentShader=fragment+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nrejectPhotoDecoration16c();');
    };
    material.customProgramCacheKey=()=>previousKey()+'|photo-surface-owner-16c-'+cuts.length;material.needsUpdate=true;
  }
  const layers=[];
  for(const layer of window.facadeDecorationLayers16c||[]){
    const slots=new Float32Array(layer.items.length);slots.fill(-1);const perBuilding={};
    layer.items.forEach((item,i)=>{const slot=byBuilding.get(item.building_id);if(slot===undefined)return;slots[i]=slot;const key=patches[slot].key;perBuilding[key]=(perBuilding[key]||0)+1;});
    layer.mesh.geometry.setAttribute('photoSlot16c',new T.InstancedBufferAttribute(slots,1));install(layer.mesh.material);
    if(layer.mesh.castShadow){const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});install(depth);layer.mesh.customDepthMaterial=depth;}
    layers.push({name:layer.name,taggedInstances:slots.reduce((n,s)=>n+(s>=0),0),perBuilding});
  }
  const output=document.createElement('output');output.id='photoOcclusion16cStatus';output.hidden=true;document.body.append(output);
  const previousAdvance=window.advanceFacades15;
  window.advanceFacades15=(...args)=>{previousAdvance(...args);const resources=window.photoFacadeResources15,status=window.facade15Status;const active=!!(status?.ready&&resources?.group.visible&&resources.material.alphaMap);
    enabled.value=active?1:0;mask.value=resources?.material.alphaMap||null;
    const report={version:'16c',active,patches:patches.length,cuts:cuts.length,selected:status?.selected,layers,depthTestPreserved:true,offsetM:.16,maskPreserved:true,mode:'clip_decorative_fragments_only_inside_source_photo_coverage'};
    const json=JSON.stringify(report);if(output.dataset.json!==json)output.dataset.json=json;window.photoOcclusion16cStatus=report;
  };
})();
