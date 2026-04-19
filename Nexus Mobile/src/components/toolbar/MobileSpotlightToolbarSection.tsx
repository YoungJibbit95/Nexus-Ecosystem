import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type Theme } from "../../store/themeStore";
import {
  type MobileToolbarCommand,
  type MobileToolbarSuggestion,
} from "./mobileToolbarCommandModel";
import { MOBILE_TOOLBAR_LAYOUT } from "./layoutConfig";
import { MOBILE_TOOLBAR_VIEW_ITEMS } from "./viewItems";
import { SpotlightToolbarBrand } from "./ToolbarBranding";
import { SpotlightPanel } from "./SpotlightPanel";

type MobileToolbarSetView = ((view: any) => void) | undefined;

type MotionFamily = {
  transition: Record<string, unknown>;
};

type MotionRuntimeLike = {
  reduced?: boolean;
};

type MobileSpotlightToolbarSectionProps = {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isBottom: boolean;
  rgb: string;
  t: Theme;
  commandMotion: MotionFamily;
  motionRuntime: MotionRuntimeLike;
  spotlightAnchorX: string;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  selIdx: number;
  setSelIdx: React.Dispatch<React.SetStateAction<number>>;
  suggestions: MobileToolbarSuggestion[];
  commands: MobileToolbarCommand[];
  handleKey: (event: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setView: MobileToolbarSetView;
};

export function MobileSpotlightToolbarSection({
  expanded,
  setExpanded,
  isBottom,
  rgb,
  t,
  commandMotion,
  motionRuntime,
  spotlightAnchorX,
  search,
  setSearch,
  selIdx,
  setSelIdx,
  suggestions,
  commands,
  handleKey,
  inputRef,
  setView,
}: MobileSpotlightToolbarSectionProps) {
  return (
    <AnimatePresence>
      {expanded && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={commandMotion.transition}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 899,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setExpanded(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={
              motionRuntime.reduced
                ? { duration: 0.12 }
                : commandMotion.transition
            }
            style={{
              position: "fixed",
              top: MOBILE_TOOLBAR_LAYOUT.spotlight.panelTopPx,
              left: spotlightAnchorX,
              transform: `translateX(${MOBILE_TOOLBAR_LAYOUT.spotlight.translateX})`,
              width: MOBILE_TOOLBAR_LAYOUT.spotlight.panelWidth,
              transformOrigin: "50% 50%",
              zIndex: 900,
            }}
          >
            <SpotlightPanel
              search={search}
              setSearch={setSearch}
              selIdx={selIdx}
              setSelIdx={setSelIdx}
              suggestions={suggestions}
              commands={commands}
              handleKey={handleKey}
              inputRef={inputRef}
              onClose={() => setExpanded(false)}
              views={MOBILE_TOOLBAR_VIEW_ITEMS}
              setView={setView}
              rgb={rgb}
              t={t}
            />
          </motion.div>
        </>
      )}
      {!expanded && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: isBottom ? "0 0 8px" : "8px 0 0",
          }}
        >
          <button
            onClick={() => setExpanded(true)}
            style={{
              border: `1px solid rgba(${rgb},0.3)`,
              background: `linear-gradient(135deg, rgba(${rgb},0.2), rgba(${rgb},0.08))`,
              color: t.accent,
              borderRadius: 12,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 8px 24px rgba(${rgb},0.25)`,
              whiteSpace: "nowrap",
            }}
          >
            <SpotlightToolbarBrand t={t} rgb={rgb} />
            <span style={{ opacity: 0.68, fontWeight: 600 }}>Shift x2</span>
          </button>
        </div>
      )}
    </AnimatePresence>
  );
}
