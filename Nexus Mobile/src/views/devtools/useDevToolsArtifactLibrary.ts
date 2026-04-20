import { useCallback, useState } from "react";
import {
  createDevToolsArtifact,
  sortDevToolsArtifacts,
  type DevToolsArtifact,
  type DevToolsArtifactDraft,
} from "@nexus/core/devtools";

const STORAGE_KEY = "nexus.devtools.artifacts.v1";

const isArtifact = (value: unknown): value is DevToolsArtifact => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DevToolsArtifact;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const readArtifacts = () => {
  if (typeof window === "undefined") return [] as DevToolsArtifact[];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortDevToolsArtifacts(parsed.filter(isArtifact));
  } catch {
    return [];
  }
};

const writeArtifacts = (artifacts: DevToolsArtifact[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
};

export function useDevToolsArtifactLibrary() {
  const [artifacts, setArtifacts] = useState<DevToolsArtifact[]>(() =>
    readArtifacts(),
  );

  const persist = useCallback((next: DevToolsArtifact[]) => {
    setArtifacts(next);
    writeArtifacts(next);
    return next;
  }, []);

  const saveArtifact = useCallback(
    (draft: DevToolsArtifactDraft) => {
      const existing = artifacts.find((item) => item.id === draft.id);
      const now = new Date().toISOString();
      const next = existing
        ? {
            ...existing,
            ...draft,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          }
        : createDevToolsArtifact(draft);
      persist(sortDevToolsArtifacts([next, ...artifacts.filter((item) => item.id !== next.id)]).slice(0, 60));
      return next;
    },
    [artifacts, persist],
  );

  const removeArtifact = useCallback(
    (id: string) => {
      persist(artifacts.filter((item) => item.id !== id));
    },
    [artifacts, persist],
  );

  const replaceArtifacts = useCallback(
    (next: DevToolsArtifact[]) => {
      persist(sortDevToolsArtifacts(next).slice(0, 60));
    },
    [persist],
  );

  const clearArtifacts = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    artifacts,
    saveArtifact,
    removeArtifact,
    replaceArtifacts,
    clearArtifacts,
  };
}

