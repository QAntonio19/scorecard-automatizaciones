export type AutomationStatus = "activa" | "pausada" | "error" | "borrador";

export interface AutomationRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  status: AutomationStatus;
  schedule: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  owner: string;
  technologies: string[];
  endpointOrFlow: string | null;
  runsLast30Days: number;
  successRate: number;
  notes: string | null;
}

export interface AutomationListItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: AutomationStatus;
  schedule: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  owner: string;
  technologies: string[];
}

export interface AutomationsListResponse {
  items: AutomationListItem[];
  total: number;
}

export type AutomationDetailResponse = AutomationRecord;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
