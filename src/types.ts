// Centrale types voor StageMate
// Houd deze simpel en begrijpbaar voor tweedejaars AD-studenten.

export type Prioriteit = 'hoog' | 'gemiddeld' | 'laag';

export interface Taak {
  id: string;
  titel: string;
  beschrijving?: string;
  deadline?: string; // ISO-datum (YYYY-MM-DD)
  prioriteit: Prioriteit;
  afgerond: boolean;
  aanmaakdatum: string; // ISO-datum
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentNaam: string;
  volgnummer: number;
  tekst: string;
  pagina?: number;
  sectie?: string;
}

export interface RetrievalResultaat {
  chunk: DocumentChunk;
  score: number;
  gematchteTermen: string[];
}

export interface BronAntwoordResultaat {
  antwoord: string;
  gevonden: boolean;
  gebruikteBronIds: string[];
  tegenstrijdigheid: boolean;
}

export interface DocumentItem {
  id: string;
  naam: string;
  type: 'pdf' | 'docx' | 'txt';
  status: 'verwerkt' | 'nog-niet-verwerkt';
  // Grootte in KB — alleen voor weergave
  grootte: string;
  uploadDatum: string; // ISO-datum
  // Uitgelezen platte tekst blijft lokaal in de browser opgeslagen.
  // Dit wordt vanaf Technique 2B stapsgewijs gevuld.
  inhoud?: string;
  // Kleinere bronstukken voor retrieval/Q&A. Deze blijven lokaal opgeslagen.
  chunks?: DocumentChunk[];
  // Versie van de chunklogica, zodat bestaande lokale documenten automatisch opnieuw kunnen worden verdeeld.
  chunkVersie?: number;
  // In V1 is echte inhoudelijke verwerking nog niet geïmplementeerd.
  // Dit veld simuleert geen AI — het is puur een label.
  demo?: boolean;
}

// Resultaat van de analysefunctie.
// In V1 gebeurt de analyse lokaal met eenvoudige tekstregels;
// later kan hier een echte AI-aanroep aan gekoppeld worden.
//
// De structuur is bewust zo gemaakt dat een echt taalmodel later
// dezelfde velden kan invullen zonder dat de interface verandert.

// Eén deadline zoals uit de tekst herkend.
// - omschrijving: waar de deadline over gaat
// - datumTekst: de datum zoals in de tekst staat (bijv. "25 september")
// - onzeker: true als de datum vaag/relatief is of ontbreekt
export interface DeadlineInfo {
  omschrijving: string;
  datumTekst: string;
  onzeker: boolean;
}

export interface AnalyseResultaat {
  korteSamenvatting: string;
  mogelijkeTaken: string[];
  deadlines: DeadlineInfo[];
  eisenEnAfspraken: string[];
  aandachtspunten: string[];
}

// Pagina's in de hoofd navigatie
export type Pagina = 'dashboard' | 'taken' | 'documenten' | 'ai';
