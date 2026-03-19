'use strict';

function applySecurityHeaders({ isDev }) {
  // Intentionally no-op.
  // Global request interception via defaultSession.webRequest is disabled
  // to keep networking scoped to the app process only.
  void isDev;
}

module.exports = { applySecurityHeaders };
