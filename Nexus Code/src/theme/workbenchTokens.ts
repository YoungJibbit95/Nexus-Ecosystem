/** Derived appearance only: persisted settings and editor syntax remain owned by the resolver. */
export interface WorkbenchPalette {
  window: string;
  editor: string;
  surface: string;
  input: string;
  text: string;
  muted: string;
  accent: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
}

export const WORKBENCH_MOTION = Object.freeze({ quick: 0.1, regular: 0.14 });
export type WorkbenchTokens = Record<`--wb-${string}`, string>;

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function mix(color: string, target: string, weight: number): string {
  const end = rgb(target);
  return `#${rgb(color).map((value, index) => Math.round(value * (1 - weight) + end[index] * weight).toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const linear = rgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readable(color: string, surfaces: string[], minimum = 4.5): string {
  const score = (candidate: string) => Math.min(...surfaces.map(surface => contrastRatio(candidate, surface)));
  const targets = ['#000000', '#ffffff'].sort((a, b) => score(b) - score(a));
  let best = color;
  for (let step = 0; step <= 20; step += 1) {
    for (const target of targets) {
      const candidate = mix(color, target, step / 20);
      if (score(candidate) >= minimum) return candidate;
      if (score(candidate) > score(best)) best = candidate;
    }
  }
  return best;
}

export function createWorkbenchTokens(palette: WorkbenchPalette): WorkbenchTokens {
  const light = luminance(palette.surface) >= 0.175;
  const ink = light ? '#000000' : '#ffffff';
  // Keep mid-tone custom surfaces on one side of the readable text boundary.
  const surface = (color: string): string => {
    for (let step = 0; step <= 20; step += 1) {
      const candidate = mix(color, light ? '#ffffff' : '#000000', step / 20);
      if (light ? luminance(candidate) >= 0.175 : luminance(candidate) <= 0.1833) return candidate;
    }
    return palette.surface;
  };
  const panel = surface(mix(palette.surface, ink, 0.045));
  const chrome = palette.surface;
  const overlay = surface(mix(palette.surface, ink, 0.085));
  const input = palette.input;
  const hover = surface(mix(panel, ink, 0.065));
  const selection = surface(mix(panel, palette.accent, 0.18));
  const backgrounds = [panel, chrome, overlay, hover, selection];
  const text = readable(palette.text, backgrounds);
  const muted = readable(palette.muted, backgrounds);
  const accent = readable(palette.accent, backgrounds);
  const tokens: WorkbenchTokens = {
    '--wb-surface-window': palette.window,
    '--wb-surface-chrome': chrome,
    '--wb-surface-panel': panel,
    '--wb-surface-editor': palette.editor,
    '--wb-surface-overlay': overlay,
    '--wb-surface-blocking': overlay,
    '--wb-backdrop-blocking': 'rgba(0, 0, 0, 0.65)',
    '--wb-text-primary': text,
    '--wb-text-secondary': readable(mix(text, panel, 0.2), backgrounds),
    '--wb-text-muted': muted,
    '--wb-text-disabled': mix(text, panel, 0.5),
    '--wb-border-subtle': mix(panel, ink, 0.12),
    '--wb-border-strong': readable(mix(panel, ink, 0.3), [panel, input], 3),
    '--wb-accent': accent,
    '--wb-focus': readable(palette.accent, [panel, input, chrome], 3),
    '--wb-hover': hover,
    '--wb-selection': selection,
    '--wb-selection-text': readable(text, [selection]),
    '--wb-input': input,
    '--wb-input-text': readable(palette.text, [input]),
    '--wb-input-placeholder': readable(palette.muted, [input]),
    '--wb-shadow-overlay': '0 8px 24px rgba(0, 0, 0, 0.3)',
    '--wb-space-1': '2px', '--wb-space-2': '4px', '--wb-space-3': '6px',
    '--wb-space-4': '8px', '--wb-space-5': '12px', '--wb-space-6': '16px', '--wb-space-7': '24px',
    '--wb-radius-control': '4px', '--wb-radius-overlay': '8px',
    '--wb-font-body': '12px', '--wb-font-label': '11px', '--wb-font-title': '12px',
    '--wb-control-height': '28px', '--wb-focus-width': '2px',
    '--wb-motion-quick': `${WORKBENCH_MOTION.quick * 1000}ms`,
    '--wb-motion-regular': `${WORKBENCH_MOTION.regular * 1000}ms`,
    '--wb-motion-ease': 'cubic-bezier(0.2, 0, 0, 1)',
  };
  const states = {
    success: palette.success || '#74c7a8', warning: palette.warning || '#f5c177',
    danger: palette.danger || '#ee6d85', info: palette.info || '#8aadf4',
  };
  for (const [state, color] of Object.entries(states)) {
    tokens[`--wb-${state}`] = readable(color, backgrounds);
    tokens[`--wb-${state}-surface`] = surface(mix(panel, color, 0.06));
    tokens[`--wb-${state}-border`] = mix(panel, color, 0.3);
  }
  return tokens;
}
