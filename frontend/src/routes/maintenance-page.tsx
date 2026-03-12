import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  computeTaskScheduleState,
  createMaintenanceLog,
  createMaintenanceTask,
  deleteMaintenanceLog,
  deleteMaintenanceTask,
  importMaintenanceData,
  listMaintenanceLogs,
  listMaintenanceTasks,
  type BulkImportLogInput,
  type BulkImportTaskInput,
  type MaintenanceLog,
  type MaintenanceStatus,
  type MaintenanceTask,
  type MaintenanceTaskType,
  type RecurrenceUnit,
} from "@/lib/maintenance";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Plus,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type TaskFilter = "all" | MaintenanceStatus | "active_schedule";

type TaskFormState = {
  title: string;
  description: string;
  category: string;
  taskType: MaintenanceTaskType;
  recurrenceUnit: RecurrenceUnit;
  recurrenceValue: string;
  anchorDate: string;
  fixedDueDate: string;
  dueSoonDays: string;
  notes: string;
};

type LogFormState = {
  performedAt: string;
  note: string;
};

type ImportPreview = {
  taskRows: BulkImportTaskInput[];
  logRows: BulkImportLogInput[];
  errors: string[];
  headers: string[];
};

const DEFAULT_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  category: "",
  taskType: "recurring",
  recurrenceUnit: "month",
  recurrenceValue: "6",
  anchorDate: "",
  fixedDueDate: "",
  dueSoonDays: "14",
  notes: "",
};

const IMPORT_TASK_HEADERS = [
  "title",
  "category",
  "description",
  "task_type",
  "recurrence_value",
  "recurrence_unit",
  "anchor_date",
  "fixed_due_date",
  "due_soon_days",
  "notes",
] as const;

const IMPORT_LOG_HEADERS = ["task_title", "performed_at", "note"] as const;

function getTodayLocalIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Aucune date";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeDueDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDistanceToNow(date, {
    addSuffix: false,
    locale: fr,
  });
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headers: [], rows: [] as Record<string, string>[] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {});
  });

  return { headers, rows };
}

function escapeCsvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "");

  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCsv(headers: readonly string[], rows: Array<Array<string | number | null | undefined>>) {
  const serializedRows = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];

  return serializedRows.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isMaintenanceTaskType(value: string): value is MaintenanceTaskType {
  return value === "recurring" || value === "one_off" || value === "log_only";
}

function isRecurrenceUnit(value: string): value is RecurrenceUnit {
  return value === "day" || value === "week" || value === "month" || value === "year";
}

function normalizeDateValue(value: string) {
  if (!value.trim()) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide: ${value}`);
  }

  return date.toISOString();
}

function buildImportPreview(text: string): ImportPreview {
  const { headers, rows } = parseCsv(text);
  const errors: string[] = [];
  const hasTaskColumns = IMPORT_TASK_HEADERS.some((header) => headers.includes(header));
  const hasLogColumns = IMPORT_LOG_HEADERS.every((header) => headers.includes(header));
  const taskRows: BulkImportTaskInput[] = [];
  const logRows: BulkImportLogInput[] = [];

  if (!headers.length) {
    return {
      headers,
      errors: ["Le fichier CSV est vide."],
      taskRows,
      logRows,
    };
  }

  rows.forEach((row, index) => {
    const lineNumber = index + 2;

    if (hasTaskColumns && row.title?.trim()) {
      const taskType = row.task_type?.trim() || "log_only";

      if (!isMaintenanceTaskType(taskType)) {
        errors.push(`Ligne ${lineNumber}: task_type invalide (${taskType}).`);
      } else {
        const recurrenceValue = row.recurrence_value?.trim()
          ? Number(row.recurrence_value)
          : undefined;
        const recurrenceUnit = row.recurrence_unit?.trim();

        if (taskType === "recurring") {
          if (!recurrenceValue || recurrenceValue <= 0) {
            errors.push(`Ligne ${lineNumber}: recurrence_value doit etre > 0.`);
          }

          if (!recurrenceUnit || !isRecurrenceUnit(recurrenceUnit)) {
            errors.push(`Ligne ${lineNumber}: recurrence_unit invalide.`);
          }
        }

        try {
          taskRows.push({
            title: row.title.trim(),
            category: row.category?.trim(),
            description: row.description?.trim(),
            taskType,
            recurrenceValue,
            recurrenceUnit:
              recurrenceUnit && isRecurrenceUnit(recurrenceUnit)
                ? recurrenceUnit
                : undefined,
            anchorDate: row.anchor_date ? normalizeDateValue(row.anchor_date) : undefined,
            fixedDueDate: row.fixed_due_date
              ? normalizeDateValue(row.fixed_due_date)
              : undefined,
            dueSoonDays: row.due_soon_days?.trim()
              ? Number(row.due_soon_days)
              : undefined,
            notes: row.notes?.trim(),
          });
        } catch (error) {
          errors.push(
            `Ligne ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    if (hasLogColumns && row.task_title?.trim()) {
      try {
        logRows.push({
          taskTitle: row.task_title.trim(),
          performedAt: normalizeDateValue(row.performed_at),
          note: row.note?.trim(),
        });
      } catch (error) {
        errors.push(
          `Ligne ${lineNumber}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  });

  if (!hasTaskColumns && !hasLogColumns) {
    errors.push(
      "Colonnes non reconnues. Attendu: title,... pour les taches ou task_title,performed_at,note pour les logs."
    );
  }

  return { headers, rows: undefined as never, errors, taskRows, logRows };
}

function formatRelativeStatus(task: MaintenanceTask, logs: MaintenanceLog[]) {
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

function getStatusBadgeClass(status: MaintenanceStatus) {
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

function getStatusLabel(status: MaintenanceStatus) {
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

function sortTasks(left: MaintenanceTask, right: MaintenanceTask) {
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

export function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskForm, setTaskForm] = useState<TaskFormState>(DEFAULT_TASK_FORM);
  const [logForm, setLogForm] = useState<LogFormState>({
    performedAt: getTodayLocalIso(),
    note: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState("");
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

      setTasks(nextTasks.sort(sortTasks));
      setLogs(nextLogs);

      setSelectedTaskId((currentTaskId) => {
        if (currentTaskId && nextTasks.some((task) => task.id === currentTaskId)) {
          return currentTaskId;
        }

        return nextTasks[0]?.id ?? "";
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

  const logsByTask = useMemo(() => {
    const map = new Map<string, MaintenanceLog[]>();

    for (const log of logs) {
      const taskLogs = map.get(log.task) ?? [];
      taskLogs.push(log);
      map.set(log.task, taskLogs);
    }

    return map;
  }, [logs]);

  const decoratedTasks = useMemo(() => {
    return tasks
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
  }, [logsByTask, tasks]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") {
      return decoratedTasks;
    }

    if (taskFilter === "active_schedule") {
      return decoratedTasks.filter((task) => task.task_type !== "log_only");
    }

    return decoratedTasks.filter((task) => task.derivedStatus === taskFilter);
  }, [decoratedTasks, taskFilter]);

  const selectedTask =
    decoratedTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
  const selectedLogs = selectedTask ? logsByTask.get(selectedTask.id) ?? [] : [];

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
        notifySuccess("CSV charge. Verifie l'aperçu puis lance l'import.");
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
    const content = buildCsv(IMPORT_TASK_HEADERS, decoratedTasks.map((task) => [
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
    ]));

    downloadCsv("maintenance-tasks.csv", content);
    notifySuccess("Export des taches genere.");
  }

  function handleExportLogsCsv() {
    const content = buildCsv(IMPORT_LOG_HEADERS, logs.map((log) => {
      const task = tasks.find((candidate) => candidate.id === log.task);

      return [
        task?.title ?? log.task,
        log.performed_at,
        log.note,
      ];
    }));

    downloadCsv("maintenance-logs.csv", content);
    notifySuccess("Export des logs genere.");
  }

  function handleDownloadSampleCsv() {
    const content = buildCsv(IMPORT_TASK_HEADERS, [
      [
        "Changer filtre a eau",
        "Cuisine",
        "Remplacer la cartouche du filtre.",
        "recurring",
        6,
        "month",
        "2026-01-01T09:00:00.000Z",
        "",
        14,
        "Couper l'arrivee d'eau avant intervention.",
      ],
      [
        "Laver les vitres",
        "Entretien",
        "Nettoyage interieur et exterieur.",
        "log_only",
        "",
        "",
        "",
        "",
        14,
        "Pas de periodicite imposee.",
      ],
      [
        "Verifier detecteurs de fumee",
        "Securite",
        "Tester les detecteurs et remplacer les piles si necessaire.",
        "recurring",
        12,
        "month",
        "2026-02-01T10:00:00.000Z",
        "",
        30,
        "Faire un test sonore dans chaque piece.",
      ],
      [
        "Entretien climatisation",
        "CVC",
        "Faire intervenir un technicien pour le nettoyage annuel.",
        "recurring",
        1,
        "year",
        "2026-03-15T08:00:00.000Z",
        "",
        21,
        "Prevoir acces aux unites interieures et exterieures.",
      ],
      [
        "Nettoyage gouttieres",
        "Exterieur",
        "Retirer les feuilles et verifier l'ecoulement.",
        "one_off",
        "",
        "",
        "",
        "2026-10-05T09:30:00.000Z",
        10,
        "Idealement avant les fortes pluies d'automne.",
      ],
      [
        "Controle pression chaudiere",
        "Chauffage",
        "Verifier la pression et ajuster si necessaire.",
        "log_only",
        "",
        "",
        "",
        "",
        14,
        "A consigner a chaque controle manuel.",
      ],
    ]);

    downloadCsv("maintenance-example.csv", content);
    notifySuccess("Exemple CSV telecharge.");
  }

  const stats = useMemo(() => {
    return {
      total: decoratedTasks.length,
      overdue: decoratedTasks.filter((task) => task.derivedStatus === "overdue").length,
      dueSoon: decoratedTasks.filter((task) => task.derivedStatus === "due_soon").length,
      upToDate: decoratedTasks.filter((task) => task.derivedStatus === "up_to_date").length,
      unscheduled: decoratedTasks.filter((task) => task.derivedStatus === "unscheduled").length,
    };
  }, [decoratedTasks]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fffdf7,#f4f7ff_55%,#eefbf4)] p-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Wrench className="size-4" />
          Maintenance et historique d'execution
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Gere les taches ponctuelles et recurrentes avec leur echeance reelle.
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Chaque tache porte sa regle de periodicite, et chaque execution cree une
            entree d'historique. Le statut affiche si l'echeance est depassee, a
            venir ou simplement libre d'historique.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>En retard</CardDescription>
            <CardTitle className="text-3xl text-red-700">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Bientot dues</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{stats.dueSoon}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>A jour</CardDescription>
            <CardTitle className="text-3xl text-emerald-700">{stats.upToDate}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Sans echeance</CardDescription>
            <CardTitle className="text-3xl text-slate-700">{stats.unscheduled}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Vue d'ensemble</CardTitle>
            <CardDescription>
              Les taches recurrentes calculent leur prochaine echeance depuis la
              derniere execution ou la date de reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                <CalendarClock className="size-4" />
                Recurrente
              </div>
              <p>
                Exemple: changer un filtre tous les 6 mois. Chaque execution
                recalcule automatiquement l'echeance suivante.
              </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                  <CheckCircle2 className="size-4" />
                  Ponctuelle
                </div>
                <p>
                  Une tache a date unique. Une fois executee, elle reste dans
                  l'historique sans rester en retard.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                  <History className="size-4" />
                  Historique libre
                </div>
                <p>
                  Pas d'echeance, uniquement un journal d'executions. Pratique pour
                  les interventions occasionnelles comme le lavage des vitres.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Cree de nouvelles taches, importe un CSV ou exporte les donnees
              actuelles depuis un meme espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button">
                  <Plus className="size-4" />
                  Nouvelle tache
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvelle tache</DialogTitle>
                  <DialogDescription>
                    Cree une tache recurrente, ponctuelle, ou simplement
                    historisable.
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleCreateTask}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium" htmlFor="task-title">
                        Titre
                      </label>
                      <Input
                        id="task-title"
                        value={taskForm.title}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Changer filtre a eau"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="task-category">
                        Categorie
                      </label>
                      <Input
                        id="task-category"
                        value={taskForm.category}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, category: event.target.value }))
                        }
                        placeholder="Cuisine"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type de tache</label>
                      <Select
                        value={taskForm.taskType}
                        onValueChange={(value) =>
                          setTaskForm((current) => ({
                            ...current,
                            taskType: value as MaintenanceTaskType,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recurring">Recurrente</SelectItem>
                          <SelectItem value="one_off">Ponctuelle</SelectItem>
                          <SelectItem value="log_only">Historique libre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {taskForm.taskType === "recurring" ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="task-recurrence-value">
                            Frequence
                          </label>
                          <Input
                            id="task-recurrence-value"
                            type="number"
                            min="1"
                            value={taskForm.recurrenceValue}
                            onChange={(event) =>
                              setTaskForm((current) => ({
                                ...current,
                                recurrenceValue: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Unite</label>
                          <Select
                            value={taskForm.recurrenceUnit}
                            onValueChange={(value) =>
                              setTaskForm((current) => ({
                                ...current,
                                recurrenceUnit: value as RecurrenceUnit,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Jour</SelectItem>
                              <SelectItem value="week">Semaine</SelectItem>
                              <SelectItem value="month">Mois</SelectItem>
                              <SelectItem value="year">Annee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium" htmlFor="task-anchor-date">
                            Date de reference
                          </label>
                          <DatePicker
                            value={taskForm.anchorDate}
                            onChange={(value) =>
                              setTaskForm((current) => ({
                                ...current,
                                anchorDate: value,
                              }))
                            }
                            placeholder="Choisir une date de reference"
                          />
                        </div>
                      </>
                    ) : null}

                    {taskForm.taskType === "one_off" ? (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium" htmlFor="task-fixed-due-date">
                          Echeance unique
                        </label>
                        <DatePicker
                          value={taskForm.fixedDueDate}
                          onChange={(value) =>
                            setTaskForm((current) => ({
                              ...current,
                              fixedDueDate: value,
                            }))
                          }
                          placeholder="Choisir une echeance"
                        />
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="task-due-soon-days">
                        Alerte avant echeance
                      </label>
                      <Input
                        id="task-due-soon-days"
                        type="number"
                        min="1"
                        value={taskForm.dueSoonDays}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            dueSoonDays: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium" htmlFor="task-description">
                        Description
                      </label>
                      <Textarea
                        id="task-description"
                        value={taskForm.description}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Details utiles pour l'execution."
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium" htmlFor="task-notes">
                        Notes internes
                      </label>
                      <Textarea
                        id="task-notes"
                        value={taskForm.notes}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Procedure, references, materiel..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingTask}>
                      <Plus className="size-4" />
                      {isSubmittingTask ? "Creation..." : "Creer la tache"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  <Upload className="size-4" />
                  Importer un CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import CSV maintenance</DialogTitle>
                  <DialogDescription>
                    Importe des taches, des logs, ou les deux. Les taches deja
                    presentes sont ignorees sur la base du titre.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <FileSpreadsheet className="size-4" />
                        Format taches
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <code className="block whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                          {IMPORT_TASK_HEADERS.join(",\n")}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Format logs</div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <code className="block whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                          {IMPORT_LOG_HEADERS.join(",\n")}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="maintenance-csv">
                        Fichier CSV
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleDownloadSampleCsv}
                      >
                        <Download className="size-4" />
                        Telecharger un exemple de CSV
                      </Button>
                      <Input
                        id="maintenance-csv"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleImportFileChange}
                      />
                      {importFileName ? (
                        <p className="text-xs text-slate-500">{importFileName}</p>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      onClick={handleImportCsv}
                      disabled={!importPreview || isImporting || importPreview.errors.length > 0}
                    >
                      <Upload className="size-4" />
                      {isImporting ? "Import en cours..." : "Importer le CSV"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {importPreview ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Taches detectees
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                              {importPreview.taskRows.length}
                            </div>
                          </div>
                          <div className="rounded-2xl border p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Logs detectes
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                              {importPreview.logRows.length}
                            </div>
                          </div>
                          <div className="rounded-2xl border p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Erreurs
                            </div>
                            <div className="mt-2 text-2xl font-semibold">
                              {importPreview.errors.length}
                            </div>
                          </div>
                        </div>

                        {importPreview.errors.length ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                            <div className="mb-2 text-sm font-medium text-red-700">
                              Erreurs de validation
                            </div>
                            <div className="space-y-1 text-sm text-red-700">
                              {importPreview.errors.map((error) => (
                                <div key={error}>{error}</div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border p-4">
                            <div className="mb-3 text-sm font-medium text-slate-900">
                              Apercu taches
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                              {importPreview.taskRows.slice(0, 5).map((task, index) => (
                                <div
                                  key={`${task.title}-${index}`}
                                  className="rounded-xl bg-slate-50 p-3"
                                >
                                  <div className="font-medium text-slate-900">{task.title}</div>
                                  <div>
                                    {task.taskType}
                                    {task.taskType === "recurring"
                                      ? ` · ${task.recurrenceValue} ${task.recurrenceUnit}`
                                      : ""}
                                  </div>
                                </div>
                              ))}
                              {!importPreview.taskRows.length ? (
                                <div className="text-muted-foreground">
                                  Aucune tache detectee.
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-2xl border p-4">
                            <div className="mb-3 text-sm font-medium text-slate-900">
                              Apercu logs
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                              {importPreview.logRows.slice(0, 5).map((log, index) => (
                                <div
                                  key={`${log.taskTitle}-${log.performedAt}-${index}`}
                                  className="rounded-xl bg-slate-50 p-3"
                                >
                                  <div className="font-medium text-slate-900">
                                    {log.taskTitle}
                                  </div>
                                  <div>{formatDate(log.performedAt)}</div>
                                </div>
                              ))}
                              {!importPreview.logRows.length ? (
                                <div className="text-muted-foreground">
                                  Aucun log detecte.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Charge un CSV pour obtenir un apercu avant import.
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button type="button" variant="outline" onClick={handleExportTasksCsv}>
              <Download className="size-4" />
              Export taches
            </Button>
            <Button type="button" variant="outline" onClick={handleExportLogsCsv}>
              <Download className="size-4" />
              Export logs
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="min-h-[32rem] min-w-0 self-start xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle>Taches</CardTitle>
            <CardDescription>
              Filtre les interventions a traiter et consulte leur historique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={taskFilter}
              onValueChange={(value) => setTaskFilter(value as TaskFilter)}
            >
              <TabsList variant="line" className="w-full justify-start overflow-auto">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="overdue">En retard</TabsTrigger>
                <TabsTrigger value="due_soon">Bientot dues</TabsTrigger>
                <TabsTrigger value="up_to_date">A jour</TabsTrigger>
                <TabsTrigger value="unscheduled">Sans echeance</TabsTrigger>
                <TabsTrigger value="active_schedule">Planifiees</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  Chargement des taches...
                </div>
              ) : filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition hover:border-slate-300 hover:bg-slate-50",
                      selectedTask?.id === task.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-950">{task.title}</span>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs font-medium",
                              getStatusBadgeClass(task.derivedStatus)
                            )}
                          >
                            {getStatusLabel(task.derivedStatus)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {task.category || "Sans categorie"} ·{" "}
                          {task.task_type === "recurring"
                            ? "Recurrente"
                            : task.task_type === "one_off"
                              ? "Ponctuelle"
                              : "Historique libre"}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <div>{task.logs.length} execution(s)</div>
                        <div>
                          Derniere: {formatDate(task.derivedLastCompletedAt)}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {formatRelativeStatus(task, task.logs)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  Aucune tache pour ce filtre.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 self-start xl:sticky xl:top-24">
          <Card className="min-h-[32rem] xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Detail et historique</CardTitle>
                <CardDescription>
                  Enregistre une execution et consulte les passages precedents.
                </CardDescription>
              </div>

              {selectedTask ? (
                <Dialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Trash2 className="size-4" />
                      Supprimer la tache
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Supprimer cette tache ?</DialogTitle>
                      <DialogDescription>
                        Cette action supprimera aussi l'historique associe via
                        la relation en cascade. Elle est irreversible.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <span className="font-medium text-slate-950">
                        {selectedTask.title}
                      </span>
                      <div className="mt-1">
                        {selectedLogs.length} execution(s) enregistree(s)
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={isDeletingTask}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteTask}
                        disabled={isDeletingTask}
                      >
                        <Trash2 className="size-4" />
                        {isDeletingTask ? "Suppression..." : "Confirmer"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="min-w-0 space-y-6 xl:overflow-y-auto">
            {selectedTask ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-slate-950">
                        {selectedTask.title}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {selectedTask.description || "Aucune description fournie."}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        getStatusBadgeClass(selectedTask.derivedStatus)
                      )}
                    >
                      {getStatusLabel(selectedTask.derivedStatus)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Regle
                      </div>
                      <div className="mt-1 text-sm text-slate-800">
                        {selectedTask.task_type === "recurring"
                          ? `Tous les ${selectedTask.recurrence_value} ${selectedTask.recurrence_unit}`
                          : selectedTask.task_type === "one_off"
                            ? "Ponctuelle"
                            : "Historique libre"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Prochaine echeance
                      </div>
                      <div className="mt-1 text-sm text-slate-800">
                        {selectedTask.derivedStatus === "overdue" &&
                        formatRelativeDueDate(selectedTask.derivedNextDueAt)
                          ? `En retard de ${formatRelativeDueDate(selectedTask.derivedNextDueAt)}`
                          : formatRelativeDueDate(selectedTask.derivedNextDueAt)
                            ? `Dans ${formatRelativeDueDate(selectedTask.derivedNextDueAt)}`
                            : formatDate(selectedTask.derivedNextDueAt)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(selectedTask.derivedNextDueAt)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Derniere execution
                      </div>
                      <div className="mt-1 text-sm text-slate-800">
                        {formatDate(selectedTask.derivedLastCompletedAt)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white bg-white p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Alerte
                      </div>
                      <div className="mt-1 text-sm text-slate-800">
                        {selectedTask.due_soon_days} jour(s) avant echeance
                      </div>
                    </div>
                  </div>

                  {selectedTask.notes ? (
                    <div className="mt-4 text-sm text-slate-600">
                      <span className="font-medium text-slate-900">Notes:</span>{" "}
                      {selectedTask.notes}
                    </div>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={handleCreateLog}>
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="log-performed-at">
                        Date d'execution
                      </label>
                      <DateTimePicker
                        value={logForm.performedAt}
                        onChange={(value) =>
                          setLogForm((current) => ({
                            ...current,
                            performedAt: value,
                          }))
                        }
                        placeholder="Choisir une date"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={isSubmittingLog} className="w-full">
                        <CheckCircle2 className="size-4" />
                        {isSubmittingLog ? "Enregistrement..." : "Marquer comme faite"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="log-note">
                      Note d'execution
                    </label>
                    <Textarea
                      id="log-note"
                      value={logForm.note}
                      onChange={(event) =>
                        setLogForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Ex: filtre remplace, reference XYZ."
                    />
                  </div>
                </form>

                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-900">Historique</div>
                  {selectedLogs.length ? (
                    selectedLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {formatDate(log.performed_at)}
                            </div>
                            <div className="text-sm text-slate-600">
                              {log.note || "Aucune note"}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="pt-2 text-xs text-slate-500">
                              {log.performed_by || "Execution manuelle"}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-slate-500 hover:text-destructive"
                              onClick={() => handleDeleteLog(log.id)}
                              disabled={deletingLogId === log.id}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Supprimer cette execution</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      Aucun historique pour cette tache.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Cree une tache ou selectionne-en une pour voir son historique.
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
}
