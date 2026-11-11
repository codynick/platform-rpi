'use strict';

const AdvancedProjects = (() => {
  const get = id => document.getElementById(id);
  const simulator = '/advanced/device.php?action=simulator';
  const stage = '/blocks/stage.php';
  let pending = false;
  let savedView = null;

  async function api(action, options, query = '') {
    const response = await fetch('/advanced/projects.php?action=' + action + query,
      {cache:'no-store', ...options});
    if (action === 'encode' && response.ok) return response.blob();
    const result = await response.json();
    if (!response.ok || !result.ok) {
      const error = Error(result.error || 'Project request failed.');
      error.exists = result.exists === true;
      throw error;
    }
    return result;
  }

  function projectRequest(action, data) {
    return api(action, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
  }

  async function readDevice(url) {
    const response = await fetch(url, {cache:'no-store'});
    const data = await response.json();
    if (!response.ok || data.ok === false) throw Error(data.error || 'Pi tool is unavailable.');
    return data;
  }

  function simulatorOrigin() {
    const address = new URL(location.href);
    address.protocol = 'http:';
    address.port = '8091';
    return address.origin;
  }

  function readView() {
    const frame = get('simulatorFrame');
    if (!frame.hasAttribute('src')) return Promise.resolve(savedView);
    return new Promise(resolve => {
      const timeout = setTimeout(() => finish(savedView), 400);
      function finish(view) {
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        resolve(view);
      }
      function receive(event) {
        if (event.source === frame.contentWindow && event.origin === simulatorOrigin()
            && event.data?.type === 'codynick-advanced-view') finish(event.data.view);
      }
      window.addEventListener('message', receive);
      frame.contentWindow.postMessage({type:'codynick-advanced-view-request'}, simulatorOrigin());
    });
  }

  function restoreView() {
    if (savedView && get('simulatorFrame').hasAttribute('src')) {
      get('simulatorFrame').contentWindow.postMessage(
        {type:'codynick-advanced-view-restore', view:savedView}, simulatorOrigin());
    }
  }

  async function capture() {
    const [dashboard, sim, sprite, simulatorView] = await Promise.all([
      dashboardProjectSnapshot(), readDevice(simulator), readDevice(stage), readView()
    ]);
    const workspace = currentWorkspaceJson();
    workspace.blocks ??= {languageVersion:0, blocks:[]};
    delete workspace.codynick_advanced;
    const {language, source} = AdvancedIDE.state();
    const name = get('designName').value.trim();
    const {selected, visible} = workspace.codynick_spaces;
    const {scene, leds, matrix, seven_segment, ultra_segment} = sim;
    const {x, y, direction, size, backdrop, visible:spriteVisible, speech} = sprite.state;
    return {
      workspace, python:source,
      editor:{language, names:{blocks:name, python:name}, space:selected === 'simulation' ? 'simulator' : selected,
        collapsed:!visible, help:'', console:'', cursorStart:get('advancedPythonSource').selectionStart,
        cursorEnd:get('advancedPythonSource').selectionEnd, scrollTop:0, scrollLeft:0},
      live:{scene, leds, matrix, seven_segment, ultra_segment, widgets:{}, rpiCards:dashboard.cards},
      layout:{...dashboard.layout}, sprite:{x, y, direction, size, backdrop, visible:spriteVisible, speech},
      simulatorView
    };
  }

  function validateWorkspace(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw Error('Invalid Blocks workspace.');
    const blocks = snapshot.blocks?.blocks ?? [];
    if (!Array.isArray(blocks)) throw Error('Invalid Blocks workspace.');
    let count = 0;
    function inspect(block, depth) {
      if (!block || ++count > 2000 || depth > 150 || !Object.hasOwn(Blockly.Blocks, block.type)) {
        throw Error('Project contains an unsupported block.');
      }
      for (const input of Object.values(block.inputs || {})) {
        if (input.block) inspect(input.block, depth + 1);
        if (input.shadow) inspect(input.shadow, depth + 1);
      }
      if (block.next?.block) inspect(block.next.block, depth + 1);
    }
    blocks.forEach(block => inspect(block, 0));
  }

  function dashboard(project) {
    return {format:'codynick-rpi-dashboard', version:1, cards:project.live.rpiCards, layout:project.layout};
  }

  async function ensureStopped() {
    const state = await AdvancedIDE.status();
    if (!['inactive', 'failed'].includes(state)) await postJson('?api=stop', {});
    for (let attempt = 0; ; attempt++) {
      if (!(await readDevice(simulator)).connected) return;
      if (attempt === 15) throw Error('Simulator is still connected. Stop its program and try again.');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  function loadEditor(project) {
    const {language, cursorStart, cursorEnd, space, collapsed} = project.editor;
    const selected = space === 'simulator' ? 'simulation' : space;
    Blockly.serialization.workspaces.load({
      ...project.workspace,
      codynick_advanced:{language, source:project.python},
      codynick_spaces:{selected, visible:!collapsed}
    }, workspace);
    if (Number.isSafeInteger(cursorStart) && Number.isSafeInteger(cursorEnd)) {
      get('advancedPythonSource').setSelectionRange(cursorStart, cursorEnd);
    }
  }

  async function apply(project) {
    validateWorkspace(project.workspace);
    clearTimeout(saveTimer);
    await ensureStopped();
    const previous = await capture();
    const undo = [];
    try {
      undo.push(() => loadEditor(previous));
      loadEditor(project);
      await postJson(simulator, project.live);
      undo.push(() => postJson(simulator, previous.live));
      await postJson(stage, {...project.sprite, action:'restore_project'});
      undo.push(() => postJson(stage, {...previous.sprite, action:'restore_project'}));
      await restoreDashboardProject(dashboard(project));
      savedView = project.simulatorView;
      restoreView();
      await saveWorkspaceNow(true);
    } catch (error) {
      let rollbackFailed = false;
      for (const revert of undo.reverse()) {
        try { await revert(); } catch { rollbackFailed = true; }
      }
      if (rollbackFailed) throw Error(error.message + ' Some previous state could not be restored.');
      throw error;
    }
  }

  async function legacy(snapshot) {
    validateWorkspace(snapshot);
    clearTimeout(saveTimer);
    await ensureStopped();
    const previous = currentWorkspaceJson();
    try {
      Blockly.serialization.workspaces.load({...snapshot, codynick_advanced:{source:'', language:'blocks'}}, workspace);
      if (snapshot.codynick_dashboard) await restoreDashboardProject(snapshot.codynick_dashboard);
      await saveWorkspaceNow(true);
    } catch (error) {
      Blockly.serialization.workspaces.load(previous, workspace);
      throw error;
    }
  }

  function download(blob, extension) {
    const name = (get('designName').value.trim().replace(/[<>:"/\\|?*]/g, '_') || 'Untitled') + extension;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function action(handler) {
    return async (...args) => {
      if (pending || AdvancedIDE.busy()) return;
      pending = true;
      setControlBusy(true);
      try { await handler(...args); }
      catch (error) { toast(error.message, true); }
      finally { pending = false; setControlBusy(false); }
    };
  }

  function initialize() {
    get('simulatorFrame').addEventListener('load', restoreView);
    get('advancedNew').onclick = action(async () => {
      if (!confirm('Start a new project and clear both editors and the three shared spaces?')) return;
      await apply({
        workspace:{blocks:{languageVersion:0, blocks:[]}}, python:'',
        editor:{language:'python', space:'simulator', collapsed:false},
        live:{scene:{gadgets:{cjp:{x:40,y:40}},temperature:21.1}, leds:Array(16).fill('#000000'),
          matrix:{pixels:Array(64).fill(0),text:'',speed:1,mode:'pixels'}, seven_segment:'', ultra_segment:'',
          rpiCards:[]},
        sprite:{x:0,y:0,direction:90,size:100,backdrop:'white',visible:true,speech:''},
        layout:{}, simulatorView:null
      });
      toast('New project.');
    });
    get('advancedSave').onclick = action(async () => {
      const name = get('designName').value.trim();
      if (!name) { get('designName').focus(); throw Error('Enter a project name first.'); }
      const project = await capture();
      try { await projectRequest('save', {name, project}); }
      catch (error) {
        if (!error.exists) throw error;
        if (!confirm('Replace saved project “' + name + '”?')) return;
        await projectRequest('save', {name, project, overwrite:true});
      }
      toast('Project saved.');
    });
    get('advancedOpen').onclick = action(async () => {
      const {projects} = await api('list');
      if (!projects.length) { toast('No saved Advanced IDE projects.'); return; }
      const list = get('advancedProjectList');
      list.replaceChildren(...projects.map(name => new Option(name, name)));
      list.selectedIndex = 0;
      get('advancedOpenDialog').showModal();
    });
    get('advancedLoadProject').onclick = action(async () => {
      const name = get('advancedProjectList').value;
      if (!name || !confirm('Stop any running program and restore both editors and all three spaces?')) return;
      const {project} = await api('load', {}, '&name=' + encodeURIComponent(name));
      await apply(project);
      get('advancedOpenDialog').close();
      toast('Project opened.');
    });
    get('advancedDownload').onclick = action(async () => download(
      await projectRequest('encode', {project:await capture()}), '.codynick'));
    get('advancedUpload').onclick = () => get('advancedArchiveInput').click();
    get('advancedArchiveInput').onchange = action(async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > 8388608) throw Error('Project exceeds 8 MB.');
      const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
      if (header[0] === 80 && header[1] === 75) {
        const {project} = await api('decode', {method:'POST', headers:{'Content-Type':'application/octet-stream'}, body:file});
        if (!confirm('Stop any running program and restore both editors and all three spaces?')) return;
        await apply(project);
      } else {
        if (file.size > 2097152) throw Error('Legacy workspace exceeds 2 MB.');
        const snapshot = JSON.parse(await file.text());
        if (!confirm('Open this legacy Blockly design and its saved dashboard?')) return;
        await legacy(snapshot);
      }
      toast('Project opened.');
    });
    get('advancedImportPython').onclick = () => get('advancedPythonInput').click();
    get('advancedPythonInput').onchange = action(async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > 1048576) throw Error('Python source exceeds 1 MB.');
      if (AdvancedIDE.state().source.trim() && !confirm('Replace this project’s Python source?')) return;
      AdvancedIDE.restore({source:await file.text(), language:'python'});
      scheduleSave();
    });
    get('advancedExportPython').onclick = () => download(
      new Blob([AdvancedIDE.state().source], {type:'text/x-python'}), '.py');
    for (const button of document.querySelectorAll('.advanced-menu button')) {
      button.addEventListener('click', () => { button.closest('details').open = false; });
    }
  }

  return {initialize, busy:() => pending};
})();
