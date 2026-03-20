export const commandsTabMarkup = () => `
  <section id="tab-commands" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-commands">
    <div class="panel-inner">
      <h3>Command Center</h3>
      <form id="command-form" class="grid-2">
        <label>
          Target App
          <select id="command-target" required>
            <option value="main">main</option>
            <option value="mobile">mobile</option>
            <option value="code">code</option>
            <option value="code-mobile">code-mobile</option>
            <option value="control">control</option>
          </select>
        </label>
        <label>
          Command Type
          <input id="command-type" type="text" placeholder="sync-config" required />
        </label>
        <label>
          Priority
          <select id="command-priority">
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="low">low</option>
          </select>
        </label>
        <label>
          TTL (ms)
          <input id="command-ttl" type="number" value="60000" min="1000" max="600000" />
        </label>
        <label class="wide">
          Idempotency Key (optional)
          <input id="command-idempotency" type="text" placeholder="cmd-sync-main-001" />
        </label>
        <label class="wide">
          Payload JSON
          <textarea id="command-payload" rows="8">{"reason":"manual-trigger"}</textarea>
        </label>
        <div class="actions-row">
          <button id="command-submit-btn" class="btn" type="submit">Command erstellen</button>
        </div>
      </form>
    </div>

    <div class="panel-inner">
      <h3>Command Queue</h3>
      <pre id="commands-list" class="mono-block">[]</pre>
    </div>
  </section>
`
