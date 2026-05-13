"use client";

import { useEffect, useMemo, useState } from "react";
import { useMergedItProjects, withNotionDescriptionOverlayIfMissing } from "@/lib/itProjectsLocalStore";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import type { ItProject } from "@/lib/itProjectTypes";

/**
 * Resuelve un proyecto desde el merge cliente + opcional bypass GET Notion por id de página,
 * igual que `ItProjectDetailView` (lista local / fetch directo).
 */
export function useResolvedItProject(id: string): {
  loading: boolean;
  /** Proyecto resuelto; `undefined` si aún cargando o no existe. */
  project: ItProject | undefined;
} {
  const { projects, ready } = useMergedItProjects();
  const fromList = useMemo(() => {
    const p = projects.find((x) => x.id === id);
    return p ? withNotionDescriptionOverlayIfMissing(p) : undefined;
  }, [projects, id]);

  const [notionDirect, setNotionDirect] = useState<ItProject | null>(null);
  const [notionBypassSettled, setNotionBypassSettled] = useState(false);

  useEffect(() => {
    setNotionDirect(null);

    if (!ready) {
      setNotionBypassSettled(false);
      return;
    }

    if (fromList) {
      setNotionBypassSettled(true);
      return;
    }

    if (!isLikelyNotionPageId(id)) {
      setNotionBypassSettled(true);
      return;
    }

    setNotionBypassSettled(false);

    let cancelled = false;
    void fetch(`/api/notion/projects/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data: unknown = await res.json();
        if (typeof data !== "object" || data === null || !("project" in data)) {
          return null;
        }
        const proj = (data as { project: unknown }).project;
        if (!proj || typeof proj !== "object") return null;
        return proj as ItProject;
      })
      .then((proj) => {
        if (!cancelled && proj) setNotionDirect(withNotionDescriptionOverlayIfMissing(proj));
      })
      .finally(() => {
        if (!cancelled) setNotionBypassSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, id, fromList]);

  const p = fromList ?? notionDirect ?? undefined;

  const waitingBypass = ready && isLikelyNotionPageId(id) && !fromList && !notionBypassSettled;
  const loading = !ready || waitingBypass;

  return { loading, project: loading ? undefined : p };
}
