import { useState } from 'react';
import type { Taak, Prioriteit } from '@/types';
import { vandaagISO } from '@/utils/datum';

interface TaakFormulierProps {
  taak?: Taak; // bestaande taak = aanpassen; geen = nieuw
  opOpslaan: (taak: Omit<Taak, 'id' | 'aanmaakdatum'>) => void;
  opAnnuleren: () => void;
}

// TaakFormulier — formulier voor toevoegen en aanpassen van een taak.
// Wordt in een Modal getoond.
export function TaakFormulier({ taak, opOpslaan, opAnnuleren }: TaakFormulierProps) {
  const [titel, setTitel] = useState(taak?.titel ?? '');
  const [beschrijving, setBeschrijving] = useState(taak?.beschrijving ?? '');
  const [deadline, setDeadline] = useState(taak?.deadline ?? '');
  const [prioriteit, setPrioriteit] = useState<Prioriteit>(taak?.prioriteit ?? 'gemiddeld');
  const [fout, setFout] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) {
      setFout('Vul een titel in.');
      return;
    }
    opOpslaan({
      titel: titel.trim(),
      beschrijving: beschrijving.trim() || undefined,
      deadline: deadline || undefined,
      prioriteit,
      afgerond: taak?.afgerond ?? false,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Titel */}
      <div>
        <label htmlFor="taak-titel" className="mb-1.5 block text-sm font-medium text-slate-700">
          Titel <span className="text-rose-500">*</span>
        </label>
        <input
          id="taak-titel"
          type="text"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Bijv. Plan van Aanpak afronden"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          autoFocus
        />
      </div>

      {/* Beschrijving */}
      <div>
        <label htmlFor="taak-beschrijving" className="mb-1.5 block text-sm font-medium text-slate-700">
          Beschrijving
        </label>
        <textarea
          id="taak-beschrijving"
          value={beschrijving}
          onChange={(e) => setBeschrijving(e.target.value)}
          placeholder="Korte toelichting (optioneel)"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {/* Deadline + Prioriteit naast elkaar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="taak-deadline" className="mb-1.5 block text-sm font-medium text-slate-700">
            Deadline
          </label>
          <input
            id="taak-deadline"
            type="date"
            value={deadline}
            min={vandaagISO()}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <div>
          <label htmlFor="taak-prioriteit" className="mb-1.5 block text-sm font-medium text-slate-700">
            Prioriteit
          </label>
          <select
            id="taak-prioriteit"
            value={prioriteit}
            onChange={(e) => setPrioriteit(e.target.value as Prioriteit)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="hoog">Hoog</option>
            <option value="gemiddeld">Gemiddeld</option>
            <option value="laag">Laag</option>
          </select>
        </div>
      </div>

      {fout && <p className="text-sm text-rose-600">{fout}</p>}

      {/* Knoppen */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={opAnnuleren}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Annuleren
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          {taak ? 'Opslaan' : 'Taak toevoegen'}
        </button>
      </div>
    </form>
  );
}
