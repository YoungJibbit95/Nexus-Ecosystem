import React from "react";
import { AlertCircle, ArrowUpRight, CircleDot, Loader2, RefreshCw } from "lucide-react";
import { PanelBadge, PanelIconButton } from "../panels/PanelChrome.jsx";
import { QuietCard, WorkbenchState } from "./githubWorkbenchPrimitives.jsx";
import { formatDate, getItemKey, getUserLogin, stateTone } from "./githubWorkbenchData.js";

export function IssueList({ items, selectedItem, onSelectItem }) {
  return (
    <div className="grid gap-1.5 px-3 pb-3">
      {items.map((issue, index) => {
        const selected = selectedItem?.number === issue.number;
        return (
          <QuietCard
            key={getItemKey(issue, index)}
            interactive
            selected={selected}
            className="nx-code-github-row p-2"
          >
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectItem(issue)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <PanelBadge tone={stateTone(issue.state)}>
                    #{issue.number || index + 1}
                  </PanelBadge>
                  <PanelBadge tone="muted">
                    {issue.comments || 0} comments
                  </PanelBadge>
                  {issue.locked ? <PanelBadge tone="warning">locked</PanelBadge> : null}
                </div>
                <h3 className="mt-1.5 break-words text-[13px] font-semibold leading-snug text-gray-100">
                  {issue.title || "Untitled issue"}
                </h3>
                <div className="mt-1 break-words text-[11px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                  {issue.state || "open"} by {getUserLogin(issue.author)} - {formatDate(issue.updatedAt)}
                </div>
              </button>
              {issue.htmlUrl ? (
                <a
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/[0.055] bg-black/[0.16] text-gray-500 hover:bg-white/[0.05] hover:text-gray-200"
                  title="Open on GitHub"
                >
                  <ArrowUpRight size={14} />
                </a>
              ) : null}
            </div>
            {issue.labels?.length ? (
              <div className="mt-2 flex min-w-0 flex-wrap gap-1">
                {issue.labels.slice(0, 8).map((label) => (
                  <span
                    key={label.id || label.name}
                    className="rounded border border-white/[0.045] bg-black/[0.14] px-1.5 py-0.5 text-[10px] text-gray-400"
                  >
                    {label.name || label}
                  </span>
                ))}
              </div>
            ) : null}
          </QuietCard>
        );
      })}
    </div>
  );
}

export function PullRequestList({ items, selectedItem, onSelectItem }) {
  return (
    <div className="grid gap-1.5 px-3 pb-3">
      {items.map((pull, index) => {
        const selected = selectedItem?.number === pull.number;
        const state = pull.draft ? "draft" : pull.merged ? "merged" : pull.state;
        return (
          <QuietCard
            key={getItemKey(pull, index)}
            interactive
            selected={selected}
            className="nx-code-github-row p-2"
          >
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectItem(pull)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <PanelBadge tone={stateTone(state)}>
                    #{pull.number || index + 1}
                  </PanelBadge>
                  <PanelBadge tone="muted">
                    {pull.changedFiles ?? 0} files
                  </PanelBadge>
                  <PanelBadge tone="muted">
                    {pull.commits ?? 0} commits
                  </PanelBadge>
                </div>
                <h3 className="mt-1.5 break-words text-[13px] font-semibold leading-snug text-gray-100">
                  {pull.title || "Untitled pull request"}
                </h3>
                <div className="mt-1 break-words text-[11px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                  {state || "open"} by {getUserLogin(pull.author)} - {formatDate(pull.updatedAt)}
                </div>
                <div className="mt-1.5 min-w-0 break-words rounded-md border border-white/[0.045] bg-black/[0.14] px-2 py-1 text-[10px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                  <span className="font-mono text-gray-400">{pull.head?.ref || "head"}</span>
                  <span> into </span>
                  <span className="font-mono text-gray-400">{pull.base?.ref || "base"}</span>
                </div>
              </button>
              {pull.htmlUrl ? (
                <a
                  href={pull.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/[0.055] bg-black/[0.16] text-gray-500 hover:bg-white/[0.05] hover:text-gray-200"
                  title="Open on GitHub"
                >
                  <ArrowUpRight size={14} />
                </a>
              ) : null}
            </div>
          </QuietCard>
        );
      })}
    </div>
  );
}

export function ProjectList({
  items,
  selectedProject,
  onSelectProject,
  onLoadProjectItems,
  loadingItems,
}) {
  return (
    <div className="grid gap-1.5 px-3 pb-3">
      {items.map((project, index) => {
        const selected = selectedProject?.id === project.id;
        return (
          <QuietCard
            key={getItemKey(project, index)}
            interactive
            selected={selected}
            className="nx-code-github-row p-2"
          >
            <div className="flex min-w-0 flex-wrap items-start gap-2">
              <button
                type="button"
                onClick={() => onSelectProject(project)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <PanelBadge tone={project.closed ? "danger" : "success"}>
                    {project.closed ? "closed" : "open"}
                  </PanelBadge>
                  {project.number ? (
                    <PanelBadge tone="muted">
                      #{project.number}
                    </PanelBadge>
                  ) : null}
                  {project.public ? <PanelBadge tone="muted">public</PanelBadge> : null}
                </div>
                <h3 className="mt-1.5 break-words text-[13px] font-semibold leading-snug text-gray-100">
                  {project.title || "Untitled project"}
                </h3>
                <div className="mt-1 break-words text-[11px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                  {project.owner?.login || "viewer"} - {formatDate(project.updatedAt)}
                </div>
                {project.shortDescription ? (
                  <p className="mt-2 break-words text-[11px] leading-snug text-gray-500">
                    {project.shortDescription}
                  </p>
                ) : null}
              </button>
              <div className="flex w-full shrink-0 justify-start gap-1 sm:w-auto sm:justify-end">
                <PanelIconButton
                  label="Load project items"
                  onClick={() => onLoadProjectItems(project)}
                  disabled={loadingItems}
                >
                  <RefreshCw className={loadingItems && selected ? "animate-spin" : ""} />
                </PanelIconButton>
                {project.url ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/[0.055] bg-black/[0.16] text-gray-500 hover:bg-white/[0.05] hover:text-gray-200"
                    title="Open on GitHub"
                  >
                    <ArrowUpRight size={14} />
                  </a>
                ) : null}
              </div>
            </div>
          </QuietCard>
        );
      })}
    </div>
  );
}

export function PanelList({
  panelId,
  definition,
  state,
  selectedItem,
  selectedProject,
  projectItemsState,
  setupRequirement,
  onSelectItem,
  onSelectProject,
  onLoadProjectItems,
  onRefresh,
}) {
  if (state.loading && !state.loaded) {
    return (
      <WorkbenchState
        icon={Loader2}
        spinning
        tone="accent"
        title={definition.loadingTitle}
        detail={definition.loadingDetail}
      />
    );
  }

  if (state.error) {
    return (
      <WorkbenchState
        icon={AlertCircle}
        tone="danger"
        title={definition.errorTitle}
        detail={state.error}
        actionLabel={definition.loadLabel}
        onAction={onRefresh}
      />
    );
  }

  if (setupRequirement) {
    return (
      <WorkbenchState
        icon={definition.icon}
        tone="muted"
        title={setupRequirement.title}
        detail={setupRequirement.detail}
        actionLabel={setupRequirement.actionLabel}
        onAction={onRefresh}
      />
    );
  }

  if (state.items.length === 0) {
    return (
      <WorkbenchState
        icon={CircleDot}
        tone="muted"
        title={definition.emptyTitle}
        detail={definition.emptyDetail}
        actionLabel={definition.loadLabel}
        onAction={onRefresh}
      />
    );
  }

  if (panelId === "issues") {
    return (
      <IssueList
        items={state.items}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
      />
    );
  }

  if (panelId === "prs") {
    return (
      <PullRequestList
        items={state.items}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
      />
    );
  }

  return (
    <ProjectList
      items={state.items}
      selectedProject={selectedProject}
      onSelectProject={onSelectProject}
      onLoadProjectItems={onLoadProjectItems}
      loadingItems={projectItemsState.loading}
    />
  );
}
