"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import { ItProjectFormFields } from "@/components/it-projects/ItProjectFormFields";
import { useCanEdit } from "@/hooks/useCanEdit";
import { useItProjectResponsableOptions } from "@/hooks/useItProjectResponsableOptions";
import {
  mergePendingSprintDraft,
  type CoreFormErrorKeys,
  type ItProjectTaskFormRow,
} from "@/lib/itProjectFormShared";
import { appendUserProject, invalidateNotionProjectsCache } from "@/lib/itProjectsLocalStore";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import { sortPmNamesByOptionsOrder } from "@/lib/itProjectResponsablesLocal";
import type { ItProject, ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `itp-${crypto.randomUUID()}`;
  }
  return `itp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function autoProjectCodeForLocalId(internalId: string): string {
  const withoutPrefix = internalId.replace(/^itp-/i, "");
  const segment = withoutPrefix.split("-")[0] ?? "";
  const base = /^[a-fA-F0-9]{8}$/.test(segment)
    ? segment.toUpperCase()
    : withoutPrefix.replace(/-/g, "").slice(0, 8).toUpperCase().padEnd(8, "0");
  return `PRJ-${base}`.slice(0, 40);
}

function isCreateNotionResponseOk(data: unknown): data is { id: string } {
  return typeof data === "object" && data !== null && typeof (data as { id: unknown }).id === "string";
}

function isNotionNotConfiguredPayload(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: unknown }).code === "NOTION_NOT_CONFIGURED"
  );
}

export function CreateItProjectForm() {
  const canEdit = useCanEdit();
  const router = useRouter();
  const responsableOptions = useItProjectResponsableOptions();
  const pmSelectOptions = useMemo<FormStyledSelectOption<string>[]>(
    () => responsableOptions.map((n) => ({ value: n, label: n })),
    [responsableOptions],
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ItProjectPhase>("sin_empezar");
  const [pmNames, setPmNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");

  const [keyResultLines, setKeyResultLines] = useState<{ id: string; text: string }[]>([]);
  const [keyResultDraft, setKeyResultDraft] = useState("");
  const [taskLines, setTaskLines] = useState<ItProjectTaskFormRow[]>([]);
  const [taskDraft, setTaskDraft] = useState("");
  const [sprintRows, setSprintRows] = useState<{ id: string; title: string; timeframe: string }[]>([]);
  const [sprintTitleDraft, setSprintTitleDraft] = useState("");
  const [sprintPeriodStartDraft, setSprintPeriodStartDraft] = useState("");
  const [sprintPeriodEndDraft, setSprintPeriodEndDraft] = useState("");
  const [sprintPeriodDraftError, setSprintPeriodDraftError] = useState<string | null>(null);
  const [errors, setErrors] = useState<CoreFormErrorKeys>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const validate = (): boolean => {
    const next: CoreFormErrorKeys = {};
    if (!name.trim()) next.name = "El nombre es obligatorio.";
    if (!riskLevel.trim()) next.risk = "Selecciona nivel de riesgo.";
    if (!urgencyLevel.trim()) next.urgency = "Selecciona nivel de urgencia.";
    if (responsableOptions.length > 0 && pmNames.length === 0) {
      next.pm = "Selecciona al menos un responsable.";
    }
    if (startDate && targetEndDate && targetEndDate < startDate) {
      next.dates = "La fecha de fin debe ser posterior al inicio.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!canEdit) {
      setSubmitError("No tienes permisos para crear proyectos.");
      return;
    }
    if (!validate()) return;

    const sprintFlush = mergePendingSprintDraft({
      rows: sprintRows,
      titleDraft: sprintTitleDraft,
      startDraft: sprintPeriodStartDraft,
      endDraft: sprintPeriodEndDraft,
    });
    if (!sprintFlush.ok) {
      setSprintPeriodDraftError(sprintFlush.error);
      return;
    }
    const sprintRowsForSave = sprintFlush.rows;
    if (sprintFlush.mergedFromDraft) {
      setSprintRows(sprintRowsForSave);
      setSprintTitleDraft("");
      setSprintPeriodStartDraft("");
      setSprintPeriodEndDraft("");
      setSprintPeriodDraftError(null);
    }

    const riskSel = riskLevel.trim() as ItProjectRisk;
    const urgencySel = urgencyLevel.trim() as ItProjectUrgency;

    const id = newId();
    const pmDisplay =
      pmNames.length > 0
        ? sortPmNamesByOptionsOrder(pmNames, responsableOptions).join(", ")
        : "—";

    const project: ItProject = {
      id,
      code: autoProjectCodeForLocalId(id),
      name: name.trim(),
      description: description.trim() || "—",
      phase,
      sponsor: "—",
      pmName: pmDisplay,
      startDate: startDate || "—",
      targetEndDate: targetEndDate || "—",
      riskLevel: riskSel,
      urgencyLevel: urgencySel,
      milestones: [],
      keyResults: keyResultLines.map((row) => ({ id: row.id, title: row.text })),
      plannedTasks: taskLines.map((row) => {
        const sid = row.sprintRowId?.trim();
        const desc = row.description?.trim();
        const planned: ItProject["plannedTasks"][number] = {
          id: row.id,
          title: row.text,
          ...(desc ? { description: desc } : {}),
        };
        if (!sid || !isLikelyNotionPageId(sid)) return planned;
        const sp = sprintRowsForSave.find((s) => s.id === sid);
        return {
          ...planned,
          sprintId: sid,
          ...(sp ? { sprintTitle: sp.title } : row.sprintLabelHint ? { sprintTitle: row.sprintLabelHint } : {}),
        };
      }),
      sprints: sprintRowsForSave.map((row) => ({
        id: row.id,
        title: row.title,
        ...(row.timeframe.trim() ? { timeframe: row.timeframe.trim() } : {}),
      })),
      deliverables: [],
    };

    setPending(true);
    try {
      const res = await fetch("/api/notion/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: description.trim() || undefined,
          phase: project.phase,
          riskLevel: project.riskLevel,
          urgencyLevel: project.urgencyLevel,
          pmNames: pmNames.length > 0 ? pmNames : undefined,
          ...(keyResultLines.length > 0
            ? { keyResultLines: keyResultLines.map((row) => ({ id: row.id, text: row.text.trim() })) }
            : {}),
          ...(sprintRowsForSave.length > 0
            ? {
                sprintRows: sprintRowsForSave.map((row) => ({
                  id: row.id,
                  title: row.title.trim(),
                  ...(row.timeframe.trim() ? { timeframe: row.timeframe.trim() } : {}),
                })),
              }
            : {}),
          ...(taskLines.some((t) => t.text.trim())
            ? {
                taskLines: taskLines
                  .filter((t) => t.text.trim())
                  .map((row) => {
                    const text = row.text.trim();
                    const sid = row.sprintRowId?.trim();
                    if (!sid) return { id: row.id, text };
                    return { id: row.id, text, sprintId: sid };
                  }),
              }
            : {}),
        }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && res.status === 201 && isCreateNotionResponseOk(data)) {
        invalidateNotionProjectsCache();
        router.push(`/proyectos/${encodeURIComponent(data.id)}`);
        return;
      }

      if (res.status === 503 && isNotionNotConfiguredPayload(data)) {
        appendUserProject(project);
        invalidateNotionProjectsCache();
        router.push(`/proyectos/${encodeURIComponent(project.id)}?soloNavegador=1`);
        return;
      }

      const apiMessage =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      setSubmitError(apiMessage ?? "No se pudo crear el proyecto en Notion.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo guardar el proyecto.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ItProjectFormFields
      formIdPrefix="itp-new"
      heading="Datos del proyecto"
      mutateSecondaryWrites
      datesEditable
      name={name}
      setName={setName}
      description={description}
      setDescription={setDescription}
      riskLevel={riskLevel}
      setRiskLevel={setRiskLevel}
      urgencyLevel={urgencyLevel}
      setUrgencyLevel={setUrgencyLevel}
      phase={phase}
      setPhase={setPhase}
      pmNames={pmNames}
      setPmNames={setPmNames}
      startDate={startDate}
      setStartDate={setStartDate}
      targetEndDate={targetEndDate}
      setTargetEndDate={setTargetEndDate}
      keyResultLines={keyResultLines}
      setKeyResultLines={setKeyResultLines}
      keyResultDraft={keyResultDraft}
      setKeyResultDraft={setKeyResultDraft}
      taskLines={taskLines}
      setTaskLines={setTaskLines}
      taskDraft={taskDraft}
      setTaskDraft={setTaskDraft}
      sprintRows={sprintRows}
      setSprintRows={setSprintRows}
      sprintTitleDraft={sprintTitleDraft}
      setSprintTitleDraft={setSprintTitleDraft}
      sprintPeriodStartDraft={sprintPeriodStartDraft}
      setSprintPeriodStartDraft={setSprintPeriodStartDraft}
      sprintPeriodEndDraft={sprintPeriodEndDraft}
      setSprintPeriodEndDraft={setSprintPeriodEndDraft}
      sprintPeriodDraftError={sprintPeriodDraftError}
      setSprintPeriodDraftError={setSprintPeriodDraftError}
      pmSelectOptions={pmSelectOptions}
      errors={errors}
      submitError={submitError}
      cancelHref="/proyectos"
      submitLabel="Crear proyecto"
      pending={pending}
      canSubmit={canEdit === true}
      submitDisabledTitle={canEdit !== true ? "No tienes permisos de edición" : undefined}
      onSubmit={onSubmit}
    />
  );
}
