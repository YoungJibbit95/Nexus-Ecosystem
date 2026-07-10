import { CircleDot, FolderKanban, GitPullRequest } from "lucide-react";
import { normalizeGithubRepositoryInput } from "../../../pages/editor/githubWorkbenchModel.js";

export const PANEL_DEFINITIONS = {
  issues: {
    title: "GitHub Issues",
    subtitle: "Triage repository issues.",
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
    subtitle: "Review and update pull requests.",
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
    subtitle: "Browse Projects v2.",
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

export const EMPTY_LIST_STATE = {
  items: [],
  loading: false,
  error: "",
  loaded: false,
  owner: null,
  pageInfo: null,
};

export const EMPTY_PROJECT_ITEMS_STATE = {
  items: [],
  loading: false,
  error: "",
  loaded: false,
  pageInfo: null,
};

export const DEFAULT_ISSUE_CREATE = {
  title: "",
  body: "",
  labels: "",
  assignees: "",
};

export const DEFAULT_ISSUE_EDIT = {
  number: "",
  title: "",
  body: "",
  state: "open",
};

export const DEFAULT_PULL_CREATE = {
  title: "",
  head: "",
  base: "main",
  body: "",
  draft: false,
};

export const DEFAULT_PULL_EDIT = {
  number: "",
  title: "",
  body: "",
  state: "open",
  base: "",
};

export const DEFAULT_PULL_SAFETY = {
  expectedHeadSha: "",
  mergeMethod: "merge",
  commitTitle: "",
  commitMessage: "",
};

export const DEFAULT_PROJECT_ACTION = {
  contentId: "",
  contentType: "issue",
  itemId: "",
  fieldId: "",
  valueType: "text",
  value: "",
};
export function getWorkspaceRepositoryGuess(workspacePath) {
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

export function getProjectOwnerDraft(repoDraft, accountSession) {
  const parsed = normalizeGithubRepositoryInput(repoDraft);
  return parsed.owner || String(repoDraft || "").trim() || accountSession?.username || "";
}

export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.nodes)) return value.nodes;
  return [];
}

export function extractPanelItems(panelId, result) {
  if (panelId === "issues") {
    return toArray(result?.issues || result?.items || result);
  }
  if (panelId === "prs") {
    return toArray(result?.pullRequests || result?.pulls || result?.items || result);
  }
  return toArray(result?.projects || result?.items || result?.nodes || result);
}

export function parseCsvList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatDate(value) {
  if (!value) return "recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  return date.toLocaleString();
}

export function getUserLogin(user) {
  return user?.login || user?.name || "github";
}

export function getItemKey(item, fallback) {
  return item?.nodeId || item?.node_id || item?.id || item?.url || fallback;
}

export function stateTone(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "open") return "success";
  if (normalized === "closed" || normalized === "merged") return "danger";
  if (normalized === "draft") return "warning";
  return "muted";
}

export function needsCloseConfirmation(item, nextState) {
  const currentState = String(item?.state || "open").toLowerCase();
  return Boolean(item) && currentState !== "closed" && String(nextState || "").toLowerCase() === "closed";
}

export function getResultItem(result, key) {
  return result?.[key] || result?.data?.[key] || result;
}

export function getSetupRequirement({
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

export function buildProjectFieldValue(type, rawValue) {
  if (type === "number") return { number: rawValue };
  if (type === "date") return { date: rawValue };
  if (type === "singleSelectOptionId") return { singleSelectOptionId: rawValue };
  if (type === "iterationId") return { iterationId: rawValue };
  return { text: rawValue };
}

export function pickProjectFieldValueType(field) {
  const dataType = String(field?.dataType || "").toUpperCase();
  if (dataType === "NUMBER") return "number";
  if (dataType === "DATE") return "date";
  if (dataType === "SINGLE_SELECT") return "singleSelectOptionId";
  if (dataType === "ITERATION") return "iterationId";
  return "text";
}
