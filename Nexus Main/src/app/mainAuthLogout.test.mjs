import assert from "node:assert/strict";
import test from "node:test";
import { completeMainLogout, requestMainLogout } from "./mainAuthLogout.mjs";

test("Main logout revokes the API session with the device identity", async () => {
  let request;
  await requestMainLogout({
    baseUrl: "https://nexus-api.example/",
    token: "session-token",
    deviceId: "nx-main-device",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200 };
    },
  });

  assert.equal(request.url, "https://nexus-api.example/auth/logout");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer session-token");
  assert.equal(request.options.headers["X-Nexus-Device-Id"], "nx-main-device");
});

test("Main logout always clears local credentials when revocation fails", async () => {
  let cleared = false;
  const result = await completeMainLogout({
    baseUrl: "https://nexus-api.example",
    token: "session-token",
    deviceId: "nx-main-device",
    fetchImpl: async () => {
      throw new Error("offline");
    },
    clearLocal: () => {
      cleared = true;
    },
  });

  assert.equal(result.revoked, false);
  assert.equal(cleared, true);
});
