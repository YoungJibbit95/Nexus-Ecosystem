import React from "react";
import { Glass } from "../../components/Glass";
import { DashboardActionButton } from "./DashboardActionButton";

type Props = {
  widgetLabel: string;
  children: React.ReactNode;
  onResetLayout?: () => void;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export class DashboardWidgetErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "unknown",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[Dashboard] widget runtime render failed", {
      widget: this.props.widgetLabel,
      error,
    });
  }

  private recover = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Glass
        style={{
          height: "100%",
          borderRadius: 12,
          border: "1px solid rgba(255,69,58,0.34)",
          background: "rgba(255,69,58,0.1)",
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
          minHeight: 120,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800 }}>
          Widget Safe Mode aktiv
        </div>
        <div style={{ fontSize: 11, opacity: 0.76 }}>
          {this.props.widgetLabel} konnte nicht vollständig gerendert werden.
        </div>
        {this.state.message ? (
          <div style={{ fontSize: 10, opacity: 0.62, wordBreak: "break-word" }}>
            Fehler: {this.state.message}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <DashboardActionButton
            onClick={this.recover}
            liquidColor="#64d2ff"
            style={{
              borderRadius: 8,
              border: "1px solid rgba(100,210,255,0.34)",
              background: "rgba(100,210,255,0.12)",
              color: "#64d2ff",
              fontSize: 10,
              fontWeight: 700,
              padding: "5px 8px",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </DashboardActionButton>
          {this.props.onResetLayout ? (
            <DashboardActionButton
              onClick={this.props.onResetLayout}
              liquidColor="#ff9f0a"
              style={{
                borderRadius: 8,
                border: "1px solid rgba(255,159,10,0.34)",
                background: "rgba(255,159,10,0.12)",
                color: "#ff9f0a",
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 8px",
                cursor: "pointer",
              }}
            >
              Layout resetten
            </DashboardActionButton>
          ) : null}
        </div>
      </Glass>
    );
  }
}

