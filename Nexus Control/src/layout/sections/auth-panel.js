export const authPanelMarkup = () => `
  <section id="auth-panel" class="panel">
    <h2>Login</h2>
    <form id="login-form" class="grid-2">
      <label>
        Benutzername
        <input id="login-username" type="text" autocomplete="username" required />
      </label>
      <label>
        Passwort
        <input id="login-password" type="password" autocomplete="current-password" required />
      </label>
      <div class="actions-row">
        <button class="btn" type="submit">Einloggen</button>
      </div>
    </form>
    <p class="hint">Default Local Dev Accounts stehen im Control-Plane README.</p>
  </section>
`
