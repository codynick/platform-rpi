const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  await context.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined}));
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]);await page.waitForFunction(()=>document.getElementById('saved').textContent==='Saved');
  assert(await page.getByRole('button',{name:'Add gadget',exact:true}).isVisible());
  assert(await page.getByRole('button',{name:'Add asset',exact:true}).isVisible());
  assert(await page.locator('.header-title').textContent()==='CodyNick Simulator');
  assert(!page.url().includes('token='),'Private token must be removed from browser history');
  const server=()=>page.evaluate(()=>fetch('/state').then(r=>r.json()));
  for(const kind of ['temperature','soil','ultrasonic','motion','rfid','ultraseg']) {
   await page.locator('#addGadgets').click();await page.locator(`#gadgetPicker [data-add="${kind}"]`).click();
   await page.locator('#gadgetPicker').waitFor({state:'hidden'});
  }
  async function asset(name){
   await page.locator('#addAssets').click();await page.locator('.asset-choice').filter({has:page.locator('strong',{hasText:new RegExp('^'+name+'$')})}).click();
   await page.locator('.asset-picker').waitFor({state:'hidden'});await page.waitForTimeout(180);
  }
  await asset('Hot water cup');
  await page.getByRole('button',{name:'Hot water cup settings',exact:true}).click();
  await page.locator('#cupDegrees').fill('70');await page.getByRole('button',{name:'Apply temperature',exact:true}).click();
  await asset('Cold water cup');
  async function dragModel(locator,dx,dy){
   await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();
   const scale=await page.evaluate(()=>CodySimulatorView.snapshot().camera.scale);
   const x=box.x+box.width/2,y=box.y+box.height*.65;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx*scale,y+dy*scale,{steps:8});await page.mouse.up();await page.waitForTimeout(250);
  }
  let value=await server(),hot=value.scene.world.assets.find(a=>a.kind==='hot');
  await dragModel(page.getByRole('group',{name:'Hot water cup',exact:true}),-40,20);
  value=await server();let moved=value.scene.world.assets.find(a=>a.kind==='hot');
  assert(Math.abs(moved.x-(hot.x-40))<3,'Cup body must drag');
  let p=value.scene.world.probe;
  await dragModel(page.locator('.probe-extension'),moved.x+100-p.x,moved.y+180-p.y);
  const initial=(await server()).scene.temperature;await page.waitForTimeout(1400);
  const warmed=(await server()).scene.temperature;assert(warmed>initial+1,'Probe temperature must respond gradually to hot water');
  assert(await page.locator('#temperatureValue').evaluate(e=>e.readOnly));
  value=await server();const cold=value.scene.world.assets.find(a=>a.kind==='cold');p=value.scene.world.probe;
  await dragModel(page.locator('.probe-extension'),cold.x+100-p.x,cold.y+180-p.y);
  const beforeCold=(await server()).scene.temperature;await page.waitForTimeout(1400);
  assert((await server()).scene.temperature<beforeCold,'Cold water must cool the probe');
  await asset('Target block');
  await page.getByRole('button',{name:'Target block settings',exact:true}).click();
  await page.locator('#targetWidth').fill('120');await page.locator('#targetHeight').fill('160');await page.getByRole('button',{name:'Apply size',exact:true}).click();await page.waitForTimeout(200);
  value=await server();let target=value.scene.world.assets.find(a=>a.kind==='target'),u=value.scene.gadgets.ultrasonic;
  const x=u.x+306+100-4,y=u.y+110-36;
  await dragModel(page.getByRole('group',{name:'Ultrasonic target block',exact:true}),x-target.x,y-target.y);
  await page.locator('#ultraAngle').fill('0');await page.locator('#ultraAngle').dispatchEvent('change');await page.waitForTimeout(300);
  assert(Math.abs((await server()).scene.distance-100)<4,'Ultrasonic target must set distance in stage units');
  await page.locator('#ultraAngle').fill('180');await page.locator('#ultraAngle').dispatchEvent('change');await page.waitForTimeout(300);
  assert.equal((await server()).scene.distance,0,'Target outside cone must produce no echo');
  await page.locator('#ultraAngle').fill('0');await page.locator('#ultraAngle').dispatchEvent('change');
  await asset('Soil pot');
  await page.getByRole('button',{name:'Soil pot settings',exact:true}).click();
  await page.locator('#soilType').selectOption('clay');await page.locator('#soilInitial').fill('20');await page.getByRole('button',{name:'Apply soil settings',exact:true}).click();await page.waitForTimeout(200);
  value=await server();let pot=value.scene.garden.pots[0],sp=value.scene.garden.probe;
  await dragModel(page.locator('.soil-probe'),pot.x+110-sp.x,pot.y+200-sp.y);
  await asset('Watering can');
  value=await server();let can=value.scene.garden.cans[0];pot=value.scene.garden.pots[0];
  const water=pot.water;
  await dragModel(page.locator('.garden-can'),pot.x-can.x,pot.y-can.y);
  await page.waitForTimeout(2500);
  value=await server();assert(value.scene.garden.pots[0].water>water+1,'Watering can must add water to the soil');
  assert(await page.locator('.garden-can').evaluate(e=>e.classList.contains('pouring')));
  assert(await page.locator('#soilProbeState').textContent().then(t=>t.includes('Both prongs')));
  // Verify new gadget controls reach native scene data too.
  await page.locator('#motionValue').check();await page.locator('#rfidValue').fill('DEADBEEF');await page.locator('#rfidValue').dispatchEvent('change');
  await page.locator('#ultraDistanceValue').fill('33');await page.locator('#ultraDistanceValue').dispatchEvent('change');await page.waitForTimeout(300);
  value=await server();assert(value.scene.motion);assert.equal(value.scene.rfid,'DEADBEEF');
  const session=await page.evaluate(()=>fetch('/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'open'})}).then(r=>r.json()));
  await page.waitForTimeout(250);assert(await page.locator('#addGadgets').isDisabled());assert(await page.locator('#addAssets').isEnabled());
  await page.evaluate(session=>fetch('/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'close',session})}),session.session);
  const other=await context.newPage();await other.goto(process.argv[2]);await other.locator('.garden-pot').waitFor();
  assert.equal(await other.locator('.world-asset').count(),3);await other.close();
  if(process.env.SIM_ASSETS_SCREENSHOT){await page.locator('#stageViewport').evaluate(e=>{e.scrollLeft=0;e.scrollTop=0;});await page.locator('#stageViewport').focus();await page.keyboard.press('Home');await page.waitForTimeout(250);await page.screenshot({path:process.env.SIM_ASSETS_SCREENSHOT,fullPage:true});}
  await page.reload();await page.locator('.garden-pot').waitFor();assert.equal(await page.locator('.world-asset').count(),3);
  assert.deepEqual(errors,[]);
  console.log('PASS: server-style gadget/asset pickers, HTTP-safe IDs, body/probe dragging, hot/cold response, ultrasonic geometry/aim, soil settings/watering, extra gadgets, shared/reloaded scenes and running-program controls');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
