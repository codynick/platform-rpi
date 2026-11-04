// Adapt the server's view/store contract to the existing authoritative RPi HTTP service.
// Physics and native Python readings remain on the Pi, even without any browser view.
(()=>{
 'use strict';
 document.body.inert=true;
 let state={scene:{gadgets:{cjp:{x:40,y:40}},temperature:21.1,distance:50,soil:50,wifi_link:true,cloud_link:true,motion:false,rfid:'00000000',ultraDistance:50},
   connected:false,states:[],joystick_states:[],leds:Array(16).fill('#000000'),notes:[],matrix:{text:'',speed:1,pixels:Array(64).fill(0),mode:'pixels',revision:0},
   seven_segment:'',ultra_segment:'',wifi:{wifi:0,iot:0,ssid:'',slots:[]},error:''};
 let pending=0,lastError='',readyResolve,staged=null,sending=false,timer;
 const ready=new Promise(resolve=>{readyResolve=resolve;});
 let initialized=false;
 window.CodySimulatorId=()=>{
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 };
 const clone=value=>structuredClone(value);
 function changed(){window.dispatchEvent(new Event('codynick-live-change'));}
 async function request(action,data){
  const response=await fetch(action==='state'?'/state':'/command',action==='state'?{cache:'no-store',signal:AbortSignal.timeout(4000)}:
   {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(5000)});
  const value=await response.json();if(!response.ok)throw Error(value.error||'Simulator request failed');return value;
 }
 function read(){return clone(state);}
 function validate(scene){
  if(!scene?.gadgets?.cjp)throw Error('Simulation must contain CodyJoy Pro.');
  if(scene.world)CodyThermalWorld.clean(scene.world);
  if(scene.garden)CodySoilWorld.clean(scene.garden);
  if(state.connected && Object.keys(scene.gadgets).sort().join(',')!==Object.keys(state.scene.gadgets).sort().join(','))throw Error('Stop the Python script before adding or removing gadgets.');
 }
 function edit(scene,base){
  if(!initialized)throw Error('Simulator is still loading. Reload to retry.');
  validate(scene);state.scene=clone(scene);pending++;changed();
  const operation=new Promise((resolve,reject)=>{
   if(staged){staged.scene=clone(scene);staged.waiters.push({resolve,reject});}
   else staged={scene:clone(scene),base:clone(base),waiters:[{resolve,reject}]};
  });
  clearTimeout(timer);timer=setTimeout(flush,30);return operation;
 }
 async function flush(){
  if(sending||!staged)return;
  const batch=staged;staged=null;sending=true;
  try{await request('command',{action:'scene_edit',scene:batch.scene,base:batch.base});lastError='';batch.waiters.forEach(w=>w.resolve({ok:true}));}
  catch(error){lastError=error.message;batch.waiters.forEach(w=>w.reject(error));}
  finally{pending-=batch.waiters.length;sending=false;changed();if(staged)timer=setTimeout(flush,0);}
 }
 function update(fn){
  const before=read(),after=clone(before),result=fn(after);
  edit(after.scene,before.scene).catch(()=>{});return result;
 }
 function simCommand(command){
  if(command.action==='scene')return edit(clone(command.scene),clone(state.scene)).then(()=>({ok:true}));
  return request('command',command);
 }
 async function poll(){
  try{
   const current=await request('state');
   if(pending)current.scene=state.scene;
   state=current;
   if(!pending)lastError='';
   if(!initialized){initialized=true;document.body.inert=false;readyResolve();}
   changed();
  }catch(error){lastError=error.message;readyResolve();}
  setTimeout(poll,100);
 }
 window.CodyLiveStore={read,update,simState:()=>({...read(),error:lastError||state.error||''}),simCommand,ready};
 poll();
})();
