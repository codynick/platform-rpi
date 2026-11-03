"""Real PHP/MySQL/native-Python regression. Uses only a dedicated *_test database.

Requires PHP_BIN, MYSQL_TEST_PORT/USER/PASSWORD and mysql-connector-python.
Optional: NODE_BIN and PLAYWRIGHT_MODULE enable the Chrome browser regression.
"""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    database = os.environ.get('MYSQL_TEST_DATABASE', 'dashboard_upgrade_test')
    assert database.endswith('_test') and database.replace('_', '').isalnum()
    config = dict(host='127.0.0.1', port=int(os.environ.get('MYSQL_TEST_PORT', '3306')),
                  user=os.environ.get('MYSQL_TEST_USER', 'dashboard_test'),
                  password=os.environ.get('MYSQL_TEST_PASSWORD', 'dashboard-test-local'), database=database)
    spec = importlib.util.spec_from_file_location('Dashboard', ROOT/'components/client/Dashboard.py')
    dashboard = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dashboard)
    dashboard.configure(**config)
    dashboard.ensure_table()
    dashboard.clear()
    cards = [dashboard.Card(kind, kind.title(), value=value, auto_delete=False) for kind,value in [
        ('led', True), ('gauge', 42), ('textarea', 'Editable'), ('info', 'Hello'), ('button', False),
        ('switch', True), ('slider', 50), ('graph', [10,20,15]), ('bar', {'A':2,'B':3}),
        ('pie', {'A':2,'B':3}), ('table', {'Temperature':22})]]
    hold=dashboard.Card('button','Hold',value=False,button_mode='momentary',auto_delete=False)
    slider=dashboard.Card('slider','Stepped',min_value=-10,max_value=11,value=0,step=5,auto_delete=False)
    assert slider.sync() and slider.input_options['step']==5
    slider.set(5)
    with tempfile.TemporaryDirectory(prefix='codynick-dashboard-') as temp:
        base=Path(temp); shutil.copytree(ROOT/'components/ide/dashboard',base/'dashboard')
        shutil.copytree(ROOT/'components/ide/blocks',base/'blocks')
        (base/'dashboard/config.php').write_text('<?php\n'+ '\n'.join([
            '$db_host='+json.dumps('127.0.0.1;port='+str(config['port']))+';',
            '$db_name='+json.dumps(database)+';', '$db_user='+json.dumps(config['user'])+';',
            '$db_pass='+json.dumps(config['password'])+';', '$cards_table="iot_cards";',
            '$dashboard_title="Dashboard test";', '$dashboard_subtitle="Isolated test";',
            '$logo_path="/logo.png";', '$poll_interval_ms=200;']),encoding='utf-8')
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        php=os.environ.get('PHP_BIN','php')
        log=(base/'php.log').open('w')
        process=subprocess.Popen([php,'-S',f'127.0.0.1:{port}','-t',str(base)],stdout=log,stderr=log)
        origin=f'http://127.0.0.1:{port}'
        def call(action,data=None):
            body=json.dumps(data).encode() if data is not None else None
            request=urllib.request.Request(origin+'/dashboard/cards.php?action='+action,data=body,
                headers={'Content-Type':'application/json'} if body else {})
            with urllib.request.urlopen(request,timeout=10) as response:return json.load(response)
        try:
            for _ in range(80):
                try:state=call('state');break
                except (OSError,urllib.error.URLError):time.sleep(.1)
            else:raise RuntimeError((base/'php.log').read_text())
            assert state['ok'] and len(state['cards'])==13
            design_request=urllib.request.Request(origin+'/blocks/designs.php?action=save',
                data=json.dumps({'name':'Empty object roundtrip','workspace':{'blocks':{}}}).encode(),
                headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(design_request) as response:assert json.load(response)['ok']
            with urllib.request.urlopen(origin+'/blocks/designs.php?action=load&name=Empty%20object%20roundtrip') as response:
                assert json.load(response)['workspace']=={'blocks':{}},'Named designs must preserve empty object types'
            assert all(card['valid'] for card in state['cards']),state
            event=lambda seq,event,owner='test-owner-1':call('input',dict(id=hold.id,sequence=seq,event=event,owner=owner))
            event(1,'down');assert hold.pressed() and hold.clicked() and not hold.clicked()
            event(1,'down');assert not hold.clicked(),'Duplicate down must not add a tap'
            event(2,'renew');assert hold.pressed() and not hold.clicked()
            event(3,'up');assert not hold.pressed()
            for seq in (4,6,8):event(seq,'down');event(seq+1,'up')
            assert all(hold.clicked() for _ in range(3)) and not hold.clicked()
            event(10,'down');event(1,'down','test-owner-2');event(11,'up');assert hold.pressed()
            time.sleep(1.6);assert not hold.pressed(),'Abandoned hold must expire'
            event(12,'renew');assert not hold.pressed(),'Renew cannot resurrect a released hold'
            while hold.clicked():pass
            event(13,'down');assert hold.pressed()
            subprocess.run([php,'-r','require '+json.dumps(str(base/'dashboard/reset-inputs.php'))+'; dashboard_reset_inputs();'],check=True)
            assert not hold.pressed() and not hold.clicked(),'Editor Run/Stop reset must clear inputs'
            event(14,'renew');assert not hold.pressed(),'A stale heartbeat must not revive a reset hold'
            # Slider updates are clamped and snapped by the actual PHP endpoint.
            body=urllib.parse.urlencode({'id':slider.id,'value':999}).encode()
            with urllib.request.urlopen(origin+'/dashboard/cards.php?action=set',data=body) as response:assert json.load(response)['ok']
            slider.sync();assert float(slider.value)==10
            key=json.dumps(['gauge','Gauge',0],separators=(',',':'))
            layout={key:{'x':4,'y':2,'w':5,'h':3}}
            call('layout',{'layout':layout});assert call('state')['layout']==layout
            snapshot=call('export')['dashboard'];assert len(snapshot['cards'])==13
            assert next(c for c in snapshot['cards'] if c['title']=='Hold')['value']=='false'
            malformed=json.loads(json.dumps(snapshot));malformed['cards'][0]['type']='bad-type'
            try:call('restore',{'dashboard':malformed});raise AssertionError('Invalid restore accepted')
            except urllib.error.HTTPError as error:assert error.code==400
            assert len(call('state')['cards'])==13,'Rejected restore must leave cards intact'
            call('restore',{'dashboard':snapshot});assert call('state')['layout']==layout
            assert len(call('state')['cards'])==13
            # Test source bundling without running any saved program.
            from unittest.mock import patch
            real_urlopen=urllib.request.urlopen
            def local_urlopen(request,*args,**kwargs):
                if isinstance(request,str):request=request.replace('http://127.0.0.1/',origin+'/')
                else:request.full_url=request.full_url.replace('http://127.0.0.1/',origin+'/')
                return real_urlopen(request,*args,**kwargs)
            source=base/'program.py';source.write_text('print("saved source")\n')
            with patch('urllib.request.urlopen',side_effect=local_urlopen):
                dashboard.save_project(base/'project.json',program_path=source)
                assert dashboard.load_project(base/'project.json')==source.read_text()
            if os.environ.get('PLAYWRIGHT_MODULE'):
                call('layout',{'layout':{}})  # Exercise a fresh installation, not only existing positions.
                subprocess.run([os.environ.get('NODE_BIN','node'),str(ROOT/'tests/dashboard_browser.cjs'),origin],check=True)
            print('PASS: 11 legacy card types, native Python metadata, held/tapped/expired/isolated buttons, stepped sliders, layouts, safe project restore and source bundling')
        finally:
            process.terminate();process.wait(timeout=10);log.close()


if __name__=='__main__':main()
