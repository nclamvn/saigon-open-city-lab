from pathlib import Path
r=Path('outputs/hcmc-poc')
p=r/'app.js';s=p.read_text().replace("if(tour&&!down&&!desired)az+=dt*.065;","if(tour&&!down&&!desired)az+=dt*.065;if(window.advanceExperience)window.advanceExperience(dt,now);")
s=s.replace("let glassMix=vSurface>1.5?.75:.43;", "let glassMix=vSurface>1.5?.75:.43;") # GLSL untouched
s=s.replace("float glassMix=vSurface>1.5?.75:.43;", "float glassMix=vSurface>1.5?.66:.43;")
s=s.replace("diffuseColor.rgb=mix(diffuseColor.rgb,vAudit,uAudit*.92);", "diffuseColor.rgb=mix(diffuseColor.rgb,vAudit,uAudit*.92);")
# Glass roughness follows procedural window mask, which is already defined above.
s=s.replace("s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>'", "s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\\nroughnessFactor=mix(roughnessFactor,.19,windowMask*step(1.5,vSurface)*(1.-uAudit));');s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>'")
p.write_text(s)
p=r/'index.html';s=p.read_text().replace('POC 01','POC 02').replace('<script src="app.js"></script>','<script src="app.js"></script><script src="experience.js"></script>');p.write_text(s)
