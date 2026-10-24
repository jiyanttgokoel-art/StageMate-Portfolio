import { useState } from 'react';
import {
  Sparkles,
  FileText,
  Wand2,
  ClipboardCopy,
  Check,
  Info,
  MessageCircleQuestion,
  ListChecks,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  AlignLeft,
  Cpu,
  AlertCircle,
  ArrowRight,
  Search,
  FileSearch,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AnalyseResultaat,
  BronAntwoordResultaat,
  DocumentItem,
  RetrievalResultaat,
} from '@/types';
import { Card } from '@/components/Card';
import { analyseerTekst, VOORBEELD_TEKST } from '@/utils/samenvatten';
import { analyseerMetAI } from '@/utils/aiAnalyse';
import { vraagIsTeVaag, zoekRelevanteChunks } from '@/utils/retrieval';
import { beantwoordMetBronnen } from '@/utils/bronVraag';

// ============================================================================
// StageMate AI-pagina
// ============================================================================
// Dit is de pagina waar de AI-techniek "Tekst genereren, herschrijven of
// samenvatten" (week 2) aantoonbaar wordt gebruikt.
//
// Sinds Step 1B gebruikt de primaire "Tekst analyseren"-knop een echt
// taalmodel via een Supabase Edge Function. De API-key staat veilig
// op de server — nooit in de frontend.
//
// Als de AI-aanroep faalt, kan de gebruiker expliciet kiezen voor de
// lokale demoanalyse (rule-based). Dit resultaat wordt duidelijk
// gemarkeerd als lokaal/demo.
//
// Technique 2D gebruikt lokale retrieval over de geüploade documenten.
// Technique 2E stuurt alleen de beste gevonden bronstukken naar Groq.
// Technique 2F toont bij het antwoord expliciet welke bronstukken Groq gebruikte,
// inclusief documentnaam, pagina/sectie en controleerbaar tekstfragment.

type ResultaatBron = 'ai' | 'lokaal';
type AIModus = 'vraag' | 'analyse';

export function StageMateAI({ documenten }: { documenten: DocumentItem[] }) {
  const [modus, setModus] = useState<AIModus>('vraag');
  const [tekst, setTekst] = useState('');
  const [resultaat, setResultaat] = useState<AnalyseResultaat | null>(null);
  const [resultaatBron, setResultaatBron] = useState<ResultaatBron | null>(null);
  const [bezig, setBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [documentVraag, setDocumentVraag] = useState('');
  const [retrievalResultaten, setRetrievalResultaten] = useState<RetrievalResultaat[]>([]);
  const [retrievalGezocht, setRetrievalGezocht] = useState(false);
  const [bronAntwoord, setBronAntwoord] = useState<BronAntwoordResultaat | null>(null);
  const [bronAntwoordBezig, setBronAntwoordBezig] = useState(false);
  const [bronAntwoordFout, setBronAntwoordFout] = useState<string | null>(null);
  const [vraagMelding, setVraagMelding] = useState<string | null>(null);

  const alleChunks = documenten.flatMap((document) => document.chunks ?? []);
  const documentenMetChunks = documenten.filter((document) => (document.chunks?.length ?? 0) > 0).length;
  const gebruikteBronResultaten =
    bronAntwoord?.gevonden
      ? retrievalResultaten.filter((resultaat) =>
          bronAntwoord.gebruikteBronIds.includes(resultaat.chunk.id),
        )
      : [];

  // Tekst analyseren met echte AI via de edge function.
  async function handleAnalyseren() {
    if (!tekst.trim() || bezig) return;
    setBezig(true);
    setResultaat(null);
    setResultaatBron(null);
    setFoutmelding(null);

    try {
      const analyse = await analyseerMetAI(tekst);
      setResultaat(analyse);
      setResultaatBron('ai');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'De AI-analyse kon niet worden uitgevoerd.';
      setFoutmelding(msg);
    } finally {
      setBezig(false);
    }
  }

  // Lokale demoanalyse — alleen als de gebruiker dit expliciet kiest.
  function handleLokaleAnalyse() {
    if (!tekst.trim()) return;
    setFoutmelding(null);
    const analyse = analyseerTekst(tekst);
    setResultaat(analyse);
    setResultaatBron('lokaal');
  }

  function laadVoorbeeld() {
    setTekst(VOORBEELD_TEKST);
    setResultaat(null);
    setResultaatBron(null);
    setFoutmelding(null);
  }

  function wisAlles() {
    setTekst('');
    setResultaat(null);
    setResultaatBron(null);
    setFoutmelding(null);
  }

  function kopieerResultaat() {
    if (!resultaat) return;
    const plainTekst = resultaatNaarTekst(resultaat, resultaatBron);
    navigator.clipboard.writeText(plainTekst);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  async function handleDocumentVraag(e?: React.FormEvent) {
    e?.preventDefault();
    if (!documentVraag.trim() || alleChunks.length === 0 || bronAntwoordBezig) return;

    setBronAntwoord(null);
    setBronAntwoordFout(null);
    setVraagMelding(null);

    if (vraagIsTeVaag(documentVraag)) {
      setRetrievalResultaten([]);
      setRetrievalGezocht(false);
      setVraagMelding(
        'Je vraag is te vaag om betrouwbaar in je documenten te zoeken. Noem bijvoorbeeld een onderwerp, taak, deadline of document.',
      );
      return;
    }

    const resultaten = zoekRelevanteChunks(documentVraag, alleChunks, 5);
    setRetrievalResultaten(resultaten);
    setRetrievalGezocht(true);

    // Geen relevante bronnen = geen AI-aanroep. Zo kan het model niets gaan gokken.
    if (resultaten.length === 0) {
      setBronAntwoord({
        antwoord: 'Niet gevonden in je documenten.',
        gevonden: false,
        gebruikteBronIds: [],
        tegenstrijdigheid: false,
      });
      return;
    }

    setBronAntwoordBezig(true);
    try {
      const antwoord = await beantwoordMetBronnen(documentVraag, resultaten);
      setBronAntwoord(antwoord);
    } catch (e) {
      const bericht = e instanceof Error ? e.message : 'De vraag kon niet worden beantwoord.';
      setBronAntwoordFout(bericht);
    } finally {
      setBronAntwoordBezig(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">StageMate AI</h1>
            <p className="mt-1 text-sm text-slate-500">
              Vraag iets over je documenten of analyseer een los stuk stagetekst.
            </p>
          </div>
        </div>
      </div>

      {/* Eén AI-flow tegelijk, hetzelfde principe als Openstaand / Afgerond bij Taken. */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setModus('vraag')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
            modus === 'vraag'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          aria-pressed={modus === 'vraag'}
        >
          <MessageCircleQuestion className="h-4 w-4" />
          Vraag documenten
        </button>
        <button
          type="button"
          onClick={() => setModus('analyse')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
            modus === 'analyse'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          aria-pressed={modus === 'analyse'}
        >
          <Wand2 className="h-4 w-4" />
          Tekst analyseren
        </button>
      </div>

      {modus === 'analyse' && (
        <Card
          titel="Tekst analyseren"
          icoon={<Wand2 className="h-4 w-4" />}
          actie={
            <InfoDisclosure
              tekst="StageMate gebruikt een taalmodel om taken, deadlines, eisen en aandachtspunten te herkennen. De tekst die je analyseert wordt naar de AI-dienst gestuurd. Deel geen onnodige persoonsgegevens of vertrouwelijke informatie en controleer belangrijke informatie altijd met de oorspronkelijke bron."
            />
          }
        >
            <div className="space-y-4">
              <div>
                <textarea
                  id="ai-tekst"
                  aria-label="Stagetekst om te analyseren"
                  value={tekst}
                  onChange={(e) => setTekst(e.target.value)}
                  placeholder="Bijv. tekst uit een stagehandleiding, mail, Teams-bericht of losse eigen notities..."
                  rows={8}
                  className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <p className="mt-1.5 text-xs text-slate-400">{tekst.length} tekens</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyseren}
                  disabled={!tekst.trim() || bezig}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4" />
                  {bezig ? 'Analyseren...' : 'Tekst analyseren'}
                </button>
                <button
                  type="button"
                  onClick={laadVoorbeeld}
                  disabled={bezig}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  Voorbeeld laden
                </button>
                {tekst && !bezig && (
                  <button
                    type="button"
                    onClick={wisAlles}
                    className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
                  >
                    Wissen
                  </button>
                )}
              </div>

              {bezig && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-500" />
                  StageMate analyseert je tekst...
                </div>
              )}

              {foutmelding && !bezig && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-4">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-rose-700">De AI-analyse kon niet worden uitgevoerd.</p>
                      <p className="mt-0.5 text-xs text-rose-500">{foutmelding}</p>
                      <button
                        type="button"
                        onClick={handleLokaleAnalyse}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Gebruik lokale demoanalyse
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {resultaat && !bezig && (
                <AnalyseWeergave
                  resultaat={resultaat}
                  bron={resultaatBron}
                  gekopieerd={gekopieerd}
                  opKopieer={kopieerResultaat}
                />
              )}
            </div>
          </Card>
      )}

      {modus === 'vraag' && (
        <Card
          titel="Vraag documenten"
          icoon={<MessageCircleQuestion className="h-4 w-4" />}
          actie={
            <InfoDisclosure
              tekst="StageMate zoekt eerst lokaal relevante bronstukken en gebruikt alleen die selectie voor het antwoord. Alleen relevante bronstukken gaan naar de AI-service. Vermijd onnodige persoonsgegevens en vertrouwelijke informatie."
            />
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {documentenMetChunks} {documentenMetChunks === 1 ? 'document beschikbaar' : 'documenten beschikbaar'}
            </p>

            {alleChunks.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Voeg eerst een verwerkt PDF-, DOCX- of TXT-document toe bij Documenten.
              </div>
            ) : (
              <form onSubmit={handleDocumentVraag} className="flex gap-2">
                <input
                  type="text"
                  value={documentVraag}
                  onChange={(e) => {
                    setDocumentVraag(e.target.value);
                    setRetrievalGezocht(false);
                    setBronAntwoord(null);
                    setBronAntwoordFout(null);
                    setVraagMelding(null);
                  }}
                  placeholder="Bijv. Kan het systeem een vlagactie weigeren als de vlag niet is ingevoerd?"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <button
                  type="submit"
                  disabled={!documentVraag.trim() || bronAntwoordBezig}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  {bronAntwoordBezig ? 'Beantwoorden...' : 'Beantwoord vraag'}
                </button>
              </form>
            )}

            {vraagMelding && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Vraag is nog te onduidelijk.</p>
                  <p className="mt-0.5 text-xs text-amber-700">{vraagMelding}</p>
                </div>
              </div>
            )}

            {bronAntwoordFout && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-medium text-rose-700">Brongebonden AI-antwoord mislukt.</p>
                <p className="mt-1 text-xs text-rose-600">{bronAntwoordFout}</p>
              </div>
            )}

            {bronAntwoord && (
              <div
                className={`rounded-xl border px-4 py-4 ${
                  bronAntwoord.gevonden
                    ? 'border-teal-200 bg-teal-50/60'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    AI-antwoord op basis van je documenten
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200">
                    <Sparkles className="h-3 w-3" />
                    Gebaseerd op eigen bronnen
                  </span>
                  {bronAntwoord.tegenstrijdigheid && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Bronnen spreken elkaar tegen
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{bronAntwoord.antwoord}</p>
                {bronAntwoord.gevonden && (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Dit antwoord is door AI geformuleerd op basis van je documenten; het is geen letterlijk citaat.
                    Controleer de gebruikte bronfragmenten hieronder als de informatie belangrijk is.
                  </p>
                )}
                {bronAntwoord.gevonden && gebruikteBronResultaten.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-teal-200/70 pt-3">
                    <span className="text-xs font-medium text-slate-500">
                      {gebruikteBronResultaten.length === 1 ? 'Bron' : 'Bronnen'}
                    </span>
                    {gebruikteBronResultaten.map(({ chunk }) => (
                      <span
                        key={chunk.id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                        title={chunk.documentNaam}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="max-w-[18rem] truncate">{chunk.documentNaam}</span>
                        {chunk.pagina && <span className="text-slate-400">· p. {chunk.pagina}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {retrievalGezocht && retrievalResultaten.length > 0 && (
              <details className="group rounded-lg border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-slate-400" />
                    Bronnen &amp; details
                  </span>
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-400">
                    {retrievalResultaten.length} gevonden
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>

                <div className="space-y-5 border-t border-slate-100 px-4 py-4">
                  {bronAntwoord?.gevonden && gebruikteBronResultaten.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Gebruikte bronnen
                        </p>
                        <span className="text-xs text-slate-400">
                          {gebruikteBronResultaten.length} gebruikt
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {gebruikteBronResultaten.map(({ chunk }) => {
                          const bronFragment =
                            chunk.tekst.length > 420 ? `${chunk.tekst.slice(0, 420)}…` : chunk.tekst;

                          return (
                            <div key={chunk.id} className="rounded-lg bg-slate-50 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {chunk.documentNaam}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Bronfragment {chunk.volgnummer}
                                  </p>
                                </div>

                                <div className="flex flex-wrap justify-end gap-1.5 text-xs text-slate-500">
                                  {chunk.pagina && (
                                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                      Pagina {chunk.pagina}
                                    </span>
                                  )}
                                  {chunk.sectie && (
                                    <span className="max-w-sm truncate rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                      {chunk.sectie}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="mt-2 text-xs leading-5 text-slate-600">{bronFragment}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <details className="group/tech rounded-lg border border-slate-200 bg-slate-50/70">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100/70 [&::-webkit-details-marker]:hidden">
                      <span>Technische zoekdetails</span>
                      <span className="flex items-center gap-2 text-slate-400">
                        Top {retrievalResultaten.length}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/tech:rotate-180" />
                      </span>
                    </summary>

                    <div className="space-y-2.5 border-t border-slate-200 px-3.5 py-3">
                      {retrievalResultaten.map((resultaat, index) => {
                        const { chunk } = resultaat;
                        const fragment =
                          chunk.tekst.length > 520 ? `${chunk.tekst.slice(0, 520)}…` : chunk.tekst;
                        const gebruiktInAntwoord =
                          bronAntwoord?.gebruikteBronIds.includes(chunk.id) ?? false;

                        return (
                          <article
                            key={chunk.id}
                            className={`rounded-lg border p-3 ${
                              gebruiktInAntwoord
                                ? 'border-teal-200 bg-teal-50/30'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-medium text-slate-500">
                                    #{index + 1} · matchscore {resultaat.score}
                                  </p>
                                  {gebruiktInAntwoord && (
                                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                                      Gebruikt in antwoord
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                  {chunk.documentNaam}
                                </p>
                              </div>

                              <div className="flex flex-wrap justify-end gap-1.5 text-xs text-slate-500">
                                {chunk.pagina && (
                                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                    Pagina {chunk.pagina}
                                  </span>
                                )}
                                {chunk.sectie && (
                                  <span className="max-w-sm truncate rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                    {chunk.sectie}
                                  </span>
                                )}
                                <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                  Bronfragment {chunk.volgnummer}
                                </span>
                              </div>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-600">{fragment}</p>

                            {resultaat.gematchteTermen.length > 0 && (
                              <p className="mt-2 text-xs text-slate-400">
                                Match op: {resultaat.gematchteTermen.join(', ')}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </details>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoDisclosure({ tekst }: { tekst: string }) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 [&::-webkit-details-marker]:hidden">
        <Info className="h-3.5 w-3.5" />
        Info & privacy
      </summary>
      <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg">
        {tekst}
      </div>
    </details>
  );
}

// --- Resultaatweergave -----------------------------------------------------

function AnalyseWeergave({
  resultaat,
  bron,
  gekopieerd,
  opKopieer,
}: {
  resultaat: AnalyseResultaat;
  bron: ResultaatBron | null;
  gekopieerd: boolean;
  opKopieer: () => void;
}) {
  const heeftInhoud =
    resultaat.korteSamenvatting.length > 0 ||
    resultaat.mogelijkeTaken.length > 0 ||
    resultaat.deadlines.length > 0 ||
    resultaat.eisenEnAfspraken.length > 0 ||
    resultaat.aandachtspunten.length > 0;

  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-4">
      {/* Header met bron-label en kopieerknop */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-800">Analyse-resultaat</h4>
          {bron === 'ai' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          )}
          {bron === 'lokaal' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Cpu className="h-3 w-3" />
              Lokaal / demo
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={opKopieer}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white"
        >
          {gekopieerd ? (
            <>
              <Check className="h-3.5 w-3.5 text-teal-500" />
              Gekopieerd
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" />
              Kopiëren
            </>
          )}
        </button>
      </div>

      {!heeftInhoud ? (
        <p className="text-sm text-slate-500">
          StageMate kon geen bruikbare informatie herkennen in deze tekst. Probeer een
          langere of meer gestructureerde tekst met concrete opdrachten of deadlines.
        </p>
      ) : (
        <div className="space-y-4">
          {/* 1. Korte samenvatting — volle breedte */}
          <ResultaatBlok
            titel="Korte samenvatting"
            icoon={AlignLeft}
          >
            <p className="text-sm leading-relaxed text-slate-700">
              {resultaat.korteSamenvatting}
            </p>
          </ResultaatBlok>

          {/* 2-5. Gestructureerde informatie in een grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 2. Mogelijke taken */}
            <ResultaatBlok
              titel="Mogelijke taken"
              icoon={ListChecks}
              items={resultaat.mogelijkeTaken}
              leegTekst="Geen taken herkend"
            />

            {/* 3. Deadlines */}
            <ResultaatBlok
              titel="Deadlines"
              icoon={CalendarClock}
            >
              {resultaat.deadlines.length === 0 ? (
                <p className="text-xs text-slate-300">Geen deadlines herkend</p>
              ) : (
                <ul className="space-y-2">
                  {resultaat.deadlines.map((dl, i) => (
                    <li key={i} className="text-sm text-slate-700">
                      <span className="font-medium">{dl.omschrijving}</span>
                      <span
                        className={`ml-1.5 inline-flex items-center gap-1 text-xs ${
                          dl.onzeker ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {dl.onzeker && <AlertTriangle className="h-3 w-3" />}
                        {dl.datumTekst}
                        {dl.onzeker && <span className="ml-1">· relatieve/onzekere datum</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ResultaatBlok>

            {/* 4. Eisen & afspraken */}
            <ResultaatBlok
              titel="Eisen & afspraken"
              icoon={ShieldCheck}
              items={resultaat.eisenEnAfspraken}
              leegTekst="Geen eisen herkend"
            />

            {/* 5. Aandachtspunten */}
            <ResultaatBlok
              titel="Aandachtspunten"
              icoon={AlertTriangle}
              items={resultaat.aandachtspunten}
              leegTekst="Geen opvallende onduidelijkheden gevonden."
            />
          </div>
        </div>
      )}

      {/* Menselijke controle — herinnering */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/60 px-3 py-2.5 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          Controleer belangrijke informatie altijd met de oorspronkelijke bron. StageMate kan
          tekst verkeerd interpreteren. Mogelijke taken zijn suggesties — voeg ze alleen toe
          als ze kloppen. StageMate adviseert, jij beslist.
        </span>
      </div>
    </div>
  );
}

// --- Herbruikbaar resultaatblok --------------------------------------------

function ResultaatBlok({
  titel,
  icoon: Icoon,
  items,
  leegTekst,
  children,
}: {
  titel: string;
  icoon: LucideIcon;
  items?: string[];
  leegTekst?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Icoon className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titel}</p>
      </div>
      {children ? (
        children
      ) : items && items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-300">{leegTekst ?? 'Niets gevonden'}</p>
      )}
    </div>
  );
}

// --- Kopieerfunctie --------------------------------------------------------

// Zet het resultaat om in platte tekst met alle vijf secties.
// De header vermeldt of het resultaat van AI of lokaal komt.
function resultaatNaarTekst(r: AnalyseResultaat, bron: ResultaatBron | null): string {
  const header = bron === 'lokaal'
    ? 'STAGEMATE ANALYSE-RESULTAAT (lokale demoanalyse)'
    : 'STAGEMATE AI ANALYSE';
  const regels: string[] = [header, ''];

  // 1. Korte samenvatting
  if (r.korteSamenvatting) {
    regels.push('KORTE SAMENVATTING');
    regels.push(r.korteSamenvatting);
    regels.push('');
  }

  // 2. Mogelijke taken
  if (r.mogelijkeTaken.length > 0) {
    regels.push('MOGELIJKE TAKEN');
    r.mogelijkeTaken.forEach((i) => regels.push(`- ${i}`));
    regels.push('');
  }

  // 3. Deadlines
  if (r.deadlines.length > 0) {
    regels.push('DEADLINES');
    r.deadlines.forEach((dl) => {
      const flag = dl.onzeker ? ' (onzeker)' : '';
      regels.push(`- ${dl.omschrijving} — ${dl.datumTekst}${flag}`);
    });
    regels.push('');
  }

  // 4. Eisen & afspraken
  if (r.eisenEnAfspraken.length > 0) {
    regels.push('EISEN & AFSPRAKEN');
    r.eisenEnAfspraken.forEach((i) => regels.push(`- ${i}`));
    regels.push('');
  }

  // 5. Aandachtspunten
  if (r.aandachtspunten.length > 0) {
    regels.push('AANDACHTSPUNTEN');
    r.aandachtspunten.forEach((i) => regels.push(`- ${i}`));
  } else {
    regels.push('AANDACHTSPUNTEN');
    regels.push('- Geen opvallende onduidelijkheden gevonden.');
  }

  return regels.join('\n');
}
