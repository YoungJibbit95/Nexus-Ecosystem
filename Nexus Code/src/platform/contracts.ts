export type Dispose = () => PlatformResult<void>;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Options = Record<string, JsonValue | undefined>;
export type PlatformErrorCode = 'UNAVAILABLE' | 'INVALID_RESPONSE' | 'INVALID_INPUT' | 'PERMISSION_DENIED' | 'RESOURCE_LIMIT' | 'TIMEOUT' | 'CANCELED' | 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'OPERATION_FAILED';
export interface PlatformError {
  code: PlatformErrorCode;
  message: string;
  operation: string;
  retryable: boolean;
  technical?: { kind: string; nativeCode?: string };
}
export type PlatformResult<T> = { ok: true; data: T } | { ok: false; error: PlatformError };
export interface Capability {
  state: 'available' | 'degraded' | 'unavailable';
  missingOperations: readonly string[];
  reason?: string;
}
export interface DirectoryEntry {
  name: string; path: string; isDirectory: boolean;
  size: number | null; modified: unknown;
}
export interface TerminalRun { id: number; command: string; cwd?: string }
export interface TerminalInput { id: number; input: string }
export interface TerminalOutput { type: string; text: string }
export interface LspStart { languageId: string; workspacePath: string }
export interface LspRequest { sessionId: string; method: string; params?: JsonValue; timeoutMs?: number }
export interface LspSession { sessionId: string }
type AsyncPort<Args extends unknown[], T> = (...args: Args) => Promise<PlatformResult<T>>;
type Subscription<T, Args extends unknown[] = []> = (...args: [...Args, (value: T) => void]) => PlatformResult<Dispose>;
export interface WindowPort {
  capability: Capability;
  minimize: AsyncPort<[], void>; maximize: AsyncPort<[], void>; close: AsyncPort<[], void>;
  isMaximized: AsyncPort<[], boolean>;
  onMaximized: Subscription<boolean>; onFullscreen: Subscription<boolean>;
}
export interface WorkspacePort {
  capability: Capability;
  openFolder: AsyncPort<[], string | null>;
  readDir: AsyncPort<[path: string], DirectoryEntry[]>;
  readFile: AsyncPort<[path: string], string>;
  writeFile: AsyncPort<[path: string, content: string], boolean>;
  mkdir: AsyncPort<[path: string], boolean>; delete: AsyncPort<[path: string], boolean>;
  rename: AsyncPort<[oldPath: string, newPath: string], boolean>;
  openSystemTerminal: AsyncPort<[cwd?: string], unknown>;
}
export interface TerminalPort {
  capability: Capability;
  run: AsyncPort<[payload: TerminalRun], void>;
  input: AsyncPort<[payload: TerminalInput], void>;
  kill: AsyncPort<[id: number], void>;
  onOutput: Subscription<TerminalOutput, [id: number]>;
  onExit: Subscription<number, [id: number]>;
  onReady: Subscription<void, [id: number]>;
}
export interface GitPort {
  capability: Capability;
  status: AsyncPort<[repo: string], unknown>; remotes: AsyncPort<[repo: string], unknown>;
  diff: AsyncPort<[repo: string, options?: Options], unknown>;
  stage: AsyncPort<[repo: string, options?: Options], unknown>;
  unstage: AsyncPort<[repo: string, options?: Options], unknown>;
  commit: AsyncPort<[repo: string, options?: Options], unknown>;
  branch: AsyncPort<[repo: string, options?: Options], unknown>;
  log: AsyncPort<[repo: string, options?: Options], unknown>;
}
export const githubOperations = [
  'getAuthStatus', 'startDeviceFlow', 'pollDeviceFlow', 'signOut', 'getViewer', 'listRepositories', 'getRateLimit',
  'listIssues', 'getIssue', 'createIssue', 'updateIssue', 'listIssueComments', 'createIssueComment',
  'listPullRequests', 'getPullRequest', 'createPullRequest', 'updatePullRequest', 'listPullRequestFiles',
  'listPullRequestCommits', 'listPullRequestReviews', 'createPullRequestReview', 'mergePullRequest',
  'updatePullRequestBranch', 'listProjectsV2', 'getProjectV2', 'listProjectV2Items', 'addProjectV2Item', 'updateProjectV2ItemField',
] as const;
type GithubOperation = typeof githubOperations[number];
// Payloads beyond the migrated slice stay quarantined as JSON/unknown, not falsely typed domain entities.
export type GithubPort = {
  capability: Capability;
  pollDeviceFlow: AsyncPort<[flow: string | Options], unknown>;
} & Record<Exclude<GithubOperation,'pollDeviceFlow'>, AsyncPort<[options?: Options], unknown>>;
export interface LspPort {
  capability: Capability;
  start: AsyncPort<[payload: LspStart], unknown>;
  request: AsyncPort<[payload: LspRequest], unknown>;
  notify: AsyncPort<[payload: LspRequest], void>;
  stop: AsyncPort<[payload: LspSession], unknown>;
  list: AsyncPort<[], unknown>; listServers: AsyncPort<[], unknown>;
  onNotification: Subscription<unknown, [sessionId: string]>;
  onStatus: Subscription<unknown, [sessionId: string]>;
}
export interface Platform {
  kind: 'electron' | 'browser' | 'test';
  os: string;
  window: WindowPort; workspace: WorkspacePort; terminal: TerminalPort;
  git: GitPort; github: GithubPort; lsp: LspPort;
}
