// Shared educational world model. Geometry and temperature work without an active view.
(()=>{
 'use strict';
 const definitions={hot:{name:'Hot water',temperature:65,color:'#e99369'},cold:{name:'Cold water',temperature:5,color:'#76bbd9'},target:{name:'Target block',color:'#e2ad64'}};
 const bounded=(v,lo,hi,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error('Invalid '+label);return v;};
 const hasCups=w=>w.assets.some(a=>a.kind==='hot'||a.kind==='cold');
 function clean(w){
  if(!w||typeof w!=='object'||!Array.isArray(w.assets)||w.assets.length>100)throw Error('Invalid simulation assets (maximum 100).');
  const ids=new Set(),assets=w.assets.map(a=>{if(!a||!Object.hasOwn(definitions,a.kind)||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||ids.has(a.id))throw Error('Invalid or duplicate simulation asset.');ids.add(a.id);const out={id:a.id,kind:a.kind,x:bounded(a.x,0,1400,'asset X'),y:bounded(a.y,0,1500,'asset Y')};if(a.kind==='target'){out.width=bounded(a.width,10,200,'target width');out.height=bounded(a.height,10,200,'target height');}else out.temperature=bounded(a.temperature,0,95,'water temperature');return out;});
  const p=w.probe;if(!p||typeof p!=='object')throw Error('Invalid simulation probe.');
  const out={assets,probe:{x:bounded(p.x,25,1800,'probe X'),y:bounded(p.y,145,1800,'probe Y'),temperature:bounded(p.temperature,-55,125,'probe temperature'),at:bounded(p.at,0,1e15,'probe timestamp')}};
  if(w.ultrasonic!=null){if(typeof w.ultrasonic.enabled!=='boolean')throw Error('Invalid world sensing switch');out.ultrasonic={enabled:w.ultrasonic.enabled,angle:bounded(w.ultrasonic.angle,-180,180,'sensor angle')};}return out;
 }
 function contact(w){return w.assets.findLast(a=>a.kind!=='target'&&w.probe.x>a.x+29&&w.probe.x<a.x+179&&w.probe.y>a.y+114&&w.probe.y<a.y+253)||null;}
 const origin=p=>({x:p.x+306,y:p.y+110});
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 function nearestInCone(rect,o,angle){
  const theta=angle*Math.PI/180,axis={x:Math.cos(theta),y:Math.sin(theta)},tan=Math.tan(Math.PI/12),candidates=[];
  const inside=p=>{const dot=p.x*axis.x+p.y*axis.y;return dot>=-1e-8&&Math.abs(cross(axis,p))<=Math.max(0,dot)*tan+1e-8;};
  const corners=[{x:rect.x-o.x,y:rect.y-o.y},{x:rect.x+rect.width-o.x,y:rect.y-o.y},{x:rect.x+rect.width-o.x,y:rect.y+rect.height-o.y},{x:rect.x-o.x,y:rect.y+rect.height-o.y}];
  if(o.x>=rect.x&&o.x<=rect.x+rect.width&&o.y>=rect.y&&o.y<=rect.y+rect.height)return 0;
  for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],d={x:b.x-a.x,y:b.y-a.y};if(inside(a))candidates.push(Math.hypot(a.x,a.y));const t=Math.max(0,Math.min(1,-(a.x*d.x+a.y*d.y)/(d.x*d.x+d.y*d.y))),p={x:a.x+d.x*t,y:a.y+d.y*t};if(inside(p))candidates.push(Math.hypot(p.x,p.y));
   for(const offset of[-Math.PI/12,Math.PI/12]){const ray={x:Math.cos(theta+offset),y:Math.sin(theta+offset)},denom=cross(ray,d);if(Math.abs(denom)<1e-9)continue;const r=cross(a,d)/denom,u=cross(a,ray)/denom;if(r>=-1e-8&&u>=-1e-8&&u<=1+1e-8)candidates.push(Math.max(0,r));}
  }
  return candidates.length?Math.min(...candidates):Infinity;
 }
 function ultrasound(scene){
  const w=scene.world,p=scene.gadgets.ultrasonic;if(!w?.ultrasonic?.enabled||!p)return {active:false,distance:scene.distance,id:null};
  const o=origin(p);let nearest=Infinity,id=null;
  for(const a of w.assets){if(a.kind!=='target')continue;const d=nearestInCone({x:a.x+4,y:a.y+36,width:a.width,height:a.height},o,w.ultrasonic.angle);if(d<nearest){nearest=d;id=a.id;}}
  const echo=nearest>=2&&nearest<=400;return {active:true,distance:echo?Number(nearest.toFixed(1)):0,id:echo?id:null,origin:o,angle:w.ultrasonic.angle};
 }
 function advance(scene,now=Date.now()){
  if(!scene.world)return scene;const w=clean(scene.world);scene.world=w;
  if(scene.gadgets.temperature&&hasCups(w)){const a=contact(w),target=a?a.temperature:22,seconds=Math.max(0,(now-w.probe.at)/1000);w.probe.temperature=target+(w.probe.temperature-target)*Math.exp(-seconds/(a?5:25));scene.temperature=Number(w.probe.temperature.toFixed(1));}else w.probe.temperature=scene.temperature;
  w.probe.at=now;const echo=ultrasound(scene);if(echo.active)scene.distance=echo.distance;return scene;
 }
 window.CodyThermalWorld={definitions,clean,hasCups,contact,advance,origin,nearestInCone,ultrasound};
})();

// Classroom soil/water model. Moisture is a relative 0–100 scale, not calibrated VWC.
(()=>{
'use strict';
const types={sand:{name:'Sandy',capacity:400,field:45,soak:.8,drain:9,evap:.00024},loam:{name:'Loamy',capacity:500,field:65,soak:2,drain:30,evap:.00016},clay:{name:'Clay',capacity:600,field:80,soak:4.5,drain:70,evap:.00010}};
const finite=(v,lo,hi,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error('Invalid '+name);return v;};
function clean(g){
 if(!g||!Array.isArray(g.pots)||!Array.isArray(g.cans)||g.pots.length+g.cans.length>100||typeof g.enabled!=='boolean')throw Error('Invalid soil world');
 const ids=new Set(),position=a=>{if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||ids.has(a.id))throw Error('Invalid or duplicate garden asset');ids.add(a.id);return {id:a.id,x:finite(a.x,0,1400,'garden X'),y:finite(a.y,0,1500,'garden Y')};};
 const pots=g.pots.map(a=>{const p=position(a);if(!Object.hasOwn(types,a.type))throw Error('Invalid soil type');return {...p,type:a.type,water:finite(a.water,0,types[a.type].capacity,'soil water'),surface:finite(a.surface,0,100,'surface water'),overflow:finite(a.overflow,0,1e12,'overflow'),drained:finite(a.drained||0,0,1e12,'drained water')};});
 const cans=g.cans.map(a=>position(a));const p=g.probe;
 if(!p)throw Error('Missing soil probe');return {enabled:g.enabled,at:finite(g.at,0,1e15,'soil timestamp'),pots,cans,probe:{x:finite(p.x,25,1800,'soil probe X'),y:finite(p.y,145,1800,'soil probe Y'),value:finite(p.value,0,100,'soil reading')}};
}
const moisture=p=>p.water/types[p.type].capacity*100;
const surface=p=>({left:p.x+24,right:p.x+196,y:p.y+136,bottom:p.y+256});
const spout=c=>({x:c.x+181.07,y:c.y+153.64});
function contact(g){return g.pots.findLast(p=>{const s=surface(p),inset=Math.max(0,Math.min(15,(g.probe.y-s.y)/120*15));return g.probe.x-8>=s.left+inset&&g.probe.x+8<=s.right-inset&&g.probe.y>=s.y+8&&g.probe.y<=s.bottom;})||null;}
function partial(g){return !contact(g)&&g.pots.some(p=>{const s=surface(p);return g.probe.y>=s.y&&g.probe.y<=s.bottom&&g.probe.x+8>s.left&&g.probe.x-8<s.right;});}
function landing(g,c){let best=null,area=0;for(const p of g.pots){const width=Math.min(c.x+205,p.x+202)-Math.max(c.x+5,p.x+18),height=Math.min(c.y+160,p.y+264)-Math.max(c.y+15,p.y+95);const overlap=Math.max(0,width)*Math.max(0,height);if(overlap>area){area=overlap;best=p;}}return best;}
function evolve(p,seconds){const t=types[p.type];const soak=p.surface*(1-Math.exp(-seconds/t.soak)),accepted=Math.min(soak,t.capacity-p.water);p.surface-=accepted;p.water+=accepted;
 const above=Math.max(0,p.water-t.capacity*t.field/100),drain=above*(1-Math.exp(-seconds/t.drain));p.water-=drain;p.drained+=drain;
 const evaporated=Math.min(p.water,t.capacity*t.evap*seconds);p.water-=evaporated;
 // A small surface puddle evaporates too; water cannot be created by the model.
 p.surface=Math.max(0,p.surface-Math.min(p.surface,t.capacity*t.evap*.5*seconds));
}
function advance(scene,now=Date.now()){
 if(!scene.garden)return scene;const g=clean(scene.garden);scene.garden=g;const real=Math.max(0,(now-g.at)/1000);
 // A reusable can waters automatically for as long as its image overlaps a pot.
 // Split longer reads so infiltration and overflow remain consistent across frame rates.
 const steps=Math.max(1,Math.min(600,Math.ceil(real/.1))),dt=real/steps;
 for(let i=0;i<steps;i++){for(const c of g.cans){const p=landing(g,c);if(p){const combined=p.surface+60*dt;p.surface=Math.min(100,combined);p.overflow+=Math.max(0,combined-100);}}for(const p of g.pots)evolve(p,dt);}
 if(g.enabled&&scene.gadgets.soil){const p=contact(g),target=p?moisture(p):0;g.probe.value=target+(g.probe.value-target)*Math.exp(-real/1.8);scene.soil=Number(g.probe.value.toFixed(1));}else g.probe.value=scene.soil;
 g.at=now;return scene;
}
window.CodySoilWorld={types,clean,moisture,surface,spout,contact,partial,landing,evolve,advance};
const previous=window.CodyThermalWorld.advance;window.CodyThermalWorld.advance=(scene,now=Date.now())=>advance(previous(scene,now),now);
})();
