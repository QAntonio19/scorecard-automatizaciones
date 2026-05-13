"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import { ItProjectFormFields } from "@/components/it-projects/ItProjectFormFields";
import { useCanEdit } from "@/hooks/useCanEdit";
import { useItProjectResponsableOptions } from "@/hooks/useItProjectResponsableOptions";
import {
  invalidateNotionProjectsCache,
  notionPatchResponseToProject,
  refetchNotionProjectsListBestEffort,
  upsertNotionProjectInCache,
  upsertUserProject,
} from "@/lib/itProjectsLocalStore";
import {
  buildNotionTaskLinePatchBodies,
  isoDateInputField,
  mergeFormProjectDescriptionAfterNotionPatch,
  mergePendingSprintDraft,
  mergePlannedTaskDescriptionsFromRows,
  pmNameStringToSelections,
  type CoreFormErrorKeys,
  type ItProjectTaskFormRow,
} from "@/lib/itProjectFormShared";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import { sortPmNamesByOptionsOrder } from "@/lib/itProjectResponsablesLocal";
import type { ItProject, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

type Props = { initialProject: ItProject };

export function EditItProjectForm({ initialProject }: Props) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const isNotion = isLikelyNotionPageId(initialProject.id);
  const responsableOptions = useItProjectResponsableOptions();
  const pmSelectOptions = useMemo<FormStyledSelectOption<string>[]>(
    () => responsableOptions.map((n) => ({ value: n, label: n })),
    [responsableOptions],
  );

  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(
    initialProject.description === "—" ? "" : initialProject.description,
  );
  const [phase, setPhase] = useState(initialProject.phase);
  const [pmNames, setPmNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(isoDateInputField(initialProject.startDate));
  const [targetEndDate, setTargetEndDate] = useState(isoDateInputField(initialProject.targetEndDate));
  const [riskLevel, setRiskLevel] = useState<string>(initialProject.riskLevel);
  const [urgencyLevel, setUrgencyLevel] = useState<string>(initialProject.urgencyLevel ?? "media");

  const [keyResultLines, setKeyResultLines] = useState(
    initialProject.keyResults.map((k) => ({ id: k.id, text: k.title })),
  );
  const [keyResultDraft, setKeyResultDraft] = useState("");
  const [taskLines, setTaskLines] = useState<ItProjectTaskFormRow[]>(() =>
    initialProject.plannedTasks.map((t) => {
      const sidRaw = typeof t.sprintId === "string" ? t.sprintId.trim() : "";
      const hasNotionSid = sidRaw !== "" && isLikelyNotionPageId(sidRaw);
      const sprintListed =
        hasNotionSid && initialProject.sprints.some((s) => s.id === sidRaw);

      const row: ItProjectTaskFormRow = {
        id: t.id,
        text: t.title,
      };
      if (hasNotionSid) row.sprintRowId = sidRaw;
      if (hasNotionSid && !sprintListed && t.sprintTitle?.trim()) {
        row.sprintLabelHint = t.sprintTitle.trim();
      }
      if (t.description?.trim()) row.description = t.description.trim();
      return row;
    }),
  );

  const notionOriginSprintByTaskId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const pt of initialProject.plannedTasks) {
      map.set(pt.id, typeof pt.sprintId === "string" ? pt.sprintId.trim() : undefined);
    }
    return map;
  }, [initialProject]);
  const [taskDraft, setTaskDraft] = useState("");
  const [sprintRows, setSprintRows] = useState(
    initialProject.sprints.map((s) => ({
      id: s.id,
      title: s.title,
      timeframe: s.timeframe?.trim() ?? "",
    })),
  );
  const [sprintTitleDraft, setSprintTitleDraft] = useState("");
  const [sprintPeriodStartDraft, setSprintPeriodStartDraft] = useState("");
  const [sprintPeriodEndDraft, setSprintPeriodEndDraft] = useState("");
  const [sprintPeriodDraftError, setSprintPeriodDraftError] = useState<string | null>(null);
  const [errors, setErrors] = useState<CoreFormErrorKeys>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPmNames(pmNameStringToSelections(initialProject.pmName, responsableOptions));
  }, [initialProject.pmName, responsableOptions]);

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

    if (canEdit !== true) {
      setSubmitError("No tienes permisos para editar proyectos.");
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

    const pmOrdered =
      pmNames.length > 0 ? sortPmNamesByOptionsOrder(pmNames, responsableOptions).join(", ") : "—";

    setPending(true);
    try {
      if (isNotion) {
        const res = await fetch(`/api/notion/projects/${encodeURIComponent(initialProject.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || "",
            phase,
            riskLevel: riskSel,
            urgencyLevel: urgencySel,
            pmNames: pmNames.length > 0 ? pmNames : [],
            keyResultLines: keyResultLines.map((row) => ({ id: row.id, text: row.text.trim() })),
            taskLines: buildNotionTaskLinePatchBodies(taskLines, notionOriginSprintByTaskId),
            sprintRows: sprintRowsForSave.map((row) => ({
              id: row.id,
              title: row.title.trim(),
              ...(row.timeframe.trim() ? { timeframe: row.timeframe.trim() } : {}),
            })),
          }),
        });
        const payload: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as { error: unknown }).error === "string"
              ? (payload as { error: string }).error
              : "No se pudo actualizar el proyecto en Notion.";
          setSubmitError(msg);
          return;
        }
        const patched = notionPatchResponseToProject(payload);
        if (patched) {
          upsertNotionProjectInCache(
            mergePlannedTaskDescriptionsFromRows(
              mergeFormProjectDescriptionAfterNotionPatch(patched, description),
              taskLines,
            ),
          );
          refetchNotionProjectsListBestEffort();
        } else {
          invalidateNotionProjectsCache();
        }
        router.push(`/proyectos/${encodeURIComponent(initialProject.id)}`);
        return;
      }

      const nextProject: ItProject = {
        ...initialProject,
        name: name.trim(),
        description: description.trim() || "—",
        phase,
        pmName: pmOrdered,
        startDate: startDate || "—",
        targetEndDate: targetEndDate || "—",
        riskLevel: riskSel,
        urgencyLevel: urgencySel,
        keyResults: keyResultLines.map((row) => ({ id: row.id, title: row.text })),
        plannedTasks: taskLines.map((row) => {
          const title = row.text.trim();
          const sid = row.sprintRowId?.trim();
          const desc = row.description?.trim();
          let planned: (typeof nextProject)["plannedTasks"][number] = { id: row.id, title };
          if (desc) planned = { ...planned, description: desc };
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
      upsertUserProject(nextProject);
      invalidateNotionProjectsCache();
      router.push(`/proyectos/${encodeURIComponent(initialProject.id)}`);
    } catch {
      setSubmitError("No se pudieron guardar los cambios.");
    } finally {
      setPending(false);
    }
  };

  const cancelHref = `/proyectos/${encodeURIComponent(initialProject.id)}`;

  return (
    <ItProjectFormFields
      formIdPrefix={`itp-edit-${initialProject.id.slice(0, 8)}`}
      heading="Editar proyecto"
      mutateSecondaryWrites={true}
      datesEditable={!isNotion}
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
      cancelHref={cancelHref}
      submitLabel="Guardar cambios"
      pending={pending}
      canSubmit={canEdit === true}
      submitDisabledTitle={canEdit !== true ? "No tienes permisos de edición" : undefined}
      onSubmit={onSubmit}
    />
  );
}
