import React, { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Check,
  Plus,
  Minus,
  ChevronDown,
  Upload,
  Download,
  AlertCircle,
  Clock,
  Github,
  Key,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Octokit } from "octokit";

const STATUS_META = {
  M: { label: "Modified", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  A: { label: "Added", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  D: { label: "Deleted", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  R: { label: "Renamed", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  U: { label: "Untracked", color: "#9ca3af", bg: "rgba(156,163,175,0.1)" },
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
          onClick={(e) => {
            e.stopPropagation();
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

function FileRow({ file, staged, onToggle }) {
  const meta = STATUS_META[file.status] || STATUS_META.U;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0 }}
      whileHover={{ x: 2 }}
      onClick={() => onToggle(file.id)}
      className="w-full flex items-center gap-2 px-3 py-1 group cursor-pointer"
      title={meta.label}
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

export default function GitPanel({ files }) {
  const [commitMsg, setCommitMsg] = useState("");
  const [staged, setStaged] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [branch, setBranch] = useState("main");
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [sections, setSections] = useState({
    changes: true,
    staged: true,
    history: false,
    settings: false,
  });

  const [githubToken, setGithubToken] = useState(
    localStorage.getItem("github_token") || "",
  );
  const [githubRepo, setGithubRepo] = useState(
    localStorage.getItem("github_repo") || "",
  );
  const [githubOwner, setGithubOwner] = useState(
    localStorage.getItem("github_owner") || "",
  );
  const [githubUser, setGithubUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const saveGithubSettings = (token, owner, repo) => {
    localStorage.setItem("github_token", token);
    localStorage.setItem("github_owner", owner);
    localStorage.setItem("github_repo", repo);
    setGithubToken(token);
    setGithubOwner(owner);
    setGithubRepo(repo);
    verifyGithubToken(token);
  };

  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const verifyGithubToken = async (token) => {
    if (!token) return;
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.users.getAuthenticated();
      setGithubUser(data);
      setErrorMsg("");
      
      // Auto-fetch repos for the authenticated user
      fetchRepos(token);
      
      if (githubOwner && githubRepo) {
        fetchHistory(token, githubOwner, githubRepo);
      }
    } catch (error) {
      console.error(error);
      setGithubUser(null);
      setErrorMsg("Invalid GitHub Token");
    }
  };

  const fetchRepos = async (token) => {
    setLoadingRepos(true);
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 50,
      });
      setRepos(data);
    } catch (error) {
      console.error("Failed to fetch repos", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchHistory = async (token, owner, repo) => {
    if (!token || !owner || !repo) return;
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 10,
      });
      setHistory(
        data.map((commit) => ({
          hash: commit.sha.substring(0, 7),
          message: commit.commit.message,
          author: commit.commit.author.name,
          time: new Date(commit.commit.author.date).toLocaleString(),
        })),
      );
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  useEffect(() => {
    if (githubToken) {
      verifyGithubToken(githubToken);
    }
  }, []);

  // Use all files as 'Modified' or 'Added' for simulation if no real git status exists
  // Ideally, this should be tracked against the last fetched commit
  const changedFiles = files.map((f, i) => ({
    ...f,
    status: f.content ? "M" : "A", // Simplification
  }));

  const unstagedFiles = changedFiles.filter((f) => !staged.has(f.id));
  const stagedFiles = changedFiles.filter((f) => staged.has(f.id));

  const toggleStage = (id) =>
    setStaged((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const stageAll = () => setStaged(new Set(changedFiles.map((f) => f.id)));
  const unstageAll = () => setStaged(new Set());

  const toggleSection = (key) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCommitAndPush = async () => {
    if (!commitMsg.trim() || staged.size === 0 || committing) return;
    if (!githubToken || !githubOwner || !githubRepo) {
      setErrorMsg("GitHub settings incomplete");
      setSections({ ...sections, settings: true });
      return;
    }

    setCommitting(true);
    setErrorMsg("");

    try {
      const octokit = new Octokit({ auth: githubToken });

      // 1. Get current commit object
      const { data: refData } = await octokit.rest.git.getRef({
        owner: githubOwner,
        repo: githubRepo,
        ref: `heads/${branch}`,
      });
      const commitSha = refData.object.sha;

      const { data: commitData } = await octokit.rest.git.getCommit({
        owner: githubOwner,
        repo: githubRepo,
        commit_sha: commitSha,
      });

      // 2. Create tree with staged files
      const tree = stagedFiles.map((file) => ({
        path: file.name,
        mode: "100644",
        type: "blob",
        content: file.content || "",
      }));

      const { data: treeData } = await octokit.rest.git.createTree({
        owner: githubOwner,
        repo: githubRepo,
        base_tree: commitData.tree.sha,
        tree,
      });

      // 3. Create commit
      const { data: newCommitData } = await octokit.rest.git.createCommit({
        owner: githubOwner,
        repo: githubRepo,
        message: commitMsg.trim(),
        tree: treeData.sha,
        parents: [commitSha],
      });

      // 4. Update reference
      await octokit.rest.git.updateRef({
        owner: githubOwner,
        repo: githubRepo,
        ref: `heads/${branch}`,
        sha: newCommitData.sha,
      });

      const newEntry = {
        hash: newCommitData.sha.substring(0, 7),
        message: commitMsg.trim(),
        author: githubUser?.login || "You",
        time: "Just now",
      };

      setHistory((prev) => [newEntry, ...prev]);
      setCommitMsg("");
      setStaged(new Set());
      setCommitted(true);
      setTimeout(() => setCommitted(false), 2000);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const canCommit =
    commitMsg.trim().length > 0 && staged.size > 0 && !committing;

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
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
          Source Control
        </span>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchHistory(githubToken, githubOwner, githubRepo)}
            title="Refresh"
            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RefreshCw size={12} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleSection("settings")}
            title="Settings"
            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Github size={12} className={githubUser ? "text-green-400" : ""} />
          </motion.button>
        </div>
      </div>

      {/* ── Branch pill ──────────────────────────────────────── */}
      <div className="px-3 pb-4 shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.05] cursor-pointer"
          style={{
            background: "rgba(139, 92, 246, 0.05)",
            border: "1px solid rgba(139, 92, 246, 0.1)",
          }}
        >
          <GitBranch size={14} className="text-purple-400 shrink-0" />
          <span className="text-xs text-gray-200 font-medium flex-1 truncate">
            {branch}
          </span>
          {githubUser && (
            <img 
              src={githubUser.avatar_url} 
              alt={githubUser.login}
              className="w-4 h-4 rounded-full border border-purple-500/30"
            />
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div
        className="mx-3 mb-1 shrink-0"
        style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
      />

      {/* ── Scrollable body ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Settings */}
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
                <input
                  type="password"
                  placeholder="GitHub Token (Classic)"
                  className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50"
                  defaultValue={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold px-1">Repository</span>
                  {loadingRepos ? (
                    <div className="w-full bg-black/40 text-xs px-2 py-2 rounded border border-white/10 animate-pulse text-gray-500">
                      Repositories laden...
                    </div>
                  ) : repos.length > 0 ? (
                    <select
                      className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50 text-gray-200"
                      value={githubRepo ? `${githubOwner}/${githubRepo}` : ""}
                      onChange={(e) => {
                        const [owner, name] = e.target.value.split("/");
                        saveGithubSettings(githubToken, owner, name);
                      }}
                    >
                      <option value="" disabled>Repository auswählen</option>
                      {repos.map((r) => (
                        <option key={r.id} value={r.full_name}>
                          {r.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Owner / Username"
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50"
                        defaultValue={githubOwner}
                        onChange={(e) => setGithubOwner(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Repository Name"
                        className="w-full bg-black/40 text-xs px-2 py-1.5 rounded border border-white/10 outline-none focus:border-purple-500/50"
                        defaultValue={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                      />
                    </>
                  )}
                </div>
                <button
                  onClick={() =>
                    saveGithubSettings(githubToken, githubOwner, githubRepo)
                  }
                  className="w-full bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-1.5 rounded transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Changes */}
        <SectionHeader
          title="Änderungen"
          count={unstagedFiles.length}
          expanded={sections.changes}
          onToggle={() => toggleSection("changes")}
          action={unstagedFiles.length > 0 ? stageAll : null}
          actionLabel="Alle +"
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
                  Keine lokalen Änderungen
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staged */}
        <SectionHeader
          title="Gestaged"
          count={stagedFiles.length}
          expanded={sections.staged}
          onToggle={() => toggleSection("staged")}
          action={stagedFiles.length > 0 ? unstageAll : null}
          actionLabel="Alle –"
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
                  Keine gestagten Dateien
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Commit box ───────────────────────────────────────── */}
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
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter")
                handleCommitAndPush();
            }}
            placeholder="Commit-Nachricht (Ctrl+Enter)…"
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

          <motion.button
            whileHover={canCommit ? { scale: 1.02, y: -1 } : {}}
            whileTap={canCommit ? { scale: 0.97 } : {}}
            onClick={handleCommitAndPush}
            disabled={!canCommit}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition-all"
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
                  <span className="text-green-400">Pushed!</span>
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
                    Commit & Push
                    {stagedFiles.length > 0 ? ` (${stagedFiles.length})` : ""}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Divider */}
        <div
          className="mx-3 mb-1"
          style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
        />

        {/* Commit history */}
        <SectionHeader
          title="Verlauf (Remote)"
          count={history.length}
          expanded={sections.history}
          onToggle={() => toggleSection("history")}
          action={null}
          actionLabel={null}
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
                history.map((entry, i) => (
                  <motion.div
                    key={entry.hash}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative flex gap-3 px-4 py-2 hover:bg-white/[0.02] cursor-default"
                  >
                    <div className="flex flex-col items-center pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                      {i !== history.length - 1 && (
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
                          {entry.time}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="px-7 py-2 text-[11px] text-gray-600">
                  Kein Verlauf gefunden oder nicht verbunden.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
