import { createCommandRegistry } from './commandRegistry.ts';
export interface DockState { activePanel: string | null; bottomTab: string; bottomPanelOpen: boolean; sidebarRequired?: boolean }
export interface PanelSettings { sidebar_visible: boolean; zen_mode: boolean }
export interface WorkbenchCommandOwner<S extends PanelSettings> {
  setActivePanel: (update: string | null | ((previous: string | null) => string | null)) => void;
  setShowSettings: (visible: boolean) => void;
  setSettings: (update: (previous: S) => S) => void;
  readDockState: () => DockState;
  writeDockState: (next: DockState) => void;
  movePanel: (state: DockState, panelId: string, mode: 'open' | 'toggle') => DockState;
}
export function createWorkbenchCommandController<S extends PanelSettings>(owner: WorkbenchCommandOwner<S>) {
  function openPanel(panelId: string, mode: 'open' | 'toggle' = 'open') {
    owner.setShowSettings(false);
    const next = owner.movePanel(owner.readDockState(), panelId, mode);
    owner.writeDockState(next);
    // Preserve legacy terminal behavior: it never forces the side rail visible.
    if (panelId !== 'terminal' && next.sidebarRequired) owner.setSettings(previous => ({...previous,sidebar_visible:true,zen_mode:false}));
  }
  const registry = createCommandRegistry([
    { id:'workbench.toggleSidebar', title:'Sidebar umschalten', category:'workbench', defaultShortcut:'Ctrl+B', aliases:['toggle-sidebar'], searchTerms:['sidebar','panel'],
      handler:() => {
        owner.setShowSettings(false);
        owner.setSettings(previous => previous.sidebar_visible ? previous : {...previous,sidebar_visible:true,zen_mode:false});
        owner.setActivePanel(previous => previous ? null : 'explorer');
      } },
    { id:'workbench.openSettings', title:'Einstellungen', category:'workbench', defaultShortcut:'Ctrl+,', aliases:['open-settings','change-theme'], searchTerms:['settings','preferences','theme'],
      handler:() => { owner.setActivePanel(null); owner.setShowSettings(true); } },
    { id:'terminal.toggle', title:'Terminal umschalten', category:'terminal', defaultShortcut:'Ctrl+`', aliases:['toggle-terminal'],
      handler:() => openPanel('terminal','toggle') },
    { id:'terminal.open', title:'Terminal oeffnen', category:'terminal', defaultShortcut:'Ctrl+Shift+`', aliases:['terminal.new'],
      handler:() => openPanel('terminal') },
    { id:'workbench.openExplorer', title:'Explorer', category:'workbench', aliases:['open-explorer'], handler:() => openPanel('explorer') },
    { id:'workbench.openSearch', title:'Workspace Search', category:'workbench', defaultShortcut:'Ctrl+Shift+F', aliases:['open-search'], handler:() => openPanel('search') },
  ]);
  return { registry };
}
