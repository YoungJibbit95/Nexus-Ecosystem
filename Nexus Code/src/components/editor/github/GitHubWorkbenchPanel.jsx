import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  GitMerge,
  GitPullRequest,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelCard,
  PanelHeader,
  PanelIconButton,
  PanelInput,
  PanelNotice,
  PanelSection,
  PanelSelect,
  PanelShell,
  PanelState,
} from "../panels/PanelChrome.jsx";
import {
  addGithubProjectV2Item,
  createGithubIssue,
  createGithubPullRequest,
  getGithubPlatformCapability,
  loadGithubIssues,
  loadGithubProjectV2,
  loadGithubProjectV2Items,
  loadGithubProjectsV2,
  loadGithubPullRequests,
  mergeGithubPullRequest,
  updateGithubIssue,
  updateGithubProjectV2ItemField,
  updateGithubPullRequest,
  updateGithubPullRequestBranch,
} from "../../../pages/editor/githubWorkbenchModel.js";

const PANEL_DEFINITIONS = {
  issues: {
    title: "GitHub Issues",
    subtitle: "Triage, create, and edit repository issues.",
    icon: CircleDot,
    itemName: "issue",
    loadLabel: "Refresh issues",
    loadingTitle: "Loading issues",
    loadingDetail: "Reading open issues through the Electron GitHub bridge.",
    emptyTitle: "No issues found",
    emptyDetail: "Create the first issue here or switch the filter to all states.",
    errorTitle: "Issues could not be loaded",
    repoHelp: "Issues need a repository in owner/repo format.",
  },
  prs: {
    title: "Pull Requests",
    subtitle: "Inspect, create, and update pull requests.",
    icon: GitPullRequest,
    itemName: "pull request",
    loadLabel: "Refresh PRs",
    loadingTitle: "Loading pull requests",
    loadingDetail: "Reading pull requests from the selected repository.",
    emptyTitle: "No pull requests found",
    emptyDetail: "Open a branch PR from this panel or switch the filter.",
    errorTitle: "Pull requests could not be loaded",
    repoHelp: "Pull requests need a repository in owner/repo format.",
  },
  projects: {
    title: "GitHub Projects",
    subtitle: "Browse Projects v2 and prepare item or field actions.",
    icon: FolderKanban,
    itemName: "project",
    loadLabel: "Refresh projects",
    loadingTitle: "Loading projects",
    loadingDetail: "Reading Projects v2 for the selected account or organization.",
    emptyTitle: "No projects found",
    emptyDetail: "Try viewer scope, another owner, or an organization owner type.",
    errorTitle: "Projects could not be loaded",
    repoHelp: "Projects use the owner part; owner/repo input is accepted.",
  },
};

const EMPTY_LIST_STATE = {
  items: [],
  loading: false,
  error: "",
  loaded: false,
  owner: null,
  pageInfo: null,
};

const EMPTY_PROJECT_ITEMS_STATE = {
  items: [],
  loading: false,
  error: "",
  loaded: false,
  pageInfo: null,
};

const DEFAULT_ISSUE_CREATE = {
  title: "",
  body: "",
  labels: "",
  assignees: "",
};

const DEFAULT_ISSUE_EDIT = {
  number: "",
  title: "",
  body: "",
  state: "open",
};

const DEFAULT_PULL_CREATE = {
  title: "",
  head: "",
  base: "main",
  body: "",
  draft: false,
};

const DEFAULT_PULL_EDIT = {
  number: "",
  title: "",
  body: "",
  state: "open",
  base: "",
};

const DEFAULT_PULL_SAFETY = {
  expectedHeadSha: "",
  mergeMethod: "merge",
  commitTitle: "",
  commitMessage: "",
};

const DEFAULT_PROJECT_ACTION = {
  contentId: "",
  itemId: "",
  fieldId: "",
  valueType: "text",
  value: "",
};

const TEXTAREA_CLASS =
  "min-h-[74px] w-full min-w-0 resize-y rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[12px] leading-snug text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-purple-300/40 focus:bg-white/[0.052] focus:ring-2 focus:ring-purple-400/10 disabled:cursor-not-allowed disabled:opacity-45";

function getWorkspaceRepositoryGuess(workspacePath) {
  if (!workspacePath) {
    return { owner: "", repo: "", label: "" };
  }

  const parts = String(workspacePath).split(/[\\/]/).filter(Boolean);
  const repo = parts[parts.length - 1] || "";
  const owner = parts[parts.length - 2] || "";
  return {
    owner,
    repo,
    label: owner && repo ? `${owner}/${repo}` : repo,
  };
}

function normalizeRepositoryInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return { owner: "", repo: "", label: "" };

  const cleaned = raw
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "");
  const [owner = "", repo = ""] = cleaned.split("/").map((part) => part.trim()).filter(Boolean);
  return {
    owner,
    repo,
    label: owner && repo ? `${owner}/${repo}` : raw,
  };
}

function getProjectOwnerDraft(repoDraft, accountSession) {
  const parsed = normalizeRepositoryInput(repoDraft);
  return parsed.owner || String(repoDraft || "").trim() || accountSession?.username || "";
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.nodes)) return value.nodes;
  return [];
}

function extractPanelItems(panelId, result) {
  if (panelId === "issues") {
    return toArray(result?.issues || result?.items || result);
  }
  if (panelId === "prs") {
    return toArray(result?.pullRequests || result?.pulls || result?.items || result);
  }
  return toArray(result?.projects || result?.items || result?.nodes || result);
}

function parseCsvList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  return date.toLocaleString();
}

function getUserLogin(user) {
  return user?.login || user?.name || "github";
}

function getItemKey(item, fallback) {
  return item?.nodeId || item?.node_id || item?.id || item?.url || fallback;
}

function stateTone(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "open") return "success";
  if (normalized === "closed" || normalized === "merged") return "danger";
  if (normalized === "draft") return "warning";
  return "muted";
}

function getRepoError(repoRef) {
  if (!repoRef.owner || !repoRef.repo) {
    return "Enter a repository as owner/repo before refreshing or updating GitHub data.";
  }
  return "";
}

function getRawGithubErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return (
    error.message ||
    error.error ||
    error.details?.message ||
    error.details?.error ||
    error.details?.response?.message ||
    ""
  );
}

function getGithubErrorStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.details?.status,
    error?.details?.statusCode,
    error?.details?.response?.status,
  ];
  const explicitStatus = candidates
    .map((value) => Number(value))
    .find((value) => Number.isInteger(value) && value >= 100);
  if (explicitStatus) return explicitStatus;

  const messageStatus = getRawGithubErrorMessage(error).match(/\b(401|403|404|422|429)\b/);
  return messageStatus ? Number(messageStatus[1]) : null;
}

function formatGithubWorkbenchError(error, fallback = "GitHub request failed.") {
  const rawMessage = getRawGithubErrorMessage(error);
  const lowerMessage = rawMessage.toLowerCase();
  const status = getGithubErrorStatus(error);
  const details = error?.details || {};
  const missingScopes = details.scopes?.missingScopes || [];
  const resetAt = details.rateLimit?.resetAt ? formatDate(details.rateLimit.resetAt) : "";
  const validation = Array.isArray(details.errors)
    ? details.errors
      .map((entry) => entry?.message || entry?.code || "")
      .filter(Boolean)
      .slice(0, 3)
      .join("; ")
    : "";
  const hint = details.hint && !rawMessage.includes(details.hint) ? ` ${details.hint}` : "";
  const detail = rawMessage ? ` GitHub said: ${rawMessage}` : "";
  const docs = details.documentationUrl ? ` Docs: ${details.documentationUrl}` : "";

  if (lowerMessage.includes("bridge is not available")) {
    return "GitHub bridge is not available in this runtime. Open Nexus Code in the desktop runtime, reconnect the GitHub account, then refresh.";
  }

  if (lowerMessage.includes("does not expose")) {
    return "This Nexus runtime does not expose the required GitHub API method yet. Switch to the desktop runtime or update Nexus Code before retrying.";
  }

  if (
    status === 401 ||
    lowerMessage.includes("bad credentials") ||
    lowerMessage.includes("requires authentication") ||
    lowerMessage.includes("unauthorized")
  ) {
    return `GitHub authentication is missing or expired (401). Open the account panel, reconnect GitHub, then refresh.${detail}`;
  }

  if (
    details.code === "GITHUB_RATE_LIMITED" ||
    details.rateLimit?.remaining === 0 ||
    status === 429 ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("secondary rate") ||
    lowerMessage.includes("abuse detection")
  ) {
    const reset = resetAt ? ` Reset: ${resetAt}.` : "";
    return `GitHub rate limit was reached. Wait for the limit to reset, then refresh; using a signed-in token with more quota can help.${reset}${hint}${detail}${docs}`;
  }

  if (
    details.code === "GITHUB_SCOPE_REQUIRED" ||
    missingScopes.length > 0 ||
    lowerMessage.includes("resource not accessible") ||
    lowerMessage.includes("insufficient") ||
    lowerMessage.includes("scope") ||
    lowerMessage.includes("permission")
  ) {
    const scopeText = missingScopes.length ? ` Missing scopes: ${missingScopes.join(", ")}.` : "";
    return `GitHub denied access for this token. Check repository access, Projects v2 scopes, and organization SSO approval before retrying.${scopeText}${hint}${detail}${docs}`;
  }

  if (status === 403) {
    return `GitHub rejected the request (403). The token may be missing repository, pull request, or Projects v2 access, or organization SSO may need approval.${hint}${detail}${docs}`;
  }

  if (status === 404) {
    return `GitHub could not find this repository, project, issue, or pull request (404), or the current token cannot access it.${hint}${detail}${docs}`;
  }

  if (status === 422) {
    const validationText = validation ? ` Validation: ${validation}.` : "";
    return `GitHub rejected the submitted data (422). Check branch names, required fields, duplicate project items, and selected IDs.${validationText}${hint}${detail}${docs}`;
  }

  return rawMessage ? `${fallback} ${rawMessage}${hint}${docs}` : `${fallback}${hint}`;
}

function needsCloseConfirmation(item, nextState) {
  const currentState = String(item?.state || "open").toLowerCase();
  return Boolean(item) && currentState !== "closed" && String(nextState || "").toLowerCase() === "closed";
}

function getResultItem(result, key) {
  return result?.[key] || result?.data?.[key] || result;
}

function getSetupRequirement({
  panelId,
  draftRepoRef,
  appliedRepoRef,
  projectOwnerType,
  draftProjectOwner,
  appliedProjectOwner,
}) {
  if (panelId !== "projects") {
    if (!draftRepoRef.owner || !draftRepoRef.repo) {
      return {
        title: "Choose a repository",
        detail: "Enter a GitHub repository as owner/repo, then refresh this panel.",
        actionLabel: "Refresh",
      };
    }
    if (draftRepoRef.label !== appliedRepoRef.label) {
      return {
        title: "Repository change is pending",
        detail: `Refresh to load ${draftRepoRef.label}.`,
        actionLabel: "Load repository",
      };
    }
  }

  if (panelId === "projects" && projectOwnerType !== "viewer") {
    if (!draftProjectOwner) {
      return {
        title: "Choose a project owner",
        detail: "Enter a user or organization owner for Projects v2, or switch scope back to Viewer.",
        actionLabel: "Refresh",
      };
    }
    if (draftProjectOwner !== appliedProjectOwner) {
      return {
        title: "Project owner change is pending",
        detail: `Refresh to load Projects v2 for ${draftProjectOwner}.`,
        actionLabel: "Load owner",
      };
    }
  }

  return null;
}

function buildProjectFieldValue(type, rawValue) {
  if (type === "number") return { number: rawValue };
  if (type === "date") return { date: rawValue };
  if (type === "singleSelectOptionId") return { singleSelectOptionId: rawValue };
  if (type === "iterationId") return { iterationId: rawValue };
  return { text: rawValue };
}

function pickProjectFieldValueType(field) {
  const dataType = String(field?.dataType || "").toUpperCase();
  if (dataType === "NUMBER") return "number";
  if (dataType === "DATE") return "date";
  if (dataType === "SINGLE_SELECT") return "singleSelectOptionId";
  if (dataType === "ITERATION") return "iterationId";
  return "text";
}

function PanelTextarea({ value, onChange, placeholder, rows = 4, disabled = false }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={TEXTAREA_CLASS}
      style={{ overflowWrap: "anywhere" }}
    />
  );
}

function ConfirmationNotice({
  active,
  title,
  detail,
  confirmLabel,
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!active) return null;

  return (
    <PanelNotice
      className="mt-2"
      tone={tone}
      icon={ShieldAlert}
      title={title}
      detail={detail}
    >
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <PanelActionButton
          type="button"
          tone={tone}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working..." : confirmLabel}
        </PanelActionButton>
        <PanelActionButton
          type="button"
          tone="muted"
          icon={X}
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </PanelActionButton>
      </div>
    </PanelNotice>
  );
}

function RepositoryControls({
  panelId,
  definition,
  capability,
  repoDraft,
  onRepoDraftChange,
  stateFilter,
  onStateFilterChange,
  projectOwnerType,
  onProjectOwnerTypeChange,
  loading,
  onRefresh,
  onOpenGit,
  onOpenAccount,
}) {
  return (
    <PanelCard className="mx-3 mt-3 p-3">
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <div className="min-w-0 flex-[1_1_13rem]">
          <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
            {panelId === "projects" ? "Owner / repository" : "Repository"}
          </label>
          <PanelInput
            value={repoDraft}
            onChange={(event) => onRepoDraftChange(event.target.value)}
            placeholder={panelId === "projects" ? "owner or owner/repo" : "owner/repo"}
          />
          <p className="mt-1 text-[10px] leading-snug text-gray-600">
            {definition.repoHelp}
          </p>
        </div>

        {panelId === "projects" ? (
          <div className="w-full min-w-[9rem] sm:w-36">
            <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
              Scope
            </label>
            <PanelSelect
              value={projectOwnerType}
              onChange={(event) => onProjectOwnerTypeChange(event.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="user">User</option>
              <option value="organization">Organization</option>
            </PanelSelect>
          </div>
        ) : (
          <div className="w-full min-w-[8rem] sm:w-32">
            <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
              State
            </label>
            <PanelSelect
              value={stateFilter}
              onChange={(event) => onStateFilterChange(event.target.value)}
            >
              <option value="open">Open</option>
              <option value="all">All</option>
              <option value="closed">Closed</option>
            </PanelSelect>
          </div>
        )}

        <div className="flex w-full min-w-0 flex-wrap items-end justify-start gap-1 sm:w-auto sm:justify-end">
          <PanelIconButton
            label={loading ? "Refreshing GitHub data" : definition.loadLabel}
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </PanelIconButton>
          <PanelIconButton
            label="Open Git panel"
            onClick={onOpenGit}
            disabled={!onOpenGit}
          >
            <GitPullRequest />
          </PanelIconButton>
          <PanelIconButton
            label="Open account panel"
            onClick={onOpenAccount}
            disabled={!onOpenAccount}
          >
            <Pencil />
          </PanelIconButton>
        </div>
      </div>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
        <PanelBadge tone={capability.available ? "success" : "danger"}>
          {capability.available ? capability.label : "Bridge offline"}
        </PanelBadge>
        <PanelBadge tone="muted">
          {capability.methods.length} methods
        </PanelBadge>
      </div>
    </PanelCard>
  );
}

function IssueActions({
  items,
  selectedItem,
  onSelectItem,
  createDraft,
  onCreateDraftChange,
  editDraft,
  onEditDraftChange,
  busy,
  onCreate,
  onUpdate,
  confirmAction,
  onRequestConfirm,
  onConfirmCancel,
}) {
  const createDisabled = Boolean(busy) || !createDraft.title.trim();
  const closeRequiresConfirm = needsCloseConfirmation(selectedItem, editDraft.state);
  const updateConfirmActive = confirmAction === "issue-update";
  const updateBusy = busy === "issue-update";
  const updateDisabled = Boolean(busy) || !selectedItem;
  const issueLabel = editDraft.number ? `#${editDraft.number}` : "the selected issue";

  return (
    <PanelSection title="Issue actions" icon={Plus} expanded>
      <div className="mx-3 grid gap-3 pb-3">
        <PanelCard className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-green-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Create issue
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onCreate}>
            <PanelInput
              value={createDraft.title}
              onChange={(event) => onCreateDraftChange({ ...createDraft, title: event.target.value })}
              placeholder="Issue title"
            />
            <PanelTextarea
              value={createDraft.body}
              onChange={(event) => onCreateDraftChange({ ...createDraft, body: event.target.value })}
              placeholder="Issue body"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <PanelInput
                value={createDraft.labels}
                onChange={(event) => onCreateDraftChange({ ...createDraft, labels: event.target.value })}
                placeholder="labels, comma separated"
              />
              <PanelInput
                value={createDraft.assignees}
                onChange={(event) => onCreateDraftChange({ ...createDraft, assignees: event.target.value })}
                placeholder="assignees, comma separated"
              />
            </div>
            <PanelActionButton
              type="submit"
              icon={Plus}
              tone="success"
              disabled={createDisabled}
              className="w-full sm:w-auto"
            >
              {busy === "issue-create" ? "Creating..." : "Create issue"}
            </PanelActionButton>
          </form>
        </PanelCard>

        <PanelCard className="p-3">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-purple-300" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Update selected issue
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <div className="mb-2">
            <PanelSelect
              value={editDraft.number}
              disabled={Boolean(busy)}
              onChange={(event) => {
                const next = items.find((item) => String(item.number) === event.target.value);
                onSelectItem(next || null);
              }}
            >
              <option value="">Select issue</option>
              {items.map((item, index) => (
                <option key={getItemKey(item, index)} value={item.number || ""}>
                  #{item.number} {item.title}
                </option>
              ))}
            </PanelSelect>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "issue-update", onUpdate)}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <PanelInput
                value={editDraft.title}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                placeholder={selectedItem ? "Issue title" : "Select an issue first"}
                disabled={!selectedItem || Boolean(busy)}
              />
              <PanelSelect
                value={editDraft.state}
                onChange={(event) => onEditDraftChange({ ...editDraft, state: event.target.value })}
                disabled={!selectedItem || Boolean(busy)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </PanelSelect>
            </div>
            <PanelTextarea
              value={editDraft.body}
              onChange={(event) => onEditDraftChange({ ...editDraft, body: event.target.value })}
              placeholder="Issue body"
              disabled={!selectedItem || Boolean(busy)}
            />
            <ConfirmationNotice
              active={updateConfirmActive}
              tone={closeRequiresConfirm ? "danger" : "warning"}
              title={closeRequiresConfirm ? "Confirm issue close" : "Confirm issue update"}
              detail={`This will update ${issueLabel}. Review the title, body, and state before sending it to GitHub.`}
              confirmLabel={closeRequiresConfirm ? "Close issue now" : "Update issue now"}
              busy={updateBusy}
              onConfirm={onUpdate}
              onCancel={onConfirmCancel}
            />
            <PanelActionButton
              type="submit"
              icon={Pencil}
              tone={closeRequiresConfirm ? "danger" : "accent"}
              disabled={updateDisabled}
              className="w-full sm:w-auto"
            >
              {updateBusy
                ? "Updating..."
                : updateConfirmActive
                  ? "Confirm below"
                  : closeRequiresConfirm
                    ? "Review close"
                    : "Review issue update"}
            </PanelActionButton>
          </form>
        </PanelCard>
      </div>
    </PanelSection>
  );
}

function PullRequestActions({
  items,
  selectedItem,
  onSelectItem,
  createDraft,
  onCreateDraftChange,
  editDraft,
  onEditDraftChange,
  safetyDraft,
  onSafetyDraftChange,
  busy,
  onCreate,
  onUpdate,
  onUpdateBranch,
  onMerge,
  confirmAction,
  onRequestConfirm,
  onConfirmCancel,
}) {
  const createDisabled = Boolean(busy) ||
    !createDraft.title.trim() ||
    !createDraft.head.trim() ||
    !createDraft.base.trim();
  const closeRequiresConfirm = needsCloseConfirmation(selectedItem, editDraft.state);
  const selectedPullLabel = editDraft.number ? `#${editDraft.number}` : "the selected pull request";
  const updateConfirmActive = confirmAction === "pull-update";
  const updateBusy = busy === "pull-update";
  const branchConfirmActive = confirmAction === "pull-update-branch";
  const branchBusy = busy === "pull-update-branch";
  const mergeConfirmActive = confirmAction === "pull-merge";
  const mergeBusy = busy === "pull-merge";
  const updateDisabled = Boolean(busy) || !selectedItem;
  const selectedPullClosed =
    String(selectedItem?.state || "").toLowerCase() === "closed" || Boolean(selectedItem?.merged);
  const safetyDisabled = Boolean(busy) || !selectedItem || selectedPullClosed;

  return (
    <PanelSection title="Pull request actions" icon={GitPullRequest} expanded>
      <div className="mx-3 grid gap-3 pb-3">
        <PanelCard className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-green-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Create pull request
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onCreate}>
            <PanelInput
              value={createDraft.title}
              onChange={(event) => onCreateDraftChange({ ...createDraft, title: event.target.value })}
              placeholder="Pull request title"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <PanelInput
                value={createDraft.head}
                onChange={(event) => onCreateDraftChange({ ...createDraft, head: event.target.value })}
                placeholder="head branch, e.g. feature/foo"
              />
              <PanelInput
                value={createDraft.base}
                onChange={(event) => onCreateDraftChange({ ...createDraft, base: event.target.value })}
                placeholder="base branch"
              />
            </div>
            <PanelTextarea
              value={createDraft.body}
              onChange={(event) => onCreateDraftChange({ ...createDraft, body: event.target.value })}
              placeholder="Pull request body"
            />
            <label className="flex items-center gap-2 text-[11px] text-gray-400">
              <input
                type="checkbox"
                checked={createDraft.draft}
                onChange={(event) => onCreateDraftChange({ ...createDraft, draft: event.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-black/30"
              />
              Open as draft
            </label>
            <PanelActionButton
              type="submit"
              icon={Plus}
              tone="success"
              disabled={createDisabled}
              className="w-full sm:w-auto"
            >
              {busy === "pull-create" ? "Creating..." : "Create pull request"}
            </PanelActionButton>
          </form>
        </PanelCard>

        <PanelCard className="p-3">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-purple-300" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Edit selected pull request
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <div className="mb-2">
            <PanelSelect
              value={editDraft.number}
              disabled={Boolean(busy)}
              onChange={(event) => {
                const next = items.find((item) => String(item.number) === event.target.value);
                onSelectItem(next || null);
              }}
            >
              <option value="">Select pull request</option>
              {items.map((item, index) => (
                <option key={getItemKey(item, index)} value={item.number || ""}>
                  #{item.number} {item.title}
                </option>
              ))}
            </PanelSelect>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "pull-update", onUpdate)}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <PanelInput
                value={editDraft.title}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                placeholder={selectedItem ? "Pull request title" : "Select a pull request first"}
                disabled={!selectedItem || Boolean(busy)}
              />
              <PanelSelect
                value={editDraft.state}
                onChange={(event) => onEditDraftChange({ ...editDraft, state: event.target.value })}
                disabled={!selectedItem || Boolean(busy)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </PanelSelect>
            </div>
            <PanelInput
              value={editDraft.base}
              onChange={(event) => onEditDraftChange({ ...editDraft, base: event.target.value })}
              placeholder="optional new base branch"
              disabled={!selectedItem || Boolean(busy)}
            />
            <PanelTextarea
              value={editDraft.body}
              onChange={(event) => onEditDraftChange({ ...editDraft, body: event.target.value })}
              placeholder="Pull request body"
              disabled={!selectedItem || Boolean(busy)}
            />
            <ConfirmationNotice
              active={updateConfirmActive}
              tone={closeRequiresConfirm ? "danger" : "warning"}
              title={closeRequiresConfirm ? "Confirm pull request close" : "Confirm pull request update"}
              detail={`This will update ${selectedPullLabel}. Review title, body, state, and base before sending it to GitHub.`}
              confirmLabel={closeRequiresConfirm ? "Close pull request now" : "Update pull request now"}
              busy={updateBusy}
              onConfirm={onUpdate}
              onCancel={onConfirmCancel}
            />
            <PanelActionButton
              type="submit"
              icon={Pencil}
              tone={closeRequiresConfirm ? "danger" : "accent"}
              disabled={updateDisabled}
              className="w-full sm:w-auto"
            >
              {updateBusy
                ? "Updating..."
                : updateConfirmActive
                  ? "Confirm below"
                  : closeRequiresConfirm
                    ? "Review close"
                    : "Review pull request update"}
            </PanelActionButton>
          </form>
        </PanelCard>

        <PanelCard className="p-3">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <ShieldAlert size={13} className="shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Merge and branch safety
            </div>
            <PanelBadge tone={selectedItem ? "accent" : "muted"}>
              {selectedItem ? selectedPullLabel : "select PR"}
            </PanelBadge>
          </div>
          <div className="grid gap-3">
            <form
              className="grid gap-2 rounded-xl border border-white/[0.06] bg-black/15 p-2.5"
              onSubmit={(event) => onRequestConfirm(event, "pull-update-branch", onUpdateBranch)}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <RefreshCw size={13} className="shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1 text-[11px] font-semibold text-gray-300">
                  Update branch from base
                </div>
              </div>
              <PanelInput
                value={safetyDraft.expectedHeadSha}
                onChange={(event) =>
                  onSafetyDraftChange({ ...safetyDraft, expectedHeadSha: event.target.value })
                }
                placeholder={selectedItem?.head?.sha || "optional expected head SHA"}
                disabled={safetyDisabled}
              />
              <ConfirmationNotice
                active={branchConfirmActive}
                tone="warning"
                title="Confirm branch update"
                detail={`GitHub will update ${selectedPullLabel} from its base branch. Use the expected SHA field when you want to guard against a moving head.`}
                confirmLabel="Update branch now"
                busy={branchBusy}
                onConfirm={onUpdateBranch}
                onCancel={onConfirmCancel}
              />
              <PanelActionButton
                type="submit"
                icon={RefreshCw}
                tone="warning"
                disabled={safetyDisabled}
                className="w-full sm:w-auto"
              >
                {branchBusy ? "Updating branch..." : branchConfirmActive ? "Confirm below" : "Review branch update"}
              </PanelActionButton>
            </form>

            <form
              className="grid gap-2 rounded-xl border border-red-400/15 bg-red-500/[0.035] p-2.5"
              onSubmit={(event) => onRequestConfirm(event, "pull-merge", onMerge)}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <GitMerge size={13} className="shrink-0 text-red-300" />
                <div className="min-w-0 flex-1 text-[11px] font-semibold text-gray-300">
                  Merge pull request
                </div>
                <PanelBadge tone="danger">destructive</PanelBadge>
              </div>
              <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                <PanelSelect
                  value={safetyDraft.mergeMethod}
                  onChange={(event) =>
                    onSafetyDraftChange({ ...safetyDraft, mergeMethod: event.target.value })
                  }
                  disabled={safetyDisabled}
                >
                  <option value="merge">Merge commit</option>
                  <option value="squash">Squash</option>
                  <option value="rebase">Rebase</option>
                </PanelSelect>
                <PanelInput
                  value={safetyDraft.commitTitle}
                  onChange={(event) =>
                    onSafetyDraftChange({ ...safetyDraft, commitTitle: event.target.value })
                  }
                  placeholder="optional commit title"
                  disabled={safetyDisabled}
                />
              </div>
              <PanelTextarea
                value={safetyDraft.commitMessage}
                onChange={(event) =>
                  onSafetyDraftChange({ ...safetyDraft, commitMessage: event.target.value })
                }
                placeholder="optional merge commit message"
                rows={3}
                disabled={safetyDisabled}
              />
              <ConfirmationNotice
                active={mergeConfirmActive}
                tone="danger"
                title="Confirm merge"
                detail={`This will merge ${selectedPullLabel} using ${safetyDraft.mergeMethod}. Make sure checks and review requirements are satisfied.`}
                confirmLabel="Merge pull request now"
                busy={mergeBusy}
                onConfirm={onMerge}
                onCancel={onConfirmCancel}
              />
              <PanelActionButton
                type="submit"
                icon={GitMerge}
                tone="danger"
                disabled={safetyDisabled}
                className="w-full sm:w-auto"
              >
                {mergeBusy ? "Merging..." : mergeConfirmActive ? "Confirm below" : "Review merge"}
              </PanelActionButton>
            </form>
          </div>
        </PanelCard>
      </div>
    </PanelSection>
  );
}

function ProjectActions({
  selectedProject,
  projectItems,
  projectItemsState,
  actionDraft,
  onActionDraftChange,
  busy,
  onLoadItems,
  onAddItem,
  onUpdateField,
  confirmAction,
  onRequestConfirm,
  onConfirmCancel,
}) {
  const fields = selectedProject?.fields || [];
  const selectedField = fields.find((field) => field.id === actionDraft.fieldId);
  const fieldConfirmActive = confirmAction === "project-update-field";
  const fieldBusy = busy === "project-update-field";

  return (
    <PanelSection title="Project actions" icon={FolderKanban} expanded>
      <div className="mx-3 grid gap-3 pb-3">
        <PanelCard className="p-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="break-words text-xs font-semibold text-gray-200" style={{ overflowWrap: "anywhere" }}>
                {selectedProject ? selectedProject.title : "Select a project"}
              </div>
              <div className="mt-1 break-words font-mono text-[10px] text-gray-600">
                {selectedProject?.id || "Project ID appears here after selection."}
              </div>
            </div>
            <PanelActionButton
              icon={RefreshCw}
              disabled={!selectedProject || projectItemsState.loading}
              onClick={() => onLoadItems(selectedProject)}
              className="w-full sm:w-auto"
            >
              {projectItemsState.loading ? "Loading..." : "Load items"}
            </PanelActionButton>
          </div>

          {projectItemsState.error ? (
            <PanelNotice
              className="mt-3"
              tone="danger"
              title="Project items failed"
              detail={projectItemsState.error}
            />
          ) : null}

          {projectItemsState.loaded ? (
            <div className="mt-3 grid gap-1.5">
              {projectItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.08] px-3 py-3 text-[11px] text-gray-600">
                  No items returned for this project.
                </div>
              ) : (
                projectItems.slice(0, 8).map((item, index) => (
                  <div
                    key={getItemKey(item, index)}
                    className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <PanelBadge tone="muted">
                        {item.content?.type || item.type || "Item"}
                      </PanelBadge>
                      <div className="min-w-0 flex-1 break-words text-[11px] font-semibold text-gray-300" style={{ overflowWrap: "anywhere" }}>
                        {item.content?.title || item.id}
                      </div>
                    </div>
                    <div className="mt-1 break-words font-mono text-[10px] text-gray-600">
                      {item.id}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-green-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Add issue or PR by node ID
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onAddItem}>
            <PanelInput
              value={actionDraft.contentId}
              onChange={(event) => onActionDraftChange({ ...actionDraft, contentId: event.target.value })}
              placeholder="Content node ID"
              disabled={!selectedProject || Boolean(busy)}
            />
            <PanelActionButton
              type="submit"
              icon={Plus}
              tone="success"
              disabled={Boolean(busy) || !selectedProject || !actionDraft.contentId.trim()}
              className="w-full sm:w-auto"
            >
              {busy === "project-add-item" ? "Adding..." : "Add item"}
            </PanelActionButton>
          </form>
        </PanelCard>

        <PanelCard className="p-3">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-purple-300" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Update item field
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "project-update-field", onUpdateField)}
          >
            <PanelInput
              value={actionDraft.itemId}
              onChange={(event) => onActionDraftChange({ ...actionDraft, itemId: event.target.value })}
              placeholder="Project item ID"
              disabled={!selectedProject || Boolean(busy)}
            />
            {fields.length > 0 ? (
              <PanelSelect
                value={actionDraft.fieldId}
                onChange={(event) => {
                  const field = fields.find((candidate) => candidate.id === event.target.value);
                  onActionDraftChange({
                    ...actionDraft,
                    fieldId: event.target.value,
                    valueType: pickProjectFieldValueType(field),
                  });
                }}
                disabled={!selectedProject || Boolean(busy)}
              >
                <option value="">Select field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} ({field.dataType || "field"})
                  </option>
                ))}
              </PanelSelect>
            ) : (
              <PanelInput
                value={actionDraft.fieldId}
                onChange={(event) => onActionDraftChange({ ...actionDraft, fieldId: event.target.value })}
                placeholder="Field ID"
                disabled={!selectedProject || Boolean(busy)}
              />
            )}
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <PanelSelect
                value={actionDraft.valueType}
                onChange={(event) => onActionDraftChange({ ...actionDraft, valueType: event.target.value })}
                disabled={!selectedProject || Boolean(busy)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="singleSelectOptionId">Single select option</option>
                <option value="iterationId">Iteration</option>
              </PanelSelect>
              <PanelInput
                value={actionDraft.value}
                onChange={(event) => onActionDraftChange({ ...actionDraft, value: event.target.value })}
                placeholder={
                  selectedField?.options?.length
                    ? "Option ID, text, number, or YYYY-MM-DD"
                    : "Field value"
                }
                disabled={!selectedProject || Boolean(busy)}
              />
            </div>
            {selectedField?.options?.length ? (
              <div className="flex min-w-0 flex-wrap gap-1">
                {selectedField.options.slice(0, 8).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      onActionDraftChange({
                        ...actionDraft,
                        valueType: "singleSelectOptionId",
                        value: option.id,
                      })
                    }
                    className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[10px] text-gray-400 hover:bg-white/[0.07] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : null}
            <ConfirmationNotice
              active={fieldConfirmActive}
              tone="warning"
              title="Confirm project field update"
              detail={`This will update ${actionDraft.fieldId || "the selected field"} on project item ${actionDraft.itemId || "the selected item"}. Verify the item ID, field, and value before sending it to GitHub.`}
              confirmLabel="Update field now"
              busy={fieldBusy}
              onConfirm={onUpdateField}
              onCancel={onConfirmCancel}
            />
            <PanelActionButton
              type="submit"
              icon={Pencil}
              tone="accent"
              disabled={
                Boolean(busy) ||
                !selectedProject ||
                !actionDraft.itemId.trim() ||
                !actionDraft.fieldId.trim() ||
                !actionDraft.value.trim()
              }
              className="w-full sm:w-auto"
            >
              {fieldBusy ? "Updating..." : fieldConfirmActive ? "Confirm below" : "Review field update"}
            </PanelActionButton>
          </form>
        </PanelCard>
      </div>
    </PanelSection>
  );
}

function IssueList({ items, selectedItem, onSelectItem }) {
  return (
    <div className="grid gap-2 px-3 pb-3">
      {items.map((issue, index) => {
        const selected = selectedItem?.number === issue.number;
        return (
          <PanelCard
            key={getItemKey(issue, index)}
            interactive
            className={`p-3 ${selected ? "ring-1 ring-purple-300/35" : ""}`}
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
                <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-gray-100">
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
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-gray-500 hover:bg-white/[0.08] hover:text-gray-200"
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
                    className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-0.5 text-[10px] text-gray-400"
                  >
                    {label.name || label}
                  </span>
                ))}
              </div>
            ) : null}
          </PanelCard>
        );
      })}
    </div>
  );
}

function PullRequestList({ items, selectedItem, onSelectItem }) {
  return (
    <div className="grid gap-2 px-3 pb-3">
      {items.map((pull, index) => {
        const selected = selectedItem?.number === pull.number;
        const state = pull.draft ? "draft" : pull.merged ? "merged" : pull.state;
        return (
          <PanelCard
            key={getItemKey(pull, index)}
            interactive
            className={`p-3 ${selected ? "ring-1 ring-purple-300/35" : ""}`}
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
                <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-gray-100">
                  {pull.title || "Untitled pull request"}
                </h3>
                <div className="mt-1 break-words text-[11px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
                  {state || "open"} by {getUserLogin(pull.author)} - {formatDate(pull.updatedAt)}
                </div>
                <div className="mt-2 min-w-0 break-words rounded-xl border border-white/[0.055] bg-black/15 px-2 py-1 text-[10px] text-gray-500" style={{ overflowWrap: "anywhere" }}>
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
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-gray-500 hover:bg-white/[0.08] hover:text-gray-200"
                  title="Open on GitHub"
                >
                  <ArrowUpRight size={14} />
                </a>
              ) : null}
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}

function ProjectList({
  items,
  selectedProject,
  onSelectProject,
  onLoadProjectItems,
  loadingItems,
}) {
  return (
    <div className="grid gap-2 px-3 pb-3">
      {items.map((project, index) => {
        const selected = selectedProject?.id === project.id;
        return (
          <PanelCard
            key={getItemKey(project, index)}
            interactive
            className={`p-3 ${selected ? "ring-1 ring-purple-300/35" : ""}`}
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
                <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-gray-100">
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
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-gray-500 hover:bg-white/[0.08] hover:text-gray-200"
                    title="Open on GitHub"
                  >
                    <ArrowUpRight size={14} />
                  </a>
                ) : null}
              </div>
            </div>
          </PanelCard>
        );
      })}
    </div>
  );
}

function PanelList({
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
      <PanelState
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
      <PanelState
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
      <PanelState
        icon={definition.icon}
        tone="accent"
        title={setupRequirement.title}
        detail={setupRequirement.detail}
        actionLabel={setupRequirement.actionLabel}
        onAction={onRefresh}
      />
    );
  }

  if (state.items.length === 0) {
    return (
      <PanelState
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

export function GitHubWorkbenchPanel({
  panelId = "issues",
  workspacePath = "",
  accountSession = null,
  onOpenGit,
  onOpenAccount,
  initialRepository = "",
  className = "",
  onActionComplete,
}) {
  const normalizedPanelId = PANEL_DEFINITIONS[panelId] ? panelId : "issues";
  const definition = PANEL_DEFINITIONS[normalizedPanelId];
  const Icon = definition.icon;
  const repositoryGuess = useMemo(
    () => getWorkspaceRepositoryGuess(workspacePath),
    [workspacePath],
  );
  const initialRepoLabel = initialRepository || repositoryGuess.label;

  const [capability, setCapability] = useState(() => getGithubPlatformCapability());
  const [repoDraft, setRepoDraft] = useState(initialRepoLabel);
  const [appliedRepoDraft, setAppliedRepoDraft] = useState(initialRepoLabel);
  const [stateFilter, setStateFilter] = useState("open");
  const [projectOwnerType, setProjectOwnerType] = useState(
    initialRepoLabel ? "user" : "viewer",
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [listState, setListState] = useState(EMPTY_LIST_STATE);
  const [projectItemsState, setProjectItemsState] = useState(EMPTY_PROJECT_ITEMS_STATE);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actionState, setActionState] = useState({
    busy: "",
    error: "",
    message: "",
  });
  const [issueCreateDraft, setIssueCreateDraft] = useState(DEFAULT_ISSUE_CREATE);
  const [issueEditDraft, setIssueEditDraft] = useState(DEFAULT_ISSUE_EDIT);
  const [pullCreateDraft, setPullCreateDraft] = useState(DEFAULT_PULL_CREATE);
  const [pullEditDraft, setPullEditDraft] = useState(DEFAULT_PULL_EDIT);
  const [pullSafetyDraft, setPullSafetyDraft] = useState(DEFAULT_PULL_SAFETY);
  const [projectActionDraft, setProjectActionDraft] = useState(DEFAULT_PROJECT_ACTION);
  const [confirmAction, setConfirmAction] = useState("");

  const appliedRepoRef = useMemo(
    () => normalizeRepositoryInput(appliedRepoDraft),
    [appliedRepoDraft],
  );
  const draftRepoRef = useMemo(
    () => normalizeRepositoryInput(repoDraft),
    [repoDraft],
  );
  const projectOwnerDraft = useMemo(
    () => getProjectOwnerDraft(appliedRepoDraft, accountSession),
    [accountSession, appliedRepoDraft],
  );
  const draftProjectOwner = useMemo(
    () => getProjectOwnerDraft(repoDraft, accountSession),
    [accountSession, repoDraft],
  );
  const setupRequirement = useMemo(
    () =>
      getSetupRequirement({
        panelId: normalizedPanelId,
        draftRepoRef,
        appliedRepoRef,
        projectOwnerType,
        draftProjectOwner,
        appliedProjectOwner: projectOwnerDraft,
      }),
    [
      appliedRepoRef,
      draftProjectOwner,
      draftRepoRef,
      normalizedPanelId,
      projectOwnerDraft,
      projectOwnerType,
    ],
  );

  useEffect(() => {
    setRepoDraft(initialRepoLabel);
    setAppliedRepoDraft(initialRepoLabel);
  }, [initialRepoLabel]);

  useEffect(() => {
    if (normalizedPanelId === "projects" && selectedProject?.fields?.length) return;
    setProjectActionDraft(DEFAULT_PROJECT_ACTION);
  }, [normalizedPanelId, selectedProject?.id, selectedProject?.fields?.length]);

  useEffect(() => {
    if (normalizedPanelId === "issues" && selectedItem) {
      setIssueEditDraft({
        number: String(selectedItem.number || ""),
        title: selectedItem.title || "",
        body: selectedItem.body || "",
        state: selectedItem.state === "closed" ? "closed" : "open",
      });
    }

    if (normalizedPanelId === "prs" && selectedItem) {
      setPullEditDraft({
        number: String(selectedItem.number || ""),
        title: selectedItem.title || "",
        body: selectedItem.body || "",
        state: selectedItem.state === "closed" ? "closed" : "open",
        base: selectedItem.base?.ref || "",
      });
      setPullSafetyDraft({
        ...DEFAULT_PULL_SAFETY,
        expectedHeadSha: selectedItem.head?.sha || "",
      });
    }
  }, [normalizedPanelId, selectedItem]);

  useEffect(() => {
    setConfirmAction("");
  }, [
    issueEditDraft.body,
    issueEditDraft.number,
    issueEditDraft.state,
    issueEditDraft.title,
    normalizedPanelId,
    projectActionDraft.fieldId,
    projectActionDraft.itemId,
    projectActionDraft.value,
    projectActionDraft.valueType,
    pullEditDraft.base,
    pullEditDraft.body,
    pullEditDraft.number,
    pullEditDraft.state,
    pullEditDraft.title,
    pullSafetyDraft.commitMessage,
    pullSafetyDraft.commitTitle,
    pullSafetyDraft.expectedHeadSha,
    pullSafetyDraft.mergeMethod,
    selectedItem?.number,
    selectedProject?.id,
  ]);

  const requestConfirm = useCallback(
    (event, actionId, action) => {
      event?.preventDefault?.();
      setActionState((current) => ({ ...current, error: "", message: "" }));
      if (confirmAction === actionId && typeof action === "function") {
        setConfirmAction("");
        void action();
        return;
      }
      setConfirmAction(actionId);
    },
    [confirmAction],
  );

  const cancelConfirm = useCallback(() => {
    setConfirmAction("");
  }, []);

  const runMutation = useCallback(
    async (busy, callback, successMessage) => {
      setConfirmAction("");
      setActionState({ busy, error: "", message: "" });
      try {
        const result = await callback();
        setActionState({ busy: "", error: "", message: successMessage });
        onActionComplete?.({ type: busy, result });
        setAppliedRepoDraft(repoDraft);
        setRefreshKey((value) => value + 1);
        return result;
      } catch (error) {
        setActionState({
          busy: "",
          error: formatGithubWorkbenchError(error, "GitHub action failed."),
          message: "",
        });
        return null;
      }
    },
    [onActionComplete, repoDraft],
  );

  const loadPanelData = useCallback(async () => {
    const nextCapability = getGithubPlatformCapability();
    setCapability(nextCapability);
    setActionState((current) => ({ ...current, error: "", message: "" }));

    if (!nextCapability.available) {
      setListState({
        ...EMPTY_LIST_STATE,
        loaded: true,
        error: formatGithubWorkbenchError(
          "GitHub bridge is not available in this runtime.",
          "GitHub bridge is not available.",
        ),
      });
      return;
    }

    if (normalizedPanelId !== "projects") {
      const repoError = getRepoError(appliedRepoRef);
      if (repoError) {
        setListState({
          ...EMPTY_LIST_STATE,
          loaded: true,
          error: "",
        });
        return;
      }
    }

    if (
      normalizedPanelId === "projects" &&
      projectOwnerType !== "viewer" &&
      !projectOwnerDraft
    ) {
      setListState({
        ...EMPTY_LIST_STATE,
        loaded: true,
        error: "",
      });
      return;
    }

    setListState((current) => ({ ...current, loading: true, error: "" }));
    try {
      let result;
      if (normalizedPanelId === "issues") {
        result = await loadGithubIssues({
          owner: appliedRepoRef.owner,
          repo: appliedRepoRef.repo,
          state: stateFilter,
          perPage: 30,
        });
      } else if (normalizedPanelId === "prs") {
        result = await loadGithubPullRequests({
          owner: appliedRepoRef.owner,
          repo: appliedRepoRef.repo,
          state: stateFilter,
          perPage: 30,
        });
      } else {
        const payload = {
          ownerType: projectOwnerType,
          first: 30,
        };
        if (projectOwnerType !== "viewer") {
          payload.owner = projectOwnerDraft;
          payload.login = projectOwnerDraft;
        }
        result = await loadGithubProjectsV2(payload);
      }

      const nextItems = extractPanelItems(normalizedPanelId, result);
      setListState({
        items: nextItems,
        loading: false,
        error: "",
        loaded: true,
        owner: result?.owner || null,
        pageInfo: result?.pageInfo || null,
      });
      setSelectedItem((current) => {
        if (normalizedPanelId === "projects") return null;
        if (!current) return null;
        return nextItems.find((item) => item.number === current.number || item.id === current.id) || null;
      });
      setSelectedProject((current) => {
        if (normalizedPanelId !== "projects" || !current) return null;
        return nextItems.find((project) => project.id === current.id) || null;
      });
    } catch (error) {
      setListState({
        ...EMPTY_LIST_STATE,
        loaded: true,
        error: formatGithubWorkbenchError(error, "GitHub data could not be loaded."),
      });
    }
  }, [
    appliedRepoRef,
    normalizedPanelId,
    projectOwnerDraft,
    projectOwnerType,
    stateFilter,
  ]);

  useEffect(() => {
    void loadPanelData();
  }, [loadPanelData, refreshKey]);

  const refreshPanel = useCallback(() => {
    setAppliedRepoDraft(repoDraft);
    setRefreshKey((value) => value + 1);
  }, [repoDraft]);

  const handleSelectProject = useCallback((project) => {
    setSelectedProject(project);
    setProjectItemsState(EMPTY_PROJECT_ITEMS_STATE);
  }, []);

  const loadProjectItems = useCallback(async (project) => {
    if (!project?.id) return;
    setSelectedProject(project);
    setProjectItemsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [details, itemsResult] = await Promise.all([
        loadGithubProjectV2({ projectId: project.id, fieldsFirst: 50 }).catch(() => null),
        loadGithubProjectV2Items({ projectId: project.id, first: 25 }),
      ]);
      const detailedProject = details?.project || project;
      const nextItems = toArray(itemsResult?.items || itemsResult);
      setSelectedProject(detailedProject);
      setProjectItemsState({
        items: nextItems,
        loading: false,
        error: "",
        loaded: true,
        pageInfo: itemsResult?.pageInfo || null,
      });
    } catch (error) {
      setProjectItemsState({
        ...EMPTY_PROJECT_ITEMS_STATE,
        loaded: true,
        error: formatGithubWorkbenchError(error, "Project items could not be loaded."),
      });
    }
  }, []);

  const handleCreateIssue = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      const result = await runMutation(
        "issue-create",
        () =>
          createGithubIssue({
            owner: draftRepoRef.owner,
            repo: draftRepoRef.repo,
            title: issueCreateDraft.title.trim(),
            body: issueCreateDraft.body,
            labels: parseCsvList(issueCreateDraft.labels),
            assignees: parseCsvList(issueCreateDraft.assignees),
          }),
        "Issue created.",
      );
      const issue = getResultItem(result, "issue");
      if (issue?.number) setSelectedItem(issue);
      if (result) setIssueCreateDraft(DEFAULT_ISSUE_CREATE);
    },
    [draftRepoRef, issueCreateDraft, runMutation],
  );

  const handleUpdateIssue = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      if (confirmAction !== "issue-update") {
        setActionState({
          busy: "",
          error: "Review and confirm the issue update before sending it to GitHub.",
          message: "",
        });
        return;
      }
      const result = await runMutation(
        "issue-update",
        () =>
          updateGithubIssue({
            owner: draftRepoRef.owner,
            repo: draftRepoRef.repo,
            issueNumber: issueEditDraft.number,
            title: issueEditDraft.title,
            body: issueEditDraft.body,
            state: issueEditDraft.state,
          }),
        "Issue updated.",
      );
      const issue = getResultItem(result, "issue");
      if (issue?.number) setSelectedItem(issue);
    },
    [confirmAction, draftRepoRef, issueEditDraft, runMutation],
  );

  const handleCreatePullRequest = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      const result = await runMutation(
        "pull-create",
        () =>
          createGithubPullRequest({
            owner: draftRepoRef.owner,
            repo: draftRepoRef.repo,
            title: pullCreateDraft.title.trim(),
            head: pullCreateDraft.head.trim(),
            base: pullCreateDraft.base.trim(),
            body: pullCreateDraft.body,
            draft: pullCreateDraft.draft,
          }),
        "Pull request created.",
      );
      const pullRequest = getResultItem(result, "pullRequest");
      if (pullRequest?.number) setSelectedItem(pullRequest);
      if (result) setPullCreateDraft(DEFAULT_PULL_CREATE);
    },
    [draftRepoRef, pullCreateDraft, runMutation],
  );

  const handleUpdatePullRequest = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      if (confirmAction !== "pull-update") {
        setActionState({
          busy: "",
          error: "Review and confirm the pull request update before sending it to GitHub.",
          message: "",
        });
        return;
      }
      const payload = {
        owner: draftRepoRef.owner,
        repo: draftRepoRef.repo,
        pullNumber: pullEditDraft.number,
        title: pullEditDraft.title,
        body: pullEditDraft.body,
        state: pullEditDraft.state,
      };
      if (pullEditDraft.base.trim()) payload.base = pullEditDraft.base.trim();

      const result = await runMutation(
        "pull-update",
        () => updateGithubPullRequest(payload),
        "Pull request updated.",
      );
      const pullRequest = getResultItem(result, "pullRequest");
      if (pullRequest?.number) setSelectedItem(pullRequest);
    },
    [confirmAction, draftRepoRef, pullEditDraft, runMutation, selectedItem],
  );

  const handleUpdatePullRequestBranch = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      if (!selectedItem?.number) {
        setActionState({ busy: "", error: "Select a pull request first.", message: "" });
        return;
      }
      if (confirmAction !== "pull-update-branch") {
        setActionState({
          busy: "",
          error: "Review and confirm the branch update before sending it to GitHub.",
          message: "",
        });
        return;
      }

      const payload = {
        owner: draftRepoRef.owner,
        repo: draftRepoRef.repo,
        pullNumber: selectedItem.number,
      };
      if (pullSafetyDraft.expectedHeadSha.trim()) {
        payload.expectedHeadSha = pullSafetyDraft.expectedHeadSha.trim();
      }

      await runMutation(
        "pull-update-branch",
        () => updateGithubPullRequestBranch(payload),
        "Pull request branch update queued.",
      );
    },
    [confirmAction, draftRepoRef, pullSafetyDraft.expectedHeadSha, runMutation, selectedItem],
  );

  const handleMergePullRequest = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getRepoError(draftRepoRef);
      if (repoError) {
        setActionState({ busy: "", error: repoError, message: "" });
        return;
      }
      if (!selectedItem?.number) {
        setActionState({ busy: "", error: "Select a pull request first.", message: "" });
        return;
      }
      if (confirmAction !== "pull-merge") {
        setActionState({
          busy: "",
          error: "Review and confirm the merge before sending it to GitHub.",
          message: "",
        });
        return;
      }

      const payload = {
        owner: draftRepoRef.owner,
        repo: draftRepoRef.repo,
        pullNumber: selectedItem.number,
        mergeMethod: pullSafetyDraft.mergeMethod,
      };
      if (selectedItem.head?.sha) payload.sha = selectedItem.head.sha;
      if (pullSafetyDraft.commitTitle.trim()) payload.commitTitle = pullSafetyDraft.commitTitle.trim();
      if (pullSafetyDraft.commitMessage.trim()) payload.commitMessage = pullSafetyDraft.commitMessage.trim();

      await runMutation(
        "pull-merge",
        () => mergeGithubPullRequest(payload),
        "Pull request merged.",
      );
    },
    [confirmAction, draftRepoRef, pullSafetyDraft, runMutation, selectedItem],
  );

  const handleAddProjectItem = useCallback(
    async (event) => {
      event?.preventDefault?.();
      if (!selectedProject?.id) {
        setActionState({ busy: "", error: "Select a project first.", message: "" });
        return;
      }
      const result = await runMutation(
        "project-add-item",
        () =>
          addGithubProjectV2Item({
            projectId: selectedProject.id,
            contentId: projectActionDraft.contentId.trim(),
          }),
        "Project item added.",
      );
      if (result) {
        setProjectActionDraft((current) => ({ ...current, contentId: "" }));
        void loadProjectItems(selectedProject);
      }
    },
    [loadProjectItems, projectActionDraft.contentId, runMutation, selectedProject],
  );

  const handleUpdateProjectField = useCallback(
    async (event) => {
      event?.preventDefault?.();
      if (!selectedProject?.id) {
        setActionState({ busy: "", error: "Select a project first.", message: "" });
        return;
      }
      if (confirmAction !== "project-update-field") {
        setActionState({
          busy: "",
          error: "Review and confirm the project field update before sending it to GitHub.",
          message: "",
        });
        return;
      }

      const result = await runMutation(
        "project-update-field",
        () =>
          updateGithubProjectV2ItemField({
            projectId: selectedProject.id,
            itemId: projectActionDraft.itemId.trim(),
            fieldId: projectActionDraft.fieldId.trim(),
            value: buildProjectFieldValue(
              projectActionDraft.valueType,
              projectActionDraft.value.trim(),
            ),
          }),
        "Project item field updated.",
      );
      if (result) void loadProjectItems(selectedProject);
    },
    [confirmAction, loadProjectItems, projectActionDraft, runMutation, selectedProject],
  );

  const panelCountLabel = listState.loading
    ? listState.loaded ? "refreshing" : "loading"
    : `${listState.items.length} ${definition.itemName}${listState.items.length === 1 ? "" : "s"}`;

  return (
    <PanelShell
      ariaLabel={definition.title}
      className={className}
    >
      <PanelHeader
        icon={Icon}
        title={definition.title}
        subtitle={definition.subtitle}
        status={
          <PanelBadge tone={capability.available ? "success" : "danger"}>
            {capability.available ? panelCountLabel : "offline"}
          </PanelBadge>
        }
        actions={
          <PanelIconButton
            label={listState.loading ? "Refreshing" : definition.loadLabel}
            onClick={refreshPanel}
            disabled={listState.loading}
          >
            <RefreshCw className={listState.loading ? "animate-spin" : ""} />
          </PanelIconButton>
        }
      />

      <PanelBody className="pb-3">
        <RepositoryControls
          panelId={normalizedPanelId}
          definition={definition}
          capability={capability}
          repoDraft={repoDraft}
          onRepoDraftChange={setRepoDraft}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          projectOwnerType={projectOwnerType}
          onProjectOwnerTypeChange={setProjectOwnerType}
          loading={listState.loading}
          onRefresh={refreshPanel}
          onOpenGit={onOpenGit}
          onOpenAccount={onOpenAccount}
        />

        {normalizedPanelId === "projects" && projectOwnerType !== "viewer" ? (
          <div className="mx-3 mt-2 text-[10px] text-gray-600">
            Project owner: {draftProjectOwner || "not set"}
          </div>
        ) : null}

        {actionState.error ? (
          <PanelNotice
            className="mx-3 mt-3"
            tone="danger"
            title="GitHub action failed"
            detail={actionState.error}
          />
        ) : null}

        {actionState.message ? (
          <PanelNotice
            className="mx-3 mt-3"
            tone="success"
            icon={CheckCircle2}
            title={actionState.message}
            detail="The list will refresh with the latest GitHub response."
          />
        ) : null}

        <div className="mt-3">
          <PanelList
            panelId={normalizedPanelId}
            definition={definition}
            state={listState}
            selectedItem={selectedItem}
            selectedProject={selectedProject}
            projectItemsState={projectItemsState}
            setupRequirement={setupRequirement}
            onSelectItem={setSelectedItem}
            onSelectProject={handleSelectProject}
            onLoadProjectItems={loadProjectItems}
            onRefresh={refreshPanel}
          />
        </div>

        {normalizedPanelId === "issues" ? (
          <IssueActions
            items={listState.items}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            createDraft={issueCreateDraft}
            onCreateDraftChange={setIssueCreateDraft}
            editDraft={issueEditDraft}
            onEditDraftChange={setIssueEditDraft}
            busy={actionState.busy}
            onCreate={handleCreateIssue}
            onUpdate={handleUpdateIssue}
            confirmAction={confirmAction}
            onRequestConfirm={requestConfirm}
            onConfirmCancel={cancelConfirm}
          />
        ) : null}

        {normalizedPanelId === "prs" ? (
          <PullRequestActions
            items={listState.items}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            createDraft={pullCreateDraft}
            onCreateDraftChange={setPullCreateDraft}
            editDraft={pullEditDraft}
            onEditDraftChange={setPullEditDraft}
            safetyDraft={pullSafetyDraft}
            onSafetyDraftChange={setPullSafetyDraft}
            busy={actionState.busy}
            onCreate={handleCreatePullRequest}
            onUpdate={handleUpdatePullRequest}
            onUpdateBranch={handleUpdatePullRequestBranch}
            onMerge={handleMergePullRequest}
            confirmAction={confirmAction}
            onRequestConfirm={requestConfirm}
            onConfirmCancel={cancelConfirm}
          />
        ) : null}

        {normalizedPanelId === "projects" ? (
          <ProjectActions
            selectedProject={selectedProject}
            projectItems={projectItemsState.items}
            projectItemsState={projectItemsState}
            actionDraft={projectActionDraft}
            onActionDraftChange={setProjectActionDraft}
            busy={actionState.busy}
            onLoadItems={loadProjectItems}
            onAddItem={handleAddProjectItem}
            onUpdateField={handleUpdateProjectField}
            confirmAction={confirmAction}
            onRequestConfirm={requestConfirm}
            onConfirmCancel={cancelConfirm}
          />
        ) : null}
      </PanelBody>
    </PanelShell>
  );
}

export default GitHubWorkbenchPanel;
