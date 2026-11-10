# CyberCadungeon

Dungeon crawler a squadra su griglia, per browser, a tema cyberpunk: una squadra di 3 **Mercenari** contro un **Avversario** (il ruolo che nel vecchio progetto era il "Maligno": umano o automatico; l'ambientazione lo chiama Megacorp).
Il motore deriva da CADungeon (gioco fantasy, ora archiviato). Nomi, mostri, oggetti, testi e avventure sono provvisori e originali: niente materiale del gioco da tavolo che lo ispirava.
Il vecchio `CLAUDE.md` (regole di gioco, editor nel dettaglio, catalogo di funzioni) è in `docs/legacy/CLAUDE-cadungeon.md`; le regole del gioco originale in `docs/legacy/REGOLE.md`. Sono solo fonte, non vincolanti.

## Come lavoriamo
- Vibe coding: spiega le scelte in modo semplice, senza troppo gergo.
- Prima di scrivere codice per una funzione nuova, descrivi in due righe cosa farai.
- Cambiamenti piccoli e verificabili: dopo ogni passo il gioco resta avviabile (`/play/test` si carica) e `npm run build` passa.
- Se una decisione cambia l'architettura e non è qui, chiedi prima. Il motore (`src/app/game`, `editor`, `lobby`) non si tocca se non è indispensabile.
- Non avviare dev server né comandi long-running (`ng serve`, `npm start`…): se serve verificare, chiedi all'utente.
- Nomi nel codice (variabili, funzioni, campi, classi CSS, file, chiavi di traduzione a nome) **in inglese**; si traduce solo ciò che l'utente legge, e l'interfaccia è **in italiano** (con l'inglese accanto, vedi Multilingua). Termini da gioco, non da informatici.

## Stack
- Angular (ultima stabile), componenti standalone e signals.
- PixiJS per la scena di gioco e dell'editor, avviato fuori da NgZone (`runOutsideAngular`).
- PeerJS per ciò che è veloce ed effimero (puntatori, pedine in movimento, anteprime). Server pubblico in sviluppo; in produzione serviranno PeerServer e TURN propri.
- Firebase: il progetto esiste, ma per ora **né Auth né Hosting**. Firestore solo per ciò che deve restare (avventure, mappe, eroi, salvataggi), sempre dietro un'interfaccia: oggi la persistenza è in memoria/localStorage (`game/save-store.ts`, `editor/draft-store.ts`).

## Multilingua
- Ogni nuovo testo dell'interfaccia (etichette, suggerimenti, `aria-label`, notifiche, errori, titoli di dialog) va in **tutti e due** `src/app/i18n/it.json` ed `en.json`, con la stessa chiave. Mai testi scritti a mano nei template o nel codice. Una chiave mancante in `en.json` o sbagliata nel pipe non compila.
- Due modi: **chiavi a nome** (`home.newGame`, pipe `t` o `translate('chiave')`, in inglese, per le schermate) e **italiano come chiave** (`tr('Testo {nome}', { nome })` o pipe `tr`, per messaggi di regole e partita; la chiave è ricavata dal testo con `catalogKey`, quindi cambiare una parola vuole la riga nuova in entrambi i file).
- Dopo ogni modifica ai testi: `npm run i18n:check` (controlla che ogni testo passato a `tr` abbia la riga in entrambi i file).
- Si traduce al momento dell'uso, mai in costanti di modulo (usa getter). Plurali = frasi diverse, niente suffissi a mano; numeri e nomi con segnaposto.
- Cataloghi (Mercenari, mostri, oggetti, abilità, Carte dell'Avversario) restano in italiano in `public/`, perché è anche ciò che legge il motore ("Perforare 2"…): si traducono solo in visualizzazione. Nomi con chiavi `item.<id>`, `skill.<id>`, `monster.<id>`, `adversary.<id>`; altri testi con la chiave di `catalogKey` e il pipe `ct`. Ogni voce nuova nei cataloghi vuole la sua traduzione.
- Dettagli del meccanismo: `i18n/` (`i18n.service.ts`, `catalog-text.ts`). Lingua scelta in `localStorage` (`cad-lang`), poi lingua del browser, poi italiano.

## Architettura di rete
- Un giocatore è l'host e ha lo stato autoritativo; gli altri mandano intenzioni, l'host le valida e rimanda lo stato.
- Il contenuto delle stanze non scoperte resta sull'host e arriva ai giocatori solo quando la stanza si rivela.
- PeerJS: effimero. Firestore: risultato di un turno, checkpoint, eroi, avventure; poche scritture per turno, mai decine al secondo.
- Lobby (`src/app/lobby`): `LobbyHost` (stato autoritativo) e `LobbyClient`, codice partita unico con `claimCode`. Il gioco in rete vero e proprio non c'è ancora.
- La Megacorp è un ruolo, non una persona: stesse azioni per script e per umano.

## Mappa e tile
- Una sola unità: la **cella**, 64 px ovunque (SVG compresi).
- **Tile**: JSON in `public/tiles/` con dimensione in celle, forma (rettangolo `size` o unione `rects`) e aperture (lato, posizione, larghezza 2). Rotazione a scatti di 90°; due tile si agganciano se hanno aperture che si guardano. Pavimento, muri e fratture si disegnano da codice. Un'apertura senza vicino è muro; i punti morti (`deadEnd`) chiudono le uscite libere.
- **Mappa**: elenco di tile con posizione e rotazione + `seed` per i dettagli generati (`public/maps/`; `test.json` è la mappa di prova, `catalog.json` mostra tutti i tile). È anche il formato di salvataggio ed esportazione dell'editor (`MapData`, `game/map/map-data.ts`).
- **Dati dell'avventura, non dei tile**: porte (`doors`: lato di cella, aperta/chiusa, serratura `lock`), ostacoli (`obstacles`: roccia, buca, acqua), muri d'autore (`walls`), segnalini (`markers`: glifi, scale, scrigni, oggetti a terra, incontri), pedine (`pieces`), aree (`areas[].cells`), torce, eventi (`events`, `variables`), zone. Un eroe o mostro si richiama dal catalogo con `mercenary`/`monster` e i campi scritti sulla pedina lo sostituiscono.
- Geometria dei muri a segmenti: serve per movimento e linea di vista. Si scoprono gli elementi singoli, non le stanze.
- Torce, scale, barili, bauli non sono proprietà del tile: tile neutri e riutilizzabili.

## Stile visivo
- Mappa come disegno tecnico / blueprint su tavola luminosa: sfondo scuro con puntini radi, linee sottili, toni di grigio neutro, pochi elementi colorati (solo ciò che è interattivo o vivo).
- Misure in `game/constants.ts`; colori, opacità e spessori sono **token per ruolo** in `game/theme.ts` (un colore = un significato). Mai valori scritti a mano nel rendering. Interfaccia: token CSS in `src/styles/tokens.css`.
- Livelli di disegno dal basso: fondo del tile, pavimento, dettagli scenici, oggetti, muri, luce/ombra. Gli SVG diventano texture una volta sola.
- Interfaccia in HTML (componenti in `src/app/ui/`) sopra il canvas Pixi: contenitori scuri a spigoli secchi (`--radius-1`), icone Material Symbols in `public/icons/` (file SVG, mai font).
- Guida completa: `docs/style-guide.md`, `docs/PIANO-DESIGN.md`.

## Dove guardare
- **Griglia, movimento, vista**: `game/board/` (`board.ts` è il cuore: muri, porte, ostacoli, `canStep`, linea di vista in `sight.ts`).
- **Mappa e disegno**: `game/map/` (tile, snap, muri, etichette delle aree), `game/pieces/`, `game/markers/`, `game/obstacles/`, `game/doors/`, `game/veil-view.ts`.
- **Stato e regole di partita**: `game/state/` (`game-state.ts`, `actions.ts`, `combat.ts`, `status.ts`, `effects.ts`); scena Pixi e HUD in `game/game-scene.component.ts`.
- **Eventi dell'avventura**: `game/state/events.ts` (+ tipi in `game/map/map-data.ts`); l'Avversario in `game/state/adversary.ts`, `adversary-deck.ts`, `game/adversary/`.
- **Editor**: `src/app/editor/` (`editor.component.ts`, `tile-editor.ts` senza interfaccia, `validator.ts` per la Verifica, `map-camera.ts`). Esiste un editor completo con strumenti per tessere, porte, ostacoli, oggetti, nemici, aree, glifi ed eventi; i dettagli sono nel legacy.
- **Cataloghi**: `public/{mercenaries,monsters,items,skills,adversary,shops}/`, caricati da `game/{mercenaries,monsters,items,skills,adversary}/`. Squadra predefinita in `game/mercenaries/mercenary-sheet.ts` (`DEFAULT_PARTY`).
- **Salvataggi**: `game/save-store.ts` (`SaveStore`, una partita per avventura); bozza dell'editor in `editor/draft-store.ts`.
- **Interfaccia**: `src/app/ui/`, pagine in `app.routes.ts` (`/`, `/adventures`, `/party/:map`, `/lobby/:code`, `/play/:map`, `/adversary/:map`, `/editor`).

## Glossario (nomi decisi)
Regole complete in `docs/REGOLE-v2.md` §1 e piano dei lavori in `docs/TODO-v2.md`. La rinomina nel codice e nei dati (TODO L1.9) è completata: non restano alias dei nomi vecchi.
- **Avversario**: il ruolo opposto (era "Maligno"/"Megacorp"; nel codice `adversary`, `state.adversary`, rotta `/adversary/:map`).
- **Allarme**: la sua risorsa (era "Odio"; nel codice `alarm`, `{alarm:N}`, `--c-alarm`).
- **Mercenari**: i 3 personaggi della squadra (erano "Eroi"; nel codice `mercenary`, cartelle `mercenaries/`). Li modella l'utente: `bastion`, `vesper`, `halo` sono solo di test e si ignorano.
- **Picchiatore** (mischia), **Artigliere** (distanza), **Incursore** (Intrusione, ramo `hacking`): i tre archetipi.
- **Intrusione**: attacco dell'Incursore (nei dati `intrusion`; il ramo abilità è `hacking`, "Hacking").
- **Overclock**: la risorsa di fatica (era "Energia"/"Fatica"; nel codice `overclock`, `{overclock:N}`).
- **Fama**: nome della risorsa condivisa (era "Conquista"; nel codice ancora `progress`).
- **Cassa**: era "scrigno"/"baule" (nei testi; in inglese "chest"). **Terminale**: era "glifo" (testi: it "terminale", en "terminal"; nel codice ancora `glyph`). **Mazzo Avversario / Carte dell'Avversario**: era "Mazzo/Carte del Male".
- **Restano com'erano**: "città" e "dadi competenza" (decisione presa).
- **Da rinominare ancora**: "runa/chiave runica", "scintille", "Tempio/Campo di addestramento"; famigli (tolti); segnalino "Incontro"; "Briefing" e Megacorp ancora da decidere. Le chiavi e i nomi nel codice (`glyph`, `progress`…) cambiano a passi piccoli: ogni nuova chiave sostituisce per intero la vecchia, senza alias.

## Fuori scope per ora
Mappa del mondo, missioni geolocalizzate, eroi collezionabili, monetizzazione; inoltre Auth e Hosting di Firebase, famigli, gioco in rete completo.
