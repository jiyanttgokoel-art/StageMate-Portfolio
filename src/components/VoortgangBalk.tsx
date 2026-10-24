interface VoortgangBalkProps {
  waarde: number; // 0-100
  label?: string;
}

// VoortgangBalk — een eenvoudige progressbar.
// Toont het percentage afgeronde taken.
export function VoortgangBalk({ waarde, label }: VoortgangBalkProps) {
  const pct = Math.min(100, Math.max(0, Math.round(waarde)));

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">{label}</span>
          <span className="font-semibold text-slate-800">{pct}%</span>
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
