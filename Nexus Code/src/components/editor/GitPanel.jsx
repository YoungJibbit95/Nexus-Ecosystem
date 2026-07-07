import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Download,
  FolderOpen,
  GitBranch,
  GitFork,
  Minus,
  Plus,
  RefreshCw,
  Server,
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
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelHeader,
  PanelIconButton,
  PanelNotice,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const DIFF_LINE_LIMIT = 220;

const STATUS_META = {
  M: { label: "Modified", color: "#fbbf24" },
  A: { label: "Added", color: "#38bdf8" },
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
    <div className="flex flex-wrap items-start gap-1 px-2 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="min-w-0 flex flex-1 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown size={11} className="text-gray-600" />
        </motion.div>
        <span
          className="min-w-0 flex-1 break-words text-[10px] font-semibold uppercase leading-tight text-gray-500"
          style={{ overflowWrap: "anywhere" }}
        >
          {title}
        </span>
        {count != null && (
          <PanelBadge tone={count > 0 ? "accent" : "muted"}>{count}</PanelBadge>
        )}
      </button>
      {action && (
        <PanelActionButton
          onClick={action}
          disabled={actionDisabled}
          title={actionTitle || actionLabel}
          className="min-w-0 px-2 py-1 text-[10px]"
        >
          {actionLabel}
        </PanelActionButton>
      )}
    </div>
  );
}

function CapabilityPill({ icon: Icon, label, tone = "neutral", title }) {
  const palette =
    tone === "ready"
      ? {
          color: "#93c5fd",
          background: "rgba(56,189,248,0.08)",
          border: "rgba(56,189,248,0.2)",
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
      className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5"
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Icon size={10} className="shrink-0" />
      <span className="min-w-0 break-words text-[10px] font-medium" style={{ overflowWrap: "anywhere" }}>
        {label}
      </span>
    </div>
  );
}

function EmptyState({ title, detail, tone = "muted" }) {
  const isGood = tone === "good";
  return (
    <PanelNotice
      icon={isGood ? Check : AlertCircle}
      tone={isGood ? "success" : "muted"}
      title={title}
      detail={detail}
      className="mx-3 mb-2"
    />
  );
}

function getSyncBadgeTone(syncTone) {
  return syncTone === "warn"
    ? "warning"
    : syncTone === "good"
      ? "accent"
      : "muted";
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
        className="group flex items-center rounded-xl border transition-colors"
        style={{
          background: selected
            ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)"
            : "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))",
          borderColor: selected
            ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.25)"
            : "rgba(255,255,255,0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(file)}
          className="min-w-0 flex flex-1 items-start gap-2 px-2 py-1.5 text-left"
          title={`${meta.label}: ${file.path || file.name}`}
        >
          <span
            className="mt-0.5 w-4 shrink-0 text-center text-[10px] font-bold"
            style={{ color: meta.color }}
          >
            {file.status}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block break-words text-xs font-mono leading-snug text-gray-300 group-hover:text-gray-100"
              style={{ overflowWrap: "anywhere" }}
            >
              {file.name}
            </span>
            <span
              className="block break-words text-[10px] leading-snug text-gray-600"
              style={{ overflowWrap: "anywhere" }}
            >
              {scopeLabel}
              {file.path && file.path !== file.name ? ` - ${file.path}` : ""}
              {file.originalPath ? ` from ${file.originalPath}` : ""}
            </span>
          </span>
          {(file.additions > 0 || file.deletions > 0) && (
            <span className="mt-0.5 shrink-0 rounded-md border border-white/[0.05] bg-black/15 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
              +{file.additions} -{file.deletions}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggle(file)}
          disabled={busy}
          aria-label={`${actionLabel} ${file.path || file.name}`}
          title={`${actionLabel} ${file.path || file.name}`}
          className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? (
            <RefreshCw size={10} className="animate-spin" />
          ) : staged ? (
            <Minus size={10} className="text-red-300" />
          ) : (
            <Plus size={10} className="text-sky-300" />
          )}
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
          <p
            className="break-words text-xs font-semibold leading-snug text-gray-200"
            style={{ overflowWrap: "anywhere" }}
          >
            {selectedFile.path || selectedFile.name}
          </p>
          <p className="break-words text-[10px] leading-snug text-gray-600">
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
              ? "#7dd3fc"
              : removed
                ? "#fca5a5"
                : hunk
                  ? "#c4b5fd"
                  : header
                    ? "#93c5fd"
                    : "#94a3b8";
            const background = added
              ? "rgba(56,189,248,0.08)"
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
  const fileList = useMemo(() => (Array.isArray(files) ? files : []), [files]);
  const [commitMsg, setCommitMsg] = useState("");
  const [staged, setStaged] = useState(new Set());
  const [status, setStatus] = useState(() => buildFallbackGitStatus(fileList));
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
  const [pushAfterCommit, setPushAfterCommit] = useState(false);
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

  const workspaceRoot = useMemo(() => inferWorkspaceRoot(fileList), [fileList]);
  const hasWorkspace = Boolean(workspaceRoot);
  const branch = hasWorkspace ? status.branch || "main" : "No workspace";
  const changedFiles = useMemo(() => status.files || [], [status.files]);
  const unstagedFiles = useMemo(
    () => changedFiles.filter((file) => !staged.has(file.id)),
    [changedFiles, staged],
  );
  const stagedFiles = useMemo(
    () => changedFiles.filter((file) => staged.has(file.id)),
    [changedFiles, staged],
  );
  const hasLocalGit = hasWorkspace && gitCapability.available;
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

  const remoteLabel = hasWorkspace
    ? primaryRemote?.name || status.upstream?.split("/")?.[0] || "No remote"
    : "Workspace closed";
  const remoteDetail =
    !hasWorkspace
      ? "Open a folder to inspect Git status."
      : status.upstream ||
        primaryRemote?.fetchUrl ||
        (remoteLoading ? "Loading remotes..." : "No upstream configured");
  const syncLabel =
    !hasWorkspace
      ? "No workspace"
      : status.ahead > 0 || status.behind > 0
      ? `${status.ahead} ahead / ${status.behind} behind`
      : "Up to date";
  const syncTone = status.behind > 0 ? "warn" : status.ahead > 0 ? "good" : "neutral";

  const commitDisabledReason = !hasWorkspace
    ? "Open a workspace to commit."
    : !hasLocalGit
    ? "Local Git IPC is required to commit."
    : stagedFiles.length === 0
      ? "Stage at least one file to commit."
        : commitMsg.trim().length === 0
        ? "Write a commit message."
        : canPush && pushAfterCommit
          ? "Ready to commit and push."
          : "Ready to commit locally.";

  const refreshHistory = useCallback(
    async (settings = readGithubSettings()) => {
      if (workspaceRoot) {
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
          const fallback = buildFallbackGitStatus(fileList);
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
        setStatus(buildFallbackGitStatus(fileList));
        setRemotes([]);
        setErrorMsg(error?.message || "Git status failed");
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [fileList, refreshHistory, refreshLocalRemotes, workspaceRoot],
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
    if (workspaceRoot) refreshGithubBackend();
  }, [refreshGitStatus, refreshGithubBackend, workspaceRoot]);

  useEffect(() => {
    if (!hasLocalGit) {
      setStatus(buildFallbackGitStatus(fileList));
    }
  }, [fileList, hasLocalGit]);

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

    if (!workspaceRoot || !hasLocalGit || file.source !== "git") {
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

    if (!workspaceRoot || !hasLocalGit) {
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

    if (!workspaceRoot || !hasLocalGit) {
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
    const nextOwner = String(owner || "").trim();
    const nextRepo = String(repo || "").trim();
    if (!nextOwner || !nextRepo) {
      setErrorMsg("GitHub repository settings need both owner and repository.");
      return;
    }

    saveGithubRepositorySettings(nextOwner, nextRepo);
    const next = { ...readGithubSettings(), owner: nextOwner, repo: nextRepo };
    setGithubSettings(next);
    setErrorMsg("");
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
    if (!workspaceRoot) {
      setErrorMsg("Open a workspace to pull.");
      return;
    }
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

  const handlePush = async () => {
    if (!workspaceRoot) {
      setErrorMsg("Open a workspace to push.");
      return;
    }
    if (!canPush) {
      setErrorMsg("Local Git push is not exposed by this bridge.");
      return;
    }
    setRefreshing(true);
    try {
      await pushLocalGit({ cwd: workspaceRoot });
      await refreshGitStatus({ silent: true });
      setErrorMsg("");
    } catch (error) {
      console.error("Git push failed", error);
      setErrorMsg(error?.message || "Git push failed");
    } finally {
      setRefreshing(false);
    }
  };

  const canCommit =
    hasWorkspace &&
    hasLocalGit &&
    commitMsg.trim().length > 0 &&
    stagedFiles.length > 0 &&
    !committing;

  const handleCommitAndPush = async () => {
    if (!canCommit) {
      if (!hasWorkspace) setErrorMsg("Open a workspace to commit.");
      else if (!hasLocalGit) setErrorMsg("Local Git IPC is required for commit.");
      return;
    }

    setCommitting(true);
    setErrorMsg("");

    try {
      await commitLocalGit(commitMsg.trim(), { cwd: workspaceRoot });
      if (canPush && pushAfterCommit) {
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
  const headerSubtitle = hasWorkspace
    ? `${branch} - ${syncLabel}`
    : "Open a workspace to enable Git status and commits";
  const headerStatusLabel = !hasWorkspace
    ? "Idle"
    : clean
      ? "Clean"
      : `${changedFiles.length} changed`;
  const headerStatusTone = !hasWorkspace
    ? "warning"
    : clean
      ? "success"
      : "accent";
  const compactSyncLabel = !hasWorkspace
    ? "Idle"
    : status.ahead > 0 || status.behind > 0
      ? `${status.ahead}/${status.behind}`
      : "Synced";
  const gitProviderLabel = hasLocalGit
    ? gitCapability.label
    : hasWorkspace
      ? "Git bridge offline"
      : "No workspace";
  const githubProviderLabel = githubAuth.authenticated
    ? "GitHub connected"
    : githubCapability.available
      ? "GitHub ready"
      : "GitHub offline";
  const githubConnectionTone = githubAuth.authenticated
    ? "ready"
    : githubCapability.available
      ? "warn"
      : "neutral";
  const githubConnectionDetail = githubAuth.authenticated
    ? githubUser?.login || githubUser?.name || "Secure session active"
    : githubCapability.available
      ? "Waiting for device auth"
      : "Secure backend unavailable";
  const repositoryDraftValid = Boolean(
    String(githubSettings.owner || "").trim() &&
      String(githubSettings.repo || "").trim(),
  );

  return (
    <PanelShell ariaLabel="Source Control">
      <PanelHeader
        icon={GitBranch}
        title="Source Control"
        subtitle={headerSubtitle}
        status={
          <PanelBadge tone={headerStatusTone}>
            {headerStatusLabel}
          </PanelBadge>
        }
        actions={
          <>
            <PanelIconButton
              onClick={() => refreshGitStatus()}
              disabled={refreshing || !hasWorkspace}
              label="Refresh local Git status"
            >
              <RefreshCw className={refreshing ? "animate-spin text-purple-400" : ""} />
            </PanelIconButton>
            <PanelIconButton
              onClick={() => toggleSection("settings")}
              label="Git providers"
              active={sections.settings}
            >
              <GitFork className={githubCapability.available ? "text-sky-300" : ""} />
            </PanelIconButton>
          </>
        }
      />

      {hasWorkspace && (
        <div className="shrink-0 px-3 pb-2">
          <div
            className="rounded-xl border px-2.5 py-2"
            style={{
              background: "rgba(0,0,0,0.18)",
              borderColor: "rgba(148,163,184,0.085)",
            }}
          >
            <div className="flex min-w-0 items-start gap-2">
              <GitBranch size={13} className="mt-0.5 shrink-0 text-sky-300/80" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className="min-w-0 break-words font-mono text-[12px] font-semibold leading-snug text-gray-100"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {branch}
                  </span>
                  {status.detached && (
                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                      Detached
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600">
                    {clean ? "clean" : `${changedFiles.length} changed`}
                  </span>
                  <span className="text-[10px] text-gray-700">/</span>
                  <span className="text-[10px] text-gray-600">
                    {stagedFiles.length} staged
                  </span>
                </div>
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-gray-500">
                  <Server size={10} className="shrink-0 text-sky-300/80" />
                  <span className="shrink-0 text-gray-400">{remoteLabel}</span>
                  <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
                    {remoteDetail}
                  </span>
                </div>
              </div>
              <PanelBadge tone={getSyncBadgeTone(syncTone)} title={syncLabel}>
                {compactSyncLabel}
              </PanelBadge>
            </div>
          </div>
        </div>
      )}

      {hasWorkspace && (
        <div className="mx-3 mb-1 h-px shrink-0 bg-white/[0.045]" />
      )}

      <PanelBody className="px-0 py-1">
        {!hasWorkspace && !sections.settings && (
          <PanelState
            icon={FolderOpen}
            tone="muted"
            title="Kein Workspace geoeffnet"
            detail="Source Control bleibt ruhig, bis ein Ordner geladen ist. Provider-Checks bleiben separat erreichbar."
            actionLabel="Provider anzeigen"
            onAction={() => toggleSection("settings")}
          />
        )}

        {hasWorkspace && !hasLocalGit && (
          <PanelNotice
            icon={Server}
            tone="warning"
            title="Local Git bridge offline"
            detail="Preview-Daten bleiben sichtbar; Stage, Commit, Pull und Push brauchen die lokale Git-Bridge."
            className="mx-3 mb-2"
          />
        )}

        {hasWorkspace && remoteError && (
          <PanelNotice
            icon={Server}
            tone="warning"
            title="Remote status unavailable"
            detail={remoteError}
            className="mx-3 mb-2"
          />
        )}

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <PanelNotice
                icon={AlertCircle}
                tone="danger"
                title="Git action failed"
                detail={errorMsg}
                className="mx-3 mb-2"
              />
            </motion.div>
          )}
        </AnimatePresence>

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
              <div className="space-y-2 rounded-2xl border border-white/[0.055] bg-black/15 p-2">
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))" }}
                >
                  <CapabilityPill
                    icon={GitBranch}
                    label={gitProviderLabel}
                    tone={gitCapability.available ? "ready" : "warn"}
                    title={
                      gitCapability.available
                        ? `Using ${gitCapability.label}`
                        : "No local Git bridge detected; showing editor-file preview."
                    }
                  />
                  <CapabilityPill
                    icon={Server}
                    label={`${githubProviderLabel} - ${githubConnectionDetail}`}
                    tone={githubConnectionTone}
                    title="GitHub access is expected through a secure backend/session."
                  />
                </div>

                {!githubCapability.available && (
                  <PanelNotice
                    icon={Server}
                    tone="warning"
                    title="GitHub backend offline"
                    detail="Repository selection and remote history pause until a secure backend/session is available."
                  />
                )}

                <div className="rounded-2xl border border-white/[0.055] bg-black/15 px-2 py-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase text-gray-500">
                        GitHub Auth
                      </span>
                      <span className="block min-w-0 break-words text-[10px] text-gray-600" style={{ overflowWrap: "anywhere" }}>
                        {githubConnectionDetail}
                      </span>
                    </div>
                    <PanelBadge
                      tone={
                        githubAuth.authenticated
                          ? "accent"
                          : githubCapability.available
                            ? "warning"
                            : "muted"
                      }
                    >
                      {githubAuth.authenticated
                        ? "Connected"
                        : githubCapability.available
                          ? "Ready"
                          : "Offline"}
                    </PanelBadge>
                  </div>
                  {githubUser && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-sky-400/10 bg-sky-400/[0.035] px-2 py-1.5">
                      {githubUser.avatar_url && (
                        <img
                          src={githubUser.avatar_url}
                          alt={githubUser.login || "GitHub user"}
                          className="h-5 w-5 rounded-full border border-sky-400/30"
                        />
                      )}
                      <span className="min-w-0 break-words text-[10px] text-sky-300" style={{ overflowWrap: "anywhere" }}>
                        {githubUser.login || githubUser.name || "GitHub user"}
                      </span>
                    </div>
                  )}
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))" }}
                  >
                    <PanelActionButton
                      type="button"
                      disabled={!githubCapability.available || authBusy || githubAuth.authenticated}
                      onClick={handleStartGithubAuth}
                      tone="accent"
                    >
                      {authBusy ? "Working" : "Connect"}
                    </PanelActionButton>
                    <PanelActionButton
                      type="button"
                      disabled={!githubCapability.available || authBusy || !githubAuth.authenticated}
                      onClick={handleGithubSignOut}
                    >
                      Sign out
                    </PanelActionButton>
                  </div>
                  {githubFlow && (
                    <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-2">
                      <div className="text-[10px] text-gray-400">
                        Code bei GitHub eingeben:
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold text-purple-200">
                        {githubFlow.userCode}
                      </div>
                      <div
                        className="mt-2 grid gap-1.5"
                        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))" }}
                      >
                        <a
                          href={
                            githubFlow.verificationUriComplete ||
                            githubFlow.verificationUri
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-8 min-w-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-600/20 px-2 py-1.5 text-center text-xs font-semibold text-purple-200 transition-colors hover:bg-purple-600/30"
                        >
                          <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
                            Open
                          </span>
                        </a>
                        <PanelActionButton
                          type="button"
                          disabled={authBusy}
                          onClick={handlePollGithubAuth}
                        >
                          Verify
                        </PanelActionButton>
                      </div>
                    </div>
                  )}
                </div>

                {githubSettings.legacyTokenPresent && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-2 py-2">
                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                    <span className="min-w-0 flex-1 break-words text-[10px] text-amber-200/80" style={{ overflowWrap: "anywhere" }}>
                      Legacy localStorage token detected. It is deprecated and
                      no longer used automatically.
                    </span>
                    <button
                      type="button"
                      onClick={handleClearLegacyToken}
                      className="rounded-lg p-1 text-amber-200 hover:bg-white/10"
                      title="Remove deprecated local token"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="px-1 text-[10px] font-semibold uppercase text-gray-500">
                    Repository
                  </span>
                  {loadingRepos ? (
                    <div className="w-full animate-pulse rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-gray-500">
                      Loading repositories...
                    </div>
                  ) : repos.length > 0 ? (
                    <select
                      className="min-h-9 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500/50"
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
                        className="min-h-9 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500/50"
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
                        className="min-h-9 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-purple-500/50"
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

                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))" }}
                >
                  <PanelActionButton
                    onClick={() =>
                      handleSaveGithubSettings(
                        githubSettings.owner,
                        githubSettings.repo,
                      )
                    }
                    disabled={!repositoryDraftValid}
                    tone="accent"
                  >
                    Save Repo
                  </PanelActionButton>
                  <PanelActionButton
                    onClick={refreshGithubBackend}
                  >
                    Check Backend
                  </PanelActionButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {refreshing && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-md border border-purple-500/10 bg-purple-500/5 px-2 py-1.5 text-[10px] text-purple-200">
            <RefreshCw size={11} className="animate-spin" />
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
              Refreshing repository status...
            </span>
          </div>
        )}

        {hasWorkspace && (
          <>
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
          <div className="mb-3 rounded-2xl border border-white/[0.055] bg-black/15 p-2.5">
            <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-gray-500">
                  Sync
                </p>
                <p
                  className="break-words text-[11px] leading-snug text-gray-400"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {remoteDetail}
                </p>
              </div>
              <PanelBadge tone={getSyncBadgeTone(syncTone)}>
                {syncLabel}
              </PanelBadge>
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))" }}
            >
              <PanelActionButton
                icon={Download}
                onClick={handlePull}
                disabled={!canPull || refreshing}
                tone={status.behind > 0 ? "warning" : "muted"}
                title="Pull with the local Git bridge"
              >
                Pull
              </PanelActionButton>
              <PanelActionButton
                icon={Upload}
                onClick={handlePush}
                disabled={!canPush || refreshing}
                tone={status.ahead > 0 ? "accent" : "muted"}
                title="Push with the local Git bridge"
              >
                Push
              </PanelActionButton>
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase text-gray-500">
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
            className="w-full resize-none rounded-2xl px-2.5 py-2 text-xs font-mono outline-none placeholder:text-gray-700 transition-all"
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
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
              {commitDisabledReason}
            </span>
            <span className="shrink-0">{commitMsg.trim().length}/64000</span>
          </div>

          <button
            type="button"
            onClick={() => setPushAfterCommit((value) => !value)}
            disabled={!canPush}
            aria-pressed={pushAfterCommit}
            className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-left text-[10px] transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="min-w-0 break-words text-gray-400" style={{ overflowWrap: "anywhere" }}>
              Nach Commit automatisch pushen
            </span>
            <span
              className="h-4 w-8 rounded-full border p-0.5"
              style={{
                background: pushAfterCommit ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.05)",
                borderColor: pushAfterCommit ? "rgba(125,211,252,0.32)" : "rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="block h-3 w-3 rounded-full transition-transform"
                style={{
                  background: pushAfterCommit ? "#7dd3fc" : "#6b7280",
                  transform: pushAfterCommit ? "translateX(14px)" : "translateX(0)",
                }}
              />
            </span>
          </button>

          <div className="mt-2">
            <motion.button
              whileHover={canCommit ? { scale: 1.02, y: -1 } : {}}
              whileTap={canCommit ? { scale: 0.97 } : {}}
              onClick={handleCommitAndPush}
              disabled={!canCommit}
              title={commitDisabledReason}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-xs font-semibold text-white transition-all"
              style={{
                background: canCommit
                  ? "linear-gradient(135deg, var(--nexus-primary, #7c8cff), #38bdf8)"
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
                    <Check size={13} className="text-sky-300" />
                    <span className="min-w-0 break-words text-center text-sky-300">
                      {canPush && pushAfterCommit ? "Pushed" : "Committed"}
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
                    <span
                      className="min-w-0 break-words text-center"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {canPush && pushAfterCommit ? "Commit & Push" : "Commit"}
                      {stagedFiles.length > 0 ? ` (${stagedFiles.length})` : ""}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <div className="mx-3 mb-1 h-px bg-white/[0.045]" />

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
                    className="group relative flex cursor-default gap-3 px-4 py-2 hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                      {index !== history.length - 1 && (
                        <div className="w-px h-full bg-purple-500/20 mt-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="break-words text-xs font-medium leading-snug text-gray-300"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {entry.message}
                      </p>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[10px] text-purple-400">
                          {entry.hash}
                        </span>
                        <span className="min-w-0 break-words text-[10px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                          {entry.author}
                        </span>
                        <div className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-gray-600">
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
          </>
        )}
      </PanelBody>
    </PanelShell>
  );
}
