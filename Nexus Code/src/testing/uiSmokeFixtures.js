export const UI_SMOKE_FIXTURE_ACCOUNT_SESSION = Object.freeze({
  endpoint: "https://nexus-api.cloud/workspaces/ui-smoke-long-endpoint-label",
  token: "ui-smoke-fixture-token-with-long-readable-status",
  userId: "ui-smoke-user-with-long-readable-identity-label",
  username: "ui-smoke-renderer-validation-user-with-long-visible-label",
  userTier: "pro",
  savedAt: "2026-06-28T00:00:00.000Z",
});

export const UI_SMOKE_FIXTURE_CONTROL_STATUS = Object.freeze({
  mode: "online",
  title: "UI smoke control fixture with long account status label",
  message:
    "Test-only control fixture is available for component rendering with long visible status text.",
  details: [
    "Fixture session is scoped to src/testing with intentionally long copy.",
    "Normal App.jsx account gate is not imported.",
  ],
});

export const UI_SMOKE_FIXTURE_LONG_LABELS = Object.freeze([
  UI_SMOKE_FIXTURE_ACCOUNT_SESSION.username,
  UI_SMOKE_FIXTURE_CONTROL_STATUS.title,
  UI_SMOKE_FIXTURE_CONTROL_STATUS.message,
]);

export const UI_SMOKE_FIXTURE_GITHUB_REPOSITORY =
  "YoungJibbit95/Nexus-Ecosystem";

export const UI_SMOKE_FIXTURE_GITHUB_PROJECT_OWNER = "YoungJibbit95";

export const UI_SMOKE_FIXTURE_WORKSPACE_PATH =
  "F:\\Coding\\Nexus Workspace\\Nexus-Ecosystem";

export const UI_SMOKE_FIXTURE_LONG_EDITOR_CODE = Array.from(
  { length: 180 },
  (_, index) => {
    const line = String(index + 1).padStart(3, "0");
    return [
      `// Nexus Code editor scroll contract ${line}`,
      `export function smokeScrollLine${line}(input: number): string {`,
      `  const nextValue = input + ${index + 1};`,
      `  return nextValue > 42 ? "highlight-${line}" : String(nextValue);`,
      `}`,
    ].join("\n");
  },
).join("\n");

export const UI_SMOKE_FIXTURE_FILE_TREE = Object.freeze([
  {
    id: "readme",
    name: "README.md",
    type: "file",
    parentId: null,
    content: "# Nexus Code",
  },
  {
    id: "package-json",
    name: "package.json",
    type: "file",
    parentId: null,
    content: "{}",
  },
  {
    id: "src",
    name: "src",
    type: "folder",
    parentId: null,
    isOpen: true,
  },
  {
    id: "docs",
    name: "docs",
    type: "folder",
    parentId: null,
    isOpen: true,
  },
  {
    id: "components",
    name: "components",
    type: "folder",
    parentId: "src",
    isOpen: true,
  },
  {
    id: "editor-page",
    name: "Editor.jsx",
    type: "file",
    parentId: "src",
    content: "export default function Editor() {}",
  },
  {
    id: "file-explorer",
    name: "FileExplorer.jsx",
    type: "file",
    parentId: "components",
    content: "export default function FileExplorer() {}",
  },
  {
    id: "welcome-screen",
    name: "WelcomeScreen.jsx",
    type: "file",
    parentId: "components",
    content: "export default function WelcomeScreen() {}",
  },
  {
    id: "release-checklist",
    name: "release-checklist.md",
    type: "file",
    parentId: "docs",
    content: "- smoke",
  },
]);

export function createUiSmokeSettingsFixture(baseSettings = {}) {
  return {
    ...baseSettings,
    reduce_motion: true,
    animations_enabled: false,
    animation_speed: 0.75,
    font_family: "JetBrains Mono UI smoke readable long font label",
    visual_performance_profile: "balanced",
  };
}

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
