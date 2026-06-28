import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  GitBranch,
  GitFork,
  Minus,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildFallbackGitStatus,
  clearDeprecatedGithubToken,
  commitLocalGit,
  getGitCapability,
  getGithubBackendCapability,
  inferWorkspaceRoot,
  loadGithubAuthStatus,
  loadGithubCommitHistory,
  loadGithubRepositories,
  loadGithubSession,
  loadLocalGitDiff,
  loadLocalGitHistory,
  loadLocalGitRemotes,
  loadLocalGitStatus,
  pullLocalGit,
  pushLocalGit,
  readGithubSettings,
  saveGithubRepositorySettings,
  pollGithubDeviceFlow,
  signOutGithub,
  stageGitPath,
  startGithubDeviceFlow,
  unstageGitPath,
} from "../../pages/editor/gitPanelModel";

const DIFF_LINE_LIMIT = 220;

const STATUS_META = {
  M: { label: "Modified", color: "#fbbf24" },
  A: { label: "Added", color: "#22c55e" },
  D: { label: "Deleted", color: "#ef4444" },
  R: { label: "Renamed", color: "#3b82f6" },
  C: { label: "Conflict", color: "#f97316" },
  U: { label: "Untracked", color: "#9ca3af" },
};

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  action,
  actionLabel,
  actionDisabled = false,
  actionTitle,
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 flex flex-1 items-center gap-1.5 rounded-md px-1 py-1 hover:bg-white/[0.03] transition-colors"
      >
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown size={11} className="text-gray-600" />
        </motion.div>
        <span className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase flex-1 text-left truncate">
          {title}
        </span>
        {count != null && count > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(128,0,255,0.15)", color: "#a855f7" }}
          >
            {count}
          </span>
        )}
      </button>
      {action && (
        <button
          type="button"
          onClick={action}
          disabled={actionDisabled}
          title={actionTitle || actionLabel}
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function CapabilityPill({ icon: Icon, label, tone = "neutral", title }) {
  const palette =
    tone === "ready"
      ? {
          color: "#86efac",
          background: "rgba(34,197,94,0.1)",
          border: "rgba(34,197,94,0.22)",
        }
      : tone === "warn"
        ? {
            color: "#fbbf24",
            background: "rgba(251,191,36,0.08)",
            border: "rgba(251,191,36,0.22)",
          }
        : {
            color: "#94a3b8",
            background: "rgba(148,163,184,0.07)",
            border: "rgba(148,163,184,0.14)",
          };

  return (
    <div
      title={title || label}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md min-w-0"
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Icon size={10} className="shrink-0" />
      <span className="text-[10px] font-medium truncate">{label}</span>
    </div>
  );
}

function SummaryTile({ label, value, tone = "neutral", title }) {
  const color =
    tone === "good"
      ? "#86efac"
      : tone === "warn"
        ? "#fbbf24"
        : tone === "hot"
          ? "#fca5a5"
          : "#cbd5e1";

  return (
    <div
      title={title}
      className="min-w-0 rounded-md border border-white/5 bg-black/20 px-2 py-1.5"
    >
      <div className="text-[9px] uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-[11px] font-semibold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, detail, tone = "muted" }) {
  const isGood = tone === "good";
  return (
    <div className="mx-3 mb-2 rounded-lg border border-white/5 bg-black/15 px-3 py-3">
      <div className="flex items-start gap-2">
        {isGood ? (
          <Check size={13} className="mt-0.5 shrink-0 text-green-400" />
        ) : (
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-gray-500" />
        )}
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold ${
              isGood ? "text-green-200" : "text-gray-300"
            }`}
          >
            {title}
          </p>
          {detail && (
            <p className="mt-1 text-[11px] leading-snug text-gray-600">
              {detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, staged, selected, busy, onSelect, onToggle }) {
  const meta = STATUS_META[file.status] || STATUS_META.U;
  const actionLabel = staged ? "Unstage" : "Stage";
  const scopeLabel =
    file.changeScope === "untracked"
      ? "Untracked"
      : file.changeScope === "conflict"
        ? "Conflict"
        : staged
          ? "Index"
          : "Working tree";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0 }}
      className="px-2 pb-1"
    >
      <div
        className="group flex items-center rounded-md border transition-colors"
        style={{
          background: selected ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.015)",
          borderColor: selected ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(file)}
          className="min-w-0 flex flex-1 items-center gap-2 px-2 py-1.5 text-left"
          title={`${meta.label}: ${file.path || file.name}`}
        >
          <span
            className="text-[10px] font-bold w-4 shrink-0 text-center"
            style={{ color: meta.color }}
          >
            {file.status}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-mono text-gray-300 group-hover:text-gray-100">
              {file.name}
            </span>
            <span className="block truncate text-[10px] text-gray-600">
              {scopeLabel}
              {file.originalPath ? ` from ${file.originalPath}` : ""}
            </span>
          </span>
          {(file.additions > 0 || file.deletions > 0) && (
            <span className="text-[10px] text-gray-600 font-mono shrink-0">
              +{file.additions} -{file.deletions}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggle(file)}
          disabled={busy}
          title={`${actionLabel} ${file.path || file.name}`}
          className="mr-1 flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? (
            <RefreshCw size={10} className="animate-spin" />
          ) : staged ? (
            <Minus size={10} className="text-red-300" />
          ) : (
            <Plus size={10} className="text-green-300" />
          )}
          <span>{actionLabel}</span>
        </button>
      </div>
    </motion.div>
  );
}

function DiffViewer({
  selectedFile,
  diffText,
  diffLoading,
  diffError,
  canDiff,
  hasLocalGit,
}) {
  const lines = useMemo(() => diffText.split(/\r?\n/), [diffText]);
  const visibleLines = lines.slice(0, DIFF_LINE_LIMIT);
  const truncated = lines.length > DIFF_LINE_LIMIT;

  if (!selectedFile) {
    return (
      <EmptyState
        title="Select a changed file"
        detail="Choose a staged or unstaged entry to inspect the diff returned by the local Git bridge."
      />
    );
  }

  if (!hasLocalGit || selectedFile.source !== "git") {
    return (
      <EmptyState
        title="Diff unavailable in preview mode"
        detail="Connect the Electron Git IPC bridge to read real repository diffs."
      />
    );
  }

  if (!canDiff) {
    return (
      <EmptyState
        title="Diff method not exposed"
        detail="The current Git bridge can report status, but it does not expose a file diff method."
      />
    );
  }

  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-white/5 bg-black/20">
      <div className="flex items-center gap-2 border-b border-white/5 px-2.5 py-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: (STATUS_META[selectedFile.status] || STATUS_META.U).color,
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-200">
            {selectedFile.path || selectedFile.name}
          </p>
          <p className="truncate text-[10px] text-gray-600">
            {selectedFile.staged ? "Staged diff" : "Working tree diff"}
          </p>
        </div>
        {diffLoading && <RefreshCw size={12} className="animate-spin text-purple-300" />}
      </div>

      {diffError ? (
        <div className="flex items-start gap-2 px-3 py-3">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[11px] leading-snug text-red-300/80">{diffError}</p>
        </div>
      ) : diffLoading ? (
        <div className="space-y-1.5 px-3 py-3">
          <div className="h-2 w-5/6 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      ) : diffText.trim().length === 0 ? (
        <div className="px-3 py-3 text-[11px] leading-snug text-gray-600">
          No line diff returned for this file state. Untracked files usually
          need to be staged before Git can provide a patch.
        </div>
      ) : (
        <div className="max-h-64 overflow-auto px-0 py-2 text-[10px] leading-5">
          {visibleLines.map((line, index) => {
            const added = line.startsWith("+") && !line.startsWith("+++");
            const removed = line.startsWith("-") && !line.startsWith("---");
            const hunk = line.startsWith("@@");
            const header = line.startsWith("diff --git") || line.startsWith("index ");
            const color = added
              ? "#86efac"
              : removed
                ? "#fca5a5"
                : hunk
                  ? "#c4b5fd"
                  : header
                    ? "#93c5fd"
                    : "#94a3b8";
            const background = added
              ? "rgba(34,197,94,0.08)"
              : removed
                ? "rgba(239,68,68,0.08)"
                : hunk
                  ? "rgba(139,92,246,0.08)"
                  : "transparent";

            return (
              <div
                key={`${index}-${line}`}
                className="grid grid-cols-[34px_1fr] gap-2 px-2 font-mono"
                style={{ color, background }}
              >
                <span className="select-none text-right text-gray-700">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap break-words">{line || " "}</span>
              </div>
            );
          })}
          {truncated && (
            <div className="px-3 pt-2 text-[10px] text-amber-300">
              Diff truncated after {DIFF_LINE_LIMIT} lines.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRepoFullName(repo) {
  return repo?.full_name || repo?.fullName || repo?.nameWithOwner || repo?.name || "";
}

function uniqueFilePaths(files) {
  return Array.from(
    new Set(files.map((file) => file.path || file.name).filter(Boolean)),
  );
}

export default function GitPanel({ files }) {
  const [commitMsg, setCommitMsg] = useState("");
  const [staged, setStaged] = useState(new Set());
  const [status, setStatus] = useState(() => buildFallbackGitStatus(files));
  const [remotes, setRemotes] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [history, setHistory] = useState([]);
  const [historySource, setHistorySource] = useState("Local");
  const [gitCapability, setGitCapability] = useState(getGitCapability);
  const [githubCapability, setGithubCapability] = useState(
    getGithubBackendCapability,
  );
  const [githubSettings, setGithubSettings] = useState(readGithubSettings);
  const [githubAuth, setGithubAuth] = useState({
    authenticated: false,
    connected: false,
  });
  const [githubFlow, setGithubFlow] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [diffText, setDiffText] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState("");
  const [stageBusyIds, setStageBusyIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [sections, setSections] = useState({
    changes: true,
    staged: true,
    diff: true,
    history: false,
    settings: false,
  });

  const workspaceRoot = useMemo(() => inferWorkspaceRoot(files), [files]);
  const branch = status.branch || "main";
  const changedFiles = useMemo(() => status.files || [], [status.files]);
  const unstagedFiles = useMemo(
    () => changedFiles.filter((file) => !staged.has(file.id)),
    [changedFiles, staged],
  );
  const stagedFiles = useMemo(
    () => changedFiles.filter((file) => staged.has(file.id)),
    [changedFiles, staged],
  );
  const hasLocalGit = gitCapability.available;
  const canDiff = hasLocalGit && gitCapability.methods.includes("diff");
  const canPull = hasLocalGit && gitCapability.methods.includes("pull");
  const canPush = hasLocalGit && gitCapability.methods.includes("push");
  const clean = changedFiles.length === 0 || status.clean;
  const selectedFile = useMemo(
    () => changedFiles.find((file) => file.id === selectedFileId) || null,
    [changedFiles, selectedFileId],
  );

  const primaryRemote = useMemo(() => {
    const upstreamRemote = status.upstream?.split("/")?.[0];
    return (
      remotes.find((remote) => remote.name === upstreamRemote) ||
      remotes.find((remote) => remote.name === "origin") ||
      remotes[0] ||
      null
    );
  }, [remotes, status.upstream]);

  const remoteLabel = primaryRemote?.name || status.upstream?.split("/")?.[0] || "No remote";
  const remoteDetail =
    status.upstream ||
    primaryRemote?.fetchUrl ||
    (remoteLoading ? "Loading remotes..." : "No upstream configured");
  const syncLabel =
    status.ahead > 0 || status.behind > 0
      ? `${status.ahead} ahead / ${status.behind} behind`
      : "Up to date";
  const syncTone = status.behind > 0 ? "warn" : status.ahead > 0 ? "good" : "neutral";

  const commitDisabledReason = !hasLocalGit
    ? "Local Git IPC is required to commit."
    : stagedFiles.length === 0
      ? "Stage at least one file to commit."
      : commitMsg.trim().length === 0
        ? "Write a commit message."
        : canPush
          ? "Ready to commit and push."
          : "Ready to commit.";

  const refreshHistory = useCallback(
    async (settings = readGithubSettings()) => {
      try {
        const localHistory = await loadLocalGitHistory({
          cwd: workspaceRoot,
          limit: 12,
        });
        if (localHistory.length > 0) {
          setHistory(localHistory);
          setHistorySource("Local");
          return;
        }
      } catch {
        // A missing log bridge is fine while IPC catches up.
      }

      if (!settings.owner || !settings.repo) return;
      try {
        const remoteHistory = await loadGithubCommitHistory(
          settings.owner,
          settings.repo,
          10,
        );
        if (remoteHistory.length > 0) {
          setHistory(remoteHistory);
          setHistorySource("GitHub");
        }
      } catch {
        // The GitHub backend may not be connected yet.
      }
    },
    [workspaceRoot],
  );

  const refreshLocalRemotes = useCallback(
    async (capability = getGitCapability(), { silent = false } = {}) => {
      if (!workspaceRoot || !capability.available || !capability.methods.includes("remotes")) {
        setRemotes([]);
        setRemoteError("");
        return;
      }

      if (!silent) setRemoteLoading(true);
      try {
        const nextRemotes = await loadLocalGitRemotes({ cwd: workspaceRoot });
        setRemotes(nextRemotes);
        setRemoteError("");
      } catch (error) {
        console.error("Git remotes failed", error);
        setRemotes([]);
        setRemoteError(error?.message || "Git remote lookup failed");
      } finally {
        if (!silent) setRemoteLoading(false);
      }
    },
    [workspaceRoot],
  );

  const refreshGitStatus = useCallback(
    async ({ silent = false } = {}) => {
      const capability = getGitCapability();
      setGitCapability(capability);
      if (!silent) setRefreshing(true);

      try {
        if (capability.available && workspaceRoot) {
          const nextStatus = await loadLocalGitStatus({ cwd: workspaceRoot });
          setStatus(nextStatus);
          setStaged(
            new Set(
              nextStatus.files
                .filter((file) => file.staged)
                .map((file) => file.id),
            ),
          );
          setErrorMsg("");
          await refreshLocalRemotes(capability, { silent: true });
          await refreshHistory();
        } else {
          const fallback = buildFallbackGitStatus(files);
          setStatus(fallback);
          setRemotes([]);
          setRemoteError("");
          setStaged((prev) => {
            const availableIds = new Set(fallback.files.map((file) => file.id));
            return new Set([...prev].filter((id) => availableIds.has(id)));
          });
        }
      } catch (error) {
        console.error("Git status failed", error);
        setStatus(buildFallbackGitStatus(files));
        setRemotes([]);
        setErrorMsg(error?.message || "Git status failed");
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [files, refreshHistory, refreshLocalRemotes, workspaceRoot],
  );

  const refreshGithubBackend = useCallback(async () => {
    const capability = getGithubBackendCapability();
    setGithubCapability(capability);
    const nextSettings = readGithubSettings();
    setGithubSettings((prev) =>
      prev.owner === nextSettings.owner &&
      prev.repo === nextSettings.repo &&
      prev.legacyTokenPresent === nextSettings.legacyTokenPresent
        ? prev
        : nextSettings,
    );

    if (!capability.available) return;

    setLoadingRepos(true);
    try {
      const authStatus = await loadGithubAuthStatus();
      setGithubAuth(authStatus);
      if (!authStatus.authenticated) {
        setGithubUser(null);
        setRepos([]);
        setErrorMsg("");
        return;
      }

      const session = authStatus.session || (await loadGithubSession());
      setGithubUser(session || null);
      const nextRepos = await loadGithubRepositories();
      setRepos(nextRepos);
      setErrorMsg("");
    } catch (error) {
      console.error("GitHub backend failed", error);
      setGithubUser(null);
      setRepos([]);
      setErrorMsg(error?.message || "Secure GitHub backend unavailable");
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    refreshGitStatus();
    refreshGithubBackend();
  }, [refreshGitStatus, refreshGithubBackend]);

  useEffect(() => {
    if (!hasLocalGit) {
      setStatus(buildFallbackGitStatus(files));
    }
  }, [files, hasLocalGit]);

  useEffect(() => {
    setSelectedFileId((current) =>
      changedFiles.some((file) => file.id === current)
        ? current
        : changedFiles[0]?.id || null,
    );
  }, [changedFiles]);

  useEffect(() => {
    let cancelled = false;
    const filePath = selectedFile?.path || selectedFile?.name;

    setDiffText("");
    setDiffError("");

    if (!selectedFile || !filePath) {
      setDiffLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!workspaceRoot || !hasLocalGit || selectedFile.source !== "git" || !canDiff) {
      setDiffLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setDiffLoading(true);
    loadLocalGitDiff({
      cwd: workspaceRoot,
      paths: [filePath],
      staged: selectedFile.staged,
      context: 4,
    })
      .then((nextDiff) => {
        if (!cancelled) setDiffText(nextDiff);
      })
      .catch((error) => {
        console.error("Git diff failed", error);
        if (!cancelled) {
          setDiffError(error?.message || "Git diff failed");
        }
      })
      .finally(() => {
        if (!cancelled) setDiffLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    canDiff,
    hasLocalGit,
    selectedFile?.id,
    selectedFile?.name,
    selectedFile?.path,
    selectedFile?.source,
    selectedFile?.staged,
    workspaceRoot,
  ]);

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleStage = async (file) => {
    const nextStaged = !staged.has(file.id);
    setSelectedFileId(file.id);
    setStageBusyIds((prev) => new Set(prev).add(file.id));
    setStaged((prev) => {
      const next = new Set(prev);
      if (nextStaged) next.add(file.id);
      else next.delete(file.id);
      return next;
    });

    if (!hasLocalGit || file.source !== "git") {
      setStageBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
      return;
    }

    try {
      if (nextStaged) {
        await stageGitPath(file.path || file.name, { cwd: workspaceRoot });
      } else {
        await unstageGitPath(file.path || file.name, { cwd: workspaceRoot });
      }
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Git stage failed", error);
      setErrorMsg(error?.message || "Git stage failed");
      setStaged((prev) => {
        const next = new Set(prev);
        if (nextStaged) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
    } finally {
      setStageBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const stageAll = async () => {
    if (unstagedFiles.length === 0 || bulkAction) return;
    const previous = staged;
    setBulkAction("stage");
    setStaged((prev) => {
      const next = new Set(prev);
      unstagedFiles.forEach((file) => next.add(file.id));
      return next;
    });

    if (!hasLocalGit) {
      setBulkAction("");
      return;
    }

    try {
      await stageGitPath(uniqueFilePaths(unstagedFiles), { cwd: workspaceRoot });
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Git stage all failed", error);
      setErrorMsg(error?.message || "Git stage all failed");
      setStaged(previous);
    } finally {
      setBulkAction("");
    }
  };

  const unstageAll = async () => {
    if (stagedFiles.length === 0 || bulkAction) return;
    const previous = staged;
    setBulkAction("unstage");
    setStaged(new Set());

    if (!hasLocalGit) {
      setBulkAction("");
      return;
    }

    try {
      await unstageGitPath(uniqueFilePaths(stagedFiles), { cwd: workspaceRoot });
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Git unstage all failed", error);
      setErrorMsg(error?.message || "Git unstage all failed");
      setStaged(previous);
    } finally {
      setBulkAction("");
    }
  };

  const handleSaveGithubSettings = (owner, repo) => {
    saveGithubRepositorySettings(owner, repo);
    const next = { ...readGithubSettings(), owner, repo };
    setGithubSettings(next);
    refreshHistory(next);
  };

  const handleRepositorySelect = (value) => {
    const [owner, repo] = value.split("/");
    if (!owner || !repo) return;
    handleSaveGithubSettings(owner, repo);
  };

  const handleClearLegacyToken = () => {
    clearDeprecatedGithubToken();
    setGithubSettings(readGithubSettings());
  };

  const handleStartGithubAuth = async () => {
    if (!githubCapability.available || authBusy) return;
    setAuthBusy(true);
    setErrorMsg("");
    try {
      const flow = await startGithubDeviceFlow();
      setGithubFlow(flow);
      if (flow?.verificationUriComplete) {
        window.open(flow.verificationUriComplete, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("GitHub auth start failed", error);
      setErrorMsg(error?.message || "GitHub auth start failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePollGithubAuth = async () => {
    if (!githubFlow?.flowId || authBusy) return;
    setAuthBusy(true);
    setErrorMsg("");
    try {
      const result = await pollGithubDeviceFlow({ flowId: githubFlow.flowId });
      if (result?.authenticated) {
        setGithubFlow(null);
        await refreshGithubBackend();
      } else {
        setErrorMsg("GitHub wartet noch auf deine Bestaetigung.");
      }
    } catch (error) {
      console.error("GitHub auth poll failed", error);
      setErrorMsg(error?.message || "GitHub auth poll failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGithubSignOut = async () => {
    if (!githubCapability.available || authBusy) return;
    setAuthBusy(true);
    setErrorMsg("");
    try {
      await signOutGithub();
      setGithubAuth({ authenticated: false, connected: true });
      setGithubUser(null);
      setGithubFlow(null);
      setRepos([]);
    } catch (error) {
      console.error("GitHub sign out failed", error);
      setErrorMsg(error?.message || "GitHub sign out failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePull = async () => {
    if (!canPull) {
      setErrorMsg("Local Git pull is not exposed by this bridge.");
      return;
    }
    setRefreshing(true);
    try {
      await pullLocalGit({ cwd: workspaceRoot });
      await refreshGitStatus({ silent: true });
      setErrorMsg("");
    } catch (error) {
      console.error("Git pull failed", error);
      setErrorMsg(error?.message || "Git pull failed");
    } finally {
      setRefreshing(false);
    }
  };

  const canCommit =
    hasLocalGit &&
    commitMsg.trim().length > 0 &&
    stagedFiles.length > 0 &&
    !committing;

  const handleCommitAndPush = async () => {
    if (!canCommit) {
      if (!hasLocalGit) setErrorMsg("Local Git IPC is required for commit.");
      return;
    }

    setCommitting(true);
    setErrorMsg("");

    try {
      await commitLocalGit(commitMsg.trim(), { cwd: workspaceRoot });
      if (canPush) {
        await pushLocalGit({ cwd: workspaceRoot });
      }

      setCommitMsg("");
      setStaged(new Set());
      setCommitted(true);
      window.setTimeout(() => setCommitted(false), 2000);
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Commit failed", error);
      setErrorMsg(error?.message || "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const selectedRepo = githubSettings.repo
    ? `${githubSettings.owner}/${githubSettings.repo}`
    : "";

  return (
    <motion.div
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="w-72 flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "rgba(6, 6, 20, 0.4)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
          Source Control
        </span>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => refreshGitStatus()}
            disabled={refreshing}
            title="Refresh local Git status"
            className="p-1 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              size={12}
              className={refreshing ? "animate-spin text-purple-400" : ""}
            />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleSection("settings")}
            title="Git providers"
            className="p-1 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <GitFork
              size={12}
              className={githubCapability.available ? "text-green-400" : ""}
            />
          </motion.button>
        </div>
      </div>

      <div className="px-3 pb-3 shrink-0 space-y-2">
        <div
          className="rounded-lg p-2.5"
          style={{
            background: "rgba(139, 92, 246, 0.05)",
            border: "1px solid rgba(139, 92, 246, 0.12)",
          }}
        >
          <div className="flex items-start gap-2">
            <GitBranch size={14} className="mt-0.5 text-purple-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-semibold text-gray-100">
                  {branch}
                </span>
                {status.detached && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                    Detached
                  </span>
                )}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-gray-500">
                <Server size={10} className="shrink-0" />
                <span className="shrink-0 text-gray-400">{remoteLabel}</span>
                <span className="truncate">{remoteDetail}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <SummaryTile
              label="Status"
              value={clean ? "Clean" : `${changedFiles.length} changed`}
              tone={clean ? "good" : "warn"}
            />
            <SummaryTile
              label="Staged"
              value={stagedFiles.length}
              tone={stagedFiles.length > 0 ? "good" : "neutral"}
            />
            <SummaryTile label="Sync" value={syncLabel} tone={syncTone} />
          </div>
          {remoteError && (
            <p className="mt-2 truncate text-[10px] text-amber-300/80">
              {remoteError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <CapabilityPill
            icon={GitBranch}
            label={gitCapability.label}
            tone={gitCapability.available ? "ready" : "warn"}
            title={
              gitCapability.available
                ? `Using ${gitCapability.label}`
                : "No local Git bridge detected; showing editor-file preview."
            }
          />
          <CapabilityPill
            icon={Server}
            label={githubCapability.label}
            tone={githubCapability.available ? "ready" : "neutral"}
            title="GitHub access is expected through a secure backend/session."
          />
        </div>
      </div>

      <div
        className="mx-3 mb-1 shrink-0"
        style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
      />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {sections.settings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
              className="px-3 pb-3"
            >
              <div className="space-y-2 p-2 rounded-lg bg-black/20 border border-white/5">
                <div className="flex items-start gap-2 rounded-lg border border-green-500/15 bg-green-500/5 px-2 py-2">
                  <ShieldCheck size={13} className="text-green-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-300 font-semibold">
                      Secure GitHub Backend
                    </p>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      GitHub tokens stay out of the renderer. This panel reads
                      repository data from a backend/session when available.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      GitHub Auth
                    </span>
                    <span
                      className={`text-[10px] ${
                        githubAuth.authenticated
                          ? "text-green-300"
                          : githubCapability.available
                            ? "text-amber-300"
                            : "text-gray-500"
                      }`}
                    >
                      {githubAuth.authenticated
                        ? "Connected"
                        : githubCapability.available
                          ? "Ready"
                          : "Unavailable"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={!githubCapability.available || authBusy}
                      onClick={handleStartGithubAuth}
                      className="rounded-md bg-green-600/15 py-1.5 text-xs text-green-200 transition-colors hover:bg-green-600/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      disabled={!githubCapability.available || authBusy}
                      onClick={handleGithubSignOut}
                      className="rounded-md bg-white/[0.04] py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sign out
                    </button>
                  </div>
                  {githubFlow && (
                    <div className="mt-2 rounded-md border border-purple-500/20 bg-purple-500/5 p-2">
                      <div className="text-[10px] text-gray-400">
                        Code bei GitHub eingeben:
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold tracking-widest text-purple-200">
                        {githubFlow.userCode}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <a
                          href={
                            githubFlow.verificationUriComplete ||
                            githubFlow.verificationUri
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-purple-600/20 py-1.5 text-center text-xs text-purple-200 transition-colors hover:bg-purple-600/30"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handlePollGithubAuth}
                          className="rounded-md bg-white/[0.04] py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {githubSettings.legacyTokenPresent && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-2">
                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] text-amber-200/80 flex-1">
                      Legacy localStorage token detected. It is deprecated and
                      no longer used automatically.
                    </span>
                    <button
                      type="button"
                      onClick={handleClearLegacyToken}
                      className="p-1 rounded-md hover:bg-white/10 text-amber-200"
                      title="Remove deprecated local token"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold px-1">
                    Repository
                  </span>
                  {loadingRepos ? (
                    <div className="w-full bg-black/40 text-xs px-2 py-2 rounded-md border border-white/10 animate-pulse text-gray-500">
                      Loading repositories...
                    </div>
                  ) : repos.length > 0 ? (
                    <select
                      className="w-full bg-black/40 text-xs px-2 py-1.5 rounded-md border border-white/10 outline-none focus:border-purple-500/50 text-gray-200"
                      value={selectedRepo}
                      onChange={(event) => handleRepositorySelect(event.target.value)}
                    >
                      <option value="" disabled>
                        Select repository
                      </option>
                      {repos.map((repo) => {
                        const fullName = getRepoFullName(repo);
                        return (
                          <option key={repo.id || fullName} value={fullName}>
                            {fullName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Owner / Username"
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded-md border border-white/10 outline-none focus:border-purple-500/50"
                        value={githubSettings.owner}
                        onChange={(event) =>
                          setGithubSettings((prev) => ({
                            ...prev,
                            owner: event.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Repository Name"
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded-md border border-white/10 outline-none focus:border-purple-500/50"
                        value={githubSettings.repo}
                        onChange={(event) =>
                          setGithubSettings((prev) => ({
                            ...prev,
                            repo: event.target.value,
                          }))
                        }
                      />
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      handleSaveGithubSettings(
                        githubSettings.owner,
                        githubSettings.repo,
                      )
                    }
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-1.5 rounded-md transition-colors"
                  >
                    Save Repo
                  </button>
                  <button
                    onClick={refreshGithubBackend}
                    className="bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs py-1.5 rounded-md transition-colors"
                  >
                    Check Backend
                  </button>
                </div>

                {githubUser && (
                  <div className="flex items-center gap-2 pt-1">
                    {githubUser.avatar_url && (
                      <img
                        src={githubUser.avatar_url}
                        alt={githubUser.login || "GitHub user"}
                        className="w-5 h-5 rounded-full border border-green-500/30"
                      />
                    )}
                    <span className="text-[10px] text-green-300 truncate">
                      Connected as {githubUser.login || githubUser.name || "GitHub user"}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {refreshing && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-md border border-purple-500/10 bg-purple-500/5 px-2 py-1.5 text-[10px] text-purple-200">
            <RefreshCw size={11} className="animate-spin" />
            Refreshing repository status...
          </div>
        )}

        <SectionHeader
          title="Changes"
          count={unstagedFiles.length}
          expanded={sections.changes}
          onToggle={() => toggleSection("changes")}
          action={unstagedFiles.length > 0 ? stageAll : null}
          actionLabel={bulkAction === "stage" ? "Staging" : "Stage all"}
          actionDisabled={Boolean(bulkAction)}
        />
        <AnimatePresence>
          {sections.changes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <AnimatePresence mode="popLayout">
                {unstagedFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    staged={false}
                    selected={selectedFileId === file.id}
                    busy={stageBusyIds.has(file.id)}
                    onSelect={(nextFile) => setSelectedFileId(nextFile.id)}
                    onToggle={toggleStage}
                  />
                ))}
              </AnimatePresence>
              {unstagedFiles.length === 0 && (
                <EmptyState
                  title={clean ? "Working tree clean" : "No unstaged changes"}
                  detail={
                    clean
                      ? "There are no local file changes in this workspace."
                      : "All current changes are staged."
                  }
                  tone={clean ? "good" : "muted"}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionHeader
          title="Staged"
          count={stagedFiles.length}
          expanded={sections.staged}
          onToggle={() => toggleSection("staged")}
          action={stagedFiles.length > 0 ? unstageAll : null}
          actionLabel={bulkAction === "unstage" ? "Unstaging" : "Unstage all"}
          actionDisabled={Boolean(bulkAction)}
        />
        <AnimatePresence>
          {sections.staged && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <AnimatePresence mode="popLayout">
                {stagedFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    staged
                    selected={selectedFileId === file.id}
                    busy={stageBusyIds.has(file.id)}
                    onSelect={(nextFile) => setSelectedFileId(nextFile.id)}
                    onToggle={toggleStage}
                  />
                ))}
              </AnimatePresence>
              {stagedFiles.length === 0 && (
                <EmptyState
                  title="Nothing staged"
                  detail="Stage one or more files to enable the commit action."
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <SectionHeader
          title="Diff Preview"
          count={selectedFile ? 1 : null}
          expanded={sections.diff}
          onToggle={() => toggleSection("diff")}
        />
        <AnimatePresence>
          {sections.diff && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <DiffViewer
                selectedFile={selectedFile}
                diffText={diffText}
                diffLoading={diffLoading}
                diffError={diffError}
                canDiff={canDiff}
                hasLocalGit={hasLocalGit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-3 py-3">
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle size={11} className="text-red-400 shrink-0" />
                <span className="text-[10px] text-red-400/80 truncate">
                  {errorMsg}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Commit
            </span>
            <span className="text-[10px] text-gray-500">
              {stagedFiles.length} staged
            </span>
          </div>
          <textarea
            value={commitMsg}
            onChange={(event) => setCommitMsg(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                handleCommitAndPush();
              }
            }}
            placeholder="Commit message (Ctrl+Enter)..."
            rows={3}
            className="w-full resize-none rounded-lg px-2.5 py-2 text-xs font-mono outline-none placeholder:text-gray-700 transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: commitMsg
                ? "1px solid rgba(128,0,255,0.3)"
                : "1px solid rgba(255,255,255,0.07)",
              color: "#d1d5db",
              lineHeight: "1.5",
            }}
          />

          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-600">
            <span className="truncate">{commitDisabledReason}</span>
            <span>{commitMsg.trim().length}/64000</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-1.5 mt-2">
            <motion.button
              whileHover={canCommit ? { scale: 1.02, y: -1 } : {}}
              whileTap={canCommit ? { scale: 0.97 } : {}}
              onClick={handleCommitAndPush}
              disabled={!canCommit}
              title={commitDisabledReason}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{
                background: canCommit
                  ? "linear-gradient(135deg, #8000ff, #0033ff)"
                  : "rgba(255,255,255,0.06)",
                color: canCommit ? "#fff" : "#4b5563",
                boxShadow: canCommit ? "0 0 16px rgba(128,0,255,0.3)" : "none",
                cursor: canCommit ? "pointer" : "not-allowed",
              }}
            >
              <AnimatePresence mode="wait">
                {committing ? (
                  <motion.div
                    key="spin"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw size={13} />
                    </motion.div>
                  </motion.div>
                ) : committed ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={13} className="text-green-400" />
                    <span className="text-green-400">
                      {canPush ? "Pushed" : "Committed"}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>
                      {canPush ? "Commit & Push" : "Commit"}
                      {stagedFiles.length > 0 ? ` (${stagedFiles.length})` : ""}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <button
              type="button"
              onClick={handlePull}
              disabled={!canPull || refreshing}
              className="px-2 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: canPull ? "#cbd5e1" : "#475569",
                background: "rgba(255,255,255,0.03)",
                cursor: canPull ? "pointer" : "not-allowed",
              }}
              title="Pull with the local Git bridge"
            >
              Pull
            </button>
          </div>
        </div>

        <div
          className="mx-3 mb-1"
          style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
        />

        <SectionHeader
          title={`History (${historySource})`}
          count={history.length}
          expanded={sections.history}
          onToggle={() => toggleSection("history")}
        />
        <AnimatePresence>
          {sections.history && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
              className="pb-3"
            >
              {history.length > 0 ? (
                history.map((entry, index) => (
                  <motion.div
                    key={`${entry.hash}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative flex gap-3 px-4 py-2 hover:bg-white/[0.02] cursor-default"
                  >
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                      {index !== history.length - 1 && (
                        <div className="w-px h-full bg-purple-500/20 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate font-medium">
                        {entry.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-purple-400">
                          {entry.hash}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate">
                          {entry.author}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 ml-auto shrink-0">
                          <Clock size={10} />
                          {entry.time || "recent"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="px-7 py-2 text-[11px] text-gray-600">
                  No history found. Connect local Git IPC or a secure GitHub backend.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
