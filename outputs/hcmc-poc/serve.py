#!/usr/bin/env python3
"""Local preview; capture endpoint accepts only PNGs and bounded filenames."""
import http.server,pathlib,json,base64,re,functools
ROOT=pathlib.Path(__file__).resolve().parent.parent
class Handler(http.server.SimpleHTTPRequestHandler):
 def do_POST(self):
  m=re.fullmatch(r'/capture/(poc-[a-z-]+)',self.path)
  size=int(self.headers.get('Content-Length','0'))
  if not m or not 0<size<20_000_000:self.send_error(400);return
  try:
   data=json.loads(self.rfile.read(size));raw=base64.b64decode(data['image'].split(',',1)[1]);assert raw[:8]==b'\x89PNG\r\n\x1a\n'
   (ROOT/(m[1]+'.png')).write_bytes(raw);(ROOT/(m[1]+'.metrics.json')).write_text(json.dumps(data.get('metrics',{}),indent=2))
   self.send_response(200);self.end_headers();self.wfile.write(b'OK')
  except Exception:self.send_error(400)
if __name__=='__main__':
 print('Open http://127.0.0.1:8768/hcmc-poc/',flush=True)
 http.server.ThreadingHTTPServer(('127.0.0.1',8768),functools.partial(Handler,directory=str(ROOT))).serve_forever()
