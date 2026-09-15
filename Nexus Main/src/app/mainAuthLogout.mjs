export async function requestMainLogout({
  baseUrl,
  token,
  deviceId,
  timeoutMs = 9_000,
  fetchImpl = globalThis.fetch,
}) {
  if (!token) return;
  if (typeof fetchImpl !== "function") {
    throw new Error("Logout ist ohne Fetch-Implementierung nicht verfügbar.");
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${String(baseUrl || "").replace(/\/+$/, "")}/auth/logout`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Nexus-Device-Id": deviceId,
          "X-Nexus-Device-Label": "Nexus Main",
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`Logout wurde von der API abgelehnt (HTTP ${response.status}).`);
    }
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function completeMainLogout({ clearLocal, ...request }) {
  let revoked = false;
  try {
    await requestMainLogout(request);
    revoked = true;
  } catch {
    // Local credentials must still be removed when the server is unreachable.
  } finally {
    clearLocal();
  }
  return { revoked };
}
