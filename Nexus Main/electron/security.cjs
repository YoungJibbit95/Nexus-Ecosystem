'use strict';

const { session } = require('electron');

const STATIC_SECURITY_HEADERS = Object.freeze({
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

const buildContentSecurityPolicy = ({ isDev }) => {
  const connectSrc = isDev
    ? "'self' https://nexus-api.cloud https://staging.nexus-api.cloud http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
    : "'self' https://nexus-api.cloud https://staging.nexus-api.cloud";
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline'"
    : "'self'";
  const styleSrc = isDev
    ? "'self' 'unsafe-inline' https://fonts.googleapis.com"
    : "'self' 'unsafe-inline' https://fonts.googleapis.com";
  const fontSrc = isDev
    ? "'self' data: https://fonts.gstatic.com"
    : "'self' data: https://fonts.gstatic.com";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob:",
    `font-src ${fontSrc}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc}`,
  ].join('; ');
};

const setHeader = (headers, name, value) => {
  headers[name] = [value];
};

function applySecurityHeaders({ isDev }) {
  const targetSession = session.defaultSession;
  const contentSecurityPolicy = buildContentSecurityPolicy({ isDev });

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...(details.responseHeaders || {}),
    };

    for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
      setHeader(responseHeaders, name, value);
    }
    setHeader(responseHeaders, 'Content-Security-Policy', contentSecurityPolicy);

    callback({ responseHeaders });
  });
}

module.exports = { applySecurityHeaders };
