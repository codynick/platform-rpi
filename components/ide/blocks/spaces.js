'use strict';
const BlockSpaces = (() => {
  const names=['simulation','dashboard','sprites'];
  let selected='sprites',visible=true;
  const panel=()=>document.getElementById('liveSpaces');
  function notify(frame,shown) {
    // Contains no data or credentials; child accepts visibility only from its own parent.
    frame?.contentWindow?.postMessage({type:'codynick-space-visibility',visible:shown},'*');
  }
  function apply() {
    const main=document.querySelector('main.main');
    main.classList.toggle('stage-collapsed',!visible);
    document.getElementById('stageToggle').setAttribute('aria-expanded',String(visible));
    document.getElementById('stageToggle').textContent=visible?'Hide Spaces':'Show Spaces';
    for(const name of names) {
      const tab=document.getElementById('space-'+name),view=document.getElementById('space-panel-'+name);
      tab.setAttribute('aria-selected',String(name===selected));tab.tabIndex=name===selected?0:-1;
      view.hidden=name!==selected;
      const frame=view.querySelector('iframe');
      if(frame) {
        const shown=visible && name===selected;
        if(shown && !frame.hasAttribute('src'))frame.src=frame.dataset.src;
        notify(frame,shown);
      }
    }
    if(!visible || selected!=='sprites')SpritePrototype.releaseInputs();
    requestAnimationFrame(()=>Blockly.svgResize(workspace));
  }
  function show(name,save=true) {
    if(!names.includes(name))return;
    selected=name;visible=true;apply();if(save)scheduleSave();
  }
  function initialize() {
    for(const [index,name] of names.entries()) {
      const tab=document.getElementById('space-'+name);
      tab.onclick=()=>show(name);
      tab.onkeydown=event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?names.length-1:(index+(event.key==='ArrowRight'?1:names.length-1))%names.length;
        show(names[next]);document.getElementById('space-'+names[next]).focus();
      };
    }
    document.getElementById('stageToggle').onclick=()=>{visible=!visible;apply();scheduleSave();};
    for(const frame of panel().querySelectorAll('iframe'))frame.addEventListener('load',()=>notify(frame,visible && frame.closest('[role="tabpanel"]').id==='space-panel-'+selected));
    Blockly.serialization.registry.register('codynick_spaces',{
      priority:4,save:()=>({selected,visible}),
      load:data=>{selected=names.includes(data?.selected)?data.selected:'sprites';visible=data?.visible!==false;apply();},
      clear:()=>{selected='sprites';visible=true;apply();}
    });
    new ResizeObserver(()=>Blockly.svgResize(workspace)).observe(panel());
    window.addEventListener('pagehide',()=>panel().querySelectorAll('iframe').forEach(frame=>notify(frame,false)));
    apply();
    initializeExamples();
  }
  async function initializeExamples() {
    const dialog=document.getElementById('blockExamples'),list=document.getElementById('blockExampleList');
    let catalog=[];
    document.getElementById('blockExamplesButton').onclick=async()=>{
      dialog.showModal();
      if(catalog.length){list.onchange();return;}
      const loadButton=document.getElementById('blockExampleLoad');loadButton.disabled=true;
      document.getElementById('blockExampleDescription').textContent='Loading examples…';
      try {
        const response=await fetch('/blocks/examples/catalog.json?v=0.13.0');
        if(!response.ok)throw Error('Example library could not be loaded.');
        catalog=await response.json();list.replaceChildren();
        for(const item of catalog){const option=document.createElement('option');option.value=item.id;option.textContent=item.title;list.append(option);}
        list.onchange=()=>{document.getElementById('blockExampleDescription').textContent=catalog.find(item=>item.id===list.value)?.description || '';};
        list.onchange();
        loadButton.disabled=catalog.length===0;
      }catch(error){document.getElementById('blockExampleDescription').textContent=error.message;}
    };
    document.getElementById('blockExampleLoad').onclick=async()=>{
      const item=catalog.find(item=>item.id===list.value);if(!item || !/^[a-z0-9-]+$/.test(item.id))return;
      if(!NamedDesigns.confirmReplace())return;
      if(!confirm('Load this example? Stop the current program first. '+item.description))return;
      try {
        const response=await fetch('/blocks/examples/'+item.id+'.codynick?v=0.13.0');
        if(!response.ok)throw Error('Example could not be loaded.');
        const data=await response.json(),previous=currentWorkspaceJson();
        try{Blockly.serialization.workspaces.load(data,workspace);}catch(error){Blockly.serialization.workspaces.load(previous,workspace);throw error;}
        document.getElementById('designName').value=item.title;
        show(item.space || 'simulation');
        await Blockly.renderManagement.finishQueuedRenders();
        await new Promise(requestAnimationFrame);
        Blockly.svgResize(workspace);workspace.zoomToFit();workspace.setScale(Math.min(.72,workspace.scale));workspace.scrollCenter();
        updatePythonPreview(true);await saveWorkspaceNow(true);
        dialog.close();toast('Example loaded. '+item.description);
      }catch(error){toast(error.message,true);}
    };
  }
  return {initialize,show};
})();
