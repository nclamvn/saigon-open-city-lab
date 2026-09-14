"""Run from repo root: python3 outputs/hcmc-poc/scripts/test_server_18.py."""
import functools,hashlib,http.client,http.server,importlib.util,pathlib,tempfile,threading,unittest
spec=importlib.util.spec_from_file_location('preview',pathlib.Path(__file__).parents[1]/'serve.py')
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
class Ranges(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();cls.data=bytes(range(256))*1000
  pathlib.Path(cls.tmp.name,'fixture.tif').write_bytes(cls.data)
  cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(preview.Handler,directory=cls.tmp.name))
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def request(self,method='GET',headers=None):
  conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port);conn.request(method,'/fixture.tif',headers=headers or {});r=conn.getresponse();out=(r.status,dict(r.getheaders()),r.read());conn.close();return out
 def test_full_and_etag(self):
  code,h,b=self.request();self.assertEqual(code,200);self.assertEqual(b,self.data);self.assertEqual(h['ETag'],'"'+hashlib.sha256(b).hexdigest()+'"');self.assertEqual(h['Accept-Ranges'],'bytes')
 def test_range(self):
  code,h,b=self.request(headers={'Range':'bytes=17-101'});self.assertEqual(code,206);self.assertEqual(b,self.data[17:102]);self.assertEqual(h['Content-Range'],'bytes 17-101/256000');self.assertEqual(int(h['Content-Length']),85)
 def test_suffix(self):self.assertEqual(self.request(headers={'Range':'bytes=-7'})[2],self.data[-7:])
 def test_open_end(self):self.assertEqual(self.request(headers={'Range':'bytes=255997-'})[2],self.data[-3:])
 def test_head(self):
  code,h,b=self.request('HEAD',{'Range':'bytes=2-8'});self.assertEqual((code,h['Content-Length'],b),(206,'7',b''))
 def test_invalid(self):
  for value in ['bytes=256000-','bytes=20-10','bytes=-0','bytes=-','bytes=0-2,8-9','nonsense','bytes='+('9'*5000)+'-']:
   with self.subTest(value=value):
    code,h,b=self.request(headers={'Range':value});self.assertEqual(code,416);self.assertEqual(h['Content-Range'],'bytes */256000');self.assertEqual(b,b'')
 def test_if_range_mismatch(self):self.assertEqual(self.request(headers={'Range':'bytes=0-9','If-Range':'"wrong"'})[0],200)
 def test_not_modified(self):
  etag=self.request()[1]['ETag'];self.assertEqual(self.request(headers={'If-None-Match':etag})[0],304)
if __name__=='__main__':unittest.main()
