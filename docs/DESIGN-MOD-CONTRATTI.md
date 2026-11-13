# Design: Mod, Cyberware, Contratti e Fixer (bozza 0)

Nasce dal brainstorming dell'11 novembre 2026. **Non è ancora stato giocato.** È un *delta* di `docs/REGOLE-v2.md`: dove c'è conflitto, vale questo file (vedi §6).

## 0. Come leggere (per Claude Code)

- ✅ **Deciso**: si può implementare, a passi piccoli (regola di `CLAUDE.md`).
- 🧪 **Da provare**: solo dentro il prototipo (§8), con valori di partenza modificabili.
- ⏳ **Rimandato**: non si implementa e non si prepara codice.
- I numeri sono sempre *(da bilanciare)*. Se un'idea non è in «Deciso», non è una specifica.

## 1. L'idea in una frase

I mercenari non sono persone armate: **sono armi loro stessi**. Il mercenario è una *piattaforma* con equipaggiamento di base e **slot**; nel Briefing non si comprano oggetti, si scelgono **mod** adatte al contratto, con un budget fisso. Da Descent con la pelle si passa a un piccolo Cyberpunk 2077: «facile da imparare, lungo da padroneggiare».

## 2. ✅ Deciso

### 2.1 Mercenario = piattaforma
- Ogni archetipo ha un **equipaggiamento di base** fisso: un'**arma** (a una o due mani), un'**armatura-cromo** (cyberware della pelle, non un giubbotto) e un **cyberdeck**. Niente fase di «progettazione» del personaggio prima del Briefing: la differenza tra eroi sta nell'equip di base per archetipo.
- Ogni oggetto base ha **slot** per le mod, e **gli slot seguono dove sta la potenza dell'archetipo** *(da bilanciare)*:

  | Archetipo | Arma | Armatura | Deck |
  |---|---|---|---|
  | Picchiatore | 2 | 1 | 1 (supporto, Berserk) |
  | Artigliere | 2 | 1 | 1 (supporto, Aggancio) |
  | Incursore | 0-1 | 1 | 2-3 (è la sua arma di rete) |

  Per l'Incursore il deck è il loadout: ha due armi (quella fisica e quella di rete) e sceglie in base al bersaglio.
- **Equipaggiamento e zaino** (deciso 2026-11-13): il mercenario porta ciò che ha equipaggiato (regole di mani, armatura, deck) più **al massimo 3 altri oggetti** nello zaino, di qualsiasi categoria; i consumabili hanno una sezione a parte (massimo 3). Ogni oggetto comprato si equipaggia da solo se ci sta, altrimenti va nello zaino.
- **Le mod stanno sull'oggetto, non sulla categoria**: un'arma nello zaino si può moddare ed equipaggiare dopo. In partita le mod passive valgono solo finché l'oggetto è equipaggiato; i bonus d'attacco e le scintille attive di una mod valgono solo attaccando con quell'oggetto. Le mod sono compatibili per **tipo di attacco** (mischia, distanza, intrusione), non per id. **Le mod seguono l'oggetto**: se lo cedi, lo posi o lo metti nello zaino, le sue mod vanno con lui; due copie dello stesso oggetto hanno mod diverse. Nel codice un oggetto moddato è un oggetto a sé (`voss-sr90+vibro-edge`, vedi `moddedItem` in `game/mods/mod.ts`). **Vendita in città**: il prezzo dell'oggetto base più, per ogni mod montata, metà del suo costo arrotondata a 25 E$. La carta dell'oggetto (negozio e inventario) elenca le mod montate in una sezione «Mod», con nome e testo.
- **Cambiare oggetto cambia gli slot**: se il giocatore vende o rimborsa l'oggetto, le mod che non ci stanno più **si rimborsano** (niente trappole). Un oggetto senza slot compare lo stesso nel Briefing, ma spento.
- **Carte comprimibili**: nella tab Mod ogni oggetto è una carta comprimibile (`<details>`), per occupare meno spazio.
- Si parte con pochi mercenari ben fatti e si lavora soprattutto sul **sistema di mod** (il Descent base ne aveva 20; non serve arrivarci).
- L'equip **trovato** in missione **si perde a fine partita**: nessun bilanciamento a lungo termine. (Un item level con nemici scalati resta un'idea futura, ⏳.)

### 2.2 Mod
- Una mod dà a un oggetto effetti **passivi**, **attivi** o entrambi.
- **Passivo**: basta avere l'oggetto equipaggiato.
- **Attivo**: si spendono **scintille** (le saette dei **dadi neri**, i dadi competenza).
- Esempio: una mod che dà passivamente *Perforare 1* e, spendendo 2 scintille, *Perforare +1*.
- **Oggetto base spoglio**: tipo, dadi, gittata e una sola riga di scintille. In più al massimo **una firma narrativa**, quella che spiega perché l'oggetto esiste (es. *Perforare 1* sul fucile Voss SR-90: un calibro così fa questo). Tutto il resto è mod: ciò che si può aggiungere o togliere senza cambiare cos'è l'oggetto. Una mod non ripete la firma tale e quale (può però farla salire di livello). I livelli di rarità del legacy (rame/argento/oro) non esistono più come statistiche: sono oggetti base con mod già inserite e più slot.
- **Bonus di supporto** (`offHand`): con due armi a una mano **dello stesso tipo** (due da mischia o due a distanza, come due pistole) ognuna dà all'altra il suo bonus. La lama monomolecolare e il Mako-3 hanno entrambi «+1 danno» e 2 slot: sono la stessa idea, una per la mischia e una per la distanza.
- Una mod fa **una cosa sola** (es. «2 scintille: +1 danno»); quelle che cambiano il comportamento sono rare e più care.
- Le mod cambiano il **comportamento**, non solo i numeri (es. «Spazzata» per una mazza, «Perforare 2» per una lama): ogni arma base ha un proprio elenco di mod compatibili.
- Le mod si comprano al Briefing (e ai terminali, §2.8); le **casse** danno mod diverse o armi con più slot e mod già inserite a caso.

### 2.3 Overclock e scintille (non confonderli)
- **Overclock** (OC) = la vecchia Fatica. Si spende per **forzare il movimento** (1 OC = 1 movimento) e per le **abilità** (2 OC per usarne una, primaria compresa). Mai per le mod.
- **Scintille** = le saette sui dadi neri. Attivano gli effetti **attivi** degli oggetti (e altro). Mai per il movimento.
- **Dado competenza in più** (regola che resta, REGOLE-v2 §6): in un attacco si tirano i dadi competenza del tipo di attacco (anche zero). **Dopo il tiro** il giocatore può spendere **1 OC per aggiungere un dado competenza nero**, anche partendo da competenza 0, fino a **5 dadi competenza** per attacco. Vale per mischia, distanza e **violazione** (che funziona come un attacco; come si tira esattamente va ancora definito, anche con più dadi di tipi diversi). Già nel codice: `addProficiencyDie`. È questo che rende raggiungibili le scintille delle mod attive anche senza dadi competenza di quel ramo: costa OC, e l'OC serve anche al movimento.
- Facce dei dadi: restano **cuori, scintille, Mancato**. La gittata non sta più sui dadi (conferma di REGOLE-v2 §7).

### 2.4 Abilità = cyberware del corpo
- Le abilità sono **modifiche del corpo**: braccia (lama estraibile), gambe (passi silenziosi o rapidi), vista (ottiche speciali), pelle, ecc.
- Per ogni mercenario c'è una **lista corta di abilità, tutte visibili**; il giocatore **sceglie** quelle del suo mercenario (non c'è pescaggio casuale).
- Possono essere **attive** (costano OC) o **passive**.
- **Bilanciamento** *(ipotesi, 🧪 da verificare dopo che le mod funzionano)*: un'abilità forte costa uno **slot di mod dell'arma principale** (−1 mod). Un solo tipo di prezzo, niente valute nuove. È il secondo livello di bilanciamento: prima si mette a punto il sistema mod.
- Regola di pulizia: **mod = oggetto, usa scintille; abilità = corpo, usa Overclock.**
- **Cadono** i *pin* e il pescaggio casuale delle abilità secondarie (REGOLE-v2 §3 e §4; TODO L1.6 e L4.3).

### 2.5 Cyberdeck per tutti
- Ogni mercenario ha un deck con **2 slot di mod** e una **funzione base** per archetipo.
- **Incursore**: carica i **Demoni** e viola sistemi e cyberware nemici (tutta la rete di `docs/NEMICI.md` §5).
- **Picchiatore — Berserk**: si potenzia, ma **riduce Armatura e ICE** finché dura. Ha un prezzo, così non è sempre acceso.
- **Artigliere — Aggancio** (armi smart che agganciano il bersaglio): è lo specchio del Tracciato (l'Incursore marchia con la rete, l'Artigliere con il deck). Effetto di partenza: sul bersaglio agganciato si ignora la copertura *(da bilanciare)*.
- **Il deck dell'Incursore tira dadi** (violazione = combattimento contro l'ICE). Le sue mod sono di due famiglie: di **potenziamento** (ICE, gittata, valgono per tutti) e di **hacking** (azioni da usare all'occorrenza, a scintille, es. «Ping: vedi i nemici della stanza adiacente» *(esempio a caso, non deciso)*). Il tag `modTags: ["hacking"]` è un **filtro di compatibilità**: tiene dentro quegli slot solo mod di rete.
- **Mod di hacking = azioni a scintille; cyberware = utilità a OC** (es. «attiva i terminali a distanza X»). Stessa regola di pulizia di §2.4.
- Effetto collaterale utile: **tutti hanno un deck, quindi tutti hanno un po' di ICE**; gli slot del deck possono dare ICE («firewall»). Questo chiude la questione Q13 dell'ICE per i non Incursori.
- Costo della funzione base: proposta **Overclock** (coerente con «Overclock = forzare»). 🧪

### 2.6 Briefing, budget, intel
- **Budget unico di 300 eurodollari** per tutto: mod e intel. Sempre 300; il creatore di un contratto può cambiarlo solo per ragioni narrative (come in una missione di Descent in cui gli eroi erano pagati in anticipo).
- **Ogni prezzo è un multiplo di 25 E$** (oggetti, mod, consumabili, tesori, vendite): vale per tutto ciò che si aggiunge in futuro.
- Il **negozio resta**, in **due tab**: «Mod» (si parte da qui) e «Oggetti». I **consumabili** (cure, ricariche) si comprano solo lì. Il giocatore può **vendere l'equip di partenza e comprarne un altro** (ama l'abilità di un mercenario ma vuole un'altra dotazione): se i dadi competenza o le abilità non combaciano, è una sua scelta. Un solo budget da 300€ per tutto. Al Briefing il catalogo è solo **base**: mod **generiche** e **in scorta limitata (1-2 unità al massimo)**. Le mod e gli oggetti dei tesori (rame, argento, oro del legacy) **non entrano mai nel Briefing**: si trovano o si comprano solo in partita (§2.8). *(Più avanti, scorte più ampie per chi gioca di più, ad esempio con potenziamenti dell'utente: ⏳, molto nel futuro.)*
- Il **validatore** del contratto avvisa e **blocca** se il budget è troppo alto o troppo basso.
- **Intel a pagamento**: un tasto che spende il budget per un'informazione sul contratto. A livelli: tipo di nemici → una debolezza → profilo completo.
- **Debolezze e resistenze non sono fisse**: lo stesso nemico, in contratti diversi, ha profili diversi (il nemico è un *template*, il contratto gli applica un profilo). I profili stanno nei dati del contratto, non nel catalogo dei nemici.
- **Il budget che avanza** va con il mercenario in partita e si spende ai terminali; ogni euro rimasto a fine missione si perde (rifornisce munizioni e cure, in narrativa). *(Corregge REGOLE-v2 §4: «i fondi non avanzati si perdono» → ora vale solo a fine missione.)*

### 2.7 Contratti e Fixer
- I contratti si **trovano sulla mappa** e si giocano **da casa**. Il luogo serve solo a **scoprirli** e dà sapore (nome, tema), **mai potenza**: nessun vantaggio «di casa».
- Un contratto sbloccato resta del giocatore e si può rigiocare.
- **Ogni nuova partita su un contratto è nuova.** Dopo un fallimento il nemico «si ricorda»: cambiano una parte delle carte, con un seme diverso ma ripetibile (l'RNG è già con seme).
- I **Fixer** sono giocatori che creano contratti; i contratti ufficiali dell'app hanno un proprio fixer.
- Un contratto, per essere pubblicato, deve essere **vinto dal suo fixer**: il validatore dice «è coerente», la vittoria dice «è battibile». *(Se il pool di profili è casuale, la vittoria prova un solo estratto: da risolvere, §7.)*
- Diventare fixer è un **diritto che si guadagna** con la Fama.

### 2.7b Contratto, missione, stato del giocatore
- **Tre livelli**: il **contratto** è un'intestazione leggera (numero, titolo, didascalia breve, coordinate, `visibility`, `mapId`, fixer segnaposto) che la mappa del mondo mostra senza scaricare la missione; la **missione** è il `MapData` (mappa, pedine, eventi, ricompense, introduzione, obiettivo, budget, profili dei nemici) e si legge solo dopo lo sblocco; lo **stato del giocatore** (sbloccato, tentativi, miglior Fama) sta a parte (locale, poi Firestore).
- Motivi: peso della mappa, **intel segreta** (il profilo dei nemici non si legge dalla scheda del contratto) e fixer che modificano il contratto senza toccare l'editor.
- **Sincronizzazione a senso unico**: il `title` della missione è la fonte, il titolo del contratto è una copia in sola lettura. La **didascalia** appartiene al contratto (la scrive l'autore; lo strumento «Posiziona» potrà proporla dall'introduzione, poi resta indipendente).
- **Stati**: *bloccato* (numero; titolo e didascalia **cifrati**, cioè caratteri casuali che si decifrano allo sblocco; la frase «Fuori dal campo di sincronizzazione», più la distanza e cosa serve per sbloccarlo), *sbloccato* (titolo, didascalia, Gioca; si gioca da casa), *nascosto* (campo previsto, ⏳).
- **Sblocco a 50 m** con la precisione del GPS (`distanza − precisione ≤ 50`), calcolato solo sul dispositivo. Lo sblocco non è istantaneo (deciso 2026-11-12): con il pannello del contratto aperto serve restare a portata per tutta la procedura, con **una sola barra** al posto del tasto Accetta: **violazione** 5 s (metà barra, «Violazione… X%») e poi **decrittazione** 3 s, ognuna metà della barra («Decrittazione… X%», i simboli di titolo e didascalia diventano testo vero; a violazione compiuta lo stato «Bloccato» lampeggia di verde e passa a «Sbloccato»); se si esce dalla portata riparte da zero. *(Durate in prova, 🧪.)* La distanza resta sempre visibile; spariscono solo «Fuori dal campo di sincronizzazione» e il raggio per sbloccare. Il **numero** è collezionabile, stabile e assegnato una volta.
- Test in sviluppo: due contratti generati rispetto alla posizione (~30 m e ~5 km).
- **Percorso a piedi** (deciso 2026-11-12): la mappa potrà mostrare il percorso fino al contratto. Per calcolarlo la posizione di partenza esce dal dispositivo verso un servizio di routing; l'utente è avvisato nei termini che accetta all'inizio. Vincolo: costo zero per noi e per l'utente. Lo **sblocco resta locale** (50 m in linea d'aria, nessuna posizione inviata per sbloccare).

### 2.8 Progresso, Fama, Reputazione
- **Progresso**: la risorsa condivisa della missione (era «Fama» in REGOLE-v2 §9, e «Conquista»; nel codice resta `progress`). A **0 la missione è fallita**. Cambiano solo i testi.
- **Fama**: la risorsa del giocatore **come mercenario**. A fine missione il Progresso diventa Fama; **missione fallita = Fama 0** (per ora).
- **Reputazione**: la risorsa dello stesso giocatore **come fixer**. È separata dalla Fama e non è collegata al profilo mercenario.
- Fama e Reputazione danno **status e accessi, mai potere in partita**.
- **Terminali in missione**: spendono i soldi rimasti e quelli trovati. Vendono anche cose che al Briefing non ci sono (cure, ricariche, mod monouso) a prezzi più alti: il Briefing è prevedibile ed economico, il terminale è flessibile e caro.
- **Tesori e terminali** *(valori di partenza, 🧪)*: i mazzi **rame / argento / oro** del legacy restano le tre fasce di rarità, ma vivono solo in partita. Quando in mappa si trova una cassa di una fascia, **da quel momento i terminali della missione vendono** le mod/oggetti di quella fascia al prezzo della fascia (legacy: **250 / 500 / 750**). I soldi vengono dal budget avanzato e dagli **E$ trovati in mappa**, anche sconfiggendo i **nemici più potenti**. Con questi prezzi, le fasce alte si comprano solo a partita avanzata e questo è voluto. Niente salvataggio tra una partita e l'altra: coerente con «l'equip trovato si perde» (§2.1).
- Ricordare quali tesori un giocatore ha già visto in partite precedenti è un'altra questione, **da riprendere più avanti** (non si implementa).

## 3. 🧪 Da provare (solo nel prototipo)

- **Tipi di danno**: sono già due (fisico → armatura, Intrusione → ICE), più gli stati (Folgorazione, Surriscaldamento, Contagio). Una «debolezza elettrica» si aggancia a Folgorazione. Niente nuovi tipi finché non servono.
- Le debolezze come **bonus, non come muro** (es. +50%, il resto funziona ancora); nello stesso contratto nemici con debolezze diverse, così il build è un compromesso.
- **Intel imperfetta**: quella economica può essere vecchia o sbagliata.
- **Pool di profili** per contratto, uno estratto a ogni partita.
- **Fama dipendente dalla difficoltà**, con rendimenti decrescenti sulle ripetizioni (contro il farming).
- **Formula di minaccia** del validatore (quanto «pesa» un nemico, una trappola, un'intel): è il cuore del bilanciamento.
- Valori di **Berserk** (quanto Armatura e ICE perde, quanto dura, costo) e di **Aggancio**.
- Economia delle **scintille**: quante servono, quante ne escono dai dadi neri.
- Un mercenario senza dadi neri di un ramo non attiva le mod attive di quel ramo: va tenuto d'occhio.
- Tabelle **pesate** (non random puro) per i bauli con mod inserite.

## 4. ⏳ Rimandato

- **Territori delle Corp** (la prima espansione, prima delle Badlands): l'influenza delle Corp dipende dai luoghi veri (ospedali → Corp medica, caserme → militare, industria → manifatturiera). Prezzi diversi ai terminali. 3-4 Corp bastano; c'è già «milITA». Appartengono al *contratto*, non alla posizione di chi gioca.
- Item level e nemici scalati; Badlands; monetizzazione.
- Più di 3 mercenari di base; abilità di cyberware oltre il prototipo.
- Scelta «N abilità tra M» più larga, se la lista corta non basta.
- Funzioni del deck per l'Artigliere oltre l'Aggancio (furtività: per ora la gestiscono le abilità cyberware «passi silenziosi»).

- Strumento **«Posiziona»** nell'editor (sceglie un punto sulla mappa e genera il contratto dalla missione; riusa `WorldMapComponent`); contratti **nascosti**; contatore della collezione (rivelerebbe i nascosti); teaser pubblico.

## 5. Contratti degli altri: qualità
- Reputazione e valutazioni dei giocatori come filtro (⏳ la moderazione vera).
- Fixer modulare (nome, logo, specialità, 2-3 contatti dal catalogo): ⏳.

## 6. Sezioni di REGOLE-v2 sostituite
- **§0** «nessun livello… pin»: resta l'assenza di livelli, **cadono i pin**.
- **§3** Pin e abilità secondarie casuali → §2.4. La scheda eroe perde equipaggiamento e fondi (come già scritto), e **abilità secondarie = cyberware scelti**.
- **§4** Briefing: punti 2 («mani, armatura, oggetti vari, pozioni, zaino»), 3 (abilità pescate a caso), 4 (pin dei Network) → §2.1, §2.4, §2.6. Fondi che avanzano → §2.6.
- **§7** Cyberdeck «arma dell'Incursore» → §2.5: ognuno ha un deck, la sua funzione dipende dall'archetipo.
- **§9** «Fama» (risorsa di missione) → **Progresso**; «Fama» ora è il punteggio del giocatore (§2.8).
- **§12**: la regola «i pin valgono come loadout» cade.
- **§13**: Fixer e Corp restano fuori dal primo prototipo.

## 7. Punti aperti
- **Mod di hacking su armi e armature**, non solo sul deck. **Deciso (2026-11-13)**: possono montarle anche i mercenari con competenza hacking 0; l'Incursore però deve essere più bravo. **Aperto il «come»**: alcune mod di hacking potranno chiedere di tirare comunque *n* dadi competenza per verificare che la mod funzioni; altre soglie o requisiti si decidono col tempo. Idea non decisa: solo su oggetti «smart» (`modTags: hacking`). Si lasciano volutamente più meccaniche possibili, da provare in gioco.
- **Violazione**: come si tira esattamente (dadi di tipi diversi come un attacco?).
- Slot del Briefing: valori 2/1/1 e Incursore 0-1/1/2-3 sono di partenza. Budget da tarare perché con 300€ non si riempiano tutti gli slot.
- Mod legate a un oggetto venduto: rimborso (deciso) ma da implementare insieme alla fine di `BASE_KIT`.
- Abilità: c'è una **primaria fissa sulla scheda** del mercenario oltre alle scelte, o ogni abilità è nella lista corta?
- Quanti **slot del corpo** per il cyberware (braccia, gambe, vista, pelle)? Il prototipo ne usa uno o due.
- Se il pool di profili è casuale, **come si prova la «battibilità»** di un contratto (un estratto? tutti?).
- **Network** (eroi CPU): senza pin, cosa portano dal proprietario? (loadout scelto da lui?)
- Cosa succede a **Fama** con le ripetizioni e dove si salva il record (oggi non c'è un profilo giocatore).
- Nome di codice di **Fama/Reputazione** quando serviranno (oggi non esistono nel codice: solo `progress`).

## 8. Prototipo minimo (Briefing del contratto di prova → `/play/test`)

Ordine dei passi, file e criteri in `docs/PIANO-PROTOTIPO.md` (contratti sulla mappa inclusi, §2.7b).
- **1 Picchiatore**: arma (2 slot), armatura (2 slot), deck (2 slot) con **Berserk**.
- 3-4 mod (almeno una attiva che usa scintille), 2-3 abilità cyberware, 1-2 nemici.
- Schermata di **Briefing** con budget 300, scelta delle mod e un tasto intel.
- Niente Demoni, nodi, Fixer, Corp, Fama: se è divertente, si allarga.
- Dadi: finché le facce nuove (L0.8/L3.1) non sono fatte, i nemici col dado giallo non vanno messi in gioco (quasi zero danni).

## 9. Nomi
- Nel codice, **niente alias**, rinomina a passi piccoli (regola di `CLAUDE.md`).
- `zones` esiste già in `MapData` (aree di evento): per le Corp si usa **`territory`**.
- `progress` resta (è già il Progresso); i testi «Fama» in interfaccia diventano «Progresso» (follow-up di L0.2).
- Nuovi termini: Mod, Cyberware, Cyberdeck, Contratto, Fixer, Eurodollari, Reputazione.
