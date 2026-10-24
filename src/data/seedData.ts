import type { Taak, DocumentItem } from '@/types';

// Voorbeelddata voor V1.
// Deze data wordt bij de eerste keer opstarten in localStorage gezet
// zodat de app meteen iets zinnigs laat zien tijdens de kwartetreview.
// De gebruiker kan daarna zelf taken toevoegen, aanpassen en verwijderen.

// We gebruiken datum-functies zodat deadlines altijd "vers" zijn t.o.v. vandaag.
function plusDagen(d: number): string {
  const datum = new Date();
  datum.setDate(datum.getDate() + d);
  const m = String(datum.getMonth() + 1).padStart(2, '0');
  const dag = String(datum.getDate()).padStart(2, '0');
  return `${datum.getFullYear()}-${m}-${dag}`;
}

export const seedTaken: Taak[] = [
  {
    id: 'seed-1',
    titel: 'Plan van Aanpak afronden',
    beschrijving: 'Eerste versie van het Plan van Aanpak opstellen en ter controle naar de stagedocent sturen.',
    deadline: plusDagen(3),
    prioriteit: 'hoog',
    afgerond: false,
    aanmaakdatum: plusDagen(-7),
  },
  {
    id: 'seed-2',
    titel: 'Interview voorbereiden',
    beschrijving: 'Vragen opstellen voor het interview met de stagedocent over verwachtingen en leerdoelen.',
    deadline: plusDagen(4),
    prioriteit: 'hoog',
    afgerond: false,
    aanmaakdatum: plusDagen(-5),
  },
  {
    id: 'seed-3',
    titel: 'Probleemverkenning bijwerken',
    beschrijving: 'De probleemverkenning aanvullen met bevindingen van deze week.',
    deadline: plusDagen(8),
    prioriteit: 'gemiddeld',
    afgerond: false,
    aanmaakdatum: plusDagen(-3),
  },
  {
    id: 'seed-4',
    titel: 'Weekverslag week 1 schrijven',
    beschrijving: 'Kort verslag van de eerste stageweek, inclusief leerdoelen.',
    deadline: plusDagen(-2),
    prioriteit: 'gemiddeld',
    afgerond: true,
    aanmaakdatum: plusDagen(-9),
  },
  {
    id: 'seed-5',
    titel: 'Bedrijfsinformatie verzamelen',
    beschrijving: 'Achtergrondinformatie over het stagebedrijf opzoeken en notities maken.',
    deadline: plusDagen(14),
    prioriteit: 'laag',
    afgerond: false,
    aanmaakdatum: plusDagen(-2),
  },
  {
    id: 'seed-6',
    titel: 'Logboek aanleggen',
    beschrijving: 'Een digitaal logboek bijhouden met dagelijkse activiteiten.',
    deadline: plusDagen(10),
    prioriteit: 'laag',
    afgerond: true,
    aanmaakdatum: plusDagen(-10),
  },
];

// Demo-documenten.
// Status "verwerkt" is hier een label — er vindt in V1 geen echte
// AI-documentverwerking plaats. Dit wordt op de pagina duidelijk aangegeven.
export const seedDocumenten: DocumentItem[] = [
  {
    id: 'doc-seed-1',
    naam: 'Stagehandleiding.pdf',
    type: 'pdf',
    status: 'verwerkt',
    grootte: '248 KB',
    uploadDatum: plusDagen(-10),
    demo: true,
  },
  {
    id: 'doc-seed-2',
    naam: 'Stageopdracht.docx',
    type: 'docx',
    status: 'verwerkt',
    grootte: '86 KB',
    uploadDatum: plusDagen(-8),
    demo: true,
  },
  {
    id: 'doc-seed-3',
    naam: 'Beoordelingsformulier.pdf',
    type: 'pdf',
    status: 'nog-niet-verwerkt',
    grootte: '132 KB',
    uploadDatum: plusDagen(-1),
    demo: true,
  },
];
