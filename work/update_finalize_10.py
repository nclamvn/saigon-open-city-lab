from pathlib import Path

p=Path('work/finalize.py'); s=p.read_text()
s=s.replace("'version':'PoC 09',", "'version':'PoC 10','poc10_checks':['600 deterministic rooftop assets linked to building IDs','240 generic non-branded sign bands attached to footprint edges','24 shader haze volumes','Facade frame and slab depth applied to 70,719 buildings','Nine target draw calls through instancing and point rendering','Density control and A/B toggle verified','Urban detail validator PASS','View 16 and WebGL capture visually reviewed'],")
s=s.replace("'browser':'PoC 09 multi-file and standalone builds visually checked in the in-app browser.'", "'browser':'PoC 10 multi-file and standalone builds visually checked in the in-app browser.'")
s=s.replace("'texture atlas A/B toggle and calibration sliders','day/golden/twilight light'", "'texture atlas A/B toggle and calibration sliders','urban detail density and A/B toggle','day/golden/twilight light'")
s=s.replace("'materials','atlas','overview'", "'materials','atlas','detail','overview'")
p.write_text(s)
