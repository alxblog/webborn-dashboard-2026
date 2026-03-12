import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  buildCsv,
  buildImportPreview,
  downloadCsv,
} from "@/features/maintenance/csv";
import { SAMPLE_TASK_ROWS, DEFAULT_TASK_FORM, IMPORT_LOG_HEADERS, IMPORT_TASK_HEADERS } from "@/features/maintenance/constants";
import { MaintenanceActionsCard } from "@/features/maintenance/components/maintenance-actions-card";
import { MaintenanceDetailCard } from "@/features/maintenance/components/maintenance-detail-card";
import { MaintenanceHero } from "@/features/maintenance/components/maintenance-hero";
import { MaintenanceOverviewCard } from "@/features/maintenance/components/maintenance-overview-card";
import { MaintenanceStatsGrid } from "@/features/maintenance/components/maintenance-stats-grid";
import { MaintenanceTaskListCard } from "@/features/maintenance/components/maintenance-task-list-card";
import { getTodayLocalIso, sortTasks } from "@/features/maintenance/formatters";
import type {
  DecoratedMaintenanceTask,
  ImportPreview,
  LogFormState,
  MaintenanceStats,
  TaskFilter,
} from "@/features/maintenance/types";
import {
  computeTaskScheduleState,
  createMaintenanceLog,
  createMaintenanceTask,
  deleteMaintenanceLog,
  deleteMaintenanceTask,
  importMaintenanceData,
  listMaintenanceLogs,
  listMaintenanceTasks,
  type MaintenanceLog,
  type MaintenanceTask,
} from "@/lib/maintenance";
import { notifyError, notifySuccess } from "@/lib/notifications";

function buildDecoratedTasks(tasks: MaintenanceTask[], logs: MaintenanceLog[]) {
  const logsByTask = new Map<string, MaintenanceLog[]>();

  for (const log of logs) {
    const taskLogs = logsByTask.get(log.task) ?? [];
    taskLogs.push(log);
    logsByTask.set(log.task, taskLogs);
  }

  const decoratedTasks: DecoratedMaintenanceTask[] = tasks
    .map((task) => {
      const taskLogs = logsByTask.get(task.id) ?? [];
      const schedule = computeTaskScheduleState(task, taskLogs);

      return {
        ...task,
        derivedStatus: schedule.status,
        derivedLastCompletedAt: schedule.lastCompletedAt,
        derivedNextDueAt: schedule.nextDueAt,
        logs: taskLogs,
      };
    })
    .sort(sortTasks);

  return { decoratedTasks, logsByTask };
}

function filterTasks(tasks: DecoratedMaintenanceTask[], taskFilter: TaskFilter) {
  if (taskFilter === "all") {
    return tasks;
  }

  if (taskFilter === "active_schedule") {
    return tasks.filter((task) => task.task_type !== "log_only");
  }

  return tasks.filter((task) => task.derivedStatus === taskFilter);
}

function buildStats(tasks: DecoratedMaintenanceTask[]): MaintenanceStats {
  return {
    total: tasks.length,
    overdue: tasks.filter((task) => task.derivedStatus === "overdue").length,
    dueSoon: tasks.filter((task) => task.derivedStatus === "due_soon").length,
    upToDate: tasks.filter((task) => task.derivedStatus === "up_to_date").length,
    unscheduled: tasks.filter((task) => task.derivedStatus === "unscheduled").length,
  };
}

export function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM);
  const [logForm, setLogForm] = useState<LogFormState>({
    performedAt: getTodayLocalIso(),
    note: "",
  });
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState("");

  async function loadData() {
    setIsLoading(true);

    try {
      const [nextTasks, nextLogs] = await Promise.all([
        listMaintenanceTasks(),
        listMaintenanceLogs(),
      ]);

      const sortedTasks = nextTasks.sort(sortTasks);
      setTasks(sortedTasks);
      setLogs(nextLogs);
      setSelectedTaskId((currentTaskId) => {
        if (currentTaskId && sortedTasks.some((task) => task.id === currentTaskId)) {
          return currentTaskId;
        }

        return sortedTasks[0]?.id ?? "";
      });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const { decoratedTasks, logsByTask } = useMemo(
    () => buildDecoratedTasks(tasks, logs),
    [logs, tasks]
  );
  const filteredTasks = useMemo(
    () => filterTasks(decoratedTasks, taskFilter),
    [decoratedTasks, taskFilter]
  );
  const selectedTask =
    decoratedTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
  const selectedLogs = selectedTask ? logsByTask.get(selectedTask.id) ?? [] : [];
  const stats = useMemo(() => buildStats(decoratedTasks), [decoratedTasks]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingTask(true);

    try {
      if (!taskForm.title.trim()) {
        throw new Error("Le titre est requis.");
      }

      await createMaintenanceTask({
        title: taskForm.title,
        description: taskForm.description,
        category: taskForm.category,
        taskType: taskForm.taskType,
        recurrenceUnit:
          taskForm.taskType === "recurring" ? taskForm.recurrenceUnit : undefined,
        recurrenceValue:
          taskForm.taskType === "recurring"
            ? Number(taskForm.recurrenceValue || "0")
            : undefined,
        anchorDate: taskForm.anchorDate,
        fixedDueDate: taskForm.fixedDueDate,
        dueSoonDays: Number(taskForm.dueSoonDays || "14"),
        notes: taskForm.notes,
      });

      notifySuccess("Tache creee.");
      setTaskForm(DEFAULT_TASK_FORM);
      setIsCreateDialogOpen(false);
      await loadData();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleCreateLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTask) {
      return;
    }

    setIsSubmittingLog(true);

    try {
      if (!logForm.performedAt) {
        throw new Error("La date d'execution est requise.");
      }

      await createMaintenanceLog({
        taskId: selectedTask.id,
        performedAt: new Date(logForm.performedAt).toISOString(),
        note: logForm.note,
      });

      notifySuccess("Execution enregistree.");
      setLogForm({
        performedAt: getTodayLocalIso(),
        note: "",
      });
      await loadData();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingLog(false);
    }
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const preview = buildImportPreview(text);
      setImportPreview(preview);
      setImportFileName(file.name);

      if (preview.errors.length) {
        notifyError(`${preview.errors.length} erreur(s) detectee(s) dans le CSV.`);
      } else {
        notifySuccess("CSV charge. Verifie l'apercu puis lance l'import.");
      }
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = "";
    }
  }

  async function handleImportCsv() {
    if (!importPreview) {
      return;
    }

    if (importPreview.errors.length) {
      notifyError("Corrige les erreurs du CSV avant import.");
      return;
    }

    setIsImporting(true);

    try {
      const result = await importMaintenanceData({
        tasks: importPreview.taskRows,
        logs: importPreview.logRows,
      });

      notifySuccess(
        `Import termine: ${result.createdTaskCount} tache(s) creee(s), ${result.importedLogCount} log(s) importe(s).`
      );
      setImportPreview(null);
      setImportFileName("");
      setIsImportDialogOpen(false);
      await loadData();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDeleteTask() {
    if (!selectedTask) {
      return;
    }

    setIsDeletingTask(true);

    try {
      await deleteMaintenanceTask(selectedTask.id);
      notifySuccess("Tache supprimee.");
      setIsDeleteDialogOpen(false);
      setSelectedTaskId("");
      await loadData();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeletingTask(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!selectedTask) {
      return;
    }

    setDeletingLogId(logId);

    try {
      await deleteMaintenanceLog(logId, selectedTask.id);
      notifySuccess("Execution supprimee.");
      await loadData();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingLogId("");
    }
  }

  function handleExportTasksCsv() {
    const content = buildCsv(
      IMPORT_TASK_HEADERS,
      decoratedTasks.map((task) => [
        task.title,
        task.category,
        task.description,
        task.task_type,
        task.recurrence_value,
        task.recurrence_unit,
        task.anchor_date,
        task.fixed_due_date,
        task.due_soon_days,
        task.notes,
      ])
    );

    downloadCsv("maintenance-tasks.csv", content);
    notifySuccess("Export des taches genere.");
  }

  function handleExportLogsCsv() {
    const content = buildCsv(
      IMPORT_LOG_HEADERS,
      logs.map((log) => {
        const task = tasks.find((candidate) => candidate.id === log.task);

        return [task?.title ?? log.task, log.performed_at, log.note];
      })
    );

    downloadCsv("maintenance-logs.csv", content);
    notifySuccess("Export des logs genere.");
  }

  function handleDownloadSampleCsv() {
    const content = buildCsv(
      IMPORT_TASK_HEADERS,
      SAMPLE_TASK_ROWS.map((task) => [
        task.title,
        task.category,
        task.description,
        task.taskType,
        task.recurrenceValue,
        task.recurrenceUnit,
        task.anchorDate,
        task.fixedDueDate,
        task.dueSoonDays,
        task.notes,
      ])
    );

    downloadCsv("maintenance-example.csv", content);
    notifySuccess("Exemple CSV telecharge.");
  }

  return (
    <div className="space-y-8">
      <MaintenanceHero />
      <MaintenanceStatsGrid stats={stats} />
      <MaintenanceOverviewCard />
      <MaintenanceActionsCard
        createDialog={{
          open: isCreateDialogOpen,
          onOpenChange: setIsCreateDialogOpen,
          taskForm,
          setTaskForm,
          isSubmitting: isSubmittingTask,
          onSubmit: handleCreateTask,
        }}
        importDialog={{
          open: isImportDialogOpen,
          onOpenChange: setIsImportDialogOpen,
          importPreview,
          importFileName,
          isImporting,
          onFileChange: handleImportFileChange,
          onImport: handleImportCsv,
          onDownloadSample: handleDownloadSampleCsv,
        }}
        onExportTasks={handleExportTasksCsv}
        onExportLogs={handleExportLogsCsv}
      />

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <MaintenanceTaskListCard
          isLoading={isLoading}
          taskFilter={taskFilter}
          onTaskFilterChange={setTaskFilter}
          tasks={filteredTasks}
          selectedTaskId={selectedTask?.id ?? ""}
          onSelectTask={setSelectedTaskId}
        />
        <MaintenanceDetailCard
          selectedTask={selectedTask}
          selectedLogs={selectedLogs}
          logForm={logForm}
          setLogForm={setLogForm}
          isSubmittingLog={isSubmittingLog}
          onCreateLog={handleCreateLog}
          isDeleteDialogOpen={isDeleteDialogOpen}
          onDeleteDialogChange={setIsDeleteDialogOpen}
          isDeletingTask={isDeletingTask}
          onDeleteTask={handleDeleteTask}
          deletingLogId={deletingLogId}
          onDeleteLog={handleDeleteLog}
        />
      </section>
    </div>
  );
}
