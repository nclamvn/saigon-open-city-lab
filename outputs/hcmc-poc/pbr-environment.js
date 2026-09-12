/* CC0 HDRI used for image-based lighting only; it is not presented as HCMC imagery. */
'use strict';
const fallbackEnvironment=scene.environment;
let hdriEnvironment=null,hdriEnabled=true;
const hdriButton=document.createElement('button');
hdriButton.id='hdriEnvironment';
hdriButton.setAttribute('aria-pressed','true');
hdriButton.innerHTML='◒ <span>Ánh sáng HDRI · đang tải</span>';
addVisualControl(hdriButton);
new T.RGBELoader().setDataType(T.UnsignedByteType).load('data/venice_sunset_1k.hdr',texture=>{
 texture.mapping=T.EquirectangularReflectionMapping;
 hdriEnvironment=pmrem.fromEquirectangular(texture).texture;
 texture.dispose();
 if(hdriEnabled)scene.environment=hdriEnvironment;
 hdriButton.querySelector('span').textContent='Ánh sáng HDRI · CC0';
 window.hdriStatus={loaded:true,enabled:hdriEnabled,asset:'Poly Haven / Venice Sunset 1K HDR'};
},undefined,()=>{
 hdriButton.querySelector('span').textContent='HDRI lỗi tải · dùng môi trường gốc';
 hdriButton.setAttribute('aria-pressed','false');
 hdriEnabled=false;
 window.hdriStatus={loaded:false,enabled:false};
});
hdriButton.onclick=()=>{
 hdriEnabled=!hdriEnabled;
 scene.environment=hdriEnabled&&hdriEnvironment?hdriEnvironment:fallbackEnvironment;
 hdriButton.setAttribute('aria-pressed',hdriEnabled);
 if(window.hdriStatus)window.hdriStatus.enabled=hdriEnabled;
};
