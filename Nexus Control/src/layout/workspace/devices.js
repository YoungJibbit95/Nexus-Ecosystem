export const devicesTabMarkup = () => `
  <section id="tab-devices" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-devices">
    <div class="panel-inner">
      <h3>Device Allowlist (Admin)</h3>
      <form id="device-form" class="grid-2">
        <label>
          Device ID
          <input id="device-manage-id" type="text" placeholder="nxdev-..." required />
        </label>
        <label>
          Label
          <input id="device-manage-label" type="text" placeholder="MacBook-Pro-Dev" />
        </label>
        <label class="wide">
          Rollen (CSV)
          <input id="device-manage-roles" type="text" value="admin,developer" />
        </label>
        <div class="actions-row">
          <button id="device-approve-btn" class="btn" type="button">Geraet freigeben</button>
          <button id="device-revoke-btn" class="btn danger" type="button">Geraet sperren</button>
          <button id="device-refresh-btn" class="btn ghost" type="button">Liste laden</button>
        </div>
      </form>
    </div>

    <div class="panel-inner">
      <h3>Devices</h3>
      <pre id="devices-list" class="mono-block">[]</pre>
    </div>
  </section>
`
