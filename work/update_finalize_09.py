from pathlib import Path

p = Path("work/finalize.py")
s = p.read_text()
s = s.replace("'version':'PoC 08',", "'version':'PoC 09','poc09_checks':['1,024 x 512 procedural atlas with 4 x 2 grid and 8 material families','materialClass assigned across all 70,719 merged-building records','Facade and roof atlas sampling integrated in the building shader','Exposure, white balance and atlas-strength controls verified','0 calibrated images, 0 measured charts and deltaE2000 null explicitly exposed','Texture atlas validator PASS','View 15 and WebGL capture visually reviewed'],")
s = s.replace("'browser':'PoC 08 multi-file and standalone builds visually checked in the in-app browser.'", "'browser':'PoC 09 multi-file and standalone builds visually checked in the in-app browser.'")
s = s.replace("'semantic city colour A/B toggle','day/golden/twilight light'", "'semantic city colour A/B toggle','texture atlas A/B toggle and calibration sliders','day/golden/twilight light'")
s = s.replace("'footbridge','materials','overview'", "'footbridge','materials','atlas','overview'")
p.write_text(s)
