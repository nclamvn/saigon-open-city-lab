from pathlib import Path
p=Path('work/finalize.py'); s=p.read_text()
s=s.replace("'version':'PoC 10',", "'version':'PoC 11','poc11_checks':['70,719 building confidence scores derived from declared source signals','8 x 8 grid with 64 stable acquisition cells','12-cell acquisition queue sorted deterministically','Median building confidence 33/100 and top priority cf-r5c3 at 68.8','0 new images, 0 surveyed reality tiles and 0 percent surveyed coverage explicit','UAV, ground corridor and hybrid recommendations remain planning-only','Confidence map validator PASS','View 17 and WebGL capture visually reviewed'],")
s=s.replace("'browser':'PoC 10 multi-file and standalone builds visually checked in the in-app browser.'", "'browser':'PoC 11 multi-file and standalone builds visually checked in the in-app browser.'")
s=s.replace("'urban detail density and A/B toggle','day/golden/twilight light'", "'urban detail density and A/B toggle','confidence map overlay and priority-count slider','day/golden/twilight light'")
s=s.replace("'atlas','detail','overview'", "'atlas','detail','confidence','overview'")
p.write_text(s)
