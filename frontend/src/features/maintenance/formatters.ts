import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import type { MaintenanceLog, MaintenanceStatus, MaintenanceTask } from "@/lib/maintenance";
import { computeTaskScheduleState } from "@/lib/maintenance";

export function getTodayLocalIso() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Aucune date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeDueDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDistanceToNow(date, {
    addSuffix: false,
    locale: fr,
  });
}

export function formatRelativeStatus(task: MaintenanceTask, logs: MaintenanceLog[]) {
  const schedule = computeTaskScheduleState(task, logs);

  if (task.task_type === "log_only") {
    return "Historique libre";
  }

  if (!schedule.nextDueAt) {
    return "Pas d'echeance planifiee";
  }

  const relativeDueDate = formatRelativeDueDate(schedule.nextDueAt);

  if (schedule.status === "overdue") {
    return relativeDueDate
      ? `En retard de ${relativeDueDate} · echeance le ${formatDate(schedule.nextDueAt)}`
      : `En retard depuis le ${formatDate(schedule.nextDueAt)}`;
  }

  if (schedule.status === "due_soon") {
    return relativeDueDate
      ? `Prochaine echeance dans ${relativeDueDate} · le ${formatDate(schedule.nextDueAt)}`
      : `A faire avant le ${formatDate(schedule.nextDueAt)}`;
  }

  return relativeDueDate
    ? `Prochaine echeance dans ${relativeDueDate} · le ${formatDate(schedule.nextDueAt)}`
    : `Prochaine echeance le ${formatDate(schedule.nextDueAt)}`;
}

export function getStatusBadgeClass(status: MaintenanceStatus) {
  if (status === "overdue") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "due_soon") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "up_to_date") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getStatusLabel(status: MaintenanceStatus) {
  if (status === "overdue") {
    return "En retard";
  }

  if (status === "due_soon") {
    return "Bientot due";
  }

  if (status === "up_to_date") {
    return "A jour";
  }

  return "Sans echeance";
}

export function getTaskTypeLabel(taskType: MaintenanceTask["task_type"]) {
  if (taskType === "recurring") {
    return "Recurrente";
  }

  if (taskType === "one_off") {
    return "Ponctuelle";
  }

  return "Historique libre";
}

export function sortTasks(left: MaintenanceTask, right: MaintenanceTask) {
  const statusOrder: Record<MaintenanceStatus, number> = {
    overdue: 0,
    due_soon: 1,
    up_to_date: 2,
    unscheduled: 3,
  };

  const byStatus = statusOrder[left.status] - statusOrder[right.status];
  if (byStatus !== 0) {
    return byStatus;
  }

  const leftDue = left.next_due_at || "9999";
  const rightDue = right.next_due_at || "9999";
  if (leftDue !== rightDue) {
    return leftDue.localeCompare(rightDue);
  }

  return left.title.localeCompare(right.title);
}
