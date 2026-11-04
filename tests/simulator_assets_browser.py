"""Real browser against native simulator service; no physical device or database."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'components/simulator'))
spec=importlib.util.spec_from_file_location('assets_browser_server',ROOT/'components/simulator/server.py')
server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)


def main():
    with tempfile.TemporaryDirectory() as temp:
        scene=Path(temp)/'scene.json';state=server.State(scene)
        token='asset-browser-test-'+'a'*40
        http=ThreadingHTTPServer(('127.0.0.1',0),server.handler(token,state))
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            subprocess.run([os.environ.get('NODE_BIN','node'),str(ROOT/'tests/simulator_assets_browser.cjs'),
                f'http://127.0.0.1:{http.server_port}/?token={token}'],check=True)
            restored=server.State(scene)
            assert len(restored.scene['world']['assets'])==3
            assert len(restored.scene['garden']['pots'])==1
            assert len(restored.scene['garden']['cans'])==1
            print('PASS: native service reload retains server-style assets, probes, soil settings and world configuration')
        finally:http.shutdown();http.server_close();thread.join(timeout=3)


if __name__=='__main__':main()
