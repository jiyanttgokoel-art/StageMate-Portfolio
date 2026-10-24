import type { AnalyseResultaat } from '@/types';

// ============================================================================
// Client-side module voor de AI-tekstanalyse
// ============================================================================
//
// Deze module roept de Supabase Edge Function `analyseer-tekst` aan,
// die vervolgens via Groq het geconfigureerde AI-model aanroept met een server-side API-key.
//
// De API-key staat NOOIT in de frontend — alleen de Supabase anon key
// wordt meegestuurd voor authenticatie van het edge-function-verzoek.
//
// Als de edge function niet bereikbaar is of een fout teruggeeft,
// wordt er een foutmelding geretourneerd die de UI kan tonen.
// De frontend kan dan besluiten om de lokale demoanalyse te gebruiken.

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyseer-tekst`;

export interface AnalyseFout {
  fout: string;
}

// Roept de edge function aan en retourneert het gevalideerde resultaat.
// Gooit een fout met een Nederlandse melding als iets misgaat.
export async function analyseerMetAI(tekst: string): Promise<AnalyseResultaat> {
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ tekst }),
    });
  } catch {
    throw new Error("Kon geen verbinding maken met de AI-service. Controleer je internetverbinding.");
  }

  if (!response.ok) {
    // Probeer een foutmelding uit de response te halen
    try {
      const data = await response.json();
      throw new Error(data.error ?? "De AI-analyse kon niet worden uitgevoerd.");
    } catch (e) {
      if (e instanceof Error && e.message !== "De AI-analyse kon niet worden uitgevoerd.") {
        throw e;
      }
      throw new Error("De AI-analyse kon niet worden uitgevoerd.");
    }
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Het antwoord van de AI-service was niet leesbaar.");
  }

  // Extra client-side validatie als veiligheidslaag
  const resultaat = valideerResultaat(data);
  if (!resultaat) {
    throw new Error("Het AI-antwoord had niet de verwachte structuur.");
  }

  return resultaat;
}

// Client-side validatie — dezelfde checks als in de edge function,
// als extra veiligheidslaag voordat de UI de data gebruikt.
function valideerResultaat(data: unknown): AnalyseResultaat | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.korteSamenvatting !== "string") return null;
  if (!Array.isArray(obj.mogelijkeTaken) || !obj.mogelijkeTaken.every((i) => typeof i === "string")) return null;
  if (!Array.isArray(obj.deadlines)) return null;
  for (const dl of obj.deadlines) {
    if (typeof dl !== "object" || dl === null) return null;
    const d = dl as Record<string, unknown>;
    if (typeof d.omschrijving !== "string" || typeof d.datumTekst !== "string" || typeof d.onzeker !== "boolean") return null;
  }
  if (!Array.isArray(obj.eisenEnAfspraken) || !obj.eisenEnAfspraken.every((i) => typeof i === "string")) return null;
  if (!Array.isArray(obj.aandachtspunten) || !obj.aandachtspunten.every((i) => typeof i === "string")) return null;

  return {
    korteSamenvatting: obj.korteSamenvatting as string,
    mogelijkeTaken: obj.mogelijkeTaken as string[],
    deadlines: obj.deadlines as AnalyseResultaat["deadlines"],
    eisenEnAfspraken: obj.eisenEnAfspraken as string[],
    aandachtspunten: obj.aandachtspunten as string[],
  };
}
