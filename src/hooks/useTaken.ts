import { useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Taak } from '@/types';

// useTaken — de centrale hook voor taakbeheer.
// Leest taken uit localStorage en biedt functies om taken toe te voegen,
// aan te passen, af te ronden en te verwijderen.
//
// Dit is de ENIGE plek waar taak-gegevens gewijzigd worden.
// Componenten gebruiken deze hook en hoeven zich niet met localStorage te bemoeien.

const OPSLAG_SLEUTEL = 'stagemate-taken';

export function useTaken() {
  const [taken, setTaken] = useLocalStorage<Taak[]>(OPSLAG_SLEUTEL, []);

  // Oude V1-demo's ook opruimen bij bestaande browsers.
  useEffect(() => {
    setTaken((prev) => {
      const zonderDemoTaken = prev.filter((taak) => !taak.id.startsWith('seed-'));
      return zonderDemoTaken.length === prev.length ? prev : zonderDemoTaken;
    });
  }, [setTaken]);

  // Nieuwe taak toevoegen
  const taakToevoegen = useCallback(
    (taak: Omit<Taak, 'id' | 'aanmaakdatum'>) => {
      const nieuweTaak: Taak = {
        ...taak,
        id: `taak-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        aanmaakdatum: new Date().toISOString().slice(0, 10),
      };
      setTaken((prev) => [...prev, nieuweTaak]);
    },
    [setTaken],
  );

  // Bestaande taak aanpassen
  const taakAanpassen = useCallback(
    (id: string, wijziging: Partial<Taak>) => {
      setTaken((prev) => prev.map((t) => (t.id === id ? { ...t, ...wijziging } : t)));
    },
    [setTaken],
  );

  // Taak als afgerond / nog-open markeren
  const taakOmschakelen = useCallback(
    (id: string) => {
      setTaken((prev) => prev.map((t) => (t.id === id ? { ...t, afgerond: !t.afgerond } : t)));
    },
    [setTaken],
  );

  // Taak verwijderen
  const taakVerwijderen = useCallback(
    (id: string) => {
      setTaken((prev) => prev.filter((t) => t.id !== id));
    },
    [setTaken],
  );

  return {
    taken,
    taakToevoegen,
    taakAanpassen,
    taakOmschakelen,
    taakVerwijderen,
  };
}
