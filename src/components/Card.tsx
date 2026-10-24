import type { ReactNode } from 'react';

// Card — een herbruikbare kaart met consistente styling.
// Houdt de UI rustig en overzichtelijk.

interface CardProps {
  children: ReactNode;
  className?: string;
  titel?: string;
  icoon?: ReactNode;
  actie?: ReactNode;
}

export function Card({ children, className = '', titel, icoon, actie }: CardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(titel || actie) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            {icoon && <span className="text-slate-400">{icoon}</span>}
            {titel && <h3 className="text-sm font-semibold text-slate-700">{titel}</h3>}
          </div>
          {actie}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
