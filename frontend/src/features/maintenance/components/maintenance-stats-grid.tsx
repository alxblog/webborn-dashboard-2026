import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { MaintenanceStats } from "../types";

type Props = {
  stats: MaintenanceStats;
};

export function MaintenanceStatsGrid({ stats }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="gap-1">
          <CardDescription>Total</CardDescription>
          <CardTitle className="text-3xl">{stats.total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1">
          <CardDescription>En retard</CardDescription>
          <CardTitle className="text-3xl text-red-700">{stats.overdue}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1">
          <CardDescription>Bientot dues</CardDescription>
          <CardTitle className="text-3xl text-amber-700">{stats.dueSoon}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1">
          <CardDescription>A jour</CardDescription>
          <CardTitle className="text-3xl text-emerald-700">{stats.upToDate}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1">
          <CardDescription>Sans echeance</CardDescription>
          <CardTitle className="text-3xl text-slate-700">{stats.unscheduled}</CardTitle>
        </CardHeader>
      </Card>
    </section>
  );
}
