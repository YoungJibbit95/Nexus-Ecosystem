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
  loadLocalGitHistory,
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
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-3 py-1.5 group hover:bg-white/[0.03] transition-colors"
    >
      <motion.div
        animate={{ rotate: expanded ? 0 : -90 }}
        transition={{ duration: 0.18 }}
      >
        <ChevronDown size={11} className="text-gray-600" />
      </motion.div>
      <span className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase flex-1 text-left">
        {title}
      </span>
      {count != null && count > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(128,0,255,0.15)", color: "#a855f7" }}
        >
          {count}
        </span>
      )}
      {action && (
        <span
          onClick={(event) => {
            event.stopPropagation();
            action();
          }}
          className="text-[10px] text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
        >
          {actionLabel}
        </span>
      )}
    </button>
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
      className="flex items-center gap-1.5 px-2 py-1 rounded-full min-w-0"
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

function FileRow({ file, staged, onToggle }) {
  const meta = STATUS_META[file.status] || STATUS_META.U;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0 }}
      whileHover={{ x: 2 }}
      onClick={() => onToggle(file)}
      className="w-full flex items-center gap-2 px-3 py-1 group cursor-pointer"
      title={`${meta.label}: ${file.path || file.name}`}
    >
      <span
        className="text-[10px] font-bold w-4 shrink-0 text-center"
        style={{ color: meta.color }}
      >
        {file.status}
      </span>
      <span className="text-xs text-gray-400 truncate flex-1 text-left group-hover:text-gray-200 transition-colors font-mono">
        {file.name}
      </span>
      {(file.additions > 0 || file.deletions > 0) && (
        <span className="text-[10px] text-gray-600 font-mono shrink-0">
          +{file.additions} -{file.deletions}
        </span>
      )}
      <motion.div
        animate={{ scale: staged ? 1 : 0.4, opacity: staged ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
        style={{ background: staged ? "rgba(34,197,94,0.2)" : "transparent" }}
      >
        <Check size={9} className="text-green-400" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="shrink-0"
      >
        {staged ? (
          <Minus size={11} className="text-red-400/70" />
        ) : (
          <Plus size={11} className="text-green-400/70" />
        )}
      </motion.div>
    </motion.button>
  );
}

function getRepoFullName(repo) {
  return repo?.full_name || repo?.fullName || repo?.nameWithOwner || repo?.name || "";
}

export default function GitPanel({ files }) {
  const [commitMsg, setCommitMsg] = useState("");
  const [staged, setStaged] = useState(new Set());
  const [status, setStatus] = useState(() => buildFallbackGitStatus(files));
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
  const [sections, setSections] = useState({
    changes: true,
    staged: true,
    history: false,
    settings: false,
  });

  const workspaceRoot = useMemo(() => inferWorkspaceRoot(files), [files]);
  const branch = status.branch || "main";
  const changedFiles = status.files || [];
  const unstagedFiles = changedFiles.filter((file) => !staged.has(file.id));
  const stagedFiles = changedFiles.filter((file) => staged.has(file.id));
  const hasLocalGit = gitCapability.available;
  const canPush = gitCapability.methods.includes("push");

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

  const refreshGitStatus = useCallback(
    async ({ silent = false } = {}) => {
      const capability = getGitCapability();
      setGitCapability(capability);
      if (!silent) setRefreshing(true);

      try {
        if (capability.available) {
          const nextStatus = await loadLocalGitStatus({ cwd: workspaceRoot });
          setStatus(nextStatus);
          setStaged(
            new Set(nextStatus.files.filter((file) => file.staged).map((file) => file.id)),
          );
          setErrorMsg("");
          await refreshHistory();
        } else {
          const fallback = buildFallbackGitStatus(files);
          setStatus(fallback);
          setStaged((prev) => {
            const availableIds = new Set(fallback.files.map((file) => file.id));
            return new Set([...prev].filter((id) => availableIds.has(id)));
          });
        }
      } catch (error) {
        console.error("Git status failed", error);
        setStatus(buildFallbackGitStatus(files));
        setErrorMsg(error?.message || "Git status failed");
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [files, refreshHistory, workspaceRoot],
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

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleStage = async (file) => {
    const nextStaged = !staged.has(file.id);
    setStaged((prev) => {
      const next = new Set(prev);
      if (nextStaged) next.add(file.id);
      else next.delete(file.id);
      return next;
    });

    if (!hasLocalGit || file.source !== "git") return;

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
    }
  };

  const stageAll = async () => {
    const nextIds = new Set(changedFiles.map((file) => file.id));
    setStaged(nextIds);
    if (!hasLocalGit) return;

    try {
      await stageGitPath(
        changedFiles.map((file) => file.path || file.name),
        { cwd: workspaceRoot },
      );
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Git stage all failed", error);
      setErrorMsg(error?.message || "Git stage all failed");
    }
  };

  const unstageAll = async () => {
    const previous = staged;
    setStaged(new Set());
    if (!hasLocalGit) return;

    try {
      await unstageGitPath(
        stagedFiles.map((file) => file.path || file.name),
        { cwd: workspaceRoot },
      );
      await refreshGitStatus({ silent: true });
    } catch (error) {
      console.error("Git unstage all failed", error);
      setErrorMsg(error?.message || "Git unstage all failed");
      setStaged(previous);
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
    if (!hasLocalGit) {
      setErrorMsg("Local Git IPC is not connected.");
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

  const handleCommitAndPush = async () => {
    if (!commitMsg.trim() || staged.size === 0 || committing) return;
    if (!hasLocalGit) {
      setErrorMsg("Local Git IPC is required for commit/push.");
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

  const canCommit =
    commitMsg.trim().length > 0 && staged.size > 0 && !committing;
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
            title="Refresh local Git status"
            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
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
            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
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
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.05]"
          style={{
            background: "rgba(139, 92, 246, 0.05)",
            border: "1px solid rgba(139, 92, 246, 0.1)",
          }}
        >
          <GitBranch size={14} className="text-purple-400 shrink-0" />
          <span className="text-xs text-gray-200 font-medium flex-1 truncate">
            {branch}
          </span>
          {status.ahead > 0 && (
            <span className="text-[10px] text-green-400">+{status.ahead}</span>
          )}
          {status.behind > 0 && (
            <span className="text-[10px] text-amber-400">-{status.behind}</span>
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
                      className="rounded bg-green-600/15 py-1.5 text-xs text-green-200 transition-colors hover:bg-green-600/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      disabled={!githubCapability.available || authBusy}
                      onClick={handleGithubSignOut}
                      className="rounded bg-white/[0.04] py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sign out
                    </button>
                  </div>
                  {githubFlow && (
                    <div className="mt-2 rounded border border-purple-500/20 bg-purple-500/5 p-2">
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
                          className="rounded bg-purple-600/20 py-1.5 text-center text-xs text-purple-200 transition-colors hover:bg-purple-600/30"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handlePollGithubAuth}
                          className="rounded bg-white/[0.04] py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
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
                      className="p-1 rounded hover:bg-white/10 text-amber-200"
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
                    <div className="w-full bg-black/40 text-xs px-2 py-2 rounded border border-white/10 animate-pulse text-gray-500">
                      Loading repositories...
                    </div>
                  ) : repos.length > 0 ? (
                    <select
                      className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50 text-gray-200"
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
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50"
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
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50"
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
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-1.5 rounded transition-colors"
                  >
                    Save Repo
                  </button>
                  <button
                    onClick={refreshGithubBackend}
                    className="bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs py-1.5 rounded transition-colors"
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

        <SectionHeader
          title="Changes"
          count={unstagedFiles.length}
          expanded={sections.changes}
          onToggle={() => toggleSection("changes")}
          action={unstagedFiles.length > 0 ? stageAll : null}
          actionLabel="All +"
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
                    onToggle={toggleStage}
                  />
                ))}
              </AnimatePresence>
              {unstagedFiles.length === 0 && (
                <p className="px-7 pb-2 text-[11px] text-gray-600">
                  No local changes
                </p>
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
          actionLabel="All -"
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
                    onToggle={toggleStage}
                  />
                ))}
              </AnimatePresence>
              {stagedFiles.length === 0 && (
                <p className="px-7 pb-2 text-[11px] text-gray-600">
                  No staged files
                </p>
              )}
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

          <div className="grid grid-cols-[1fr_auto] gap-1.5 mt-2">
            <motion.button
              whileHover={canCommit ? { scale: 1.02, y: -1 } : {}}
              whileTap={canCommit ? { scale: 0.97 } : {}}
              onClick={handleCommitAndPush}
              disabled={!canCommit}
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
              disabled={!hasLocalGit || refreshing}
              className="px-2 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: hasLocalGit ? "#cbd5e1" : "#475569",
                background: "rgba(255,255,255,0.03)",
                cursor: hasLocalGit ? "pointer" : "not-allowed",
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
