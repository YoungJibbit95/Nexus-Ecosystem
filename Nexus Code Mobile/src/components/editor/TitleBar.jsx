import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Settings,
  TerminalSquare,
  Command,
  Maximize2,
  MoreVertical,
  X,
  Save,
  Eye,
  GitBranch,
  ChevronRight,
} from "lucide-react";
import { useMobile } from "../../hook/useMobile";

/* ─── Desktop menu (unchanged from original) ─────────────────────────── */

function MenuSheet({ label, items, activeMenu, setActiveMenu }) {
  const isOpen = activeMenu === label;
  return (
    <div className="relative">
      <button
        onClick={() => setActiveMenu(isOpen ? null : label)}
        className="px-3 py-1 text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all outline-none flex items-center gap-1"
      >
        {label}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-block"
          style={{ fontSize: 9, lineHeight: 1 }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 mt-1 min-w-[180px] p-1 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {items.map((item, idx) =>
                item.separator ? (
                  <div key={idx} className="my-1 h-px bg-white/5" />
                ) : (
                  <button
                    key={idx}
                    onClick={() => { if (!item.disabled) { item.action?.(); setActiveMenu(null); } }}
                    disabled={item.disabled}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[12px] rounded-lg transition-colors
                      ${item.disabled
                        ? "opacity-30 cursor-not-allowed text-gray-500"
                        : "hover:bg-white/8 text-gray-300 hover:text-white active:bg-white/15"
                      }`}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] opacity-40 ml-4 font-mono">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Mobile action sheet ─────────────────────────────────────────────── */

function MobileActionSheet({ open, onClose, actions }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl overflow-hidden"
            style={{
              background: "rgba(8,6,22,0.97)",
              border: "1px solid var(--nexus-border)",
              backdropFilter: "blur(40px)",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pb-2 pt-1 flex items-center justify-between">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "var(--primary)" }}
              >
                Nexus Code
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X size={13} className="text-gray-400" />
              </button>
            </div>

            <div className="px-3 pb-4 grid grid-cols-2 gap-2">
              {actions.map((action, i) =>
                action.separator ? (
                  <div key={`sep-${i}`} className="col-span-2 h-px bg-white/5 my-1" />
                ) : (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { action.fn?.(); onClose(); }}
                    disabled={action.disabled}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-95"
                    style={{
                      background: action.primary
                        ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                        : "rgba(255,255,255,0.05)",
                      border: action.primary
                        ? "1px solid color-mix(in srgb, var(--primary) 30%, transparent)"
                        : "1px solid rgba(255,255,255,0.07)",
                      opacity: action.disabled ? 0.4 : 1,
                    }}
                  >
                    {action.icon && (
                      <action.icon
                        size={16}
                        style={{ color: action.primary ? "var(--primary)" : "var(--nexus-muted)" }}
                      />
                    )}
                    <span className="text-[13px] font-medium text-gray-200 leading-none">
                      {action.label}
                    </span>
                  </motion.button>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main TitleBar ───────────────────────────────────────────────────── */

export default function TitleBar({
  onNewFile,
  onSaveAll,
  onOpenFolder,
  onToggleSidebar,
  onToggleSidebarVisibility,
  onToggleZenMode,
  onToggleTerminal,
  onOpenCommandPalette,
  onOpenSettings,
  workspaceName,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useMobile();
  const safeNewFile = onNewFile || (() => {});
  const safeSaveAll = onSaveAll || (() => {});
  const safeOpenSettings = onOpenSettings || (() => {});

  const MENUS = [
    {
      label: "Datei",
      items: [
        { label: "Neue Datei", shortcut: "⌘N", action: safeNewFile },
        { label: "Ordner öffnen…", shortcut: "⌘O", action: onOpenFolder },
        { separator: true },
        { label: "Speichern", shortcut: "⌘S", action: safeSaveAll },
      ],
    },
    {
      label: "Ansicht",
      items: [
        { label: "Explorer", shortcut: "⌘B", action: onToggleSidebar },
        { label: "Sidebar anzeigen", action: onToggleSidebarVisibility },
        { label: "Zen-Modus", action: onToggleZenMode },
        { separator: true },
        { label: "Terminal", shortcut: "⌘`", action: onToggleTerminal },
      ],
    },
    {
      label: "Extras",
      items: [
        { label: "Befehlspalette…", shortcut: "⌘⇧P", action: onOpenCommandPalette },
        { label: "Einstellungen", shortcut: "⌘,", action: safeOpenSettings },
      ],
    },
  ];

  const MOBILE_ACTIONS = [
    { label: "New File",      icon: Save,           fn: safeNewFile },
    { label: "Open Folder",  icon: FolderOpen,      fn: onOpenFolder },
    { label: "Save All",     icon: Save,            fn: safeSaveAll },
    { separator: true },
    { label: "Explorer",     icon: GitBranch,       fn: onToggleSidebar },
    { label: "Terminal",     icon: TerminalSquare,  fn: onToggleTerminal },
    { separator: true },
    { label: "Command",      icon: Command,         fn: onOpenCommandPalette, primary: true },
    { label: "Settings",     icon: Settings,        fn: safeOpenSettings, primary: true },
  ];

  /* ── Mobile header ─────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="shrink-0 flex items-center justify-between px-4 select-none border-b border-white/5 relative z-50"
          style={{
            height: "calc(44px + env(safe-area-inset-top, 0px))",
            paddingTop: "env(safe-area-inset-top, 0px)",
            background: "var(--nexus-surface)",
            borderBottom: "1px solid var(--nexus-border)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)",
                boxShadow: "0 0 14px var(--nexus-accent-glow)",
              }}
            >
              <span className="text-white font-black text-[11px] leading-none">N</span>
            </div>
            <span
              className="text-[12px] font-bold tracking-[0.15em] uppercase"
              style={{ color: "var(--nexus-muted)" }}
            >
              {workspaceName ? workspaceName : "Nexus Code"}
            </span>
          </div>

          {/* Right quick actions */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onToggleTerminal}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="Terminal"
            >
              <TerminalSquare size={16} style={{ color: "var(--nexus-muted)" }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onOpenCommandPalette}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="Command Palette"
            >
              <Command size={16} style={{ color: "var(--nexus-muted)" }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setSheetOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="More"
            >
              <MoreVertical size={16} style={{ color: "var(--nexus-muted)" }} />
            </motion.button>
          </div>
        </motion.div>

        <MobileActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          actions={MOBILE_ACTIONS}
        />
      </>
    );
  }

  /* ── Desktop header (original) ─────────────────────────────────── */
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-12 flex items-center justify-between px-3 shrink-0 select-none border-b border-white/5 relative z-50"
      style={{
        background: "var(--nexus-surface)",
        borderBottom: "1px solid var(--nexus-border)",
        backdropFilter: "blur(20px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* Left: Logo + Menus */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)",
            boxShadow: "0 0 12px var(--nexus-accent-glow)",
          }}
        >
          <span className="text-white font-black text-[10px] leading-none">N</span>
        </div>
        <div className="flex items-center gap-0.5">
          {MENUS.map((menu) => (
            <MenuSheet
              key={menu.label}
              label={menu.label}
              items={menu.items}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
            />
          ))}
        </div>
      </div>

      {/* Center: workspace name */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span
          className="text-[10px] text-gray-500 tracking-[0.2em] font-bold uppercase whitespace-nowrap"
        >
          {workspaceName ? `Nexus — ${workspaceName}` : "Nexus Code"}
        </span>
      </div>

      {/* Right: quick actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleTerminal}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all"
          title="Terminal"
        >
          <TerminalSquare size={14} />
        </button>
        <button
          onClick={onOpenCommandPalette}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all"
          title="Befehlspalette"
        >
          <Command size={14} />
        </button>
        <button
          onClick={onToggleZenMode}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all"
          title="Zen-Modus"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
