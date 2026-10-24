import type { DocumentChunk, DocumentItem } from '@/types';

export const CHUNK_VERSIE = 8;

const DOEL_CHUNK_LENGTE = 1200;
const OVERLAP_TEKENS = 180;

interface BronBlok {
  tekst: string;
  pagina?: number;
  sectie?: string;
}

const SECTIE_PREFIXES = [
  'qualification strategy for needs',
  'uml usecase diagram',
  'schetsontwerpen user interface',
  'goal-directed design',
  'fact based analyse',
  'entity relation diagram',
  'requirements engineering in the problem domain',
  'requirements engineering in the solution domain',
] as const;

const BEKENDE_SECTIES = new Set([
  'requirements',
  'stakeholder requirements',
  'system requirements',
  'static requirements',
  'dynamic requirements',
  'integratietesten',
  'systeemtesten',
  'acceptance test',
  'niet-functionele eisen',
  'statement of needs',
  'knelpuntanalyse',
  'stakeholder list',
  'functional requirements',
  'non-functional requirements',
  'requirements engineering in the problem domain',
  'requirements engineering in the solution domain',
  'qualification strategy for needs',
  'usage model',
  'useage model',
  'uml usecase diagram',
  'schetsontwerpen user interface',
  'goal-directed design',
  'system models – static',
  'system models - static',
  'fact based analyse',
  'uml class diagram',
  'entity relation diagram (erd)',
  'system models – dynamic',
  'system models - dynamic',
  'uml activity diagram',
  'literatuurlijst',
  'akkoordverklaring',
]);

export function maakDocumentChunks(
  document: Pick<DocumentItem, 'id' | 'naam' | 'inhoud'>,
): DocumentChunk[] {
  if (!document.inhoud?.trim()) return [];

  const bronBlokken = maakBronBlokken(document.inhoud);
  const chunks: DocumentChunk[] = [];
  let volgnummer = 1;

  for (const blok of bronBlokken) {
    const semantischeBlokken = splitsSemantischeSubblokken(blok);

    for (const semantischBlok of semantischeBlokken) {
      const delen = deelTekstMetOverlap(semantischBlok.tekst);

      for (const tekst of delen) {
        chunks.push({
          id: `${document.id}-chunk-${volgnummer}`,
          documentId: document.id,
          documentNaam: document.naam,
          volgnummer,
          tekst,
          pagina: semantischBlok.pagina,
          sectie: semantischBlok.sectie,
        });
        volgnummer += 1;
      }
    }
  }

  return chunks;
}

function maakBronBlokken(tekst: string): BronBlok[] {
  const regels = tekst.split('\n');
  const blokken: BronBlok[] = [];

  let pagina: number | undefined;
  let sectie: string | undefined;
  let buffer: string[] = [];
  let inInhoudsopgave = false;

  function flush() {
    const inhoud = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (inhoud) {
      blokken.push({ tekst: inhoud, pagina, sectie });
    }
    buffer = [];
  }

  function isInhoudsopgaveStart(regel: string) {
    return /^inhoudsopgave(?:\s+\d+)?$/i.test(regel);
  }

  function isEchteSectieNaInhoudsopgave(regel: string) {
    const zonderNummer = regel.replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').trim();
    return BEKENDE_SECTIES.has(regel.toLowerCase()) || BEKENDE_SECTIES.has(zonderNummer.toLowerCase());
  }

  function bufferHeeftAlleenSectiekop() {
    const regelsInBuffer = buffer.map((item) => item.trim()).filter(Boolean);
    return regelsInBuffer.length === 1 && isWaarschijnlijkeSectie(regelsInBuffer[0]);
  }

  for (const ruweRegel of regels) {
    const regel = ruweRegel.trim();

    if (!regel) {
      // Lege regels zijn opmaak, geen inhoudelijke grens.
      // Niet tussentijds flushen: zo blijft de volledige sectie beschikbaar
      // voor de semantische splitter voordat lengte-splitting plaatsvindt.
      continue;
    }

    if (isInhoudsopgaveStart(regel)) {
      // Inhoudsopgave is navigatie, geen inhoudelijke bron voor Q&A.
      flush();
      inInhoudsopgave = true;
      continue;
    }

    if (inInhoudsopgave) {
      const lijktTocRegel = /\s\d+$/.test(regel);

      if (isEchteSectieNaInhoudsopgave(regel) && !lijktTocRegel) {
        inInhoudsopgave = false;
      } else {
        continue;
      }
    }

    const paginaMatch = regel.match(/^\[Pagina\s+(\d+)\]$/i);
    if (paginaMatch) {
      flush();
      pagina = Number(paginaMatch[1]);
      continue;
    }

    if (isWaarschijnlijkeSectie(regel)) {
      // Maak geen nutteloos chunk van alleen een bovenliggende kop.
      if (bufferHeeftAlleenSectiekop()) {
        buffer = [];
      } else {
        flush();
      }

      sectie = schoonSectieLabel(regel);
      buffer.push(regel);
      continue;
    }

    buffer.push(regel);

    // Niet op ruwe lengte flushen: eerst de volledige herkende sectie bewaren.
    // Daarna splitst splitsSemantischeSubblokken op betekenisvolle interne labels
    // en pas daarna deelt deelTekstMetOverlap een te groot onderdeel verder op.
  }

  flush();
  return blokken;
}

function splitsSemantischeSubblokken(blok: BronBlok): BronBlok[] {
  const tekst = blok.tekst.trim();
  if (!tekst) return [];

  const sectie = blok.sectie?.toLowerCase() ?? '';

  type InterneMatch = {
    index: number;
    label: string;
  };

  let matches: InterneMatch[] = [];

  if (sectie === 'static requirements' || sectie === 'dynamic requirements') {
    const patroon = /\b([IK]\d+\s+SBVR\s+(?:static|dynamics?)\s+.*?)(?=\s+1\.\s)/gi;
    matches = [...tekst.matchAll(patroon)].map((match) => ({
      index: match.index ?? 0,
      label: match[1].trim(),
    }));
  } else if (sectie === 'stakeholder requirements') {
    const patroon = /\b([IK]\d+)\.\s+/g;
    matches = [...tekst.matchAll(patroon)].map((match) => ({
      index: match.index ?? 0,
      label: `Stakeholder Requirements — ${match[1]}`,
    }));
  } else if (sectie === 'non-functional requirements') {
    const patroon = /\b(Integriteit|Bedienbaarheid|Capaciteit|Beschikbaarheid)\s+Kwaliteit\b/gi;
    matches = [...tekst.matchAll(patroon)].map((match) => ({
      index: match.index ?? 0,
      label: `Non-functional Requirements — ${match[1]}`,
    }));
  } else if (sectie === 'niet-functionele eisen') {
    const patroon = /\bNF([1-4])\.1\b/g;
    const categorieen: Record<string, string> = {
      '1': 'Integriteit',
      '2': 'Bedienbaarheid',
      '3': 'Capaciteit',
      '4': 'Beschikbaarheid',
    };
    matches = [...tekst.matchAll(patroon)].map((match) => ({
      index: match.index ?? 0,
      label: `Niet-functionele eisen — ${categorieen[match[1]] ?? `NF${match[1]}`}`,
    }));
  }

  if (matches.length === 0) return [blok];

  const resultaat: BronBlok[] = [];
  const eersteIndex = matches[0].index;

  // Korte generieke intro's zoals "Static Requirements" zijn alleen een kop en
  // leveren geen zelfstandige retrievalbron op. Inhoudelijke intro's blijven wel behouden.
  const intro = tekst.slice(0, eersteIndex).trim();
  if (intro && intro.length >= 80) {
    resultaat.push({ ...blok, tekst: intro });
  }

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const einde = i + 1 < matches.length ? matches[i + 1].index : tekst.length;
    const deel = tekst.slice(match.index, einde).trim();

    if (deel) {
      resultaat.push({
        ...blok,
        tekst: deel,
        sectie: match.label,
      });
    }
  }

  return resultaat.length > 0 ? resultaat : [blok];
}

function isWaarschijnlijkeSectie(regel: string): boolean {
  if (regel.length > 120) return false;

  const zonderLaatstePaginacijfer = regel.replace(/\s+\d+$/, '').trim();
  const lower = zonderLaatstePaginacijfer.toLowerCase();

  if (BEKENDE_SECTIES.has(lower)) return true;
  if (SECTIE_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;

  // Voorbeelden: "1 Requirements", "1.1 Stakeholder Requirements",
  // "2.5.1 Functional Requirements", "1. BH1750 ..."
  if (/^\d+(?:\.\d+)*[.)]?\s+\S/.test(regel)) return true;

  // Betekenisvolle secties uit onze realistische documenten.
  // Losse testregels zoals SK1.1/DK1.1 blijven inhoud en worden niet elk een apart chunk.
  if (/^(?:IT|ST)-\d+\b/i.test(regel)) return true;
  if (/^[IK]\d+\s+[–-]\s*\S/i.test(regel)) return true;
  if (/^Stap\s+\d+\b/i.test(regel)) return true;

  return false;
}

function schoonSectieLabel(regel: string): string {
  // In inhoudsopgaven staat soms een paginanummer achter de kop.
  const schoon = regel.replace(/\s+\d+$/, '').trim();
  const lower = schoon.toLowerCase();
  const prefix = SECTIE_PREFIXES.find((item) => lower.startsWith(item));

  if (prefix) {
    return schoon.slice(0, prefix.length);
  }

  return schoon;
}

function deelTekstMetOverlap(tekst: string): string[] {
  const schoon = tekst.replace(/\s+/g, ' ').trim();
  if (!schoon) return [];
  if (schoon.length <= DOEL_CHUNK_LENGTE) return [schoon];

  const delen: string[] = [];
  let start = 0;

  while (start < schoon.length) {
    let einde = Math.min(start + DOEL_CHUNK_LENGTE, schoon.length);

    if (einde < schoon.length) {
      const minimaalEinde = start + Math.floor(DOEL_CHUNK_LENGTE * 0.65);
      const zoekDeel = schoon.slice(minimaalEinde, einde);
      const grens = laatsteLogischeGrens(zoekDeel);

      if (grens >= 0) {
        einde = minimaalEinde + grens + 1;
      }
    }

    const deel = schoon.slice(start, einde).trim();
    if (deel) delen.push(deel);

    if (einde >= schoon.length) break;

    const gewensteStart = Math.max(0, einde - OVERLAP_TEKENS);
    const nieuweStart = vindOverlapStart(schoon, gewensteStart, einde, start);
    start = nieuweStart > start ? nieuweStart : einde;
  }

  return delen;
}

function vindOverlapStart(
  tekst: string,
  gewensteStart: number,
  einde: number,
  huidigeStart: number,
): number {
  if (gewensteStart <= huidigeStart) return einde;

  const grenzen = ['. ', '? ', '! ', '; '];

  // Eerst: zoek kort ná het gewenste overlappunt naar een nette zinseinde-grens.
  // Zo begint een vervolgchunk bij een nieuwe zin in plaats van met het staartje
  // van de vorige zin.
  const vooruitEinde = Math.min(einde, gewensteStart + 140);
  const na = tekst.slice(gewensteStart, vooruitEinde);
  let eersteVooruit = -1;
  let vooruitLengte = 0;

  for (const grens of grenzen) {
    const index = na.indexOf(grens);
    if (index >= 0 && (eersteVooruit < 0 || index < eersteVooruit)) {
      eersteVooruit = index;
      vooruitLengte = grens.length;
    }
  }

  if (eersteVooruit >= 0) {
    return gewensteStart + eersteVooruit + vooruitLengte;
  }

  // Anders: zoek een zinseinde vlak vóór het gewenste overlappunt.
  const zoekVanaf = Math.max(huidigeStart, gewensteStart - 140);
  const voor = tekst.slice(zoekVanaf, gewensteStart);
  let beste = -1;
  let grensLengte = 0;

  for (const grens of grenzen) {
    const index = voor.lastIndexOf(grens);
    if (index > beste) {
      beste = index;
      grensLengte = grens.length;
    }
  }

  if (beste >= 0) {
    return zoekVanaf + beste + grensLengte;
  }

  // Anders minimaal naar het eerstvolgende woordbegin, nooit midden in een woord.
  const volgendeSpatie = tekst.indexOf(' ', gewensteStart);
  if (volgendeSpatie >= 0 && volgendeSpatie < einde) {
    return volgendeSpatie + 1;
  }

  return gewensteStart;
}

function laatsteLogischeGrens(tekst: string): number {
  const grenzen = ['. ', '? ', '! ', '; ', ': ', ', '];
  let beste = -1;

  for (const grens of grenzen) {
    beste = Math.max(beste, tekst.lastIndexOf(grens));
  }

  if (beste >= 0) return beste;

  return tekst.lastIndexOf(' ');
}

export const CHUNK_INSTELLINGEN = {
  doelLengte: DOEL_CHUNK_LENGTE,
  overlap: OVERLAP_TEKENS,
} as const;
