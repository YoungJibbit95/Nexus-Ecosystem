import type { DirectoryEntry, GithubPort, Options, Platform, TerminalOutput } from './contracts.ts';
import { githubOperations } from './contracts.ts';
import { createBridgeAdapter, decodeBoolean, decodeString, decodeUnknown, decodeVoid } from './bridgeAdapter.ts';
import { isRecord } from './errors.ts';
const githubMethod = (operation: string) => `github${operation[0].toUpperCase()}${operation.slice(1)}`;
function createPlatform(kind: Platform['kind'], source?: unknown): Platform {
  const bridge = createBridgeAdapter(source);
  const os = isRecord(source) && typeof source.platform === 'string' ? source.platform : 'browser';
  const plain = <T>(operation: string, method: string, args: unknown[], decode: (value: unknown) => T) => bridge.call(operation, method, args, decode);
  const native = (operation: string, method: string, args: unknown[]) => bridge.call(operation, method, args, decodeUnknown, true);
  const acknowledge = (value: unknown): boolean => {
    if (value !== true) throw new TypeError('Missing write acknowledgment');
    return true;
  };
  const directoryEntries = (value: unknown): DirectoryEntry[] => {
    if (!Array.isArray(value)) throw new TypeError('Invalid directory response');
    return value.map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.name !== 'string' || typeof entry.path !== 'string' || typeof entry.isDirectory !== 'boolean') throw new TypeError('Invalid directory entry');
      return { name: entry.name, path: entry.path, isDirectory: entry.isDirectory,
        size: typeof entry.size === 'number' ? entry.size : null, modified: entry.modified };
    });
  };
  const github = Object.fromEntries(githubOperations.map(operation => [operation,
    (options?: Options | string) => native(`github.${operation}`, githubMethod(operation), options === undefined ? [] : [options]),
  ])) as Omit<GithubPort, 'capability'>;
  return {
    kind, os,
    window: {
      capability: bridge.capability(['minimize','maximize','close','isMaximized','onMaximized','onFullscreen']),
      minimize: () => plain('window.minimize','minimize',[],decodeVoid),
      maximize: () => plain('window.maximize','maximize',[],decodeVoid),
      close: () => plain('window.close','close',[],decodeVoid),
      isMaximized: () => plain('window.isMaximized','isMaximized',[],decodeBoolean),
      onMaximized: callback => bridge.subscribe('window.onMaximized','onMaximized',[],callback,decodeBoolean),
      onFullscreen: callback => bridge.subscribe('window.onFullscreen','onFullscreen',[],callback,decodeBoolean),
    },
    workspace: {
      capability: bridge.capability(['openFolder','readDir','readFile','writeFile','mkdir','delete','rename','openSystemTerminal']),
      openFolder: () => plain('workspace.openFolder','openFolder',[],value => value === null ? null : decodeString(value)),
      readDir: path => plain('workspace.readDir','readDir',[path],directoryEntries),
      readFile: path => plain('workspace.readFile','readFile',[path],decodeString),
      writeFile: (path,content) => plain('workspace.writeFile','writeFile',[path,content],acknowledge),
      mkdir: path => plain('workspace.mkdir','mkdir',[path],acknowledge),
      delete: path => plain('workspace.delete','delete',[path],acknowledge),
      rename: (oldPath,newPath) => plain('workspace.rename','rename',[oldPath,newPath],acknowledge),
      openSystemTerminal: cwd => plain('workspace.openSystemTerminal','openSystemTerminal',[cwd],decodeUnknown),
    },
    terminal: {
      capability: bridge.capability(['terminalRun','terminalInput','terminalKill','onTerminalOutput','onTerminalExit','onTerminalReady']),
      run: payload => plain('terminal.run','terminalRun',[payload],decodeVoid),
      input: payload => plain('terminal.input','terminalInput',[payload],decodeVoid),
      kill: id => plain('terminal.kill','terminalKill',[id],decodeVoid),
      onOutput: (id,callback) => bridge.subscribe('terminal.onOutput','onTerminalOutput',[id],callback,(value): TerminalOutput => {
        if (!isRecord(value) || typeof value.type !== 'string' || typeof value.text !== 'string') throw new TypeError('Invalid output event');
        return {type:value.type,text:value.text};
      }),
      onExit: (id,callback) => bridge.subscribe('terminal.onExit','onTerminalExit',[id],callback,value => {
        if (typeof value !== 'number' || !Number.isInteger(value)) throw new TypeError('Invalid exit event'); return value;
      }),
      onReady: (id,callback) => bridge.subscribe('terminal.onReady','onTerminalReady',[id],callback,decodeVoid),
    },
    git: {
      capability: bridge.capability(['gitStatus','gitDiff','gitStage','gitUnstage','gitCommit','gitBranch','gitLog','gitRemotes']),
      status: repo => native('git.status','gitStatus',[repo]), remotes: repo => native('git.remotes','gitRemotes',[repo]),
      diff: (repo,options = {}) => native('git.diff','gitDiff',[repo,options]),
      stage: (repo,options = {}) => native('git.stage','gitStage',[repo,options]),
      unstage: (repo,options = {}) => native('git.unstage','gitUnstage',[repo,options]),
      commit: (repo,options = {}) => native('git.commit','gitCommit',[repo,options]),
      branch: (repo,options = {}) => native('git.branch','gitBranch',[repo,options]),
      log: (repo,options = {}) => native('git.log','gitLog',[repo,options]),
    },
    github: { ...github, capability: bridge.capability(githubOperations.map(githubMethod)) },
    lsp: {
      capability: bridge.capability(['lspStart','lspRequest','lspNotify','lspStop','lspList','lspListServers','onLspNotification','onLspStatus']),
      start: payload => native('lsp.start','lspStart',[payload]),
      request: payload => native('lsp.request','lspRequest',[payload]),
      notify: payload => plain('lsp.notify','lspNotify',[payload],decodeVoid),
      stop: payload => native('lsp.stop','lspStop',[payload]),
      list: () => native('lsp.list','lspList',[]), listServers: () => native('lsp.listServers','lspListServers',[]),
      onNotification: (id,callback) => bridge.subscribe('lsp.onNotification','onLspNotification',[id],callback,decodeUnknown),
      onStatus: (id,callback) => bridge.subscribe('lsp.onStatus','onLspStatus',[id],callback,decodeUnknown),
    },
  };
}
export const createElectronPlatform = (bridge: unknown): Platform => createPlatform('electron',bridge);
export const createTestPlatform = (bridge: unknown): Platform => createPlatform('test',bridge);
export const createBrowserPlatform = (): Platform => createPlatform('browser');
export function getRendererPlatform(): Platform {
  const environment = globalThis as unknown as { window?: { electronAPI?: unknown } };
  const bridge = environment.window?.electronAPI;
  return isRecord(bridge) && bridge.isElectron === true ? createElectronPlatform(bridge) : createBrowserPlatform();
}
