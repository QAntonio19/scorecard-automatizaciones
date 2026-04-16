import { HttpError } from "../httpError.js";
import { listAllAutomations } from "../store.js";
import type {
  AutomationDetailResponse,
  AutomationListItem,
  AutomationRecord,
  AutomationsListResponse,
} from "../types.js";
import type { ListAutomationsQuery } from "../validation.js";

function toListItem(record: AutomationRecord): AutomationListItem {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    status: record.status,
    schedule: record.schedule,
    lastRunAt: record.lastRunAt,
    nextRunAt: record.nextRunAt,
    owner: record.owner,
    technologies: record.technologies,
  };
}

export function listAutomations(query: ListAutomationsQuery): AutomationsListResponse {
  let items = listAllAutomations();

  if (query.status) {
    items = items.filter((a) => a.status === query.status);
  }

  if (query.q) {
    const needle = query.q.toLowerCase();
    items = items.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle) ||
        a.category.toLowerCase().includes(needle) ||
        a.owner.toLowerCase().includes(needle) ||
        a.technologies.some((t) => t.toLowerCase().includes(needle)),
    );
  }

  return {
    items: items.map(toListItem),
    total: items.length,
  };
}

export function getAutomationById(id: string): AutomationDetailResponse {
  const found = listAllAutomations().find((a) => a.id === id);
  if (!found) {
    throw new HttpError(404, "NOT_FOUND", "Automatización no encontrada.");
  }
  return found;
}
