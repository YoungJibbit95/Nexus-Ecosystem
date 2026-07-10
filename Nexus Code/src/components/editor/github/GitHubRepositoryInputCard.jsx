import React from "react";
import { GitPullRequest, Pencil } from "lucide-react";
import { PanelIconButton } from "../panels/PanelChrome.jsx";
import { QuietCard, QuietInput, QuietSelect } from "./githubWorkbenchPrimitives.jsx";

export function RepositoryInputCard({
  panelId,
  definition,
  capability,
  capabilityStatus,
  repoDraft,
  onRepoDraftChange,
  stateFilter,
  onStateFilterChange,
  projectOwnerType,
  onProjectOwnerTypeChange,
  loading,
  onOpenGit,
  onOpenAccount,
}) {
  return (
    <QuietCard className="nx-code-github-repo-controls mx-3 mt-2 px-2.5 py-2">
      <div className="grid min-w-0 gap-2">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div className="min-w-0">
            <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
              {panelId === "projects" ? "Owner / repository" : "Repository"}
            </label>
            <QuietInput
              value={repoDraft}
              onChange={(event) => onRepoDraftChange(event.target.value)}
              placeholder={panelId === "projects" ? "owner or owner/repo" : "owner/repo"}
              title={definition.repoHelp}
            />
          </div>

          {panelId === "projects" ? (
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
                Scope
              </label>
              <QuietSelect
                value={projectOwnerType}
                onChange={(event) => onProjectOwnerTypeChange(event.target.value)}
              >
                <option value="viewer">Viewer</option>
                <option value="user">User</option>
                <option value="organization">Organization</option>
              </QuietSelect>
            </div>
          ) : (
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
                State
              </label>
              <QuietSelect
                value={stateFilter}
                onChange={(event) => onStateFilterChange(event.target.value)}
              >
                <option value="open">Open</option>
                <option value="all">All</option>
                <option value="closed">Closed</option>
              </QuietSelect>
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background: capability.available ? "#67e8f9" : "#f87171",
              }}
            />
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
              {loading ? "Refreshing" : capabilityStatus.label}
            </span>
            <span className="text-gray-700">/</span>
            <span>
              {capability.missingMethods?.length
                ? `${capability.missingMethods.length} missing`
                : `${capability.methods.length} methods`}
            </span>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1">
            <PanelIconButton
              label="Open Git panel"
              onClick={onOpenGit}
              disabled={!onOpenGit}
              className="!h-7 !w-7"
            >
              <GitPullRequest />
            </PanelIconButton>
            <PanelIconButton
              label="Open account panel"
              onClick={onOpenAccount}
              disabled={!onOpenAccount}
              className="!h-7 !w-7"
            >
              <Pencil />
            </PanelIconButton>
          </div>
        </div>
      </div>
    </QuietCard>
  );
}
