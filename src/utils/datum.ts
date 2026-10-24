// Hulpfuncties voor datumweergave in het Nederlands.
// Houd de logica hier bij elkaar zodat de rest van de app eenvoudig blijft.

const dagen = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

// Formateer een ISO-datum als leesbare Nederlandse tekst.
// "2026-09-12" -> "vrijdag 12 sep"
export function formatDatumKort(iso?: string): string {
  if (!iso) return 'Geen deadline';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Geen deadline';
  return `${dagen[d.getDay()]} ${d.getDate()} ${maandKort(d.getMonth())}`;
}

// "2026-09-12" -> "12 september 2026"
export function formatDatumLang(iso?: string): string {
  if (!iso) return 'Geen deadline';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Geen deadline';
  return `${d.getDate()} ${maanden[d.getMonth()]} ${d.getFullYear()}`;
}

// Aantal dagen vanaf vótót de deadline.
// Positief = nog dagen over, 0 = vandaag, negatief = te laat.
export function dagenTotDeadline(iso?: string): number | null {
  if (!iso) return null;
  const deadline = new Date(iso + 'T00:00:00');
  if (isNaN(deadline.getTime())) return null;
  const vandaag = new Date();
  vandaag.setHours(0, 0, 0, 0);
  const verschil = deadline.getTime() - vandaag.getTime();
  return Math.round(verschil / (1000 * 60 * 60 * 24));
}

// Mensvriendelijke omschrijving van de deadline.
// "over 3 dagen", "vandaag", "1 dag te laat", "geen deadline"
export function deadlineTekst(iso?: string): string {
  const dagen = dagenTotDeadline(iso);
  if (dagen === null) return 'Geen deadline';
  if (dagen === 0) return 'Vandaag';
  if (dagen === 1) return 'Morgen';
  if (dagen === -1) return 'Gisteren te laat';
  if (dagen > 1) return `Over ${dagen} dagen`;
  return `${Math.abs(dagen)} dagen te laat`;
}

const maanden = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

function maandKort(i: number): string {
  return ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][i];
}

// Sorteer ISO-datums. Datums zonder waarde komen laat te staan.
export function vergelijkDatums(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

// Vandaag als ISO YYYY-MM-DD
export function vandaagISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dag = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dag}`;
}
