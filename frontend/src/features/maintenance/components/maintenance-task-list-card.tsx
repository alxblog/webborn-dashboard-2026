import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatDate, formatRelativeStatus, getStatusBadgeClass, getStatusLabel, getTaskTypeLabel } from "../formatters";
import type { DecoratedMaintenanceTask, TaskFilter } from "../types";

type Props = {
  isLoading: boolean;
  taskFilter: TaskFilter;
  onTaskFilterChange: (filter: TaskFilter) => void;
  tasks: DecoratedMaintenanceTask[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
};

const FILTERS: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "overdue", label: "En retard" },
  { id: "due_soon", label: "Bientot dues" },
  { id: "up_to_date", label: "A jour" },
  { id: "unscheduled", label: "Sans echeance" },
  { id: "active_schedule", label: "Planifiees" },
];

export function MaintenanceTaskListCard({
  isLoading,
  taskFilter,
  onTaskFilterChange,
  tasks,
  selectedTaskId,
  onSelectTask,
}: Props) {
  return (
    <Card className="min-h-[32rem] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Taches</CardTitle>
        <CardDescription>
          Filtre les interventions a traiter et consulte leur historique.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 overflow-hidden">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={taskFilter === filter.id ? "default" : "outline"}
              onClick={() => onTaskFilterChange(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              Chargement des taches...
            </div>
          ) : tasks.length ? (
            tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition hover:border-slate-300 hover:bg-slate-50",
                  selectedTaskId === task.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
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
                      {task.category || "Sans categorie"} · {getTaskTypeLabel(task.task_type)}
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    <div>{task.logs.length} execution(s)</div>
                    <div>Derniere: {formatDate(task.derivedLastCompletedAt)}</div>
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
  );
}
