import type { Dispatch, SetStateAction } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceTaskType, RecurrenceUnit } from "@/lib/maintenance";

import type { TaskFormState } from "../types";

type Props = {
  taskForm: TaskFormState;
  setTaskForm: Dispatch<SetStateAction<TaskFormState>>;
};

export function MaintenanceTaskForm({ taskForm, setTaskForm }: Props) {
  return (
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
            <label className="text-sm font-medium">Date de reference</label>
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
          <label className="text-sm font-medium">Echeance unique</label>
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
  );
}
