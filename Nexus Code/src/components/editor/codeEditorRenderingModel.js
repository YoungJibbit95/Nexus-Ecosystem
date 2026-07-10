import { EditorView, ViewPlugin } from "@codemirror/view";
import { THEMES as EDITOR_THEMES } from "../../pages/editor/editorShared.jsx";

const COMPACT_VIEWPORT_WIDTH = 920;
const DEFAULT_EDITOR_FONT_STACK =
  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

export function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

export function getCompactViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < COMPACT_VIEWPORT_WIDTH;
}

export function resolveEditorReducedMotion(settings) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const lowPowerClass =
    typeof document !== "undefined" &&
    document.documentElement?.classList?.contains("reduce-motion");

  return Boolean(
    settings.reduce_motion === true ||
      settings.animations_enabled === false ||
      settings.visual_performance_profile === "performance" ||
      prefersReducedMotion ||
      lowPowerClass,
  );
}

export function resolveEditorFontSize(settings, fallbackFontSize) {
  return Math.round(
    clampNumber(settings.font_size ?? fallbackFontSize, 11, 22, 14),
  );
}

export function resolveEditorLineHeight(settings, resolvedFontSize) {
  const raw = clampNumber(settings.line_height, 1.2, 34, 1.55);
  const pixelValue = raw <= 3 ? raw * resolvedFontSize : raw;
  return Math.round(Math.max(resolvedFontSize + 4, Math.min(40, pixelValue)));
}

export function resolveEditorLetterSpacing(settings) {
  return clampNumber(settings.letter_spacing, 0, 1.5, 0);
}

export function resolveEditorTabSize(settings, fallbackTabSize) {
  return Math.round(clampNumber(settings.tab_size ?? fallbackTabSize, 2, 10, 4));
}

export function resolveAutocompleteMaxItems(settings, reduceMotion, compactViewport) {
  const fallback = reduceMotion ? 72 : compactViewport ? 96 : 120;
  return Math.round(clampNumber(settings.autocomplete_max_items, 24, 180, fallback));
}

export function resolveEditorFontFamily(settings) {
  const configured = String(settings.font_family || "").trim();
  if (!configured) return DEFAULT_EDITOR_FONT_STACK;
  return `'${configured.replace(/'/g, "")}', ${DEFAULT_EDITOR_FONT_STACK}`;
}

export function safeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

export function hexToRgba(value, alpha) {
  const hex = safeHex(value, "#8b5cf6").slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function positionCompletionInfo(_view, list, option, info, space, tooltip) {
  const margin = 10;
  const listWidth = Math.max(1, list.right - list.left);
  const listHeight = Math.max(1, list.bottom - list.top);
  const scaleX = tooltip?.offsetWidth ? listWidth / tooltip.offsetWidth : 1;
  const scaleY = tooltip?.offsetHeight ? listHeight / tooltip.offsetHeight : 1;
  const infoWidth = Math.max(220, info.right - info.left);
  const infoHeight = Math.max(120, info.bottom - info.top);
  const spaceLeft = Math.max(0, list.left - space.left - margin);
  const spaceRight = Math.max(0, space.right - list.right - margin);
  const sideWidth = Math.min(420, Math.max(spaceLeft, spaceRight));
  const topOffset =
    Math.max(space.top + margin, Math.min(option.top, space.bottom - infoHeight - margin)) -
    list.top;

  if (sideWidth >= Math.min(infoWidth, 280)) {
    const placeLeft = spaceLeft > spaceRight;
    return {
      style: [
        `top: ${Math.max(0, topOffset) / scaleY}px`,
        `${placeLeft ? "right" : "left"}: 100%`,
        `max-width: ${sideWidth / scaleX}px`,
      ].join("; "),
      class: `nx-cm-completionInfo-side ${
        placeLeft ? "nx-cm-completionInfo-left" : "nx-cm-completionInfo-right"
      }`,
    };
  }

  const stackedWidth = Math.max(220, Math.min(420, space.right - space.left - margin * 2));
  const spaceBelow = space.bottom - list.bottom;
  const spaceAbove = list.top - space.top;
  const placeBelow = spaceBelow >= Math.min(infoHeight, 220) || spaceBelow >= spaceAbove;
  const verticalOffset = placeBelow ? option.bottom - list.top : list.bottom - option.top;

  return {
    style: [
      `${placeBelow ? "top" : "bottom"}: ${Math.max(0, verticalOffset) / scaleY}px`,
      "left: 0",
      `max-width: ${stackedWidth / scaleX}px`,
      `width: min(${stackedWidth / scaleX}px, calc(100vw - ${margin * 2}px))`,
    ].join("; "),
    class: `nx-cm-completionInfo-stacked ${
      placeBelow ? "nx-cm-completionInfo-below" : "nx-cm-completionInfo-above"
    }`,
  };
}

export function resolveTypingAnimationMode(settings, reduceMotion) {
  if (reduceMotion || settings.animated_typing !== true) return "off";
  const style = String(settings.typing_animation_style || "soft").trim().toLowerCase();
  return ["soft", "lift", "glow"].includes(style) ? style : "soft";
}

export function createTypingAnimationPlugin(settings, reduceMotion) {
  const mode = resolveTypingAnimationMode(settings, reduceMotion);
  if (mode === "off") return [];
  const duration = Math.round(150 / clampNumber(settings.animation_speed, 0.5, 1.8, 1));
  const glowEnabled = settings.typing_glow === true || settings.text_glow === true || mode === "glow";

  return ViewPlugin.fromClass(
    class NexusTypingAnimationPlugin {
      constructor(view) {
        this.view = view;
        this.timeout = 0;
      }

      update(update) {
        if (!update.docChanged) return;
        const dom = this.view.dom;
        dom.classList.add("nx-code-typing-active", `nx-code-typing-${mode}`);
        dom.classList.toggle("nx-code-typing-glow", glowEnabled);
        if (this.timeout) window.clearTimeout(this.timeout);
        this.timeout = window.setTimeout(() => {
          dom.classList.remove(
            "nx-code-typing-active",
            "nx-code-typing-soft",
            "nx-code-typing-lift",
            "nx-code-typing-glow",
          );
          this.timeout = 0;
        }, duration);
      }

      destroy() {
        if (this.timeout) window.clearTimeout(this.timeout);
      }
    },
  );
}

export function resolveEditorTheme(settings) {
  return EDITOR_THEMES[settings.theme] || EDITOR_THEMES.nexus_vibrant;
}

export function resolveEditorAccent(settings) {
  const theme = resolveEditorTheme(settings);
  return safeHex(settings.primary_accent || theme.accent, "#8b5cf6");
}

export function createNexusCodeMirrorTheme(
  settings,
  compactViewport,
  editorFontSize,
  editorLineHeight,
  reduceMotion,
) {
  const theme = resolveEditorTheme(settings);
  const accent = safeHex(settings.primary_accent || theme.accent, "#8b5cf6");
  const editorAccent = "#8b5cf6";
  const editorAccentBlue = "#60a5fa";
  const text = safeHex(theme.text, "#f3f4f6");
  const muted = safeHex(theme.muted, "#8b93a7");
  const selection = hexToRgba(editorAccent, 0.32);
  const selectionStrong = hexToRgba(editorAccentBlue, 0.36);
  const selectionSoft = hexToRgba(editorAccent, 0.16);
  const panelSurface = "var(--nexus-panel-surface)";
  const panelFilter = reduceMotion ? "none" : "var(--nexus-panel-filter)";
  const tooltipShadow = reduceMotion
    ? "0 8px 24px rgba(0,0,0,0.28)"
    : "0 18px 55px rgba(0,0,0,0.35)";
  const letterSpacing = resolveEditorLetterSpacing(settings);
  const glowIntensity = clampNumber(settings.glow_intensity, 0, 100, 28) / 100;
  const glowRadius = clampNumber(settings.glow_radius, 0, 64, 14);
  const textGlowEnabled = settings.text_glow === true || settings.typing_glow === true;
  const cursorGlowEnabled = settings.cursor_glow === true && !reduceMotion;
  const motionDuration = `${Math.round(140 / clampNumber(settings.animation_speed, 0.5, 1.8, 1))}ms`;
  const textGlow = textGlowEnabled
    ? `0 0 ${Math.max(3, Math.round(glowRadius * 0.42))}px ${hexToRgba(accent, 0.16 + glowIntensity * 0.18)}`
    : "none";
  const caretGlow = cursorGlowEnabled
    ? `0 0 ${Math.max(6, Math.round(glowRadius * 0.78))}px ${hexToRgba(accent, 0.24 + glowIntensity * 0.24)}`
    : "none";

  return EditorView.theme(
    {
      "&": {
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        background: "transparent",
        color: text,
        fontFamily: resolveEditorFontFamily(settings),
        fontSize: `${editorFontSize}px`,
        fontWeight: String(settings.font_weight || "400"),
        letterSpacing: `${letterSpacing}px`,
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        fontSynthesis: "none",
        outline: "none",
        overflow: "hidden",
        position: "relative",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        flex: "1 1 auto",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        overflow: "auto",
        overscrollBehavior: "contain",
        scrollbarGutter: "stable",
        fontFamily: "inherit",
        lineHeight: `${editorLineHeight}px`,
        background: "transparent",
      },
      ".cm-content": {
        minHeight: "100%",
        padding: `${compactViewport ? 14 : 20}px ${compactViewport ? 14 : 24}px`,
        caretColor: accent,
        color: text,
        textShadow: textGlow,
        transition: reduceMotion ? "none" : `text-shadow ${motionDuration} ease, color ${motionDuration} ease`,
      },
      ".cm-line": {
        padding: "0 2px",
        textRendering: "inherit",
        transition: reduceMotion ? "none" : `background-color ${motionDuration} ease, text-shadow ${motionDuration} ease, transform ${motionDuration} ease`,
      },
      ".cm-content ::selection": {
        color: `${text} !important`,
      },
      ".cm-gutters": {
        background: "rgba(0,0,0,0.12)",
        color: muted,
        borderRight: "1px solid rgba(255,255,255,0.05)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: compactViewport ? "0 8px 0 10px" : "0 12px 0 14px",
        minWidth: compactViewport ? "2.4rem" : "3rem",
      },
      ".cm-activeLine": {
        backgroundColor: hexToRgba(editorAccent, 0.07),
      },
      ".cm-activeLineGutter": {
        backgroundColor: hexToRgba(editorAccent, 0.12),
        color: text,
      },
      ".cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: `${selection} !important`,
        color: `${text} !important`,
      },
      ".cm-selectionMatch": {
        backgroundColor: `${selectionSoft} !important`,
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.24)}`,
      },
      ".cm-cursor": {
        borderLeftColor: accent,
        borderLeftWidth: settings.cursor_style === "block" ? "0.55em" : settings.cursor_style === "underline" ? "0" : "2px",
        borderBottom: settings.cursor_style === "underline" ? `2px solid ${accent}` : "0",
        boxShadow: caretGlow,
        transition: reduceMotion || settings.smooth_caret === false ? "none" : `border-color ${motionDuration} ease, box-shadow ${motionDuration} ease, transform ${motionDuration} ease`,
      },
      ".cm-dropCursor": {
        borderLeftColor: accent,
        boxShadow: caretGlow,
      },
      "&.nx-code-typing-active .cm-activeLine": {
        backgroundColor: hexToRgba(editorAccent, 0.1),
        textShadow: textGlowEnabled ? textGlow : `0 0 ${Math.max(4, Math.round(glowRadius * 0.28))}px ${hexToRgba(accent, 0.14)}`,
      },
      "&.nx-code-typing-lift .cm-activeLine": {
        transform: reduceMotion ? "none" : "translateY(-0.5px)",
      },
      "&.nx-code-typing-glow .cm-activeLine": {
        textShadow: `0 0 ${Math.max(8, Math.round(glowRadius * 0.75))}px ${hexToRgba(accent, 0.32 + glowIntensity * 0.22)}`,
      },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.56)}`,
        backgroundColor: hexToRgba(editorAccent, 0.13),
      },
      ".cm-panels, .cm-tooltip, .cm-tooltip-autocomplete": {
        background: panelSurface,
        backdropFilter: panelFilter,
        border: "1px solid var(--nexus-border)",
        borderRadius: "8px",
        overflow: "hidden",
      },
      ".cm-tooltip": {
        color: "var(--nexus-text)",
        boxShadow: tooltipShadow,
      },
      ".cm-tooltip-autocomplete": {
        zIndex: 80,
        contain: "layout style paint",
        minWidth: compactViewport ? "min(17rem, calc(100vw - 1rem))" : "22rem",
        width: compactViewport
          ? "min(20rem, calc(100vw - 1rem))"
          : "min(32rem, calc(100vw - 1rem))",
        maxWidth: "calc(100vw - 1rem)",
      },
      ".cm-tooltip-autocomplete > ul": {
        maxHeight: compactViewport
          ? "min(15rem, calc(100vh - 8rem))"
          : "min(22rem, calc(100vh - 8rem))",
        fontFamily: "inherit",
        overflowY: "auto",
        scrollbarGutter: "stable",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: hexToRgba(accent, 0.18),
        color: "#fff",
      },
      ".cm-completionLabel": {
        color: text,
      },
      ".cm-completionDetail": {
        color: muted,
        marginLeft: "0.75rem",
        maxWidth: compactViewport ? "8rem" : "14rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      ".nx-cm-completion-deprecated .cm-completionLabel": {
        textDecoration: "line-through",
        opacity: 0.65,
      },
      ".cm-tooltip.cm-completionInfo": {
        zIndex: 81,
        maxWidth: compactViewport
          ? "min(19rem, calc(100vw - 1rem))"
          : "min(28rem, calc(100vw - 1rem))",
        maxHeight: compactViewport
          ? "min(13rem, calc(100vh - 7rem))"
          : "min(18rem, calc(100vh - 7rem))",
        color: text,
        background: panelSurface,
        backdropFilter: panelFilter,
        border: "1px solid var(--nexus-border)",
        borderRadius: "8px",
        boxShadow: tooltipShadow,
        whiteSpace: "pre-wrap",
        overflow: "auto",
        padding: "9px 10px",
      },
      ".cm-completionInfo.nx-cm-completionInfo-side": {
        marginInline: "8px",
      },
      ".cm-completionInfo.nx-cm-completionInfo-stacked": {
        marginTop: "8px",
        marginBottom: "8px",
      },
      ".cm-panels": {
        color: text,
        position: "absolute",
        left: compactViewport ? "6px" : "10px",
        right: "auto",
        zIndex: 70,
        width: "max-content",
        maxWidth: compactViewport
          ? "calc(100% - 12px)"
          : "min(44rem, calc(100% - 20px))",
        boxShadow: tooltipShadow,
      },
      ".cm-panels.cm-panels-top": {
        top: compactViewport ? "6px" : "10px",
        borderBottom: "1px solid var(--nexus-border)",
      },
      ".cm-panels.cm-panels-bottom": {
        bottom: compactViewport ? "6px" : "10px",
        borderTop: "1px solid var(--nexus-border)",
      },
      ".cm-search": {
        maxWidth: "100%",
        padding: "6px 8px",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        alignItems: "center",
      },
      ".cm-search input": {
        maxWidth: compactViewport ? "8.5rem" : "13rem",
        minHeight: "1.75rem",
        borderRadius: "6px",
        border: "1px solid var(--nexus-border)",
        background: "rgba(255,255,255,0.055)",
        color: text,
        outline: "none",
      },
      ".cm-search button": {
        minHeight: "1.75rem",
        borderRadius: "6px",
        border: "1px solid var(--nexus-border)",
        background: "rgba(255,255,255,0.065)",
        color: text,
      },
      ".cm-search button:hover": {
        background: hexToRgba(accent, 0.16),
      },
      ".cm-searchMatch": {
        backgroundColor: `${selectionSoft} !important`,
        outline: `1px solid ${hexToRgba(editorAccentBlue, 0.28)}`,
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: `${selectionStrong} !important`,
      },
      ".cm-diagnostic": {
        borderRadius: "4px",
      },
      ".cm-diagnostic-error": {
        textDecorationColor: "#ef4444",
      },
      ".cm-diagnostic-warning": {
        textDecorationColor: "#f59e0b",
      },
      ".cm-tooltip.nx-cm-hover-tooltip": {
        background: "transparent",
        border: "0",
        boxShadow: "none",
      },
      ".nx-cm-hover-card": {
        maxWidth: compactViewport ? "18rem" : "32rem",
        borderRadius: "8px",
        border: "1px solid var(--nexus-border)",
        background: panelSurface,
        backdropFilter: "var(--nexus-panel-filter)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
        overflow: "hidden",
      },
      ".nx-cm-hover-title": {
        padding: "7px 10px 5px",
        color: muted,
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      },
      ".nx-cm-hover-body": {
        margin: 0,
        padding: "9px 10px 10px",
        color: text,
        fontFamily: "inherit",
        fontSize: `${Math.max(11, editorFontSize - 1)}px`,
        lineHeight: "1.45",
        whiteSpace: "pre-wrap",
        overflow: "auto",
        maxHeight: compactViewport ? "12rem" : "18rem",
      },
      ".cm-foldGutter .cm-gutterElement": {
        color: muted,
      },
      ".cm-placeholder": {
        color: muted,
      },
    },
    { dark: true },
  );
}

export function countLines(value) {
  if (!value) return 1;
  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) lines += 1;
  }
  return lines;
}

export function createHoverTooltipDom({ title, text, accent, tone = "default" }) {
  const dom = document.createElement("div");
  dom.className = `nx-cm-hover-card nx-cm-hover-card-${tone}`;
  dom.setAttribute("role", "tooltip");
  dom.dataset.hoverTone = tone;
  dom.dataset.hoverTitle = title;
  dom.style.borderTop = `2px solid ${accent}`;

  const heading = document.createElement("div");
  heading.className = "nx-cm-hover-title";
  heading.textContent = title;

  const body = document.createElement("pre");
  body.className = "nx-cm-hover-body";
  body.textContent = text.length > 2600 ? `${text.slice(0, 2600)}\n...` : text;

  dom.append(heading, body);
  return dom;
}

export function cmRangeToEditorFeatureRange(doc, from, to = from) {
  if (!doc) return null;
  const safeFrom = Math.max(0, Math.min(doc.length, Number(from || 0)));
  const safeTo = Math.max(safeFrom, Math.min(doc.length, Number(to || safeFrom)));
  const start = doc.lineAt(safeFrom);
  const end = doc.lineAt(safeTo);
  return {
    startLineNumber: start.number,
    startColumn: safeFrom - start.from + 1,
    endLineNumber: end.number,
    endColumn: safeTo - end.from + 1,
  };
}

export function getEditorActionRange(view) {
  const selection = view?.state?.selection?.main;
  if (!view || !selection) return null;
  if (!selection.empty) {
    return cmRangeToEditorFeatureRange(view.state.doc, selection.from, selection.to);
  }
  const word = view.state.wordAt(selection.head);
  if (word) return cmRangeToEditorFeatureRange(view.state.doc, word.from, word.to);
  return cmRangeToEditorFeatureRange(view.state.doc, selection.head, selection.head);
}

export function getRenameDefaultName(view) {
  const selection = view?.state?.selection?.main;
  if (!view || !selection) return "";
  if (!selection.empty) {
    return view.state.doc.sliceString(selection.from, selection.to).trim();
  }
  const word = view.state.wordAt(selection.head);
  return word ? view.state.doc.sliceString(word.from, word.to).trim() : "";
}

export function readCodeActionTitle(action) {
  if (typeof action === "string") return action;
  return String(action?.title || action?.command?.title || action?.command || "Code action");
}
