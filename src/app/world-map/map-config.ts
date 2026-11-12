/**
 * Impostazioni della mappa del mondo (la home). I dati sono Protomaps (OpenStreetMap) in un solo file `.pmtiles` letto a pezzi dal browser.
 */

/**
 * File dei tile: pianeta intero, schema Protomaps v4, mirror su Source Cooperative.
 * SOLO SVILUPPO: non è pensato per il traffico di un'app. In produzione serve un file proprio (per esempio estratto con `pmtiles extract`) su un hosting con richieste Range e CORS.
 * Non usare `build.protomaps.com`: non manda gli header CORS e nel browser la mappa resta vuota.
 */
export const PMTILES_URL = 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles';

/**
 * Le altezze del terreno (Terrarium, AWS Terrain Tiles): servono al rilievo della vista 3D.
 *
 * SOLO SVILUPPO, come il file dei tile: in produzione serve un file proprio di quote (stesso formato) sul nostro hosting.
 * Perché (verificato il 2026-11-09): il dataset è gratuito (lo paga il programma AWS Open Data) e non ha limiti né SLA dichiarati, ma
 * la documentazione di Joerd dice che gli endpoint S3 sono "meant for efficient networking with EC2 resources only" e non stanno dietro
 * CloudFront. Un browser che scarica da lì è l'uso sconsigliato, e non abbiamo nessuna garanzia di disponibilità.
 * Per passare al file proprio basta cambiare `DEM_TILES_URL`: il formato resta Terrarium.
 *
 * ATTRIBUZIONE: il dato unisce molte fonti, ciascuna con la sua licenza, e chi lo usa deve rispettarle
 * (https://github.com/tilezen/joerd/blob/master/docs/attribution.md). Oggi citiamo Mapzen/AWS, SRTM ed EU-DEM (le fonti attese in Europa/Italia)
 * e rimandiamo alla pagina completa per il resto: i crediti sono in `TERRAIN_CREDITS`, in fondo a questo file.
 * DA FARE prima del rilascio:
 *  - se la mappa mostra altre aree (USA, Canada, Australia, Nuova Zelanda, Norvegia, Regno Unito, Austria, Messico…), aggiungere in `TERRAIN_CREDITS`
 *    le righe di credito richieste per quelle fonti, con il testo esatto della pagina sopra;
 *  - se ospitiamo noi i tile (anche solo estratti), la regola resta: citare le fonti dei dati che contengono;
 *  - se c'è monetizzazione, rileggere le licenze delle fonti usate (CC BY, OGL…) per l'uso commerciale: la pagina non lo dichiara in modo esplicito.
 */
export const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const DEM_SOURCE_ID = 'terrain-dem';
/** Quanto si esagerano le altezze (1 = vere): la città è ripida, meglio poco. */
export const TERRAIN_EXAGGERATION = 1.2;

/** Id della sorgente nello stile: lo stesso va dato a `layers()` di `@protomaps/basemaps`. */
export const BASEMAP_SOURCE_ID = 'protomaps';

/** Font e icone delle etichette: pubblici, da copiare sul nostro hosting in produzione. */
export const GLYPHS_URL = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';
export const SPRITE_BASE_URL = 'https://protomaps.github.io/basemaps-assets/sprites/v4';

/** Lingua delle etichette della mappa (fissa: non segue la lingua dell'interfaccia). */
export const LABEL_LANGUAGE = 'it';

/** Vista iniziale: MapLibre vuole [longitudine, latitudine]. */
export const START_VIEW: { center: [number, number]; zoom: number } = { center: [8.91791924698207, 44.4091624226706], zoom: 14 };

/**
 * I crediti della mappa, mostrati nella dialog del tasto info (`map-credits.component.ts`); il box dei crediti di MapLibre non c'è più.
 * Sono obbligatori per licenza (OpenStreetMap è ODbL, le fonti del terreno hanno le loro): non toglierli, e se si aggiunge una sorgente di dati aggiungi qui il suo credito.
 * Il testo è quello che chiede il fornitore, parola per parola, e per questo non si traduce.
 */
export interface MapCredit {
  text: string;
  url?: string;
}

/** I dati della mappa. */
export const DATA_CREDITS: readonly MapCredit[] = [
  { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
  { text: 'Protomaps', url: 'https://github.com/protomaps/basemaps' },
];

/** Le allerte meteo: bollettini del Dipartimento della Protezione Civile, licenza CC BY 4.0 (la licenza chiede di citare la fonte). */
export const WEATHER_CREDITS: readonly MapCredit[] = [
  { text: 'Dipartimento della Protezione Civile, Bollettini di criticità idrogeologica e idraulica (CC BY 4.0)', url: 'https://github.com/pcm-dpc/DPC-Bollettini-Criticita-Idrogeologica-Idraulica' },
];

/** Le altezze del terreno: vedi le note su `DEM_TILES_URL` (cosa manca prima del rilascio). */
export const TERRAIN_CREDITS: readonly MapCredit[] = [
  { text: 'Mapzen, AWS Terrain Tiles', url: 'https://registry.opendata.aws/terrain-tiles/' },
  { text: 'SRTM data courtesy of the U.S. Geological Survey' },
  { text: 'Produced using Copernicus data and information funded by the European Union - EU-DEM layers' },
];
/** Pagina con l'elenco completo delle fonti del terreno (il testo del link si traduce nella dialog). */
export const TERRAIN_SOURCES_URL = 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md';

/** Il software che disegna la mappa. */
export const SOFTWARE_CREDITS: readonly MapCredit[] = [
  { text: 'MapLibre GL JS', url: 'https://maplibre.org' },
  { text: 'PMTiles', url: 'https://github.com/protomaps/PMTiles' },
];

/** Dove si segnala un errore dei dati (OpenStreetMap). */
export const MAP_FEEDBACK_URL = 'https://www.openstreetmap.org/fixthemap';
