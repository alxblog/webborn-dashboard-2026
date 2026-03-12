import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { MaintenanceCreateTaskDialog } from "./maintenance-create-task-dialog";
import { MaintenanceImportDialog } from "./maintenance-import-dialog";
import type { MaintenanceCreateTaskDialogProps, MaintenanceImportDialogProps } from "./types";

type Props = {
  createDialog: MaintenanceCreateTaskDialogProps;
  importDialog: MaintenanceImportDialogProps;
  onExportTasks: () => void;
  onExportLogs: () => void;
};

export function MaintenanceActionsCard({
  createDialog,
  importDialog,
  onExportTasks,
  onExportLogs,
}: Props) {
  return (
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
          <MaintenanceCreateTaskDialog {...createDialog} />
          <MaintenanceImportDialog {...importDialog} />
          <Button type="button" variant="outline" onClick={onExportTasks}>
            <Download className="size-4" />
            Export taches
          </Button>
          <Button type="button" variant="outline" onClick={onExportLogs}>
            <Download className="size-4" />
            Export logs
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
