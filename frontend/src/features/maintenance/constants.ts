import type { BulkImportTaskInput } from "@/lib/maintenance";

import type { TaskFormState } from "./types";

export const IMPORT_TASK_HEADERS = [
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

export const IMPORT_LOG_HEADERS = ["task_title", "performed_at", "note"] as const;

export const DEFAULT_TASK_FORM: TaskFormState = {
  title: "",
  category: "",
  description: "",
  taskType: "recurring",
  recurrenceValue: "6",
  recurrenceUnit: "month",
  anchorDate: "",
  fixedDueDate: "",
  dueSoonDays: "14",
  notes: "",
};

export const SAMPLE_TASK_ROWS: BulkImportTaskInput[] = [
  {
    title: "Changer filtre a eau",
    category: "Cuisine",
    description: "Remplacer la cartouche du filtre.",
    taskType: "recurring",
    recurrenceValue: 6,
    recurrenceUnit: "month",
    anchorDate: "2026-01-01T09:00:00.000Z",
    dueSoonDays: 14,
    notes: "Couper l'arrivee d'eau avant intervention.",
  },
  {
    title: "Laver les vitres",
    category: "Entretien",
    description: "Nettoyage interieur et exterieur.",
    taskType: "log_only",
    dueSoonDays: 14,
    notes: "Pas de periodicite imposee.",
  },
  {
    title: "Verifier detecteurs de fumee",
    category: "Securite",
    description: "Tester les detecteurs et remplacer les piles si necessaire.",
    taskType: "recurring",
    recurrenceValue: 12,
    recurrenceUnit: "month",
    anchorDate: "2026-02-01T10:00:00.000Z",
    dueSoonDays: 30,
    notes: "Faire un test sonore dans chaque piece.",
  },
  {
    title: "Entretien climatisation",
    category: "CVC",
    description: "Faire intervenir un technicien pour le nettoyage annuel.",
    taskType: "recurring",
    recurrenceValue: 1,
    recurrenceUnit: "year",
    anchorDate: "2026-03-15T08:00:00.000Z",
    dueSoonDays: 21,
    notes: "Prevoir acces aux unites interieures et exterieures.",
  },
  {
    title: "Nettoyage gouttieres",
    category: "Exterieur",
    description: "Retirer les feuilles et verifier l'ecoulement.",
    taskType: "one_off",
    fixedDueDate: "2026-10-05T09:30:00.000Z",
    dueSoonDays: 10,
    notes: "Idealement avant les fortes pluies d'automne.",
  },
  {
    title: "Controle pression chaudiere",
    category: "Chauffage",
    description: "Verifier la pression et ajuster si necessaire.",
    taskType: "log_only",
    dueSoonDays: 14,
    notes: "A consigner a chaque controle manuel.",
  },
];
