import { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  FilePlus,
  FileText,
  FileType2,
  Info,
  Trash2,
  MoreHorizontal,
  Search,
  ArrowRight,
} from 'lucide-react';
import type { DocumentItem, Pagina } from '@/types';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { formatDatumLang } from '@/utils/datum';

interface DocumentenProps {
  documenten: DocumentItem[];
  opToevoegen: (doc: Omit<DocumentItem, 'id' | 'uploadDatum'>) => void;
  opVerwijderen: (id: string) => void;
  opPagina: (pagina: Pagina) => void;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TOEGESTANE_EXTENSIES = ['pdf', 'docx', 'txt'] as const;
const DOCUMENTEN_PER_PAGINA = 8;

export function Documenten({ documenten, opToevoegen, opVerwijderen, opPagina }: DocumentenProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [teVerwijderen, setTeVerwijderen] = useState<DocumentItem | undefined>(undefined);
  const [teBekijken, setTeBekijken] = useState<DocumentItem | undefined>(undefined);
  const [chunksBekijken, setChunksBekijken] = useState<DocumentItem | undefined>(undefined);
  const [geselecteerdBestand, setGeselecteerdBestand] = useState<File | null>(null);
  const [bestandsFout, setBestandsFout] = useState<string | null>(null);
  const [dragActief, setDragActief] = useState(false);
  const [bezigMetToevoegen, setBezigMetToevoegen] = useState(false);
  const [zoekterm, setZoekterm] = useState('');
  const [sortering, setSortering] = useState<'nieuwste' | 'naam' | 'oudste'>('nieuwste');
  const [huidigePagina, setHuidigePagina] = useState(1);
  const [openOverlay, setOpenOverlay] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const oorspronkelijkePositie = new Map(documenten.map((doc, index) => [doc.id, index]));
  const gefilterdeDocumenten = documenten.filter((doc) =>
    doc.naam.toLowerCase().includes(zoekterm.trim().toLowerCase()),
  );
  const gesorteerdeDocumenten = [...gefilterdeDocumenten].sort((a, b) => {
    if (sortering === 'naam') return a.naam.localeCompare(b.naam, 'nl');

    const datumVergelijking =
      sortering === 'nieuwste'
        ? b.uploadDatum.localeCompare(a.uploadDatum)
        : a.uploadDatum.localeCompare(b.uploadDatum);

    if (datumVergelijking !== 0) return datumVergelijking;

    const positieA = oorspronkelijkePositie.get(a.id) ?? 0;
    const positieB = oorspronkelijkePositie.get(b.id) ?? 0;
    return sortering === 'nieuwste' ? positieB - positieA : positieA - positieB;
  });

  const totaalPaginas = Math.max(1, Math.ceil(gesorteerdeDocumenten.length / DOCUMENTEN_PER_PAGINA));
  const veiligePagina = Math.min(huidigePagina, totaalPaginas);
  const eersteIndex = (veiligePagina - 1) * DOCUMENTEN_PER_PAGINA;
  const zichtbareDocumenten = gesorteerdeDocumenten.slice(
    eersteIndex,
    eersteIndex + DOCUMENTEN_PER_PAGINA,
  );
  const paginaKnoppen = maakPaginaKnoppen(veiligePagina, totaalPaginas);

  useEffect(() => {
    setHuidigePagina(1);
  }, [zoekterm, sortering]);

  useEffect(() => {
    if (huidigePagina > totaalPaginas) setHuidigePagina(totaalPaginas);
  }, [huidigePagina, totaalPaginas]);

  useEffect(() => {
    if (!openOverlay) return;

    function sluitBijBuitenKlik(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-document-overlay]')) setOpenOverlay(null);
    }

    function sluitMetEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenOverlay(null);
    }

    document.addEventListener('mousedown', sluitBijBuitenKlik);
    document.addEventListener('keydown', sluitMetEscape);
    return () => {
      document.removeEventListener('mousedown', sluitBijBuitenKlik);
      document.removeEventListener('keydown', sluitMetEscape);
    };
  }, [openOverlay]);

  function openModal() {
    setGeselecteerdBestand(null);
    setBestandsFout(null);
    setDragActief(false);
    setModalOpen(true);
  }

  function sluitModal() {
    setModalOpen(false);
    setGeselecteerdBestand(null);
    setBestandsFout(null);
    setDragActief(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function bepaalType(bestandsnaam: string): DocumentItem['type'] | null {
    const extensie = bestandsnaam.split('.').pop()?.toLowerCase() ?? '';
    if (!TOEGESTANE_EXTENSIES.includes(extensie as (typeof TOEGESTANE_EXTENSIES)[number])) {
      return null;
    }
    return extensie as DocumentItem['type'];
  }

  function handleBestand(file: File | undefined) {
    if (!file) return;

    const type = bepaalType(file.name);
    if (!type) {
      setGeselecteerdBestand(null);
      setBestandsFout('Dit bestandstype wordt nog niet ondersteund. Kies een PDF, DOCX of TXT-bestand.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setBestandsFout(null);
    setGeselecteerdBestand(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActief(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActief(false);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActief(false);
    handleBestand(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!geselecteerdBestand || bezigMetToevoegen) return;

    const type = bepaalType(geselecteerdBestand.name);
    if (!type) {
      setBestandsFout('Dit bestandstype wordt nog niet ondersteund. Kies een PDF, DOCX of TXT-bestand.');
      return;
    }

    setBezigMetToevoegen(true);
    setBestandsFout(null);

    try {
      let inhoud: string | undefined;
      let status: DocumentItem['status'] = 'nog-niet-verwerkt';

      if (type === 'txt') {
        const tekst = await geselecteerdBestand.text();
        if (!tekst.trim()) {
          setBestandsFout('Dit TXT-bestand bevat geen leesbare tekst.');
          return;
        }
        inhoud = normaliseerGeextraheerdeTekst(tekst);
        status = 'verwerkt';
      }

      if (type === 'docx') {
        const arrayBuffer = await geselecteerdBestand.arrayBuffer();
        const resultaat = await mammoth.extractRawText({ arrayBuffer });
        const tekst = resultaat.value;

        if (!tekst.trim()) {
          setBestandsFout('Uit dit DOCX-bestand kon geen leesbare tekst worden gehaald.');
          return;
        }

        inhoud = normaliseerGeextraheerdeTekst(tekst);
        status = 'verwerkt';
      }

      if (type === 'pdf') {
        const arrayBuffer = await geselecteerdBestand.arrayBuffer();
        const laadTaak = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await laadTaak.promise;
        const paginas: string[] = [];

        for (let paginaNummer = 1; paginaNummer <= pdf.numPages; paginaNummer += 1) {
          const pagina = await pdf.getPage(paginaNummer);
          const tekstInhoud = await pagina.getTextContent();
          let paginaTekst = '';

          for (const item of tekstInhoud.items) {
            if (!('str' in item)) continue;
            paginaTekst += item.str;
            paginaTekst += 'hasEOL' in item && item.hasEOL ? '\n' : ' ';
          }

          const schoon = normaliseerGeextraheerdeTekst(paginaTekst);
          if (schoon) paginas.push(`[Pagina ${paginaNummer}]\n${schoon}`);
        }

        const tekst = paginas.join('\n\n');
        if (!tekst.trim()) {
          setBestandsFout(
            'Uit deze PDF kon geen selecteerbare tekst worden gehaald. Het bestand is mogelijk een scan of afbeelding.',
          );
          return;
        }

        inhoud = tekst;
        status = 'verwerkt';
      }

      if (
        inhoud &&
        documenten.some(
          (document) => document.inhoud?.trim() === inhoud?.trim(),
        )
      ) {
        setBestandsFout(
          'Dit document is al toegevoegd. StageMate voorkomt dubbele bronnen zodat retrieval niet dubbel meetelt.',
        );
        return;
      }

      opToevoegen({
        naam: geselecteerdBestand.name,
        type,
        status,
        grootte: formatBestandsgrootte(geselecteerdBestand.size),
        demo: false,
        inhoud,
      });

      sluitModal();
    } catch {
      setBestandsFout('Het bestand kon niet worden gelezen. Probeer een ander bestand.');
    } finally {
      setBezigMetToevoegen(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documenten</h1>
          <p className="mt-1 text-sm text-slate-500">
            {documenten.length} {documenten.length === 1 ? 'document' : 'documenten'} als bron voor StageMate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DocumentInfo open={openOverlay === 'info'} onToggle={() => setOpenOverlay((huidig) => huidig === 'info' ? null : 'info')} />
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <FilePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Document toevoegen</span>
          </button>
        </div>
      </div>

      {documenten.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Vragen over je documenten?</p>
            <p className="mt-0.5 text-xs text-slate-500">
              StageMate AI gebruikt je toegevoegde documenten als bronnen voor het antwoord.
            </p>
          </div>
          <button
            type="button"
            onClick={() => opPagina('ai')}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800"
          >
            Vraag over documenten
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {documenten.length >= 8 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              placeholder="Zoek documenten..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={sortering}
            onChange={(e) => setSortering(e.target.value as 'nieuwste' | 'naam' | 'oudste')}
            aria-label="Documenten sorteren"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="nieuwste">Nieuwste eerst</option>
            <option value="naam">Naam A–Z</option>
            <option value="oudste">Oudste eerst</option>
          </select>
        </div>
      )}

      {documenten.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Nog geen documenten toegevoegd.</p>
          </div>
        </Card>
      ) : zichtbareDocumenten.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">Geen documenten gevonden.</p>
          <p className="mt-1 text-xs text-slate-400">Probeer een andere zoekterm.</p>
        </div>
      ) : (
        <ul className="overflow-visible rounded-xl border border-slate-200 bg-white">
          {zichtbareDocumenten.map((doc, index) => (
            <DocumentRij
              key={doc.id}
              doc={doc}
              laatste={index === zichtbareDocumenten.length - 1}
              menuOpen={openOverlay === `menu:${doc.id}`}
              opMenuToggle={() =>
                setOpenOverlay((huidig) => huidig === `menu:${doc.id}` ? null : `menu:${doc.id}`)
              }
              opVerwijderenClick={setTeVerwijderen}
              opBekijkenClick={setTeBekijken}
              opChunksClick={setChunksBekijken}
            />
          ))}
        </ul>
      )}

      {gesorteerdeDocumenten.length > DOCUMENTEN_PER_PAGINA && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            {eersteIndex + 1}–{Math.min(eersteIndex + DOCUMENTEN_PER_PAGINA, gesorteerdeDocumenten.length)}
            {' '}van {gesorteerdeDocumenten.length}
          </span>

          <nav className="flex items-center gap-1" aria-label="Documentpagina's">
            <button
              type="button"
              onClick={() => setHuidigePagina((pagina) => Math.max(1, pagina - 1))}
              disabled={veiligePagina === 1}
              className="rounded-md px-2.5 py-1.5 font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Vorige
            </button>

            {paginaKnoppen.map((item, index) =>
              item === '…' ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-slate-300">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setHuidigePagina(item)}
                  aria-current={item === veiligePagina ? 'page' : undefined}
                  className={`min-w-8 rounded-md px-2 py-1.5 font-medium transition-colors ${
                    item === veiligePagina
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setHuidigePagina((pagina) => Math.min(totaalPaginas, pagina + 1))}
              disabled={veiligePagina === totaalPaginas}
              className="rounded-md px-2.5 py-1.5 font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Volgende
            </button>
          </nav>
        </div>
      )}

      <Modal open={modalOpen} onClose={sluitModal} titel="Document toevoegen">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            Het gekozen bestand wordt lokaal in je browser uitgelezen en bewaard. StageMate leest
            alleen selecteerbare tekst: informatie die uitsluitend in screenshots, scans of andere
            afbeeldingen staat kan worden gemist. Bij document-Q&amp;A worden alleen relevante
            bronstukken naar de AI-service gestuurd. Deel daarom geen onnodige persoonsgegevens of
            vertrouwelijke informatie. Een scan-PDF zonder selecteerbare tekst wordt nog niet
            ondersteund.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => handleBestand(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
              dragActief
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50/40'
            }`}
          >
            <FileType2 className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <span className="block text-sm font-medium text-slate-700">
              Klik of sleep hier een PDF, DOCX of TXT-bestand
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Los het bestand hier neer. TXT, DOCX en tekst-PDF's worden lokaal gelezen.
            </span>
          </button>

          {bestandsFout && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-xs text-rose-700">{bestandsFout}</p>
            </div>
          )}

          {geselecteerdBestand && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {geselecteerdBestand.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {bepaalType(geselecteerdBestand.name)?.toUpperCase()} ·{' '}
                    {formatBestandsgrootte(geselecteerdBestand.size)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={sluitModal}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!geselecteerdBestand || bezigMetToevoegen || Boolean(bestandsFout)}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bezigMetToevoegen
                ? 'Lezen...'
                : bestandsFout
                  ? 'Kies ander bestand'
                  : 'Toevoegen'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={teBekijken !== undefined}
        onClose={() => setTeBekijken(undefined)}
        titel="Uitgelezen tekst"
        breed
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-800">{teBekijken?.naam}</p>
            <p className="mt-1 text-xs text-slate-500">
              Platte tekst uit het document — lokaal uitgelezen in jouw browser.
              {teBekijken?.inhoud ? ` · ${teBekijken.inhoud.length.toLocaleString('nl-NL')} tekens` : ''}
            </p>
          </div>
          <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-5">
            {teBekijken?.inhoud ? (
              <DocumentPreview tekst={teBekijken.inhoud} />
            ) : (
              <p className="text-sm text-slate-500">Geen uitgelezen tekst beschikbaar.</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTeBekijken(undefined)}
              className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Sluiten
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={chunksBekijken !== undefined}
        onClose={() => setChunksBekijken(undefined)}
        titel="Bronfragmenten"
        breed
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-800">{chunksBekijken?.naam}</p>
            <p className="mt-1 text-xs text-slate-500">
              {chunksBekijken?.chunks?.length ?? 0} lokale bronfragmenten die StageMate kan gebruiken om relevante informatie terug te vinden.
            </p>
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {chunksBekijken?.chunks?.map((chunk) => (
              <article key={chunk.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Bronfragment {chunk.volgnummer}
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {chunk.pagina && (
                      <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                        Pagina {chunk.pagina}
                      </span>
                    )}
                    {chunk.sectie && (
                      <span className="max-w-md truncate rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                        {chunk.sectie}
                      </span>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{chunk.tekst}</p>
              </article>
            ))}

            {(!chunksBekijken?.chunks || chunksBekijken.chunks.length === 0) && (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Voor dit document zijn nog geen bronstukken gemaakt.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setChunksBekijken(undefined)}
              className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Sluiten
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={teVerwijderen !== undefined}
        onClose={() => setTeVerwijderen(undefined)}
        titel="Document verwijderen"
      >
        <div>
          <p className="text-sm text-slate-600">
            Weet je zeker dat je <strong>{teVerwijderen?.naam}</strong> wilt verwijderen?
          </p>
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setTeVerwijderen(undefined)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={() => {
                if (teVerwijderen) opVerwijderen(teVerwijderen.id);
                setTeVerwijderen(undefined);
              }}
              className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Verwijderen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DocumentRij({
  doc,
  laatste,
  menuOpen,
  opMenuToggle,
  opVerwijderenClick,
  opBekijkenClick,
  opChunksClick,
}: {
  doc: DocumentItem;
  laatste: boolean;
  menuOpen: boolean;
  opMenuToggle: () => void;
  opVerwijderenClick: (d: DocumentItem) => void;
  opBekijkenClick: (d: DocumentItem) => void;
  opChunksClick: (d: DocumentItem) => void;
}) {
  const verwerkt = doc.status === 'verwerkt';

  return (
    <li
      className={`group relative flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-slate-50 ${
        laatste ? '' : 'border-b border-slate-100'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          doc.type === 'pdf'
            ? 'bg-rose-50 text-rose-500'
            : doc.type === 'docx'
              ? 'bg-sky-50 text-sky-500'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-slate-800">{doc.naam}</h3>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
          <span>{doc.type.toUpperCase()}</span>
          <span>·</span>
          <span>{doc.grootte}</span>
          <span>·</span>
          <span>{formatDatumLang(doc.uploadDatum)}</span>
          {doc.chunks && doc.chunks.length > 0 && (
            <>
              <span>·</span>
              <span>{doc.chunks.length} bronstukken</span>
            </>
          )}
          {doc.demo && (
            <>
              <span>·</span>
              <span className="text-amber-500">demo</span>
            </>
          )}
        </div>
      </div>

      <span
        className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
          verwerkt
            ? 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200'
            : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200'
        }`}
      >
        {verwerkt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
        {verwerkt ? 'Verwerkt' : 'Nog niet verwerkt'}
      </span>

      <div className="relative shrink-0" data-document-overlay>
        <button
          type="button"
          onClick={opMenuToggle}
          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label={`Acties voor ${doc.naam}`}
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {doc.inhoud && (
              <button
                type="button"
                onClick={() => opBekijkenClick(doc)}
                className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
              >
                Tekst bekijken
              </button>
            )}
            {doc.chunks && doc.chunks.length > 0 && (
              <button
                type="button"
                onClick={() => opChunksClick(doc)}
                className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
              >
                Bronstukken bekijken
              </button>
            )}
            <button
              type="button"
              onClick={() => opVerwijderenClick(doc)}
              className="block w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
            >
              Verwijderen
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function DocumentInfo({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="relative" data-document-overlay>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        aria-expanded={open}
      >
        <Info className="h-4 w-4" />
        <span className="hidden sm:inline">Info</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg">
          StageMate leest selecteerbare tekst lokaal uit PDF, DOCX en TXT. Tekst die alleen in
          screenshots, scans, grafieken of andere afbeeldingen staat kan worden gemist. Je documenten
          worden voorlopig alleen in deze browser bewaard; bij veel of grote bestanden kan de
          beschikbare browseropslag vol raken. Bij Q&amp;A worden alleen relevante bronstukken naar de
          AI-service gestuurd. Vermijd daarom onnodige persoonsgegevens en vertrouwelijke informatie.
        </div>
      )}
    </div>
  );
}

function maakPaginaKnoppen(huidig: number, totaal: number): Array<number | '…'> {
  if (totaal <= 7) return Array.from({ length: totaal }, (_, index) => index + 1);

  const knoppen: Array<number | '…'> = [1];
  const start = Math.max(2, huidig - 1);
  const einde = Math.min(totaal - 1, huidig + 1);

  if (start > 2) knoppen.push('…');
  for (let pagina = start; pagina <= einde; pagina += 1) knoppen.push(pagina);
  if (einde < totaal - 1) knoppen.push('…');

  knoppen.push(totaal);
  return knoppen;
}

type PreviewBlok =
  | { type: 'pagina'; tekst: string }
  | { type: 'kop'; tekst: string }
  | { type: 'veld'; label: string; waarde: string }
  | { type: 'alinea'; tekst: string };

const PREVIEW_VELDEN = new Set([
  'Onderdeel',
  'Beschrijving',
  'Testnummer',
  'Testdoel',
  'User Story',
  'User story',
  'Invoer',
  'Verwacht resultaat',
  'Werkelijk resultaat',
  'Status',
  'Opmerkingen',
  'Acceptatiecriterium',
  'Acceptatie criteria',
]);

function DocumentPreview({ tekst }: { tekst: string }) {
  const blokken = maakPreviewBlokken(tekst);

  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      {blokken.map((blok, index) => {
        if (blok.type === 'pagina') {
          return (
            <div
              key={`pagina-${index}`}
              className="sticky top-0 z-10 -mx-1 w-fit rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700"
            >
              {blok.tekst}
            </div>
          );
        }

        if (blok.type === 'kop') {
          return (
            <h3 key={`kop-${index}`} className="pt-1 text-base font-semibold text-slate-900">
              {blok.tekst}
            </h3>
          );
        }

        if (blok.type === 'veld') {
          return (
            <div
              key={`veld-${index}`}
              className="grid gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3"
            >
              <span className="font-medium text-slate-500">{blok.label}</span>
              <span className="text-slate-800">{blok.waarde}</span>
            </div>
          );
        }

        return (
          <p key={`alinea-${index}`} className="max-w-none text-slate-700">
            {blok.tekst}
          </p>
        );
      })}
    </div>
  );
}

function maakPreviewBlokken(tekst: string): PreviewBlok[] {
  const regels = tekst.split('\n').map((regel) => regel.trim());
  const blokken: PreviewBlok[] = [];
  let alinea: string[] = [];
  let eersteNaPagina = false;

  function flushAlinea() {
    if (alinea.length === 0) return;
    blokken.push({ type: 'alinea', tekst: alinea.join(' ') });
    alinea = [];
  }

  function isPagina(regel: string) {
    return /^\[Pagina \d+\]$/i.test(regel);
  }

  function isKop(regel: string) {
    return (
      /^\d+(?:\.\d+)*[.)]?\s+\S/.test(regel) ||
      /^(?:IT|ST)-\d+\b/i.test(regel) ||
      /^(?:Integratietesten|Systeemtesten)$/i.test(regel) ||
      regel.endsWith('?')
    );
  }

  for (let i = 0; i < regels.length; i += 1) {
    const regel = regels[i];

    if (!regel) {
      flushAlinea();
      continue;
    }

    if (isPagina(regel)) {
      flushAlinea();
      blokken.push({ type: 'pagina', tekst: regel });
      eersteNaPagina = true;
      continue;
    }

    if (eersteNaPagina && regel.length <= 120) {
      flushAlinea();
      blokken.push({ type: 'kop', tekst: regel });
      eersteNaPagina = false;
      continue;
    }
    eersteNaPagina = false;

    if (PREVIEW_VELDEN.has(regel)) {
      flushAlinea();
      const volgende = regels[i + 1]?.trim() ?? '';
      if (
        volgende &&
        !PREVIEW_VELDEN.has(volgende) &&
        !isPagina(volgende) &&
        !isKop(volgende)
      ) {
        blokken.push({ type: 'veld', label: regel, waarde: volgende });
        i += 1;
      } else {
        blokken.push({ type: 'kop', tekst: regel });
      }
      continue;
    }

    if (isKop(regel)) {
      flushAlinea();
      blokken.push({ type: 'kop', tekst: regel });
      continue;
    }

    alinea.push(regel);
  }

  flushAlinea();
  return blokken;
}

function normaliseerGeextraheerdeTekst(tekst: string): string {
  return tekst
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatBestandsgrootte(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes < 10 ? kilobytes.toFixed(1) : Math.round(kilobytes)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}
