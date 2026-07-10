import React from "react";
import { FolderKanban, GitMerge, GitPullRequest, Pencil, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { PanelActionButton, PanelBadge, PanelSection } from "../panels/PanelChrome.jsx";
import {
  ConfirmationNotice,
  NESTED_FORM_CLASS,
  PanelTextarea,
  QuietCard,
  QuietInput,
  QuietSelect,
  WorkbenchNotice,
} from "./githubWorkbenchPrimitives.jsx";
import { getItemKey, needsCloseConfirmation, pickProjectFieldValueType } from "./githubWorkbenchData.js";

export function IssueActions({
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
      <div className="mx-3 grid gap-2 pb-3 lg:grid-cols-2">
        <QuietCard className="p-2">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-cyan-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Create issue
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onCreate}>
            <QuietInput
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
              <QuietInput
                value={createDraft.labels}
                onChange={(event) => onCreateDraftChange({ ...createDraft, labels: event.target.value })}
                placeholder="labels, comma separated"
              />
              <QuietInput
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
        </QuietCard>

        <QuietCard className="p-2">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-cyan-200/80" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Update selected issue
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <div className="mb-2">
            <QuietSelect
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
            </QuietSelect>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "issue-update", onUpdate)}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <QuietInput
                value={editDraft.title}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                placeholder={selectedItem ? "Issue title" : "Select an issue first"}
                disabled={!selectedItem || Boolean(busy)}
              />
              <QuietSelect
                value={editDraft.state}
                onChange={(event) => onEditDraftChange({ ...editDraft, state: event.target.value })}
                disabled={!selectedItem || Boolean(busy)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </QuietSelect>
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
              detail={`Sends title, body, and state for ${issueLabel} to GitHub.${closeRequiresConfirm ? " Closing hides it from open triage." : ""}`}
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
              title={closeRequiresConfirm ? "Review issue close" : "Review issue update"}
            >
              {updateBusy
                ? "Updating..."
                : updateConfirmActive
                  ? "Confirm below"
                  : closeRequiresConfirm
                    ? "Review close"
                    : "Review update"}
            </PanelActionButton>
          </form>
        </QuietCard>
      </div>
    </PanelSection>
  );
}

export function PullRequestActions({
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
      <div className="mx-3 grid gap-2 pb-3 xl:grid-cols-2">
        <QuietCard className="p-2">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-cyan-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Create pull request
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onCreate}>
            <QuietInput
              value={createDraft.title}
              onChange={(event) => onCreateDraftChange({ ...createDraft, title: event.target.value })}
              placeholder="Pull request title"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <QuietInput
                value={createDraft.head}
                onChange={(event) => onCreateDraftChange({ ...createDraft, head: event.target.value })}
                placeholder="head branch, e.g. feature/foo"
              />
              <QuietInput
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
                className="h-3.5 w-3.5 rounded border-white/10 bg-black/30"
              />
              Open as draft
            </label>
            <PanelActionButton
              type="submit"
              icon={Plus}
              tone="success"
              disabled={createDisabled}
              className="w-full sm:w-auto"
              title="Create pull request"
            >
              {busy === "pull-create" ? "Creating..." : "Create PR"}
            </PanelActionButton>
          </form>
        </QuietCard>

        <QuietCard className="p-2">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-cyan-200/80" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Edit selected pull request
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <div className="mb-2">
            <QuietSelect
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
            </QuietSelect>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "pull-update", onUpdate)}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <QuietInput
                value={editDraft.title}
                onChange={(event) => onEditDraftChange({ ...editDraft, title: event.target.value })}
                placeholder={selectedItem ? "Pull request title" : "Select a pull request first"}
                disabled={!selectedItem || Boolean(busy)}
              />
              <QuietSelect
                value={editDraft.state}
                onChange={(event) => onEditDraftChange({ ...editDraft, state: event.target.value })}
                disabled={!selectedItem || Boolean(busy)}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </QuietSelect>
            </div>
            <QuietInput
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
              detail={`Sends title, body, state, and optional base for ${selectedPullLabel}.${closeRequiresConfirm ? " Closing stops normal review flow." : ""}`}
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
              title={closeRequiresConfirm ? "Review pull request close" : "Review pull request update"}
            >
              {updateBusy
                ? "Updating..."
                : updateConfirmActive
                  ? "Confirm below"
                  : closeRequiresConfirm
                    ? "Review close"
                    : "Review update"}
            </PanelActionButton>
          </form>
        </QuietCard>

        <QuietCard className="p-2 xl:col-span-2">
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
              className={NESTED_FORM_CLASS}
              onSubmit={(event) => onRequestConfirm(event, "pull-update-branch", onUpdateBranch)}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <RefreshCw size={13} className="shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1 text-[11px] font-semibold text-gray-300">
                  Update branch from base
                </div>
              </div>
              <QuietInput
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
                detail={`Queues a base-branch update for ${selectedPullLabel}. Keep the SHA when you want a moving-head guard.`}
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
                title="Review branch update"
              >
                {branchBusy ? "Updating..." : branchConfirmActive ? "Confirm below" : "Review branch"}
              </PanelActionButton>
            </form>

            <form
              className={`${NESTED_FORM_CLASS} border-red-400/15 bg-red-500/[0.025]`}
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
                <QuietSelect
                  value={safetyDraft.mergeMethod}
                  onChange={(event) =>
                    onSafetyDraftChange({ ...safetyDraft, mergeMethod: event.target.value })
                  }
                  disabled={safetyDisabled}
                >
                  <option value="merge">Merge commit</option>
                  <option value="squash">Squash</option>
                  <option value="rebase">Rebase</option>
                </QuietSelect>
                <QuietInput
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
                detail={`Merges ${selectedPullLabel} with ${safetyDraft.mergeMethod}. Confirm checks, reviews, and branch protections first.`}
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
                title="Review merge"
              >
                {mergeBusy ? "Merging..." : mergeConfirmActive ? "Confirm below" : "Review merge"}
              </PanelActionButton>
            </form>
          </div>
        </QuietCard>
      </div>
    </PanelSection>
  );
}

export function ProjectActions({
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
      <div className="mx-3 grid gap-2 pb-3 lg:grid-cols-2">
        <QuietCard className="p-2 lg:col-span-2">
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
              title="Load project items"
            >
              {projectItemsState.loading ? "Loading..." : "Load items"}
            </PanelActionButton>
          </div>

          {projectItemsState.error ? (
            <WorkbenchNotice
              className="mt-3"
              tone="danger"
              title="Project items failed"
              detail={projectItemsState.error}
            />
          ) : null}

          {projectItemsState.loaded ? (
            <div className="mt-3 grid gap-1.5">
              {projectItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/[0.06] bg-black/[0.12] px-3 py-2 text-[11px] text-gray-600">
                  No items returned for this project.
                </div>
              ) : (
                projectItems.slice(0, 8).map((item, index) => (
                  <div
                    key={getItemKey(item, index)}
                    className="rounded-md border border-white/[0.045] bg-black/[0.14] px-2.5 py-1.5"
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
        </QuietCard>

        <QuietCard className="p-2">
          <div className="mb-2 flex items-center gap-2">
            <Plus size={13} className="text-cyan-300" />
            <div className="min-w-0 text-xs font-semibold text-gray-200">
              Add issue or PR
            </div>
          </div>
          <form className="grid gap-2" onSubmit={onAddItem}>
            <QuietSelect
              value={actionDraft.contentType}
              onChange={(event) => onActionDraftChange({ ...actionDraft, contentType: event.target.value })}
              disabled={!selectedProject || Boolean(busy)}
            >
              <option value="issue">Issue</option>
              <option value="pull">Pull request</option>
              <option value="auto">Auto from URL</option>
            </QuietSelect>
            <QuietInput
              value={actionDraft.contentId}
              onChange={(event) => onActionDraftChange({ ...actionDraft, contentId: event.target.value })}
              placeholder="Node ID, #42, owner/repo#42, or GitHub URL"
              disabled={!selectedProject || Boolean(busy)}
            />
            <PanelActionButton
              type="submit"
              icon={Plus}
              tone="success"
              disabled={Boolean(busy) || !selectedProject || !actionDraft.contentId.trim()}
              className="w-full sm:w-auto"
              title="Add item"
            >
              {busy === "project-add-item" ? "Adding..." : "Add item"}
            </PanelActionButton>
          </form>
        </QuietCard>

        <QuietCard className="p-2">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pencil size={13} className="shrink-0 text-cyan-200/80" />
            <div className="min-w-0 flex-1 text-xs font-semibold text-gray-200">
              Update item field
            </div>
            <PanelBadge tone="warning">confirm</PanelBadge>
          </div>
          <form
            className="grid gap-2"
            onSubmit={(event) => onRequestConfirm(event, "project-update-field", onUpdateField)}
          >
            <QuietInput
              value={actionDraft.itemId}
              onChange={(event) => onActionDraftChange({ ...actionDraft, itemId: event.target.value })}
              placeholder="Project item ID"
              disabled={!selectedProject || Boolean(busy)}
            />
            {fields.length > 0 ? (
              <QuietSelect
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
              </QuietSelect>
            ) : (
              <QuietInput
                value={actionDraft.fieldId}
                onChange={(event) => onActionDraftChange({ ...actionDraft, fieldId: event.target.value })}
                placeholder="Field ID"
                disabled={!selectedProject || Boolean(busy)}
              />
            )}
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <QuietSelect
                value={actionDraft.valueType}
                onChange={(event) => onActionDraftChange({ ...actionDraft, valueType: event.target.value })}
                disabled={!selectedProject || Boolean(busy)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="singleSelectOptionId">Single select</option>
                <option value="iterationId">Iteration</option>
              </QuietSelect>
              <QuietInput
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
                    className="min-w-0 rounded-md border border-white/[0.055] bg-black/[0.14] px-2 py-1 text-[10px] text-gray-400 hover:bg-white/[0.05] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ overflowWrap: "anywhere" }}
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
              detail={`Updates ${actionDraft.fieldId || "the selected field"} on item ${actionDraft.itemId || "the selected item"}. Verify ID, field, and value.`}
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
              title="Review project field update"
            >
              {fieldBusy ? "Updating..." : fieldConfirmActive ? "Confirm below" : "Review field"}
            </PanelActionButton>
          </form>
        </QuietCard>
      </div>
    </PanelSection>
  );
}
