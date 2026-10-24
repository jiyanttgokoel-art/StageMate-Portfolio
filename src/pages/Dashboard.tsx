import { Clock, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import type { Taak, Pagina } from '@/types';
import { Card } from '@/components/Card';
import { VoortgangBalk } from '@/components/VoortgangBalk';
import { PrioriteitBadge, PrioriteitStip } from '@/components/PrioriteitBadge';
import { Checkbox } from '@/components/Checkbox';
import { deadlineTekst, dagenTotDeadline, vergelijkDatums, formatDatumKort } from '@/utils/datum';
import { prioriteitVolgorde } from '@/utils/prioriteit';

interface DashboardProps {
  taken: Taak[];
  opOmschakelen: (id: string) => void;
  opPagina: (p: Pagina) => void;
}

export function Dashboard({ taken, opOmschakelen, opPagina }: DashboardProps) {
  const openstaand = taken.filter((t) => !t.afgerond);
  const afgerond = taken.filter((t) => t.afgerond);
  const voortgangPct = taken.length > 0 ? (afgerond.length / taken.length) * 100 : 0;

  // Bepaal prioriteiten: openstaande taken, hoog eerst, dan op deadline
  const prioriteiten = [...openstaand]
    .sort((a, b) => {
      const prioVerschil = prioriteitVolgorde[a.prioriteit] - prioriteitVolgorde[b.prioriteit];
      if (prioVerschil !== 0) return prioVerschil;
      return vergelijkDatums(a.deadline, b.deadline);
    })
    .slice(0, 3);

  // Aankomende deadlines: openstaande taken met deadline, op datum gesorteerd
  const aankomendeDeadlines = [...openstaand]
    .filter((t) => t.deadline)
    .sort((a, b) => vergelijkDatums(a.deadline, b.deadline))
    .slice(0, 4);

  // Bepaal begroeting op tijdstip
  const uur = new Date().getHours();
  const begroeting = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond';

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      {/* A. Welkomstgedeelte */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{begroeting}</h1>
        <p className="mt-1 text-slate-500">
          {openstaand.length > 0
            ? `Dit heeft vandaag je aandacht nodig. ${openstaand.length} ${openstaand.length === 1 ? 'taak staat' : 'taken staan'} nog open.`
            : 'Je hebt geen openstaande taken. Goed bezig!'}
        </p>
      </div>

      {/* B. Prioriteiten + D. Voortgang naast elkaar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Prioriteiten (2/3 breedte) */}
        <div className="lg:col-span-2">
          <Card titel="Prioriteiten" icoon={<AlertCircle className="h-4 w-4" />}>
            {prioriteiten.length === 0 ? (
              <LegeState
                tekst="Geen openstaande taken."
                actieLabel="Nieuwe taak aanmaken"
                onActie={() => opPagina('taken')}
              />
            ) : (
              <ul className="space-y-3">
                {prioriteiten.map((taak) => (
                  <PrioriteitRij key={taak.id} taak={taak} opOmschakelen={opOmschakelen} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Voortgang (1/3 breedte) */}
        <div>
          <Card titel="Voortgang" icoon={<CheckCircle2 className="h-4 w-4" />}>
            <div className="mb-4 space-y-2">
              <Stat label="Afgerond" waarde={afgerond.length} />
              <Stat label="Openstaand" waarde={openstaand.length} />
              <Stat label="Totaal" waarde={taken.length} />
            </div>
            <VoortgangBalk waarde={voortgangPct} label="Voltooid" />
          </Card>
        </div>
      </div>

      {/* C. Aankomende deadlines + E. Snelle toegang tot AI */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Aankomende deadlines */}
        <div className="lg:col-span-2">
          <Card titel="Aankomende deadlines" icoon={<Clock className="h-4 w-4" />}>
            {aankomendeDeadlines.length === 0 ? (
              <LegeState tekst="Geen deadlines gepland." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {aankomendeDeadlines.map((taak) => {
                  const dagen = dagenTotDeadline(taak.deadline);
                  const teLaat = dagen !== null && dagen < 0;
                  const dringend = dagen !== null && dagen >= 0 && dagen <= 2;
                  return (
                    <li key={taak.id} className="flex items-center gap-3 py-3">
                      <PrioriteitStip prioriteit={taak.prioriteit} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{taak.titel}</p>
                        <p className="text-xs text-slate-400">{formatDatumKort(taak.deadline)}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          teLaat ? 'text-rose-600' : dringend ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {deadlineTekst(taak.deadline)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Snelle toegang tot StageMate AI */}
        <div>
          <Card titel="Vraag StageMate" icoon={<Sparkles className="h-4 w-4" />}>
            <p className="mb-3 text-sm text-slate-500">
              Snel een vraag stellen of een samenvatting maken? Ga naar StageMate AI.
            </p>
            <button
              type="button"
              onClick={() => opPagina('ai')}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left text-sm text-slate-600 transition-all hover:border-teal-300 hover:bg-teal-50"
            >
              <span>"Wat moet ik deze week doen?"</span>
              <ArrowRight className="h-4 w-4 text-teal-500" />
            </button>
            <button
              type="button"
              onClick={() => opPagina('ai')}
              className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left text-sm text-slate-600 transition-all hover:border-teal-300 hover:bg-teal-50"
            >
              <span>Tekst samenvatten</span>
              <ArrowRight className="h-4 w-4 text-teal-500" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Een prioriteiten-rij met checkbox, titel, deadline en badge
function PrioriteitRij({ taak, opOmschakelen }: { taak: Taak; opOmschakelen: (id: string) => void }) {
  const dagen = dagenTotDeadline(taak.deadline);
  const teLaat = dagen !== null && dagen < 0;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
      <Checkbox aangevinkt={taak.afgerond} onToggle={() => opOmschakelen(taak.id)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{taak.titel}</p>
        <p className={`text-xs ${teLaat ? 'text-rose-500' : 'text-slate-400'}`}>
          {deadlineTekst(taak.deadline)}
        </p>
      </div>
      <PrioriteitBadge prioriteit={taak.prioriteit} />
    </li>
  );
}

function Stat({ label, waarde }: { label: string; waarde: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-800">{waarde}</span>
    </div>
  );
}

function LegeState({
  tekst,
  actieLabel,
  onActie,
}: {
  tekst: string;
  actieLabel?: string;
  onActie?: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-sm text-slate-400">{tekst}</p>
      {actieLabel && onActie && (
        <button
          type="button"
          onClick={onActie}
          className="mt-2 text-sm font-medium text-teal-600 transition-colors hover:text-teal-700"
        >
          {actieLabel}
        </button>
      )}
    </div>
  );
}
