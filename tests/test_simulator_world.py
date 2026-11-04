import copy
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'components/simulator'))
import world


def scene(kind='hot',soil='loam'):
    return dict(gadgets={name:{'x':40,'y':40} for name in ['cjp','temperature','ultrasonic','soil']},temperature=21.1,distance=50,soil=50,
        world=dict(assets=[dict(id='cup',kind=kind,x=600,y=100,temperature=65 if kind=='hot' else 5),
                           dict(id='target',kind='target',x=650,y=100,width=80,height=100)],
                   probe=dict(x=700,y=280,temperature=21.1,at=100000),ultrasonic=dict(enabled=True,angle=0)),
        garden=dict(enabled=True,at=100000,pots=[dict(id='pot',x=920,y=340,type=soil,water=100,surface=20,overflow=0,drained=0)],
                    cans=[dict(id='can',x=920,y=340)],probe=dict(x=1030,y=540,value=30)))


class WorldTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'),'Node reference model required')
    def test_matches_server_models_for_thermal_cone_soil_and_water(self):
        cases=[]
        for kind in ['hot','cold']:
            for soil in ['sand','loam','clay']:
                for seconds in [0,.05,1,5,30,120]:cases.append(dict(scene=scene(kind,soil),now=100000+seconds*1000))
        for angle in [-180,-90,-15,0,15,45,90,180]:
            value=scene();value['world']['ultrasonic']['angle']=angle;cases.append(dict(scene=value,now=110000))
        for x in [100,200,650,1000,1300]:
            value=scene();value['world']['assets'][1]['x']=x;cases.append(dict(scene=value,now=110000))
        output=subprocess.check_output(['node',str(ROOT/'tests/world_model_reference.cjs')],input=json.dumps(cases),text=True)
        expected=json.loads(output)
        def compare(a,b,path=''):
            if isinstance(a,dict):
                self.assertEqual(set(a),set(b),path)
                for key in a:compare(a[key],b[key],path+'/'+key)
            elif isinstance(a,list):
                self.assertEqual(len(a),len(b),path)
                for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+'/'+str(i))
            elif isinstance(a,(int,float)) and not isinstance(a,bool):self.assertAlmostEqual(a,b,places=6,msg=path)
            else:self.assertEqual(a,b,path)
        for case,reference in zip(cases,expected):compare(world.advance(copy.deepcopy(case['scene']),case['now']),reference)

    def test_validates_assets_and_keeps_partial_prongs_out_of_soil(self):
        value=scene();world.clean_world(value['world']);world.clean_garden(value['garden'])
        self.assertIsNotNone(world.soil_contact(value['garden']))
        value['garden']['probe']['x']=944;self.assertIsNone(world.soil_contact(value['garden']))
        for bad in [float('nan'),float('inf'),True,-1]:
            broken=scene()['world'];broken['assets'][0]['x']=bad
            with self.assertRaises(ValueError):world.clean_world(broken)
        broken=scene()['world'];broken['assets'].append(copy.deepcopy(broken['assets'][0]))
        with self.assertRaises(ValueError):world.clean_world(broken)
        broken=scene()['garden'];broken['pots'][0]['type']='unknown'
        with self.assertRaises(ValueError):world.clean_garden(broken)

    def test_incremental_edits_preserve_sensor_evolution_and_other_view_assets(self):
        base=scene();edited=copy.deepcopy(base);edited['world']['assets'][0]['x']+=10
        current=copy.deepcopy(base);world.advance(current,110000)
        current['world']['assets'].append(dict(id='other-view',kind='cold',x=900,y=20,temperature=5))
        result=world.merge_edit(base,edited,current)
        self.assertEqual(result['world']['probe']['temperature'],current['world']['probe']['temperature'])
        self.assertEqual(result['garden']['pots'][0]['water'],current['garden']['pots'][0]['water'])
        self.assertEqual(result['world']['assets'][0]['x'],610)
        self.assertIn('other-view',[a['id'] for a in result['world']['assets']])

    def test_native_sensor_reads_and_restart_preserve_world_without_browser(self):
        spec=importlib.util.spec_from_file_location('world_native_server',ROOT/'components/simulator/server.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'scene.json';state=module.State(path)
            with patch('world.time.time',return_value=100):
                state.save_scene(scene())
                session=state.command({'action':'open'})['session']
            with patch('world.time.time',return_value=105):
                reading=state.command({'action':'temperature','session':session})['temperature']
                self.assertGreater(reading,21.1);self.assertLess(reading,65)
                echo=state.command({'action':'ultrasonic','device':0,'session':session})['value']
                self.assertGreater(echo,0)
                moisture=state.command({'action':'soil','session':session})['value']
                self.assertNotEqual(moisture,50)
            restored=module.State(path)
            self.assertEqual(restored.scene['world']['assets'],state.scene['world']['assets'])
            self.assertIn('garden',restored.scene)
            invalid=scene();invalid['world']['probe']['x']=-1
            before=path.read_bytes()
            with self.assertRaises(ValueError):state.save_scene(invalid)
            self.assertEqual(path.read_bytes(),before)

    def test_legacy_manual_scene_gets_preserved_before_asset_editing(self):
        spec=importlib.util.spec_from_file_location('world_backup_server',ROOT/'components/simulator/server.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'scene.json';original={'gadgets':{'cjp':{'x':80,'y':120}},'temperature':19}
            path.write_text(json.dumps(original));module.State(path)
            backup=path.with_name('scene.pre-assets.json')
            self.assertEqual(json.loads(backup.read_text()),original)
            path.write_text(json.dumps({**original,'temperature':30}));module.State(path)
            self.assertEqual(json.loads(backup.read_text()),original)


if __name__=='__main__':unittest.main()
