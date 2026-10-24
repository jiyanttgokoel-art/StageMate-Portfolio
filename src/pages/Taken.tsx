import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Clock, Inbox } from 'lucide-react';
import type { Taak, Prioriteit } from '@/types';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { PrioriteitBadge } from '@/components/PrioriteitBadge';
import { Modal } from '@/components/Modal';
import { TaakFormulier } from '@/components/TaakFormulier';
import { deadlineTekst, formatDatumKort, dagenTotDeadline, vergelijkDatums } from '@/utils/datum';
import { prioriteitVolgorde } from '@/utils/prioriteit';

interface TakenProps {
  taken: Taak[];
  opToevoegen: (taak: Omit<Taak, 'id' | 'aanmaakdatum'>) => void;
  opAanpassen: (id: string, wijziging: Partial<Taak>) => void;
  opOmschakelen: (id: string) => void;
  opVerwijderen: (id: string) => void;
}

type Weergave = 'open' | 'afgerond';

export function Taken({ taken, opToevoegen, opAanpassen, opOmschakelen, opVerwijderen }: TakenProps) {
  const [weergave, setWeergave] = useState<Weergave>('open');
  const [modalOpen, setModalOpen] = useState(false);
  const [teBewerken, setTeBewerken] = useState<Taak | undefined>(undefined);
  const [teVerwijderen, setTeVerwijderen] = useState<Taak | undefined>(undefined);

  function openNieuw() {
    setTeBewerken(undefined);
    setModalOpen(true);
  }

  function openBewerken(taak: Taak) {
    setTeBewerken(taak);
    setModalOpen(true);
  }

  function opslaan(taak: Omit<Taak, 'id' | 'aanmaakdatum'>) {
    if (teBewerken) {
      opAanpassen(teBewerken.id, taak);
    } else {
      opToevoegen(taak);
    }
    setModalOpen(false);
  }

  // Gesorteerde lijst afhankelijk van weergave
  const gefilterd = useMemo(() => {
    const lijst = taken.filter((t) => (weergave === 'open' ? !t.afgerond : t.afgerond));
    return [...lijst].sort((a, b) => {
      // Open: hoogste prioriteit eerst, dan op deadline
      // Afgerond: nieuwste eerst (op aanmaakdatum)
      if (weergave === 'open') {
        const prio = prioriteitVolgorde[a.prioriteit] - prioriteitVolgorde[b.prioriteit];
        if (prio !== 0) return prio;
        return vergelijkDatums(a.deadline, b.deadline);
      }
      return b.aanmaakdatum.localeCompare(a.aanmaakdatum);
    });
  }, [taken, weergave]);

  const aantalOpen = taken.filter((t) => !t.afgerond).length;
  const aantalAfgerond = taken.filter((t) => t.afgerond).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Taken</h1>
          <p className="mt-1 text-sm text-slate-500">Beheer je stageopdrachten en deadlines.</p>
        </div>
        <button
          type="button"
          onClick={openNieuw}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe taak</span>
        </button>
      </div>

      {/* Tabs: open / afgerond */}
      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
        <TabKnop actief={weergave === 'open'} onClick={() => setWeergave('open')} label="Openstaand" aantal={aantalOpen} />
        <TabKnop actief={weergave === 'afgerond'} onClick={() => setWeergave('afgerond')} label="Afgerond" aantal={aantalAfgerond} />
      </div>

      {/* Takenlijst */}
      {gefilterd.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">
              {weergave === 'open'
                ? 'Geen openstaande taken. Klik op "Nieuwe taak" om er een toe te voegen.'
                : 'Nog geen taken afgerond.'}
            </p>
          </div>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {gefilterd.map((taak) => (
            <TaakRij
              key={taak.id}
              taak={taak}
              opOmschakelen={opOmschakelen}
              opBewerken={openBewerken}
              opVerwijderenClick={setTeVerwijderen}
            />
          ))}
        </ul>
      )}

      {/* Modal: toevoegen / aanpassen */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titel={teBewerken ? 'Taak aanpassen' : 'Nieuwe taak toevoegen'}
      >
        <TaakFormulier taak={teBewerken} opOpslaan={opslaan} opAnnuleren={() => setModalOpen(false)} />
      </Modal>

      {/* Bevestigingsmodal: verwijderen */}
      <Modal
        open={teVerwijderen !== undefined}
        onClose={() => setTeVerwijderen(undefined)}
        titel="Taak verwijderen"
      >
        <div>
          <p className="text-sm text-slate-600">
            Weet je zeker dat je <strong>{teVerwijderen?.titel}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setTeVerwijderen(undefined)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={() => {
                if (teVerwijderen) opVerwijderen(teVerwijderen.id);
                setTeVerwijderen(undefined);
              }}
              className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Verwijderen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TabKnop({ actief, onClick, label, aantal }: { actief: boolean; onClick: () => void; label: string; aantal: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
        actief ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${actief ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'}`}>
        {aantal}
      </span>
    </button>
  );
}

function TaakRij({
  taak,
  opOmschakelen,
  opBewerken,
  opVerwijderenClick,
}: {
  taak: Taak;
  opOmschakelen: (id: string) => void;
  opBewerken: (t: Taak) => void;
  opVerwijderenClick: (t: Taak) => void;
}) {
  const dagen = dagenTotDeadline(taak.deadline);
  const teLaat = !taak.afgerond && dagen !== null && dagen < 0;

  return (
    <li className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="pt-0.5">
        <Checkbox aangevinkt={taak.afgerond} onToggle={() => opOmschakelen(taak.id)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-sm font-medium ${taak.afgerond ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {taak.titel}
          </h3>
          <PrioriteitBadge prioriteit={taak.prioriteit} />
        </div>
        {taak.beschrijving && (
          <p className={`mt-1 text-sm ${taak.afgerond ? 'text-slate-300' : 'text-slate-500'}`}>{taak.beschrijving}</p>
        )}
        {taak.deadline && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <Clock className={`h-3.5 w-3.5 ${teLaat ? 'text-rose-400' : 'text-slate-400'}`} />
            <span className={teLaat ? 'font-medium text-rose-500' : 'text-slate-400'}>
              {formatDatumKort(taak.deadline)} — {deadlineTekst(taak.deadline)}
            </span>
          </div>
        )}
      </div>

      {/* Actieknoppen — verschijnen bij hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => opBewerken(taak)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Taak aanpassen"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => opVerwijderenClick(taak)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          aria-label="Taak verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
