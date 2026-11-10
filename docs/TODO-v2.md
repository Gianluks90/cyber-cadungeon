# TODO v2 — dalle bozze delle nuove regole al codice

Lista dei lavori per portare `docs/REGOLE-v2.md` e `docs/NEMICI.md` nel gioco. **Nessun codice è stato scritto**: i file e le funzioni citati sono stati cercati nel repository (non copiati dai documenti). Dove la bozza e il codice non coincidono, lo dico (vedi sezione A in fondo).

Ordinata per complessità come `docs/legacy/cards/abilities.md`:

- **Livello 0**: solo dati e testi (schede, cataloghi, i18n, glossario)
- **Livello 1**: poche righe di codice
- **Livello 2**: estensione piccola o media di ciò che esiste
- **Livello 3**: stato o regole nuove
- **Livello 4**: grande (nuove entità o sistemi)

**Come leggere una voce**: *Serve* (cosa), *Tocca* (file e funzioni), *Dipende da* (altre voci), *Decisione* (se manca una scelta di design: rimanda alle domande **Q** della sezione C). Le sigle sono `L<livello>.<n>`.

## Decisioni prese (aggiornato dopo le risposte)

- **Q1**: il ruolo si chiama **Avversario** e il terzo archetipo **Incursore** (in interfaccia e nei testi; niente più Megacorp/Spettro come nomi del ruolo).
- **Q2 / Q11**: la squadra è sempre di **3 personaggi**, che si chiamano **Mercenari** (non più Eroi).
- **Q3 / Q4**: i Mercenari li modella l'utente. **Gli eroi attuali (`bastion`, `vesper`, `halo`) sono solo di test e si ignorano**: niente lavoro su di loro, niente archetipo da assegnare a `halo`.
- **Q5**: si rinominano **anche i campi** dei dati (`magic`→`intrusion`, `energy`→`overclock`, ecc.), non solo le etichette. Serve quindi un piano di migrazione (vedi L1.9).
- **Q33**: "Mercenari" vale **anche nel codice**: cartelle e chiavi cambiano (`hero`→`mercenary`, `heroes/`→`mercenaries/`, `team: 'hero'`, chiavi `hero.*`, `public/heroes/`).
- **Q34**: si rinomina anche l'Avversario nel codice: `evil`→`adversary`, `hatred`→`alarm` (cartelle `state/evil*.ts`, `game/evil/`, `public/evil/`, chiavi `evil.*`, rotta `/evil/:map`, token `--c-hatred`).
- **Nome della risorsa Energia/Fatica**: si chiama **Overclock** (etichetta e campo). Sostituisce sia "Energia" sia "Fatica" della bozza; dove la bozza dice "Fatica" leggere "Overclock".
- **Q8**: facce dei dadi **rimandate**: l'utente deve valutare altre cose prima. L3.1 e L0.8 restano bloccati.
- **Q21**: il tracciamento deriva **solo da un'Intrusione fallita**; un colpo riuscito con un Mancato non esiste. Eventuali casi speciali si vedranno dopo.

Per tutto ciò che è testo visibile vale la regola di `CLAUDE.md`: riga in `it.json` **ed** `en.json`, poi `npm run i18n:check`.

---

## Livello 0 · Solo dati e testi

Si può fare senza toccare il codice (ciò che il motore non legge ancora resta inerte, ma si scrive già).

### L0.1 — Glossario fissato
- **Serve**: decidere e scrivere i nomi definitivi (Avversario/Megacorp, Incursore/Spettro, Fama/Conquista, Terminale/glifo, Overclock/Fatica/Energia ✔) in un solo posto. Già decisi: Avversario, Incursore, Mercenari, Overclock.
- **Tocca**: sezione "Glossario provvisorio" di `CLAUDE.md`; tabella §1 di `docs/REGOLE-v2.md`; `PROJECT_STATUS.md` (nella radice; nota "Nomenclatura doppia").
- **Fatto**: glossario aggiornato in `CLAUDE.md`, `docs/REGOLE-v2.md` §1 e `PROJECT_STATUS.md` (Fama, cassa, terminale, Mazzo Avversario, Overclock nel codice). Decisi: Briefing si tiene (fase di negozio del setup), Megacorp/corp sono parole dell'ambientazione, Spettro decade (solo Incursore). "Mostro"→"nemico" (`enemy` nel codice): rinomina ancora da fare.
- **Dipende da**: niente. **Sblocca**: L0.2, L1.5, tutto il resto per i nomi.
- **Decisione**: sì → **Q1, Q2, Q3**.

### L0.2 — Testi dell'interfaccia allineati al glossario
- **Serve**: portare in `it.json`/`en.json` i nomi nuovi (Avversario o Megacorp, Allarme, Fama, Intrusione, Terminale, Overclock, Mercenari, "Briefing"…). Oggi "Maligno", "Odio", "Conquista", "Energia", "Avversario" compaiono 105 volte in `it.json` e 34 in `en.json` (conteggio righe che li contengono).
- **Tocca**: `src/app/i18n/it.json`, `en.json`; i testi passati a `tr()` (cambiare una parola cambia la chiave: riga nuova in entrambi i file); catalogo Carte della Megacorp (`public/evil/catalog.json`, chiavi `evil.<id>`).
- **Dipende da**: L0.1.
- **Fatto (parziale)**: Maligno→Avversario, Odio→Allarme, eroe→mercenario in `it.json`/`en.json` (anche Evil One→Adversary, Hatred→Alarm, hero→mercenary), nei testi passati a `tr()` e in `public/adversary/catalog.json`. Build e `i18n:check` verdi. Poi anche: Conquista→Fama, Mazzo/Carte del Male→Mazzo Avversario/Carte dell'Avversario, scrigno e baule→cassa, glifo→terminale (nei testi; `en`: Fame, Adversary deck/cards, Terminal; "chest" resta). Decisi: "città" e "dadi competenza" restano. **Restano**: Intrusione/Overclock nei testi (oggi nessun testo dice Energia/Fatica), "Briefing", Megacorp.

### L0.3 — Schede dei Mercenari — **a cura dell'utente**
- **Modello controllato**: `MercenarySheet` ha già `intrusion`, `hacking`, `overclock`. Aggiunto il campo opzionale `archetype` (`brawler`|`gunner`|`raider`) e le tre schede di prova lo hanno (`halo` = `raider` provvisorio). `coins`/`items`/`potions` restano nel tipo ma la v2 li toglie (li decide il Briefing): da togliere con L2.x.
- **Stato**: i Mercenari li modella l'utente; gli eroi di test attuali si ignorano. Questa voce resta per riferimento sul formato (campi nuovi: Q5 ✔).
- **Serve (riferimento)**: scrivere l'archetipo e la distribuzione 3 dadi + 3 punti per ciascuno; creare **un Incursore puro** (oggi non ce n'è: `bastion` è 3/0/0, `vesper` 1/2/0 dadi e 1/2/0 abilità, `halo` è 1/1/1). Eroe nuovo = scheda JSON + ritratto/token (`characters/<id>-token.webp`, `-portrait.webp`) + riga in `public/heroes/index.json`.
- **Tocca**: `public/heroes/*.json`, `index.json`, `public/characters/`, `i18n` (nome/classe/abilità in `hero.*` o via `tr`). Con il motore attuale l'Incursore usa i campi `dice.magic` e `skills.magic` (v2 scrive `intrusion`/`hacking`: vedi L1.4 e A5).
- **Dipende da**: L0.1 (nome dell'archetipo).
- **Decisione**: sì → **Q4** (quale archetipo ha `halo`, come si bilancia l'1,1,1), **Q5** (nomi dei campi).

### L0.4 — Catalogo nemici v2 (9 voci + 3 Demoni)
- **Fatto (i 9 nemici)**: `public/monsters/catalog.json` ora ha solo i 9 nemici di `docs/NEMICI.md` (i vecchi sono sostituiti: `corp-guard`→`thug`, `sentry-drone`→`surveillance-drone`, `rogue-netrunner`→`netrunner`, `war-mech` resta; riferimenti aggiornati in `adversary/catalog.json`, `maps/test.json`, `HORDE_TYPES`; cartelle `mobs/` rinominate). Campi nuovi `family`, `range`, `ice`, `vigilance` scritti ma inerti. Macchine = `immune: ["poison"]`. Traduzioni in it/en. **Mancano**: i 3 Demoni, e le immagini dei 5 nuovi (`armored`, `shooter`, `sniper`, `bomber`, `turret`).
- **Serve**: Teppista, Corazzato, Tiratore, Cecchino, Bombarolo, Netrunner, Drone da sorveglianza, Mech da guerra, Torretta; Demoni Surriscaldamento / Contagio / Cortocircuito (pedine fisse con attacco `magic`, dadi bianco+giallo). Mappare le 4 voci già presenti (`corp-guard`, `rogue-netrunner`, `sentry-drone`, `war-mech`) su quelle nuove.
- **Workaround dati**: la colonna delle ferite è ancora `{"2-3":…,"4":…,"5":…}`: scrivere lo stesso numero nelle tre chiavi finché non c'è L1.2. **Macchina** = `immune: ["poison"]` (campo già letto da `immuneTo` in `state/status.ts`). Gittata, vigilanza, ICE e le parole nuove si scrivono ma sono inerti finché non ci sono L1.1, L1.3, L2.1, L3.x.
- **Tocca**: `public/monsters/catalog.json`; immagini `public/mobs/<id>/<id>-token.webp` e `-portrait.webp` (le 5 nuove non esistono); `i18n` (`monster.<id>` + testi delle abilità col pipe `ct`).
- **Attenzione**: i dadi **gialli** (Cecchino, Bombarolo, Netrunner, Demoni) hanno quasi solo gittata: cuori `0,0,0,0,1,1` in `public/dice/faces.json`. Con le facce attuali quei nemici fanno quasi zero danni; vedi A8 e L3.1.
- **Decisione**: sì → **Q6** (mappatura delle 4 voci esistenti, numeri), **Q7** (nomi).

### L0.5 — Oggetti v2: cyberdeck, armi con gittata, silenziate
- **Serve**: 2–3 cyberdeck (`kind: weapon`, `attack: magic`, dadi bianchi), armi a distanza con gittata scritta, tag per armi silenziate. Il catalogo oggi ha 8 oggetti.
- **Tocca**: `public/items/catalog.json` (campi come `range`, `ice`, tag `silenced` sono ignorati finché non ci sono L1.1, L2.1, L3.8); `i18n` `item.<id>`; icone in `public/icons/`.
- **Dipende da**: niente per scriverli; L2.1/L3.2 per farli funzionare.
- **Decisione**: sì → **Q9** (cyberdeck: dadi, raggio, ICE, prezzo).

### L0.6 — Negozio del Briefing
- **Serve**: stesso catalogo per tutti, scorte non limitate (la bozza). Con il codice attuale basta scrivere scorte molto alte in `public/shops/city.json`: `stockLeft` (`heroes/party-setup.ts:62`) sottrae le copie comprate dagli altri eroi, quindi con 99 non finiscono.
- **Tocca**: `public/shops/city.json`. I **300** di partenza ci sono già (`coins: 300` in tutte e tre le schede).
- **Decisione**: no (la bozza è chiara), ma vedi A16 sui fondi avanzati.

### L0.7 — Abilità di hacking e carte abilità v2 (solo testi)
- **Serve**: abilità del ramo hacking (raggio +N, firewall/ICE, ecc.). Oggi il catalogo ha 9 carte nei tre rami `combat`, `cunning`, `magic`.
- **Tocca**: `public/skills/catalog.json`; `i18n` `skill.<id>`. Per funzionare servono effetti `stat` nuovi (`ice`, `range`): vedi L2.1.
- **Decisione**: sì → **Q10**.

### L0.8 — Facce nuove dei dadi (documento)
- **Serve**: scrivere il nuovo `docs/dadi-facce.md` (la bozza lo cita a quel percorso, ma il file esistente è `docs/legacy/dadi-facce.md`). Solo cuori, scintille, Mancato.
- **Dipende da**: niente. **Sblocca**: L3.1 (dadi veri).
- **Decisione**: sì → **Q8**.

---

## Livello 1 · Poche righe di codice

### L1.1 — Gittata fissa per i mostri
- **Serve**: campo `range` nella scheda del mostro; `monsterRange` lo usa al posto della somma dei dadi.
- **Tocca**: `MonsterTier`/`MonsterDef` in `game/monsters/monster.ts`; `monsterRange` e la tabella `DIE_RANGE` in `state/combat.ts:376-391`; il controllo di gittata in `monsterAttackOption` (`combat.ts:352`). `SHOOTER_DISTANCE_CAP = 5` in `constants.ts:457` va riconsiderata: Cecchino ha 10.
- **Dipende da**: L0.4. Non richiede L3.1: per i mostri si può fare prima, lasciando i dadi com'erano.

### L1.2 — Una sola colonna di ferite
- **Serve**: `wounds` come numero singolo; la squadra è sempre di 3 eroi.
- **Tocca**: `MonsterTier.wounds`, `PlayersKey`, `playersKey()` (`monsters/monster.ts`); `pieces/piece.ts` (unico altro file che li usa); l'editor se mostra le ferite del mostro (da verificare). Con 3 eroi oggi la colonna scelta sarebbe `"4"`.
- **Dipende da**: Q11 (squadra sempre di 3? vedi A17).

### L1.3 — Parole chiave nuove dei nemici semplici
- **Macchina**: già `immune: ["poison"]` (L0.4); resta "vedono come telecamere" (dipende da L3.7) e "immune a Overclock" (non esiste una perdita di Overclock da stato: dipende da L2.3).
- **Fissa**: esiste `PawnBehavior` `{ kind: 'stay' }` (`pieces/pawn-behavior.ts:15`) ma si imposta sulla pedina o in `MapData.behaviors`, non nel catalogo: servono poche righe per leggerlo da `MonsterDef`.
- **Postazione** (+2 danni se non si è mosso): `Piece.pointsUsed` esiste; il bonus si somma in `planAttack` (`combat.ts:575`), accanto al Comando (`commandBonus`).
- **Segnale**, **Sabotatore**, **Intrusione sugli eroi**: *non* sono L1 (dipendono da Allerta e Sistemi: L3.9, L4.2).
- **Tocca**: `state/combat.ts`, `state/status.ts` (`Keyword`, `KEYWORD_NAMES`), `pieces/pawn-behavior.ts`.

### L1.4 — Etichette cyber al posto dei nomi fantasy
- **Serve**: "Magia"→"Intrusione", "Rete"→"Inceppamento", "Stordimento"→"Riavvio", "Fiamma"→"Surriscaldamento", "Veleno"→"Contagio" (solo visualizzazione, i dati restano `magic`, `web`, `stun`…).
- **Tocca**: `STATUS_NAMES` (`state/status.ts:11`, già getter); `ATTACK_NAMES` (`state/city.ts:161`); `itemDetail` (`items/item.ts:179`); etichette dei rami abilità; testi nei cataloghi.
- **Nota**: `web` è già etichettato "Rete" (non "Ragnatela"); `stun` già "Stordimento". La rinomina dei **campi** (`magic`→`intrusion`) è un piano a parte secondo `CLAUDE.md`: **Q5**.

### L1.5 — Costanti v2 in un posto solo
- **Serve**: `COVER_ARMOR = 1`, `VAULT_COST = 2`, `SHOT_NOISE_RADIUS = 6`, `MELEE_NOISE_RADIUS = 2`, `ALERT_ALARM = 1`, `CAMERA_ALARM_RADIUS = 6`, `SUSPICIOUS_ROUNDS = 2`…
- **Tocca**: `game/constants.ts` (le misure vanno lì per regola di progetto). Già presenti: `EVIL_DECK_END_PENALTY = 3` (v2: −3 ✓), `GLYPH_PROGRESS = 3` (v2: +3 ✓), `POTION_LIMIT = 3`, `BACKPACK_LIMIT = 3`, `DEFAULT_PROGRESS = 20`.
- **Decisione**: valori "da bilanciare" nelle bozze; si scrivono i valori di partenza.

### L1.6 — Pescaggio delle abilità con seme
- **Serve**: pescare le abilità secondarie in modo ripetibile (seme del contratto) e tenere fuori quelle in pin.
- **Tocca**: `drawSkillCards` (`heroes/party-setup.ts:112`) usa `Math.random()` e non ha seme; chiamata anche da `lobby/lobby-net.ts:166`. Il generatore con seme c'è già in `map/rng.ts` e in `GameState.random()`.
- **Dipende da**: Q12 (seme: del contratto, del giocatore o di entrambi?). Le parti sui pin sono L4.3.

### L1.7 — Squadra di 3 eroi
- **Serve**: `DEFAULT_PARTY` da 2 a 3 eroi (`heroes/hero-sheet.ts:98`: oggi `['vesper','bastion']`).
- **Tocca**: lì; `lobby/lobby-net.ts:28` (`heroesPerPlayer`: 1 giocatore → 2 eroi, altrimenti 1); testi `lobby.chooseTwo`/`lobby.chooseHero`.
- **Dipende da**: Q11.

### L1.8 — Controllo della copertura di squadra
- **Serve**: funzione pura "i tre archetipi coprono mischia, distanza, Intrusione, e c'è almeno 1 punto di Intrusione".
- **Tocca**: nuova funzione in `game/party.ts` (esiste) o `heroes/party-setup.ts`. Il messaggio nella schermata va in L2.4.
- **Dipende da**: L0.3, Q4.

### L1.9 — Piano di rinomina dei campi (nuovo, da Q5)
- **Stato**: passo 1 `energy`→`overclock` **fatto** (codice, dati, i18n, CSS `--c-overclock`; `GameSave.version` portata a 2; la carta abilità "Overclock" è stata rinominata "Picco di tensione", id `power-spike`, per non confondersi con la risorsa). Passo 2 `magic`→`intrusion` **fatto** (attacco: `intrusion`; ramo abilità: `hacking`; etichette "Intrusione"/"Hacking"; `GameSave.version` a 3; le bozze dell'editor con eventi `magic` vanno rifatte). Passi 3 e 4 **fatti**: `evil`→`adversary`, `hatred`→`alarm`, `hero`→`mercenary` (cartelle, rotta `/adversary/:map`, chiavi, token; `GameSave.version` a 5). **L1.9 completata.** Restano i testi visibili ("Maligno", "Odio", "Eroi", "Evil One"…): sono L0.2.
- **Serve**: rinominare nei dati e nel codice `magic`→`intrusion`, ramo abilità `magic`→`hacking`, `energy/maxEnergy`→`overclock/maxOverclock`, aggiungere `archetype`; `hero`→`mercenary` (cartelle e chiavi comprese, **Q33 ✔**); `evil`→`adversary`, `hatred`→`alarm` (**Q34 ✔**). Anche `{energy:N}` nei testi diventa `{overclock:N}`.
- **Tocca**: `AttackType`, `AttackDice`, `StartingSkills`, `SkillSchool`, `DieColor`-legati (`items/item.ts`, `heroes/hero-sheet.ts`, `skills/skill.ts`), `Piece`, `PieceData`, `MapData` (avventure salvate!), `GameSnapshot`/`GameSave` (versione oggi 1: serve migrazione), cataloghi in `public/`, `PawnBehavior` (`useItem` dadi), eventi `check` (`dice: 'melee'|'ranged'|'magic'`), editor, i18n e `scripts/i18n-check.mjs`.
- **Rischio**: è il lavoro più invasivo della lista, trasversale a tutti i file. Da fare **prima** di L2.3/L3.x per non scrivere codice nuovo con i nomi vecchi, ma con le chiavi che cambiano per le chiavi i18n: `catalogKey`.
- **Dipende da**: niente: Q33 e Q34 sono risolte. Conviene spezzarla in passi piccoli (uno per rinomina: prima `energy`→`overclock`, poi `magic`→`intrusion`, poi `evil`→`adversary`, poi `hero`→`mercenary`), ognuno con build e `i18n:check` verdi. Cartelle da rinominare con `git mv`: `src/app/game/heroes/`, `game/evil/`, `public/heroes/`, `public/evil/`, `public/characters/` (valutare), più `docs/` e `CLAUDE.md`. Tocca anche `GameSave.version` (migrazione dei salvataggi) e le avventure in `public/maps/`.

### Già a posto (nessun lavoro)
Budget fisso: `check()` in `heroes/hero-sheet.ts:58` avvisa già se dadi o punti non sommano 3 (e le tre schede sommano 3). Ferite multiple di 4 (20, 8, 12 ✓). Danno = cuori + bonus − (armatura − Perforare), minimo 0 (`combat.ts:692`). Allarme +1 per eroe a ogni round (`hatredPerTurn`, `evil-deck.ts:45`). Evocazioni solo fuori dalla vista degli eroi (`summonSight`). Terminale di partenza già acceso: la Verifica dà errore se nell'area di partenza non c'è un glifo acceso (`editor/validator.ts:203`). Fama +3 per terminale, una volta sola (anche per i gemelli). Oggetto "maledetto", morte permanente (`permadeath`), zaino da 3, pozioni da 3.

---

## Livello 2 · Estensione piccola o media

### L2.1 — ICE (armatura digitale)
- **Serve**: valore ICE su mostri, oggetti (cyberdeck), abilità, eroi; contro l'attacco `magic` il danno usa l'ICE al posto dell'armatura.
- **Tocca**: `resolveAttack` (`combat.ts:687`: `armor = target.team==='hero' ? armorOf(...) : target.armor`); `armorOf` (`actions.ts:375`); `Piece` (nuovo `ice`); `MonsterTier`; `ItemDef` (`ice`, `range`); vocabolario `stat` delle carte (`skills/skill.ts`, `state/effects.ts`: nuovo `ice`); mostra il valore nei pannelli (`ui/`).
- **Dipende da**: L0.4, L0.5. **Sblocca**: L3.2, L3.5.
- **Decisione**: Q13 (un eroe senza deck ha ICE 0: va bene anche per Bastion? "firewall" per tutti è un punto aperto).

### L2.2 — Raggio del cyberdeck e punti di accesso (solo dati e calcolo)
- **Serve**: raggio base dell'oggetto + bonus abilità; funzione "esiste un nodo attivo entro N caselle dal bersaglio?".
- **Tocca**: `ItemDef.range`; nuova funzione accanto a `distanceTo` (`combat.ts:133`, distanza a scacchiera). Il nodo richiede il segnalino: L4.2 (o L3.2 se si riusa `Encounter`).
- **Decisione**: **Q14** (distanza a scacchiera o per percorso? "N caselle dal bersaglio").

### L2.3 — Nuovi stati: Folgorazione e Tracciato
- **Serve**: `StatusKind` con `shock` (−1 Overclock / −1 velocità / Stordimento secondo il bersaglio, −1 raggio del deck) e il flag **Tracciato** (solo Incursore).
- **Tocca**: `StatusKind`, `PieceStatus`, `emptyStatus` (`pieces/piece.ts:15-24`); `STATUS_NAMES`, `ALL_STATUSES`, `hasStatus`, `describeStatus`, `inflictStatus`, `TurnStartResult` (`state/status.ts`); `inflictionsFrom` (`combat.ts:269`, legge frasi come "Bruciare"); token colore in `game/theme.ts` (4 riferimenti agli stati); badge in `pieces/pieces-controller.ts` (7); snapshot (`GameState.toSnapshot`/`fromSnapshot`, `GameSave.version` oggi 1: serve compatibilità); `game-scene.component.ts` (5). In totale ~39 riferimenti in 9 file.
- **Dipende da**: Q15 (regole di Folgorazione "da bilanciare" nella bozza).

### L2.4 — Briefing: cyberdeck, squadra valida, abilità
- **Serve**: nella schermata di preparazione, scelta del cyberdeck per l'Incursore, messaggio di squadra non valida, pescaggio abilità (L1.6).
- **Tocca**: `adventures/` (`/party/:map`), `lobby/lobby.component.ts`, `heroes/party-setup.ts` (`Loadout`, `validLoadout`: oggi già controlla scorte, pozioni, posto, monete); `ui/` per il pannello. **Quasi tutto il Briefing esiste già** come "negozio di preparazione" con 300 monete.
- **Dipende da**: L0.5, L1.6, L1.8.

### L2.5 — Niente viaggio rapido, niente città
- **Serve**: togliere teletrasporto da glifo a glifo e il concetto di "città fuori mappa" (negozio, Campo, Tempio).
- **Tocca**: `reachable(..., teleports)` e `StepKind 'travel'` (`board/movement.ts`); `state/city.ts` (`travelToCity`, `CITY_TELEPORT_COST = 25`, `CityService = 'shop'|'camp'|'temple'`, `buySkill`, `trainDice`, `templeHeal`, `buyTreasure`); `Piece.city`/`CityStay` e `activationOf`/`canActOnMap` che le controllano; `ItemDef.blocksTravel`; `ui/city-panel`; residui fantasy (`PROJECT_STATUS` §6).
- **Dipende da**: L3.5 (il commercio ai terminali sostituisce il negozio della città).
- **Decisione**: Q16 (si tiene il vecchio modulo città come base per il commercio, o si riscrive?).

### L2.6 — Eroe a terra
- **Serve**: rientro il round dopo sul terminale attivo e scoperto, **oppure** su una casella libera adiacente; ferite piene, metà dei fondi persi, Fama − Valore.
- **Tocca**: `killHero` (`state/actions.ts:274`: oggi crea un `CityStay` con `dead: true`; metà monete e −Valore già fatti); `returnChoices`/`returnFromCity` (`city.ts:56,73`) da riadattare senza la "città"; manca il ripiego sulla casella adiacente.
- **Dipende da**: L2.5.

### L2.7 — Punteggio finale e Fama persa/guadagnata
- **Serve**: tenere separati guadagni e perdite, mostrare `guadagnati − persi` a fine partita (record personale).
- **Tocca**: `GameState.addProgress` (`game-state.ts:278`, unico punto da cui passano tutte le variazioni: 7 chiamanti); snapshot; schermata di fine partita in `game-scene.component.ts`; `SaveStore`.
- **Decisione**: Q17 (dove vive il record personale: non c'è un profilo giocatore).

### L2.8 — Scavalco (costo 2) e movimento
- **Serve**: il passo su un bordo di mezza altezza costa 2.
- **Tocca**: `reachable` (`board/movement.ts`) è una ricerca a costi variabili con "secchi", quindi un costo in più è una riga (già ci sono `PIT_CLIMB_COST`, `PIT_JUMP_COST_PER_SPACE`); nuovo `StepKind`. Il vero lavoro è il dato (L3.6).
- **Dipende da**: L3.6.

### L2.9 — Tipi di segnalino "nodo", telecamera, porta elettronica (versione minima)
- **Serve**: se si decide di **riusare** `Encounter` (ha già `adjacent`, `reusable`, `blocksMove`, `blocksSight`, `look`, evento `interact`) aggiungendo pochi campi (`ice`, `wounds`, `system: 'camera'|'door'|'node'`).
- **Tocca**: `board/marker.ts`, `markers/marker-view.ts`, `map/map-data.ts`, editor (strumento segnalini, `validator.ts`: un incontro senza evento è errore, da escludere per i Sistemi).
- **Decisione**: Q18 (riuso di `Encounter` o tipi nuovi → L4.2).

---

## Livello 3 · Stato o regole nuove

### L3.1 — Via la gittata dai dadi
- **Serve**: dadi solo cuori / scintille / Mancato; la gittata viene dall'arma (`ItemDef.range`) o dal mostro.
- **Tocca**:
  - `public/dice/faces.json` e `DieFace` (`dice/faces.ts`: `range`, `slash`); il dado nero ha tre facce `slash` "gittata/cuore" a scelta;
  - `resolveAttack` (`combat.ts:628`: `range`, `inRange`, scelte `'range'|'heart'`, Stregoneria), `planAttack`, `needsRange`, `scriptSparks`, `AttackOutcome.range`;
  - ogni **"+N gittata"**: scintille delle armi (`parseEffect`, `combat.ts:222`), effetti `attack.range` di oggetti e carte abilità (Elmo scorpione, Anello dell'arcano, Tiro preciso, Fuoco interiore…), **Comando** (`commandBonus`) e quindi l'abilità di `halo` ("+1 danno e +1 gittata"), Stregoneria del Netrunner;
  - `dice/dice.service.ts` e i temi 3D (`@3d-dice/dice-box`: "rigenerare i temi" come dice la bozza); finestra d'attacco in `game-scene.component.ts` (~riga 468 e dintorni);
  - `monsterRange` e `DIE_RANGE` (si possono togliere).
- **Dipende da**: L0.8, L1.1. **Sblocca**: L3.2, L0.4 con danni sensati.
- **Decisione**: sì → **Q8**, **Q19** (cosa fa ora il dado nero: serve una faccia a scelta?).

### L3.2 — Intrusione senza linea di vista + punto di accesso
- **Serve**: l'attacco `magic` non richiede LOS ma richiede un nodo attivo entro N caselle dal bersaglio; usa i dadi e l'ICE del deck; limite di punti di accesso per turno.
- **Tocca**: `attackOptions` (`combat.ts:292`: `blockedFor` oggi chiede LOS per distanza e magia); `monsterAttackOption` (`combat.ts:334`, solo `dist > monsterRange`); `canSeeTarget`/`stairsRoute`; `AttackOption.reason` (testi); `contextActions` (`actions.ts:671`) se il nodo si usa dal menu.
- **Dipende da**: L2.1, L2.2, L2.9 o L4.2, L3.1.
- **Decisione**: **Q14, Q20** (quanti nodi per turno), **Q21** ("Mancato" = tracciamento: vedi A23).

### L3.3 — Sovraccarico
- **Serve**: azione dell'Incursore su un nodo entro il raggio (costo in Overclock): interrompe tracciamento e Demone, nodo fuori uso fino a fine missione.
- **Tocca**: `contextActions`/`useEncounter` (`actions.ts:671,796`); stato "fuori uso" sul segnalino (`MapData` + snapshot); evento per le avventure.
- **Dipende da**: L2.9/L4.2, L3.4.

### L3.4 — Tracciamento
- **Serve**: Mancato sull'Intrusione ⇒ Allarme +1, Incursore Tracciato, possibile Demone al nodo; il Tracciato finisce se muore il Netrunner che lo sfrutta o il nodo è sovraccaricato; i nemici con Intrusione lo bersagliano senza LOS.
- **Tocca**: `resolveAttack`/`applyAttack` (`combat.ts:628,727`: `miss` oggi vuol dire "attacco fallito"); `Piece` (nuovo `traced?: { nodeId, by? }`); `state/evil.ts` (`chooseMonsterTarget:163`); `hatred` in `GameState.evil`; `killHero`/rimozione pedine per togliere il Tracciato.
- **Dipende da**: L2.3, L3.2, L3.5.
- **Decisione**: Q21, Q22 (chi è "il Netrunner che lo sfrutta" se il tracciamento nasce da un nodo).

### L3.5 — Demoni
- **Serve**: pedina fissa generata sul nodo, con scheda (L0.4), attacca il Tracciato senza LOS e chi è in gittata; si danneggia con l'Intrusione dell'Incursore; si dissolve col Sovraccarico.
- **Tocca**: generazione di pedine fuori dalle carte: oggi le evocazioni passano da `evil-deck.ts` (carte `summon`) e `evil.ts`; nuova funzione `spawnDemon` che crea una `Piece` come le evocazioni; `activationOf` (`activation.ts`); vista pedina e token (`public/mobs/…`).
- **Dipende da**: L0.4, L1.3 (Fissa), L2.1, L3.2.

### L3.6 — Altezze: mezza altezza
- **Serve**: un bordo (muretto) o una casella (mobile, barriera) che non blocca la vista, dà copertura, si scavalca.
- **Tocca**: oggi `Wall` (`board/wall.ts`) blocca sempre movimento **e** vista; `ObstacleType = 'rock'|'pit'|'water'` (`board/obstacle.ts`) non ha altezza; `Board.blocksSightAt`/`blocksSight` (`board/board.ts:172,206`) e `canStepStraight` (`:385`); `board/sight.ts`; `map/map-data.ts` (nuovi campi `low` su muri/ostacoli); disegno (`map/walls.ts`, `obstacles/obstacle-view.ts`) con token in `theme.ts`; **editor** (strumenti muri e ostacoli) e `validator.ts`; `veil-view.ts`.
- **Nota**: la bozza parla di "griglie a bit" preparate al caricamento; oggi `Board` usa chiavi stringa (`h|x|y`) in insiemi/mappe. Funziona, ma "a bit" è un'ottimizzazione da decidere.
- **Decisione**: Q23 (formato dei dati: muro basso come `Wall` con flag o elemento nuovo).

### L3.7 — Copertura (+1 armatura) e direzione dell'attacco
- **Serve**: a ogni attacco a distanza, controllare se nella direzione (una delle 8) da cui arriva c'è un'altezza dimezzata adiacente al bersaglio: +1 armatura. Non vale per mischia, Intrusione, Soffio, Esplosione.
- **Tocca**: `armorOf` (`actions.ts:375`) ha già il parametro `vs`: serve anche la direzione/attaccante; `resolveAttack`; anteprima per il giocatore ("il giocatore la vede prima di sparare") nella finestra d'attacco.
- **Dipende da**: L3.6.

### L3.8 — Appostarsi e Nascosto
- **Serve**: nuovo ordine di Prepararsi; Nascosto se copertura adiacente e nessun nemico adiacente; si perde con movimento, ferite, attacco rumoroso; astuzia/hacking permettono 2 caselle; armi silenziate non rompono l'ordine.
- **Tocca**: `HeroOrder`, `ORDER_ICONS`, `ORDER_NAMES` (`pieces/piece.ts:46-51`) e l'icona in `public/icons/`; `placeOrder`, `loseOrdersOnWounds`, `spendPoints`, `spendAttack` (`state/actions.ts`); pulsanti degli ordini in `game-scene.component.ts`; `ui/`.
- **Attenzione**: esiste già `state/ambush.ts` (+ `Piece.seenAtStart` e l'abilità di Vesper "Colpo dall'ombra": +2 danni su un nemico che non vedeva): si sovrappone al concetto di Nascosto e di "attacchi a sorpresa" (punto aperto della bozza).
- **Dipende da**: L3.7, L1.5. **Decisione**: Q24, Q25.

### L3.9 — Allerta dei nemici e rumore
- **Serve**: campo `alert` (Dormiente → Di guardia → Sospettoso → Allertato), vigilanza, notare un eroe all'attivazione, andare verso la causa, tornare Di guardia dopo 2 round, Allarme +1 per ogni nemico che diventa Allertato; rumore (sparo 6 caselle, mischia 2, solo nella stessa area).
- **Tocca**: `Piece` (`alert`, `vigilance`, causa/ultima posizione); `MonsterTier` (vigilanza); `state/activation.ts` e il ciclo del turno della Megacorp in `state/evil.ts` (`planMonsterMove`, `chooseMonsterTarget`) e in `game-scene.component.ts`; `Board.areaAt` (esiste); `Piece.awake` (oggi: dorme finché l'area non è rivelata; poi "agisce sempre" = l'Allertato della bozza).
- **Conflitto di nomi**: `state/vigilance.ts` e la carta/abilità "Vigilanza" sono la **reazione che attacca un nemico che entra accanto**; la bozza chiama "vigilanza" il **raggio di avvistamento**. Serve un altro nome per uno dei due (Q26).
- **Dipende da**: L3.8, L1.5. Sblocca i Sistemi attivi (L4.2) e Segnale/Sabotatore.

### L3.10 — Fondi in missione e commercio ai Terminali
- **Serve**: "Usa terminale" da adiacente apre il negozio (pozioni, oggetti, vendita a metà prezzo), costo in movimento; i Fondi trovati sono personali.
- **Tocca**: `cityView`, `buyItem`, `buyPotion`, `sellItem`, `sellPrice` (`state/city.ts`) si possono riusare **senza** il trasferimento in città (`CityStay`); nuova azione in `contextActions`; `ui/city-panel`; segnalino Denaro (`Coins` in `board/marker.ts`: oggi vale 100 a **ogni** eroe, non solo a chi lo raccoglie: vedi A15).
- **Dipende da**: L2.5, L2.9. **Decisione**: Q27, Q16.

---

## Livello 4 · Grande

### L4.1 — Network: eroi controllati dall'host
- **Serve**: i due eroi che non sono del giocatore agiscono da soli (sposta, attacca, cura, raccoglie, hackera), con i pin del proprietario.
- **Tocca**: oggi esiste solo l'IA della Megacorp sui mostri (`state/evil.ts`); **nessuna IA per gli eroi**. Nuovo modulo in `game/state/` che riusi `reachable`, `attackOptions`, `chooseMonsterTarget`; `selectHero`/`activeId` (`actions.ts:637`) e il ciclo dei turni; `lobby/lobby-net.ts` (assegnazione eroi).
- **Dipende da**: L1.7, L1.8, L3.2 (per l'Incursore CPU), L4.3 (pin).
- **Decisione**: Q28.

### L4.2 — Sistemi come segnalini con ferite e ICE
- **Serve**: telecamera, porta elettronica, terminale ostile (nodo): segnalini bersagliabili con Intrusione, con ferite e ICE sul segnalino; telecamere che vedono gli Nascosti, Allarme +1 una volta per round per telecamera.
- **Tocca**: unione `Marker` (`board/marker.ts:8`) e `MapData.markers`; `markers/marker-view.ts` + `markers/marker-rules.ts`; editor (strumenti, ispettore, `validator.ts`); trigger degli eventi (`defeated`, `interact`); `AttackOption`/bersagli (oggi `attackOptions` accetta solo `Piece`); icone, token, `i18n`.
- **Dipende da**: L2.1, L3.9. **Decisione**: Q18.

### L4.3 — Pin e progressione dell'eroe
- **Serve**: 3 slot di pin per eroe, sbloccati giocando (1→2→3), abilità "già viste", persistenza per eroe.
- **Tocca**: non esiste uno store per gli eroi (`SaveStore` salva una partita per avventura; l'`eroe persistente` è fuori scope in `CLAUDE.md`). Servono: nuova interfaccia `HeroStore` (locale, poi Firestore), regole di sblocco, schermata dei pin, integrazione in `drawSkillCards` (L1.6) e nel Briefing (L2.4).
- **Decisione**: **Q29, Q30** (quando si sblocca un pin; dove vive la progressione senza account).

### L4.4 — Modalità di gioco
- **Serve**: Singolo (1+2 Network), Cooperativa (fino a 3), Multiplayer totale (fino a 4, uno è Avversario, niente progresso).
- **Tocca**: lobby (`lobby/`), gioco in rete autoritativo (**non esiste ancora**: la partita gira in locale), `evilManual`/`/evil/:map`.
- **Dipende da**: L4.1, L4.3 e dal gioco in rete.

### L4.5 — Contratti
- **Serve**: una missione = `MapData` + metadati (Fama iniziale, tentativi, durata in tasca…); elenco dei contratti; verifica di giocabilità.
- **Tocca**: `map/map-data.ts` (oggi ha `title`, `intro`, `progress`, `setup`, `rules`, `objective`: non ha tentativi né scadenza); `adventures/adventures.ts` (`ADVENTURES = []`: **vuoto**); avventure di prova in `public/maps/` (c'è solo `test.json` e `catalog.json`); `validator.ts`.
- **Decisione**: Q31, Q32 (e A18 sulla geolocalizzazione).

### L4.6 — Carte "firmate dalla Corp" e catalogo Corp
- **Serve**: carte del mazzo (`EvilCardKind = 'power'|'event'|'trap'|'summon'`) specifiche per Corp; nemici "di base" o variabili.
- **Dipende da**: tutto il resto; la bozza stessa lo rimanda a "sopra un gioco che regge".

---

## Ordine suggerito (per sbloccare più cose con meno rischio)

1. **Decisioni**: Q1–Q5, Q8, Q11 (sbloccano L0 e L1).
2. **L0.1–L0.8**, poi **L1.1, L1.2, L1.4, L1.5, L1.7** (tutto piccolo, il gioco resta avviabile).
3. **L3.1** (dadi senza gittata) *prima* di L3.2: altrimenti i nemici nuovi con dadi gialli non fanno danno.
4. **L2.1 → L2.2 → L3.2 → L2.9 → L3.3/L3.4/L3.5** (la rete: Intrusione, nodi, tracciamento, Demoni).
5. **L3.6 → L3.7 → L3.8 → L3.9** (copertura e furtività) in parallelo alla rete, dopo L1.5.
6. **L2.5, L2.6, L3.10** (città → terminali), poi **L4.x**.

---

# Sezioni di controllo

## A. Incongruenze tra le bozze e il codice attuale

1. **Nome del ruolo avversario.** REGOLE-v2 lo chiama **Avversario** ("Maligno / Megacorp"); `CLAUDE.md`, l'interfaccia e `PROJECT_STATUS.md` dicono **Megacorp**; nel codice è `evil`/`state.evil`. NEMICI e REGOLE-v2 usano anche "Corp".
2. **Spettro / Incursore.** `CLAUDE.md`: tre eroi di prova Picchiatore (`bastion`), Artigliere (`vesper`), **Spettro** (`halo`, "furtivo/supporto"). REGOLE-v2: il terzo archetipo è l'**Incursore** (attacco Intrusione, ramo hacking), "Spettro (ex runner)". In più `halo` nei dati è un **1/1/1** con un'abilità di supporto (Comando), non un Incursore: la squadra di prova non rispetterebbe la regola di copertura se l'archetipo si legge dalle statistiche.
3. **"Fatica" nel codice.** REGOLE-v2 dice che "Fatica resta il nome nel codice": nel codice **non esiste** `fatigue`; si chiama `energy`/`maxEnergy` (`Piece`), `{energy:N}` nei testi, `energyForMovement`, `HeroSheet.energy`. È l'**etichetta** da cambiare, non il campo. (Il commento in `hero-sheet.ts` dice ancora "l'energia è fuori scope", ma è già in gioco.)
4. **"Fama".** Nel codice è `progress`/`DEFAULT_PROGRESS`/`GLYPH_PROGRESS`/`addProgress`; in interfaccia "Conquista". I valori coincidono con la bozza (+3 terminale, −3 mazzo finito, −Valore eroe, sconfitta a 0), ma i punteggi guadagnati/persi separati **non esistono**.
5. **Nomi dei campi nelle schede.** REGOLE-v2 §3 scrive `archetype`, `fatigue`, `dice.intrusion`, `skills.hacking`; i file reali hanno `energy`, `dice.magic`, `skills.magic`, nessun `archetype`, e **ancora** `coins`, `items`, `potions` (la bozza dice che non stanno più nella scheda). `HeroSheet.coins/items/potions` sono campi obbligatori nel tipo. `CLAUDE.md` dice che i nomi dei dati cambiano solo con un piano a parte.
6. **"Mancato" e dado base.** La bozza dice che il Mancato compare su "dado base"; in `faces.json` hanno la faccia Mancato **solo** rosso, blu e bianco, una su sei. Il codice non distingue un "dado base": `miss ||= face.miss` su qualunque dado (`combat.ts:642`), quindi con due dadi bianchi la probabilità sale.
7. **Facce dei dadi.** La bozza dice "solo cuori, scintille e Mancato" e cita `docs/dadi-facce.md`: il file è in `docs/legacy/dadi-facce.md`. In `faces.json` ogni faccia ha ancora `range` e il dado nero ha facce `slash` (gittata *o* cuore, a scelta).
8. **Dado giallo.** NEMICI assegna il giallo a Cecchino, Bombarolo, Netrunner e Demoni come dado d'attacco; il giallo attuale ha cuori `0,0,0,0,1,1`: è un dado "gittata". Con l'attuale `resolveAttack` quei nemici colpiscono quasi senza danno.
9. **Gittata dei mostri.** La bozza dice "campo fisso, non più dai dadi"; il codice la ricava dai dadi (`monsterRange`, `DIE_RANGE`, tetto `SHOOTER_DISTANCE_CAP = 5`). Il Cecchino a 10 e il Mech a 6 superano il tetto.
10. **Catalogo mostri.** Le 9 voci di NEMICI non coincidono con le 4 del catalogo né nei numeri né nei tipi: `war-mech` è **mischia** (dadi rosso/verdi) nel catalogo e **distanza, gittata 6** in NEMICI; ferite del Mech 6 (colonna "4") contro 10/11; `corp-guard` armatura 2 contro Teppista 1; `rogue-netrunner` armatura 2 e "Stregoneria 3" contro armatura 0 e ICE 2; `sentry-drone` velocità 5 contro 6, abilità "Perforare 1, +1 Gittata" contro "Volo, Segnale, Macchina". Nessuna corrispondenza di id o nome (Teppista ≠ Guardia corporativa).
11. **Colonne delle ferite.** La bozza dice "vale lo scaglione 4 giocatori (3 eroi + Avversario)". `playersKey(3)` dà in effetti `"4"`, ma `DEFAULT_PARTY` ha 2 eroi (scaglione `"2-3"`) e `CLAUDE.md` parla di 2–4 eroi.
12. **"Vigilanza".** In v2 è il raggio di avvistamento del nemico; nel codice `state/vigilance.ts` e la carta "Vigilanza" sono la reazione "attacca chi ti entra accanto". Stesso nome, due regole.
13. **Dormiente / Allertato.** La bozza dice che Dormiente "già esiste": c'è `Piece.awake` (dorme finché l'area non è rivelata, poi "agisce sempre"). Non esistono `alert`, "Di guardia" né "Sospettoso". `Piece.inactive` è un'altra cosa (nemico quasi-ostacolo).
14. **Attacchi a sorpresa.** La bozza lo mette tra i punti aperti ("per ora no"); nel codice **esiste già** `state/ambush.ts`/`seenAtStart` e `vesper` ha come abilità primaria +2 danni contro chi non vedeva a inizio turno.
15. **Fondi trovati.** La bozza: personali, "come nella v1". Il codice: lo `Coins` a terra dà 100 monete **a ognuno degli eroi**, non a chi lo raccoglie (`marker.ts:153`).
16. **Briefing.** La bozza: scorte non limitate; i fondi non avanzati si perdono. Il codice: scorte limitate e condivise (`stockLeft`) e `PartySetup.coins` porta in partita ciò che avanza (che poi si spende in città).
17. **Squadra di 3.** REGOLE-v2: sempre 3 eroi. `CLAUDE.md` e `PROJECT_STATUS`: 2–4. Codice: `DEFAULT_PARTY` 2 eroi; `heroesPerPlayer` (1 giocatore → 2 eroi, altrimenti 1) e lobby con `players.length === heroes`.
18. **Contratti "fisici" e geolocalizzazione.** REGOLE-v2 ("si raccoglie fisicamente, si gioca quando si vuole") sa di missioni sul territorio; `CLAUDE.md` mette fuori scope le missioni geolocalizzate, mentre `PROJECT_STATUS` documenta che la mappa del mondo esiste ed è la home. `ADVENTURES` è vuoto.
19. **Punto di accesso "`markers`, `interact`".** `interact` non è un campo dei segnalini: è un trigger degli eventi e l'azione `interact` di `actions.ts:847` che lavora su **pedine**. I segnalini attivabili sono `encounter` (`adjacent`, `reusable`, `blocksMove/Sight`).
20. **Terminali: "niente viaggio rapido".** Il codice ha il viaggio fra glifi accesi (`reachable(..., teleports)`, `StepKind 'travel'`, `ItemDef.blocksTravel`, `CITY_TELEPORT_COST = 25`) e la città come negozio/Campo/Tempio off-map.
21. **Eroe a terra.** Funziona già in parte: `killHero` dimezza le monete, toglie il Valore dalla Fama e rimette in gioco il round dopo su un glifo acceso senza pagare; **manca** il ripiego "casella libera adiacente" e la "città" intermedia (`CityStay.dead`) va tolta.
22. **Altezze e "griglie a bit".** Non ci sono altezze (muri e ostacoli bloccano sempre vista e movimento) né griglie a bit: `Board` usa chiavi `h|x|y` in strutture a chiavi stringa.
23. **"Intrusione riuscita" e Mancato.** Nel codice un `miss` rende **fallito** l'attacco (`hit = !miss && …`). La bozza dice "Intrusione riuscita: silenziosa; con un Mancato = tracciamento": o il tracciamento è un effetto di un attacco **fallito**, o serve un Mancato che non annulla il colpo. Vedi Q21.
24. **Etichette di stato.** Il codice usa già "Rete" e "Stordimento", non "Ragnatela"; le etichette "Surriscaldamento/Contagio/Cortocircuito/Inceppamento/Riavvio" non ci sono (solo "Fiamma"/"Veleno").
25. **Macchina "immune a Fatica".** Non esiste alcun effetto che tolga Fatica (energia) a un nemico/eroe, quindi l'immunità non ha ancora oggetto.
26. **Comando e gittata.** L'abilità di `halo` e il Comando dei mostri danno "+1 gittata": la bozza dice di riscrivere solo Stregoneria e Comando "dei mostri", ma toccano anche una scheda eroe e effetti di oggetti/carte (L3.1).
27. **Fixer / Ritrovo.** Citati in REGOLE-v2 (§13, §14) ma `PROJECT_STATUS` conferma che nel codice non c'è alcun riferimento.
28. **Fatica in attacco.** REGOLE-v2 §6: "+1 dado competenza in attacco (fino a 5)". Il codice spende energia per un dado nero nella finestra d'attacco (`game-scene.component.ts:1346`) e per le prove fino a `CHECK_MAX_DICE = 8`; **non ho trovato** il limite di 5 per gli attacchi: da verificare.

## B. Punti aperti già scritti nelle bozze, per tema

**Nomi e glossario**
- Nome definitivo di **Fama** (Slancio, Margine…) — REGOLE-v2 §14
- Nomi e identità cyber dei nemici (segnaposto) — NEMICI §6
- Interfaccia della rete esterna e collegamento col Fixer e il Ritrovo — REGOLE-v2 §14
- Etichette di Rete (*Inceppamento*) e Stordimento (*Riavvio*) "da valutare" — §8

**Dadi e bilanciamento**
- Facce nuove dei dadi e bilanciamento — §14
- Tutti i numeri segnati *(da bilanciare)*: Folgorazione, vigilanza dei nemici, raggio dello sparo (6), copertura (+1), scavalcare (2), Allarme per rilevamento (+1), costo di Sovraccarico in Fatica, costo di movimento al terminale, valore delle ferite/ICE dei nemici e dei Demoni
- Come si bilancia l'eroe 1,1,1 — §14

**Rete (Intrusione, ICE, Demoni)**
- Quanti punti di accesso può usare l'Incursore in un turno — §14
- Catalogo dei cyberdeck (dadi, raggio base, ICE, prezzo) e di quanto li aumentano le abilità di hacking — §14
- Oggetti e abilità **firewall** per i non Incursori — NEMICI §6
- Gli altri eroi possono sparare al terminale per dissolvere un Demone / interrompere un tracciamento? — NEMICI §6 e §5
- Macchina: se vedono come telecamere — NEMICI §3 "da valutare"

**Furtività**
- Attacchi a sorpresa su nemici non Allertati: bonus? ("per ora no") — §14
- Armi silenziate: tag dell'oggetto o abilità? Costano di più? — §14
- Telecamere fisse, senza rotazione (per ora); correre non fa rumore (per ora)

**Terminali, squadra, missioni**
- Aspetto del token Terminale: computer a pavimento (occupa una casella) o strumento a parete (non blocca); cambia LOS, movimento e caselle di rientro — §14
- Numero di tentativi di un contratto fallito — §14
- Tempo di vita del contratto in tasca (scade?) — §14
- Verifica di giocabilità di un contratto — §11 "da decidere"

**Contenuti**
- Catalogo Corp: nemici di base e variabili — NEMICI §6
- Altre macchine (cani robot, mine, droni da riparazione) e umanoidi (medico, ingegnere) — NEMICI §6
- Stregoneria e Comando da riscrivere; "+N Gittata" delle abilità dei mostri *(da definire)* — REGOLE-v2 §7

**Fuori scope dichiarato**: Corp e influenza di zona, Fixer, Badlands, contratti rari, valuta persistente, famigli (forse droni), prove d20, anti-GPS-falso, backend, luce e ombra, coni di vista, pattuglie, telecamere rotanti, parametro del contratto silenzioso/misto/aperto.

## C. Domande per procedere

**Nomi e glossario**
*(✔ = risposta già data, vedi "Decisioni prese")*

- **Q1 ✔.** Avversario e Incursore. *Aperto*: il nome "Megacorp" resta come ambientazione? Il Netrunner nemico resta "Netrunner"?
- **Q2 ✔.** Tre Mercenari al posto degli Eroi.
- **Q3 ✔ (parziale).** Mercenari modellati dall'utente. *Aperto*: "Fama" va in interfaccia al posto di "Conquista" subito?
- **Q5 ✔.** Si rinominano anche i campi. Vedi **L1.9** e Q33/Q34.
- **Q33 ✔.** Sì, cartelle e chiavi comprese.
- **Q34 ✔.** Sì, anche `evil`→`adversary` e `hatred`→`alarm`. La rotta `/evil/:map` diventa `/adversary/:map` ✔ (regola generale: ogni nuova chiave sostituisce per intero la precedente, niente alias).
- **Q35 ✔.** Energia/Fatica si chiama **Overclock**.

**Eroi e squadra**
- **Q4 ✔.** Mercenari a cura dell'utente, quelli di test si ignorano. *Aperto*: l'archetipo è un campo `archetype` esplicito sulla scheda (lo do per scontato, visto Q5)?
- **Q11 ✔.** Sempre 3 Mercenari. *Aperto*: in lobby con 1 giocatore (oggi 2 eroi) come cambiano i flussi? Aggiorno `CLAUDE.md`/`PROJECT_STATUS` ("da 2 a 4 eroi")?
- **Q12.** Il seme del pescaggio delle abilità: del contratto (ogni giocatore pesca uguale?), del giocatore, o la combinazione di entrambi?
- **Q28.** I Network (eroi CPU): con che livello di intelligenza iniziamo (sposta e attacca, o anche cure, loot, hacking)? Sono eroi presi dal catalogo o dagli altri giocatori già in questa prima versione?

**Dadi, gittata, nemici**
- **Q6.** Come mappiamo le 4 voci del catalogo sulle 9 di NEMICI? (Es.: `corp-guard`→Teppista, `sentry-drone`→Drone, `rogue-netrunner`→Netrunner, `war-mech`→Mech? Il Mech diventa a distanza?) Si riscrivono tutte con i numeri di NEMICI?
- **Q7.** I nomi di NEMICI sono definitivi? (Sono "segnaposto" nel file stesso.)
- **Q8 ✔ (rimandata).** L'utente valuta altre cose prima. Nel frattempo L0.8 e L3.1 restano fermi; i nemici nuovi con dado giallo non vanno messi in gioco.
- **Q19.** Il dado nero (competenza) ha oggi tre facce "gittata *o* cuore a scelta": cosa diventano?
- **Q13.** ICE: un eroe senza cyberdeck ha ICE 0. Bastion e Vesper subiscono l'Intrusione al pieno? Gli oggetti firewall per i non Incursori sono da fare adesso o dopo?

**Rete: Intrusione, nodi, tracciamento**
- **Q14.** "N caselle dal bersaglio": distanza a scacchiera (come `distanceTo`) o per percorso? Conta il muro?
- **Q20.** Quanti punti di accesso può usare l'Incursore per turno (la bozza lo lascia aperto)? Posso proporre "uno per attacco" come partenza?
- **Q21 ✔.** Il tracciamento nasce solo da un'Intrusione fallita (A6/A23 risolte: il codice già fa fallire l'attacco con un `miss`). *Aperto*, quando si faranno i dadi: "dado base" = primo dado dell'arma o ogni dado con la faccia Mancato?
- **Q22.** Chi è "il Netrunner che lo sfrutta" quando il tracciamento nasce da un nodo senza nemici? Basta il Demone al nodo?
- **Q15.** Folgorazione: va bene la proposta della bozza (piazzamento e tiro di inizio turno come Fiamma; −1 Overclock / −1 velocità / Stordimento; −1 raggio del deck) per iniziare?
- **Q18.** I Sistemi (telecamera, porta elettronica, nodo): estendiamo `Encounter` con pochi campi (veloce) o creiamo tipi di segnalino nuovi con ferite e ICE (più pulito, più lavoro nell'editor)?

**Copertura e furtività**
- **Q23.** Il muretto a mezza altezza: nuovo tipo di muro dell'avventura (come `Wall` con un flag) o elemento a parte? E la "casella mobile" è un ostacolo con altezza?
- **Q24.** Se un eroe ha già un ordine di Guardia o Mira, Appostarsi lo sostituisce (un solo ordine alla volta, come oggi)?
- **Q25.** "Colpo dall'ombra" di Vesper (+2 se il nemico non era visto) e il futuro Nascosto: restano indipendenti?
- **Q26.** Come rinominiamo il raggio di avvistamento per non confonderlo con la carta/abilità **Vigilanza** (`state/vigilance.ts`)? Es.: "Percezione", "Sguardo", "Allerta"?

**Terminali, briefing, contratti, progressione**
- **Q9.** Cyberdeck: ho bisogno di 2–3 profili d'esempio (dadi, raggio base, ICE, prezzo) o li invento io come partenza?
- **Q10.** Quali abilità del ramo hacking vuoi in questa fase (raggio +N, ICE, altre)? Le 9 carte attuali del ramo `magic` si convertono o si scartano?
- **Q16.** Il commercio ai Terminali riusa `state/city.ts`/`ui/city-panel` (tolgo viaggio, Campo e Tempio) o lo riscrivo da zero?
- **Q27.** I Fondi trovati in missione sono **di chi li raccoglie** oppure 100 a ciascun eroe come oggi? E i fondi avanzati dal Briefing si perdono o restano?
- **Q17.** Dove si salva il "record personale" (non c'è profilo giocatore): in localStorage per ora, dietro `SaveStore`?
- **Q29.** Come e quando si sblocca un pin? (Dopo N missioni giocate con quell'eroe? Una per missione vinta?) Da dove viene l'elenco delle abilità "già viste"?
- **Q30.** Senza account (Auth fuori scope), la progressione degli eroi sta in localStorage dietro un'interfaccia pronta per Firestore?
- **Q31.** Tentativi e scadenza di un contratto: partiamo senza (solo campi vuoti nei dati) o li implementiamo?
- **Q32.** I contratti "si raccolgono fisicamente": nella prima versione sono una lista di mappe in `ADVENTURES` (nessuna geolocalizzazione) o dobbiamo legarli alla mappa del mondo che già c'è?
