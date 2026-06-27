import React, { useEffect, useRef, useState } from "react";
import {
  Command,
  FilePlus2,
  FolderOpen,
  Maximize2,
  Minimize2,
  PanelLeft,
  Save,
  Settings,
  TerminalSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** @type {any} */
const win = typeof window !== "undefined" ? window : {};
const isElectron = !!win.electronAPI;
const isMacOS = isElectron && win.electronAPI?.platform === "darwin";
const MACOS_TRAFFIC_LIGHT_SAFE_WIDTH = 78;

function MenuButton({ label, items, activeMenu, setActiveMenu }) {
  const isOpen = activeMenu === label;

  return (
    <div className="relative" onMouseEnter={() => activeMenu && setActiveMenu(label)}>
      <button
        type="button"
        onClick={() => setActiveMenu(isOpen ? null : label)}
        className="h-7 rounded-md px-2 text-[11px] font-medium text-gray-400 outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-purple-500/60"
        // @ts-ignore
        style={{ WebkitAppRegion: "no-drag" }}
      >
        {label}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveMenu(null)}
              // @ts-ignore
              style={{ WebkitAppRegion: "no-drag" }}
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-full z-50 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-black/85 p-1 shadow-2xl backdrop-blur-xl"
              // @ts-ignore
              style={{ WebkitAppRegion: "no-drag" }}
            >
              {items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.label}-${idx}`}
                    type="button"
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                    disabled={item.disabled}
                    className={`flex h-8 w-full items-center justify-between gap-3 rounded-md px-2.5 text-[11px] transition-colors ${
                      item.disabled
                        ? "cursor-not-allowed text-gray-600"
                        : "text-gray-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {Icon ? <Icon size={13} className="shrink-0" /> : null}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.shortcut ? (
                      <span className="shrink-0 font-mono text-[9px] text-gray-500">
                        {item.shortcut}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandButton({ icon: Icon, label, active, onClick, title }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title || label}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        background: active
          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
          : "rgba(255,255,255,0.02)",
        color: active ? "var(--primary)" : undefined,
      }}
    >
      <Icon size={15} />
    </button>
  );
}

export default function TitleBar({
  compact = false,
  onNewFile,
  onSaveAll,
  onOpenFolder,
  onToggleSidebar,
  onToggleSidebarVisibility,
  onToggleZenMode,
  onToggleTerminal,
  onOpenCommandPalette,
  onOpenSettings,
  onFocusEditor,
  sidebarVisible = true,
  zenMode = false,
  terminalOpen = false,
  shellModeLabel = "Focus",
  activePanelLabel = "Explorer",
  workspaceName,
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuHostRef = useRef(null);

  useEffect(() => {
    if (!isElectron) return undefined;
    win.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    const unsub1 = win.electronAPI.onMaximized(setIsMaximized);
    return () => unsub1?.();
  }, []);

  useEffect(() => {
    if (!activeMenu) return undefined;

    const closeMenu = () => setActiveMenu(null);
    const onPointerDownCapture = (event) => {
      const host = menuHostRef.current;
      if (!host) {
        closeMenu();
        return;
      }
      const target = event.target;
      if (target instanceof Node && host.contains(target)) return;
      closeMenu();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };
    const onWindowBlur = () => closeMenu();

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [activeMenu]);

  const safeNewFile = onNewFile || (() => {});
  const safeSaveAll = onSaveAll || (() => {});
  const safeOpenFolder = onOpenFolder || (() => {});
  const safeOpenSettings = onOpenSettings || (() => {});
  const safeCommandPalette = onOpenCommandPalette || (() => {});
  const safeFocusEditor = onFocusEditor || (() => {});
  const safeClose = () => win.electronAPI?.close?.();
  const safeMinimize = () => win.electronAPI?.minimize?.();
  const safeMaximize = () => win.electronAPI?.maximize?.();
  const showWindowControls = !isMacOS;

  const menus = [
    {
      label: "Datei",
      items: [
        { label: "Neue Datei", shortcut: "Ctrl+N", action: safeNewFile, icon: FilePlus2 },
        { label: "Ordner oeffnen", shortcut: "Ctrl+O", action: safeOpenFolder, icon: FolderOpen },
        { label: "Alle speichern", shortcut: "Ctrl+S", action: safeSaveAll, icon: Save },
        { label: "Beenden", shortcut: "Alt+F4", action: safeClose },
      ],
    },
    {
      label: "Ansicht",
      items: [
        { label: "Fokus Editor", action: safeFocusEditor, icon: Minimize2 },
        { label: "Aktives Panel", shortcut: "Ctrl+B", action: onToggleSidebar, icon: PanelLeft },
        { label: "Rail anzeigen", action: onToggleSidebarVisibility, icon: PanelLeft },
        { label: "Zen Mode", shortcut: "Ctrl+K Z", action: onToggleZenMode, icon: Maximize2 },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Terminal", shortcut: "Ctrl+`", action: onToggleTerminal, icon: TerminalSquare },
        { label: "Befehlspalette", shortcut: "F1", action: safeCommandPalette, icon: Command },
        { label: "Einstellungen", shortcut: "Ctrl+,", action: safeOpenSettings, icon: Settings },
      ],
    },
  ];

  const workspaceLabel = workspaceName || "Kein Workspace";

  return (
    <div
      className={`nx-code-titlebar flex h-11 shrink-0 select-none items-center justify-between gap-2 border-b border-white/5 ${compact ? "px-2" : "px-3"} relative z-50`}
      style={{
        background: "var(--nexus-surface)",
        borderBottom: "1px solid var(--nexus-border)",
        backdropFilter: "blur(14px)",
        // @ts-ignore
        WebkitAppRegion: isElectron ? "drag" : "no-drag",
      }}
    >
      <div
        className="flex min-w-0 shrink-0 items-center gap-1.5"
        style={{ paddingLeft: isMacOS ? MACOS_TRAFFIC_LIGHT_SAFE_WIDTH : 0 }}
      >
        {showWindowControls && (
          <div
            className="mr-2 flex items-center gap-1.5"
            // @ts-ignore
            style={{ WebkitAppRegion: "no-drag" }}
            onMouseEnter={() => setHoveredBtn("group")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            {[
              { id: "close", color: "#ff5f57", symbol: "x", action: safeClose },
              { id: "min", color: "#febc2e", symbol: "-", action: safeMinimize },
              { id: "max", color: "#28c840", symbol: isMaximized ? "[]" : "+", action: safeMaximize },
            ].map((btn) => (
              <motion.button
                key={btn.id}
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={btn.action}
                className="flex h-3 w-3 items-center justify-center rounded-full focus:outline-none"
                style={{
                  background: btn.color,
                  boxShadow:
                    hoveredBtn === "group" ? `0 0 6px ${btn.color}80` : "none",
                  cursor: "pointer",
                }}
              >
                <motion.span
                  animate={{ opacity: hoveredBtn === "group" ? 1 : 0 }}
                  className="pointer-events-none font-bold leading-none text-white"
                  style={{ fontSize: 7, marginTop: "0.5px" }}
                >
                  {btn.symbol}
                </motion.span>
              </motion.button>
            ))}
          </div>
        )}

        <div
          ref={menuHostRef}
          className={`nx-code-menu-host items-center gap-0.5 ${compact ? "hidden md:flex" : "flex"}`}
          // @ts-ignore
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {menus.map((menu) => (
            <MenuButton
              key={menu.label}
              label={menu.label}
              items={menu.items}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={safeCommandPalette}
        className="mx-1 flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 sm:max-w-[38rem]"
        // @ts-ignore
        style={{ WebkitAppRegion: "no-drag" }}
        title="Befehlspalette oeffnen"
      >
        <Command size={14} className="shrink-0 text-gray-500" />
        <span className="min-w-0 truncate text-[11px] font-semibold text-gray-300">
          Nexus Code
          <span className="hidden text-gray-500 sm:inline"> / {workspaceLabel}</span>
        </span>
        <span className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 md:inline">
          {shellModeLabel}
        </span>
      </button>

      <div
        className="flex shrink-0 items-center gap-1"
        // @ts-ignore
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <span className="hidden max-w-[8rem] truncate pr-1 text-[10px] text-gray-500 lg:block">
          {activePanelLabel}
        </span>
        <CommandButton
          icon={PanelLeft}
          label="Sidebar"
          active={sidebarVisible}
          onClick={onToggleSidebar}
          title="Panel umschalten"
        />
        <CommandButton
          icon={TerminalSquare}
          label="Terminal"
          active={terminalOpen}
          onClick={onToggleTerminal}
        />
        <CommandButton
          icon={zenMode ? Minimize2 : Maximize2}
          label="Zen"
          active={zenMode}
          onClick={onToggleZenMode}
          title={zenMode ? "Zen Mode verlassen" : "Zen Mode"}
        />
        <CommandButton
          icon={Settings}
          label="Settings"
          active={shellModeLabel === "Settings"}
          onClick={safeOpenSettings}
          title="Einstellungen"
        />
      </div>
    </div>
  );
}
