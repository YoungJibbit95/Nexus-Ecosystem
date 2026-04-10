import { lazy } from 'react';
import { getFallbackViewsForApp } from '@nexus/core';
import type { View } from '../components/Sidebar';

const loadDashboardView = () => import('../views/DashboardView');
const loadNotesView = () => import('../views/NotesView');
const loadCodeView = () => import('../views/CodeView');
const loadTasksView = () => import('../views/TasksView');
const loadRemindersView = () => import('../views/RemindersView');
const loadCanvasView = () => import('../views/CanvasView');
const loadFilesView = () => import('../views/FilesView');
const loadFluxView = () => import('../views/FluxView');
const loadSettingsView = () => import('../views/SettingsView');
const loadInfoView = () => import('../views/InfoView');
const loadDevToolsView = () => import('../views/DevToolsView');
const loadNexusTerminal = () => import('../components/NexusTerminal');
const loadNexusToolbar = () => import('../components/NexusToolbar');

export const DashboardView = lazy(() =>
  loadDashboardView().then((m) => ({ default: m.DashboardView })),
);
export const NotesView = lazy(() =>
  loadNotesView().then((m) => ({ default: m.NotesView })),
);
export const CodeView = lazy(() =>
  loadCodeView().then((m) => ({ default: m.CodeView })),
);
export const TasksView = lazy(() =>
  loadTasksView().then((m) => ({ default: m.TasksView })),
);
export const RemindersView = lazy(() =>
  loadRemindersView().then((m) => ({ default: m.RemindersView })),
);
export const CanvasView = lazy(() =>
  loadCanvasView().then((m) => ({ default: m.CanvasView })),
);
export const FilesView = lazy(() =>
  loadFilesView().then((m) => ({ default: m.FilesView })),
);
export const FluxView = lazy(() =>
  loadFluxView().then((m) => ({ default: m.FluxView })),
);
export const SettingsView = lazy(() =>
  loadSettingsView().then((m) => ({ default: m.SettingsView })),
);
export const InfoView = lazy(() =>
  loadInfoView().then((m) => ({ default: m.InfoView })),
);
export const DevToolsView = lazy(() =>
  loadDevToolsView().then((m) => ({ default: m.DevToolsView })),
);
export const NexusTerminal = lazy(() =>
  loadNexusTerminal().then((m) => ({ default: m.NexusTerminal })),
);
export const NexusToolbar = lazy(() =>
  loadNexusToolbar().then((m) => ({ default: m.NexusToolbar })),
);

export const VIEW_IDS = getFallbackViewsForApp('main') as View[];

export const VIEW_CHUNK_PRELOADERS: Record<View, () => Promise<unknown>> = {
  dashboard: loadDashboardView,
  notes: loadNotesView,
  code: loadCodeView,
  tasks: loadTasksView,
  reminders: loadRemindersView,
  canvas: loadCanvasView,
  files: loadFilesView,
  flux: loadFluxView,
  settings: loadSettingsView,
  info: loadInfoView,
  devtools: loadDevToolsView,
};

const MAIN_PRELOAD_PRIORITY: View[] = [
  'dashboard',
  'notes',
  'tasks',
  'reminders',
  'settings',
  'files',
  'info',
  'flux',
  'canvas',
  'code',
  'devtools',
];
const MAIN_HEAVY_PRELOAD_VIEWS = new Set<View>(['code', 'canvas', 'devtools']);
const MAIN_PRELOAD_PROMISES = new WeakMap<
  () => Promise<unknown>,
  Promise<unknown>
>();

const runLoaderOnce = (loader: () => Promise<unknown>) => {
  const existing = MAIN_PRELOAD_PROMISES.get(loader);
  if (existing) return existing;
  const next = loader().catch((error) => {
    MAIN_PRELOAD_PROMISES.delete(loader);
    throw error;
  });
  MAIN_PRELOAD_PROMISES.set(loader, next);
  return next;
};

export const preloadMainViewChunk = (viewId: View) => {
  const loader = VIEW_CHUNK_PRELOADERS[viewId];
  if (typeof loader !== "function") return null;
  return {
    warm: MAIN_PRELOAD_PROMISES.has(loader),
    promise: runLoaderOnce(loader),
  };
};

export const isMainViewChunkWarm = (viewId: View) => {
  const loader = VIEW_CHUNK_PRELOADERS[viewId];
  if (typeof loader !== "function") return false;
  return MAIN_PRELOAD_PROMISES.has(loader);
};

const runIdle = (task: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(task, { timeout: 1_200 });
    return;
  }
  setTimeout(task, 80);
};

export const orderMainPreloadViews = (views: View[]) => {
  const seen = new Set<View>();
  return views
    .filter((viewId) => {
      if (seen.has(viewId)) return false;
      seen.add(viewId);
      return true;
    })
    .sort((a, b) => {
      const aIdx = MAIN_PRELOAD_PRIORITY.indexOf(a);
      const bIdx = MAIN_PRELOAD_PRIORITY.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
};

export const preloadMainViews = async (
  views: View[],
  options: {
    eagerLimit?: number;
    includeDeferred?: boolean;
    allowHeavy?: boolean;
  } = {},
) => {
  const eagerLimit = Math.max(
    1,
    Math.min(12, Math.floor(options.eagerLimit ?? 2)),
  );
  const includeDeferred = Boolean(options.includeDeferred);
  const allowHeavy = options.allowHeavy === true;
  const loaders = orderMainPreloadViews(views)
    .filter((viewId) => allowHeavy || !MAIN_HEAVY_PRELOAD_VIEWS.has(viewId))
    .map((viewId) => VIEW_CHUNK_PRELOADERS[viewId])
    .filter(
      (loader): loader is () => Promise<unknown> =>
        typeof loader === 'function',
    );

  const uniqueLoaders = [...new Set(loaders)];
  if (uniqueLoaders.length === 0) return;

  const eager = uniqueLoaders.slice(0, eagerLimit);
  const deferred = uniqueLoaders.slice(eagerLimit);
  await Promise.allSettled(eager.map((loader) => runLoaderOnce(loader)));

  if (includeDeferred && deferred.length > 0) {
    runIdle(() => {
      void Promise.allSettled(deferred.map((loader) => runLoaderOnce(loader)));
    });
  }
};
