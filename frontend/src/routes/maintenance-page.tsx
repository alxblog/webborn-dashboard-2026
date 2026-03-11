import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  listMaintenanceLogs,
  listMaintenanceTasks,
  type MaintenanceLog,
  type MaintenanceStatus,
  type MaintenanceTask,
  type MaintenanceTaskType,
  type RecurrenceUnit,
} from "@/lib/maintenance";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { CalendarClock, CheckCircle2, History, Plus, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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

function formatRelativeStatus(task: MaintenanceTask, logs: MaintenanceLog[]) {
  const schedule = computeTaskScheduleState(task, logs);

  if (task.task_type === "log_only") {
    return "Historique libre";
  }

  if (!schedule.nextDueAt) {
    return "Pas d'echeance planifiee";
  }

  if (schedule.status === "overdue") {
    return `En retard depuis le ${formatDate(schedule.nextDueAt)}`;
  }

  if (schedule.status === "due_soon") {
    return `A faire avant le ${formatDate(schedule.nextDueAt)}`;
  }

  return `Prochaine echeance le ${formatDate(schedule.nextDueAt)}`;
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle tache</CardTitle>
            <CardDescription>
              Cree une tache recurrente, ponctuelle, ou simplement historisable.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Input
                        id="task-anchor-date"
                        type="datetime-local"
                        value={taskForm.anchorDate}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            anchorDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}

                {taskForm.taskType === "one_off" ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium" htmlFor="task-fixed-due-date">
                      Echeance unique
                    </label>
                    <Input
                      id="task-fixed-due-date"
                      type="datetime-local"
                      value={taskForm.fixedDueDate}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          fixedDueDate: event.target.value,
                        }))
                      }
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vue d'ensemble</CardTitle>
            <CardDescription>
              Les taches recurrentes calculent leur prochaine echeance depuis la
              derniere execution ou la date de reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
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
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="min-h-[32rem]">
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

        <Card className="min-h-[32rem]">
          <CardHeader>
            <CardTitle>Detail et historique</CardTitle>
            <CardDescription>
              Enregistre une execution et consulte les passages precedents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                      <Input
                        id="log-performed-at"
                        type="datetime-local"
                        value={logForm.performedAt}
                        onChange={(event) =>
                          setLogForm((current) => ({
                            ...current,
                            performedAt: event.target.value,
                          }))
                        }
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
                          <div className="text-xs text-slate-500">
                            {log.performed_by || "Execution manuelle"}
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
      </section>
    </div>
  );
}
