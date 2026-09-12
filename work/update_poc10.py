from pathlib import Path

p=Path('outputs/hcmc-poc/index.html'); s=p.read_text()
s=s.replace('POC 09 / COLOR CALIBRATION + ATLAS','POC 10 / URBAN DETAIL + PERCEPTUAL REALISM')
s=s.replace('mười lăm góc nhìn','mười sáu góc nhìn')
s=s.replace('09: hiệu chỉnh màu &amp; texture atlas ↗</a>','09: hiệu chỉnh màu &amp; texture atlas ↗</a> · <a href="../POC-10-URBAN-DETAIL.md" target="_blank">10: chi tiết đô thị cảm nhận ↗</a>')
s=s.replace('PoC 09 phủ atlas thủ tục lên 70.719 công trình nhưng chưa dùng ảnh chụp hiệu chuẩn: số ảnh và bảng màu đều bằng 0, vì vậy ΔE2000 chưa có. Atlas hiện tại là lớp minh họa có khai báo; giao diện hiệu chỉnh EV, Kelvin và cường độ giúp thử quy trình trước đợt thu dữ liệu thực địa.','PoC 10 bổ sung 600 thiết bị mái, 240 dải hiệu không thương hiệu, 24 khối sương và chiều sâu khung cửa cho toàn cảnh. Mọi chi tiết mới đều là minh họa thủ tục gắn với footprint hiện có; chúng không khẳng định hiện trạng từng công trình.')
s=s.replace('<script src="data/texture-atlas-09.js"></script>','<script src="data/texture-atlas-09.js"></script><script src="data/urban-detail-10.js"></script>')
s=s.replace('<script src="texture-atlas-09.js?v=9a"></script>','<script src="texture-atlas-09.js?v=10a"></script><script src="urban-detail-10.js?v=10a"></script>')
s=s.replace('?v=9a','?v=10a')
p.write_text(s)

p=Path('outputs/hcmc-poc/app.js'); s=p.read_text()
s=s.replace('if(window.advanceTextureAtlas)window.advanceTextureAtlas(dt,now);','if(window.advanceTextureAtlas)window.advanceTextureAtlas(dt,now);if(window.advanceUrbanDetail)window.advanceUrbanDetail(dt,now);')
s=s.replace('textureAtlas:window.textureAtlasStatus};','textureAtlas:window.textureAtlasStatus,urbanDetail:window.urbanDetailStatus};')
s=s.replace('PoC 09 · procedural texture atlas / 0 calibrated images','PoC 10 · procedural urban detail / not surveyed')
s=s.replace("const name='poc-nine-'", "const name='poc-ten-'")
p.write_text(s)

for name in ['ground-capture-07c.js','reality-tile-07b.js']:
 p=Path('outputs/hcmc-poc')/name; s=p.read_text(); s=s.replace("'materials','atlas'", "'materials','atlas','detail'"); p.write_text(s)
