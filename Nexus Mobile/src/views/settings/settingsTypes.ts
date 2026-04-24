import type { Theme } from "../../store/themeStore";

export type ModuleId =
  | "appearance"
  | "panel"
  | "layout"
  | "motion"
  | "editor"
  | "workspace";

export type RendererMode = Theme["glassmorphism"]["panelRenderer"];
export type GlowRendererMode = Theme["glassmorphism"]["glowRenderer"];

export type ExperiencePreset = {
  id: "focus" | "balanced" | "cinematic";
  title: string;
  desc: string;
  apply: (theme: Theme) => void;
};
