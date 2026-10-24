import { LayoutDashboard, CheckSquare, FileText, Sparkles, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Pagina } from '@/types';

// Layout — de hoofdstructuur van StageMate.
// Bevat een zijbalk (desktop) en een onderbalk (mobiel) voor navigatie.
// De actieve pagina is altijd visueel aangeduid.

interface NavItem {
  id: Pagina;
  label: string;
  icoon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icoon: LayoutDashboard },
  { id: 'taken', label: 'Taken', icoon: CheckSquare },
  { id: 'documenten', label: 'Documenten', icoon: FileText },
  { id: 'ai', label: 'StageMate AI', icoon: Sparkles },
];

interface LayoutProps {
  huidigePagina: Pagina;
  opPagina: (p: Pagina) => void;
  children: React.ReactNode;
}

export function Layout({ huidigePagina, opPagina, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Zijbalk (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col">
        <ZijbalkInhoud huidigePagina={huidigePagina} opPagina={opPagina} />
      </aside>

      {/* Hoofdinhoud */}
      <div className="md:pl-64">
        <main className="min-h-screen pb-20 md:pb-8">{children}</main>
      </div>

      {/* Onderbalk (mobiel) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const Icoon = item.icoon;
            const actief = huidigePagina === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => opPagina(item.id)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                  actief ? 'text-teal-600' : 'text-slate-400'
                }`}
                aria-current={actief ? 'page' : undefined}
              >
                <Icoon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ZijbalkInhoud({ huidigePagina, opPagina }: { huidigePagina: Pagina; opPagina: (p: Pagina) => void }) {
  return (
    <>
      {/* Logo / titel */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">StageMate</h1>
          <p className="text-xs text-slate-400">Jouw stage, overzichtelijk</p>
        </div>
      </div>

      {/* Navigatie */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icoon = item.icoon;
          const actief = huidigePagina === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => opPagina(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                actief
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
              aria-current={actief ? 'page' : undefined}
            >
              <Icoon className="h-5 w-5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Voettekst */}
      <div className="border-t border-slate-100 px-6 py-4">
        <p className="text-xs text-slate-400">V1 — Schoolproject</p>
        <p className="text-xs text-slate-400">AD Informatica</p>
      </div>
    </>
  );
}
