import { Wrench } from "lucide-react";

export function MaintenanceHero() {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fffdf7,#f4f7ff_55%,#eefbf4)] p-8 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
        <Wrench className="size-4" />
        Maintenance et historique d'execution
      </div>
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Gere les taches ponctuelles et recurrentes avec leur echeance reelle.
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Chaque tache porte sa regle de periodicite, et chaque execution cree une
          entree d'historique. Le statut affiche si l'echeance est depassee, a
          venir ou simplement libre d'historique.
        </p>
      </div>
    </section>
  );
}
