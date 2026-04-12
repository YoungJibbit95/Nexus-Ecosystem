import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Database,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { SpaceBackground } from "../components/SpaceBackground";
import { SpotlightCard } from "../components/ui/SpotlightCard";
import {
  apps,
  categories,
  entries,
  viewMatrix,
  appEmoji,
  categoryEmoji,
  appLabel,
  categoryLabel,
  sectionLabel,
  sectionMeta,
  uiCopy,
  entryCopy,
  coverageCopy,
  navigationGroups,
  sectionIcon,
  MIN_SEARCH_QUERY_CHARS,
  localizeEntry,
  makeSearchBlob,
  makeSearchTerms,
  normalizeText,
  expandQueryTokens,
  scoreEntry,
  sectionBaseEntries,
  type AppFilter,
  type AppId,
  type CategoryFilter,
  type CategoryId,
  type Language,
  type NavGroupId,
  type SectionId,
  type WikiEntry,
} from "./wikiPageData";

export function WikiPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("getting-started");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [copyState, setCopyState] = useState("");
  const [focusedEntryId, setFocusedEntryId] = useState("");
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === "undefined") return "de";
    const cached = window.localStorage.getItem("nexus-wiki-lang");
    if (cached === "de" || cached === "en") return cached;
    return window.navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
  });

  useEffect(() => {
    window.localStorage.setItem("nexus-wiki-lang", lang);
  }, [lang]);

  useEffect(() => {
    if (!focusedEntryId) return;
    const timeout = window.setTimeout(() => setFocusedEntryId(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [focusedEntryId]);

  const deferredQuery = useDeferredValue(normalizeText(query));
  const effectiveQuery = deferredQuery.length >= MIN_SEARCH_QUERY_CHARS ? deferredQuery : "";
  const searchTokens = useMemo(() => expandQueryTokens(effectiveQuery), [effectiveQuery]);
  const isGlobalSearch = effectiveQuery.length > 0;
  const hasShortSearchQuery = deferredQuery.length > 0 && !isGlobalSearch;

  const sourceEntryById = useMemo(() => {
    const map = new Map<string, WikiEntry>();
    entries.forEach((entry) => {
      map.set(entry.id, entry);
    });
    return map;
  }, []);

  const localizedEntries = useMemo(() => {
    return entries.map((entry) => localizeEntry(entry, lang));
  }, [lang]);

  const localizedEntryById = useMemo(() => {
    const map = new Map<string, WikiEntry>();
    localizedEntries.forEach((entry) => {
      map.set(entry.id, entry);
    });
    return map;
  }, [localizedEntries]);

  const searchBlobById = useMemo(() => {
    const index = new Map<string, string>();
    localizedEntries.forEach((entry) => {
      index.set(entry.id, makeSearchBlob(entry, sourceEntryById.get(entry.id)));
    });
    return index;
  }, [localizedEntries, sourceEntryById]);

  const searchTermsById = useMemo(() => {
    const index = new Map<string, string[]>();
    localizedEntries.forEach((entry) => {
      index.set(entry.id, makeSearchTerms(entry));
    });
    return index;
  }, [localizedEntries]);

  const entrySections = useMemo(() => {
    const map = new Map<string, SectionId[]>();
    (Object.keys(sectionBaseEntries) as SectionId[]).forEach((section) => {
      if (section === "coverage") return;
      sectionBaseEntries[section].forEach((entry) => {
        const existing = map.get(entry.id) ?? [];
        if (!existing.includes(section)) existing.push(section);
        map.set(entry.id, existing);
      });
    });
    return map;
  }, []);

  const filteredEntries = useMemo(() => {
    const base = isGlobalSearch ? entries : sectionBaseEntries[activeSection] ?? [];
    const baseIndex = new Map<string, number>();
    base.forEach((entry, index) => baseIndex.set(entry.id, index));

    const ranked = new Map<string, { entry: WikiEntry; score: number; order: number }>();
    const upsert = (entry: WikiEntry, score: number, fallbackOrder: number) => {
      const nextOrder = baseIndex.get(entry.id) ?? fallbackOrder;
      const current = ranked.get(entry.id);
      if (!current) {
        ranked.set(entry.id, { entry, score, order: nextOrder });
        return;
      }
      if (score > current.score) {
        ranked.set(entry.id, { entry, score, order: Math.min(current.order, nextOrder) });
      }
    };

    base.forEach((baseEntry, index) => {
      const entry = localizedEntryById.get(baseEntry.id) ?? baseEntry;
      const appOk = appFilter === "all" || entry.app === appFilter;
      const categoryOk = categoryFilter === "all" || entry.category === categoryFilter;
      if (!appOk || !categoryOk) return;

      const blob = searchBlobById.get(entry.id) ?? "";
      const searchTerms = searchTermsById.get(entry.id) ?? [];
      const score = scoreEntry(entry, blob, effectiveQuery, searchTokens, searchTerms);
      if (!isGlobalSearch || score > 0) {
        upsert(entry, Math.max(1, score), index);
      }
    });

    if (isGlobalSearch && effectiveQuery.length >= MIN_SEARCH_QUERY_CHARS && ranked.size < 8) {
      const fallbackTokens = Array.from(
        new Set(
          [...searchTokens, ...effectiveQuery.split(" ")]
            .map((token) => token.trim())
            .filter((token) => token.length >= MIN_SEARCH_QUERY_CHARS),
        ),
      );

      if (fallbackTokens.length) {
        localizedEntries.forEach((entry, index) => {
          const appOk = appFilter === "all" || entry.app === appFilter;
          const categoryOk = categoryFilter === "all" || entry.category === categoryFilter;
          if (!appOk || !categoryOk) return;

          const blob = searchBlobById.get(entry.id) ?? "";
          const looseHit = fallbackTokens.some((token) =>
            blob.includes(token.slice(0, Math.max(1, token.length - 1))),
          );
          if (!looseHit) return;

          const tokenHitCount = fallbackTokens.reduce(
            (count, token) => (blob.includes(token) ? count + 1 : count),
            0,
          );
          upsert(entry, 4 + tokenHitCount * 2, base.length + index);
        });
      }
    }

    const resolved = Array.from(ranked.values());
    resolved.sort((a, b) => {
      if (isGlobalSearch && b.score !== a.score) return b.score - a.score;
      if (a.order !== b.order) return a.order - b.order;
      return a.entry.title.localeCompare(b.entry.title);
    });
    return resolved.map((item) => item.entry);
  }, [
    activeSection,
    appFilter,
    categoryFilter,
    effectiveQuery,
    isGlobalSearch,
    localizedEntries,
    localizedEntryById,
    searchBlobById,
    searchTermsById,
    searchTokens,
  ]);

  const groupedEntries = useMemo(() => {
    const byId = new Map<AppId, WikiEntry[]>();
    filteredEntries.forEach((entry) => {
      const current = byId.get(entry.app) ?? [];
      current.push(entry);
      byId.set(entry.app, current);
    });

    return apps
      .map((app) => ({ app, entries: byId.get(app.id) ?? [] }))
      .filter((group) => group.entries.length > 0);
  }, [filteredEntries]);

  const topCommands = useMemo(() => {
    const unique = new Set<string>();
    filteredEntries.forEach((entry) => {
      entry.commands.forEach((command) => {
        if (unique.size < 20) unique.add(command);
      });
    });
    return Array.from(unique);
  }, [filteredEntries]);

  const coverageStats = useMemo(() => {
    const byCategoryCount = categories.map((item) => ({
      ...item,
      count: entries.filter((entry) => entry.category === item.id).length,
    }));

    const byAppCount = apps.map((item) => ({
      ...item,
      count: entries.filter((entry) => entry.app === item.id).length,
    }));

    const snippetCount = entries.reduce((sum, entry) => sum + (entry.markdownSnippets?.length ?? 0), 0);

    const sourceMap = new Map<string, number>();
    entries.forEach((entry) => {
      entry.sources.forEach((source) => {
        sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
      });
    });

    const topSources = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      byCategoryCount,
      byAppCount,
      snippetCount,
      topSources,
    };
  }, []);

  const sectionCounts = useMemo(() => {
    return Object.fromEntries(
      Object.entries(sectionBaseEntries).map(([id, items]) => [id, items.length]),
    ) as Record<SectionId, number>;
  }, []);

  const sectionRail = useMemo(() => navigationGroups.flatMap((group) => group.sections), []);

  const searchPreviewEntries = useMemo(() => {
    if (!isGlobalSearch) return [];
    return filteredEntries.slice(0, 12);
  }, [filteredEntries, isGlobalSearch]);

  const t = uiCopy[lang];
  const cardText = entryCopy[lang];
  const coverageText = coverageCopy[lang];
  const meta = sectionMeta[activeSection][lang];

  const copyText = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(token);
      window.setTimeout(() => setCopyState(""), 1300);
    } catch {
      setCopyState("copy-error");
      window.setTimeout(() => setCopyState(""), 1300);
    }
  };

  const jumpToEntry = (entry: WikiEntry) => {
    const preferredSection = entrySections.get(entry.id)?.[0] ?? activeSection;
    if (preferredSection !== activeSection) {
      setActiveSection(preferredSection);
    }

    setFocusedEntryId(entry.id);
    setIsMobileMenuOpen(false);

    const scrollToEntry = (attempt = 0) => {
      const target = document.getElementById(`entry-${entry.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (attempt >= 16) return;
      window.requestAnimationFrame(() => scrollToEntry(attempt + 1));
    };

    window.requestAnimationFrame(() => scrollToEntry(0));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-x-hidden">
      <SpaceBackground />

      <button
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="md:hidden fixed top-4 right-4 z-50 p-3 rounded-xl bg-cyan-500/15 text-cyan-200 border border-cyan-400/40 backdrop-blur-xl"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-40 w-[min(20rem,88vw)] md:w-80 bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.55)]">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">
              {t.navTitle}
            </h1>
            <p className="text-[10px] text-cyan-200/90 font-mono tracking-widest uppercase">{t.sidebarTag}</p>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">{t.sidebarFilters}</p>
          <div className="grid gap-2">
            <label className="space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">{t.filterApp}</span>
              <select
                value={appFilter}
                onChange={(event) => setAppFilter(event.target.value as AppFilter)}
                className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
              >
                <option value="all">{t.appFilterAll}</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {appEmoji[app.id]} {appLabel[app.id][lang]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">{t.filterCategory}</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
              >
                <option value="all">{t.categoryFilterAll}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryEmoji[category.id]} {categoryLabel[category.id][lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                {t.navGroup[group.id]}
              </h3>
              <div className="space-y-1">
                {group.sections.map((id) => {
                  const Icon = sectionIcon[id];
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveSection(id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 shadow-[inset_0_0_20px_rgba(34,211,238,0.12)] font-medium"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-cyan-300" : "text-slate-500"}`} />
                      <span className="truncate">{sectionLabel[id][lang]}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{sectionCounts[id]}</span>
                      {isActive && <ChevronRight className="w-4 h-4 text-cyan-200/75" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative z-10 custom-scrollbar scroll-smooth">
        <div className="max-w-[1320px] mx-auto px-5 md:px-9 py-8 md:py-12 space-y-8">
          <div className="sticky top-2 md:top-4 z-30">
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-slate-900/65 backdrop-blur-2xl shadow-[0_10px_40px_rgba(3,7,18,0.45)]">
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(14,116,144,0.12),rgba(99,102,241,0.12),rgba(168,85,247,0.08))]" />
              <div className="relative p-3 md:p-4 space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-black/35 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/40 transition-all placeholder:text-slate-500"
                    />
                  </div>

                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/35 p-1 w-fit">
                    <button
                      onClick={() => setLang("de")}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        lang === "de" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🇩🇪 DE
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        lang === "en" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGlobalSearch ? t.searchScopeGlobal : t.searchScopeSection}
                  </span>
                  <span className="text-slate-400">{t.searchActiveHint}</span>
                  {hasShortSearchQuery ? (
                    <span className="text-amber-200">{t.searchMinChars}</span>
                  ) : null}
                  {isGlobalSearch ? (
                    <button
                      onClick={() => setQuery("")}
                      className="ml-auto px-2.5 py-1 rounded-full border border-white/10 bg-black/35 hover:border-cyan-400/40"
                    >
                      {t.clearSearch}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <section className="sticky top-[98px] md:top-[118px] z-20 rounded-2xl border border-white/10 bg-slate-900/55 backdrop-blur-2xl px-3 py-2">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
              {sectionRail.map((sectionId) => {
                const active = sectionId === activeSection;
                return (
                  <button
                    key={`rail-${sectionId}`}
                    onClick={() => {
                      setActiveSection(sectionId);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition ${
                      active
                        ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                        : "border-white/10 bg-black/25 text-slate-300 hover:border-cyan-400/35 hover:text-cyan-100"
                    }`}
                  >
                    <span>{sectionLabel[sectionId][lang]}</span>
                    <span className="text-[10px] opacity-80">{sectionCounts[sectionId]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <AnimatePresence mode="wait">
            <motion.section
              key={`${activeSection}-${lang}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.24 }}
              className="space-y-6"
            >
              <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 backdrop-blur-2xl p-6 md:p-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-24 -top-24 w-72 h-72 border border-cyan-300/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-16 -top-16 w-56 h-56 border border-indigo-300/20 rounded-full"
                />
                <div className="relative space-y-5">
                  <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">
                    <Sparkles className="w-4 h-4" />
                    {meta.title}
                  </p>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight max-w-5xl">{meta.title}</h1>
                  <p className="text-slate-300 text-base md:text-lg max-w-5xl leading-relaxed">{meta.subtitle}</p>

                  <div className="grid gap-3 md:grid-cols-3">
                    {meta.bullets.map((bullet) => (
                      <div key={bullet}>
                        <SpotlightCard
                          className="rounded-2xl border border-white/10 bg-slate-900/45 backdrop-blur-xl p-4"
                          spotlightColor="rgba(34,211,238,0.14)"
                        >
                          <p className="text-sm text-slate-300 leading-relaxed">{bullet}</p>
                        </SpotlightCard>
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              <section className="p-4 md:p-5 rounded-2xl bg-slate-900/55 border border-white/10 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                    <Database className="w-3.5 h-3.5" />
                    {filteredEntries.length} {isGlobalSearch ? t.searchEntries : t.sectionEntries}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    <Terminal className="w-3.5 h-3.5" /> {topCommands.length} {t.commandHints}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <BookOpen className="w-3.5 h-3.5" /> {entries.length} {t.totalEntries}
                  </span>
                </div>

                {topCommands.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topCommands.map((command) => (
                      <button
                        key={command}
                        onClick={() => copyText(command, `cmd:${command}`)}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 hover:border-cyan-400/50 text-slate-200"
                      >
                        💻 {command}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              {isGlobalSearch ? (
                <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.08] backdrop-blur-xl p-4 md:p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold text-white">{t.searchResultsTitle}</h2>
                    <p className="text-sm text-cyan-50/85">{t.searchResultsSubtitle}</p>
                  </div>

                  {searchPreviewEntries.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {searchPreviewEntries.map((entry) => {
                        const candidateSections = entrySections.get(entry.id) ?? [activeSection];
                        return (
                          <button
                            key={`search-hit-${entry.id}`}
                            onClick={() => jumpToEntry(entry)}
                            className="text-left p-4 rounded-xl border border-white/12 bg-black/30 hover:border-cyan-300/40 transition"
                          >
                            <p className="text-base font-semibold text-white leading-snug">
                              {appEmoji[entry.app]} {entry.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-300 line-clamp-2">{entry.summary}</p>

                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-200">
                              <span className="px-2 py-1 rounded-full border border-cyan-400/35 bg-cyan-400/10">
                                {appEmoji[entry.app]} {appLabel[entry.app][lang]}
                              </span>
                              <span className="px-2 py-1 rounded-full border border-indigo-400/35 bg-indigo-500/10">
                                {categoryEmoji[entry.category]} {categoryLabel[entry.category][lang]}
                              </span>
                              {candidateSections.slice(0, 2).map((section) => (
                                <span
                                  key={`jump-${entry.id}-${section}`}
                                  className="px-2 py-1 rounded-full border border-white/15 bg-white/5"
                                >
                                  {sectionLabel[section][lang]}
                                </span>
                              ))}
                            </div>

                            <p className="mt-3 text-xs text-cyan-200">↳ {t.jumpToGuide}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">{t.noResults}</p>
                  )}

                  {filteredEntries.length > searchPreviewEntries.length ? (
                    <p className="text-xs text-cyan-200/90">
                      +{filteredEntries.length - searchPreviewEntries.length} {t.moreResults}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {activeSection === "coverage" ? (
                <CoverageSection
                  coverageStats={coverageStats}
                  allEntries={localizedEntries}
                  filteredEntries={filteredEntries}
                  lang={lang}
                  copy={coverageText}
                />
              ) : (
                <section className="space-y-5">
                  {groupedEntries.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-white/20 bg-black/30 text-slate-400">
                      {t.noResults}
                    </div>
                  ) : (
                    groupedEntries.map((group) => (
                      <div key={group.app.id} className="space-y-5 py-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                            {appEmoji[group.app.id]} {appLabel[group.app.id][lang]}
                          </h2>
                          <span className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-slate-300 bg-white/5">
                            {group.entries.length} {t.entryCount}
                          </span>
                        </div>
                        <div className="grid gap-6">
                          {group.entries.map((entry) => (
                            <div key={entry.id}>
                              <EntryCard
                                entry={entry}
                                onCopy={copyText}
                                copy={cardText}
                                lang={lang}
                                isFocused={focusedEntryId === entry.id}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )}

              {(activeSection === "architecture" || activeSection === "api-reference" || activeSection === "coverage") && (
                <section className="p-4 md:p-6 rounded-2xl bg-slate-900/55 border border-white/10 backdrop-blur-xl space-y-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-cyan-300" /> {t.viewMatrix}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-sm min-w-[760px]">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">{t.tableView}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableMain}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableMobile}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableCode}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableCodeMobile}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableControl}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {viewMatrix.map((row) => (
                          <tr key={row.view}>
                            <td className="px-4 py-3 font-medium">{row.view}</td>
                            <td className="px-4 py-3">{row.main ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.mobile ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.code ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.codeMobile ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.control ? "✅" : "❌"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <footer className="pt-2 pb-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <LayoutDashboard className="w-4 h-4" /> {t.footerLayout}
                </span>
                {copyState && copyState !== "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                    <Check className="w-4 h-4" /> {t.copied}
                  </span>
                ) : null}
                {copyState === "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300">
                    {t.copyError}
                  </span>
                ) : null}
              </footer>
            </motion.section>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function EntryCard({
  entry,
  onCopy,
  copy,
  lang,
  isFocused,
}: {
  entry: WikiEntry;
  onCopy: (text: string, token: string) => void;
  copy: {
    steps: string;
    features: string;
    commands: string;
    snippets: string;
    tags: string;
    sources: string;
    copy: string;
    appLabel: string;
    categoryLabel: string;
    featuresLabel: string;
    commandsLabel: string;
    stepsUnit: string;
    featuresUnit: string;
  };
  lang: Language;
  isFocused: boolean;
}) {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const completedCount = entry.guide.reduce((count, _step, index) => {
    if (completedSteps[index]) return count + 1;
    return count;
  }, 0);

  return (
    <SpotlightCard
      className={`rounded-3xl border bg-slate-900/55 backdrop-blur-2xl transition-all ${
        isFocused
          ? "border-cyan-300/60 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_12px_34px_rgba(6,182,212,0.18)]"
          : "border-white/10"
      }`}
      spotlightColor="rgba(34,211,238,0.1)"
    >
      <article id={`entry-${entry.id}`} className="p-6 md:p-8 lg:p-10 space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 min-w-0 flex-1">
            <h3 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight">
              {appEmoji[entry.app]} {entry.title}
            </h3>
            <p className="text-slate-200 leading-relaxed text-base md:text-lg max-w-5xl">{entry.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-200">
              {appEmoji[entry.app]} {appLabel[entry.app][lang]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
              {categoryEmoji[entry.category]} {categoryLabel[entry.category][lang]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
              {entry.guide.length} {copy.stepsUnit}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200">
              {entry.points.length} {copy.featuresUnit}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
          <p className="text-xs font-mono text-slate-400">### {entry.title}</p>
          <p className="mt-1 text-sm text-slate-300">
            {copy.appLabel}: <span className="text-slate-100">{appLabel[entry.app][lang]}</span> • {copy.categoryLabel}:{" "}
            <span className="text-slate-100">{categoryLabel[entry.category][lang]}</span> • {copy.featuresLabel}:{" "}
            <span className="text-slate-100">{entry.points.length}</span> • {copy.commandsLabel}:{" "}
            <span className="text-slate-100">{entry.commands.length}</span>
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="p-4 md:p-5 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm md:text-base font-bold text-indigo-100">{copy.steps}</h4>
              <span className="text-xs px-2 py-1 rounded-full border border-indigo-300/35 bg-indigo-400/10 text-indigo-100">
                {completedCount}/{entry.guide.length}
              </span>
            </div>
            <ol className="mt-3 space-y-2.5">
              {entry.guide.map((step, index) => {
                const done = Boolean(completedSteps[index]);
                return (
                  <li key={`${entry.id}-${step.title}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setCompletedSteps((prev) => ({
                          ...prev,
                          [index]: !prev[index],
                        }))
                      }
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        done
                          ? "border-emerald-400/35 bg-emerald-500/10"
                          : "border-white/10 bg-black/20 hover:border-indigo-300/35"
                      }`}
                    >
                      <p className="text-sm md:text-base text-white font-semibold">
                        {done ? "✅" : `🛰️ ${index + 1}.`} {step.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-300 leading-relaxed">{step.detail}</p>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="p-4 md:p-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06]">
            <h4 className="text-sm md:text-base font-bold text-cyan-100">{copy.features}</h4>
            <ul className="mt-3 space-y-2 text-sm md:text-[15px] text-slate-200 leading-relaxed">
              {entry.points.map((point) => (
                <li key={`${entry.id}-point-${point}`} className="flex items-start gap-2">
                  <span className="mt-1">✨</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {entry.commands.length ? (
          <section className="space-y-3">
            <h4 className="text-sm md:text-base font-bold text-emerald-200">{copy.commands}</h4>
            <div className="flex flex-wrap gap-2.5">
              {entry.commands.map((command) => (
                <button
                  key={`${entry.id}-cmd-${command}`}
                  onClick={() => onCopy(command, `entry-cmd:${entry.id}:${command}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/45 border border-white/10 text-xs md:text-sm text-slate-200 hover:border-cyan-400/50"
                >
                  <Copy className="w-3.5 h-3.5" /> {command}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {entry.markdownSnippets?.length ? (
          <section className="space-y-3">
            <h4 className="text-sm md:text-base font-bold text-fuchsia-200">{copy.snippets}</h4>
            <div className="grid gap-4">
              {entry.markdownSnippets.map((snippet) => (
                <div
                  key={`${entry.id}-snippet-${snippet.label}`}
                  className="p-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm md:text-base text-white">{snippet.label}</strong>
                    <button
                      onClick={() => onCopy(snippet.snippet, `snippet:${entry.id}:${snippet.label}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-white/10 bg-white/5 hover:border-cyan-400/40"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copy.copy}
                    </button>
                  </div>
                  <p className="text-sm text-slate-300">{snippet.description}</p>
                  <pre className="bg-black/45 border border-white/10 rounded-xl p-3 text-xs md:text-sm text-slate-200 overflow-x-auto leading-relaxed">
                    {snippet.snippet}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="p-4 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm md:text-base font-bold text-slate-100 mb-2">{copy.tags}</h4>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={`${entry.id}-tag-${tag}`}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm md:text-base font-bold text-slate-100 mb-2">{copy.sources}</h4>
            <ul className="space-y-1.5 text-xs md:text-sm text-slate-300">
              {entry.sources.map((source) => (
                <li key={`${entry.id}-src-${source}`} className="font-mono break-all">
                  {source}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </article>
    </SpotlightCard>
  );
}

function CoverageSection({
  coverageStats,
  allEntries,
  filteredEntries,
  lang,
  copy,
}: {
  coverageStats: {
    byCategoryCount: Array<{ id: CategoryId; label: string; description: string; count: number }>;
    byAppCount: Array<{ id: AppId; label: string; subtitle: string; count: number }>;
    snippetCount: number;
    topSources: Array<{ source: string; count: number }>;
  };
  allEntries: WikiEntry[];
  filteredEntries: WikiEntry[];
  lang: Language;
  copy: {
    totalEntries: string;
    snippets: string;
    activeMatches: string;
    categoryCoverage: string;
    appCoverage: string;
    topSources: string;
    fullList: string;
    references: string;
    stepsUnit: string;
    featuresUnit: string;
  };
}) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(99,102,241,0.12)">
          <p className="text-sm text-slate-400">{copy.totalEntries}</p>
          <p className="mt-1 text-3xl font-black text-white">{allEntries.length}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(34,211,238,0.12)">
          <p className="text-sm text-slate-400">{copy.snippets}</p>
          <p className="mt-1 text-3xl font-black text-white">{coverageStats.snippetCount}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(52,211,153,0.12)">
          <p className="text-sm text-slate-400">{copy.activeMatches}</p>
          <p className="mt-1 text-3xl font-black text-white">{filteredEntries.length}</p>
        </SpotlightCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">{copy.categoryCoverage}</h3>
          <div className="space-y-2">
            {coverageStats.byCategoryCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {categoryEmoji[item.id]} {categoryLabel[item.id][lang]}
                </span>
                <strong className="text-sm text-indigo-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">{copy.appCoverage}</h3>
          <div className="space-y-2">
            {coverageStats.byAppCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {appEmoji[item.id]} {appLabel[item.id][lang]}
                </span>
                <strong className="text-sm text-cyan-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.topSources}</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {coverageStats.topSources.map((item) => (
            <div key={item.source} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="font-mono text-xs text-slate-300 break-all">{item.source}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.count} {copy.references}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.fullList}</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {allEntries.map((entry) => (
            <div key={entry.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="text-sm text-white leading-snug">
                {appEmoji[entry.app]} {entry.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {categoryEmoji[entry.category]} {categoryLabel[entry.category][lang]} • {entry.guide.length} {copy.stepsUnit} • {entry.points.length} {copy.featuresUnit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
