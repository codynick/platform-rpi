const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:920}});
    page.setDefaultTimeout(12000);
    const errors = [];
    const dialogs = [];
    let accept = true;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => {
      dialogs.push(dialog.message());
      return accept ? dialog.accept() : dialog.dismiss();
    });
    const origin = process.argv[2];
    await page.goto(origin + '/');
    await page.getByRole('link', {name:/Advanced IDE/}).click();
    await page.locator('#advancedRunStatus').getByText('A program is running on the Pi').waitFor();
    await page.locator('#workspaceStatus').getByText(/Saved|Loaded/).waitFor();
    const source = page.locator('#advancedPythonSource');
    assert(await source.isVisible());
    async function loadExample(id) {
      await page.locator('#blockExamplesButton').click();
      await page.locator('#blockExampleList').selectOption(id);
      await page.locator('#blockExampleLoad').click();
      await page.locator('#blockExamples').waitFor({state:'hidden'});
    }
    await loadExample('simulation-temperature');
    assert(await source.isVisible());
    assert.match(await source.inputValue(), /temperature = Temperature_Sensor.read/);
    assert(!/Auto-generated/.test(await source.inputValue()));
    await page.getByRole('tab', {name:'Blocks', exact:true}).click();
    await loadExample('mixed-worlds');
    assert(await page.locator('#blocklyDiv').isVisible());
    await page.getByRole('tab', {name:'Python', exact:true}).click();
    assert.match(await source.inputValue(), /Each sensor drives the LED in the other world/);
    await loadExample('simulation-sprite');
    assert.match(await source.inputValue(), /rocket.change_x\(5\)/);
    const python = 'print("Advanced IDE native execution")\n';
    await source.fill(python);
    assert.equal(await page.locator('#advancedPythonColors .py-string').textContent(), '"Advanced IDE native execution"');
    await page.getByRole('tab', {name:'Blocks', exact:true}).click();
    assert(await page.locator('#blocklyDiv').isVisible());
    await page.getByRole('tab', {name:'Python', exact:true}).click();
    assert.equal(await source.inputValue(), python);
    accept = false;
    await page.locator('#blockRunBtn').click();
    await page.waitForFunction(() => !document.getElementById('blockRunBtn').disabled);
    assert(!fs.readFileSync(path.join(process.argv[3], 'client', 'log.log'), 'utf8').includes('Advanced IDE native'));
    accept = true;
    await page.locator('#blockRunBtn').click();
    await page.locator('#advancedConsole').getByText('Advanced IDE native execution').waitFor();
    assert(dialogs.some(message => message.includes('already be running')));
    await page.locator('#blockStopBtn').click();
    await page.waitForFunction(() => !document.getElementById('blockRunBtn').disabled);

    const snapshot = await page.evaluate(async () => {
      const sim = await fetch('/advanced/device.php?action=simulator').then(r=>r.json());
      sim.scene.temperature = 33;
      sim.leds[0] = '#112233';
      await postJson('/advanced/device.php?action=simulator', sim);
      await postJson('/blocks/stage.php', {action:'go', x:31, y:42});
      return currentWorkspaceJson().blocks;
    });
    await page.locator('#designName').fill('Advanced: round trip');
    async function menu(id) {
      await page.locator('.advanced-menu summary').click();
      await page.locator('#'+id).click();
    }
    await menu('advancedSave');
    await page.locator('#toast').getByText('Project saved.', {exact:true}).waitFor();
    const download = page.waitForEvent('download');
    await menu('advancedDownload');
    const archive = path.join(process.argv[3], 'roundtrip.codynick');
    await (await download).saveAs(archive);
    assert.equal(fs.readFileSync(archive).subarray(0,4).toString('hex'), '504b0304');
    await menu('advancedNew');
    await page.locator('#toast').getByText('New project.', {exact:true}).waitFor();
    assert(await source.isVisible());
    assert.equal(await source.inputValue(), '');
    await menu('advancedOpen');
    await page.locator('#advancedProjectList').selectOption('Advanced: round trip');
    await page.locator('#advancedLoadProject').click();
    await page.locator('#advancedOpenDialog').waitFor({state:'hidden'});
    assert(await source.isVisible());
    assert.equal(await source.inputValue(), python);
    const restored = await page.evaluate(async () => {
      const sim = await fetch('/advanced/device.php?action=simulator').then(r=>r.json());
      const sprite = await fetch('/blocks/stage.php').then(r=>r.json());
      const dashboard = await dashboardProjectSnapshot();
      return [sim.scene.temperature, sim.leds[0], sprite.state.x, sprite.state.y,
        dashboard.cards.some(card => card.title === 'Temperature'), currentWorkspaceJson().blocks];
    });
    assert.deepEqual(restored, [33, '#112233', 31, 42, true, snapshot]);
    await page.locator('#advancedArchiveInput').setInputFiles(archive);
    await page.waitForFunction(() => !document.getElementById('blockRunBtn').disabled);
    assert.deepEqual(errors, []);
    await page.goto(origin + '/blocks/');
    assert.equal(await page.locator('#advancedPythonTab').count(), 0);
    assert.equal(await page.locator('#designName').inputValue(), '');
    console.log('PASS: Advanced IDE tabs, native Run and console, replacement confirmation, ZIP save/download/restore, real database and separate standard workspace');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
