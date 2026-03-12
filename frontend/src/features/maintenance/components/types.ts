import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";

import type { TaskFormState } from "../types";

export type MaintenanceCreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskForm: TaskFormState;
  setTaskForm: Dispatch<SetStateAction<TaskFormState>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export type MaintenanceEditTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskForm: TaskFormState;
  setTaskForm: Dispatch<SetStateAction<TaskFormState>>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
};

export type MaintenanceImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importPreview: import("../types").ImportPreview | null;
  importFileName: string;
  isImporting: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadSample: () => void;
};
