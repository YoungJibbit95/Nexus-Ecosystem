import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import {
  PanelBadge,
  PanelBody,
  PanelHeader,
  PanelIconButton,
  PanelShell,
} from "../panels/PanelChrome.jsx";
import {
  GITHUB_PANEL_METHOD_REQUIREMENTS,
  addGithubProjectV2Item,
  createGithubIssue,
  createGithubPullRequest,
  formatGithubPlatformError,
  getGithubCapabilityStatus,
  getGithubPlatformCapability,
  getGithubRepositoryError,
  loadGithubIssues,
  loadGithubProjectV2,
  loadGithubProjectV2Items,
  loadGithubProjectsV2,
  loadGithubPullRequests,
  mergeGithubPullRequest,
  normalizeGithubRepositoryInput,
  updateGithubIssue,
  updateGithubProjectV2ItemField,
  updateGithubPullRequest,
  updateGithubPullRequestBranch,
} from "../../../pages/editor/githubWorkbenchModel.js";
import { IssueActions, ProjectActions, PullRequestActions } from "./GitHubWorkbenchActions.jsx";
import { PanelList } from "./GitHubWorkbenchList.jsx";
import { RepositoryInputCard } from "./GitHubRepositoryInputCard.jsx";
import { RuntimeStatusLine, WorkbenchNotice, WorkbenchSummaryPill } from "./githubWorkbenchPrimitives.jsx";
import {
  DEFAULT_ISSUE_CREATE,
  DEFAULT_ISSUE_EDIT,
  DEFAULT_PROJECT_ACTION,
  DEFAULT_PULL_CREATE,
  DEFAULT_PULL_EDIT,
  DEFAULT_PULL_SAFETY,
  EMPTY_LIST_STATE,
  EMPTY_PROJECT_ITEMS_STATE,
  PANEL_DEFINITIONS,
  buildProjectFieldValue,
  extractPanelItems,
  getProjectOwnerDraft,
  getResultItem,
  getSetupRequirement,
  getWorkspaceRepositoryGuess,
  parseCsvList,
  toArray,
} from "./githubWorkbenchData.js";

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
  const requiredMethods = GITHUB_PANEL_METHOD_REQUIREMENTS[normalizedPanelId] || [];
  const Icon = definition.icon;
  const repositoryGuess = useMemo(
    () => getWorkspaceRepositoryGuess(workspacePath),
    [workspacePath],
  );
  const initialRepoLabel = initialRepository || repositoryGuess.label;

  const [capability, setCapability] = useState(() =>
    getGithubPlatformCapability(requiredMethods),
  );
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
    () => normalizeGithubRepositoryInput(appliedRepoDraft),
    [appliedRepoDraft],
  );
  const draftRepoRef = useMemo(
    () => normalizeGithubRepositoryInput(repoDraft),
    [repoDraft],
  );
  const capabilityStatus = useMemo(
    () => getGithubCapabilityStatus(capability),
    [capability],
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
    setListState(EMPTY_LIST_STATE);
    setProjectItemsState(EMPTY_PROJECT_ITEMS_STATE);
    setSelectedItem(null);
    setSelectedProject(null);
    setActionState({ busy: "", error: "", message: "" });
    setConfirmAction("");
  }, [normalizedPanelId]);

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
          error: formatGithubPlatformError(error, "GitHub action failed."),
          message: "",
        });
        return null;
      }
    },
    [onActionComplete, repoDraft],
  );

  const loadPanelData = useCallback(async () => {
    const nextCapability = getGithubPlatformCapability(requiredMethods);
    setCapability(nextCapability);
    setActionState((current) => ({ ...current, error: "", message: "" }));

    if (!nextCapability.available) {
      setListState({
        ...EMPTY_LIST_STATE,
        loaded: true,
        error: formatGithubPlatformError(
          "GitHub bridge is not available in this runtime.",
          "GitHub bridge is not available.",
        ),
      });
      return;
    }

    if (normalizedPanelId !== "projects") {
      const repoError = getGithubRepositoryError(appliedRepoRef);
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
        error: formatGithubPlatformError(error, "GitHub data could not be loaded."),
      });
    }
  }, [
    appliedRepoRef,
    normalizedPanelId,
    projectOwnerDraft,
    projectOwnerType,
    requiredMethods,
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
        error: formatGithubPlatformError(error, "Project items could not be loaded."),
      });
    }
  }, []);

  const handleCreateIssue = useCallback(
    async (event) => {
      event?.preventDefault?.();
      const repoError = getGithubRepositoryError(draftRepoRef);
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
      const repoError = getGithubRepositoryError(draftRepoRef);
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
      const repoError = getGithubRepositoryError(draftRepoRef);
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
      const repoError = getGithubRepositoryError(draftRepoRef);
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
      const repoError = getGithubRepositoryError(draftRepoRef);
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
      const repoError = getGithubRepositoryError(draftRepoRef);
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
            owner: draftRepoRef.owner,
            repo: draftRepoRef.repo,
            contentRef: projectActionDraft.contentId.trim(),
            contentType: projectActionDraft.contentType,
          }),
        "Project item added.",
      );
      if (result) {
        setProjectActionDraft((current) => ({ ...current, contentId: "" }));
        void loadProjectItems(selectedProject);
      }
    },
    [draftRepoRef, loadProjectItems, projectActionDraft.contentId, projectActionDraft.contentType, runMutation, selectedProject],
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
  const panelContextLabel =
    normalizedPanelId === "projects"
      ? projectOwnerType === "viewer"
        ? "Viewer projects"
        : `${projectOwnerType}: ${projectOwnerDraft || draftProjectOwner || "not set"}`
      : appliedRepoRef.label || draftRepoRef.label || definition.repoHelp;
  const canShowActions = capabilityStatus.id === "ready" && !setupRequirement;
  const targetSummary =
    panelContextLabel.length > 28
      ? `${panelContextLabel.slice(0, 25)}...`
      : panelContextLabel;

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
          <PanelBadge tone={capabilityStatus.id === "ready" ? "muted" : capabilityStatus.tone}>
            {capabilityStatus.id === "ready" ? panelCountLabel : capabilityStatus.label}
          </PanelBadge>
        }
        actions={
          <PanelIconButton
            label={listState.loading ? "Refreshing" : definition.loadLabel}
            onClick={refreshPanel}
            disabled={listState.loading}
            className="!h-8 !w-8"
          >
            <RefreshCw className={listState.loading ? "animate-spin" : ""} />
          </PanelIconButton>
        }
      />

      <PanelBody className="pb-2">
        <RepositoryInputCard
          panelId={normalizedPanelId}
          definition={definition}
          capability={capability}
          capabilityStatus={capabilityStatus}
          repoDraft={repoDraft}
          onRepoDraftChange={setRepoDraft}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          projectOwnerType={projectOwnerType}
          onProjectOwnerTypeChange={setProjectOwnerType}
          loading={listState.loading}
          onOpenGit={onOpenGit}
          onOpenAccount={onOpenAccount}
        />

        {capabilityStatus.id !== "ready" ? (
          <RuntimeStatusLine
            status={capabilityStatus}
            capability={capability}
            onOpenAccount={onOpenAccount}
          />
        ) : null}

        {normalizedPanelId === "projects" && projectOwnerType !== "viewer" ? (
          <div className="mx-3 mt-2 min-w-0 break-words text-[10px] text-gray-600" style={{ overflowWrap: "anywhere" }}>
            Project owner: {draftProjectOwner || "not set"}
          </div>
        ) : null}

        <div
          className="mx-3 mt-2 grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))" }}
        >
          <WorkbenchSummaryPill
            label="Bridge"
            value={capabilityStatus.id === "ready" ? "Ready" : capabilityStatus.label}
            tone={capabilityStatus.tone}
            title={capabilityStatus.detail}
          />
          <WorkbenchSummaryPill
            label={normalizedPanelId === "projects" ? "Scope" : "Target"}
            value={targetSummary}
            tone={setupRequirement ? "warning" : "muted"}
            title={panelContextLabel}
          />
          <WorkbenchSummaryPill
            label="Loaded"
            value={listState.loading ? "Loading" : listState.loaded ? listState.items.length : "Pending"}
            tone={listState.error ? "danger" : listState.loading ? "accent" : "muted"}
          />
        </div>

        {actionState.error ? (
          <WorkbenchNotice
            className="mx-3 mt-2.5"
            tone="danger"
            title="GitHub action failed"
            detail={actionState.error}
          />
        ) : null}

        {actionState.message ? (
          <WorkbenchNotice
            className="mx-3 mt-2.5"
            tone="success"
            icon={CheckCircle2}
            title={actionState.message}
            detail="The list will refresh with the latest GitHub response."
          />
        ) : null}

        <div className="mt-2.5">
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

        {canShowActions && normalizedPanelId === "issues" ? (
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

        {canShowActions && normalizedPanelId === "prs" ? (
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

        {canShowActions && normalizedPanelId === "projects" ? (
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
