import { useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { DocumentItem } from '@/types';
import { CHUNK_VERSIE, maakDocumentChunks } from '@/utils/chunks';

// useDocumenten — hook voor het beheren van documentmetadata.
// Echte lokale bestandskeuze werkt vanaf Technique 2A.
// Tekstextractie uit het bestand volgt in Technique 2B.

const OPSLAG_SLEUTEL = 'stagemate-documenten';

export function useDocumenten() {
  const [documenten, setDocumenten] = useLocalStorage<DocumentItem[]>(OPSLAG_SLEUTEL, []);

  // Vul chunks aan voor bestaande lokaal opgeslagen documenten uit 2B.
  useEffect(() => {
    setDocumenten((prev) => {
      // Verwijder oude V1-demo-documenten uit bestaande browseropslag.
      const zonderDemoDocumenten = prev.filter((doc) => !doc.demo);
      let gewijzigd = zonderDemoDocumenten.length !== prev.length;

      const volgend = zonderDemoDocumenten.map((doc) => {
        if (!doc.inhoud || (doc.chunks && doc.chunks.length > 0 && doc.chunkVersie === CHUNK_VERSIE)) {
          return doc;
        }

        const chunks = maakDocumentChunks(doc);
        if (chunks.length === 0) return doc;

        gewijzigd = true;
        return { ...doc, chunks, chunkVersie: CHUNK_VERSIE };
      });

      return gewijzigd ? volgend : prev;
    });
  }, [setDocumenten]);

  const documentToevoegen = useCallback(
    (doc: Omit<DocumentItem, 'id' | 'uploadDatum'>) => {
      const basisDoc: DocumentItem = {
        ...doc,
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uploadDatum: new Date().toISOString().slice(0, 10),
        // Nieuwe uploads zijn echte lokale bestandskeuzes, geen demo-items.
        demo: doc.demo ?? false,
      };

      const nieuwDoc: DocumentItem = {
        ...basisDoc,
        chunks: basisDoc.inhoud ? maakDocumentChunks(basisDoc) : [],
        chunkVersie: CHUNK_VERSIE,
      };

      setDocumenten((prev) => [...prev, nieuwDoc]);
    },
    [setDocumenten],
  );

  const documentVerwijderen = useCallback(
    (id: string) => {
      setDocumenten((prev) => prev.filter((d) => d.id !== id));
    },
    [setDocumenten],
  );

  return {
    documenten,
    documentToevoegen,
    documentVerwijderen,
  };
}
