import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";

type CalculatorInput = {
  l: string;
  v: number;
  min: number;
  max: number;
  step?: number;
  color?: string;
};

type CalculatorItem = {
  name: string;
  fn: (a: number, b: string, c: number) => string;
  inputs: CalculatorInput[];
};

type CalculatorCategory = {
  cat: string;
  items: CalculatorItem[];
};

const CALC_CATS: CalculatorCategory[] = [
  {
    cat: "Spacing",
    items: [
      { name: "px -> rem", fn: (a) => `${(a / 16).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}rem`, inputs: [{ l: "px", v: 16, min: 1, max: 200 }] },
      { name: "rem -> px", fn: (a) => `${a * 16}px`, inputs: [{ l: "rem", v: 1, min: 0.1, max: 20, step: 0.125 }] },
      { name: "8pt Grid", fn: (a) => `${Math.round(a / 8) * 8}px`, inputs: [{ l: "px", v: 20, min: 1, max: 200 }] },
      { name: "4pt Grid", fn: (a) => `${Math.round(a / 4) * 4}px`, inputs: [{ l: "px", v: 14, min: 1, max: 200 }] },
    ],
  },
  {
    cat: "Color",
    items: [
      {
        name: "Hex -> RGB",
        fn: (_, s) => {
          const r = parseInt(s.slice(1, 3), 16);
          const g = parseInt(s.slice(3, 5), 16);
          const b = parseInt(s.slice(5, 7), 16);
          return `rgb(${r}, ${g}, ${b})`;
        },
        inputs: [{ l: "hex", v: 0, color: "#007AFF", min: 0, max: 100 }],
      },
      {
        name: "Hex -> RGBA",
        fn: (a, s) => {
          const r = parseInt(s.slice(1, 3), 16);
          const g = parseInt(s.slice(3, 5), 16);
          const b = parseInt(s.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${(a / 100).toFixed(2)})`;
        },
        inputs: [
          { l: "alpha%", v: 80, min: 0, max: 100 },
          { l: "hex", v: 0, color: "#007AFF", min: 0, max: 0 },
        ],
      },
      {
        name: "Contrast",
        fn: (_, s) => {
          if (!/^#[0-9a-fA-F]{6}$/.test(s)) return "-";
          const convert = (x: number) =>
            x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          const r = parseInt(s.slice(1, 3), 16) / 255;
          const g = parseInt(s.slice(3, 5), 16) / 255;
          const b = parseInt(s.slice(5, 7), 16) / 255;
          const lum = 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
          const ratio = 1.05 / (lum + 0.05);
          return `${ratio.toFixed(2)}:1 (${ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Lg" : "Fail"})`;
        },
        inputs: [{ l: "hex", v: 0, color: "#333333", min: 0, max: 0 }],
      },
    ],
  },
  {
    cat: "Typography",
    items: [
      { name: "Line Height", fn: (a) => `${(a * 1.5).toFixed(0)}px / 1.5em`, inputs: [{ l: "font-size px", v: 16, min: 8, max: 72 }] },
      { name: "Clamp()", fn: (a, _, b) => `clamp(${a}px, ${((a + b) / 2 / 16).toFixed(2)}rem, ${b}px)`, inputs: [{ l: "min px", v: 14, min: 8, max: 100 }, { l: "max px", v: 24, min: 8, max: 100 }] },
      { name: "Tracking", fn: (a, _, b) => `${(a / b).toFixed(4)}em`, inputs: [{ l: "spacing px", v: 1, min: 0, max: 20, step: 0.5 }, { l: "font-size", v: 16, min: 8, max: 72 }] },
    ],
  },
  {
    cat: "Layout",
    items: [
      { name: "Golden ratio", fn: (a) => `${(a * 1.618).toFixed(1)}px / ${(a / 1.618).toFixed(1)}px`, inputs: [{ l: "value px", v: 100, min: 1, max: 1000 }] },
      {
        name: "Aspect",
        fn: (a, _, b) => {
          const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
          const d = gcd(Math.round(a), Math.round(b));
          return `${Math.round(a / d)} / ${Math.round(b / d)}`;
        },
        inputs: [{ l: "width", v: 1920, min: 1, max: 9999 }, { l: "height", v: 1080, min: 1, max: 9999 }],
      },
      { name: "Viewport%", fn: (a, _, b) => `${((a / b) * 100).toFixed(2)}vw`, inputs: [{ l: "element px", v: 320, min: 1, max: 3000 }, { l: "viewport", v: 1440, min: 320, max: 3840 }] },
    ],
  },
  {
    cat: "Animation",
    items: [
      { name: "FPS -> ms", fn: (a) => `${(1000 / a).toFixed(2)}ms`, inputs: [{ l: "fps", v: 60, min: 1, max: 240 }] },
      { name: "Stagger", fn: (a, _, b) => `${a * b}ms total`, inputs: [{ l: "delay ms", v: 40, min: 1, max: 500 }, { l: "items", v: 6, min: 1, max: 50 }] },
      { name: "Spring", fn: (a) => `~${(Math.sqrt(1 / a) * 1000).toFixed(0)}ms`, inputs: [{ l: "stiffness", v: 300, min: 1, max: 2000 }] },
    ],
  },
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  };
  return { copied, copy };
}

function CalcItem({ item }: { item: CalculatorItem }) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const { copy, copied } = useCopy();
  const [vals, setVals] = useState<[number, string]>([
    item.inputs?.[0]?.v ?? 16,
    item.inputs?.[0]?.color ?? "#007AFF",
  ]);
  const [val2, setVal2] = useState<number>(item.inputs?.[1]?.v ?? 100);
  let result = "-";
  try {
    result = item.fn(vals[0], vals[1], val2);
  } catch {
    result = "-";
  }
  return (
    <div
      style={{
        padding: "11px 13px",
        borderRadius: 11,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
      {item.inputs?.map((input, index) => (
        <div key={index} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, opacity: 0.45, marginBottom: 2 }}>{input.l}</div>
          {input.color !== undefined ? (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <input
                type="color"
                value={vals[1]}
                onChange={(event) => setVals((prev) => [prev[0], event.target.value])}
                style={{
                  width: 24,
                  height: 22,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.15)",
                  padding: 2,
                  cursor: "pointer",
                }}
              />
              <input
                value={vals[1]}
                onChange={(event) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) {
                    setVals((prev) => [prev[0], event.target.value]);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "3px 7px",
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                  fontSize: 10,
                  color: "inherit",
                  fontFamily: "monospace",
                }}
              />
            </div>
          ) : (
            <input
              type="number"
              value={index === 0 ? vals[0] : val2}
              step={input.step ?? 1}
              min={input.min}
              max={input.max}
              onChange={(event) => {
                const next = parseFloat(event.target.value);
                if (index === 0) setVals((prev) => [next, prev[1]]);
                else setVal2(next);
              }}
              style={{
                width: "100%",
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                outline: "none",
                fontSize: 11,
                color: "inherit",
                fontFamily: "monospace",
              }}
            />
          )}
        </div>
      ))}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          padding: "6px 9px",
          borderRadius: 7,
          background: `rgba(${rgb},0.1)`,
          border: `1px solid rgba(${rgb},0.2)`,
        }}
      >
        <code
          style={{
            fontSize: 11,
            color: t.accent,
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          {result}
        </code>
        <button
          onClick={() => copy(result, item.name)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied === item.name ? t.accent : "inherit",
            opacity: copied === item.name ? 1 : 0.4,
            padding: "1px 3px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {copied === item.name ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
    </div>
  );
}

export function DevToolsCalculatorSection({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const [calcCat, setCalcCat] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: compact ? "column" : "row",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: compact ? "100%" : 130,
          height: compact ? "auto" : undefined,
          flexShrink: 0,
          borderRight: compact ? "none" : "1px solid rgba(255,255,255,0.07)",
          borderBottom: compact ? "1px solid rgba(255,255,255,0.07)" : "none",
          padding: compact ? "8px 12px" : "10px 7px",
          display: "flex",
          flexDirection: compact ? "row" : "column",
          flexWrap: compact ? "wrap" : undefined,
          gap: 3,
          background: "rgba(0,0,0,0.1)",
        }}
      >
        {CALC_CATS.map((category, index) => (
          <button
            key={category.cat}
            onClick={() => setCalcCat(index)}
            style={{
              padding: "7px 9px",
              borderRadius: 8,
              border: `1px solid ${calcCat === index ? t.accent : "transparent"}`,
              background:
                calcCat === index ? `rgba(${rgb},0.15)` : "transparent",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: calcCat === index ? t.accent : "inherit",
              textAlign: "left",
              transition: "all 0.1s",
            }}
          >
            {category.cat}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            opacity: 0.35,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          {CALC_CATS[calcCat].cat}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CALC_CATS[calcCat].items.map((item) => (
            <CalcItem key={item.name} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
