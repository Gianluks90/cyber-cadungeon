# Piano del prototipo: contratti sulla mappa + Briefing con mod

Brief per Claude Code. Leggi prima `CLAUDE.md` e `docs/DESIGN-MOD-CONTRATTI.md` (fa fede solo «Deciso»).
Un passo alla volta, con due righe di descrizione prima del codice, `npm run build` e `npm run i18n:check` verdi, niente dev server. Ogni passo = un commit.
I percorsi sono stati controllati nel codice il 12 novembre 2026; se qualcosa è cambiato, vale il codice.

## Decisioni da rispettare

- **Tre livelli**
  - *Contratto* (intestazione): `id`, `number`, `title`, `caption` (didascalia breve), `mapId`, coordinate, `visibility` (`visible`|`hidden`), `fixer` (segnaposto). Pubblico e leggero.
  - *Missione*: `MapData` (**invariato**, salvo il budget, vedi passo 2): mappa, pedine, eventi, ricompense, introduzione, obiettivo, profili dei nemici. Si legge solo dopo lo sblocco.
  - *Stato del giocatore*: sbloccato, tentativi, miglior Fama. Locale ora (dietro un'interfaccia), Firestore poi.
- **Sincronizzazione a senso unico**: il `title` della missione è la fonte; il titolo dell'intestazione è una copia (per ora scritta a mano, poi rigenerata dallo strumento «Posiziona», rimandato). La `caption` appartiene all'intestazione. Nell'intestazione il titolo è sola lettura.
- **Sblocco a 50 m** (costante in `game/constants.ts`), contando la precisione del GPS: sblocca quando `distanza − precisione ≤ 50`. La posizione non lascia mai il dispositivo.
- **Stati**: *bloccato* (si vedono numero, titolo e la frase «Fuori dal campo di sincronizzazione»), *sbloccato* (titolo, didascalia, tasto Gioca; si gioca da casa). *Nascosto* è solo un campo previsto, non si implementa.
- **Numero** stabile e assegnato una sola volta (collezionabile, #001…). Nessun contatore «x di y» per ora.
- Per ora i contratti sono solo dell'app, con un fixer segnaposto.

## Cosa c'è già (controllato nel codice)
- `adventures/adventures.ts`: `AdventureCard { map?, title? }` e `ADVENTURES = []` (vuoto). `/adventures` è la scelta oggi; `/party/:map` → `/play/:map` è il flusso di preparazione.
- `adventures/party.component.ts` + `ui/pregame-shop-dialog.component.ts` + `game/mercenaries/party-setup.ts` (`loadPregameShop`, `coinsWithSetup`, `partySetupStore`, `drawSkillCards`): è già il «negozio di preparazione» con monete.
- `MapData.setup?: AdventureSetup` (`game/map/map-data.ts`): il posto naturale per il budget del contratto.
- `world-map/location.service.ts`: `position()` è un signal con `lng`, `lat`, `accuracy` (la precisione **c'è già**). `world-map/world-map.component.ts` è la mappa (MapLibre).
- Non esistono ancora `public/contracts/` né `game/contracts/`.

## Passo 1 — Dato contratto
- **Cosa**: tipo `Contract` (intestazione) e `public/contracts/index.json` con una voce che punta a `maps/test`. Un `ContractStore` (interfaccia + implementazione che legge il JSON), come `SaveStore`.
- **Tocca**: nuova cartella `src/app/game/contracts/`, `public/contracts/index.json`; testi del catalogo in italiano, tradotti con `ct`. Non rimuovere `ADVENTURES` senza chiedere: se serve, `/adventures` legge dallo `ContractStore`.
- **Fatto quando**: build verde, lo store restituisce la voce, `MapData` non è cambiato.

## Passo 2 — Briefing del contratto e prototipo delle mod
- **Cosa**: la preparazione (`party.component.ts` + `pregame-shop-dialog.component.ts`) diventa il Briefing: budget letto da `MapData.setup` (campo opzionale, default 300), scelta delle mod negli slot (2 arma, 2 armatura, 2 deck), tasto intel che spende il budget, poi `/play/:map`. Il pescaggio casuale delle abilità (`drawSkillCards`) **cade** (non serve più).
- **Sotto-passi (un commit ciascuno)**:
  1. dati: oggetti base con `slots` + catalogo mod (passive/attive, costo in eurodollari);
  2. interfaccia del Briefing;
  3. effetti passivi in `state/combat.ts`;
  4. effetti attivi con scintille dei dadi neri;
  5. cyberdeck con **Berserk** (+danno, ma riduce Armatura e ICE finché dura; costo in Overclock).
- **Prototipo**: 1 Picchiatore, 3-4 mod (almeno una attiva), 2-3 abilità cyberware, 1-2 nemici. Niente Demoni, nodi, Fixer, Corp. Non usare i nemici col dado giallo finché le facce nuove non ci sono.
- **Fatto quando**: da `/party/test` si sceglie, si spende, si gioca e le mod cambiano davvero il combattimento.

## Passo 3 — Contratti sulla mappa
- **Cosa**: `WorldMapComponent` mostra un marker per contratto (dal `ContractStore`). Al tocco: scheda minima se bloccato, completa se sbloccato (con tasto Gioca verso `/party/<mapId>`).
- **Testi**: chiavi a nome in `it.json` **ed** `en.json` (es. `contract.locked`).
- **Fatto quando**: il contratto di prova si vede in mappa e la scheda cambia con lo stato.

## Passo 4 — Sblocco
- **Cosa**: `UnlockStore` (interfaccia + localStorage) e regola di distanza con `LocationService.position()` (lat, lng, `accuracy`). Distanza calcolata in locale.
- **Solo in sviluppo** (`isDevMode()`): due contratti di prova generati rispetto alla posizione, uno a ~30 m e uno a ~5 km. Non entrano in `index.json` e non si salvano.
- **Verifica**: la fa l'utente sul telefono (non avviare dev server).

## Passo 5 — Resto del prototipo
Quello che manca del §8 del design doc (intel a livelli, scintille, altre abilità).

## Rimandato (non preparare codice)
Strumento «Posiziona» nell'editor, contratti nascosti, contatore, fixer-giocatori, territori delle Corp, moderazione.
