<section class="advanced-console" aria-label="Program console">
  <div class="advanced-console-bar">
    <strong>Program Console</strong>
    <span id="advancedRunStatus" role="status">Checking Pi script service…</span>
    <button type="button" id="advancedClearConsole">Clear view</button>
  </div>
  <pre id="advancedConsole" aria-label="Program output" tabindex="0"></pre>
</section>
<dialog id="advancedOpenDialog" class="design-dialog">
  <h2>Open Saved Project</h2>
  <label for="advancedProjectList">Projects on this Pi</label>
  <select id="advancedProjectList" size="7"></select>
  <form method="dialog" class="design-actions">
    <button>Cancel</button><button id="advancedLoadProject" type="button">Open</button>
  </form>
</dialog>
