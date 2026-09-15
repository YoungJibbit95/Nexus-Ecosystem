export const requestCodeMobileLogout = async ({
  baseUrl,
  token,
  deviceId,
  fetchImpl = globalThis.fetch,
  timeoutMs = 5_000,
}) => {
  if (!token) return;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(`${String(baseUrl || "").replace(/\/+$/, "")}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Nexus-Device-Id": deviceId,
      },
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const completeCodeMobileLogout = async ({ revoke, clearLocal }) => {
  try {
    await revoke();
  } catch {
    // Server revocation is best-effort; local credentials must still disappear.
  } finally {
    clearLocal();
  }
};
