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
 * SOLO SVILUPPO, come il file dei tile: in produzione serve un file proprio di quote (stesso formato) sul nostro hosting.
 */
export const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const DEM_SOURCE_ID = 'terrain-dem';
export const DEM_ATTRIBUTION_HTML = '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain: Mapzen, AWS</a>';
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

/** Attribuzione obbligatoria per licenza (ODbL): non toglierla. */
export const ATTRIBUTION_HTML =
  '<a href="https://github.com/protomaps/basemaps" target="_blank" rel="noopener">Protomaps</a> © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
