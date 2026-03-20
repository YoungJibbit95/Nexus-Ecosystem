export const workspaceNavMarkup = () => `
  <nav class="tabs" role="tablist" aria-label="Nexus Control Bereiche">
    <button id="tab-btn-dashboard" data-tab="dashboard" class="tab active" role="tab" aria-selected="true" aria-controls="tab-dashboard">Dashboard</button>
    <button id="tab-btn-build" data-tab="build" class="tab" role="tab" aria-selected="false" aria-controls="tab-build">Build</button>
    <button id="tab-btn-livesync" data-tab="livesync" class="tab" role="tab" aria-selected="false" aria-controls="tab-livesync">Live Sync</button>
    <button id="tab-btn-settings" data-tab="settings" class="tab" role="tab" aria-selected="false" aria-controls="tab-settings">Settings</button>
    <button id="tab-btn-commands" data-tab="commands" class="tab" role="tab" aria-selected="false" aria-controls="tab-commands">Commands</button>
    <button id="tab-btn-policies" data-tab="policies" class="tab" role="tab" aria-selected="false" aria-controls="tab-policies">Policies</button>
    <button id="tab-btn-paywalls" data-tab="paywalls" class="tab" role="tab" aria-selected="false" aria-controls="tab-paywalls">Paywalls</button>
    <button id="tab-btn-devices" data-tab="devices" class="tab" role="tab" aria-selected="false" aria-controls="tab-devices">Devices</button>
    <button id="tab-btn-audit" data-tab="audit" class="tab" role="tab" aria-selected="false" aria-controls="tab-audit">Audit</button>
    <button id="tab-btn-guides" data-tab="guides" class="tab" role="tab" aria-selected="false" aria-controls="tab-guides">Guides</button>
  </nav>
`
