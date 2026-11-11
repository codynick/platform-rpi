'use strict';

const AdvancedIDE = (() => {
  const get = id => document.getElementById(id);
  let language = 'blocks';
  let busy = false;
  let offset = -1;
  let fileId = '';
  let generation = 0;
  let terminal;

  function select(next, save = true) {
    language = next === 'python' ? 'python' : 'blocks';
    const python = language === 'python';
    get('advancedBlocksTab').setAttribute('aria-selected', String(!python));
    get('advancedBlocksTab').tabIndex = python ? -1 : 0;
    get('advancedPythonTab').setAttribute('aria-selected', String(python));
    get('advancedPythonTab').tabIndex = python ? 0 : -1;
    get('toolboxWorkspace').hidden = python;
    get('advancedPythonPanel').hidden = !python;
    document.querySelector('.advanced-ide .toolbox-modes').hidden = python;
    if (!python) requestAnimationFrame(() => Blockly.svgResize(workspace));
    if (save) scheduleSave();
  }

  function state() { return {language, source:get('advancedPythonSource').value}; }
  function restore(data) {
    get('advancedPythonSource').value = typeof data?.source === 'string' ? data.source : '';
    select(data?.language, false);
  }

  async function status() {
    const result = await fetch('/advanced/device.php?action=status', {cache:'no-store'});
    if (!result.ok) throw Error('Pi script service status is unavailable.');
    const {state} = await result.json();
    get('advancedRunStatus').textContent = {
      active:'A program is running on the Pi', activating:'Starting program…',
      deactivating:'Stopping program…', reloading:'Restarting program…',
      failed:'Program failed. See console.', inactive:'Pi ready', unknown:'Pi script status unavailable'
    }[state] || 'Pi script status unavailable';
    return state;
  }

  async function poll() {
    if (document.visibilityState === 'hidden') return;
    await status().catch(() => { get('advancedRunStatus').textContent = 'Pi script status unavailable'; });
    const current = generation;
    const node = get('advancedConsole');
    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 24;
    try {
      const params = new URLSearchParams({action:'logs', offset, fileId});
      const response = await fetch('/code/?' + params, {cache:'no-store'});
      const data = await response.json();
      if (!response.ok || !data.ok || current !== generation) return;
      if (data.reset || offset < 0) terminal.reset();
      terminal.append(data.content || '');
      offset = data.offset;
      fileId = data.fileId || '';
      if (atBottom) node.scrollTop = node.scrollHeight;
    } catch (error) {
      if (current === generation && offset < 0) node.textContent = 'Waiting for program output…';
    }
  }

  async function control(action) {
    if (busy || AdvancedProjects.busy()) return;
    busy = true;
    setControlBusy(true);
    try {
      if (action === 'stop') {
        await postJson('?api=stop', {});
      } else {
        const python = language === 'python' ? state().source : generatePython();
        if (!python.trim()) throw Error('Add Python code before running.');
        const payload = {python, workspace:currentWorkspaceJson()};
        const runRequest = async replace => {
          const response = await fetch('?api=run', {method:'POST',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify({...payload, replace})});
          const result = await response.json();
          if (response.status === 409 && result.confirmReplace) return false;
          if (!response.ok || !result.ok) throw Error(result.error || 'Could not run the program.');
          return true;
        };
        if (!(await runRequest(false))) {
          if (!confirm('A program may already be running on this Pi. Stop it and run this program?')) return;
          if (!(await runRequest(true))) throw Error('The Pi declined to replace the running program.');
        }
      }
      await status();
    } catch (error) { toast(error.message, true); }
    finally { busy = false; setControlBusy(false); }
  }

  function initialize() {
    for (const [id, mode, other] of [
      ['advancedBlocksTab', 'blocks', 'python'], ['advancedPythonTab', 'python', 'blocks']
    ]) {
      const button = get(id);
      button.onclick = () => select(mode);
      button.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const target = event.key === 'Home' ? 'blocks' : event.key === 'End' ? 'python' : other;
        select(target);
        get(target === 'python' ? 'advancedPythonTab' : 'advancedBlocksTab').focus();
      };
    }
    Blockly.serialization.registry.register('codynick_advanced', {
      priority:3, save:state, load:restore, clear:() => restore(null)
    });
    const source = get('advancedPythonSource');
    source.addEventListener('input', scheduleSave);
    source.addEventListener('keydown', event => {
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        source.setRangeText('    ', source.selectionStart, source.selectionEnd, 'end');
        scheduleSave();
      }
    });
    get('advancedGenerate').onclick = () => {
      if (source.value.trim() && !confirm('Replace this Python source with code generated from Blocks?')) return;
      try { source.value = generatePython(); scheduleSave(); }
      catch (error) { toast(error.message, true); }
    };
    terminal = new CodyNickAnsi.AnsiTerminal(get('advancedConsole'));
    get('advancedClearConsole').onclick = () => { generation++; terminal.reset(); };
    AdvancedProjects.initialize();
    async function update() {
      await poll();
      setTimeout(update, 1000);
    }
    update();
  }

  return {initialize, state, restore, status, busy:() => busy,
    run:() => control('run'), stop:() => control('stop')};
})();
