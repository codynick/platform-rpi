"""Run real Blockly-generated native Python over the production simulator transport."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import types
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@unittest.skipUnless(shutil.which('node'), 'Node is required for actual Blockly generation')
class BlockRoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.directory = Path(cls.temp.name)
        generated = cls.directory / 'generated.json'
        subprocess.run(['node', str(ROOT / 'tests/block_generator.cjs'), str(generated)], check=True)
        cls.programs = json.loads(generated.read_text())
        with patch.object(sys, 'path', [str(ROOT/'components/simulator'), str(ROOT/'components/client'), *sys.path]):
            cls.sim = load('block_routing_simulator', 'components/simulator/server.py')
            cls.sprite = load('block_routing_stage', 'components/sprite-stage/server.py')
            cls.bridge = load('block_routing_bridge', 'components/client/SpriteStage.py')
            serial = types.ModuleType('serial')
            tools = types.ModuleType('serial.tools')
            ports = types.ModuleType('serial.tools.list_ports')
            ports.comports = lambda: (_ for _ in ()).throw(AssertionError('Unexpected physical port discovery'))
            serial.tools = tools; tools.list_ports = ports
            with patch.dict(sys.modules, {'keyboard': types.ModuleType('keyboard'), 'serial': serial,
                 'serial.tools': tools, 'serial.tools.list_ports': ports, 'requests': types.ModuleType('requests')}):
                cls.api = load('block_routing_api', 'components/client/CodyNick.py')
        cls.api.LOG_FILE = str(cls.directory/'native.log')
        cls.token = 'block-spaces-test-token-' + 'a'*32
        cls.token_file = cls.directory/'token';cls.token_file.write_text(cls.token)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.state = self.sim.State()
        self.state.scene = {'gadgets': {'cjp': {'x': 40, 'y': 40}, 'temperature': {'x': 400, 'y': 40}}, 'temperature': 21.1}
        self.commands=[]
        original=self.state.command
        def record(data):
            result=original(data);self.commands.append(dict(data));return result
        self.state.command=record
        self.stage=self.sprite.Stage()
        self.servers=[ThreadingHTTPServer(('127.0.0.1',0),self.sim.handler(self.token,self.state)),
                      ThreadingHTTPServer(('127.0.0.1',0),self.sprite.handler(self.stage))]
        self.threads=[]
        for server in self.servers:
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();self.threads.append(thread)
        self.addCleanup(self.stop_servers)
        self.hardware=[]
        test=self
        class Hardware:
            def __init__(self):
                self.ser=self;self.buffer=b'';self.packets=[];self.closed=False;test.hardware.append(self)
            def ensure_connected(self):return True
            def reset_input_buffer(self):self.buffer=b''
            def write(self,data):
                self.packets.append(data.decode())
                if data.startswith(b'CN@@TEMP@@'):self.buffer=b'CN@@TEMP@@31.0______'
                return len(data)
            def flush(self):pass
            def read(self,size):
                value,self.buffer=self.buffer[:size],self.buffer[size:];return value
            def send_line(self,data,**kwargs):self.packets.append(data)
            def record_io_success(self):pass
            def record_io_failure(self):raise AssertionError('Physical protocol fixture failed')
            def close(self):self.closed=True
        self.Hardware=Hardware

    def stop_servers(self):
        for server in self.servers:server.shutdown();server.server_close()
        for thread in self.threads:thread.join(timeout=3)

    def execute(self,name,source=None):
        original_urlopen=urllib.request.urlopen
        def urlopen(request,*args,**kwargs):
            old='http://127.0.0.1:8092';new=f'http://127.0.0.1:{self.servers[1].server_port}'
            if isinstance(request,str):request=request.replace(old,new)
            else:request.full_url=request.full_url.replace(old,new)
            return original_urlopen(request,*args,**kwargs)
        original_sleep=time.sleep
        def sleep(seconds):
            if seconds >= .05:raise KeyboardInterrupt()
            original_sleep(seconds)
        with patch.dict(os.environ,{'CODYNICK_SIM_URL':f'http://127.0.0.1:{self.servers[0].server_port}',
                                    'CODYNICK_SIM_TOKEN_FILE':str(self.token_file)}), \
             patch.dict(sys.modules,{'CodyNick':self.api,'SpriteStage':self.bridge}), \
             patch.object(self.api,'CN',self.Hardware), patch('urllib.request.urlopen',side_effect=urlopen), \
             patch('time.sleep',side_effect=sleep):
            with self.assertRaises(KeyboardInterrupt):
                exec(compile(source or self.programs[name],name+'.py','exec'),{})

    def test_simulation_only_uses_no_physical_connection_and_closes_its_session(self):
        self.execute('simulation-temperature')
        self.assertEqual(self.hardware,[])
        self.assertTrue(any(c.get('action')=='led' and c['color']=='#00FF00' for c in self.commands))
        self.assertIsNone(self.state.session)

    def test_mixed_program_crosses_real_and_simulated_inputs_and_outputs(self):
        self.execute('mixed-worlds')
        self.assertEqual(len(self.hardware),1)
        self.assertTrue(any(p.startswith('CN@@TEMP@@') for p in self.hardware[0].packets))
        self.assertTrue(any(p.startswith('CN@@RGB@@00#00FF00') for p in self.hardware[0].packets))
        self.assertTrue(any(c.get('action')=='led' and c['color']=='#FF0000' for c in self.commands))
        self.assertTrue(self.hardware[0].closed)
        self.assertIsNone(self.state.session)

    def test_simulated_joystick_drives_native_sprite_service(self):
        self.state.command({'action':'input','states':['RIGHT']})
        self.execute('simulation-sprite')
        self.assertEqual(self.stage.snapshot()['x'],5)
        self.assertEqual(self.hardware,[])

    def test_legacy_and_general_programs_keep_their_connection_behavior(self):
        self.execute('legacy')
        self.assertEqual(len(self.hardware),1)
        self.assertTrue(self.hardware[0].closed)
        self.assertFalse(any(c.get('action')=='open' for c in self.commands))
        self.hardware.clear();self.execute('general');self.assertEqual(self.hardware,[])


if __name__=='__main__':unittest.main()
