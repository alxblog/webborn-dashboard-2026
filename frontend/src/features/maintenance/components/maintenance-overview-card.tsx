import { CalendarClock, CheckCircle2, History } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MaintenanceOverviewCard() {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble</CardTitle>
          <CardDescription>
            Les taches recurrentes calculent leur prochaine echeance depuis la
            derniere execution ou la date de reference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-4 lg:grid-cols-3">
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
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
