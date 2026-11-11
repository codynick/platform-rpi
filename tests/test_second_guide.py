"""Documentation-only checks; never execute the guide's hardware/AI programs."""
import ast,hashlib,json,os,re,shutil,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FIRST='components/ide/teachers/guides/01-temperature-alarm-live-coding.md'
SECOND='components/ide/teachers/guides/02-rpi5-one-hour-general-demo.md'

class SecondGuideTests(unittest.TestCase):
    def test_supplied_text_order_and_python_syntax(self):
        text=(ROOT/SECOND).read_text(encoding='utf-8')
        self.assertEqual(hashlib.sha256(text.encode()).hexdigest(),'cf41a2bb6bd6b7d43be0612a363a456517d8a543a6381ef67830281332adca22')
        files=sorted((ROOT/'components/ide/teachers/guides').glob('*.md'))
        self.assertEqual([path.name for path in files[:2]],[Path(FIRST).name,Path(SECOND).name])
        programs=re.findall(r'```python\s*\n(.*?)```',text,re.S)
        self.assertEqual(len(programs),3)
        for index,program in enumerate(programs):ast.parse(program,filename=f'guide-program-{index+1}.py')

    def test_manifest_includes_second_and_preserves_first(self):
        old=json.loads((ROOT/'releases/core-0.14.0.json').read_text())
        current=json.loads((ROOT/'releases/core-0.14.1.json').read_text())
        self.assertEqual(current['files'][FIRST],old['files'][FIRST])
        self.assertEqual(current['files'][SECOND],hashlib.sha256((ROOT/SECOND).read_text(encoding='utf-8').encode()).hexdigest())

    @unittest.skipUnless(os.environ.get('PHP_BIN') or shutil.which('php'),'PHP CLI unavailable')
    def test_existing_panel_renders_both_guides(self):
        php=os.environ.get('PHP_BIN') or shutil.which('php')
        code='parse_str($argv[1],$_GET);include $argv[2];'
        def render(query):return subprocess.check_output([php,'-r',code,query,str(ROOT/'components/ide/teachers/index.php')]).decode('utf-8')
        html=render('guide=02-rpi5-one-hour-general-demo')
        self.assertIn('<h1>CodyNick Raspberry Pi 5',html)
        self.assertEqual(html.count('class="language-python"'),3)
        self.assertGreaterEqual(html.count('<table>'),4)
        self.assertIn('code-wrap',html);self.assertIn('copy-code',html)
        self.assertLess(html.index('?guide=01-'),html.index('?guide=02-'))
        self.assertIn('Build a CodyNick Temperature Alarm',render(''))

if __name__=='__main__':unittest.main()
