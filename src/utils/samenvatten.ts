import type { AnalyseResultaat, DeadlineInfo } from '@/types';

// ============================================================================
// AI-TECHNIEK: "Tekst genereren, herschrijven of samenvatten" (week 2)
// ============================================================================
//
// Deze module bevat de analysefunctie van StageMate.
//
// In V1 gebeurt de analyse LOKAAL met eenvoudige patronen (sleutelwoorden
// en datumherkenning). Dit is een werkende functie, maar geen taalmodel.
// Later kan de functie `analyseerTekst` vervangen worden door een aanroep
// naar een backend/edge function die een echt taalmodel raadpleegt.
// De API-key mag NOOIT in de frontend staan — die hoort op de server.
//
// De functie retourneert altijd hetzelfde gestructureerde formaat
// (AnalyseResultaat), ongeacht of de verwerking lokaal of via AI gebeurt.

// --- Sleutelwoorden --------------------------------------------------------

// Actiewerkwoord-stammen die op een concrete taak wijzen.
// We matchen op stammen (niet op hele woorden) zodat alle vervoegingen
// worden meegenomen: "lever" → inleveren, ingeleverd, lever, levert.
// "plan" is bewust NIET opgenomen — "Plan van Aanpak" is een
// zelfstandig naamwoord, geen actiewerkwoord. Dit voorkomt dat eiszinnen
// zoals "Het Plan van Aanpak bevat..." als taak worden geclassificeerd.
const TAAK_WOORD_STAMMEN = ['moet', 'lever', 'maak', 'schrijf', 'bereid', 'verzend', 'stuur', 'voltooi', 'onderzoek', 'interview', 'bespreek', 'bespreken', 'dien', 'nemen'];
// Woorden die een zin tot een pure beschrijving maken — nooit een taak.
const PUUR_BESCHRIJVING_WOORDEN = ['bevat', 'bevatten', 'bestaat uit'];

// Woorden die een pure eis of afspraak aangeven (een voorwaarde, niet direct een actie).
const EISE_WOORDEN = ['bevat', 'bevatten', 'minimaal', 'vereist', 'vereisen', 'verplicht', 'via', 'door', 'bestaat uit', 'dient te', 'vooraf'];

// Sterke deadline-signalen. Alleen deze woorden + herkenbare datums
// rechtvaardigen een deadline-classificatie.
// "voor" is bewust NIET opgenomen: het komt voor in "vooraf", "bereid...voor",
// "gevolgen hebben voor". "inleveren" is ook niet opgenomen: het staat in
// waarschuwingen zoals "te laat inleveren kan gevolgen hebben".
const DEADLINE_SIGNALen = ['uiterlijk', 'ten laatste', 'deadline'];

// Woorden die een waarschuwing of gevolg aangeven — nooit een deadline of taak.
const WAARSCHUWING_WOORDEN = ['te laat', 'gevolgen', 'invloed'];

// Volgorde-woorden die een volgorde aanduiden maar geen exacte timing.
// Deze kunnen een aandachtspunt opleveren, maar geen deadline.
const VOLGORDE_WOORDEN = ['vooraf', 'daarna', 'voor die tijd'];

// --- Hulpfuncties ----------------------------------------------------------

// Splitst tekst op in zinnen (eenvoudig, op punten/hard returns)
function splitZinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+|\n+/)
    .map((z) => z.trim())
    .filter((z) => z.length > 3);
}

// Controleer of een zin een van de sleutelwoorden bevat
function bevatWoord(zin: string, woorden: string[]): boolean {
  const lager = zin.toLowerCase();
  return woorden.some((w) => lager.includes(w));
}

// Verwijder dubbele items uit een lijst
function uniek(items: string[]): string[] {
  return [...new Set(items.map((i) => i.trim()).filter((i) => i.length > 0))];
}

// Hoofdletter aan begin van een string (voor nette taaknamen)
function hoofdletter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Schoon een zin op: verwijder prefixen zoals "Let op:" maar kap NOOIT af.
// De volledige tekst blijft altijd behouden.
function schoonZin(zin: string): string {
  return zin.replace(/^.*?:\s*/, '').trim();
}

// --- Datumherkenning -------------------------------------------------------

// Patronen voor exacte datums: "25 september", "12 sep", "2026-09-25"
const EXACTE_DATUM_PATRONEN = [
  /\b\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/gi,
  /\b\d{1,2}\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\b/gi,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
];

// Patronen voor relatieve tijd-aanduidingen die een (onzekere) deadline kunnen zijn.
// "voor die tijd" is hier bewist NIET in opgenomen — dat is een volgorde, geen deadline.
const RELATIEVE_TIJD_PATRONEN = [
  /\bvolgende\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/gi,
  /\bdeze\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|week)\b/gi,
  /\b(binnenkort|zo snel mogelijk|op korte termijn|spoedig|later)\b/gi,
  /\b(binnen\s+\d+\s+dagen?|binnen\s+\d+\s+weken?)\b/gi,
];

// Zoek exacte datumtekst in een zin
function zoekExacteDatum(zin: string): string | null {
  for (const patroon of EXACTE_DATUM_PATRONEN) {
    const match = zin.match(patroon);
    if (match && match.length > 0) return match[0];
  }
  return null;
}

// Zoek relatieve tijd-aanduiding in een zin (bijv. "volgende vrijdag", "binnenkort")
function zoekRelatieveTijd(zin: string): string | null {
  for (const patroon of RELATIEVE_TIJD_PATRONEN) {
    const match = zin.match(patroon);
    if (match && match.length > 0) return match[0];
  }
  return null;
}

// --- Actie-extractie -------------------------------------------------------

// Probeer uit een zin een korte actie-omschrijving te halen (bijv. "Plan van
// Aanpak inleveren"). Geeft null als geen passende actie wordt herkend.
// Dit wordt gebruikt voor zowel mogelijke taken als deadline-omschrijvingen.
function extractActieOmschrijving(zin: string): string | null {
  const lager = zin.toLowerCase();

  // "inleveren", "ingeleverd", "indienen" — bepaal wát ingeleverd moet worden
  if (lager.includes('lever') || lager.includes('indien')) {
    const match = zin.match(/(Plan van Aanpak|verslag|reflectie|stageopdracht|portfolio|plan)/i);
    if (match) return `${hoofdletter(match[0])} inleveren`;
    return 'Document inleveren';
  }

  // "bespreken" — met wie of waarover?
  if (lager.includes('bespreek') || lager.includes('bespreken')) {
    if (lager.includes('hoofdvraag')) return 'Hoofdvraag bespreken met stagebegeleider';
    if (lager.includes('interview')) return 'Interview voorbereiden en afnemen';
    return 'Gesprek voeren met begeleider';
  }

  // "schrijven", "gemaakt", "maken" enz.
  if (lager.includes('schrijf') || lager.includes('maak')) {
    if (lager.includes('plan van aanpak')) return 'Plan van Aanpak maken';
    if (lager.includes('verslag')) return 'Verslag schrijven';
    if (lager.includes('logboek')) return 'Logboek bijhouden';
    if (lager.includes('reflectie')) return 'Reflectie schrijven';
  }

  // "bereiden" — interview voorbereiden
  if (lager.includes('bereid')) return 'Interview voorbereiden';

  // "interview afnemen" of "af te nemen"
  if (lager.includes('interview') && (lager.includes('afname') || lager.includes('afnemen') || lager.includes('nemen'))) return 'Interview afnemen';

  // Geen passende actie herkend
  return null;
}

// --- Deadline-extractie ----------------------------------------------------

// Probeer uit een zin een DeadlineInfo te maken.
// Geeft null als de zin geen echte deadline bevat.
function extraherDeadline(zin: string): DeadlineInfo | null {
  const lager = zin.toLowerCase();

  // Uitsluiten: waarschuwingen en gevolgen zijn nooit deadlines
  if (bevatWoord(zin, WAARSCHUWING_WOORDEN)) return null;

  // Bepaal of er echte timing-informatie aanwezig is
  const exact = zoekExacteDatum(zin);
  const relatief = zoekRelatieveTijd(zin);
  const heeftDeadlineSignaal = DEADLINE_SIGNALen.some((w) => lager.includes(w));

  // Geen enkele timing-aanduiding → geen deadline
  if (!exact && !relatief && !heeftDeadlineSignaal) return null;

  // Omschrijving: probeer een korte actie te extraheren;
  // val terug op de schoongemaakte volledige zin (zonder afkapping)
  const actie = extractActieOmschrijving(zin);
  const omschrijving = actie ?? schoonZin(zin);

  // Deadline met exacte datum
  if (exact) {
    return { omschrijving, datumTekst: exact, onzeker: false };
  }

  // Deadline met relatieve tijd (onzeker)
  if (relatief) {
    return { omschrijving, datumTekst: relatief, onzeker: true };
  }

  // Deadlinesignaal aanwezig maar geen herkenbare datum
  return { omschrijving, datumTekst: 'exacte datum niet genoemd', onzeker: true };
}

// Verwijder dubbele deadlines (zelfde omschrijving + datumTekst)
function dedupliceerDeadlines(deadlines: DeadlineInfo[]): DeadlineInfo[] {
  const gezien = new Set<string>();
  const result: DeadlineInfo[] = [];
  for (const dl of deadlines) {
    const sleutel = `${dl.omschrijving}|${dl.datumTekst}`;
    if (!gezien.has(sleutel)) {
      gezien.add(sleutel);
      result.push(dl);
    }
  }
  return result;
}

// --- Hoofdfunctie: analyseerTekst -------------------------------------------

export function analyseerTekst(tekst: string): AnalyseResultaat {
  const zinnen = splitZinnen(tekst);

  // 1. Korte samenvatting: neem de meest relevante zinnen (max 2)
  //    en combineer ze tot een korte paragraaf. De volledige tekst blijft behouden.
  const samenvattingZinnen = zinnen.slice(0, 2);
  const korteSamenvatting = samenvattingZinnen.join(' ') || 'Geen samenvatting beschikbaar.';

  // 2. Mogelijke taken: zinnen met actiewerkwoorden, exclusief pure
  //    beschrijvingen (bevat/bestaat uit) en waarschuwingen.
  const taakZinnen = zinnen.filter(
    (z) =>
      bevatWoord(z, TAAK_WOORD_STAMMEN) &&
      !bevatWoord(z, PUUR_BESCHRIJVING_WOORDEN) &&
      !bevatWoord(z, WAARSCHUWING_WOORDEN),
  );
  const mogelijkeTaken = taakZinnen
    .map(extractActieOmschrijving)
    .filter((t): t is string => t !== null && t.length > 0);

  // 3. Deadlines: alleen uit zinnen met echte timing-informatie
  const deadlines: DeadlineInfo[] = [];
  for (const zin of zinnen) {
    const dl = extraherDeadline(zin);
    if (dl) deadlines.push(dl);
  }

  // 4. Eisen & afspraken: zinnen met eis-woorden, exclusief waarschuwingen
  const eisZinnen = zinnen.filter(
    (z) => bevatWoord(z, EISE_WOORDEN) && !bevatWoord(z, WAARSCHUWING_WOORDEN),
  );
  const eisenEnAfspraken = eisZinnen.map(schoonZin).filter((z) => z.length > 0);

  // 5. Aandachtspunten: alleen echte onduidelijkheden, nooit algemeen advies
  const aandachtspunten: string[] = [];

  // 5a. Onzekere deadlines met relatieve tijd signaleren
  for (const dl of deadlines) {
    if (dl.onzeker && dl.datumTekst !== 'exacte datum niet genoemd') {
      aandachtspunten.push(`De verwijzing "${dl.datumTekst}" is niet exact — controleer de juiste datum.`);
    }
  }

  // 5b. Deadlines zonder enige datum
  for (const dl of deadlines) {
    if (dl.onzeker && dl.datumTekst === 'exacte datum niet genoemd') {
      aandachtspunten.push('Er wordt een deadline genoemd, maar er staat geen exacte datum in de tekst.');
    }
  }

  // 5c. Volgorde-woorden zonder exacte timing (bijv. "vooraf", "voor die tijd")
  for (const zin of zinnen) {
    if (zoekExacteDatum(zin)) continue; // heeft al een exacte datum
    const lager = zin.toLowerCase();
    for (const woord of VOLGORDE_WOORDEN) {
      if (lager.includes(woord)) {
        aandachtspunten.push(
          `De tekst verwijst naar "${woord}" als moment, maar geeft geen exacte datum. Controleer wanneer dit precies moet gebeuren.`,
        );
        break; // één volgorde-woord per zin is genoeg
      }
    }
  }

  return {
    korteSamenvatting,
    mogelijkeTaken: uniek(mogelijkeTaken).slice(0, 8),
    deadlines: dedupliceerDeadlines(deadlines).slice(0, 6),
    eisenEnAfspraken: uniek(eisenEnAfspraken).slice(0, 8),
    aandachtspunten: uniek(aandachtspunten).slice(0, 5),
  };
}

// --- Voorbeelddata ----------------------------------------------------------

// Voorbeelddata voor de AI-pagina — een stuk tekst uit een fictieve stagehandleiding.
export const VOORBEELD_TEKST = `Het Plan van Aanpak moet uiterlijk 25 september worden ingeleverd. Bespreek vooraf je hoofdvraag met je stagebegeleider. Het Plan van Aanpak bevat minimaal een aanleiding, hoofdvraag en afbakening. Het verslag moet via Brightspace worden ingeleverd. Je dient ook een interview af te nemen met je stagebegeleider. Bereid dit interview goed voor. Let op: te laat inleveren kan gevolgen hebben voor je beoordeling.`;
