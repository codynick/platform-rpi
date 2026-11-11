'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('playwright-core'));}
const root=path.resolve(__dirname,'..'),php=process.env.PHP_BIN||'php',origin='https://rpi-presenter.test';
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(origin+'/**',route=>{const url=new URL(route.request().url()),html=execFileSync(php,['-r','parse_str($argv[1],$_GET);include $argv[2];',url.search.slice(1),path.join(root,'components/ide/teachers/index.php')],{encoding:'utf8'});return route.fulfill({contentType:'text/html',body:html});});
  await page.goto(origin+'/teachers/');assert((await page.locator('article h1').textContent()).includes('Temperature Alarm'));
  const guides=page.locator('nav a');assert.equal(await guides.count(),2);await guides.nth(1).click();await page.waitForURL('**/*guide=02-*');
  assert.equal(await page.locator('article h1').textContent(),'CodyNick Raspberry Pi 5 — One-Hour General Demo');assert.equal(await page.locator('article code.language-python').count(),3);assert.equal(await page.locator('article table').count(),4);
  assert.equal(await page.locator('.copy-code').count(),await page.locator('article pre').count());
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.testCopiedCode=text;}},configurable:true}));
  const wrap=page.locator('.code-wrap').filter({has:page.locator('code.language-python')}).first(),expected=await wrap.locator('pre').textContent();await wrap.locator('button').click();assert.equal(await page.evaluate(()=>window.testCopiedCode),expected);
  const artifacts=process.env.GUIDE_ARTIFACTS;if(artifacts){fs.mkdirSync(artifacts,{recursive:true});await page.screenshot({path:path.join(artifacts,`second-guide-${width}.png`),fullPage:false});}
  await guides.nth(0).click();assert((await page.locator('article h1').textContent()).includes('Temperature Alarm'));assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: existing presenter panel, first/second guide navigation, Markdown tables/code and exact Copy content at desktop/mobile sizes');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
