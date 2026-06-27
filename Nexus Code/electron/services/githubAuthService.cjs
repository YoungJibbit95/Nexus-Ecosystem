"use strict";

const crypto = require("crypto");

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const DEFAULT_SCOPES = ["repo", "read:user", "user:email"];
const TOKEN_SERVICE = "github";
const USER_AGENT = "Nexus-Code-Electron";

const assertClientId = (value) => {
  const clientId = String(value || process.env.NEXUS_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "").trim();
  if (!clientId || clientId.includes("\0") || clientId.length > 256) {
    throw new Error("GitHub OAuth client_id is required.");
  }
  return clientId;
};

const normalizeScopes = (value) => {
  const scopes = Array.isArray(value)
    ? value
    : String(value || DEFAULT_SCOPES.join(" ")).split(/[\s,]+/);
  return scopes
    .map((scope) => String(scope || "").trim())
    .filter(Boolean)
    .filter((scope, index, all) => all.indexOf(scope) === index)
    .slice(0, 20);
};

const postGithubForm = async (url, fields) => {
  const body = new URLSearchParams(fields);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error_description || data?.message || "GitHub request failed.");
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const createGithubAuthService = ({ tokenStore }) => {
  const pendingFlows = new Map();

  return {
    async getAuthStatus() {
      const metadata = await tokenStore.getMetadata(TOKEN_SERVICE);
      if (!metadata) {
        return {
          authenticated: false,
          metadata: null,
        };
      }

      let token = null;
      let unavailable = false;
      try {
        token = await tokenStore.getToken(TOKEN_SERVICE);
      } catch {
        unavailable = true;
      }
      return {
        authenticated: Boolean(token),
        metadata,
        unavailable,
      };
    },

    async startDeviceFlow(options = {}) {
      const clientId = assertClientId(options.clientId);
      const scopes = normalizeScopes(options.scopes);
      const data = await postGithubForm(GITHUB_DEVICE_CODE_URL, {
        client_id: clientId,
        scope: scopes.join(" "),
      });

      if (!data.device_code || !data.user_code) {
        throw new Error("GitHub did not return a device code.");
      }

      const flowId = crypto.randomUUID();
      const expiresIn = Number(data.expires_in || 900);
      pendingFlows.set(flowId, {
        clientId,
        deviceCode: data.device_code,
        interval: Math.max(5, Number(data.interval || 5)),
        expiresAt: Date.now() + expiresIn * 1000,
        scopes,
      });

      return {
        flowId,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        verificationUriComplete: data.verification_uri_complete,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        interval: Math.max(5, Number(data.interval || 5)),
        scopes,
      };
    },

    async pollDeviceFlow(options = {}) {
      const flowId = String(options.flowId || "").trim();
      const flow = pendingFlows.get(flowId);
      if (!flow) throw new Error("GitHub device flow was not found or has expired.");
      if (Date.now() > flow.expiresAt) {
        pendingFlows.delete(flowId);
        throw new Error("GitHub device flow expired.");
      }

      const data = await postGithubForm(GITHUB_ACCESS_TOKEN_URL, {
        client_id: flow.clientId,
        device_code: flow.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });

      if (data.error === "authorization_pending") {
        return { authenticated: false, pending: true, interval: flow.interval };
      }

      if (data.error === "slow_down") {
        flow.interval += 5;
        return { authenticated: false, pending: true, interval: flow.interval };
      }

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (!data.access_token) {
        throw new Error("GitHub did not return an access token.");
      }

      pendingFlows.delete(flowId);
      const stored = await tokenStore.setToken(TOKEN_SERVICE, data.access_token, {
        scope: data.scope || flow.scopes.join(" "),
        tokenType: data.token_type || "bearer",
        createdAt: new Date().toISOString(),
      });

      return {
        authenticated: true,
        pending: false,
        metadata: stored,
      };
    },

    async signOut() {
      const deleted = await tokenStore.deleteToken(TOKEN_SERVICE);
      return { signedOut: deleted };
    },
  };
};

module.exports = {
  TOKEN_SERVICE,
  createGithubAuthService,
};
