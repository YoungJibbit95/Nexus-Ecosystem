import React from "react";
import AccountPanel from "../components/editor/AccountPanel.jsx";
import WelcomeScreen from "../components/editor/WelcomeScreen.jsx";
import Editor from "../pages/Editor.jsx";
import {
  UI_SMOKE_FIXTURE_ACCOUNT_SESSION,
  UI_SMOKE_FIXTURE_CONTROL_STATUS,
  createUiSmokeCallbacks,
} from "./uiSmokeFixtures";

const noop = () => {};

function SmokeViewport({ children }) {
  return (
    <section
      data-ui-smoke-root="nexus-code"
      style={{
        width: 1440,
        height: 900,
        color: "var(--nexus-text, #e5e7eb)",
        background: "#050712",
      }}
    >
      {children}
    </section>
  );
}

export const UI_SMOKE_HARNESS_METADATA = Object.freeze({
  testOnly: true,
  scope: "Nexus Code/src/testing",
  importsProductionBoot: false,
});

export function createUiSmokeScenarios() {
  const callbacks = createUiSmokeCallbacks();

  return [
    {
      id: "workbench-shell",
      title: "Workbench shell with account fixture",
      expectedText: [
        "data-ui-smoke-root",
        "nx-code-shell",
        "nx-code-workbench",
        "Nexus Code",
        "New scratch file",
      ],
      render: () => (
        <SmokeViewport>
          <Editor
            accountSession={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...callbacks}
          />
        </SmokeViewport>
      ),
    },
    {
      id: "launchpad",
      title: "Launchpad welcome surface",
      expectedText: [
        "nx-code-launchpad",
        "Productive flows",
        "Ready surfaces",
        "Local editing with terminal",
      ],
      render: () => (
        <SmokeViewport>
          <WelcomeScreen
            onNewFile={noop}
            onOpenFolder={noop}
            onOpenSettings={noop}
          />
        </SmokeViewport>
      ),
    },
    {
      id: "account-panel",
      title: "Account panel with strict-ready fixture",
      expectedText: [
        "Nexus Account",
        "UI smoke control fixture",
        "Identity",
        "Token",
        "Present",
      ],
      render: () => (
        <SmokeViewport>
          <AccountPanel
            session={UI_SMOKE_FIXTURE_ACCOUNT_SESSION}
            controlStatus={UI_SMOKE_FIXTURE_CONTROL_STATUS}
            {...callbacks}
          />
        </SmokeViewport>
      ),
    },
  ];
}

export function assertUiSmokeMarkup(scenario, markup) {
  const missing = (scenario.expectedText || []).filter(
    (marker) => !markup.includes(marker),
  );

  return {
    ok: missing.length === 0,
    missing,
    bytes: Buffer.byteLength(markup, "utf8"),
  };
}
