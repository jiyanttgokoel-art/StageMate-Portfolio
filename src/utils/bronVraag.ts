import type { BronAntwoordResultaat, RetrievalResultaat } from '@/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beantwoord-vraag`;

export async function beantwoordMetBronnen(
  vraag: string,
  resultaten: RetrievalResultaat[],
): Promise<BronAntwoordResultaat> {
  const bronnen = resultaten.slice(0, 5).map(({ chunk }) => ({
    id: chunk.id,
    documentNaam: chunk.documentNaam,
    tekst: chunk.tekst,
    pagina: chunk.pagina,
    sectie: chunk.sectie,
  }));

  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ vraag, bronnen }),
    });
  } catch {
    throw new Error('Kon geen verbinding maken met de brongebonden AI-service.');
  }

  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Error(data.error ?? 'De vraag kon niet worden beantwoord.');
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error('De vraag kon niet worden beantwoord.');
    }
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Het antwoord van de AI-service was niet leesbaar.');
  }

  const resultaat = valideerBronAntwoord(data, bronnen.map((bron) => bron.id));
  if (!resultaat) {
    throw new Error('Het AI-antwoord had niet de verwachte structuur.');
  }

  return resultaat;
}

function valideerBronAntwoord(
  data: unknown,
  toegestaneIds: string[],
): BronAntwoordResultaat | null {
  if (typeof data !== 'object' || data === null) return null;

  const obj = data as Record<string, unknown>;
  if (typeof obj.antwoord !== 'string') return null;
  if (typeof obj.gevonden !== 'boolean') return null;
  if (typeof obj.tegenstrijdigheid !== 'boolean') return null;
  if (
    !Array.isArray(obj.gebruikteBronIds) ||
    !obj.gebruikteBronIds.every((id) => typeof id === 'string')
  ) {
    return null;
  }

  const gebruikteBronIds = obj.gebruikteBronIds as string[];
  if (gebruikteBronIds.some((id) => !toegestaneIds.includes(id))) return null;
  if (obj.gevonden && gebruikteBronIds.length === 0) return null;

  return {
    antwoord: obj.antwoord,
    gevonden: obj.gevonden,
    gebruikteBronIds,
    tegenstrijdigheid: obj.tegenstrijdigheid,
  };
}
