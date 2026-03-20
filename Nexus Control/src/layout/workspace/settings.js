export const settingsTabMarkup = () => `
  <section id="tab-settings" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-settings">
    <div class="panel-inner">
      <h3>Global Config</h3>
      <textarea id="global-config" rows="14"></textarea>
      <div class="actions-row">
        <button id="save-global-config" class="btn">Global Config speichern</button>
      </div>
    </div>

    <div class="panel-inner">
      <h3>App Config</h3>
      <div class="inline-form">
        <select id="app-config-select">
          <option value="main">main</option>
          <option value="mobile">mobile</option>
          <option value="code">code</option>
          <option value="code-mobile">code-mobile</option>
          <option value="control">control</option>
        </select>
        <button id="load-app-config" class="btn ghost">Laden</button>
      </div>
      <textarea id="app-config" rows="14"></textarea>
      <div class="actions-row">
        <button id="save-app-config" class="btn">App Config speichern</button>
      </div>
    </div>
  </section>
`
