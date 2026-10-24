import type { Prioriteit } from '@/types';

// Visuele styling per prioriteit.
// Kleur is nooit de ENIGE drager van betekenis — er is altijd ook een icoon/tekst.
export interface PrioriteitStijl {
  label: string;
  // Tailwind-klassen voor een badge
  badge: string;
  // Kleur van een stip/icoon
  stip: string;
  // Icoon-naam (lucide) — wordt in de component omgezet naar een icoon
  icoon: 'flame' | 'equal' | 'arrow-down';
}

const stijlen: Record<Prioriteit, PrioriteitStijl> = {
  hoog: {
    label: 'Hoog',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    stip: 'bg-rose-500',
    icoon: 'flame',
  },
  gemiddeld: {
    label: 'Gemiddeld',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    stip: 'bg-amber-500',
    icoon: 'equal',
  },
  laag: {
    label: 'Laag',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    stip: 'bg-sky-500',
    icoon: 'arrow-down',
  },
};

export function prioriteitStijl(p: Prioriteit): PrioriteitStijl {
  return stijlen[p];
}

// Sorteer-volgorde: hoog eerst
export const prioriteitVolgorde: Record<Prioriteit, number> = {
  hoog: 0,
  gemiddeld: 1,
  laag: 2,
};
