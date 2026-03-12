import type {
  BulkImportLogInput,
  BulkImportTaskInput,
  MaintenanceLog,
  MaintenanceStatus,
  MaintenanceTask,
  MaintenanceTaskType,
  RecurrenceUnit,
} from "@/lib/maintenance";

export type TaskFilter = "all" | MaintenanceStatus | "active_schedule";

export type TaskFormState = {
  title: string;
  category: string;
  description: string;
  taskType: MaintenanceTaskType;
  recurrenceValue: string;
  recurrenceUnit: RecurrenceUnit;
  anchorDate: string;
  fixedDueDate: string;
  dueSoonDays: string;
  notes: string;
};

export type LogFormState = {
  performedAt: string;
  note: string;
};

export type ImportPreview = {
  headers: string[];
  errors: string[];
  taskRows: BulkImportTaskInput[];
  logRows: BulkImportLogInput[];
};

export type DecoratedMaintenanceTask = MaintenanceTask & {
  derivedStatus: MaintenanceStatus;
  derivedLastCompletedAt: string | null;
  derivedNextDueAt: string | null;
  logs: MaintenanceLog[];
};

export type MaintenanceStats = {
  total: number;
  overdue: number;
  dueSoon: number;
  upToDate: number;
  unscheduled: number;
};
