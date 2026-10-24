import type { DocumentChunk, RetrievalResultaat } from '@/types';

const STOPWOORDEN = new Set([
  'aan', 'als', 'bij', 'dan', 'dat', 'de', 'deze', 'die', 'dit', 'door', 'een', 'en',
  'er', 'het', 'hieraan', 'hiermee', 'hoe', 'ik', 'in', 'is', 'kan', 'kunnen', 'met',
  'moet', 'naar', 'nadat', 'niet', 'of', 'om', 'op', 'over', 'staan', 'staat', 'te', 'tot',
  'uit', 'van', 'voor', 'waar', 'waarom', 'wanneer', 'wat', 'welke', 'wie', 'wordt',
  'zijn', 'ze', 'zo', 'zonder',
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is',
  'it', 'of', 'on', 'or', 'that', 'the', 'to', 'what', 'when', 'which', 'with',
]);

const MIN_SCORE = 2.25;

// Transparante begripsvarianten voor woorden die in studentvragen vaak anders
// geformuleerd worden dan in de bron. Dit blijft gewone, uitlegbare retrieval;
// er wordt hier geen AI gebruikt.
const CONCEPT_VARIANTEN: Record<string, string[]> = {
  deadline: ['deadline', 'inleveren', 'ingeleverd', 'inleverdatum', 'uiterlijk', 'afronden', 'klaar'],
  deadlines: ['deadline', 'inleveren', 'ingeleverd', 'inleverdatum', 'uiterlijk', 'afronden', 'klaar'],
  feedback: ['feedback', 'ontvangen', 'gekregen', 'bespreek', 'bespreken', 'verwerken', 'verwerkt'],
  gekregen: ['gekregen', 'ontvangen'],
  ontvangen: ['ontvangen', 'gekregen'],
  persoonsgegevens: [
    'persoonsgegevens',
    'persoonsgegeven',
    'studentnummer',
    'teststudent',
    'email',
    'e-mail',
    'telefoonnummer',
    'adres',
  ],
};

const SAMENGESTELDE_SUFFIXEN = [
  'document',
  'formulier',
  'opdracht',
  'planning',
  'verslag',
  'project',
  'test',
  'plan',
] as const;

export function zoekRelevanteChunks(
  vraag: string,
  chunks: DocumentChunk[],
  limiet = 5,
): RetrievalResultaat[] {
  const schoonVraag = normaliseer(vraag);
  const vraagTokens = uniekeBetekenisvolleTokens(schoonVraag);

  if (!schoonVraag || vraagTokens.length === 0 || chunks.length === 0) return [];

  const codes = extractCodes(vraag);
  const bigrams = maakBigrams(vraagTokens);
  const resultaten: RetrievalResultaat[] = [];

  for (const chunk of chunks) {
    const tekstNorm = normaliseer(chunk.tekst);
    const sectieNorm = normaliseer(chunk.sectie ?? '');
    const documentNorm = normaliseer(chunk.documentNaam);

    const tekstTokens = tokeniseer(tekstNorm);
    const sectieTokenSet = new Set(tokeniseer(sectieNorm));
    const documentTokenSet = new Set(tokeniseer(documentNorm));

    let score = 0;
    const gematchteTermen = new Set<string>();

    // Expliciete codes zoals K2, SK2.4, ST-06 zijn zeer sterke signalen.
    for (const code of codes) {
      const codeNorm = normaliseer(code);
      if (
        tekstNorm.includes(codeNorm) ||
        sectieNorm.includes(codeNorm) ||
        documentNorm.includes(codeNorm)
      ) {
        score += 18;
        gematchteTermen.add(code);
      }
    }

    for (const token of vraagTokens) {
      const varianten = maakTokenVarianten(token);
      let tokenScore = 0;

      if (varianten.some((variant) => sectieTokenSet.has(variant))) {
        tokenScore += 4;
      }

      if (varianten.some((variant) => documentTokenSet.has(variant))) {
        tokenScore += 1.5;
      }

      let besteExacteHits = 0;
      for (const variant of varianten) {
        besteExacteHits = Math.max(besteExacteHits, telExacteHits(tekstTokens, variant));
      }
      if (besteExacteHits > 0) {
        tokenScore += Math.min(besteExacteHits, 3) * 1.5;
      }

      // Kleine taalvariaties zoals "registreert" / "registreren" mogen licht matchen.
      if (tokenScore === 0) {
        const nabijeMatch = varianten.some(
          (variant) =>
            variant.length >= 5 &&
            tekstTokens.some((bronToken) => lijkenOpElkaar(variant, bronToken)),
        );
        // Een duidelijke typefout zoals "oktobe" / "oktober" moet nog
        // genoeg gewicht krijgen om de bron aan de AI te kunnen tonen.
        // De AI blijft daarna verantwoordelijk voor de inhoudelijke check.
        if (nabijeMatch) tokenScore += 1.8;
      }

      if (tokenScore > 0) {
        score += tokenScore;
        gematchteTermen.add(token);
      }
    }

    for (const bigram of bigrams) {
      if (tekstNorm.includes(bigram) || sectieNorm.includes(bigram)) {
        score += 3;
      }
    }

    const dekking = gematchteTermen.size / Math.max(vraagTokens.length + codes.length, 1);
    score *= 0.65 + Math.min(dekking, 1) * 0.7;

    // Extra boost wanneer de volledige inhoudelijke vraagkern letterlijk in de bron staat.
    const inhoudelijkeVraag = vraagTokens.join(' ');
    if (inhoudelijkeVraag.length >= 8 && tekstNorm.includes(inhoudelijkeVraag)) {
      score += 6;
    }

    if (score >= MIN_SCORE) {
      resultaten.push({
        chunk,
        score: Math.round(score * 10) / 10,
        gematchteTermen: [...gematchteTermen],
      });
    }
  }

  return resultaten
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.chunk.documentNaam !== b.chunk.documentNaam) {
        return a.chunk.documentNaam.localeCompare(b.chunk.documentNaam, 'nl');
      }
      return a.chunk.volgnummer - b.chunk.volgnummer;
    })
    .slice(0, limiet);
}

export function vraagIsTeVaag(vraag: string): boolean {
  const schoonVraag = normaliseer(vraag);
  if (!schoonVraag) return true;

  const tokens = uniekeBetekenisvolleTokens(schoonVraag);
  const codes = extractCodes(vraag);

  // Vragen als "Wat moet ik hiermee?" bevatten na het verwijderen van
  // vraag-/stopwoorden geen concreet onderwerp om betrouwbaar op te zoeken.
  return tokens.length === 0 && codes.length === 0;
}

function normaliseer(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokeniseer(tekst: string): string[] {
  return tekst.match(/[a-z0-9]+(?:[.\-][a-z0-9]+)*/g) ?? [];
}

function uniekeBetekenisvolleTokens(tekst: string): string[] {
  return [...new Set(
    tokeniseer(tekst).filter((token) => {
      if (/^[a-z]{1,3}\d+(?:[.\-]\d+)?$/i.test(token)) return false;
      return token.length >= 3 && !STOPWOORDEN.has(token);
    }),
  )];
}

function maakTokenVarianten(token: string): string[] {
  const varianten = new Set<string>([token]);

  voegSamengesteldeDelenToe(token, varianten);

  for (const huidig of [...varianten]) {
    for (const conceptVariant of CONCEPT_VARIANTEN[huidig] ?? []) {
      varianten.add(conceptVariant);
    }
  }

  return [...varianten];
}

function voegSamengesteldeDelenToe(token: string, doel: Set<string>, diepte = 0) {
  if (diepte >= 3) return;

  for (const suffix of SAMENGESTELDE_SUFFIXEN) {
    if (!token.endsWith(suffix) || token === suffix) continue;

    const prefix = token.slice(0, -suffix.length);
    if (prefix.length < 4) continue;

    doel.add(prefix);
    doel.add(suffix);
    voegSamengesteldeDelenToe(prefix, doel, diepte + 1);
  }
}

function extractCodes(tekst: string): string[] {
  return [...new Set(
    (tekst.match(/\b(?:[a-z]{1,3}\d+(?:[.\-]\d+)?)\b/gi) ?? []).map((code) => code.toLowerCase()),
  )];
}

function maakBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

function telExacteHits(tokens: string[], doel: string): number {
  let hits = 0;
  for (const token of tokens) {
    if (token === doel) hits += 1;
  }
  return hits;
}

function lijkenOpElkaar(a: string, b: string): boolean {
  const min = Math.min(a.length, b.length);
  if (min < 5) return false;

  const lengte = Math.max(5, Math.floor(min * 0.72));
  return a.slice(0, lengte) === b.slice(0, lengte);
}
