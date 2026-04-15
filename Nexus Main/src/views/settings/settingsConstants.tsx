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
    desc: "Presets, Farben, Schrift",
  },
  {
    id: "panel",
    icon: <Sparkles size={14} />,
    title: "Panel Background",
    desc: "Renderer & Glow Pipeline",
  },
  {
    id: "layout",
    icon: <LayoutGrid size={14} />,
    title: "Layout",
    desc: "Sidebar, Toolbar, Dichte",
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
    desc: "Code und Notes Verhalten",
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
  { id: "balanced", label: "Balanced", desc: "Schnell und modern für Alltag" },
  { id: "expressive", label: "Expressive", desc: "Mehr Tiefe, mehr Reaktion" },
  {
    id: "cinematic",
    label: "Cinematic",
    desc: "Maximaler Eye-Candy bei genug Leistung",
  },
];

export const EXPERIENCE_PRESETS: ExperiencePreset[] = [
  {
    id: "focus",
    title: "Focus",
    desc: "Weniger Effekt, maximale Klarheit",
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
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" } as any);
    },
  },
  {
    id: "balanced",
    title: "Balanced",
    desc: "Empfohlen: guter Mix aus Style und Performance",
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
      t.setGlassmorphism({ panelRenderer: "blur", glowRenderer: "css" } as any);
      applyMotionProfile(t, "balanced");
    },
  },
  {
    id: "cinematic",
    title: "Cinematic",
    desc: "Starke visuelle Tiefe und Glow",
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
      } as any);
      applyMotionProfile(t, "cinematic");
    },
  },
];
