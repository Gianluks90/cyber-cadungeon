/** Il contratto è solo l'intestazione: leggera, pubblica, la mappa del mondo la mostra senza scaricare la missione (docs/DESIGN-MOD-CONTRATTI.md, §2.7b). */
export interface Contract {
  /** Id stabile del contratto. */
  id: string;
  /** Numero collezionabile, assegnato una volta sola (1 = #001). */
  number: number;
  /** Copia in sola lettura del titolo della missione (la fonte è il `title` del `MapData`). Testo italiano del catalogo, si traduce con `ct`. */
  title: string;
  /** Didascalia breve, appartiene al contratto. Testo italiano del catalogo, si traduce con `ct`. */
  caption: string;
  /** La missione: `public/maps/<mapId>.json`. Si legge solo dopo lo sblocco. */
  mapId: string;
  /** Dove si trova il contratto sulla mappa del mondo. */
  lng: number;
  lat: number;
  /** `hidden` è solo un campo previsto: per ora non si implementa. */
  visibility: 'visible' | 'hidden';
  /** Segnaposto: per ora i contratti sono solo dell'app. */
  fixer: string;
}

/** Il file `public/contracts/index.json`. */
export interface ContractIndex {
  contracts: Contract[];
}
