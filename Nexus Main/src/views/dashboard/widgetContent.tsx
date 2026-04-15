import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code,
  FileText,
  GitBranch,
  Hash,
  Star,
  Zap,
} from "lucide-react";
import { Glass } from "../../components/Glass";
import { LiquidGlassButton } from "../../components/LiquidGlassButton";
import { fmtDt, hexToRgb } from "../../lib/utils";
import type { WidgetId } from "./dashboardLayout";
import { QuickChip, Sparkline, StatCard } from "./dashboardUi";

type DashboardWidgetContentArgs = {
  theme: any;
  setView?: (viewId: string) => void;
  notes: any[];
  tasks: any[];
  reminders: any[];
  codes: any[];
  recentNotes: any[];
  urgentReminders: any[];
  recentActivity: any[];
  noteSpark: number[];
  taskSpark: number[];
  pinnedNotes: number;
  doneTasks: number;
  pendingTasks: number;
  overdueReminders: number;
  tasksByStatus: Record<string, number>;
  actIcon: (type: string) => any;
  actColor: (type: string) => string;
  accentRgb: string;
};

export function buildDashboardWidgetContent({
  theme: t,
  setView,
  notes,
  tasks,
  reminders,
  codes,
  recentNotes,
  urgentReminders,
  recentActivity,
  noteSpark,
  taskSpark,
  pinnedNotes,
  doneTasks,
  pendingTasks,
  overdueReminders,
  tasksByStatus,
  actIcon,
  actColor,
  accentRgb: rgb,
}: DashboardWidgetContentArgs): Record<WidgetId, React.ReactNode> {
  const isLiquidGlass =
    ((t.glassmorphism as any)?.panelRenderer ?? "blur") === "liquid-glass";
  const WidgetActionButton = ({
    liquidColor,
    style,
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { liquidColor?: string }) => {
    if (isLiquidGlass) {
      return (
        <LiquidGlassButton
          {...rest}
          color={liquidColor || t.accent}
          size="sm"
          style={{
            ...(style || {}),
            background: "transparent",
            border: "1px solid transparent",
          }}
        >
          {children}
        </LiquidGlassButton>
      );
    }

    return (
      <button {...rest} style={style}>
        {children}
      </button>
    );
  };

  return {
    stats: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard
          icon={FileText}
          label="Notizen"
          value={notes.length}
          sub={`${pinnedNotes} angeheftet`}
          color={t.accent}
          trend={noteSpark}
          delay={0}
          onClick={() => setView?.("notes")}
        />
        <StatCard
          icon={CheckSquare}
          label="Erledigt"
          value={doneTasks}
          sub={`${pendingTasks} offen`}
          color="#30D158"
          trend={taskSpark}
          delay={0.05}
          onClick={() => setView?.("tasks")}
        />
        <StatCard
          icon={Bell}
          label="Erinnerungen"
          value={reminders.filter((r) => !r.done).length}
          sub={overdueReminders > 0 ? `${overdueReminders} überfällig` : "Alles pünktlich"}
          color={overdueReminders > 0 ? "#FF453A" : "#FF9F0A"}
          delay={0.1}
          onClick={() => setView?.("reminders")}
        />
        <StatCard
          icon={Code}
          label="Code-Dateien"
          value={codes.length}
          color="#BF5AF2"
          delay={0.15}
          onClick={() => setView?.("code")}
        />
      </div>
    ),
    notes: (
      <Glass gradient style={{ padding: "16px 18px", height: "100%", background: `linear-gradient(145deg, rgba(${rgb},0.32), rgba(${hexToRgb(t.accent2)},0.2) 58%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={14} style={{ color: t.accent }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Zuletzt bearbeitet</span>
          </div>
          <WidgetActionButton
            onClick={() => setView?.("notes")}
            liquidColor={t.accent}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.accent,
              fontSize: 10,
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Alle <ArrowRight size={10} />
          </WidgetActionButton>
        </div>
        {recentNotes.length === 0 ? (
          <div style={{ opacity: 0.35, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            Noch keine Notizen
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentNotes.map((note) => (
              <WidgetActionButton
                key={note.id}
                onClick={() => setView?.("notes")}
                liquidColor={t.accent}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 9,
                  textAlign: "left",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  color: "inherit",
                  transition: "all 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  {note.pinned ? <Star size={9} style={{ color: "#FF9F0A", flexShrink: 0 }} /> : null}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {note.title || "Unbenannte Notiz"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, opacity: 0.4 }}>
                  <Clock size={9} />
                  <span>{fmtDt(note.updated)}</span>
                  {note.tags?.length > 0 ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Hash size={9} />
                      {note.tags[0]}
                    </span>
                  ) : null}
                </div>
              </WidgetActionButton>
            ))}
          </div>
        )}
      </Glass>
    ),
    reminders: (
      <Glass gradient style={{ padding: "16px 18px", height: "100%", background: "linear-gradient(145deg, rgba(255,159,10,0.28), rgba(255,69,58,0.18) 62%, rgba(255,255,255,0.03))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={14} style={{ color: "#FF9F0A" }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Erinnerungen</span>
          </div>
          <WidgetActionButton
            onClick={() => setView?.("reminders")}
            liquidColor="#ff9f0a"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.accent,
              fontSize: 10,
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Alle <ArrowRight size={10} />
          </WidgetActionButton>
        </div>
        {urgentReminders.length === 0 ? (
          <div style={{ opacity: 0.35, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            <CheckCircle2 size={24} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
            Alles erledigt!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {urgentReminders.map((rem) => {
              const isOverdue = new Date(rem.snoozeUntil || rem.datetime) < new Date();
              const color = isOverdue ? "#FF453A" : "#FF9F0A";
              const rgbR = hexToRgb(color);
              return (
                <WidgetActionButton
                  key={rem.id}
                  onClick={() => setView?.("reminders")}
                  liquidColor={isOverdue ? "#ff453a" : "#ff9f0a"}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 9,
                    textAlign: "left",
                    background: `rgba(${rgbR}, 0.06)`,
                    border: `1px solid rgba(${rgbR}, 0.15)`,
                    cursor: "pointer",
                    color: "inherit",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    {isOverdue ? (
                      <AlertCircle size={10} style={{ color: "#FF453A", flexShrink: 0 }} />
                    ) : (
                      <Bell size={10} style={{ color: "#FF9F0A", flexShrink: 0 }} />
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rem.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color, opacity: 0.8, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={9} />
                    {isOverdue ? "Überfällig · " : ""}
                    {fmtDt(rem.snoozeUntil || rem.datetime)}
                  </div>
                </WidgetActionButton>
              );
            })}
          </div>
        )}
      </Glass>
    ),
    tasks: (
      <Glass gradient style={{ padding: "16px 18px", background: `linear-gradient(145deg, rgba(${rgb},0.28), rgba(255,159,10,0.2) 62%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart3 size={14} style={{ color: "#FF9F0A" }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Task-Übersicht</span>
        </div>
        {tasks.length === 0 ? (
          <div style={{ opacity: 0.35, fontSize: 12, textAlign: "center", padding: "12px 0" }}>Keine Tasks</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { status: "todo", label: "Offen", color: "#8E8E93" },
              { status: "doing", label: "In Arbeit", color: t.accent },
              { status: "done", label: "Fertig", color: "#30D158" },
            ].map(({ status, label, color }) => {
              const count = tasksByStatus[status] || 0;
              const pct = tasks.length ? (count / tasks.length) * 100 : 0;
              const rgbS = hexToRgb(color);
              return (
                <div key={status}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ opacity: 0.65 }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.1, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                      style={{ height: "100%", background: `rgba(${rgbS},0.8)`, borderRadius: 3 }}
                    />
                  </div>
                </div>
              );
            })}
            <WidgetActionButton
              onClick={() => setView?.("tasks")}
              liquidColor="#ff9f0a"
              style={{
                marginTop: 6,
                width: "100%",
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: `rgba(${rgb},0.08)`,
                cursor: "pointer",
                color: t.accent,
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              Task Board öffnen <ArrowRight size={11} />
            </WidgetActionButton>
          </div>
        )}
      </Glass>
    ),
    activity: (
      <Glass gradient style={{ padding: "16px 18px", background: `linear-gradient(145deg, rgba(${hexToRgb(t.accent2)},0.3), rgba(${rgb},0.18) 62%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Activity size={14} style={{ color: t.accent2 }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Letzte Aktivität</span>
        </div>
        {recentActivity.length === 0 ? (
          <div style={{ opacity: 0.35, fontSize: 12, textAlign: "center", padding: "12px 0" }}>
            Noch keine Aktivität
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recentActivity.map((act, i) => {
              const Icon = actIcon(act.type);
              const color = actColor(act.type);
              const rgbA = hexToRgb(color);
              return (
                <div
                  key={act.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "7px 0",
                    borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      flexShrink: 0,
                      marginTop: 1,
                      background: `rgba(${rgbA},0.12)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={11} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {act.action}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.35, marginTop: 1 }}>{fmtDt(act.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Glass>
    ),
    quick: (
      <Glass gradient style={{ padding: "16px 18px", background: `linear-gradient(145deg, rgba(${rgb},0.3), rgba(${hexToRgb(t.accent2)},0.18) 62%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={14} style={{ color: t.accent }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Quick Access</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <QuickChip icon={FileText} label="Neue Notiz" color={t.accent} onClick={() => setView?.("notes")} />
          <QuickChip icon={CheckSquare} label="Task Board" color="#FF9F0A" onClick={() => setView?.("tasks")} />
          <QuickChip icon={Code} label="Code Editor" color="#30D158" onClick={() => setView?.("code")} />
          <QuickChip icon={GitBranch} label="Canvas" color={t.accent2} onClick={() => setView?.("canvas")} />
          <QuickChip icon={Bell} label="Reminders" color="#FF453A" onClick={() => setView?.("reminders")} />
        </div>
      </Glass>
    ),
    chart: (
      <Glass gradient style={{ padding: "16px 18px", background: `linear-gradient(145deg, rgba(${rgb},0.28), rgba(${hexToRgb(t.accent2)},0.2) 62%, rgba(255,255,255,0.03))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <BarChart3 size={14} style={{ color: t.accent }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Progress Pulse</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 6 }}>Notizen (7 Tage)</div>
            <Sparkline data={noteSpark} color={t.accent} height={36} />
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 6 }}>Tasks (7 Tage)</div>
            <Sparkline data={taskSpark} color="#30D158" height={36} />
          </div>
        </div>
      </Glass>
    ),
    calendar: (
      <Glass gradient style={{ padding: "16px 18px", background: "linear-gradient(145deg, rgba(255,159,10,0.26), rgba(255,69,58,0.18) 62%, rgba(255,255,255,0.03))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Calendar size={14} style={{ color: "#FF9F0A" }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Heute & Morgen</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {reminders
            .filter((r) => !r.done)
            .sort((a, b) => new Date(a.snoozeUntil || a.datetime).getTime() - new Date(b.snoozeUntil || b.datetime).getTime())
            .slice(0, 4)
            .map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </div>
                <div style={{ fontSize: 10, opacity: 0.52 }}>{fmtDt(r.snoozeUntil || r.datetime)}</div>
              </div>
            ))}
          {!reminders.filter((r) => !r.done).length ? (
            <div style={{ fontSize: 12, opacity: 0.35, textAlign: "center" }}>Keine offenen Erinnerungen</div>
          ) : null}
        </div>
      </Glass>
    ),
  };
}
