export type ModuleId =
  | "appearance"
  | "panel"
  | "layout"
  | "motion"
  | "editor"
  | "workspace";

export type RendererMode = "blur" | "fake-glass" | "glass-shader";
export type GlowRendererMode = "css" | "three";

export type ExperiencePreset = {
  id: "focus" | "balanced" | "cinematic";
  title: string;
  desc: string;
  apply: (theme: any) => void;
};
