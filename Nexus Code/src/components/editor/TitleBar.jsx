import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ChevronDown,
  Command,
  FilePlus2,
  FolderOpen,
  Maximize2,
  Menu,
  Minus,
  Minimize2,
  PanelLeft,
  Save,
  Search,
  Settings,
  Sparkles,
  Square,
  TerminalSquare,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/** @type {any} */
const win = typeof window !== "undefined" ? window : {};
const isElectron = !!win.electronAPI;
const isMacOS = isElectron && win.electronAPI?.platform === "darwin";
const MACOS_TRAFFIC_LIGHT_SAFE_WIDTH = 78;
const COMPACT_MENU_ID = "__compact_menu__";

function MenuItemButton({ item, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        item.action?.();
        onSelect();
      }}
      disabled={item.disabled}
      className={`nx-code-menu-item ${
        item.disabled ? "is-disabled" : ""
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon ? <Icon size={13} className="shrink-0" /> : null}
        <span
          className="min-w-0 truncate leading-snug"
          style={{ overflowWrap: "normal", wordBreak: "normal" }}
        >
          {item.label}
        </span>
      </span>
      {item.shortcut ? (
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-gray-500">
          {item.shortcut}
        </span>
      ) : null}
    </button>
  );
}

function MenuButton({ label, items, activeMenu, setActiveMenu }) {
  const isOpen = activeMenu === label;
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative" onMouseEnter={() => activeMenu && setActiveMenu(label)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setActiveMenu(isOpen ? null : label)}
        className="nx-code-menu-trigger"
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
              initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="nx-code-menu-dropdown absolute left-0 top-full z-50 mt-1 max-w-[calc(100vw-1rem)] min-w-[200px] overflow-hidden p-1"
              role="menu"
              // @ts-ignore
              style={{ WebkitAppRegion: "no-drag" }}
            >
              {items.map((item, idx) => (
                <MenuItemButton
                  key={`${item.label}-${idx}`}
                  item={item}
                  onSelect={() => setActiveMenu(null)}
                />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompactMenuButton({ menus, activeMenu, setActiveMenu }) {
  const isOpen = activeMenu === COMPACT_MENU_ID;
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative"
      onMouseEnter={() => activeMenu && setActiveMenu(COMPACT_MENU_ID)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setActiveMenu(isOpen ? null : COMPACT_MENU_ID)}
        className="nx-code-menu-trigger nx-code-menu-trigger-compact"
        title="Menue"
        // @ts-ignore
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <Menu size={14} />
        <span className="sr-only">Menue</span>
        <ChevronDown size={12} />
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
              initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="nx-code-menu-dropdown absolute left-0 top-full z-50 mt-1 max-h-[calc(100vh-3rem)] w-[min(15.5rem,calc(100vw-1rem))] overflow-y-auto p-1"
              role="menu"
              // @ts-ignore
              style={{ WebkitAppRegion: "no-drag" }}
            >
              {menus.map((menu, menuIndex) => (
                <div
                  key={menu.label}
                  className={menuIndex > 0 ? "mt-1 border-t border-white/[0.06] pt-1" : ""}
                >
                  <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {menu.label}
                  </div>
                  {menu.items.map((item, itemIndex) => (
                    <MenuItemButton
                      key={`${menu.label}-${item.label}-${itemIndex}`}
                      item={item}
                      onSelect={() => setActiveMenu(null)}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandButton({ icon: Icon, label, active, onClick, title }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={active}
      title={title || label}
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="nx-code-command-button nx-code-titlebar-icon-button flex shrink-0 items-center justify-center text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        width: 26,
        height: 26,
        borderRadius: "8px",
        border: active
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)"
          : "1px solid rgba(142, 153, 183, 0.085)",
        background: active
          ? "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.105), rgba(255,255,255,0.018))"
          : "rgba(0,0,0,0.11)",
        color: active ? "var(--nexus-primary, #7c8cff)" : undefined,
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.028)",
      }}
    >
      <Icon size={13} />
    </motion.button>
  );
}

function ShellPill({ icon: Icon, label, tone = "muted" }) {
  const isPrimary = tone === "primary";

  return (
    <span
      title={label}
      className="nx-code-titlebar-pill hidden min-w-0 items-center gap-1.5 2xl:flex"
      style={{
        height: 27,
        maxWidth: 108,
        borderRadius: "8px",
        border: isPrimary
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)"
          : "1px solid rgba(255, 255, 255, 0.052)",
        background: isPrimary
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.048)"
          : "rgba(0, 0, 0, 0.1)",
        color: isPrimary
          ? "var(--nexus-primary, #7c8cff)"
          : "var(--nexus-muted, #99a3b7)",
        padding: "0 9px",
      }}
    >
      <Icon size={12} className="shrink-0" />
      <span className="min-w-0 truncate text-[10px] font-semibold">
        {label}
      </span>
    </span>
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
  const [activeMenu, setActiveMenu] = useState(null);
  const menuHostRef = useRef(null);
  const reduceMotion = useReducedMotion();

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
  const windowControls = [
    { id: "min", label: "Minimieren", icon: Minus, color: "#f59e0b", action: safeMinimize },
    { id: "max", label: isMaximized ? "Wiederherstellen" : "Maximieren", icon: Square, color: "#38bdf8", action: safeMaximize },
    { id: "close", label: "Schliessen", icon: X, color: "#ef4444", action: safeClose },
  ];

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
      className={`nx-code-titlebar nx-code-titlebar-pro relative z-[60] flex shrink-0 select-none items-center justify-between overflow-visible ${compact ? "px-2" : "px-3"}`}
      style={{
        height: 38,
        minHeight: 38,
        flex: "0 0 38px",
        gap: compact ? 6 : 8,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(7, 10, 18, 0.88)",
        borderBottom: "1px solid var(--nexus-border)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.035), 0 1px 0 rgba(0,0,0,0.42)",
        backdropFilter: "blur(16px) saturate(118%)",
        // @ts-ignore
        WebkitAppRegion: isElectron ? "drag" : "no-drag",
      }}
    >
      <div
        className="flex min-w-0 flex-1 basis-0 items-center gap-2"
        style={{ paddingLeft: isMacOS ? MACOS_TRAFFIC_LIGHT_SAFE_WIDTH : 0 }}
      >
        {showWindowControls && (
          <div
            className="nx-code-window-controls flex shrink-0 items-center gap-1"
            // @ts-ignore
            style={{ WebkitAppRegion: "no-drag" }}
          >
            {windowControls.map((btn) => {
              const Icon = btn.icon;
              return (
              <motion.button
                key={btn.id}
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                transition={{ duration: reduceMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
                onClick={btn.action}
                title={btn.label}
                aria-label={btn.label}
                data-control={btn.id}
                className="nx-code-window-button"
                style={{ "--window-accent": btn.color }}
              >
                <span className="nx-code-window-dot" />
                <Icon size={11} className="nx-code-window-icon" />
              </motion.button>
              );
            })}
          </div>
        )}

        <div
          className={`nx-code-titlebar-brand min-w-0 shrink-0 items-center ${compact ? "hidden 2xl:flex" : "hidden 2xl:flex"}`}
          style={{
            height: 27,
            gap: 7,
            borderRadius: "8px",
            border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.105)",
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.04)",
            padding: "0 9px 0 6px",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.045)",
          }}
        >
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 19,
              height: 19,
              borderRadius: "7px",
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)",
              color: "var(--nexus-primary, #7c8cff)",
            }}
          >
            <Sparkles size={11} />
          </span>
          <span className="truncate text-[11px] font-semibold text-[var(--nexus-text)]">
            Nexus
          </span>
        </div>

        <div
          ref={menuHostRef}
          className="flex min-w-0 items-center gap-1"
          // @ts-ignore
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <div
            className={`nx-code-menu-host nx-code-menu-cluster items-center ${compact ? "hidden xl:flex" : "flex"}`}
            style={{
              height: 27,
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.045)",
              background: "rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(14px)",
            }}
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
          <div
            className={`nx-code-menu-host nx-code-menu-compact-host items-center ${compact ? "flex xl:hidden" : "hidden"}`}
            style={{
              height: 27,
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.045)",
              background: "rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(14px)",
            }}
          >
            <CompactMenuButton
              menus={menus}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
            />
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={safeCommandPalette}
        whileHover={reduceMotion ? undefined : { y: -1 }}
        whileTap={reduceMotion ? undefined : { scale: 0.995 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="nx-code-command-center nx-code-command-center-pro mx-1 flex min-w-0 flex-[1.25] items-center justify-center text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
        // @ts-ignore
        style={{
          height: 28,
          minHeight: 28,
          flex: "1 1 11rem",
          minWidth: compact ? 118 : 168,
          maxWidth: compact ? 390 : 500,
          gap: 7,
          borderRadius: "8px",
          border: "1px solid rgba(142, 153, 183, 0.105)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0.008)), rgba(0, 0, 0, 0.18)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.044)",
          padding: "0 9px",
          WebkitAppRegion: "no-drag",
        }}
        title="Command Center oeffnen"
      >
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 21,
            height: 21,
            borderRadius: "7px",
            border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.17)",
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            color: "var(--nexus-primary, #7c8cff)",
          }}
        >
          <Search size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-gray-200">
          <span>Nexus Command</span>
          <span className="hidden text-gray-500 lg:inline"> - Suche starten...</span>
          <span className="hidden text-gray-500 2xl:inline"> / {workspaceLabel}</span>
        </span>
        <span
          className="hidden shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold tabular-nums text-gray-400 xl:inline"
          style={{
            border: "1px solid rgba(255, 255, 255, 0.075)",
            background: "rgba(0, 0, 0, 0.12)",
          }}
        >
          {shellModeLabel}
        </span>
      </motion.button>

      <div
        className="flex min-w-0 flex-1 basis-0 items-center justify-end"
        // @ts-ignore
        style={{ gap: 6, WebkitAppRegion: "no-drag" }}
      >
        <ShellPill icon={Activity} label={activePanelLabel} />
        <ShellPill icon={Command} label={shellModeLabel} tone="primary" />
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
