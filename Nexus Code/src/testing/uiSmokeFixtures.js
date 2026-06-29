export const UI_SMOKE_FIXTURE_ACCOUNT_SESSION = Object.freeze({
  endpoint: "https://nexus-api.cloud",
  token: "ui-smoke-fixture-token",
  userId: "ui-smoke-user",
  username: "ui-smoke",
  userTier: "pro",
  savedAt: "2026-06-28T00:00:00.000Z",
});

export const UI_SMOKE_FIXTURE_CONTROL_STATUS = Object.freeze({
  mode: "online",
  title: "UI smoke control fixture",
  message: "Test-only control fixture is available for component rendering.",
  details: [
    "Fixture session is scoped to src/testing.",
    "Normal App.jsx account gate is not imported.",
  ],
});

export function createUiSmokeCallbacks() {
  return {
    onSaveAccountSession(session) {
      return {
        ...UI_SMOKE_FIXTURE_ACCOUNT_SESSION,
        ...(session || {}),
        savedAt: session?.savedAt || UI_SMOKE_FIXTURE_ACCOUNT_SESSION.savedAt,
      };
    },
    onClearAccountSession() {
      return {
        endpoint: UI_SMOKE_FIXTURE_ACCOUNT_SESSION.endpoint,
        token: "",
        userId: "",
        username: "",
        userTier: "free",
        savedAt: null,
      };
    },
    async onTestAccountConnection() {
      return {
        mode: "online",
        message: "UI smoke fixture connection succeeded.",
        details: ["No network request was made."],
      };
    },
  };
}
