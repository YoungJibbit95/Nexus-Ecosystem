import React, { useEffect, useRef, useState } from "react";
import {
  EyeOff,
  GripVertical,
  MoreHorizontal,
  PanelBottom,
  PanelLeft,
  PanelRight,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import {
  getPanelMeta,
} from "./editorShellLayout";
import {
  getBottomPanelSizeOptions,
  getSidePanelSizeOptions,
  getWorkbenchLayoutPresetOptions,
  WORKBENCH_SNAP_ZONES,
} from "./workbenchDockModel";

export const SIDE_PANEL_SIZE_OPTIONS = getSidePanelSizeOptions();
export const BOTTOM_PANEL_SIZE_OPTIONS = getBottomPanelSizeOptions();
export const WORKBENCH_PRESET_OPTIONS = getWorkbenchLayoutPresetOptions();

export const DOCK_ZONE_OPTIONS = Object.freeze([
  {
    zone: WORKBENCH_SNAP_ZONES.left,
    label: "Links",
    shortLabel: "L",
    Icon: PanelLeft,
    dropClassName: "left-3 top-14 bottom-20 w-[min(12rem,28vw)]",
  },
  {
    zone: WORKBENCH_SNAP_ZONES.right,
    label: "Rechts",
    shortLabel: "R",
    Icon: PanelRight,
    dropClassName: "right-3 top-14 bottom-20 w-[min(12rem,28vw)]",
  },
  {
    zone: WORKBENCH_SNAP_ZONES.bottom,
    label: "Unten",
    shortLabel: "B",
    Icon: PanelBottom,
    dropClassName: "left-4 right-4 bottom-4 h-[4.75rem]",
  },
  {
    zone: WORKBENCH_SNAP_ZONES.hidden,
    label: "Hidden",
    shortLabel: "H",
    Icon: EyeOff,
    dropClassName: "left-1/2 top-3 w-60 max-w-[90vw] -translate-x-1/2",
  },
]);

const DOCK_MENU_LABELS = Object.freeze({
  [WORKBENCH_SNAP_ZONES.left]: "Links docken",
  [WORKBENCH_SNAP_ZONES.right]: "Rechts docken",
  [WORKBENCH_SNAP_ZONES.bottom]: "Unten docken",
  [WORKBENCH_SNAP_ZONES.hidden]: "Ausblenden",
});

export function StatusItem({
  icon: Icon,
  label,
  value,
  tone = "muted",
  onClick,
  title,
  iconOnly = false,
  className = "",
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-300 border-red-500/20 bg-red-500/10"
      : tone === "warning"
        ? "text-amber-200 border-amber-500/20 bg-amber-500/10"
        : tone === "active"
          ? "text-white border-white/15 bg-white/10"
          : "text-gray-400 border-white/10 bg-white/[0.025]";
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title || label}
      className={`nx-code-status-item h-7 min-w-0 max-w-full rounded-md border px-2 flex items-center justify-center gap-1.5 text-[10px] font-medium leading-none ${toneClass} ${onClick ? "hover:bg-white/10 transition-colors" : ""} ${iconOnly ? "nx-code-status-item-icon w-7 px-0" : ""} ${className}`}
    >
      {Icon ? <Icon size={12} className="shrink-0" /> : null}
      {iconOnly ? (
        <span className="sr-only">{value || label}</span>
      ) : (
        <span className="truncate">{value || label}</span>
      )}
    </Comp>
  );
}

function DockDragHandle({
  panelId,
  label,
  onDragStart,
  onDragEnd,
  className = "",
}) {
  if (!panelId) return null;

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onDragStart?.(event, panelId)}
      onDragEnd={onDragEnd}
      className={`flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-white/10 text-[var(--nexus-muted)] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200 active:cursor-grabbing ${className}`}
      title={`${label || getPanelMeta(panelId).title} ziehen`}
      aria-label={`${label || getPanelMeta(panelId).title} ziehen`}
    >
      <GripVertical size={13} />
    </button>
  );
}

function WorkbenchMenuItem({ item, onSelect }) {
  if (item.separator) {
    return <div className="my-1 h-px bg-white/[0.07]" role="separator" />;
  }

  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        item.action?.();
        onSelect();
      }}
      disabled={item.disabled}
      className={`nx-code-menu-item ${item.active ? "is-active" : ""} ${
        item.disabled ? "is-disabled" : ""
      }`}
      role="menuitem"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon ? <Icon size={13} className="shrink-0" /> : null}
        <span className="min-w-0 truncate">{item.label}</span>
      </span>
      {item.shortcut ? (
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-gray-500">
          {item.shortcut}
        </span>
      ) : null}
    </button>
  );
}

function WorkbenchOverflowButton({
  title = "Workbench Optionen",
  items,
  align = "right",
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    const onPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", close);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", close);
    };
  }, [open]);

  const xClass = align === "left" ? "left-0" : "right-0";

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((prev) => !prev)}
        className="nx-code-workbench-menu-trigger flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-[var(--nexus-muted)] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
        title={title}
      >
        <MoreHorizontal size={13} />
      </button>
      {open ? (
        <div
          className={`nx-code-menu-dropdown nx-code-workbench-menu absolute ${xClass} top-full z-50 mt-1 w-[min(14rem,calc(100vw-1rem))] overflow-hidden p-1`}
          role="menu"
        >
          {items.map((item, index) => (
            <WorkbenchMenuItem
              key={`${item.label || "separator"}-${index}`}
              item={item}
              onSelect={() => setOpen(false)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getDockMenuItems(panelId, activeZone, onDockPanel) {
  if (!panelId) return [];

  return DOCK_ZONE_OPTIONS.map(({ zone, Icon }) => ({
    label: DOCK_MENU_LABELS[zone] || zone,
    icon: Icon,
    active: activeZone === zone,
    action: () => onDockPanel?.(panelId, zone),
  }));
}

function getDockZonePanelSummary(panelIds) {
  if (!panelIds?.length) return "Leer";
  const visiblePanelNames = panelIds
    .slice(0, 3)
    .map((panelId) => getPanelMeta(panelId).title);
  const remainingCount = panelIds.length - visiblePanelNames.length;
  return remainingCount > 0
    ? `${visiblePanelNames.join(" / ")} +${remainingCount}`
    : visiblePanelNames.join(" / ");
}

export function CompactBottomDockBar({
  activePanelId,
  activeZone,
  size,
  onSizeChange,
  onDockPanel,
  onResetLayout,
  onClose,
  onPanelDragStart,
  onPanelDragEnd,
}) {
  if (!activePanelId) return null;
  const meta = getPanelMeta(activePanelId);
  const bottomMenuItems = [
    ...BOTTOM_PANEL_SIZE_OPTIONS.map((option) => ({
      label: `Hoehe ${option.title}`,
      icon: PanelBottom,
      active: option.id === size,
      action: () => onSizeChange?.(option.id),
    })),
    { separator: true },
    ...getDockMenuItems(activePanelId, activeZone, onDockPanel),
    { separator: true },
    {
      label: "Layout zuruecksetzen",
      icon: RefreshCcw,
      action: onResetLayout,
    },
  ];

  return (
    <div
      className="nx-code-bottom-dock-bar flex h-9 shrink-0 items-center gap-2 overflow-visible border-b border-white/5 px-2"
      style={{ background: "rgba(0,0,0,0.14)" }}
    >
      <DockDragHandle
        panelId={activePanelId}
        label={meta.title}
        onDragStart={onPanelDragStart}
        onDragEnd={onPanelDragEnd}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold uppercase text-[var(--nexus-text)]">
          {meta.title}
        </div>
      </div>
      <WorkbenchOverflowButton
        title="Bottom-Dock Optionen"
        items={bottomMenuItems}
      />
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-gray-500 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200"
        title="Bottom Dock schliessen"
      >
        <XCircle size={13} />
      </button>
    </div>
  );
}

export function WorkbenchDockDropOverlay({
  panelId,
  preview,
  zonePanelIds,
  onZoneDragOver,
  onZoneDrop,
}) {
  if (!panelId) return null;
  const panelTitle = getPanelMeta(panelId).title;
  const activeZone = preview?.targetZone || null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <div className="absolute inset-0 bg-black/[0.08]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex max-w-[min(18rem,80vw)] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
        <GripVertical size={14} className="text-[var(--nexus-muted)]" />
        <span className="truncate">{panelTitle}</span>
      </div>
      {DOCK_ZONE_OPTIONS.map((option) => {
        const isActive = activeZone === option.zone;
        const panelSummary = getDockZonePanelSummary(zonePanelIds[option.zone]);
        const Icon = option.Icon;
        return (
          <div
            key={option.zone}
            role="button"
            tabIndex={-1}
            data-workbench-drop-zone={option.zone}
            onDragEnter={(event) => onZoneDragOver(event, option.zone)}
            onDragOver={(event) => onZoneDragOver(event, option.zone)}
            onDrop={(event) => onZoneDrop(event, option.zone)}
            className={`pointer-events-auto absolute flex min-h-16 flex-col justify-center gap-1 rounded-lg border px-3 py-2 shadow-2xl backdrop-blur-md transition-colors ${option.dropClassName} ${
              isActive
                ? "border-white/25 bg-white/[0.13] text-white ring-1 ring-white/25"
                : "border-white/10 bg-black/35 text-[var(--nexus-muted)]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon size={14} className="shrink-0" />
              <span className="truncate text-[11px] font-bold uppercase">
                {option.label}
              </span>
              {isActive ? (
                <span className="ml-auto shrink-0 rounded border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  {option.shortLabel}
                </span>
              ) : null}
            </div>
            <div className="truncate text-[10px] leading-tight opacity-80">
              {panelSummary}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BottomDockControls({
  size,
  presetId,
  activePanelId,
  activeZone,
  onSizeChange,
  onPresetChange,
  onDockPanel,
  onPanelDragStart,
  onPanelDragEnd,
  onResetLayout,
  onClose,
  compact = false,
}) {
  if (compact) return null;
  const bottomMenuItems = [
    ...WORKBENCH_PRESET_OPTIONS.map((option) => ({
      label: `Layout ${option.title}`,
      icon: RefreshCcw,
      active: option.id === presetId,
      action: () => onPresetChange(option.id),
    })),
    { separator: true },
    ...BOTTOM_PANEL_SIZE_OPTIONS.map((option) => ({
      label: `Hoehe ${option.title}`,
      icon: PanelBottom,
      active: option.id === size,
      action: () => onSizeChange(option.id),
    })),
    { separator: true },
    ...getDockMenuItems(activePanelId, activeZone, onDockPanel),
    { separator: true },
    {
      label: "Layout zuruecksetzen",
      icon: RefreshCcw,
      action: onResetLayout,
    },
  ];

  return (
    <div className="hidden shrink-0 items-center gap-1 lg:flex">
      {activePanelId ? (
        <React.Fragment>
          <DockDragHandle
            panelId={activePanelId}
            onDragStart={onPanelDragStart}
            onDragEnd={onPanelDragEnd}
          />
          <WorkbenchOverflowButton
            title="Bottom-Dock Optionen"
            items={bottomMenuItems}
          />
        </React.Fragment>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-gray-500 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200"
        title="Bottom Dock schliessen"
      >
        <XCircle size={13} />
      </button>
    </div>
  );
}

export function SidePanelFrame({
  panelId,
  onClose,
  children,
  sidePanelSize,
  onSidePanelSizeChange,
  onDockPanel,
  onPanelDragStart,
  onPanelDragEnd,
  snapZone,
}) {
  const meta = getPanelMeta(panelId);
  const sidePanelMenuItems = [
    ...SIDE_PANEL_SIZE_OPTIONS.map((option) => ({
      label: `Breite ${option.title}`,
      icon: PanelLeft,
      active: option.id === sidePanelSize,
      action: () => onSidePanelSizeChange?.(option.id),
    })),
    { separator: true },
    ...getDockMenuItems(panelId, snapZone, onDockPanel),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="nx-code-panel-windowbar flex h-9 shrink-0 items-center gap-1.5 overflow-visible border-b border-white/[0.04] px-2"
        style={{ background: "rgba(0,0,0,0.08)" }}
      >
        <DockDragHandle
          panelId={panelId}
          label={meta.title}
          onDragStart={onPanelDragStart}
          onDragEnd={onPanelDragEnd}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold text-[var(--nx-code-strong-text)]">
            {meta.title}
          </div>
        </div>
        <WorkbenchOverflowButton
          title={`${meta.title} Optionen`}
          items={sidePanelMenuItems}
        />
        <span className="sr-only" aria-label="Side panel width">
          Side panel width
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-gray-500 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200"
          title="Panel schliessen"
        >
          <XCircle size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
