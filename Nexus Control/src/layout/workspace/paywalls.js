export const paywallsTabMarkup = () => `
  <section id="tab-paywalls" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-paywalls">
    <div class="panel-inner">
      <h3>View Paywalls</h3>
      <p class="hint">Definiert, welche Views je Tier geladen werden duerfen. Nicht geladene Views werden API-seitig blockiert.</p>
      <form id="paywall-form" class="grid-2">
        <label>
          Paywalls aktiv
          <select id="paywall-enabled">
            <option value="false">Nein</option>
            <option value="true">Ja</option>
          </select>
        </label>
        <label>
          Default Tier
          <select id="paywall-default-tier">
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
        </label>
      </form>
    </div>

    <div class="panel-inner">
      <h3>Tier Templates</h3>
      <p class="hint">Views als CSV-Liste, z.B. <code>dashboard,notes,tasks</code>.</p>
      <div class="grid-2">
        <label>Free · main <input id="paywall-free-main" type="text" /></label>
        <label>Paid · main <input id="paywall-paid-main" type="text" /></label>
        <label>Free · mobile <input id="paywall-free-mobile" type="text" /></label>
        <label>Paid · mobile <input id="paywall-paid-mobile" type="text" /></label>
        <label>Free · code <input id="paywall-free-code" type="text" /></label>
        <label>Paid · code <input id="paywall-paid-code" type="text" /></label>
        <label>Free · code-mobile <input id="paywall-free-code-mobile" type="text" /></label>
        <label>Paid · code-mobile <input id="paywall-paid-code-mobile" type="text" /></label>
      </div>
    </div>

    <div class="panel-inner">
      <h3>User Templates</h3>
      <p class="hint">Usernames als CSV. Diese Mappings setzen die Tier-Zuordnung serverseitig.</p>
      <div class="grid-2">
        <label class="wide">
          Free User (CSV)
          <textarea id="paywall-users-free" rows="3" placeholder="free_demo,guest_user"></textarea>
        </label>
        <label class="wide">
          Paid User (CSV)
          <textarea id="paywall-users-paid" rows="3" placeholder="paid_demo,premium_user"></textarea>
        </label>
      </div>
      <div class="actions-row">
        <button id="save-paywalls" class="btn" type="button">Paywalls speichern</button>
      </div>
    </div>
  </section>
`
