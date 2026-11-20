# Handoff: mappa cyberpunk (da `cyberpunk-world-map` a CyberCadungeon)

Documento per un Claude Code che **non conosce** il repo di origine. Descrive come funziona la mappa, non dove metterla nel progetto di destinazione.

Legenda:
- **[REPO]** = descrive codice che esiste nel repo di origine. Il progetto compila (esiste `dist/`), ma **nessuno ha verificato il risultato a schermo durante la stesura di questo documento e non ci sono test automatici**.
- **[PROPOSTA]** = idea mai provata.
- **[DEDOTTO]** = conclusione ricavata leggendo il codice, non un problema vissuto.

Origine: app Angular 22.2.5, componenti standalone, `ChangeDetectionStrategy.OnPush`, signals (`input()`, `output()`, `viewChild()`, `effect()`), TypeScript 6.0.3 strict. Non c'è git nel repo di origine: non esiste storia dei commit da consultare.

---

## 1. Librerie [REPO]

Versioni **installate** (da `node_modules`, coincidono con `package-lock.json`). In `package.json` sono con `^`; per riprodurre il comportamento fissale.

| Pacchetto | Versione esatta | Ruolo | Perché |
|---|---|---|---|
| `maplibre-gl` | 6.16.0 | Disegna la mappa vettoriale con WebGL | Libero (fork open di Mapbox GL), nessuna chiave obbligatoria |
| `pmtiles` | 4.5.0 | Protocollo `pmtiles://` per MapLibre (classe `Protocol`) | Legge un singolo file `.pmtiles` con richieste HTTP Range: nessun server di tile da gestire |
| `@protomaps/basemaps` | 5.7.2 | Genera l'elenco dei layer di stile (`layers()`) da una palette (`Flavor`, `namedFlavor()`) | Evita di scrivere a mano ~100 layer; il tema si cambia con una tabella di colori |
| `rxjs` | 7.8.2 | Non usato dalla mappa | Dipendenza di default di Angular |

Angular: `@angular/*` 22.2.x, `@angular/build` e `@angular/cli` ^22.2.6, `vitest` ^5.0.0 e `jsdom` ^30.0.0 (non usati: nessun test).

Scelta dei dati: Protomaps (OpenStreetMap) in formato PMTiles. Il README di origine dice di non usare i tile pubblici di openstreetmap.org perché la loro policy lo vieta per app con molti utenti.

Nessun Firebase, login o GPS nella mappa.

**Impatto sul bundle:** MapLibre pesa circa 1 MB. In `angular.json` (configurazione `production`) il budget `initial` è stato alzato a `maximumWarning: 2MB`, `maximumError: 4MB`. Se il progetto di destinazione ha budget più stretti, la build di produzione può fallire.

---

## 2. Sorgente dei dati [REPO]

### Cosa usa oggi
Una costante in `src/app/config/map-config.ts`:

```ts
export const PMTILES_URL = 'https://data.source.coop/protomaps/openstreetmap/v4.pmtiles';
```

- Pianeta intero, schema Protomaps **v4**, mirror su Source Cooperative.
- **Solo sviluppo.** Il commento nel file dice: non aggiornato ogni giorno, non pensato per il traffico di un'app.
- Verificato con `curl` il 2026-11-08: risponde `206` alle richieste Range, `access-control-allow-origin: *`, `content-length` totale 134.812.420.554 byte (~135 GB), `last-modified: 31 mar 2026`. Il browser scarica solo i pezzi che servono.

### Come è registrato
1. Prima di creare la mappa: `addProtocol('pmtiles', new Protocol().tile)` (da `maplibre-gl` e `pmtiles`).
2. Nello stile, la sorgente è un vettoriale con url `pmtiles://` + indirizzo del file:

```ts
sources: {
  protomaps: {
    type: 'vector',
    url: `pmtiles://${PMTILES_URL}`,
    attribution: ATTRIBUTION_HTML,
  },
},
```

3. L'id della sorgente (`'protomaps'`) è una costante (`BASEMAP_SOURCE_ID`) e **deve essere la stessa** passata a `layers(BASEMAP_SOURCE_ID, ...)`.

### Risorse esterne oltre al file di tile
Font (glyphs) e icone (sprite) delle etichette arrivano da `protomaps.github.io/basemaps-assets`:

```ts
export const GLYPHS_URL = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';
export const SPRITE_BASE_URL = 'https://protomaps.github.io/basemaps-assets/sprites/v4';
// nello stile:  sprite: `${SPRITE_BASE_URL}/${theme.spriteName}`   // 'dark' | 'light'
```

Sono pubblici; per la produzione il README di origine consiglia di copiarli sul proprio hosting (non fatto).

### Altre costanti di config
`LABEL_LANGUAGE = 'it'` (lingua delle etichette di mappa, passata a `layers(..., { lang })`), `GENOA_VIEW = { center: [8.9463, 44.4056], zoom: 13 }` (MapLibre vuole `[longitudine, latitudine]`), `ATTRIBUTION_HTML`.

### Chiavi e token
**Nessuna chiave o token** in questo setup. Se un domani il file andrà su un hosting con accesso firmato, usare segnaposto del tipo `<TUO_TOKEN>` e non committarlo.

### Ricavare un file più piccolo (comando, non codice) [REPO, dal README; non rieseguito in questa sessione]
Con lo strumento `pmtiles` (go-pmtiles) da riga di comando:

```bash
pmtiles extract https://build.protomaps.com/<AAAAMMGG>.pmtiles liguria.pmtiles --bbox=7.45,43.75,10.10,44.70
pmtiles extract https://build.protomaps.com/<AAAAMMGG>.pmtiles italia.pmtiles  --bbox=6.60,35.40,18.60,47.15
```

Opzioni utili: `--maxzoom=14`, `--minzoom`. Le date valide sono elencate in `https://build-metadata.protomaps.dev/builds.json`. I bbox sono approssimati. Il file si può ispezionare su https://pmtiles.io.

**Caso limite:** le build su `build.protomaps.com` **non** inviano header CORS: vanno bene per `pmtiles extract` da terminale, **non** come `PMTILES_URL` nel browser (la mappa resta vuota).

---

## 3. Il tema [REPO]

### Come funziona
Un tema (`MapTheme`) contiene: un `Flavor` di `@protomaps/basemaps`, il nome dello sprite (`'dark' | 'light'`) e degli `extras` (colori nostri, fuori dal Flavor). `buildMapStyle(theme)` lo trasforma in uno `StyleSpecification` di MapLibre.

```ts
export interface MapTheme {
  id: 'cyberpunk' | 'light';
  flavor: Flavor;
  spriteName: 'dark' | 'light';
  extras: ThemeExtras;   // buildingOutline, markerCore, markerGlow, markerBorder, ui{accent,panelBackground,text,textMuted}
}
```

La palette sta in un oggetto `palette` in cima a `src/app/map/map-theme.ts`; `buildCyberpunkFlavor()` parte da `...namedFlavor('dark')` e sovrascrive i campi. **Si ritocca solo lì** (e `THEMES` per registrare altri temi).

### Palette cyberpunk completa (valori esatti)

| Ruolo | Chiave in `palette` | Colore |
|---|---|---|
| Sfondo | `background` | `#03060f` |
| Terra | `land` | `#070c1c` |
| Usi del suolo (aree pedonali, scuole, aeroporti…) | `landUse` | `#0b1226` |
| Acqua | `water` | `#050e24` |
| Etichette oceano | `waterLabel` | `#2f6f9f` |
| Parchi | `park` | `#08181f` |
| Boschi/macchia/campi | `wood` | `#07151b` |
| Strade principali | `roadMain` | `#2ad4ff` |
| Strade secondarie | `roadSecondary` | `#1a8fb0` |
| Strade minori (vicoli, sentieri, servizio) | `roadMinor` | `#12566d` |
| Bordo delle strade | `roadCasing` | `#03060f` |
| Strade in galleria | `roadTunnel` | `#0e3a4a` |
| Ferrovia | `railway` | `#5a2a3a` |
| Edifici (riempimento) | `building` | `#4a0e18` |
| Contorno edifici (layer nostro) | `buildingOutline` | `#ff3b3b` |
| Confini (quartieri/amministrativi) | `boundary` | `#ff5a1f` |
| Etichette | `label` | `#6fe6ff` |
| Alone etichette | `labelHalo` | `#03060f` |
| Segnalino: nucleo | `markerCore` | `#ffc933` |
| Segnalino: bagliore | `markerGlow` | `#ffb000` |
| Segnalino: bordo | `markerBorder` | `#fff3c4` |
| UI: accento | `uiAccent` | `#2ad4ff` |
| UI: sfondo pannelli | `uiPanel` | `rgba(5, 10, 26, 0.92)` |
| UI: testo | `uiText` | `#d8f6ff` |
| UI: testo attenuato | `uiTextMuted` | `#7fb8c9` |

Sfondo globale della pagina in `styles.css` (non nel tema): `#05060f`.

### Mappatura ruolo → campi del Flavor (come viene passata allo stile)
Dentro `buildCyberpunkFlavor()`:

```ts
return {
  ...namedFlavor('dark'),                // base: nessun campo obbligatorio manca
  background: p.background, earth: p.land,
  park_a/park_b/zoo: p.park;  wood_a/wood_b/scrub_a/scrub_b: p.wood;
  hospital/industrial/school/pedestrian/sand/beach/glacier/military/aerodrome: p.landUse;
  runway: p.roadSecondary;  pier: p.roadMinor;
  water: p.water;  buildings: p.building;
  highway/major: p.roadMain;  link/minor_a/minor_b: p.roadSecondary;
  other/minor_service: p.roadMinor;  railway: p.railway;
  *_casing (highway_casing_early/late, major_casing_early/late, link_casing, minor_casing, minor_service_casing): p.roadCasing;
  tunnel_* : p.roadTunnel;  tunnel_*_casing: p.roadCasing;
  bridges_highway/major: p.roadMain;  bridges_link/minor: p.roadSecondary;  bridges_other: p.roadMinor;  bridges_*_casing: p.roadCasing;
  boundaries: p.boundary;
  roads_label_minor/major, subplace_label, city_label, state_label, country_label, address_label: p.label;
  *_halo (roads_label_minor/major, subplace, city, state, address): p.labelHalo;
  ocean_label: p.waterLabel;
  landcover: { barren: land, farmland: wood, forest: wood, glacier: landUse, grassland: park, scrub: wood, urban_area: landUse },
};
```
(Sopra è abbreviato con `/`; l'elenco campo per campo è in `map-theme.ts` righe 84–175.) `country_label` non ha alone nel tema: usa quello di default dell'`namedFlavor('dark')`.

### Layer e stili personalizzati oltre al tema base
1. **`buildings-outline`** (in `map-style.ts`): layer `line` sulla source-layer `buildings`, filtro `['in','kind','building','building_part']`, `minzoom: 14`, `line-color` = `extras.buildingOutline`, `line-width` interpolato 0.4 (zoom 14) → 1.2 (zoom 18), `line-opacity` 0.85. Viene **inserito subito dopo il layer con id `'buildings'`** di Protomaps (se non lo trova, va in coda).
2. **`markers-glow`** e **`markers-core`** (in `world-map.ts`): vedi sezione 5. Sono layer `circle` aggiunti a runtime, non nello stile.
3. **Tema chiaro**: solo `namedFlavor('light')` con extras propri (`buildingOutline #b9b9c9`, `markerCore/markerGlow #e0007a`, `markerBorder #ffffff`, UI `#0b6bcb`, pannello `rgba(255,255,255,0.95)`, testo `#1b1d2a`, attenuato `#5a5f73`). Serve a dimostrare che il tema è intercambiabile; è un tema di servizio, non disegnato.
4. **CSS globale** (`styles.css`): `@import 'maplibre-gl/dist/maplibre-gl.css';` e regole su `.maplibregl-ctrl-attrib` (sfondo `rgba(255,255,255,0.85)` con `!important`, `font-size: 12px`, link `#1b1d2a`) per l'attribuzione leggibile su mappa scura.
5. **Variabili CSS UI** impostate dal genitore su `.shell`: `--ui-accent`, `--ui-panel`, `--ui-text`, `--ui-text-muted`, valorizzate dagli `extras.ui` del tema attivo. Pannello e pulsanti le leggono.

### Dove ritoccare
- Colori: oggetto `palette` (cyberpunk) in `map-theme.ts`.
- Cosa colora cosa: `buildCyberpunkFlavor()`.
- Contorno edifici: `extras.buildingOutline` + paint in `map-style.ts`.
- Segnalini: `extras.marker*` + dimensioni nel componente.

### Casi limite
- Se un campo del Flavor non viene sovrascritto, resta il colore dark ufficiale di Protomaps (può "stonare"). Controllare a vista zoom basso/medio/alto.
- Lo sprite deve corrispondere al tema (`dark` per il cyberpunk): icone e testi scuri su sfondo scuro altrimenti non si leggono.
- [PROPOSTA] Mappare la palette sui token CSS del progetto di destinazione (leggere i valori da `getComputedStyle`) invece di duplicare gli esadecimali: **mai provato**; i valori di MapLibre devono essere stringhe colore risolte, non `var(--x)`.

---

## 4. Il componente della mappa (`WorldMap`) [REPO]

Componente standalone, `OnPush`, selettore `app-world-map`. Input: `theme` (required, `MapTheme`), `markers` (`MapMarker[]`, default `[]`). Output: `markerSelected` (`MapMarker`). Template: un `div` contenitore (`role="application"`, `aria-label` da testi) e un pulsante "Torna a Genova".

### Inizializzazione
Nel costruttore, dentro `afterNextRender` (così il DOM esiste e non si esegue lato server), tutto in `runOutsideAngular`:

```ts
afterNextRender(() => {
  this.ngZone.runOutsideAngular(() => this.createMap());
});

private createMap(): void {
  setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);  // vedi trappole
  addProtocol('pmtiles', new Protocol().tile);
  this.protocolRegistered = true;

  const map = new MapLibreMap({
    container: this.container().nativeElement,
    style: buildMapStyle(this.theme()),
    center: GENOA_VIEW.center,
    zoom: GENOA_VIEW.zoom,
    attributionControl: false,          // aggiunta a mano sotto, sempre espansa
    locale: TEXTS.map.controls,         // stringhe dei controlli MapLibre tradotte
  });
  this.map = map;
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new AttributionControl({ compact: false }), 'bottom-right');
  map.on('style.load', () => this.addMarkerLayers(map));
  // ... handler del click (sezione 5)
}
```

Il contenitore è `position: absolute; inset: 0` dentro un host `display:block; position:relative; width:100%; height:100%`. **Il genitore deve dare un'altezza reale** al componente, altrimenti la mappa ha altezza 0 (e `html`, `body`, `app-root` devono arrivare a 100%: vedi `styles.css`).

### Fuori da NgZone
Il costruttore, i `flyTo`, i `setStyle` e `setData` usano `this.ngZone.runOutsideAngular(...)`. Solo l'emissione verso il genitore rientra con `this.ngZone.run(...)`. Motivo (dai commenti): le animazioni continue di MapLibre non devono innescare il change detection.

### Cambio tema
Un `effect` legge `this.theme()` e chiama `map.setStyle(buildMapStyle(theme), { diff: false })`. `diff: false` = sostituzione completa. `setStyle` rimuove sorgenti e layer dei segnalini, che vengono **ricreati dall'evento `style.load`** (che scatta anche per il primo stile). Se `this.map` è ancora `null` (primo giro dell'effect), esce senza fare nulla.

### Distruzione
```ts
this.destroyRef.onDestroy(() => {
  this.map?.remove();
  this.map = null;
  if (this.protocolRegistered) { removeProtocol('pmtiles'); this.protocolRegistered = false; }
});
```

### Resize
**Il codice non ha alcuna gestione esplicita del resize** (nessun `ResizeObserver`, nessun `map.resize()`). Si affida al comportamento di default di MapLibre, che ascolta il `resize` della finestra. [DEDOTTO] Se nel progetto di destinazione il contenitore cambia dimensione senza che cambi la finestra (pannelli laterali che si aprono/chiudono, layout con animazioni, tab), potrebbe servire un `ResizeObserver` che chiami `map.resize()`: **non provato**. Nel repo il pannello è sovrapposto alla mappa (`position: absolute`), quindi il problema non si presenta.

### Controlli
- `NavigationControl({ showCompass: false })` in alto a destra (solo zoom +/−).
- `AttributionControl({ compact: false })` in basso a destra, sempre espansa.
- Pulsante "home" custom (HTML nel template, `top: 84px; right: 10px`, sotto i controlli di zoom) che fa `flyTo({ center, zoom, essential: true })` sulla vista iniziale.
- I testi dei controlli MapLibre si traducono con l'opzione `locale` (mappa chiave → stringa; chiavi usate: `NavigationControl.ZoomIn`, `NavigationControl.ZoomOut`, `NavigationControl.ResetBearing`, `AttributionControl.ToggleAttribution`, `AttributionControl.MapFeedback`).

### Attribuzione
`ATTRIBUTION_HTML` = `Protomaps © OpenStreetMap` con link a `https://github.com/protomaps/basemaps` e `https://openstreetmap.org/copyright`. Va nella source dello stile. È un obbligo di licenza (ODbL): **non rimuoverla**. Resta sempre visibile (`compact: false` + CSS globale per leggibilità).

---

## 5. Segnalini e pannello [REPO]

### Dati
`MapMarker { id, title, description, longitude, latitude }`. Oggi vengono da `data/markers.json` (3 segnalini di prova a Genova, con testo "Dato di prova"), importato con `resolveJsonModule` e passato come input. Il componente della mappa non sa da dove vengono: riceve un array.

### Disegno: layer GeoJSON, non marker DOM
Una source `geojson` (`'markers'`) con una Feature `Point` per segnalino (`properties: { id }`, `coordinates: [longitude, latitude]`) e due layer `circle`:

```ts
map.addLayer({ id: 'markers-glow', type: 'circle', source: 'markers',
  paint: { 'circle-radius': 20, 'circle-color': markerGlow, 'circle-opacity': 0.35, 'circle-blur': 1 } });
map.addLayer({ id: 'markers-core', type: 'circle', source: 'markers',
  paint: { 'circle-radius': 6, 'circle-color': markerCore,
           'circle-stroke-color': markerBorder, 'circle-stroke-width': 1.5 } });
```

I colori vengono da `theme().extras` al momento della (ri)creazione. Raggi e opacità sono costanti nel codice, non nel tema.

### Aggiornamento dei dati
Un `effect` su `markers()` fa `source.setData(toGeoJson(markers))` se la source esiste (`this.map?.getSource('markers')`). Se non esiste ancora (mappa non creata o stile in caricamento), l'effect non fa nulla: i dati correnti vengono letti comunque da `addMarkerLayers` all'evento `style.load`.

### Clic
```ts
const onMarkerClick = (event: MapLayerMouseEvent) => {
  const id = event.features?.[0]?.properties?.['id'];
  const marker = this.markers().find((m) => m.id === id);
  if (marker) this.ngZone.run(() => this.markerSelected.emit(marker));
};
for (const layerId of ['markers-glow', 'markers-core']) {
  map.on('click', layerId, onMarkerClick);
  map.on('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', layerId, () => (map.getCanvas().style.cursor = ''));
}
```
Si registra su **entrambi** i layer (il glow è più largo ed è facile da toccare). Si cerca il marker per `id` nell'array corrente, non si passa l'oggetto dentro il GeoJSON: nel GeoJSON c'è solo l'`id`. Il cursore diventa `pointer` al passaggio.

### Comunicazione con il resto dell'app
- `WorldMap` → genitore: `markerSelected` (output con il `MapMarker`).
- Genitore (`App`): `selectedMarker = signal<MapMarker | null>(null)`; `(markerSelected)="selectedMarker.set($event)"`.
- Genitore → pannello: `[marker]="selectedMarker()"`; pannello → genitore: `(closed)="selectedMarker.set(null)"`.
- Il pannello **non conosce la mappa** e la mappa non conosce il pannello. Nessun servizio condiviso.

### Pannello (`InfoPanel`)
Standalone, `OnPush`, input `marker: MapMarker | null`, output `closed`. Template: `@if (marker(); as m)` → `<aside aria-live="polite">` con pulsante di chiusura (aria-label da testi), un'etichetta "tipo" (oggi testo segnaposto "Segnalino di prova"), `<h2>` titolo e descrizione. Stile: `position: absolute`, lato sinistro a tutta altezza, `width: min(360px, 90vw)`, bordo e ombra con `--ui-accent`, `overflow-y: auto`. Sul telefono copre quasi tutta la mappa (90vw).

### Casi limite
- Selezione dopo cambio tema: il pannello resta aperto (dipende solo da `selectedMarker`), e i layer vengono ricreati.
- Se due segnalini si sovrappongono, il clic prende `features[0]`, cioè quello renderizzato più in alto: nessuna gestione di cluster o disambiguazione.
- Un `id` duplicato nei dati selezionerebbe sempre il primo.
- Il clic su un punto fuori dai layer segnalino non deseleziona nulla: la selezione si chiude solo dal pulsante ✕. [DEDOTTO]

### Testi (i18n)
Nel repo di origine i testi sono un oggetto TypeScript `TEXTS` (solo italiano, `texts.ts`), letto direttamente dai componenti (`TEXTS.map.*`, `TEXTS.panel.*`, `TEXTS.theme.*`). **Non è la stessa meccanica di it.json/en.json di CyberCadungeon**: va adattata. Le chiavi sono: `map.homeButton`, `map.homeButtonTitle`, `map.mapLabel`, `map.controls.*` (5 chiavi MapLibre sopra), `theme.switchToLight`, `theme.switchToCyberpunk`, `panel.close`, `panel.placeholderKind`, `app.title`. `map.attributionPrefix` è definita ma **non usata**. Nota: `LABEL_LANGUAGE` (lingua delle etichette cartografiche) è una costante separata e fissa su `'it'`; non segue la lingua dell'interfaccia. Cambiarla a runtime richiede di ricostruire lo stile (non provato).

---

## 6. Trappole incontrate

Premessa onesta: il repo non ha storia (nessun git), quindi qui separo ciò che il repo **documenta come problema vissuto** (README/commenti) da ciò che **deduco dal codice**.

### Documentate nel repo [REPO]
1. **`build.protomaps.com` non manda CORS.** Usato come `PMTILES_URL`, il browser blocca la lettura e la mappa resta vuota (nessun errore evidente a schermo). Usarlo solo con `pmtiles extract` da terminale.
2. **Il vecchio demo `demo-bucket.protomaps.com/v4.pmtiles` non esiste più.** Molti esempi online lo citano ancora.
3. **Il worker di MapLibre 6 è un file separato** (`maplibre-gl-worker.mjs`). Due pezzi vanno d'accordo o la mappa non si disegna:
   - `angular.json` → `build.options.assets` copia `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` nella radice del sito:
     ```json
     { "glob": "maplibre-gl-worker.mjs", "input": "node_modules/maplibre-gl/dist", "output": "/" }
     ```
   - il componente chiama `setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href)` prima di creare la mappa.
   Se un giorno la mappa non appare, **controllare per prima cosa questo** (indicazione del README di origine). Il `<base href>` conta: l'URL è risolto rispetto a `document.baseURI`. Se il progetto di destinazione serve l'app in una sottocartella o usa un `base href` diverso, verificare che il file sia raggiungibile a quell'indirizzo.
4. **Budget di build:** MapLibre (~1 MB) fa scattare il warning di default di Angular; budget alzati a 2 MB/4 MB (sezione 1).
5. **Il file del pianeta è ~135 GB** e non aggiornato ogni giorno: va bene per provare, non per produzione.

### Dedotte dal codice [DEDOTTO]
6. **`setStyle` cancella i layer dei segnalini.** Per questo si ricreano su `style.load`, non sul solo avvio. Aggiungerli solo una volta li fa sparire al primo cambio tema. È anche per questo che si usa `diff: false`.
7. **Ordine dei layer:** il contorno edifici va dopo `'buildings'`; se l'id del layer di Protomaps cambiasse in una versione futura di `@protomaps/basemaps`, il codice lo mette in coda (sopra strade e label) senza errore. Rivedere l'aspetto se si aggiorna la libreria.
8. **`noPropertyAccessFromIndexSignature` è attivo**: per questo si scrive `properties?.['id']` e l'oggetto `controls` è castato a `Record<string, string>`. Altrimenti non compila.
9. **Flavor incompleto:** bisogna partire da `...namedFlavor('dark')`; un `Flavor` parziale non compila o lascia campi `undefined`.
10. **Lo sprite deve seguire il tema** (`dark`/`light`), altrimenti icone illeggibili.
11. **Variabili CSS accoppiate:** il pulsante "home" (`world-map.css`) e il pannello leggono `--ui-*` che le imposta il **componente genitore**. Usati da soli, i pulsanti non hanno colori (`var()` vuote).
12. **Pulsanti sopra la mappa:** posizioni fisse in pixel (`top: 84px` per sotto i controlli di zoom, `bottom: 28px` per il tema sopra l'attribuzione). Se cambiano i controlli o il layout, si sovrappongono.
13. **`removeProtocol('pmtiles')` alla distruzione:** se nel progetto di destinazione un'altra parte registrasse lo stesso protocollo, la distruzione della mappa lo toglierebbe a tutti.

---

## 7. Da decidere / non testato

Tutto quanto segue è **non verificato**:

1. **Hosting del file PMTiles in produzione.** Requisiti noti: richieste **HTTP Range** e **CORS** per l'origine dell'app. Opzioni citate nel README (nessuna provata): Cloudflare R2, S3 + CloudFront, Google Cloud Storage, Firebase Storage, nginx proprio.
2. **Costi e traffico.** Mai stimati: dipendono dall'hosting scelto, dalla dimensione del file (area estratta, `--maxzoom`) e dagli utenti. Il file del pianeta non è un'opzione di produzione.
3. **Area da coprire.** Genova/Liguria/Italia o mondo? Il file di test punta sul pianeta ma la vista iniziale è su Genova. Cambia dimensione del file e costi.
4. **Aggiornamento dei dati OSM** (frequenza, chi rigenera il file).
5. **Font e sprite** su hosting proprio (oggi dipendono da `protomaps.github.io`; se è giù, le etichette spariscono).
6. **Prestazioni su telefono:** mai misurate. Dubbi: contorno edifici a zoom ≥ 14 e molti layer di Protomaps su GPU deboli; tile letti con molte richieste Range; ricreazione completa dello stile al cambio tema.
7. **Comportamento reale dopo cambio tema:** i listener `click` sui layer dei segnalini sono registrati una volta sola alla creazione (per id di layer) e il codice conta sul fatto che sopravvivano a `setStyle` + ricreazione dei layer. Non ho una prova (nessun test): **da verificare a mano** (cambia tema, poi clicca un segnalino).
8. **Resize del contenitore** (sezione 4): non gestito esplicitamente.
9. **Accessibilità:** il contenitore ha `role="application"` e `aria-label`; i segnalini nel canvas non sono raggiungibili da tastiera. Non affrontato.
10. **SSR:** la creazione è in `afterNextRender`, quindi in teoria è sicura, ma il progetto di origine non usa SSR e non è stato provato.
11. **Più segnalini:** sovrapposizioni, clustering, caricamento da servizio remoto: non affrontati.
12. **Tema chiaro:** non disegnato, solo placeholder del tema ufficiale.
13. **Lingua delle etichette della mappa legata alla lingua dell'interfaccia (it/en):** non implementato.
14. **Nessun test automatico** esiste per questi componenti.

---

## File riutilizzabili

Percorsi relativi alla radice del repo di origine (`cyberpunk-world-map/`).

### Copiabili così come sono
| File | Nota |
|---|---|
| `src/app/map/map-marker.ts` | Interfaccia `MapMarker` (5 campi) |
| `src/app/map/map-theme.ts` | Tema e palette; dipende solo da `@protomaps/basemaps`. Il tema `light` è un segnaposto |
| `src/app/map/map-style.ts` | Costruisce lo stile; dipende da `map-config.ts` e `map-theme.ts` |
| `src/app/info-panel/info-panel.ts`, `.html`, `.css` | Il pannello non conosce la mappa. Il `.ts` importa `TEXTS`, quindi **richiede l'adattamento dei testi** (vedi sotto) |

### Da adattare
| File | Cosa adattare |
|---|---|
| `src/app/config/map-config.ts` | `PMTILES_URL` (dev → file proprio), vista iniziale (`GENOA_VIEW`), `LABEL_LANGUAGE`, opzionalmente `GLYPHS_URL`/`SPRITE_BASE_URL` |
| `src/app/map/world-map.ts` | Importa `TEXTS` (sostituire con il meccanismo i18n del progetto), `GENOA_VIEW`; i raggi dei segnalini sono costanti nel codice |
| `src/app/map/world-map.html`, `world-map.css` | Testi dal sistema i18n; colori da `--ui-*` (vedi trappola 11) e posizioni fisse in pixel |
| `src/app/i18n/texts.ts` | Chiavi da trasferire nei file di traduzione it/en e da tradurre in inglese (compresi i 5 testi di `controls`) |
| `src/app/app.ts`, `app.html`, `app.css` | **Solo come esempio** del collegamento: signal `selectedMarker`, `[style.--ui-*]` dal tema, toggle del tema |
| `src/styles.css` | Solo due cose: l'`@import` del CSS di MapLibre e le regole `.maplibregl-ctrl-attrib` |
| `angular.json` | Solo la voce `assets` per `maplibre-gl-worker.mjs` e i budget `initial` (2MB/4MB) |
| `package.json` | Aggiungere `maplibre-gl@6.16.0`, `pmtiles@4.5.0`, `@protomaps/basemaps@5.7.2` |
| `src/app/data/markers.json` | Dati finti di Genova: da sostituire con i dati veri |

### Da NON portare
| File / cartella | Motivo |
|---|---|
| `src/app/app.config.ts`, `src/main.ts`, `src/index.html` | Boilerplate Angular; il progetto di destinazione ha i suoi |
| `public/favicon.ico` | Icona di default |
| `dist/`, `.angular/`, `node_modules/` | Artefatti |
| `README.md` | Descrive il progetto di origine (resta utile come lettura, specie la parte sul comando `pmtiles extract`) |
| `.vscode/`, `.editorconfig`, `.prettierrc`, `tsconfig*.json` | Configurazione dell'ambiente di origine. Unica nota: in `tsconfig.json` servono `resolveJsonModule` (se si importa il JSON dei segnalini) e vanno tenute in conto le opzioni `strict` e `noPropertyAccessFromIndexSignature` (trappola 8) |
| Dipendenze `vitest`, `jsdom`, `rxjs` | Non usate dalla mappa |
