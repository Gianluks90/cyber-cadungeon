/** Una scheda della scelta dell'avventura: con `map` (il nome del file in `public/maps/`, senza estensione) si può giocare, senza è un posto ancora vuoto. */
export interface AdventureCard {
  map?: string;
  title?: string;
}

/** Le avventure della scelta, nell'ordine in cui compaiono: file di `public/maps/` fatti con l'editor. Per ora nessuna (le originali sono in `docs/legacy/maps/`); `/play/test` si apre ancora a mano. */
export const ADVENTURES: readonly AdventureCard[] = [];
