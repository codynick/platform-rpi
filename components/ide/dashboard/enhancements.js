'use strict';
const DashboardTools = (() => {
    let layout = {}, cards = [], keys = new Map(), editing = false, gesture = null, saveTimer, dirty = false;
    const held = new Map(), owner = 'view-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    let sequence = 0, revision = 0;
    const inputQueues = new Map();
    const gridElement = () => document.getElementById('dashboardGrid');
    const status = message => { document.getElementById('dashboardStatus').textContent = message; };
    async function request(action, data) {
        const response = await fetch('cards.php?action=' + action, data === undefined ? {cache:'no-store'} : {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), keepalive:action==='input'
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw Error(result.error || 'Dashboard request failed');
        return result;
    }
    function persist() {
        dirty = true; const savedRevision=++revision; clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            try { await request('layout', {layout}); if(revision===savedRevision)dirty = false; status('Layout saved on this Pi.'); }
            catch (error) { status(error.message + ' Move a card again to retry.'); }
        }, 250);
    }
    function columns() { return CodyDashboardLayout.columns(gridElement().clientWidth); }
    function arrange() {
        const cols = columns();
        const model = cards.map(card => ({...card, id:keys.get(String(card.id))}));
        const placed = CodyDashboardLayout.arrange(model, layout, cols, gesture?.key);
        gridElement().style.gridTemplateColumns = `repeat(${cols}, minmax(0,1fr))`;
        for (const card of cards) {
            const element = document.querySelector(`[data-card-id="${card.id}"]`), rect = placed[keys.get(String(card.id))];
            if (!element || !rect) continue;
            element.style.gridColumn = `${rect.x+1} / span ${rect.w}`;
            element.style.gridRow = `${rect.y+1} / span ${rect.h}`;
        }
    }
    function redraw() { for (const card of cards) updateCardValues(card); }
    function commitLayout(key) {
        const model=cards.map(card=>({...card,id:keys.get(String(card.id))}));
        layout={...layout,...CodyDashboardLayout.arrange(model,layout,columns(),key)};
        persist();arrange();redraw();
    }
    function keyForCards() {
        const counts = new Map(); keys = new Map();
        for (const card of cards) {
            const base = `${card.type}:${card.title}`, n = counts.get(base) || 0;
            counts.set(base,n+1); keys.set(String(card.id), JSON.stringify([card.type,card.title,n]));
        }
    }
    function paintButton(element, pressed) {
        const button=element.querySelector('[data-role="button"]');
        button?.setAttribute('aria-pressed',String(pressed)); button?.classList.toggle('held',pressed);
        const state=element.querySelector('[data-role="button-state"]'); if (state) state.textContent=pressed?'Pressed':'Released';
    }
    function inputEvent(id,event) {
        const message={id:Number(id),owner,sequence:++sequence,event};
        const queue=(inputQueues.get(id) || Promise.resolve()).then(()=>request('input',message)).catch(error => {
            status(error.message); if (event==='down') { held.delete(String(id)); }
        });
        inputQueues.set(id,queue); return queue;
    }
    function release(id) {
        const active=held.get(id); if (!active) return;
        held.delete(id); paintButton(active.element,false); inputEvent(id,'up');
    }
    function releaseAll() { for (const id of [...held.keys()]) release(id); }
    function bindInputs(element,card) {
        const id=String(card.id), options=card.input_options || {};
        if (card.type==='button' && options.button_mode==='momentary') {
            const button=element.querySelector('[data-role="button"]');
            if (!button) return;
            const down = () => {
                if (editing || held.has(id)) return;
                held.set(id,{element}); paintButton(element,true); inputEvent(id,'down');
            };
            button.addEventListener('pointerdown',event => {
                if (event.button!==0) return; event.preventDefault(); button.focus();
                button.setPointerCapture(event.pointerId); down();
            });
            for (const name of ['pointerup','pointercancel','lostpointercapture','blur']) button.addEventListener(name,()=>release(id));
            button.addEventListener('keydown',event => {
                if ([' ','Enter'].includes(event.key)) {event.preventDefault(); if (!event.repeat) down();}
            });
            button.addEventListener('keyup',event => {if ([' ','Enter'].includes(event.key)) {event.preventDefault(); release(id);}});
            // Assistive-technology activation has no preceding pointer or keyboard hold.
            button.addEventListener('click',event => { if (event.detail===0 && !held.has(id)) {down(); release(id);} });
        }
        if (card.type==='slider') {
            const range=element.querySelector('[data-role="input"]'), number=element.querySelector('[data-role="number"]');
            const commit = source => {
                const min=Number(card.min_value ?? 0), max=Number(card.max_value ?? 100), step=Number(options.step || 1);
                const raw=Number(source.value); if (!Number.isFinite(raw)) return;
                const maxTick=Math.floor((max-min)/step+1e-8);
                const tick=Math.max(0,Math.min(maxTick,Math.round((raw-min)/step)));
                const value=Number((min+tick*step).toFixed(10));
                range.value=value; number.value=value;
                apiSet(id,String(value)).then(result=>{if (!result.ok) throw Error(result.error);}).catch(error=>status(error.message));
            };
            range?.addEventListener('input',()=>{number.value=range.value;});
            range?.addEventListener('change',()=>commit(range));
            number?.addEventListener('change',()=>commit(number));
            number?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit(number);}});
        }
    }
    function decorate(element,card) {
        const header=element.querySelector('.card-title');
        header.dataset.layout='move';
        header.setAttribute('role','button');
        header.setAttribute('aria-label','Move card');
        header.title='Drag this header to move the card, or focus it and use arrow keys';
        const resize=document.createElement('button');
        resize.type='button'; resize.dataset.layout='resize'; resize.className='card-resize-handle';
        resize.setAttribute('aria-label','Resize card');
        resize.title='Drag this corner to resize the card, or focus it and use arrow keys';
        element.appendChild(resize); bindInputs(element,card);
        setEditable(element);
        for (const handle of [header,resize]) {
            const resizing=handle.dataset.layout==='resize';
            handle.addEventListener('pointerdown',event=>{
                if (!editing || event.button!==0) return; event.preventDefault();
                handle.focus({preventScroll:true});
                const key=keys.get(String(card.id));
                const model=cards.map(c=>({...c,id:keys.get(String(c.id))}));
                const start={...CodyDashboardLayout.arrange(model,layout,columns())[key]};
                gesture={key,start,previous:JSON.parse(JSON.stringify(layout)),px:event.clientX,py:event.clientY,handle,resizing};
                handle.setPointerCapture(event.pointerId);
            });
            handle.addEventListener('pointermove',event=>{
                if (!gesture || gesture.handle!==handle) return;
                const dx=Math.round((event.clientX-gesture.px)/(gridElement().clientWidth/columns())),dy=Math.round((event.clientY-gesture.py)/114);
                const rect={...gesture.start};
                if(resizing){rect.w=Math.max(1,Math.min(columns()-rect.x,rect.w+dx));rect.h=Math.max(1,Math.min(6,rect.h+dy));}
                else {rect.x=Math.max(0,Math.min(columns()-rect.w,rect.x+dx));rect.y=Math.max(0,Math.min(1000,rect.y+dy));}
                layout[gesture.key]=rect; arrange(); redraw();
            });
            handle.addEventListener('pointerup',()=>{if(gesture?.handle===handle){const key=gesture.key;gesture=null;commitLayout(key);}});
            handle.addEventListener('pointercancel',cancelGesture);
            handle.addEventListener('lostpointercapture',()=>{if(gesture?.handle===handle)cancelGesture();});
            handle.addEventListener('keydown',event=>{
                if(!editing || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
                event.preventDefault();
                const key=keys.get(String(card.id));
                const models=cards.map(c=>({...c,id:keys.get(String(c.id))}));
                const rect={...CodyDashboardLayout.arrange(models,layout,columns())[key]};
                const dx=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,dy=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
                if(resizing){rect.w=Math.max(1,Math.min(columns()-rect.x,rect.w+dx));rect.h=Math.max(1,Math.min(6,rect.h+dy));}
                else{rect.x=Math.max(0,Math.min(columns()-rect.w,rect.x+dx));rect.y=Math.max(0,Math.min(1000,rect.y+dy));}
                layout[key]=rect;commitLayout(key);
            });
        }
    }
    function setEditable(element) {
        const header=element.querySelector('[data-layout="move"]');
        if(header){header.tabIndex=editing?0:-1;header.setAttribute('aria-disabled',String(!editing));}
        const resize=element.querySelector('[data-layout="resize"]');
        if(resize)resize.disabled=!editing;
        const body=element.querySelector('.card-body');if(body)body.inert=editing;
    }
    function cancelGesture(){if(gesture){layout=gesture.previous;gesture=null;arrange();redraw();}}
    function update(next,remote) {
        cards=next; keyForCards();
        if(!dirty && !gesture && remote) layout=Object.fromEntries(Object.entries(remote));
        for(const [id] of held) if(!cards.some(c=>String(c.id)===id)) release(id);
        arrange();
    }
    function initialize() {
        document.getElementById('editLayout').onclick=()=>{
            releaseAll(); cancelGesture(); editing=!editing;
            gridElement().classList.toggle('editing-layout',editing);
            gridElement().querySelectorAll('.card').forEach(setEditable);
            document.getElementById('editLayout').textContent=editing?'Lock layout':'Edit layout';
            document.getElementById('editLayout').setAttribute('aria-pressed',String(editing));
        };
        document.getElementById('resetLayout').onclick=()=>{if(confirm('Reset card positions and sizes?')){cancelGesture();layout={};persist();arrange();redraw();}};
        document.getElementById('downloadDashboard').onclick=async()=>{
            try {
                if(dirty){await request('layout',{layout});dirty=false;}
                const result=await request('export'),url=URL.createObjectURL(new Blob([JSON.stringify(result.dashboard,null,2)],{type:'application/json'}));
                const a=document.createElement('a');a.href=url;a.download='dashboard.codynick-dashboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
            }catch(error){status(error.message);}
        };
        document.getElementById('uploadDashboard').onchange=async event=>{
            const file=event.target.files[0];event.target.value='';if(!file)return;
            try {
                if(file.size>2097152)throw Error('Dashboard file exceeds 2 MB.');
                const snapshot=JSON.parse(await file.text());
                if(!confirm('Replace all current dashboard cards, values and layout? Stop your program before loading.'))return;
                releaseAll();cancelGesture();clearTimeout(saveTimer);
                await request('restore',{dashboard:snapshot});dirty=false;await pollState();status('Dashboard restored. Buttons start released.');
            }catch(error){status(error.message);}
        };
        window.addEventListener('blur',()=>{releaseAll();cancelGesture();});
        document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();cancelGesture();}});
        window.addEventListener('pagehide',releaseAll);
        document.addEventListener('keydown',event=>{if(event.key==='Escape')cancelGesture();});
        setInterval(()=>{for(const id of held.keys())inputEvent(id,'renew');},400);
        new ResizeObserver(()=>{arrange();redraw();}).observe(gridElement());
    }
    function updateButton(element,card) { if(!held.has(String(card.id)))paintButton(element,isOn(card.value)); }
    return {initialize,update,decorate,request,releaseAll,redraw,updateButton};
})();
