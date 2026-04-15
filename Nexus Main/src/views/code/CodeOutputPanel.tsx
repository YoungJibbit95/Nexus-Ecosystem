import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { OutLine, RunBtn } from "./CodeViewPrimitives";

export function CodeOutputPanel({
  outOpen,
  setOutOpen,
  outH,
  output,
  outRef,
  setOutput,
  handleCopyOut,
  copiedOut,
  elapsed,
  run,
  running,
  accent,
  startDrag,
  rgb,
}: {
  outOpen: boolean;
  setOutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  outH: number;
  output: string[];
  outRef: React.RefObject<HTMLDivElement>;
  setOutput: React.Dispatch<React.SetStateAction<string[]>>;
  handleCopyOut: () => void;
  copiedOut: boolean;
  elapsed: number | null;
  run: () => void;
  running: boolean;
  accent: string;
  startDrag: (event: React.MouseEvent) => void;
  rgb: string;
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div
        onMouseDown={startDrag}
        className="nx-surface-row"
        data-active="false"
        style={{
          height: 5,
          cursor: "ns-resize",
          background: "rgba(255,255,255,0.04)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          ["--nx-row-hover-bg" as any]: `rgba(${rgb},0.25)`,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          height: 36,
          background: "rgba(0,0,0,0.2)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => setOutOpen((state) => !state)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            opacity: 0.55,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: 0,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <Terminal size={12} />
          Terminal
          {outOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {elapsed !== null && (
          <span
            style={{
              fontSize: 10,
              opacity: 0.35,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Clock size={9} />
            {elapsed.toFixed(1)}ms
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopyOut}
          className="nx-interactive nx-bounce-target nx-icon-fade"
          style={{
            background: "none",
            border: "none",
            ["--nx-idle-opacity" as any]: 0.4,
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            color: copiedOut ? accent : "inherit",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {copiedOut ? (
            <>
              <span>✓</span> Copied
            </>
          ) : (
            <>
              <Copy size={9} /> Copy
            </>
          )}
        </button>
        <button
          onClick={() => setOutput([])}
          className="nx-interactive nx-bounce-target nx-icon-fade"
          style={{
            background: "none",
            border: "none",
            ["--nx-idle-opacity" as any]: 0.4,
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <RotateCcw size={9} /> Clear
        </button>
        <RunBtn running={running} onClick={run} accent={accent} />
      </div>

      {outOpen && (
        <div
          ref={outRef}
          style={{
            height: outH,
            overflowY: "auto",
            padding: "10px 16px 12px",
            background: "rgba(0,0,0,0.28)",
          }}
        >
          {output.length === 0 ? (
            <div
              style={{
                opacity: 0.25,
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              Ctrl+Enter to run…
            </div>
          ) : (
            output.map((line, index) => <OutLine key={index} text={line} />)
          )}
        </div>
      )}
    </div>
  );
}
