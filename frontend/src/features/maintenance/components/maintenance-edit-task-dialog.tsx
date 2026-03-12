import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { TaskFormState } from "../types";
import { MaintenanceTaskForm } from "./maintenance-task-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskForm: TaskFormState;
  setTaskForm: Dispatch<SetStateAction<TaskFormState>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  hideTrigger?: boolean;
};

export function MaintenanceEditTaskDialog({
  open,
  onOpenChange,
  taskForm,
  setTaskForm,
  isSubmitting,
  onSubmit,
  disabled = false,
  hideTrigger = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {hideTrigger ? null : (
        <Button type="button" variant="outline" disabled={disabled} onClick={() => onOpenChange(true)}>
          <Pencil className="size-4" />
          Modifier
        </Button>
      )}
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la tache</DialogTitle>
          <DialogDescription>
            Mets a jour le titre, le planning et les notes de cette tache.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <MaintenanceTaskForm taskForm={taskForm} setTaskForm={setTaskForm} />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              <Pencil className="size-4" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
