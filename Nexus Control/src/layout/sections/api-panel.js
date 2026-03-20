export const apiPanelMarkup = () => `
  <section class="panel api-panel">
    <h2>API Verbindung</h2>
    <form id="api-settings-form" class="grid-2">
      <label>
        Control API URL
        <input id="api-base-url" type="url" placeholder="https://nexus-api.dev" required />
      </label>
      <label>
        Ingest Key (optional)
        <input id="api-ingest-key" type="text" placeholder="main-local-dev-key" />
      </label>
      <label>
        Device ID (verifiziert)
        <input id="device-id" type="text" readonly />
      </label>
      <label>
        Mutation Signing Secret
        <input id="mutation-signing-secret" type="password" placeholder="owner-signing-secret" autocomplete="off" />
      </label>
      <div class="actions-row">
        <button class="btn" type="submit">Speichern</button>
      </div>
    </form>
    <p class="hint">Nur fuer mutierende Aktionen gebraucht. Wird nur in dieser Browser-Session gehalten.</p>
    <p id="bootstrap-info" class="hint">Backend Handshake: ausstehend</p>
    <p id="status-line" class="status" role="status" aria-live="polite">Bereit.</p>
  </section>
`
