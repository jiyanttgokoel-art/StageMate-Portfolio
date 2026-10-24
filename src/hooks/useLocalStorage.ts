import { useEffect, useState } from 'react';

// useLocalStorage — een eenvoudige hook die React-state synchroniseert
// met de browser-localStorage. Zo blijven taken bewaard na vernieuwen.
//
// Werking:
// 1. Lees bij opstarten de opgeslagen waarde uit localStorage.
// 2. Geef een normale useState terug.
// 3. Schrijf bij elke wijziging de nieuwe waarde weg naar localStorage.
//
// Voor V1 is dit voldoende — geen database of accounts nodig.

export function useLocalStorage<T>(sleutel: string, standaardwaarde: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [waarde, setWaarde] = useState<T>(() => {
    try {
      const opgeslagen = localStorage.getItem(sleutel);
      if (opgeslagen !== null) {
        return JSON.parse(opgeslagen) as T;
      }
    } catch (e) {
      // Als het parsen mislukt, val terug op de standaardwaarde.
      console.warn(`Kon localStorage-waarde voor "${sleutel}" niet lezen:`, e);
    }
    return standaardwaarde;
  });

  useEffect(() => {
    try {
      localStorage.setItem(sleutel, JSON.stringify(waarde));
    } catch (e) {
      console.warn(`Kon niet naar localStorage schrijven voor "${sleutel}":`, e);
    }
  }, [sleutel, waarde]);

  return [waarde, setWaarde];
}
