import React from "react";
import {
  Wand2,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  Type,
  TerminalSquare,
} from "lucide-react";
import { applyMotionProfile, type MotionProfile } from "../../lib/motionEngine";
import { ExperiencePreset, ModuleId } from "./settingsTypes";

export const MODULES: {
  id: ModuleId;
  icon: React.ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    id: "appearance",
    icon: <Wand2 size={14} />,
    title: "Appearance",
    desc: "Presets, Themes, Lesbarkeit",
  },
  {
    id: "panel",
    icon: <Sparkles size={14} />,
    title: "Panel Background",
    desc: "Stabiler Panel-Look + Engine-Tuning",
  },
  {
    id: "layout",
    icon: <LayoutGrid size={14} />,
    title: "Layout",
    desc: "Sidebar, Dichte, Workflow-Zonen",
  },
  {
    id: "motion",
    icon: <SlidersHorizontal size={14} />,
    title: "Motion Engine",
    desc: "Apple-like Motion Profiles",
  },
  {
    id: "editor",
    icon: <Type size={14} />,
    title: "Editor",
    desc: "Code & Notes Live-Verhalten",
  },
  {
    id: "workspace",
    icon: <TerminalSquare size={14} />,
    title: "Workspace",
    desc: "Spotlight, Terminal, Reset",
  },
];

export const MOTION_PROFILES: { id: MotionProfile; label: string; desc: string }[] = [
  { id: "minimal", label: "Minimal", desc: "Nahezu statisch, maximale Ruhe" },
  { id: "balanced", label: "Balanced", desc: "Schnell, ruhig und alltagstauglich" },
  { id: "expressive", label: "Expressive", desc: "Mehr Tiefe, mehr Reaktion" },
  {
    id: "cinematic",
    label: "Cinematic",
    desc: "Maximaler Showcase-Look bei genug Leistung",
  },
];

export const EXPERIENCE_PRESETS: ExperiencePreset[] = [
  {
    id: "focus",
    title: "🧘 Focus",
    desc: "Ruhig, klar und ohne visuelles Gewusel",
    apply: (t) => {
      t.setMode("dark");
      t.setQOL({
        reducedMotion: true,
        panelDensity: "comfortable",
        quickActions: false,
      });
      t.setAnimations({
        pageTransitions: false,
        hoverLift: false,
        rippleClick: false,
        glowPulse: false,
      });
      t.setGlow({
        mode: "focus",
        intensity: 0.35,
        radius: 14,
        animated: false,
        gradientGlow: false,
      });
      t.setBlur({ panelBlur: 14, sidebarBlur: 14, modalBlur: 18 });
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" });
      t.setPanelBgMode("solid");
    },
  },
  {
    id: "balanced",
    title: "✨ Balanced",
    desc: "Empfohlen: guter Mix aus Style, Lesbarkeit und Performance",
    apply: (t) => {
      t.setQOL({
        reducedMotion: false,
        panelDensity: "comfortable",
        quickActions: true,
      });
      t.setAnimations({
        pageTransitions: true,
        hoverLift: true,
        rippleClick: true,
        glowPulse: false,
      });
      t.setGlow({
        mode: "outline",
        intensity: 0.78,
        radius: 24,
        animated: false,
        gradientGlow: true,
      });
      t.setBlur({ panelBlur: 18, sidebarBlur: 18, modalBlur: 22 });
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" });
      t.setPanelBgMode("glass");
      applyMotionProfile(t, "balanced");
    },
  },
  {
    id: "studio",
    title: "🎚️ Studio",
    desc: "Clean für reale Arbeit, Screenshots und QA",
    apply: (t) => {
      t.preset("Studio Neutral");
      t.setQOL({
        reducedMotion: false,
        panelDensity: "comfortable",
        quickActions: true,
      });
      t.setAnimations({
        pageTransitions: true,
        hoverLift: true,
        rippleClick: false,
        glowPulse: false,
      });
      t.setGlow({
        mode: "focus",
        intensity: 0.28,
        radius: 16,
        animated: false,
        gradientGlow: false,
      });
      t.setBlur({ panelBlur: 12, sidebarBlur: 14, modalBlur: 18 });
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" });
      t.setPanelBgMode("solid");
      applyMotionProfile(t, "balanced");
    },
  },
  {
    id: "performance",
    title: "⚙️ Performance",
    desc: "Für schwächere Geräte und lange Sessions",
    apply: (t) => {
      t.preset("High Contrast Focus");
      t.setQOL({
        reducedMotion: true,
        panelDensity: "compact",
        quickActions: true,
      });
      t.setAnimations({
        pageTransitions: false,
        hoverLift: false,
        rippleClick: false,
        glowPulse: false,
        particleEffects: false,
      });
      t.setGlow({
        mode: "focus",
        intensity: 0.24,
        radius: 12,
        animated: false,
        gradientGlow: false,
      });
      t.setBlur({ panelBlur: 8, sidebarBlur: 8, modalBlur: 12 });
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" });
      t.setPanelBgMode("solid");
      applyMotionProfile(t, "minimal");
    },
  },
  {
    id: "cinematic",
    title: "🎬 Cinematic",
    desc: "Starke Tiefe und Glow, bewusst als Showcase",
    apply: (t) => {
      t.setQOL({
        reducedMotion: false,
        panelDensity: "spacious",
        quickActions: true,
      });
      t.setAnimations({
        pageTransitions: true,
        hoverLift: true,
        rippleClick: true,
        glowPulse: true,
      });
      t.setGlow({
        mode: "gradient",
        intensity: 1.08,
        radius: 30,
        animated: true,
        gradientGlow: true,
      });
      t.setBlur({ panelBlur: 24, sidebarBlur: 22, modalBlur: 30 });
      t.setGlassmorphism({
        panelRenderer: "glass-shader",
        glowRenderer: "three",
      });
      t.setPanelBgMode("mist");
      applyMotionProfile(t, "cinematic");
    },
  },
];
