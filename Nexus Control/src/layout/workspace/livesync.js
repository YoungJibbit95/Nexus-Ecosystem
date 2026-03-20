export const liveSyncTabMarkup = () => `
  <section id="tab-livesync" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-livesync">
    <div class="panel-inner">
      <h3>Release Runtime (v2)</h3>
      <div class="grid-2">
        <label>
          App
          <select id="v2-app-select">
            <option value="main">main</option>
            <option value="mobile">mobile</option>
            <option value="code">code</option>
            <option value="code-mobile">code-mobile</option>
          </select>
        </label>
        <label>
          Channel
          <select id="v2-channel-select">
            <option value="production">production</option>
            <option value="staging">staging</option>
          </select>
        </label>
      </div>
      <div class="actions-row">
        <button id="v2-load-runtime" class="btn ghost" type="button">Catalog + Schema + Release laden</button>
        <button id="v2-load-capabilities" class="btn ghost" type="button">Capabilities laden</button>
      </div>
      <pre id="v2-release-output" class="mono-block">Keine Runtime-Daten geladen.</pre>
      <pre id="v2-capabilities-output" class="mono-block">Keine Capabilities geladen.</pre>
    </div>

    <div class="panel-inner">
      <h3>Feature Catalog (staging)</h3>
      <p class="hint">Nur Owner/Admin mit Signatur darf speichern. Promotion nach production via Release Action.</p>
      <textarea id="v2-feature-catalog" rows="16"></textarea>
      <div class="actions-row">
        <button id="v2-save-catalog" class="btn" type="button">Catalog speichern (staging)</button>
      </div>
    </div>

    <div class="panel-inner">
      <h3>Layout Schema Builder (staging)</h3>
      <textarea id="v2-layout-schema" rows="18"></textarea>
      <div class="actions-row">
        <button id="v2-validate-layout" class="btn ghost" type="button">Schema validieren</button>
        <button id="v2-save-layout" class="btn" type="button">Schema speichern (staging)</button>
      </div>
      <pre id="v2-validate-output" class="mono-block">Noch keine Validation ausgefuehrt.</pre>
    </div>

    <div class="panel-inner">
      <h3>Promotion</h3>
      <form id="v2-promote-form" class="grid-2">
        <label>
          Source Channel
          <select id="v2-promote-from">
            <option value="staging">staging</option>
          </select>
        </label>
        <label>
          Target Channel
          <select id="v2-promote-to">
            <option value="production">production</option>
          </select>
        </label>
        <label class="wide">
          Promotion Note
          <input id="v2-promote-note" type="text" placeholder="release candidate passed" />
        </label>
        <div class="actions-row">
          <button id="v2-promote-release" class="btn" type="submit">Release promoten</button>
        </div>
      </form>
    </div>
  </section>
`
