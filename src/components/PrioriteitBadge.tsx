import { Flame, Equal, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prioriteitStijl } from '@/utils/prioriteit';
import type { Prioriteit } from '@/types';

// PrioriteitBadge — toont de prioriteit van een taak.
// Kleur is niet de enige drager: er is ook een icoon en tekstlabel.

const iconen: Record<string, LucideIcon> = {
  flame: Flame,
  equal: Equal,
  'arrow-down': ArrowDown,
};

export function PrioriteitBadge({ prioriteit }: { prioriteit: Prioriteit }) {
  const stijl = prioriteitStijl(prioriteit);
  const Icoon = iconen[stijl.icoon];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${stijl.badge}`}>
      <Icoon className="h-3.5 w-3.5" aria-hidden="true" />
      {stijl.label}
    </span>
  );
}

// Een kleine gekleurde stip voor in lijsten (bijv. naast een taaktitel)
export function PrioriteitStip({ prioriteit }: { prioriteit: Prioriteit }) {
  const stijl = prioriteitStijl(prioriteit);
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${stijl.stip}`}
      aria-label={`Prioriteit: ${stijl.label}`}
      title={`Prioriteit: ${stijl.label}`}
    />
  );
}
