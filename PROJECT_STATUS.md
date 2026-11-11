# CyberCadungeon — stato del progetto

> **Nota 2026-11-11**: questa fotografia è precedente alle rinomine (TODO L1.9, `monster`→`enemy`, `hero`→`mercenary`, `evil`→`adversary`) e a parte della pulizia; i nomi di cartelle, i 9 nemici e i cataloghi qui sotto possono essere indietro. Per i nomi vale `CLAUDE.md` (glossario) e per il design in corso `docs/DESIGN-MOD-CONTRATTI.md`.

Documento di contesto per chi non vede il codice. Fotografia presa leggendo il repository (non ho eseguito build né test: non so se `npm run build` passa adesso).

## 1. Obiettivo e relazione con CADungeon

- Dungeon crawler a squadra, su griglia, nel browser, a tema cyberpunk: **3 Mercenari contro un Avversario** (la Megacorp dell'ambientazione; ruolo umano o automatico/script).
- Deriva da **CADungeon** (gioco fantasy, ora archiviato): il motore è stato copiato e adattato.
- **Condiviso con CADungeon** (motore, sostanzialmente invariato):
  - griglia, movimento, linea di vista, porte, ostacoli;
  - regole di partita (combattimento, stati, abilità, oggetti, scrigni, eventi d'avventura);
  - mazzo/IA del "Maligno" (oggi Megacorp), lobby, editor di mappe e avventure, sistema i18n.
- **Nuovo in CyberCadungeon**:
  - tema visivo (blueprint su tavola luminosa, token in `game/theme.ts` e `styles/tokens.css`);
  - login finto, **mappa del mondo** come home (MapLibre + Protomaps, tema cyberpunk, geolocalizzazione);
  - 3 eroi, 4 mostri e cataloghi provvisori e originali (niente materiale del gioco da tavolo che ispirava CADungeon);
  - glossario rinominato in interfaccia (Maligno → Megacorp, Odio → Allarme, ecc.).
- I nomi nel codice e nei dati sono quelli nuovi (`adversary`, `alarm`, `intrusion`, `mercenary`, `overclock`); restano da aggiornare alcuni testi visibili (TODO L0.2).
- Il vecchio materiale (regole, schede, avventure fantasy, immagini) sta in `docs/legacy/`: solo fonte, non vincolante.

## 2. Stack e struttura

**Stack**
- Angular 22 (standalone, signals), TypeScript 6, build con `@angular/build`.
- PixiJS 8 per la scena di gioco e l'editor (avviato fuori da NgZone).
- MapLibre GL 6 + `pmtiles` + `@protomaps/basemaps` per la mappa del mondo.
- PeerJS per la lobby (effimero). `@3d-dice/dice-box` per i dadi 3D.
- Firebase: progetto esistente ma **né Auth né Hosting**; nessun uso di Firestore nel codice letto.
- ~36k righe di TypeScript in `src/`.

**Cartelle**
- `src/app/game/` — motore: `board/`, `state/`, `map/`, `pieces/`, `markers/`, `doors/`, `obstacles/`, `adversary/`, `mercenaries/`, `items/`, `monsters/`, `skills/`, `dice/`, `torches/`, `familiars/` (residuo), più `game-scene.component.ts` (scena Pixi + HUD).
- `src/app/editor/` — editor completo (tessere, porte, ostacoli, oggetti, nemici, aree, zone, eventi, verifica).
- `src/app/lobby/` — lobby PeerJS. `src/app/auth/` — login finto. `src/app/world-map/` — mappa del mondo. `src/app/adventures/` — scelta avventura e squadra.
- `src/app/ui/` — componenti HTML sopra il canvas. `src/app/i18n/` — traduzioni (`it.json`, `en.json`, pipe `t`, `tr`, `ct`).
- `public/` — dati: `tiles/`, `maps/`, `mercenaries/`, `monsters/`, `items/`, `skills/`, `adversary/`, `shops/`, `icons/` (SVG), `characters/`, `mobs/`, `dice/`.
- `docs/` — `style-guide.md`, `PIANO-DESIGN.md`, `PIANO-CHIAVI-I18N.md`, `legacy/`.
- `scripts/i18n-check.mjs` — controlla che ogni testo `tr()` abbia la riga in entrambe le lingue (`npm run i18n:check`).

**Rotte** (`app.routes.ts`, tutte lazy; tutte dietro `authGuard` tranne `/login`)
- `/login`, `/` (mappa del mondo), `/adventures`, `/party/:map`, `/lobby/:code`, `/editor`, `/play/:map`, `/adversary/:map` (stessa scena vista dalla Megacorp, per sviluppo; `?party=a,b,…`).

## 3. Architettura del motore

Principio: **stato = dati puri** (`GameState`), regole = funzioni che lo modificano, Pixi = solo disegno che lo legge.

- **`game/board/`** — `Board`: muri a segmenti, porte, ostacoli → `canStep`, raggiungibilità, linea di vista (`sight.ts`). Non conosce le pedine.
- **`game/state/`** — le regole (~30 file): `game-state.ts` (stato), `actions.ts` (porte, scrigni, passi, esplorazione), `combat.ts`, `status.ts` (burn/web/stun/poison), `effects.ts`, `activation.ts`, `events.ts` (eventi d'avventura), `adversary.ts` + `adversary-deck.ts` (Megacorp), `setup.ts` (preparazione pre-partita), `loot.ts`, `traps.ts`, `vigilance.ts`, `reactions.ts`.
- **`game/map/`** — tile, snap, muri, aree, disegno del pavimento. `map-data.ts` definisce il formato mappa/avventura.
- **`game/pieces|markers|doors|obstacles|torches/`** — viste Pixi + regole locali di ogni elemento.
- **`game-scene.component.ts`** — orchestratore: carica mappa e cataloghi, costruisce `Board` e `GameState`, collega input → regole → ridisegno, ospita l'HUD (`ui/`).
- **Comunicazione**: la scena chiama le funzioni di regole passando `(state, board, piece, …)`; le regole restituiscono esiti (`StepOutcome`, `DoorResult`, `ChestResult`…) che la scena traduce in animazioni/dialog. Nessun bus di eventi: chiamate dirette + signals per l'HUD.
- **Casualità**: `GameState.random()` (mulberry32, `rngState` nello stato) → l'host decide ogni estrazione, partite ripetibili.
- **Megacorp**: ruolo, non persona. Stesse azioni per script (`state/adversary.ts`: `planMonsterMove`, `chooseMonsterTarget`…) e per umano (`/adversary/:map`, flag `adversaryManual`).
- **Nebbia/scoperta**: `Exploration` + `veil-view.ts`: si scoprono gli elementi singoli, non le stanze.
- **Rete (progettata)**: host autoritativo, i client mandano intenzioni; il contenuto delle stanze non scoperte resta sull'host.

## 4. Modelli dati principali

- **`GameState`** (`state/game-state.ts`): `round`, `phase: 'mercenaries'|'adversary'`, `progress` ("Conquista", contatore comunitario: a 0 gli eroi perdono), `status`, `activeId`, cataloghi (`items`, `skills`, `monsters`, `adversaryCards`), mazzi (tesori, abilità), `adversary: EvilState {deck, hand, discard, inPlay, traps, alarm}`, `walls`, `events`, `zones`, `rngState`, `objective`, `setup`. Costruttore: `(seed, doors, obstacles, markers, pieces, party, exploration, activeId?)`. Serializzato come `GameSnapshot`.
- **`Piece`** (`pieces/piece.ts`): eroe o mostro (`team: 'mercenary'|'monster'`): `cell`, `size`, `speed/points/attacks`, `action` (`advance|run|fight|prepare`), `wounds/maxWounds`, `armor`, `overclock`, `value`, `coins`, `equipped/backpack`, `skills`, `status`, `city`. `PieceData` è la forma salvata nella mappa.
- **`MapData`** (`map/map-data.ts`): formato mappa **e** avventura:
  ```ts
  { seed, tiles: MapTileRef[{tile,x,y,rot,area?}], areas?, doors?, obstacles?, walls?,
    markers?, pieces?, zones?, torches?, events?, variables?, objective?, title?, intro?,
    rules?, setup?, chestTable?, itemMods?, behaviors?, party?, progress?, start? }
  ```
- **Eventi**: `AdventureEvent {when, orWhen?, once?, if?, then, else?}`; trigger (`defeated`, `chestOpened`, `areaRevealed`, `interact`, `zoneEntered`, `adversaryTurnEnd`…) ed effetti (`message`, `progress`, `check`, `openDoor`, `enterPiece`, `win`…) sono unioni discriminate. Le variabili sono interruttori on/off.
- **Tile** (`public/tiles/*.json`, tipo `TileDef`): dimensione in celle, forma (`size` o `rects`), aperture (lato, posizione, larghezza 2). Rotazione a scatti di 90°; due tile si agganciano se le aperture si guardano. Pavimento/muri disegnati da codice. 11 tile oggi (corridoi, croce, T, gomito, vicolo cieco, stanze 4x4…8x8).
- **Unità**: la cella, 64 px (`CELL_SIZE`).
- **Cataloghi** (JSON in `public/`, testi in italiano perché li legge anche il motore, tradotti solo in visualizzazione): eroi (`bastion`, `vesper`, `halo`), mostri (`corp-guard`, `rogue-netrunner`, `sentry-drone`, `war-mech`), oggetti, abilità, Carte della Megacorp, negozio.
- **Persistenza** (dietro interfaccia): `SaveStore` → `GameSave {version, map, savedAt, auto, snapshot}` (`LocalSaveStore`, localStorage `cad-save:<map>`); `DraftStore` per l'editor; `LobbyStore` (`LocalLobbyStore`); `AuthBackend` (`FakeAuthBackend`).

## 5. Cosa è implementato e cosa è abbozzato

**Funzionante (ereditato e adattato)**
- Motore di partita completo: movimento a punti, porte/serrature, ostacoli, scrigni e tesori, combattimento con dadi, stati, abilità, oggetti e livelli, trappole, vigilanza, imboscate, knockback, città/negozio, salvataggio/ripresa.
- Megacorp automatica (script + mazzo di carte + Allarme) e interfaccia manuale in `/adversary/:map`.
- Editor completo con validatore e import/export; HUD e dialog; i18n it/en con controllo automatico.

**Fake login** (`auth/`)
- Unico utente `test`/`test`; sessione in `localStorage` (`cad-auth-user`). `AuthService` espone `user` (signal), `login`, `logout`; `authGuard`/`guestGuard` proteggono le rotte.
- Sostituibile con Firebase Auth cambiando solo `AuthBackend`.

**Mappa del mondo** (`world-map/`, home `/`) — *c'è, nonostante CLAUDE.md la metta "fuori scope"*
- MapLibre su file PMTiles pubblico, tema cyberpunk (`map-theme.ts`), filtri a gruppi, vista 3D con rilievo, bussola/zoom, posizione utente con consenso (`LocationService`: GPS + bussola, nessuna cronologia né invio).
- Vista iniziale fissa su Genova (`START_VIEW`). **Nessun collegamento ancora tra posizione e missioni/avventure.**

**Lobby** (`lobby/`)
- Codice partita (4–8 caratteri), `LobbyHost`/`LobbyClient` su PeerJS, `claimCode`, scelta eroi (1 giocatore → 2 eroi; da 3 persone → 1 a testa), acquisti pre-partita, "pronto". Il tasto "Unisciti" nella dialog è ancora spento.
- **Il gioco in rete vero e proprio non esiste**: la partita gira in locale.

**Abbozzato / vuoto**
- `ADVENTURES` in `adventures/adventures.ts` è **vuoto**: l'unica mappa giocabile è `public/maps/test.json` (`/play/test`). Le avventure fantasy originali sono in `docs/legacy/maps/` e non sono adattate.
- Contenuti: 3 eroi, 4 mostri; nomi, testi e bilanciamento provvisori (ruoli Picchiatore/Artigliere/Spettro "da confermare").
- Immagini/token ancora in parte legacy (`public/tokens/` con rune, chiavi, ecc.).

## 6. Limiti noti, debito tecnico, decisioni prese

**Decisioni prese**
- Host autoritativo; PeerJS solo per l'effimero; Firestore solo per ciò che deve restare, con poche scritture per turno.
- La persistenza sta sempre dietro un'interfaccia (oggi memoria/localStorage).
- Il motore (`game`, `editor`, `lobby`) non si tocca se non indispensabile.
- Nomi nel codice in inglese; interfaccia italiana + inglese, mai testi a mano nei template; i cataloghi restano in italiano e si traducono in visualizzazione.
- Colori/misure solo da token (`theme.ts`, `tokens.css`, `constants.ts`); icone SVG in `public/icons/`, mai font.
- Vibe coding: cambiamenti piccoli, gioco sempre avviabile, nessun dev server lanciato dall'assistente.

**Debito / limiti**
- **Nomenclatura doppia**: nomi decisi Avversario/Allarme/Intrusione/Mercenari/Overclock (vedi glossario in `CLAUDE.md`); dati e codice rinominati (`adversary/alarm/intrusion/mercenary/overclock`, TODO L1.9 completata); i **testi visibili** sono allineati (L0.2: Avversario, Allarme, mercenario, Fama, cassa, terminale, Mazzo Avversario). Lista "da rinominare" in `CLAUDE.md` (runa, scintille, Tempio, famigli, Briefing, Megacorp; chiavi di codice `glyph`/`progress`).
- **Residui fantasy**: `familiars/`, `state/familiar*.ts`, `city.ts`, `telekinesis.ts` ancora nel codice benché i famigli siano "tolti".
- **`game-scene.component.ts` e `game-state.ts` sono molto grandi** (monoliti): rischio di accoppiamento.
- **Mappa del mondo**: tile e quote da server pubblici (`data.source.coop`, AWS Terrain) **solo per sviluppo**; in produzione servono file propri con Range e CORS.
- **PeerJS**: server pubblico in sviluppo; in produzione servono PeerServer e TURN propri.
- **Auth finta**: password in chiaro nel codice, nessuna identità reale.
- **Salvataggi** solo in localStorage: una partita per avventura, niente cloud, quota limitata.
- **Nessun test automatico visibile** (script `ng test` presente, ma non ho trovato spec); verifica = build + `i18n:check` + prova a mano.
- Contratto dati dell'editor/partita (`MapData`, `GameSnapshot`) non ha versioning se non `GameSave.version: 1`.

## 7. Punti di estensione previsti

- **Missioni geolocalizzate**: la mappa del mondo ha già posizione utente, consenso e stile; manca tutto il resto. Probabile strada: luoghi/missioni come dati (con coordinate) mostrati come marker su `WorldMapComponent`, che aprono `/party/:map` → `/play/:map`, e `AdventureCard` (oggi vuoto) come ponte. Serve una decisione di architettura (dove vivono i dati: Firestore dietro interfaccia).
- **Eroi**: schede JSON in `public/mercenaries/` (`index.json` + una per eroe) caricate da `mercenaries/`; la squadra predefinita è `DEFAULT_PARTY`. Eroi persistenti/collezionabili sono fuori scope per ora; l'interfaccia `SaveStore` è il punto dove agganciare eroi salvati.
- **Fixer**: **non c'è ancora nulla nel codice** (nessun riferimento trovato). Da definire cosa sia (PNG/ruolo/negozio/mediatore di missioni?). Candidati naturali: il ruolo "città/negozio" (`state/city.ts`, `shops/`, `ui/city-panel`) o un nuovo tipo di segnalino/evento (`encounter`, `zone`, `interact`).
- **Rete**: completare gioco in rete su `LobbyHost` (stato autoritativo) / `LobbyClient` (intenzioni), con filtro delle parti non scoperte.
- **Backend**: Firebase Auth al posto di `FakeAuthBackend`; Firestore al posto di `LocalSaveStore`/`LocalLobbyStore`/`DraftStore` (avventure, mappe, eroi, checkpoint).
- **Contenuti**: nuove avventure con l'editor → `public/maps/` + voce in `ADVENTURES`; nuove voci nei cataloghi richiedono traduzione (`item.<id>`, `skill.<id>`, `monster.<id>`, `adversary.<id>`).
- **Temi**: `MapTheme` della mappa del mondo e token di interfaccia sono già strutturati per più temi.

## Note per chi continua

- Prima di proporre codice per una funzione nuova, descriverla in due righe; cambiamenti piccoli e verificabili.
- Se una scelta cambia l'architettura e non è in `CLAUDE.md`, chiedere prima.
- Non assumere che `CLAUDE.md` sia aggiornato su tutto: ad esempio la mappa del mondo è descritta come fuori scope ma esiste ed è la home.
