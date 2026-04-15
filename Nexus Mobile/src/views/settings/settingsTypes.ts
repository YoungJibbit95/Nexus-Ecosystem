export type ModuleId =
  | "appearance"
  | "panel"
  | "layout"
  | "motion"
  | "editor"
  | "workspace";

export type RendererMode = "blur" | "fake-glass" | "glass-shader" | "liquid-glass";
export type GlowRendererMode = "css" | "three";
export type LiquidPresetMode = "fidelity" | "performance" | "no-shader";

export type ExperiencePreset = {
  id: "focus" | "balanced" | "cinematic";
  title: string;
  desc: string;
  apply: (theme: any) => void;
};
