export const buildTabMarkup = () => `
  <section id="tab-build" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-build">
    <div class="panel-inner">
      <h3>Build Manifest</h3>
      <p class="hint">Zeigt den letzten zentralen Ecosystem-Build aus <code>build/manifest.json</code>.</p>
      <div class="actions-row">
        <button id="build-manifest-refresh" class="btn ghost" type="button">Manifest laden</button>
      </div>
      <pre id="build-manifest" class="mono-block">Noch kein Manifest geladen.</pre>
    </div>

    <div class="panel-inner">
      <h3>Build Command Guide</h3>
      <pre class="guide-block">npm run build
npm run build:ecosystem:fast
npm run build:main
npm run build:code
npm run build:mobile
npm run build:code-mobile
npm run verify:ecosystem</pre>
    </div>
  </section>
`
