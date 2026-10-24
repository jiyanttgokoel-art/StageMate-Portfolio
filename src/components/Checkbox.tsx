import { Check } from 'lucide-react';

interface CheckboxProps {
  aangevinkt: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}

// Checkbox — een visuele ronde checkbox voor taak-afronden.
export function Checkbox({ aangevinkt, onToggle, ariaLabel }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel ?? (aangevinkt ? 'Taak als open markeren' : 'Taak als afgerond markeren')}
      aria-pressed={aangevinkt}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
        aangevinkt
          ? 'border-teal-500 bg-teal-500 text-white'
          : 'border-slate-300 bg-white text-transparent hover:border-teal-400'
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
}
