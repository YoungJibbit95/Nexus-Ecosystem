'use strict';
const { session } = require('electron');

function applySecurityHeaders({ isDev }) {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: filesystem: file: http://localhost:5173 ws://localhost:5173;"
      : "default-src 'self' data: blob: filesystem: file:; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; font-src 'self' data: file:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

module.exports = { applySecurityHeaders };
