export const dashboardTabMarkup = () => `
  <section id="tab-dashboard" class="tab-panel active" role="tabpanel" aria-labelledby="tab-btn-dashboard">
    <div class="cards">
      <article class="card">
        <h3>Online Apps</h3>
        <p id="metric-online" class="metric">-</p>
      </article>
      <article class="card">
        <h3>Stale Apps</h3>
        <p id="metric-stale" class="metric">-</p>
      </article>
      <article class="card">
        <h3>Events Total</h3>
        <p id="metric-events" class="metric">-</p>
      </article>
      <article class="card">
        <h3>Avg View Render (ms)</h3>
        <p id="metric-render" class="metric">-</p>
      </article>
    </div>

    <div class="panel-inner">
      <h3>App Registry</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>App</th>
              <th>Status</th>
              <th>Version</th>
              <th>Last Seen</th>
              <th>Route</th>
              <th>Events</th>
              <th>Stale</th>
            </tr>
          </thead>
          <tbody id="apps-table-body"></tbody>
        </table>
      </div>
    </div>
  </section>
`
