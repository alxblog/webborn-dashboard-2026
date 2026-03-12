import type { Dispatch, FormEvent, SetStateAction } from "react";

import { CheckCircle2, Ellipsis, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MaintenanceLog } from "@/lib/maintenance";

import {
  formatDate,
  formatRelativeDueDate,
  getStatusBadgeClass,
  getStatusLabel,
} from "../formatters";
import type { DecoratedMaintenanceTask, LogFormState } from "../types";
import type { MaintenanceEditTaskDialogProps } from "./types";
import { MaintenanceEditTaskDialog } from "./maintenance-edit-task-dialog";

type Props = {
  selectedTask: DecoratedMaintenanceTask | null;
  selectedLogs: MaintenanceLog[];
  logForm: LogFormState;
  setLogForm: Dispatch<SetStateAction<LogFormState>>;
  isSubmittingLog: boolean;
  onCreateLog: (event: FormEvent<HTMLFormElement>) => void;
  isDeleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  isDeletingTask: boolean;
  onDeleteTask: () => void;
  deletingLogId: string;
  onDeleteLog: (logId: string) => void;
  editDialog: MaintenanceEditTaskDialogProps;
};

export function MaintenanceDetailCard({
  selectedTask,
  selectedLogs,
  logForm,
  setLogForm,
  isSubmittingLog,
  onCreateLog,
  isDeleteDialogOpen,
  onDeleteDialogChange,
  isDeletingTask,
  onDeleteTask,
  deletingLogId,
  onDeleteLog,
  editDialog,
}: Props) {
  return (
    <div className="min-w-0 self-start xl:sticky xl:top-24">
      <Card className="min-h-[32rem] xl:h-[calc(100vh-7rem)] xl:overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Detail et historique</CardTitle>
              <CardDescription>
                Enregistre une execution et consulte les passages precedents.
              </CardDescription>
            </div>

            {selectedTask ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <MaintenanceEditTaskDialog {...editDialog} hideTrigger />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon-sm">
                      <Ellipsis className="size-4" />
                      <span className="sr-only">Actions de la tache</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => editDialog.onOpenChange(true)}>
                      <Pencil className="size-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDeleteDialogChange(true)}
                    >
                      <Trash2 className="size-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogChange}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Supprimer cette tache ?</DialogTitle>
                      <DialogDescription>
                        Cette action supprimera aussi l'historique associe via la
                        relation en cascade. Elle est irreversible.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <span className="font-medium text-slate-950">{selectedTask.title}</span>
                      <div className="mt-1">{selectedLogs.length} execution(s) enregistree(s)</div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onDeleteDialogChange(false)}
                        disabled={isDeletingTask}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={onDeleteTask}
                        disabled={isDeletingTask}
                      >
                        <Trash2 className="size-4" />
                        {isDeletingTask ? "Suppression..." : "Confirmer"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col space-y-6">
          {selectedTask ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-950">{selectedTask.title}</h2>
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
                    <div className="text-xs uppercase tracking-wide text-slate-500">Regle</div>
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
                    <div className="text-xs uppercase tracking-wide text-slate-500">Alerte</div>
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

              <form className="space-y-4" onSubmit={onCreateLog}>
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

              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div className="text-sm font-medium text-slate-900">Historique</div>
                <ScrollArea className="min-h-0 flex-1 xl:pr-3">
                  <div className="space-y-3">
                    {selectedLogs.length ? (
                      selectedLogs.map((log) => (
                        <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
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
                                onClick={() => onDeleteLog(log.id)}
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
                </ScrollArea>
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
  );
}
