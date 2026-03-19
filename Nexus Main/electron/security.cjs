'use strict';
const { session } = require('electron');

function applySecurityHeaders({ isDev }) {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = isDev
      ? "default-src 'self' data: blob: file: http://localhost:5173 ws://localhost:5173; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173; img-src 'self' data: blob: file: http://localhost:5173; font-src 'self' data: file: http://localhost:5173; connect-src 'self' http://localhost:5173 ws://localhost:5173; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: file:; font-src 'self' data: file:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['no-referrer'],
        'X-Frame-Options': ['DENY'],
        'Permissions-Policy': ['camera=(), microphone=(), geolocation=(), usb=(), payment=()'],
      },
    });
  });
}

module.exports = { applySecurityHeaders };
