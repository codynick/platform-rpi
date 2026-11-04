const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(process.argv[2]+'/blocks/');
  await page.waitForFunction(()=>typeof workspace!=='undefined' && workspace && document.getElementById('spriteStatus').textContent==='Connected');
  const tab=name=>page.locator('.space-tabs').getByRole('tab',{name,exact:true});
  for(const name of ['Simulation','Dashboard','Sprites'])assert(await tab(name).isVisible());
  await tab('Simulation').click();
  const simulation=page.frameLocator('#simulatorFrame');
  await simulation.locator('#temperatureValue').waitFor();
  assert(await simulation.locator('body').evaluate(e=>e.classList.contains('embedded')));
  assert(await simulation.locator('header').isHidden());
  const sources={};
  for(const id of ['simulation-temperature','mixed-worlds','simulation-sprite']) {
   await page.getByRole('button',{name:'Examples',exact:true}).click();
   await page.locator('#blockExampleList').selectOption(id);await page.getByRole('button',{name:'Load example',exact:true}).click();
   try{await page.waitForFunction(()=>!document.getElementById('blockExamples').open,{},{timeout:8000});}
   catch(error){throw Error('Example '+id+' failed: '+await page.locator('#toast').textContent()+'; browser errors: '+JSON.stringify(errors));}
   sources[id]=await page.evaluate(()=>generatePython());
   assert((await page.evaluate(()=>JSON.stringify(currentWorkspaceJson()))).includes('SIMULATION'));
   if(id==='simulation-temperature' && process.env.BLOCK_SPACES_SCREENSHOT){await page.waitForTimeout(250);await page.screenshot({path:process.env.BLOCK_SPACES_SCREENSHOT.replace(/\.png$/,'-simulation.png'),fullPage:true});}
  }
  assert(!sources['simulation-temperature'].includes('cody = CN()'));
  assert(sources['mixed-worlds'].includes('cody = CN()') && sources['mixed-worlds'].includes('simulator = Simulator()'));
  const options=await page.evaluate(()=>workspace.getAllBlocks(false).find(b=>b.type==='cn_joystick_position').getField('TARGET').getOptions().map(option=>option[1]));
  assert.deepEqual(options,['HARDWARE','SIMULATION']);
  // Real simulator inputs are released when its iframe is hidden.
  const joystick=simulation.getByRole('button',{name:'Joystick right',exact:true});await joystick.scrollIntoViewIfNeeded();
  const box=await joystick.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForTimeout(150);
  assert((await simulation.locator('body').evaluate(()=>fetch('/state').then(r=>r.json()))).states.includes('RIGHT'));
  await page.evaluate(()=>BlockSpaces.show('dashboard'));await page.waitForTimeout(250);await page.mouse.up();
  assert.deepEqual((await simulation.locator('body').evaluate(()=>fetch('/state').then(r=>r.json()))).states,[]);
  const dashboard=page.frameLocator('#dashboardFrame');
  await dashboard.locator('.card').first().waitFor();assert(await dashboard.locator('.header').isHidden());
  const hold=dashboard.getByRole('button',{name:'Space hold',exact:true});await hold.scrollIntoViewIfNeeded();
  const hb=await hold.boundingBox();await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();
  await page.waitForTimeout(200);assert.equal(await hold.getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>BlockSpaces.show('sprites'));await page.waitForTimeout(250);await page.mouse.up();
  const state=await page.request.get(process.argv[2]+'/dashboard/cards.php?action=state').then(r=>r.json());
  assert.equal(state.cards.find(c=>c.title==='Space hold').value,'false');
  await page.locator('#spriteCanvas').click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);
  assert((await page.request.get(process.argv[2]+'/blocks/stage.php').then(r=>r.json())).state.keys.includes('right'));
  await page.evaluate(()=>BlockSpaces.show('simulation'));await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
  assert.deepEqual((await page.request.get(process.argv[2]+'/blocks/stage.php').then(r=>r.json())).state.keys,[]);
  await page.locator('#designName').fill('Spaces round trip');await page.evaluate(()=>NamedDesigns.save());
  const saved=await page.request.get(process.argv[2]+'/blocks/designs.php?action=load&name=Spaces%20round%20trip').then(r=>r.json());
  assert.equal(saved.workspace.codynick_spaces.selected,'simulation');
  assert(JSON.stringify(saved.workspace).includes('SIMULATION'));
  const frameURL=await page.locator('#simulatorFrame').getAttribute('src');
  await page.locator('#stageToggle').click();assert(await page.locator('#liveSpaces').isHidden());
  assert(await page.locator('.workspace-shell').evaluate(e=>e.getBoundingClientRect().width>innerWidth*.85));
  await page.locator('#stageToggle').click();assert(await page.locator('#liveSpaces').isVisible());
  assert.equal(await page.locator('#simulatorFrame').getAttribute('src'),frameURL,'Space toggling must retain iframe state');
  await tab('Simulation').focus();await page.keyboard.press('ArrowRight');assert.equal(await tab('Dashboard').getAttribute('aria-selected'),'true');
  if(process.env.BLOCK_SPACES_SCREENSHOT){await page.waitForTimeout(250);await page.screenshot({path:process.env.BLOCK_SPACES_SCREENSHOT,fullPage:true});}
  await page.setViewportSize({width:390,height:844});await tab('Simulation').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile editor must fit viewport');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(process.argv[3],JSON.stringify(sources,null,2));
  console.log('PASS: Chrome real Blockly examples/target fields, three live spaces, embedded services, hidden-input release, saved targets/panel, keyboard tabs and responsive layout');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
