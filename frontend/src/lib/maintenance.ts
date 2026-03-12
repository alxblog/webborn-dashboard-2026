import type {
  MaintenanceLogsResponse,
  MaintenanceTasksResponse,
} from "@/lib/pocketbase-types";
import { pb } from "@/lib/pocketbase";

export type MaintenanceTask = MaintenanceTasksResponse;
export type MaintenanceLog = MaintenanceLogsResponse;
export type MaintenanceTaskType = MaintenanceTask["task_type"];
export type MaintenanceStatus = MaintenanceTask["status"];
export type RecurrenceUnit = NonNullable<MaintenanceTask["recurrence_unit"]>;

type TaskScheduleState = {
  lastCompletedAt: string | null;
  nextDueAt: string | null;
  status: MaintenanceStatus;
};

type CreateTaskInput = {
  title: string;
  description?: string;
  category?: string;
  taskType: MaintenanceTaskType;
  recurrenceUnit?: RecurrenceUnit;
  recurrenceValue?: number;
  anchorDate?: string;
  fixedDueDate?: string;
  dueSoonDays?: number;
  notes?: string;
};

type CreateLogInput = {
  taskId: string;
  performedAt: string;
  note?: string;
  performedBy?: string;
};

export type BulkImportTaskInput = CreateTaskInput;
export type UpdateTaskInput = CreateTaskInput;
export type BulkImportLogInput = {
  taskTitle: string;
  performedAt: string;
  note?: string;
};

const DEFAULT_DUE_SOON_DAYS = 14;

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(date: Date | null) {
  return date ? date.toISOString() : null;
}

function addInterval(date: Date, value: number, unit: RecurrenceUnit) {
  const next = new Date(date);

  if (unit === "day") {
    next.setDate(next.getDate() + value);
    return next;
  }

  if (unit === "week") {
    next.setDate(next.getDate() + value * 7);
    return next;
  }

  if (unit === "month") {
    next.setMonth(next.getMonth() + value);
    return next;
  }

  next.setFullYear(next.getFullYear() + value);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLatestLog(logs: MaintenanceLog[]) {
  const sortedLogs = [...logs].sort((left, right) =>
    right.performed_at.localeCompare(left.performed_at)
  );

  return sortedLogs[0] ?? null;
}

export function computeTaskScheduleState(
  task: Pick<
    MaintenanceTask,
    | "task_type"
    | "recurrence_unit"
    | "recurrence_value"
    | "anchor_date"
    | "fixed_due_date"
    | "due_soon_days"
  >,
  logs: MaintenanceLog[],
  now = new Date()
): TaskScheduleState {
  const latestLog = getLatestLog(logs);
  const lastCompletedAt = latestLog?.performed_at ?? null;
  const dueSoonDays = task.due_soon_days || DEFAULT_DUE_SOON_DAYS;
  const today = startOfDay(now);

  if (task.task_type === "log_only") {
    return {
      lastCompletedAt,
      nextDueAt: null,
      status: "unscheduled",
    };
  }

  if (task.task_type === "one_off") {
    if (latestLog) {
      return {
        lastCompletedAt,
        nextDueAt: null,
        status: "up_to_date",
      };
    }

    const fixedDueDate = toDate(task.fixed_due_date);
    if (!fixedDueDate) {
      return {
        lastCompletedAt,
        nextDueAt: null,
        status: "unscheduled",
      };
    }

    const nextDueAt = startOfDay(fixedDueDate);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + dueSoonDays);

    return {
      lastCompletedAt,
      nextDueAt: toIsoString(nextDueAt),
      status:
        nextDueAt < today
          ? "overdue"
          : nextDueAt <= dueSoonDate
            ? "due_soon"
            : "up_to_date",
    };
  }

  const recurrenceValue = task.recurrence_value ?? 0;
  const recurrenceUnit = task.recurrence_unit;

  if (!recurrenceUnit || recurrenceValue <= 0) {
    return {
      lastCompletedAt,
      nextDueAt: null,
      status: "unscheduled",
    };
  }

  const baseDate = toDate(lastCompletedAt) ?? toDate(task.anchor_date);
  if (!baseDate) {
    return {
      lastCompletedAt,
      nextDueAt: null,
      status: "unscheduled",
    };
  }

  const nextDueDate = startOfDay(addInterval(baseDate, recurrenceValue, recurrenceUnit));
  const dueSoonDate = new Date(today);
  dueSoonDate.setDate(dueSoonDate.getDate() + dueSoonDays);

  return {
    lastCompletedAt,
    nextDueAt: toIsoString(nextDueDate),
    status:
      nextDueDate < today
        ? "overdue"
        : nextDueDate <= dueSoonDate
          ? "due_soon"
          : "up_to_date",
  };
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || "";
}

function normalizeOptionalDate(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || "";
}

function normalizeTaskPayload(input: CreateTaskInput) {
  const isRecurring = input.taskType === "recurring";
  const isOneOff = input.taskType === "one_off";

  return {
    title: input.title.trim(),
    description: normalizeOptionalText(input.description),
    category: normalizeOptionalText(input.category),
    is_active: true,
    task_type: input.taskType,
    recurrence_unit: isRecurring ? input.recurrenceUnit ?? "" : "",
    recurrence_value: isRecurring ? input.recurrenceValue ?? null : null,
    anchor_date: isRecurring ? normalizeOptionalDate(input.anchorDate) : "",
    fixed_due_date: isOneOff ? normalizeOptionalDate(input.fixedDueDate) : "",
    due_soon_days: input.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS,
    notes: normalizeOptionalText(input.notes),
    status: "unscheduled" as MaintenanceStatus,
    last_completed_at: "",
    next_due_at: "",
  };
}

export async function listMaintenanceTasks() {
  return pb.collection("maintenance_tasks").getFullList({
    sort: "+category,+title",
  });
}

export async function listMaintenanceLogs() {
  return pb.collection("maintenance_logs").getFullList({
    sort: "-performed_at",
  });
}

export async function listMaintenanceLogsForTask(taskId: string) {
  return pb.collection("maintenance_logs").getFullList({
    filter: pb.filter("task = {:taskId}", { taskId }),
    sort: "-performed_at",
  });
}

export async function syncMaintenanceTask(taskId: string) {
  const task = await pb.collection("maintenance_tasks").getOne(taskId);
  const logs = await listMaintenanceLogsForTask(taskId);
  const schedule = computeTaskScheduleState(task, logs);

  return pb.collection("maintenance_tasks").update(taskId, {
    last_completed_at: schedule.lastCompletedAt ?? "",
    next_due_at: schedule.nextDueAt ?? "",
    status: schedule.status,
  });
}

export async function createMaintenanceTask(input: CreateTaskInput) {
  const createdTask = await pb
    .collection("maintenance_tasks")
    .create(normalizeTaskPayload(input));

  await syncMaintenanceTask(createdTask.id);
  return pb.collection("maintenance_tasks").getOne(createdTask.id);
}

export async function updateMaintenanceTask(taskId: string, input: UpdateTaskInput) {
  await pb.collection("maintenance_tasks").update(taskId, normalizeTaskPayload(input));
  await syncMaintenanceTask(taskId);
  return pb.collection("maintenance_tasks").getOne(taskId);
}

export async function createMaintenanceLog(input: CreateLogInput) {
  const createdLog = await pb.collection("maintenance_logs").create({
    task: input.taskId,
    performed_at: input.performedAt,
    note: normalizeOptionalText(input.note),
    performed_by: input.performedBy ?? "",
  });

  await syncMaintenanceTask(input.taskId);
  return createdLog;
}

export async function deleteMaintenanceTask(taskId: string) {
  await pb.collection("maintenance_tasks").delete(taskId);
}

export async function deleteMaintenanceLog(logId: string, taskId: string) {
  await pb.collection("maintenance_logs").delete(logId);
  await syncMaintenanceTask(taskId);
}

export async function importMaintenanceData(input: {
  tasks: BulkImportTaskInput[];
  logs: BulkImportLogInput[];
}) {
  const existingTasks = await listMaintenanceTasks();
  const tasksByTitle = new Map(
    existingTasks.map((task) => [task.title.trim().toLocaleLowerCase(), task] as const)
  );

  const createdTasks: MaintenanceTask[] = [];
  const importedTaskIds = new Set<string>();

  for (const task of input.tasks) {
    const key = task.title.trim().toLocaleLowerCase();
    if (!key || tasksByTitle.has(key)) {
      continue;
    }

    const createdTask = await createMaintenanceTask(task);
    tasksByTitle.set(key, createdTask);
    createdTasks.push(createdTask);
    importedTaskIds.add(createdTask.id);
  }

  const updatedTaskIds = new Set<string>();

  for (const log of input.logs) {
    const taskKey = log.taskTitle.trim().toLocaleLowerCase();
    const task = tasksByTitle.get(taskKey);

    if (!task) {
      continue;
    }

    await pb.collection("maintenance_logs").create({
      task: task.id,
      performed_at: log.performedAt,
      note: normalizeOptionalText(log.note),
      performed_by: "",
    });

    updatedTaskIds.add(task.id);
  }

  for (const taskId of updatedTaskIds) {
    await syncMaintenanceTask(taskId);
  }

  return {
    createdTasks,
    importedLogCount: input.logs.filter((log) =>
      tasksByTitle.has(log.taskTitle.trim().toLocaleLowerCase())
    ).length,
    updatedTaskCount: updatedTaskIds.size,
    createdTaskCount: createdTasks.length,
    skippedTaskCount: input.tasks.length - createdTasks.length,
  };
}
