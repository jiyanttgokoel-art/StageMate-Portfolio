import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Taken } from '@/pages/Taken';
import { Documenten } from '@/pages/Documenten';
import { StageMateAI } from '@/pages/StageMateAI';
import { useTaken } from '@/hooks/useTaken';
import { useDocumenten } from '@/hooks/useDocumenten';
import type { Pagina } from '@/types';

// StageMate — V1
// Hoofdcomponent: bevat navigatie en de vier pagina's.
// Taken en documenten worden via hooks uit localStorage gehaald.

function App() {
  const [pagina, setPagina] = useState<Pagina>('dashboard');
  const { taken, taakToevoegen, taakAanpassen, taakOmschakelen, taakVerwijderen } = useTaken();
  const { documenten, documentToevoegen, documentVerwijderen } = useDocumenten();

  return (
    <Layout huidigePagina={pagina} opPagina={setPagina}>
      {pagina === 'dashboard' && (
        <Dashboard taken={taken} opOmschakelen={taakOmschakelen} opPagina={setPagina} />
      )}
      {pagina === 'taken' && (
        <Taken
          taken={taken}
          opToevoegen={taakToevoegen}
          opAanpassen={taakAanpassen}
          opOmschakelen={taakOmschakelen}
          opVerwijderen={taakVerwijderen}
        />
      )}
      {pagina === 'documenten' && (
        <Documenten
          documenten={documenten}
          opToevoegen={documentToevoegen}
          opVerwijderen={documentVerwijderen}
          opPagina={setPagina}
        />
      )}
      {pagina === 'ai' && <StageMateAI documenten={documenten} />}
    </Layout>
  );
}

export default App;
