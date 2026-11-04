"""Local Chrome integration with real PHP/MySQL, simulator and sprite services.

Uses the same isolated *_test database variables as dashboard_integration.py.
Requires PLAYWRIGHT_MODULE, PHP_BIN, and mysql-connector-python.
"""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
import urllib.request
from test_block_routing import BlockRoutingTests, ROOT, load


def main():
    BlockRoutingTests.setUpClass()
    fixture=BlockRoutingTests()
    fixture.setUp()
    php_process=None
    try:
        base=fixture.directory/'web';shutil.copytree(ROOT/'components/ide',base)
        state=fixture.directory/'application.json';state.write_text(json.dumps({'components':{'simulator':'stage-4'}}))
        launcher=base/'simulator/index.php'
        launcher.write_text(launcher.read_text(encoding='utf-8').replace('/var/lib/codynick/application-state.json',state.as_posix())
            .replace('/opt/codynick-simulator/token',fixture.token_file.as_posix())
            .replace(':8091/',':'+str(fixture.servers[0].server_port)+'/'),encoding='utf-8')
        proxy=base/'blocks/stage.php';proxy.write_text(proxy.read_text().replace('127.0.0.1:8092','127.0.0.1:'+str(fixture.servers[1].server_port)))
        home=fixture.directory/'client';(home/'userfiles').mkdir(parents=True)
        page=base/'blocks/index.php';page.write_text(page.read_text(encoding='utf-8').replace('/home/client',home.as_posix()),encoding='utf-8')
        db=os.environ.get('MYSQL_TEST_DATABASE','dashboard_upgrade_test');assert db.endswith('_test') and db.replace('_','').isalnum()
        port=int(os.environ.get('MYSQL_TEST_PORT','3306'));user=os.environ.get('MYSQL_TEST_USER','dashboard_test');password=os.environ.get('MYSQL_TEST_PASSWORD','dashboard-test-local')
        dashboard=load('spaces_native_dashboard','components/client/Dashboard.py')
        dashboard.configure(host='127.0.0.1',port=port,user=user,password=password,database=db);dashboard.clear()
        dashboard.Card('button','Space hold',button_mode='momentary',value=False,auto_delete=False)
        dashboard.Card('gauge','Temperature',value=21,min_value=-10,max_value=50,auto_delete=False)
        config=base/'dashboard/config.php'
        config.write_text('<?php\n'+ '\n'.join([
            '$db_host='+json.dumps('127.0.0.1;port='+str(port))+';','$db_name='+json.dumps(db)+';',
            '$db_user='+json.dumps(user)+';','$db_pass='+json.dumps(password)+';','$cards_table="iot_cards";',
            '$dashboard_title="Dashboard test";','$dashboard_subtitle="Isolated test";','$logo_path="/assets/logo.png";','$poll_interval_ms=200;']),encoding='utf-8')
        sock=socket.socket();sock.bind(('127.0.0.1',0));web_port=sock.getsockname()[1];sock.close()
        origin=f'http://127.0.0.1:{web_port}'
        with (fixture.directory/'php.log').open('w') as log:
            php_process=subprocess.Popen([os.environ.get('PHP_BIN','php'),'-S',f'127.0.0.1:{web_port}','-t',str(base)],stdout=log,stderr=log)
            for _ in range(80):
                try:urllib.request.urlopen(origin+'/blocks/').close();break
                except OSError:time.sleep(.1)
            else:raise RuntimeError('PHP fixture did not start')
            result=fixture.directory/'browser-generated.json'
            subprocess.run([os.environ.get('NODE_BIN','node'),str(ROOT/'tests/block_spaces_browser.cjs'),origin,str(result)],check=True)
            sources=json.loads(result.read_text())
            for name,source in sources.items():
                assert source==fixture.programs[name],name+' differs between browser/headless Blockly'
                fixture.hardware.clear();fixture.commands.clear()
                if name=='simulation-sprite':fixture.state.command({'action':'input','states':['RIGHT']})
                fixture.execute(name,source)
            print('PASS: browser-generated native programs execute against the production simulator and sprite services; physical transport is mocked')
    finally:
        if php_process is not None:php_process.terminate();php_process.wait(timeout=10)
        fixture.doCleanups();BlockRoutingTests.tearDownClass()


if __name__=='__main__':main()
