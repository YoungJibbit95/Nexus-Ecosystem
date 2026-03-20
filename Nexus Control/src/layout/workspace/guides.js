export const guidesTabMarkup = () => `
  <section id="tab-guides" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-guides">
    <div class="panel-inner">
      <h3>API Guides</h3>
      <div class="inline-form">
        <select id="guide-select"></select>
        <button id="load-guide" class="btn ghost">Guide laden</button>
      </div>
      <pre id="guide-content" class="guide-block">Kein Guide geladen.</pre>
    </div>
  </section>
`
