"use client";

import { useEffect, useMemo, useState } from "react";
import { IT_PROJECTS_SEED } from "@/data/it-projects.seed";
import type { ItProject } from "@/lib/itProjectTypes";

export const IT_PROJECTS_USER_STORAGE_KEY = "scorecard-it-projects-user-v1";

export const IT_PROJECTS_CHANGED_EVENT = "scorecard-it-projects-changed";

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === "string");
}

function isItProjectRecord(x: unknown): x is ItProject {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.code !== "string" ||
    typeof o.name !== "string" ||
    typeof o.description !== "string"
  ) {
    return false;
  }
  if (o.linkedWorkflowIds !== undefined && !isStringArray(o.linkedWorkflowIds)) return false;
  return true;
}

export function readUserProjects(): ItProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IT_PROJECTS_USER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isItProjectRecord);
  } catch {
    return [];
  }
}

export function writeUserProjects(projects: ItProject[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IT_PROJECTS_USER_STORAGE_KEY, JSON.stringify(projects));
}

/** Combina seed y proyectos creados en el navegador; si hay mismo `id`, gana el del usuario. */
export function mergeItProjectsWithSeed(seed: ItProject[], user: ItProject[]): ItProject[] {
  const map = new Map<string, ItProject>();
  for (const p of seed) map.set(p.id, p);
  for (const p of user) map.set(p.id, p);
  return [...map.values()];
}

export function appendUserProject(project: ItProject): void {
  const cur = readUserProjects();
  writeUserProjects([...cur, project]);
  window.dispatchEvent(new CustomEvent(IT_PROJECTS_CHANGED_EVENT));
}

export function useMergedItProjects(): { projects: ItProject[]; ready: boolean; error?: string } {
  const [mounted, setMounted] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [user, setUser] = useState<ItProject[]>([]);
  const [notionData, setNotionData] = useState<ItProject[]>(IT_PROJECTS_SEED);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setUser(readUserProjects());
    };
    sync();
    window.addEventListener(IT_PROJECTS_CHANGED_EVENT, sync);
    
    // Fetch from Notion API
    fetch("/api/notion/projects")
      .then(res => {
        if (!res.ok) throw new Error("Error HTTP");
        return res.json();
      })
      .then(data => {
        if (data.projects) {
          setNotionData(data.projects);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(err => {
        console.error("Error fetching Notion projects:", err);
        setError("Error fetching Notion projects");
      })
      .finally(() => {
        setFetching(false);
      });

    return () => {
      window.removeEventListener(IT_PROJECTS_CHANGED_EVENT, sync);
    };
  }, []);

  const projects = useMemo(() => {
    return mergeItProjectsWithSeed(notionData, user);
  }, [notionData, user]);

  return { projects, ready: mounted && !fetching, error };
}
