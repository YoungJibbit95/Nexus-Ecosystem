export const topbarMarkup = () => `
  <header class="topbar">
    <div>
      <p class="eyebrow">Nexus Ecosystem</p>
      <h1>Nexus Control</h1>
      <p class="muted">Control Plane UI fuer Registry, Security, Config, Commands und Guides.</p>
      <div class="session-bar">
        <span id="session-role-badge" class="chip stale">nicht eingeloggt</span>
        <span id="session-capabilities" class="hint">Readonly bis Login.</span>
      </div>
    </div>
    <div class="topbar-actions">
      <button id="refresh-btn" class="btn ghost">Aktualisieren</button>
      <button id="logout-btn" class="btn danger">Logout</button>
    </div>
  </header>
`
