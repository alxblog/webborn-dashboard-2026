import type { ChangeEvent } from "react";

import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { IMPORT_LOG_HEADERS, IMPORT_TASK_HEADERS } from "../constants";
import { formatDate } from "../formatters";
import type { ImportPreview } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importPreview: ImportPreview | null;
  importFileName: string;
  isImporting: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadSample: () => void;
};

export function MaintenanceImportDialog({
  open,
  onOpenChange,
  importPreview,
  importFileName,
  isImporting,
  onFileChange,
  onImport,
  onDownloadSample,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            Importe des taches, des logs, ou les deux. Les taches deja presentes
            sont ignorees sur la base du titre.
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
                onClick={onDownloadSample}
              >
                <Download className="size-4" />
                Telecharger un exemple de CSV
              </Button>
              <Input
                id="maintenance-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={onFileChange}
              />
              {importFileName ? <p className="text-xs text-slate-500">{importFileName}</p> : null}
            </div>

            <Button
              type="button"
              onClick={onImport}
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
                        <div key={`${task.title}-${index}`} className="rounded-xl bg-slate-50 p-3">
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
                        <div className="text-muted-foreground">Aucune tache detectee.</div>
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
                          <div className="font-medium text-slate-900">{log.taskTitle}</div>
                          <div>{formatDate(log.performedAt)}</div>
                        </div>
                      ))}
                      {!importPreview.logRows.length ? (
                        <div className="text-muted-foreground">Aucun log detecte.</div>
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
  );
}
