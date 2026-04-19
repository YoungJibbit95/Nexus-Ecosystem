import React, { useState, useEffect, useRef } from "react";
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
        onClick={() => setActiveMenu(isOpen ? null : label)}
        className="px-3 py-1 text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all outline-none"
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
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 mt-1 min-w-[160px] p-1 bg-black/80 backdrop-blur-2xl border border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden"
              // @ts-ignore
              style={{ WebkitAppRegion: "no-drag" }}
            >
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setActiveMenu(null);
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] rounded-lg transition-colors
                    ${item.disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5 text-gray-300 hover:text-white"}`}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-[9px] opacity-40 ml-4 font-mono">{item.shortcut}</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  workspaceName 
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuHostRef = useRef(null);

  useEffect(() => {
    if (!isElectron) return;
    win.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    const unsub1 = win.electronAPI.onMaximized(setIsMaximized);
    return () => unsub1?.();
  }, []);

  useEffect(() => {
    if (!activeMenu) return;

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
  const safeOpenSettings = onOpenSettings || (() => {});
  const safeClose = () => win.electronAPI?.close?.();
  const safeMinimize = () => win.electronAPI?.minimize?.();
  const safeMaximize = () => win.electronAPI?.maximize?.();
  const showWindowControls = !isMacOS;

  const MENUS = [
    {
      label: "Datei",
      items: [
        { label: "Neue Datei", shortcut: "Ctrl+N", action: safeNewFile },
        { label: "Ordner öffnen...", shortcut: "Ctrl+O", action: onOpenFolder },
        { label: "Workspace speichern", shortcut: "Ctrl+S", action: safeSaveAll },
        { label: "Trennen", disabled: true },
        { label: "Beenden", shortcut: "Alt+F4", action: safeClose },
      ]
    },
    {
      label: "Ansicht",
      items: [
        { label: "Explorer umschalten", shortcut: "Ctrl+B", action: onToggleSidebar },
        { label: "Sidebar umschalten", action: onToggleSidebarVisibility },
        { label: "Zen Modus", shortcut: "Ctrl+K Z", action: onToggleZenMode },
        { label: "Terminal", shortcut: "Ctrl+`", action: onToggleTerminal },
      ]
    },
    {
      label: "Terminal",
      items: [
        { label: "Neues Terminal", shortcut: "Ctrl+Shift+`", action: onToggleTerminal },
        { label: "Terminal umschalten", shortcut: "Ctrl+`", action: onToggleTerminal },
        { label: "Terminal leeren", action: onToggleTerminal },
      ]
    },
    {
      label: "Extras",
      items: [
        { label: "Befehlspalette...", shortcut: "F1", action: onOpenCommandPalette },
        { label: "Einstellungen", shortcut: "Ctrl+,", action: safeOpenSettings },
        { label: "Tastenkombinationen", action: onOpenCommandPalette },
      ]
    }
  ];

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-10 flex items-center justify-between px-4 shrink-0 select-none border-b border-white/5 relative z-50"
      style={{
        background: "var(--nexus-surface)",
        borderBottom: "1px solid var(--nexus-border)",
        backdropFilter: "blur(20px)",
        // @ts-ignore
        WebkitAppRegion: isElectron ? "drag" : "no-drag",
      }}
    >
      <div
        className="flex items-center gap-1.5 shrink-0 min-w-0 pr-4"
        style={{ paddingLeft: isMacOS ? MACOS_TRAFFIC_LIGHT_SAFE_WIDTH : 0 }}
      >
        {showWindowControls && (
          <div
            className="flex items-center gap-1.5 mr-2"
            // @ts-ignore
            style={{ WebkitAppRegion: "no-drag" }}
            onMouseEnter={() => setHoveredBtn("group")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            {[
              { id: "close", color: "#ff5f57", symbol: "✕", action: safeClose },
              { id: "min", color: "#febc2e", symbol: "−", action: safeMinimize },
              { id: "max", color: "#28c840", symbol: isMaximized ? "⊟" : "⊞", action: safeMaximize },
            ].map((btn) => (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.85 }}
                onClick={btn.action}
                className="w-3 h-3 rounded-full flex items-center justify-center focus:outline-none"
                style={{
                  background: btn.color,
                  boxShadow:
                    hoveredBtn === "group" ? `0 0 6px ${btn.color}80` : "none",
                  cursor: "pointer",
                }}
              >
                <motion.span
                  animate={{ opacity: hoveredBtn === "group" ? 1 : 0 }}
                  className="text-white font-bold leading-none pointer-events-none"
                  style={{ fontSize: 7, marginTop: "0.5px" }}
                >
                  {btn.symbol}
                </motion.span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Menu Bar */}
        <div
          ref={menuHostRef}
          className="flex items-center gap-1"
          // @ts-ignore
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {MENUS.map(menu => (
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

      <div className="flex-1 flex items-center justify-center pointer-events-none mx-8 overflow-hidden">
        <span
          className="text-[10px] text-gray-500 tracking-[0.2em] font-bold uppercase truncate max-w-[50vw]"
        >
          {workspaceName ? `Nexus Code — ${workspaceName}` : "Nexus Code"}
        </span>
      </div>

      <div className="w-12 shrink-0 flex items-center justify-end">
        {/* Placeholder for future right-side icons like Sync, GitHub, etc. */}
      </div>
    </motion.div>
  );
}
