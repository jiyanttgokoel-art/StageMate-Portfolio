// ============================================================================
// StageMate AI — Edge Function: analyseer-tekst
// ============================================================================
//
// Deze edge function ontvangt stagetekst van de frontend en stuurt deze
// naar Groq voor gestructureerde analyse. De API-key staat als
// server-side secret (GROQ_API_KEY) en is NOOIT zichtbaar in de frontend.
//
// Het model krijgt een duidelijke system prompt die de StageMate-regels
// volgt: alleen informatie uit de brontekst, geen verzonnen datums,
// relatieve datums behouden, etc.
//
// Het resultaat wordt gevalideerd voordat het naar de frontend gaat.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Groq model — bewust een lichtgewicht model voor gestructureerde extractie.
// Laag randomness (temperature: 0) omdat we informatie extraheren, niet creëren.
const MODEL = "openai/gpt-oss-20b";
const TEMPERATURE = 0;


// TODO StageMate datumlaag (na Technique 2 / bij taken-deadlines):
// 1) Gewone datumfunctie: controleer kalenderdatums en weekdag-datum combinaties
//    (bijv. "vrijdag 23 september 2026" waarschuwen als die combinatie niet klopt).
// 2) Referentiedatum: interpreteer relatieve datums zoals "volgende vrijdag" alleen
//    als een betrouwbare bron-/documentdatum of expliciete gebruikersreferentiedatum bekend is.
//    Zonder referentiedatum blijft de datum relatief/onzeker en wordt niets gegokt.

// System prompt — instrueert het model om als StageMate-analyst te werken.
const SYSTEM_PROMPT = `Je bent StageMate, een assistent voor studenten die stage lopen.
Je analyseert tekst uit stagehandleidingen, mails, Teams-berichten en losse eigen notities en verdeelt de informatie over vijf categorieën.

BELANGRIJKSTE REGELS:
- Gebruik ALLEEN informatie die redelijkerwijs in de brontekst staat.
- Verzin NOOIT datums, deadlines, eisen, namen, verantwoordelijkheden, gebeurtenissen of taken die niet uit de tekst volgen.
- Antwoord ALTIJD in het Nederlands, ook bij zeer korte, slordige, fout gespelde of deels Engelstalige invoer.
- Als iets onbekend of dubbelzinnig is, behoud die onzekerheid en markeer die als aandachtspunt in plaats van te gokken.
- Woorden als "misschien", "mogelijk" en "wellicht" maken een genoemde handeling expliciet onzeker. Je mag die handeling als mogelijke taak tonen, maar presenteer haar niet als vaststaand en benoem de onzekerheid bij aandachtspunten.
- Wijs een handeling NOOIT aan een specifieke persoon toe als niet duidelijk staat wie die uitvoert.
- Maak van een onduidelijke notitie NOOIT achteraf een voldongen feit.
- Gebruik algemene vakkennis alleen om begrippen zoals ETL te begrijpen. Gebruik die kennis NOOIT om ontbrekende projectspecifieke informatie aan te vullen.
- Behoud onbekende of vage termen zoveel mogelijk zoals de gebruiker ze schreef. Maak bijvoorbeeld van "ETL ding" niet zelf "ETL-project", "ETL-pipeline" of "ETL-schema".
- Corrigeer of begrijp evidente spelfouten stil wanneer de bedoelde term duidelijk is. Een duidelijke typefout is GEEN aandachtspunt.
- Vermijd dubbele informatie tussen categorieën.
- Bij een onduidelijke actor: formuleer passief of neutraal. Kies geen persoon als uitvoerder tenzij de bron dat duidelijk maakt.
- Bij korte fragmenten zoals "vragen volgende review": behoud een neutrale formulering zoals "vragen voor de volgende review". Verzin niet of de vragen moeten worden gesteld, genoteerd of voorbereid als dat niet duidelijk is.
- Als "X af" of "X klaar" als verplichting/deadline wordt herkend, neem "X afronden/klaarmaken" ook op bij mogelijkeTaken, tenzij uit de bron duidelijk blijkt dat de gebruiker die taak niet zelf hoeft uit te voeren.
- Als je een interpretatie bij AANDACHTSPUNTEN als onzeker markeert, presenteer diezelfde interpretatie dan NIET als vaststaand feit in de samenvatting, taken, eisen of deadlines.
- Antwoord uitsluitend met geldig JSON.

Retourneer precies deze JSON-structuur:
{
  "korteSamenvatting": "string",
  "mogelijkeTaken": ["string"],
  "deadlines": [{"omschrijving":"string","datumTekst":"string","onzeker":true}],
  "eisenEnAfspraken": ["string"],
  "aandachtspunten": ["string"]
}

KORTE SAMENVATTING:
- Geef de belangrijkste betekenis in 1-4 zinnen.
- Voeg geen informatie toe die niet in de bron staat.
- Bij telegramstijl of slechte grammatica: formuleer voorzichtig en neutraal.
- Neem geen actor, oorzaak, planning of voltooiing aan als die niet expliciet duidelijk is.
- Gebruik woorden zoals "gepland", "afgerond", "de docent vraagt" of "moet worden gesteld" alleen wanneer dat echt uit de bron volgt.

MOGELIJKE TAKEN:
- Identificeer concrete acties die de student of groep daadwerkelijk moet uitvoeren.
- Herschrijf ze als korte actie-items.
- Een expliciete verplichting zoals "X moet af" of een duidelijke planningsnotitie zoals "X vrijdag af" mag als taak worden opgenomen.
- Voeg GEEN logisch klinkende vervolgstappen toe zoals "bereid je voor", "controleer" of "plan" tenzij die echt worden genoemd.
- Als niet duidelijk is wie een taak uitvoert, formuleer de taak zonder een persoon te verzinnen.
- Als de actie zelf onduidelijk is, behoud de kernwoorden uit de bron en zet de onduidelijkheid bij aandachtspunten in plaats van een preciezere actie te verzinnen.

DEADLINES EN DATUMS:
- Maak alleen een deadline wanneer duidelijk is dat iets op, voor of uiterlijk een genoemd moment af moet zijn, of wanneer de bron expliciet over een deadline spreekt.
- Een gebeurtenis of moment zoals "volgende review", "gesprek vrijdag" of "meeting maandag" is NIET automatisch een deadline.
- Als een taak expliciet gekoppeld is aan zo'n moment, mag dat moment wel als deadline worden gebruikt.
- Behoud relatieve datums letterlijk zoals "vrijdag", "volgende vrijdag", "binnenkort" en "vrijdag deze week".
- Zet relatieve datums NOOIT om in exacte kalenderdata.
- onzeker = true bij relatieve, vage, onvolledige of interpretatie-afhankelijke datums.
- onzeker = false alleen bij een expliciete kalenderdatum zoals "25 september".
- Als de tekst expliciet zegt dat er een deadline is maar de datum nog niet bekend is, gebruik datumTekst "exacte datum niet genoemd" en onzeker = true.
- Waarschuwingen of gevolgen zijn GEEN deadlines.
- Let op ambigue woordvolgorde. Voorbeeld: "docent zei vrijdag etl concept af" kan betekenen dat vrijdag de deadline is, maar ook dat de docent dit op vrijdag zei. Kies niet zomaar één interpretatie. Als "af" duidelijk een afmaaktaak suggereert, mag je "vrijdag" als mogelijke deadline opnemen met onzeker=true, maar voeg dan ook een aandachtspunt toe dat de koppeling van "vrijdag" onduidelijk is.
- Koppel een datum alleen aan de taak waarop de datum grammaticaal betrekking heeft. Trek een datum niet automatisch door naar een tweede taak.
- Voorbeeld: "Voor donderdag onderzoeksopzet afmaken en daarna feedback bespreken met mijn begeleider." betekent: alleen "onderzoeksopzet afmaken" heeft "voor donderdag" als deadline. "Feedback bespreken" is wel een mogelijke taak, maar krijgt geen deadline tenzij de bron dat apart zegt.
- Voeg twee acties niet samen tot één deadlineomschrijving wanneer de datum maar voor één van die acties geldt. Woorden als "daarna" geven volgorde aan, maar leveren op zichzelf geen tweede deadline op.

EISEN & AFSPRAKEN:
- Neem voorwaarden, eisen en expliciete afspraken op die belangrijk zijn maar niet simpelweg een taak of deadline herhalen.
- Zet een punt hier niet opnieuw neer als dezelfde informatie al voldoende duidelijk bij taken of deadlines staat.
- Maak geen afspraak van iets dat alleen als losse, onduidelijke notitie wordt genoemd.

AANDACHTSPUNTEN:
- Gebruik dit alleen voor echte onduidelijkheden, ambiguïteit, ontbrekende informatie of iets dat geverifieerd moet worden.
- Benoem grammaticale dubbelzinnigheid wanneer die de betekenis van een taak, actor of datum verandert.
- Benoem semantisch vage termen zoals "ding" wanneer niet duidelijk is wat ermee bedoeld wordt.
- Benoem GEEN evidente spelfouten als aandachtspunt als de bedoelde woorden begrijpelijk zijn.
- Als een onbekende datum al correct als onzekere deadline is opgenomen, herhaal die alleen als aandachtspunt wanneer er daarnaast extra onduidelijkheid is, bijvoorbeeld waaraan de datum gekoppeld is.
- Geef NOOIT generiek advies.
- Als er geen relevante onduidelijkheden zijn, retourneer een lege array.

CONTROLEER JE RESULTAAT VOORDAT JE JSON TERUGGEEFT:
- Als iets als deadline staat omdat "X af" of "X klaar" moet zijn, moet "X afronden/klaarmaken" ook bij mogelijkeTaken staan, tenzij duidelijk is dat de gebruiker die taak niet zelf hoeft uit te voeren.
- Als iets bij aandachtspunten als onzeker of dubbelzinnig staat, presenteer diezelfde interpretatie nergens anders als vaststaand feit.
- Controleer dat een genoemd moment alleen als deadline staat als de bron dat ondersteunt.
- Noem duidelijke spelfouten niet als aandachtspunt wanneer de betekenis gewoon begrijpelijk is.
- Behoud vage termen uit de bron in plaats van ze preciezer te maken.
- Formuleer bij onduidelijke actoren neutraal of passief.
- Antwoord volledig in het Nederlands.
- Verwijder onnodige dubbele informatie tussen categorieën.
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI-service is niet geconfigureerd." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Alleen POST-verzoeken worden geaccepteerd." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const tekst: string = body?.tekst;

    if (!tekst || typeof tekst !== "string" || tekst.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Geen geldige tekst ontvangen." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Beperk de inputlengte om kosten en misbruik te beperken.
    const afgekapt = tekst.length > 4000 ? tekst.slice(0, 4000) : tekst;

    // Groq API-aanroep met structured output (response_format: json_object).
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "stagemate_analyse",
            strict: true,
            schema: {
              type: "object",
              properties: {
                korteSamenvatting: { type: "string" },
                mogelijkeTaken: { type: "array", items: { type: "string" } },
                deadlines: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      omschrijving: { type: "string" },
                      datumTekst: { type: "string" },
                      onzeker: { type: "boolean" },
                    },
                    required: ["omschrijving", "datumTekst", "onzeker"],
                    additionalProperties: false,
                  },
                },
                eisenEnAfspraken: { type: "array", items: { type: "string" } },
                aandachtspunten: { type: "array", items: { type: "string" } },
              },
              required: ["korteSamenvatting", "mogelijkeTaken", "deadlines", "eisenEnAfspraken", "aandachtspunten"],
              additionalProperties: false,
            },
          },
        },
        reasoning_effort: "low",
        reasoning_format: "hidden",
        // GPT-OSS gebruikt een deel van de completionruimte voor reasoning. Geef
        // genoeg ruimte om daarna ook het volledige JSON-object af te ronden.
        max_completion_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyseer de volgende stagetekst en retourneer het resultaat als JSON:\n\n${afgekapt}`,
          },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "De AI-service gaf een fout terug." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const groqData = await groqResponse.json();
    const content: string | undefined = groqData?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "De AI gaf geen bruikbaar antwoord terug." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse het JSON-antwoord van het model.
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Het AI-antwoord was niet geldig JSON." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Valideer de structuur voordat we het naar de frontend sturen.
    const validatieFout = valideerResultaat(parsed);
    if (validatieFout) {
      return new Response(
        JSON.stringify({ error: validatieFout }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het uitvoeren van de analyse." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// --- Validatie -------------------------------------------------------------
// Controleert dat het model-antwoord de verwachte AnalyseResultaat-structuur heeft.
function valideerResultaat(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return "Het AI-antwoord is geen geldig object.";
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.korteSamenvatting !== "string") {
    return "korteSamenvatting ontbreekt of is geen tekst.";
  }

  if (!Array.isArray(obj.mogelijkeTaken) || !obj.mogelijkeTaken.every((i) => typeof i === "string")) {
    return "mogelijkeTaken ontbreekt of bevat niet alleen tekst.";
  }

  if (!Array.isArray(obj.deadlines)) {
    return "deadlines ontbreekt of is geen lijst.";
  }
  for (const dl of obj.deadlines) {
    if (typeof dl !== "object" || dl === null) {
      return "Een deadline is geen geldig object.";
    }
    const d = dl as Record<string, unknown>;
    if (typeof d.omschrijving !== "string" || typeof d.datumTekst !== "string" || typeof d.onzeker !== "boolean") {
      return "Een deadline heeft niet de juiste velden (omschrijving, datumTekst, onzeker).";
    }
  }

  if (!Array.isArray(obj.eisenEnAfspraken) || !obj.eisenEnAfspraken.every((i) => typeof i === "string")) {
    return "eisenEnAfspraken ontbreekt of bevat niet alleen tekst.";
  }

  if (!Array.isArray(obj.aandachtspunten) || !obj.aandachtspunten.every((i) => typeof i === "string")) {
    return "aandachtspunten ontbreekt of bevat niet alleen tekst.";
  }

  return null;
}
