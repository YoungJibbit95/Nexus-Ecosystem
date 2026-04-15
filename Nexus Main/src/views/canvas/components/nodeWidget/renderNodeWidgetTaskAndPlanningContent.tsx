import React from "react";
import { Bell, Calendar, Flag, Unlink } from "lucide-react";
import type { NodeWidgetContentArgs } from "./renderNodeWidgetContent";
import { renderNodeWidgetRiskContent } from "./renderNodeWidgetRiskContent";

export function renderNodeWidgetTaskAndPlanningContent(
  args: NodeWidgetContentArgs,
): React.ReactNode {
  const { node, theme: t, app, nodeAccent, fieldStyle, updateNode } = args;

  const statusColor = (status?: string) => {
    if (status === "done") return "#30D158";
    if (status === "blocked") return "#FF453A";
    if (status === "doing") return "#0A84FF";
    return "#8E8E93";
  };

  const priorityColor = (priority?: string) => {
    if (priority === "critical") return "#FF375F";
    if (priority === "high") return "#FF9F0A";
    if (priority === "mid") return "#64D2FF";
    return "#8E8E93";
  };

  switch (node.type) {
      case "task": {
        const linkedTask = app.tasks.find((t) => t.id === node.linkedTaskId);
        if (!linkedTask) {
          const localProgress = Math.max(
            0,
            Math.min(100, Number(node.progress ?? 0)),
          );
          return (
            <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Task (oder verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedTaskId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedTaskId: e.target.value })
                }
              >
                <option value="">Local Task</option>
                {app.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select
                  value={node.status || "todo"}
                  onChange={(e) =>
                    updateNode(node.id, { status: e.target.value as any })
                  }
                  style={fieldStyle}
                >
                  <option value="todo">Todo</option>
                  <option value="doing">Doing</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={node.priority || "mid"}
                  onChange={(e) =>
                    updateNode(node.id, { priority: e.target.value as any })
                  }
                  style={fieldStyle}
                >
                  <option value="low">Low</option>
                  <option value="mid">Mid</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) => updateNode(node.id, { dueDate: e.target.value })}
                style={fieldStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localProgress}
                  onChange={(e) =>
                    updateNode(node.id, { progress: Number(e.target.value) })
                  }
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 10, fontWeight: 700, color: nodeAccent }}>
                  {localProgress}%
                </span>
              </div>
              <textarea
                value={node.content}
                onChange={(e) => updateNode(node.id, { content: e.target.value })}
                placeholder="Aktion, Kontext, nächste Schritte..."
                style={{
                  flex: 1,
                  minHeight: 84,
                  width: "100%",
                  resize: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: 8,
                  color: "inherit",
                  fontSize: 11,
                  lineHeight: 1.5,
                  outline: "none",
                }}
              />
            </div>
          );
        }
        const isTaskDone = linkedTask.status === "done";
        return (
          <div className="node-interactive w-full h-full p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex justify-between items-start gap-2 border-b border-white/10 pb-2">
              <div
                className="flex gap-2 items-center text-sm font-semibold w-full"
                style={{
                  textDecoration: isTaskDone ? "line-through" : "none",
                  opacity: isTaskDone ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isTaskDone}
                  onChange={(e) =>
                    app.updateTask(linkedTask.id, {
                      status: e.target.checked ? "done" : "todo",
                    })
                  }
                  style={{ accentColor: node.color || t.accent }}
                  className="shrink-0"
                />
                <span className="truncate flex-1">{linkedTask.title}</span>
              </div>
              <button
                onClick={() => updateNode(node.id, { linkedTaskId: undefined })}
                className="opacity-50 hover:opacity-100 shrink-0"
              >
                <Unlink size={12} />
              </button>
            </div>
            {linkedTask.desc && (
              <div className="text-xs opacity-70 mt-1 line-clamp-3">
                {linkedTask.desc}
              </div>
            )}
            {linkedTask.subtasks && linkedTask.subtasks.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {linkedTask.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex gap-1.5 items-center text-[11px] opacity-80"
                    style={{
                      textDecoration: st.done ? "line-through" : "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={st.done}
                      onChange={() => {
                        const newSt = (linkedTask.subtasks || []).map((x) =>
                          x.id === st.id ? { ...x, done: !x.done } : x,
                        );
                        app.updateTask(linkedTask.id, { subtasks: newSt });
                      }}
                      style={{ accentColor: node.color || t.accent }}
                      className="w-2.5 h-2.5 shrink-0"
                    />
                    <span className="truncate">{st.title}</span>
                  </div>
                ))}
              </div>
            )}
            {linkedTask.deadline && (
              <div className="text-[10px] opacity-50 mt-auto pt-2 border-t border-white/5">
                Fällig: {new Date(linkedTask.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      }

      case "reminder": {
        const linkedReminder = app.reminders.find(
          (r) => r.id === node.linkedReminderId,
        );
        if (!linkedReminder) {
          return (
            <div className="node-interactive w-full h-full p-2 flex flex-col gap-2">
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 700 }}>
                Local Reminder (oder verknüpfen)
              </div>
              <select
                className="bg-white/10 text-xs p-1.5 rounded outline-none w-full"
                value={node.linkedReminderId || ""}
                onChange={(e) =>
                  updateNode(node.id, { linkedReminderId: e.target.value })
                }
              >
                <option value="">Local Reminder</option>
                {app.reminders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={
                  node.dueDate
                    ? new Date(node.dueDate).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  updateNode(node.id, {
                    dueDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
                style={fieldStyle}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  opacity: 0.88,
                }}
              >
                <input
                  type="checkbox"
                  checked={node.status === "done"}
                  onChange={(e) =>
                    updateNode(node.id, {
                      status: e.target.checked ? "done" : "todo",
                    })
                  }
                  style={{ accentColor: nodeAccent }}
                />
                Erledigt
              </label>
              <textarea
                value={node.content}
                onChange={(e) => updateNode(node.id, { content: e.target.value })}
                placeholder="Reminder-Notiz oder kurze Message..."
                style={{
                  flex: 1,
                  minHeight: 92,
                  width: "100%",
                  resize: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: 8,
                  color: "inherit",
                  fontSize: 11,
                  lineHeight: 1.45,
                  outline: "none",
                }}
              />
            </div>
          );
        }
        const isRemDone = linkedReminder.done;
        return (
          <div
            className="node-interactive w-full h-full p-3 flex flex-col gap-2 justify-center items-center text-center relative"
            style={{ opacity: isRemDone ? 0.5 : 1 }}
          >
            <button
              onClick={() =>
                updateNode(node.id, { linkedReminderId: undefined })
              }
              className="absolute top-2 right-2 opacity-50 hover:opacity-100 z-10"
            >
              <Unlink size={12} />
            </button>
            <Bell
              size={24}
              style={{
                color: node.color || t.accent,
                opacity: isRemDone ? 0.3 : 1,
              }}
              className={
                !isRemDone && new Date(linkedReminder.datetime) < new Date()
                  ? "nx-glow-pulse"
                  : ""
              }
            />
            <div
              className="font-semibold text-sm mt-1"
              style={{ textDecoration: isRemDone ? "line-through" : "none" }}
            >
              {linkedReminder.title}
            </div>
            {linkedReminder.msg && (
              <div className="text-xs opacity-70 line-clamp-2">
                {linkedReminder.msg}
              </div>
            )}
            {linkedReminder.datetime && (
              <div className="text-[10px] opacity-60 mt-auto bg-black/20 px-2 py-1 rounded w-full">
                {new Date(linkedReminder.datetime).toLocaleString()}
              </div>
            )}
            <div className="mt-2 text-[10px]">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRemDone}
                  onChange={(e) =>
                    app.updateReminder(linkedReminder.id, {
                      done: e.target.checked,
                    })
                  }
                  style={{ accentColor: node.color || t.accent }}
                />
                Erledigt
              </label>
            </div>
          </div>
        );
      }

      case "project": {
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        const status = node.status || "doing";
        const pColor = priorityColor(node.priority || "mid");
        const sColor = statusColor(status);
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {status.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {(node.priority || "mid").toUpperCase()}
              </span>
              {node.owner && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    opacity: 0.75,
                  }}
                >
                  {node.owner}
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={status}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <input
                type="text"
                value={node.owner || ""}
                placeholder="Owner"
                onChange={(e) => updateNode(node.id, { owner: e.target.value })}
                style={fieldStyle}
              />
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  opacity: 0.72,
                  marginBottom: 3,
                }}
              >
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
            </div>
            <textarea
              value={node.content}
              placeholder="Projektziele, Scope, KPI..."
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      case "goal": {
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        const pColor = priorityColor(node.priority || "mid");
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                PRIORITY {(node.priority || "mid").toUpperCase()}
              </span>
              {node.dueDate && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    opacity: 0.8,
                  }}
                >
                  Due {new Date(node.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <textarea
              value={node.content}
              placeholder="Warum ist dieses Ziel wichtig?"
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span
                style={{ fontSize: 11, fontWeight: 700, color: nodeAccent }}
              >
                {progress}%
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
          </div>
        );
      }

      case "milestone": {
        const status = node.status || "todo";
        const sColor = statusColor(status);
        const progress = Math.max(0, Math.min(100, Number(node.progress ?? 0)));
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {status.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {progress}%
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Flag size={12} style={{ color: nodeAccent }} />
              <select
                value={node.status || "todo"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={{ ...fieldStyle, flex: 1 }}
              >
                <option value="todo">Geplant</option>
                <option value="doing">In Arbeit</option>
                <option value="blocked">Blockiert</option>
                <option value="done">Abgeschlossen</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Calendar size={12} style={{ opacity: 0.6 }} />
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  updateNode(node.id, { progress: Number(e.target.value) })
                }
                style={{ width: "100%" }}
              />
              <span
                style={{ fontSize: 11, fontWeight: 700, color: nodeAccent }}
              >
                {progress}%
              </span>
            </div>
            <textarea
              value={node.content}
              placeholder="Done-Kriterien, Deliverables, Abhängigkeiten"
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

      case "decision": {
        const sColor = statusColor(node.status || "todo");
        const pColor = priorityColor(node.priority || "mid");
        return (
          <div
            className="node-interactive"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${sColor}22`,
                  border: `1px solid ${sColor}50`,
                  color: sColor,
                  fontWeight: 700,
                }}
              >
                {(node.status || "todo").toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: `${pColor}22`,
                  border: `1px solid ${pColor}50`,
                  color: pColor,
                  fontWeight: 700,
                }}
              >
                {(node.priority || "mid").toUpperCase()}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <select
                value={node.status || "todo"}
                onChange={(e) =>
                  updateNode(node.id, { status: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="todo">Offen</option>
                <option value="doing">In Review</option>
                <option value="done">Entschieden</option>
              </select>
              <select
                value={node.priority || "mid"}
                onChange={(e) =>
                  updateNode(node.id, { priority: e.target.value as any })
                }
                style={fieldStyle}
              >
                <option value="low">Low Impact</option>
                <option value="mid">Mid Impact</option>
                <option value="high">High Impact</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              <input
                type="text"
                value={node.owner || ""}
                placeholder="Decision Owner"
                onChange={(e) => updateNode(node.id, { owner: e.target.value })}
                style={fieldStyle}
              />
              <input
                type="date"
                value={node.dueDate ? node.dueDate.slice(0, 10) : ""}
                onChange={(e) =>
                  updateNode(node.id, { dueDate: e.target.value })
                }
                style={fieldStyle}
              />
            </div>
            <textarea
              value={node.content}
              placeholder={
                "Option A:\nOption B:\nKriterien:\n- ...\nEntscheidung:"
              }
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 8,
                color: "inherit",
                fontSize: 11,
                lineHeight: 1.5,
                outline: "none",
              }}
            />
          </div>
        );
      }

    default:
      return renderNodeWidgetRiskContent(args);
  }
}
