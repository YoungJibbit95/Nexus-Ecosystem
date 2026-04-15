import React from "react";

type Props = {
  viewId: string;
  children: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  message: string;
  retryKey: number;
};

export class ViewErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
    retryKey: 0,
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error || "Unknown error"),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error(`[ViewErrorBoundary:${this.props.viewId}]`, error, info);
  }

  private retry = () => {
    this.setState((prev) => ({
      hasError: false,
      message: "",
      retryKey: prev.retryKey + 1,
    }));
  };

  private resetAndRetry = () => {
    try {
      this.props.onReset?.();
    } catch (error) {
      console.warn(`[ViewErrorBoundary:${this.props.viewId}] reset failed`, error);
    }
    this.retry();
  };

  render() {
    if (!this.state.hasError) {
      return (
        <React.Fragment key={`${this.props.viewId}:${this.state.retryKey}`}>
          {this.props.children}
        </React.Fragment>
      );
    }

    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "min(680px, 100%)",
            borderRadius: 14,
            border: "1px solid rgba(255,99,71,0.45)",
            background: "rgba(20,20,26,0.72)",
            backdropFilter: "blur(12px)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            View konnte nicht gerendert werden
          </div>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            {this.props.viewId} ist auf einen Laufzeitfehler gelaufen und wurde abgefangen.
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, wordBreak: "break-word" }}>
            Fehler: <code>{this.state.message || "Unknown render error"}</code>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={this.retry}
              style={{
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "inherit",
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
            {this.props.onReset ? (
              <button
                onClick={this.resetAndRetry}
                style={{
                  borderRadius: 9,
                  border: "1px solid rgba(0,122,255,0.45)",
                  background: "rgba(0,122,255,0.14)",
                  color: "#7cb6ff",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                View-State zurücksetzen & neu laden
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default ViewErrorBoundary;
