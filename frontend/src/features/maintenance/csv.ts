import type {
  BulkImportLogInput,
  BulkImportTaskInput,
  MaintenanceTaskType,
  RecurrenceUnit,
} from "@/lib/maintenance";

import { IMPORT_LOG_HEADERS, IMPORT_TASK_HEADERS } from "./constants";
import type { ImportPreview } from "./types";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headers: [] as string[], rows: [] as Record<string, string>[] };
  }

  const [headerLine = "", ...dataLines] = lines;
  const headers = parseCsvLine(headerLine);
  const rows = dataLines.map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce<Record<string, string>>((result, header, index) => {
      result[header] = values[index] ?? "";
      return result;
    }, {});
  });

  return { headers, rows };
}

function escapeCsvCell(value: unknown) {
  const stringValue = `${value ?? ""}`;
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export function buildCsv(headers: readonly string[], rows: unknown[][]) {
  const headerLine = headers.join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return [headerLine, ...rowLines].join("\n");
}

export function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function isMaintenanceTaskType(value: string): value is MaintenanceTaskType {
  return value === "recurring" || value === "one_off" || value === "log_only";
}

function isRecurrenceUnit(value: string): value is RecurrenceUnit {
  return value === "day" || value === "week" || value === "month" || value === "year";
}

function normalizeDateValue(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Date invalide (${value}).`);
  }

  return parsed.toISOString();
}

export function buildImportPreview(text: string): ImportPreview {
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
          performedAt: normalizeDateValue(row.performed_at ?? ""),
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

  return { headers, errors, taskRows, logRows };
}
