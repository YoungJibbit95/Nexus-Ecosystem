import React, { useState, useMemo, useEffect } from "react";
import {
  Blocks,
  Search,
  Download,
  Star,
  Trash2,
  RefreshCw,
  ChevronDown,
  X,
  Zap,
  Shield,
  Palette,
  Code2,
  GitBranch,
  Terminal,
  Globe,
  Package,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Extension data ─────────────────────────────────────────────────────── */

const ALL_EXTENSIONS = [
  {
    id: "prettier",
    name: "Prettier",
    publisher: "Prettier",
    description: "Opinionated code formatter supporting many languages.",
    version: "3.2.5",
    rating: 4.9,
    downloads: "2.1M",
    category: "formatter",
    icon: "✦",
    iconColor: "#f97316",
    tags: ["formatting", "javascript", "typescript", "css"],
    verified: true,
    featured: true,
  },
  {
    id: "eslint",
    name: "ESLint",
    publisher: "Microsoft",
    description: "Integrates ESLint into the editor for instant feedback.",
    version: "2.4.4",
    rating: 4.8,
    downloads: "1.8M",
    category: "linter",
    icon: "⚡",
    iconColor: "#a855f7",
    tags: ["linting", "javascript", "typescript"],
    verified: true,
    featured: true,
  },
  {
    id: "gitlens",
    name: "GitLens",
    publisher: "GitKraken",
    description:
      "Supercharge Git inside your editor with blame, history & more.",
    version: "14.9.0",
    rating: 4.9,
    downloads: "1.5M",
    category: "git",
    icon: "◈",
    iconColor: "#f59e0b",
    tags: ["git", "version control", "blame"],
    verified: true,
    featured: true,
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    publisher: "GitHub",
    description:
      "AI pair programmer that suggests code completions in real time.",
    version: "1.212.0",
    rating: 4.7,
    downloads: "3.2M",
    category: "ai",
    icon: "◎",
    iconColor: "#6b7280",
    tags: ["ai", "autocomplete", "copilot"],
    verified: true,
    featured: true,
  },
  {
    id: "tailwind-intellisense",
    name: "Tailwind CSS IntelliSense",
    publisher: "Tailwind Labs",
    description:
      "Intelligent Tailwind CSS tooling with autocomplete and preview.",
    version: "0.10.5",
    rating: 4.9,
    downloads: "980K",
    category: "css",
    icon: "◉",
    iconColor: "#06b6d4",
    tags: ["tailwind", "css", "autocomplete"],
    verified: true,
    featured: false,
  },
  {
    id: "docker",
    name: "Docker",
    publisher: "Microsoft",
    description:
      "Makes it easy to create, manage, and debug containerized apps.",
    version: "1.29.2",
    rating: 4.6,
    downloads: "740K",
    category: "devops",
    icon: "▣",
    iconColor: "#2496ed",
    tags: ["docker", "containers", "devops"],
    verified: true,
    featured: false,
  },
  {
    id: "error-lens",
    name: "Error Lens",
    publisher: "usernamehw",
    description: "Improve highlighting of errors, warnings and infos inline.",
    version: "3.16.0",
    rating: 4.8,
    downloads: "620K",
    category: "linter",
    icon: "◆",
    iconColor: "#ef4444",
    tags: ["errors", "warnings", "diagnostics"],
    verified: false,
    featured: false,
  },
  {
    id: "material-icons",
    name: "Material Icon Theme",
    publisher: "Philipp Kief",
    description: "Material Design icons for files and folders in the explorer.",
    version: "5.1.0",
    rating: 4.9,
    downloads: "1.2M",
    category: "theme",
    icon: "◐",
    iconColor: "#4caf50",
    tags: ["icons", "theme", "material"],
    verified: false,
    featured: false,
  },
  {
    id: "rest-client",
    name: "REST Client",
    publisher: "Huachao Mao",
    description:
      "Send HTTP requests and view responses directly in the editor.",
    version: "0.25.1",
    rating: 4.7,
    downloads: "430K",
    category: "tools",
    icon: "⬡",
    iconColor: "#8b5cf6",
    tags: ["http", "rest", "api"],
    verified: false,
    featured: false,
  },
  {
    id: "live-share",
    name: "Live Share",
    publisher: "Microsoft",
    description:
      "Real-time collaborative development from the comfort of your editor.",
    version: "1.0.5931",
    rating: 4.5,
    downloads: "860K",
    category: "collaboration",
    icon: "⬟",
    iconColor: "#3b82f6",
    tags: ["collaboration", "sharing", "pair programming"],
    verified: true,
    featured: false,
  },
  {
    id: "rainbow-brackets",
    name: "Rainbow Brackets",
    publisher: "2gua",
    description: "A rainbow brackets extension for paired brackets.",
    version: "0.0.6",
    rating: 4.6,
    downloads: "390K",
    category: "theme",
    icon: "◇",
    iconColor: "#ec4899",
    tags: ["brackets", "colors", "readability"],
    verified: false,
    featured: false,
  },
  {
    id: "code-spell",
    name: "Code Spell Checker",
    publisher: "Street Side Software",
    description: "Spelling checker for source code and comments.",
    version: "3.0.1",
    rating: 4.7,
    downloads: "510K",
    category: "linter",
    icon: "⬢",
    iconColor: "#22c55e",
    tags: ["spelling", "linting", "comments"],
    verified: false,
    featured: false,
  },
  {
    id: "nexus-flux",
    name: "Nexus Flux",
    publisher: "Nexus Team",
    description: "Hyper-dynamic activity feed and workflow optimization for power users.",
    version: "1.0.2",
    rating: 5.0,
    downloads: "12K",
    category: "tools",
    icon: "⚡",
    iconColor: "#8000ff",
    tags: ["workflow", "nexus", "activity"],
    verified: true,
    featured: true,
  },
  {
    id: "glitch-theme",
    name: "Glitch Theme",
    publisher: "CyberPunk",
    description: "A cyber-vibrant theme with glitch animations and neon highlights.",
    version: "2.1.0",
    rating: 4.9,
    downloads: "45K",
    category: "theme",
    icon: "◈",
    iconColor: "#ec4899",
    tags: ["glitch", "neon", "cyan"],
    verified: false,
    featured: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "Alle", icon: Blocks },
  { id: "ai", label: "KI", icon: Zap },
  { id: "formatter", label: "Formatter", icon: Code2 },
  { id: "linter", label: "Linter", icon: Shield },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "theme", label: "Themes", icon: Palette },
  { id: "tools", label: "Tools", icon: Terminal },
  { id: "devops", label: "DevOps", icon: Globe },
  { id: "collaboration", label: "Zusammenarbeit", icon: Package },
];

const EXTENSIONS_STORAGE_KEY = "nexus-code-installed-extensions";

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const frac = rating - full;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={9}
          style={{
            fill:
              i < full
                ? "#fbbf24"
                : i === full && frac >= 0.5
                  ? "#fbbf2480"
                  : "transparent",
            color:
              i < full || (i === full && frac >= 0.5) ? "#fbbf24" : "#374151",
          }}
        />
      ))}
      <span className="text-[10px] text-gray-500 ml-0.5">{rating}</span>
    </span>
  );
}

function ExtensionCard({ ext, installed, onInstall, onUninstall, index }) {
  const [loading, setLoading] = useState(false);

  const handleAction = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      installed ? onUninstall(ext.id) : onInstall(ext.id);
      setLoading(false);
    }, 700);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, height: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="group relative rounded-xl p-3 cursor-default"
      style={{
        background: installed
          ? "rgba(128,0,255,0.06)"
          : "rgba(255,255,255,0.025)",
        border: installed
          ? "1px solid rgba(128,0,255,0.2)"
          : "1px solid rgba(255,255,255,0.06)",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
      whileHover={{
        borderColor: installed
          ? "rgba(128,0,255,0.35)"
          : "rgba(255,255,255,0.1)",
      }}
    >
      {ext.featured && !installed && (
        <div
          className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(251,191,36,0.12)",
            color: "#fbbf24",
            border: "1px solid rgba(251,191,36,0.25)",
          }}
        >
          Featured
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 font-bold"
          style={{
            background: ext.iconColor + "18",
            border: `1px solid ${ext.iconColor}30`,
            color: ext.iconColor,
          }}
        >
          {ext.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-gray-200 truncate">
              {ext.name}
            </span>
            {ext.verified && (
              <BadgeCheck
                size={12}
                className="shrink-0"
                style={{ color: "#3b82f6" }}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-600 mb-1 truncate">
            {ext.publisher} · v{ext.version}
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
            {ext.description}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2">
            <StarRating rating={ext.rating} />
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <Download size={9} />
              {ext.downloads}
            </span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {ext.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#6b7280",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <motion.button
          whileHover={!loading ? { scale: 1.05 } : {}}
          whileTap={!loading ? { scale: 0.95 } : {}}
          onClick={handleAction}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ml-2"
          style={
            installed
              ? {
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }
              : {
                  background: "linear-gradient(135deg, #8000ff22, #0033ff22)",
                  border: "1px solid rgba(128,0,255,0.3)",
                  color: "#a855f7",
                }
          }
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <RefreshCw size={11} />
                </motion.div>
              </motion.div>
            ) : installed ? (
              <motion.div
                key="uninstall"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex items-center gap-1"
              >
                <Trash2 size={11} />
                Entfernen
              </motion.div>
            ) : (
              <motion.div
                key="install"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex items-center gap-1"
              >
                <Download size={11} />
                Installieren
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function ExtensionsPanel({ onInstalledChange }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [installed, setInstalled] = useState(() => {
    try {
      const raw = localStorage.getItem(EXTENSIONS_STORAGE_KEY);
      if (!raw) return new Set(["prettier", "eslint", "gitlens"]);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set(["prettier", "eslint", "gitlens"]);
      return new Set(parsed.filter((id) => typeof id === "string"));
    } catch {
      return new Set(["prettier", "eslint", "gitlens"]);
    }
  });
  const [activeTab, setActiveTab] = useState("marketplace"); // "marketplace" | "installed"
  const [showCategories, setShowCategories] = useState(false);

  const handleInstall = (id) => setInstalled((prev) => new Set([...prev, id]));
  const handleUninstall = (id) =>
    setInstalled((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });

  useEffect(() => {
    const installedList = Array.from(installed);
    localStorage.setItem(
      EXTENSIONS_STORAGE_KEY,
      JSON.stringify(installedList),
    );
    onInstalledChange?.(installedList);
    window.dispatchEvent(
      new CustomEvent("nx-code-extensions-changed", {
        detail: { installed: installedList },
      }),
    );
  }, [installed, onInstalledChange]);

  const filtered = useMemo(() => {
    let list =
      activeTab === "installed"
        ? ALL_EXTENSIONS.filter((e) => installed.has(e.id))
        : ALL_EXTENSIONS.filter((e) => !installed.has(e.id));

    if (category !== "all") {
      list = list.filter((e) => e.category === category);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.publisher.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)),
      );
    }

    return list;
  }, [query, category, activeTab, installed]);

  const installedCount = installed.size;

  return (
    <motion.div
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="w-72 h-full min-h-0 flex flex-col shrink-0 overflow-hidden"
      style={{
        background: "rgba(6, 6, 20, 0.4)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Blocks size={13} className="text-purple-400" />
            <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase">
              Extensions
            </span>
          </div>
          {installedCount > 0 && (
            <motion.span
              key={installedCount}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(128,0,255,0.15)",
                color: "#a855f7",
              }}
            >
              {installedCount} installiert
            </motion.span>
          )}
        </div>

        {/* Tab switcher */}
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {[
            { id: "marketplace", label: "Marketplace" },
            { id: "installed", label: `Installiert (${installedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all relative"
              style={{
                color: activeTab === tab.id ? "#e5e7eb" : "#6b7280",
              }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="extTabIndicator"
                  className="absolute inset-0 rounded-md"
                  style={{ background: "rgba(128,0,255,0.18)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="px-3 pb-2 shrink-0">
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: query
              ? "1px solid rgba(128,0,255,0.35)"
              : "1px solid rgba(255,255,255,0.07)",
            transition: "border-color 0.2s ease",
          }}
        >
          <Search size={12} className="text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Extensions suchen…"
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 outline-none min-w-0"
          />
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuery("")}
              className="shrink-0 p-0.5 rounded hover:bg-white/10"
            >
              <X size={10} className="text-gray-500" />
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Category toggle ─────────────────────────────────────────── */}
      <div className="px-3 pb-2 shrink-0">
        <button
          onClick={() => setShowCategories((p) => !p)}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors w-full"
        >
          <motion.div
            animate={{ rotate: showCategories ? 0 : -90 }}
            transition={{ duration: 0.18 }}
          >
            <ChevronDown size={11} />
          </motion.div>
          <span>
            Kategorien{" "}
            {category !== "all" && (
              <span style={{ color: "#a855f7" }}>
                · {CATEGORIES.find((c) => c.id === category)?.label}
              </span>
            )}
          </span>
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: "hidden" }}
            >
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategory(cat.id);
                        setShowCategories(false);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                      style={{
                        background: active
                          ? "rgba(128,0,255,0.18)"
                          : "rgba(255,255,255,0.04)",
                        border: active
                          ? "1px solid rgba(128,0,255,0.35)"
                          : "1px solid rgba(255,255,255,0.06)",
                        color: active ? "#c084fc" : "#9ca3af",
                      }}
                    >
                      <Icon size={10} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div
        className="mx-3 mb-1 shrink-0"
        style={{ height: "1px", background: "rgba(128,0,255,0.08)" }}
      />

      {/* ── Extension list ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((ext, i) => (
            <ExtensionCard
              key={ext.id}
              ext={ext}
              index={i}
              installed={installed.has(ext.id)}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
            />
          ))}
        </AnimatePresence>

        {/* Empty states */}
        {filtered.length === 0 && activeTab === "installed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Blocks size={32} className="text-gray-700 mb-3" />
            </motion.div>
            <p className="text-xs text-gray-600 mb-1">
              Keine Extensions installiert
            </p>
            <button
              onClick={() => setActiveTab("marketplace")}
              className="text-xs text-purple-400 hover:text-purple-300 mt-2 transition-colors"
            >
              Marketplace öffnen →
            </button>
          </motion.div>
        )}

        {filtered.length === 0 && activeTab === "marketplace" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Search size={28} className="text-gray-700 mb-3" />
            <p className="text-xs text-gray-600">Keine Extensions gefunden</p>
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="text-xs text-purple-400 hover:text-purple-300 mt-2 transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(128,0,255,0.08)" }}
      >
        <span className="text-[10px] text-gray-600">
          {filtered.length} {filtered.length === 1 ? "Extension" : "Extensions"}
          {category !== "all" && (
            <>
              {" "}
              ·{" "}
              <span style={{ color: "#a855f7" }}>
                {CATEGORIES.find((c) => c.id === category)?.label}
              </span>
            </>
          )}
        </span>
        <div className="flex items-center gap-1">
          <TrendingUp size={9} className="text-gray-700" />
          <span className="text-[10px] text-gray-700">Marketplace</span>
        </div>
      </div>
    </motion.div>
  );
}
