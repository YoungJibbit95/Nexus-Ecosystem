import type { CanvasNode, NodeType, Viewport } from "../../../store/canvasStore";
import { useCanvas } from "../../../store/canvasStore";
import type { MagicTemplateId, MagicTemplatePayload } from "../CanvasMagicModal";

export type CanvasTemplateContext = {
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  fitView: () => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowMagicBuilder?: (open: boolean) => void;
  setQuickAddPos?: (pos: { x: number; y: number } | null) => void;
};

const spawnNode = (
  type: NodeType,
  opts: {
    x: number;
    y: number;
    title?: string;
    patch?: Partial<CanvasNode>;
  },
) => {
  const state = useCanvas.getState();
  state.addNode(type, opts.x, opts.y);
  const active = state.getActiveCanvas();
  const created = active?.nodes[active.nodes.length - 1];
  if (!created) return null;
  const patch: Partial<CanvasNode> = { ...(opts.patch || {}) };
  if (opts.title) patch.title = opts.title;
  if (Object.keys(patch).length) state.updateNode(created.id, patch);
  return created.id;
};

const connectNodes = (links: Array<[string | null, string | null]>) => {
  const state = useCanvas.getState();
  links.forEach(([from, to]) => {
    if (from && to) state.addConnection(from, to);
  });
};

const estimateTemplateSize = (
  template: MagicTemplateId,
  depth?: MagicTemplatePayload["aiDepth"],
) => {
  if (template === "ai-project") {
    const spread = depth === "deep" ? 1900 : depth === "light" ? 1280 : 1540;
    return { w: spread, h: 1080 };
  }
  if (template === "roadmap") return { w: 1720, h: 1000 };
  if (template === "sprint") return { w: 1760, h: 1080 };
  if (template === "risk-matrix") return { w: 1520, h: 980 };
  if (template === "decision-flow") return { w: 1460, h: 980 };
  return { w: 1380, h: 980 };
};

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const spread = (count: number, gap: number) => {
  if (count <= 1) return [0];
  const start = (-gap * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => start + index * gap);
};

export function createStarterPack(
  context: CanvasTemplateContext,
  origin?: { x: number; y: number },
) {
  const centerX =
    origin?.x ?? (-context.viewport.panX + context.canvasSize.w * 0.42) / context.viewport.zoom;
  const centerY =
    origin?.y ?? (-context.viewport.panY + context.canvasSize.h * 0.36) / context.viewport.zoom;
  const root = spawnNode("project", {
    x: centerX,
    y: centerY,
    title: "Project Starter",
    patch: {
      color: "#5E5CE6",
      status: "doing",
      priority: "high",
      progress: 12,
      owner: "team",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      content: "Scope, KPI, Owner, Risiken und Next Steps",
    },
  });
  const brief = spawnNode("markdown", {
    x: centerX - 450,
    y: centerY - 90,
    title: "Project Brief",
    patch: {
      color: "#64D2FF",
      content:
        "```nexus-list\nScope | Must-have Features\nPrimary KPI | Adoption + Retention\nOwner | product + engineering\n```\n\n"
        + "```nexus-steps\nDiscovery | Zielbild fixieren\nBuild | Kernumsetzung liefern\nQA | Stabilität + UX sicherstellen\n```",
    },
  });
  const sprint = spawnNode("checklist", {
    x: centerX + 430,
    y: centerY - 70,
    title: "Sprint Execution",
    patch: { color: "#30D158" },
  });
  const risk = spawnNode("risk", {
    x: centerX - 130,
    y: centerY + 320,
    title: "Primary Risk",
    patch: {
      color: "#FF453A",
      status: "blocked",
      priority: "critical",
      owner: "lead",
    },
  });
  const milestone = spawnNode("milestone", {
    x: centerX + 320,
    y: centerY + 310,
    title: "Milestone #1",
    patch: {
      color: "#FF9F0A",
      status: "todo",
      dueDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    },
  });

  connectNodes([
    [root, brief],
    [root, sprint],
    [root, risk],
    [root, milestone],
  ]);

  if (sprint) {
    const state = useCanvas.getState();
    state.addChecklistItem(sprint, "Kickoff + Scope finalisieren");
    state.addChecklistItem(sprint, "API + UI Integration");
    state.addChecklistItem(sprint, "QA + UAT");
    state.addChecklistItem(sprint, "Launch Gate");
  }

  if (root) context.setSelectedNodeId(root);
  requestAnimationFrame(() => context.fitView());
}

export function createMagicTemplate(
  payload: MagicTemplatePayload,
  context: CanvasTemplateContext,
) {
  const state = useCanvas.getState();
  const activeCanvas = state.getActiveCanvas();
  const viewportCenterX =
    (-context.viewport.panX + context.canvasSize.w * 0.5) / context.viewport.zoom;
  const viewportCenterY =
    (-context.viewport.panY + context.canvasSize.h * 0.45) / context.viewport.zoom;

  const templateSize = estimateTemplateSize(payload.template, payload.aiDepth);
  const candidateOffsets: Array<[number, number]> = [[0, 0]];
  const ringStepX = Math.max(620, Math.round(templateSize.w * 0.56));
  const ringStepY = Math.max(460, Math.round(templateSize.h * 0.5));
  for (let ring = 1; ring <= 9; ring += 1) {
    const points = 8 + ring * 6;
    const radiusX = ringStepX * ring;
    const radiusY = ringStepY * ring;
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const jitter = index % 2 === 0 ? 0.16 : -0.1;
      candidateOffsets.push([
        Math.round(Math.cos(angle + jitter) * radiusX),
        Math.round(Math.sin(angle + jitter) * radiusY),
      ]);
    }
  }

  const overlapScore = (centerX: number, centerY: number) => {
    if (!activeCanvas?.nodes.length) return 0;
    const margin = 140;
    const left = centerX - templateSize.w * 0.5 - margin;
    const top = centerY - templateSize.h * 0.5 - margin;
    const right = centerX + templateSize.w * 0.5 + margin;
    const bottom = centerY + templateSize.h * 0.5 + margin;
    let score = 0;
    activeCanvas.nodes.forEach((node) => {
      const nodeLeft = node.x - 72;
      const nodeTop = node.y - 72;
      const nodeRight = node.x + node.width + 72;
      const nodeBottom = node.y + node.height + 72;
      const intersects =
        nodeLeft < right &&
        nodeRight > left &&
        nodeTop < bottom &&
        nodeBottom > top;
      if (!intersects) return;
      score += 1;
      const overlapW = Math.max(
        0,
        Math.min(right, nodeRight) - Math.max(left, nodeLeft),
      );
      const overlapH = Math.max(
        0,
        Math.min(bottom, nodeBottom) - Math.max(top, nodeTop),
      );
      score += (overlapW * overlapH) / (templateSize.w * templateSize.h + 1);
      const nodeCenterX = node.x + node.width * 0.5;
      const nodeCenterY = node.y + node.height * 0.5;
      const distX = Math.abs(nodeCenterX - centerX);
      const distY = Math.abs(nodeCenterY - centerY);
      const softRangeX = templateSize.w * 0.65;
      const softRangeY = templateSize.h * 0.62;
      if (distX < softRangeX && distY < softRangeY) {
        const proximity = 1 - Math.max(distX / softRangeX, distY / softRangeY);
        score += 0.6 * proximity;
      }
    });
    return score;
  };

  let centerX = viewportCenterX;
  let centerY = viewportCenterY;
  let bestScore = Number.POSITIVE_INFINITY;
  candidateOffsets.forEach(([dx, dy]) => {
    const candX = viewportCenterX + dx;
    const candY = viewportCenterY + dy;
    const score = overlapScore(candX, candY);
    if (score < bestScore) {
      bestScore = score;
      centerX = candX;
      centerY = candY;
    }
  });
  centerX = Math.round(centerX / 20) * 20;
  centerY = Math.round(centerY / 20) * 20;

  const mk = (
    type: NodeType,
    dx: number,
    dy: number,
    title?: string,
    patch?: Partial<CanvasNode>,
  ) => {
    const id = spawnNode(type, { x: centerX + dx, y: centerY + dy, title, patch });
    if (id) createdNodeIds.push(id);
    return id;
  };

  let rootId: string | null = null;
  const createdNodeIds: string[] = [];

  const resolveTemplateOverlaps = (anchorId?: string | null) => {
    const active = state.getActiveCanvas();
    if (!active || createdNodeIds.length < 2) return;

    const positions = new globalThis.Map<string, {
      x: number;
      y: number;
      width: number;
      height: number;
    }>();
    createdNodeIds.forEach((id) => {
      const node = active.nodes.find((item) => item.id === id);
      if (!node) return;
      positions.set(id, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      });
    });

    if (positions.size < 2) return;
    const ids = [...positions.keys()];
    const keepAnchor = anchorId && positions.has(anchorId) ? anchorId : null;
    const original = new globalThis.Map(
      ids.map((id) => {
        const pos = positions.get(id)!;
        return [id, { x: pos.x, y: pos.y }] as const;
      }),
    );

    for (let iter = 0; iter < 280; iter += 1) {
      let moved = false;
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const idA = ids[i];
          const idB = ids[j];
          const a = positions.get(idA);
          const b = positions.get(idB);
          if (!a || !b) continue;

          const pad = 56;
          const overlapX =
            Math.min(a.x + a.width + pad, b.x + b.width + pad) -
            Math.max(a.x - pad, b.x - pad);
          const overlapY =
            Math.min(a.y + a.height + pad, b.y + b.height + pad) -
            Math.max(a.y - pad, b.y - pad);
          if (overlapX <= 0 || overlapY <= 0) continue;

          moved = true;
          const centerAX = a.x + a.width * 0.5;
          const centerAY = a.y + a.height * 0.5;
          const centerBX = b.x + b.width * 0.5;
          const centerBY = b.y + b.height * 0.5;
          const splitByX = overlapX <= overlapY;
          const baseShift = (splitByX ? overlapX : overlapY) * 0.56 + 42;

          let shiftAX = 0;
          let shiftAY = 0;
          let shiftBX = 0;
          let shiftBY = 0;

          if (splitByX) {
            const dir = centerAX <= centerBX ? -1 : 1;
            shiftAX = dir * baseShift;
            shiftBX = -dir * baseShift;
          } else {
            const dir = centerAY <= centerBY ? -1 : 1;
            shiftAY = dir * baseShift;
            shiftBY = -dir * baseShift;
          }

          if (keepAnchor && idA === keepAnchor) {
            shiftBX += shiftAX;
            shiftBY += shiftAY;
            shiftAX = 0;
            shiftAY = 0;
          } else if (keepAnchor && idB === keepAnchor) {
            shiftAX += shiftBX;
            shiftAY += shiftBY;
            shiftBX = 0;
            shiftBY = 0;
          }

          a.x += shiftAX;
          a.y += shiftAY;
          b.x += shiftBX;
          b.y += shiftBY;
        }
      }
      if (!moved) break;
    }

    ids.forEach((id) => {
      const next = positions.get(id);
      const start = original.get(id);
      if (!next || !start) return;
      if (Math.abs(next.x - start.x) < 0.5 && Math.abs(next.y - start.y) < 0.5) return;
      state.moveNode(id, Math.round(next.x), Math.round(next.y));
    });
  };

  if (payload.template === "ai-project") {
    const prompt = (payload.aiPrompt || "").trim();
    const depth = payload.aiDepth || "balanced";
    const maxGoals = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
    const maxMilestones = depth === "light" ? 3 : depth === "deep" ? 6 : 4;
    const maxRisks = depth === "light" ? 2 : depth === "deep" ? 5 : 3;

    const tokens = prompt
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s-]/gi, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3);
    const stopWords = new Set([
      "with",
      "that",
      "this",
      "from",
      "into",
      "über",
      "oder",
      "aber",
      "project",
      "produkt",
      "projekt",
      "platform",
      "feature",
      "features",
      "system",
      "tool",
    ]);
    const freq = new globalThis.Map<string, number>();
    tokens.forEach((word) => {
      if (stopWords.has(word)) return;
      freq.set(word, (freq.get(word) || 0) + 1);
    });
    const keywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);

    const goalTitles =
      keywords.length > 0
        ? keywords.slice(0, maxGoals).map((word) => `Goal: ${word}`)
        : ["Goal: Product Value", "Goal: Delivery", "Goal: Quality"];
    const milestoneTitles = [
      "Milestone: Discovery",
      "Milestone: Architecture",
      "Milestone: Build",
      "Milestone: QA",
      "Milestone: Beta",
      "Milestone: Launch",
    ].slice(0, maxMilestones);
    const riskTitles = [
      "Risk: Scope Drift",
      "Risk: Integration Delay",
      "Risk: Performance Regression",
      "Risk: UX Adoption",
      "Risk: Quality Gap",
    ].slice(0, maxRisks);

    rootId = mk("project", 0, 0, payload.title, {
      color: "#5E5CE6",
      status: "doing",
      priority: "high",
      progress: 8,
      content: prompt
        ? `AI Prompt:\n${prompt}\n\nAuto-generated map with ${depth} depth.`
        : "AI-generated project map.",
    });

    const goalX = spread(goalTitles.length, 300);
    const milestoneX = spread(milestoneTitles.length, 280);
    const riskX = spread(riskTitles.length, 320);

    const goalIds = goalTitles.map((title, index) =>
      mk("goal", goalX[index] || 0, -320, title, {
        color: "#30D158",
        status: "todo",
        progress: 5 + index * 6,
        dueDate: day(14 + index * 7),
      }),
    );
    const milestoneIds = milestoneTitles.map((title, index) =>
      mk("milestone", milestoneX[index] || 0, 70, title, {
        color: "#FF9F0A",
        status: index === 0 ? "doing" : "todo",
        dueDate: day(5 + index * 6),
        progress: index === 0 ? 20 : 0,
      }),
    );
    const riskIds = riskTitles.map((title, index) =>
      mk("risk", riskX[index] || 0, 430, title, {
        color: "#FF453A",
        priority: index === 0 ? "critical" : "high",
        status: index === 0 ? "blocked" : "todo",
      }),
    );

    goalIds.forEach((goal) => connectNodes([[rootId, goal]]));
    milestoneIds.forEach((milestone) => connectNodes([[rootId, milestone]]));
    riskIds.forEach((risk) => connectNodes([[rootId, risk]]));

    if (payload.includeNotes) {
      const contextNode = mk("markdown", 650, -120, "AI Context Board", {
        color: "#64D2FF",
        content:
          "```nexus-list\nProblem | Welches Problem wird gelöst?\nPrimary User | Für wen bauen wir?\nSuccess Metric | Welche Metrik beweist Erfolg?\n```\n\n"
          + "```nexus-metrics\nActivation | 42% | +6%\nRetention D30 | 31% | +4%\nNPS | 58 | +5\n```\n\n"
          + "```nexus-progress\nDiscovery | 30\nDelivery Plan | 20\nQA Readiness | 10\n```\n\n"
          + "```nexus-timeline\nW1 | Scope + Discovery\nW2 | Architektur festziehen\nW3 | Kernfunktionen bauen\nW4 | QA + Hardening\nW5 | Rollout\n```",
      });
      connectNodes([[rootId, contextNode]]);
    }

    if (payload.includeTasks) {
      const execution = mk("checklist", 650, 260, "Execution Plan", {
        color: "#30D158",
      });
      if (execution) {
        [
          "Kickoff + Scope lock",
          "Architecture review",
          "Implementation sprint",
          "QA + hardening",
          "Go-live checklist",
        ]
          .slice(0, depth === "deep" ? 5 : 4)
          .forEach((task) => state.addChecklistItem(execution, task));
        connectNodes([[rootId, execution]]);
      }
    }
  }

  if (payload.template === "mindmap") {
    rootId = mk("project", 0, 0, payload.title, {
      color: "#64D2FF",
      progress: 12,
      status: "doing",
      content: "Vision, Scope, Kernfragen und Stakeholder",
    });
    const g1 = mk("goal", -460, -220, "Core Goal", {
      color: "#30D158",
      progress: 20,
      dueDate: day(14),
    });
    const g2 = mk("goal", 460, -220, "User Value", {
      color: "#5E5CE6",
      progress: 10,
      dueDate: day(21),
    });
    const d1 = mk("decision", 500, 180, "Open Decision", {
      color: "#BF5AF2",
    });
    const r1 = mk("risk", -500, 180, "Main Risk", {
      color: "#FF453A",
      priority: "high",
    });
    const m1 = mk("milestone", 0, -360, "Milestone #1", {
      color: "#FF9F0A",
      dueDate: day(7),
    });
    connectNodes([
      [rootId, g1],
      [rootId, g2],
      [rootId, d1],
      [rootId, r1],
      [rootId, m1],
    ]);

    if (payload.includeNotes) {
      const note = mk("markdown", 0, 360, "Knowledge Hub", {
        color: "#64D2FF",
        content:
          "```nexus-grid\n2\nVision\nStakeholder\nAbhängigkeiten\nOffene Fragen\n```\n\n"
          + "```nexus-steps\nDiscovery | Problem + Zielbild schärfen\nBuild | Kernumsetzung priorisieren\nReview | Entscheidung und Rollout freigeben\n```\n\n"
          + "```nexus-list\nOwner | @product\nRisiko-Level | Mittel\nNächstes Review | Freitag\n```\n\n"
          + "```nexus-timeline\nW1 | Discovery\nW2 | Architektur\nW3 | Umsetzung\nW4 | Review + Entscheidung\n```",
      });
      connectNodes([[rootId, note]]);
    }

    if (payload.includeTasks) {
      const checklist = mk("checklist", 580, 360, "Execution Checklist", {
        color: "#30D158",
      });
      if (checklist) {
        state.addChecklistItem(checklist, "Kickoff vorbereiten");
        state.addChecklistItem(checklist, "Scope finalisieren");
        state.addChecklistItem(checklist, "Metriken definieren");
        connectNodes([[rootId, checklist]]);
      }
    }
  }

  if (payload.template === "roadmap") {
    rootId = mk("project", 0, -20, payload.title, {
      color: "#30D158",
      progress: 18,
      status: "doing",
      content: "Roadmap-Owner, Zielbild, KPI und Scope",
    });
    const goal = mk("goal", -520, -40, "North Star", {
      color: "#64D2FF",
      dueDate: day(45),
      progress: 15,
    });
    const ms1 = mk("milestone", -240, -330, "Alpha", {
      color: "#FF9F0A",
      dueDate: day(10),
    });
    const ms2 = mk("milestone", 110, -330, "Beta", {
      color: "#FF9F0A",
      dueDate: day(24),
    });
    const ms3 = mk("milestone", 460, -330, "Launch", {
      color: "#FF9F0A",
      dueDate: day(40),
    });
    const timeline = mk("markdown", 560, 90, "Timeline", {
      color: "#BF5AF2",
      content:
        "```nexus-timeline\nPhase 1 | Discovery + Scope Lock\nPhase 2 | Core Build\nPhase 3 | Beta + QA\nPhase 4 | Launch + Monitoring\n```",
    });
    const risk = mk("risk", -520, 250, "Rollout Risk", {
      color: "#FF453A",
      priority: "critical",
    });
    connectNodes([
      [rootId, goal],
      [rootId, ms1],
      [rootId, ms2],
      [rootId, ms3],
      [rootId, timeline],
      [rootId, risk],
    ]);

    if (payload.includeNotes) {
      const brief = mk("markdown", 80, 360, "Roadmap Notes", {
        content:
          "```nexus-list\nOwners | Product + Eng\nDependencies | API, Design, QA\nGo-Live Gate | Performance + QA signoff\n```\n\n"
          + "```nexus-progress\nScope Fit | 70\nTeam Readiness | 60\nRelease Confidence | 45\n```",
      });
      connectNodes([[rootId, brief]]);
    }

    if (payload.includeTasks) {
      const todos = mk("checklist", 760, 250, "Launch Tasks");
      if (todos) {
        state.addChecklistItem(todos, "Launch Plan finalisieren");
        state.addChecklistItem(todos, "Go/No-Go Meeting");
        state.addChecklistItem(todos, "Post-Launch Monitoring");
        connectNodes([
          [rootId, todos],
          [ms3, todos],
        ]);
      }
    }
  }

  if (payload.template === "sprint") {
    rootId = mk("project", 20, -280, `${payload.title} Sprint`, {
      color: "#FF9F0A",
      status: "doing",
      progress: 30,
      content: "Sprint Goal, Capacity, Definition of Done",
    });
    const backlog = mk("checklist", -580, 30, "Backlog", {
      color: "#8E8E93",
    });
    const doing = mk("checklist", -190, 30, "Doing", { color: "#007AFF" });
    const review = mk("checklist", 200, 30, "Review", { color: "#BF5AF2" });
    const done = mk("checklist", 590, 30, "Done", { color: "#30D158" });
    connectNodes([
      [rootId, backlog],
      [rootId, doing],
      [rootId, review],
      [rootId, done],
    ]);

    if (backlog) {
      state.addChecklistItem(backlog, "Feature Spec schärfen");
      state.addChecklistItem(backlog, "Tech Spike");
    }
    if (doing) {
      state.addChecklistItem(doing, "Implementierung API");
      state.addChecklistItem(doing, "UI Integration");
    }
    if (review) state.addChecklistItem(review, "QA + Demo");
    if (done) state.addChecklistItem(done, "Definition of Done erfüllt");

    if (payload.includeNotes) {
      const standup = mk("markdown", 30, 380, "Daily Standup", {
        content:
          "```nexus-kanban\nYesterday | Erledigte Tasks + Ergebnis\nToday | Wichtigste 1-2 Deliverables\nBlocker | Owner + ETA für Entblockung\n```\n\n"
          + "```nexus-alert\ninfo\nSprint Scope bleibt stabil, neue Requests nur per Tradeoff-Entscheidung.\n```",
      });
      connectNodes([[rootId, standup]]);
    }

    if (payload.includeTasks) {
      const risk = mk("risk", -400, 380, "Sprint Risk", {
        priority: "high",
        color: "#FF453A",
      });
      connectNodes([[rootId, risk]]);
    }
  }

  if (payload.template === "risk-matrix") {
    rootId = mk("project", 0, -290, `${payload.title} Risk Matrix`, {
      color: "#FF453A",
      status: "doing",
      content: "Risiken priorisieren und mitigieren",
    });
    const rLow = mk("risk", -540, 20, "Low Impact / Low Prob", {
      priority: "low",
      status: "todo",
    });
    const rMed = mk("risk", -180, 20, "High Prob / Low Impact", {
      priority: "mid",
      status: "todo",
    });
    const rHigh = mk("risk", 180, 20, "Low Prob / High Impact", {
      priority: "high",
      status: "doing",
    });
    const rCritical = mk("risk", 540, 20, "High Impact / High Prob", {
      priority: "critical",
      status: "blocked",
      color: "#FF453A",
    });
    connectNodes([
      [rootId, rLow],
      [rootId, rMed],
      [rootId, rHigh],
      [rootId, rCritical],
    ]);

    const matrix = mk("markdown", 100, 350, "Matrix Legende", {
      content:
        "```nexus-grid\n2\nNiedriger Impact\nHoher Impact\nNiedrige Wahrscheinlichkeit\nHohe Wahrscheinlichkeit\n```\n\n"
        + "```nexus-quadrant\nQuick Wins | Sofort umsetzen\nBig Bets | Planen + absichern\nFill-ins | Opportunistisch einplanen\nAvoid | Vorerst aus Scope nehmen\n```\n\n"
        + "```nexus-list\nCritical Risiken | Tägliches Tracking\nHigh Risiken | 2x pro Woche Review\nOwner Pflicht | Ja, für jedes Risiko\n```\n\n"
        + "```nexus-alert\nwarning\nFür alle Critical-Risiken innerhalb von 24h einen Mitigation-Owner setzen.\n```",
    });
    connectNodes([[rootId, matrix]]);
  }

  if (payload.template === "decision-flow") {
    rootId = mk("decision", 0, -80, `${payload.title} Entscheidung`, {
      color: "#BF5AF2",
      status: "doing",
      priority: "high",
      content: "Welche Option erfüllt Ziel + Risiken am besten?",
    });
    const optA = mk("markdown", -440, -20, "Option A", {
      content:
        "```nexus-card\nOption A|Schneller Start|Mehr technisches Risiko\n```",
      color: "#64D2FF",
    });
    const optB = mk("markdown", 440, -20, "Option B", {
      content:
        "```nexus-card\nOption B|Stabiler Rollout|Höherer Initialaufwand\n```",
      color: "#30D158",
    });
    const criteria = mk("checklist", 0, 230, "Kriterien", {
      color: "#FF9F0A",
    });
    const next = mk("milestone", 0, 450, "Nächster Schritt", {
      dueDate: day(5),
      status: "todo",
    });
    const risk = mk("risk", -450, 400, "Tradeoff Risk", {
      priority: "high",
    });
    const outcome = mk("goal", 450, 400, "Expected Outcome", {
      progress: 5,
      dueDate: day(30),
    });
    connectNodes([
      [rootId, optA],
      [rootId, optB],
      [rootId, criteria],
      [criteria, next],
      [rootId, risk],
      [rootId, outcome],
    ]);
    if (criteria) {
      state.addChecklistItem(criteria, "User Impact");
      state.addChecklistItem(criteria, "Engineering Effort");
      state.addChecklistItem(criteria, "Risk / Compliance");
    }
  }

  resolveTemplateOverlaps(rootId);
  if (rootId) context.setSelectedNodeId(rootId);
  context.setShowMagicBuilder?.(false);
  context.setQuickAddPos?.(null);
  window.setTimeout(() => context.fitView(), 80);
}
