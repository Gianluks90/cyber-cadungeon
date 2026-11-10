# Regolamento di Cyber CADungeon (v2, bozza 0)

Questo file nasce da `docs/legacy/REGOLE.md` (v1) e lo adatta al nuovo gioco. Per ogni sezione c'è l'etichetta **[resta]**, **[cambia]**, **[cade]** o **[nuovo]** rispetto alla v1. I numeri segnati *(da bilanciare)* sono valori di partenza.
Il motore resta quello: LOS, movimento, azioni contestuali, eventi, validatore. Le regole qui sotto non vanno testate a tavolino, vanno ottimizzate in gioco.

## 0. Principi

- **Poca aleatorietà** [resta]: l'armatura è fissa, la gittata non si tira, il caso non domina la tattica.
- **Budget fisso** [nuovo]: ogni eroe ha sempre **3 dadi extra** e **3 punti abilità**. Cambia la distribuzione, non la potenza totale. Nessun livello: la progressione è di maestria (pin) e di sblocchi, mai di statistiche.
- **L'Avversario è un ruolo** [resta]: le stesse regole valgono per lo script o per un giocatore umano.
- **Il risultato di ogni tiro lo decide l'host**; i dadi 3D mostrano soltanto [resta].
- **Una missione = un contratto** [nuovo]: è una mappa del motore (`MapData`) più metadati. Si raccoglie fisicamente, si gioca quando si vuole.

## 1. Glossario [nuovo]

| Termine | Vecchio nome | Note |
|---|---|---|
| **Avversario** | Maligno / Megacorp | il ruolo opposto (CPU o umano) |
| **Allarme** | Odio | risorsa dell'Avversario |
| **Intrusione** | Magia | tipo di attacco dell'Incursore |
| **Picchiatore / Artigliere / Incursore** | Spettro (ex runner) | i tre archetipi |
| **Network** | fantasmi / compagni / Contatti | gli eroi CPU che riempiono la squadra |
| **Briefing** | città / negozio iniziale | preparazione prima della missione |
| **Fondi** | monete | i 300 del Briefing e quelli trovati in missione |
| **Terminale** | glifo | Fama, commercio e rientro; rete **esterna**, non hackerabile |
| **Nodo** | punto di accesso | rete **locale** dell'edificio: si hackera, si sovraccarica |
| **Fama** *(nome provvisorio)* | Conquista | risorsa condivisa e punteggio finale |
| **Fatica** | Energia | resta il nome nel codice finché non si rinomina |

## 2. Squadra e archetipi [nuovo]

- Una squadra è sempre di **3 eroi**: uno per archetipo. Il giocatore ne controlla uno; gli altri sono **Network** (CPU) o altri giocatori (sezione 12).
- Ogni eroe ha un **archetipo primario** (lo slot che occupa) e una **distribuzione**: dadi extra e punti abilità su tre rami, sempre 3 in tutto.

| Archetipo | Attacco | Ramo abilità | Portata |
|---|---|---|---|
| 🔨 **Picchiatore** | mischia | combattimento | 1 (2 con armi lunghe) |
| 🔫 **Artigliere** | distanza | astuzia | scritta sull'arma |
| 💻 **Incursore** | Intrusione | hacking | dal deck, da un punto di accesso |

- **Copertura**: la squadra è valida se l'unione degli archetipi dei tre eroi copre tutti e tre i ruoli almeno una volta. Quindi c'è **sempre almeno un Incursore** (minimo 1 punto di Intrusione) che può usare un cyberdeck: Demoni, nodi e Tracciato non restano mai senza risposta. (Artigliere puro + Incursore puro + Artigliere/Incursore: non valida, manca la mischia.) Si verifica nella schermata `/party/:map`, prima della lobby.
- **Eroe 1,1,1** (factotum): ammesso, raro, **più debole di uno puro** (stat base più basse o abilità principale meno incisiva) *(da bilanciare)*.
- L'eroe ibrido ha **dadi e abilità** distribuiti come da scheda (es. 2 mischia + 1 distanza; 2 combattimento + 1 astuzia): la somma è sempre 3.

## 3. Scheda eroe [cambia]

```json
{
  "id": "…", "name": "…", "class": "…", "archetype": "brawler | gunner | raider",
  "wounds": 12, "speed": 4, "fatigue": 3, "armor": 2, "value": 3,
  "dice":   { "melee": 2, "ranged": 1, "intrusion": 0 },
  "skills": { "combat": 2, "cunning": 1, "hacking": 0 },
  "ability": "abilità principale, stampata sulla scheda"
}
```

- **Ferite** a multipli di 4 [resta]; **movimento**, **fatica**, **armatura** fissi.
- **Abilità principale**: una per eroe, sulla scheda [resta].
- **Nessun parametro specifico per archetipo**: la portata viene sempre dall'**oggetto** (arma dell'Artigliere, cyberdeck dell'Incursore), non dalla scheda.
- **Abilità secondarie**: tante carte per ramo quanti punti si hanno in quel ramo, **casuali** (sezione 4) [cambia].
- **Pin** [nuovo]: ogni eroe ha 3 slot di abilità secondarie. Giocando l'eroe si sbloccano i pin (1 → 2 → 3). Un pin fissa una abilità già vista (pescata almeno una volta) e rispetta la distribuzione (niente pin di hacking se hai 0 punti lì). La progressione è dell'**eroe**, non del giocatore e non dell'uso della singola abilità.
- **Valore** (2–4): la Fama che il gruppo perde se l'eroe va a terra [resta].
- Il campo `coins` e l'equipaggiamento iniziale non stanno più nella scheda: li decide il Briefing.

## 4. Briefing [nuovo]

Prima di ogni missione, dopo la scelta della squadra:
1. **Fondi**: ogni giocatore ha **300** da spendere nel negozio comune (stesso catalogo per tutti, scorte non limitate tra giocatori). I fondi non avanzati si perdono: non c'è portafoglio persistente.
2. **Equipaggiamento**: mani (max 2 simboli), 1 armatura, 2 oggetti vari, 3 pozioni, zaino da 3 [resta come 3c]. L'Incursore sceglie il suo **cyberdeck**, che ne determina il raggio base di Intrusione.
3. **Abilità secondarie**: le abilità extra del proprio eroe si **pescano a caso** (con il seme legato al contratto: riavviare non rigenera il pescaggio) tranne quelle in pin.
4. **Network**: gli altri slot della squadra sono eroi di altri giocatori, controllati dall'host. Portano i **pin del proprietario**; il resto è casuale.

## 5. Round e azioni [resta]

Turno degli eroi, turno dell'Avversario, fine round. Azioni: **Avanzare** (movimento + 1 attacco), **Correre** (movimento ×2), **Combattere** (2 attacchi). Ordini di **Prepararsi**: Mira, Schivata, Riposo, Guardia. Vale tutta la sezione 1, 2 e 2f della v1.

## 6. Fatica [resta]

1 fatica = +1 punto movimento, oppure +1 dado competenza in attacco (fino a 5). Si recupera con l'ordine Riposo e con la pozione.

## 7. Combattimento [cambia]

- **Pool**: dado base (con la faccia Mancato) + dadi dell'arma + **dadi competenza neri** (quelli extra dell'eroe) [resta].
- **Facce dei dadi**: solo **cuori** (danno), **scintille** (effetti) e **Mancato**. La gittata **non c'è più**: va rifatto `docs/dadi-facce.md` e rigenerati i temi.
- **Danno** = cuori + bonus − (armatura − Perforare), minimo 0 [resta].
- **Picchiatore** (mischia): il bersaglio deve essere adiacente; con armi lunghe ("Raggiungere") a distanza 2 con la vista.
- **Artigliere** (distanza): servono linea di vista e distanza ≤ **gittata dell'arma** (campo `range` dell'oggetto). Niente attacco a distanza su un adiacente.
- **Incursore** (Intrusione) [nuovo]: **nessuna linea di vista**, ma serve un **punto di accesso** attivo (un **nodo** della rete locale: telecamera, porta elettronica, nodo ostile; i **Terminali** di commercio e rientro **no**) entro **N caselle** dal bersaglio, con N = **raggio base del cyberdeck equipaggiato** (un oggetto, come l'arma dell'Artigliere) più i **bonus delle abilità di hacking** assegnate a inizio missione e di eventuali altri oggetti. Il punto di accesso è un segnalino (`markers`, `interact`): estende l'esistente.
- **Cyberdeck = l'arma dell'Incursore** [nuovo]: lo equipaggia chi ha almeno 1 dado di Intrusione; un oggetto che dà (1) i **dadi** del suo attacco di Intrusione, che si sommano ai dadi competenza di hacking, (2) il **raggio base**, (3) l'**ICE**. Si potenzia con altri oggetti e con le abilità di hacking.
- **ICE** [nuovo]: l'**armatura digitale**. Contro l'Intrusione il danno è cuori + bonus − (**ICE** del bersaglio − Perforare); l'armatura fisica non conta, e l'ICE non conta contro gli altri attacchi. Ogni bersaglio ha un valore ICE (nemici, Sistemi, Demoni, eroi). Un eroe senza cyberdeck ha ICE 0; altri oggetti e abilità ("firewall") ne possono dare.
- **Mondo reale e rete** [nuovo]: con un'arma l'Incursore usa i dadi dell'arma e subisce l'armatura fisica; con un'Intrusione usa i dadi del cyberdeck e l'ICE del bersaglio. Vale anche quando attacca un nodo con un Demone.
- **Sovraccarico** [nuovo]: azione dell'Incursore su un nodo entro il suo raggio (costo in Fatica *da bilanciare*). **Interrompe** il tracciamento e dissolve il Demone, ma il nodo è **fuori uso per il resto della missione** (nessuno lo può più usare come punto di accesso).
- **Mostri**: la gittata è un campo fisso `range` (non più dai dadi). Le abilità "+N Gittata", Stregoneria e Comando vanno riscritte (*da definire*).
- Tutte le scintille, la **Spazzata**, l'**Esplosione**, il **Soffio** e le scale restano come nella v1.

## 8. Stati e parole chiave [resta]

Gli stati sono conti di segnalini sulla pedina (sezione 2c della v1). **Confermati**:
- **Fiamma** (etichetta cyber: *Surriscaldamento*) [resta]
- **Veleno** (*Contagio*) [resta]
- **Folgorazione** (*Cortocircuito*) [nuovo]. Proposta *(da bilanciare)*: piazzamento e tiro di inizio turno come Fiamma; per ogni segnalino rimasto: **−1 Fatica** (eroi), **−1 velocità** (umanoidi nemici), **Stordimento** (macchine, una volta). Gli eroi con Incursore perdono anche **−1 al raggio del cyberdeck** per segnalino.
- **Tracciato** [nuovo], solo sull'Incursore: lo piazza un **tracciamento** (Mancato sul dado base dell'Intrusione). I nemici con Intrusione possono bersagliarlo **senza LOS**. Si toglie se **muore il Netrunner** che lo sfrutta o se il **nodo** da cui è partito viene **sovraccaricato**.

**Da valutare**: **Rete** (Ragnatela, qui un'etichetta tipo *Inceppamento*) e **Stordimento** (*Riavvio*). Restano le parole chiave Aura, Paura, Presa, Immortale, Contraccolpo (2c e 2d della v1).
Le **macchine** sono immuni a Veleno e Fatica e vulnerabili a Stordimento e Intrusione.

## 9. Terminali, Fama e caduta degli eroi [cambia]

I **Terminali** sono i vecchi glifi, con tre funzioni:
- **Fama**: attivarlo la prima volta dà **+3 Fama** (come i glifi), una volta sola. Premia l'esplorazione.
- **Commercio** [nuovo]: da adiacente, "Usa terminale" apre il negozio (pozioni, oggetti, vendita a metà prezzo). Costo in movimento *(da bilanciare)*. Qui si spendono i **Fondi** trovati nella missione.
- **Rientro**: un eroe a terra rientra da un terminale attivo (sotto).
- **Terminale di partenza**: c'è sempre, in ogni mappa. Gli eroi vengono piazzati intorno a lui a inizio missione ed è **già attivo**: garantisce sempre un punto di rientro e un negozio. Non dà Fama.
- **Niente viaggio rapido**: come in Descent originale, i terminali non sono collegati tra loro.
- **Rete esterna**: i Terminali sono collegati a una rete esterna (la rete dei mercenari), quindi **non si possono sovraccaricare** né usare come punto di accesso. I **nodi** (rete locale dell'edificio) sono un'altra cosa (sezione 7).

**Fama** *(provvisoria: da rinominare)*:
- Risorsa condivisa; il valore iniziale lo fissa il contratto.
- **Guadagni**: terminali, scrigni (+2/+4), azioni importanti, obiettivo completato.
- **Perdite**: eroe a terra (pari al suo Valore), mazzo dell'Avversario finito (−3).
- A **0** la missione è fallita.
- A fine partita, **guadagnati − persi = punteggio** (record personale).

**Eroe a terra** (a zero ferite) [cambia]: perde metà dei Fondi *(da bilanciare)*, il gruppo perde Fama pari al suo Valore, la pedina esce dalla mappa e rientra dal round dopo, a ferite piene, sulla casella di un **terminale attivo e scoperto**, o su una **casella libera adiacente**, gratis (c'è sempre almeno quello di partenza). Quindi nessun eroe resta fuori per sempre: il costo è la Fama persa e i Fondi dimezzati. La missione fallisce solo a Fama 0.
**Morte permanente** (effetto dell'evento `permadeath`) [resta].

**Fondi in missione**: segnalini Denaro e bottini danno Fondi **personali** (non del gruppo, come nella v1). Si spendono ai terminali e non sopravvivono alla missione.

## 9b. Copertura e furtività [nuovo]

**Principio**: poche regole, tutte calcolate **solo quando succede qualcosa** (un attacco, un nemico che si attiva, uno sparo). Niente coni di vista, niente ricalcoli a ogni frame. I dati statici (muri bassi, mobili) si preparano **una volta** al caricamento della mappa, in griglie a bit.

**Altezze**
- **Pieno** [resta]: blocca movimento e vista.
- **Mezza altezza** [nuovo]: **non blocca la vista**, dà copertura, si **scavalca** con costo **2 punti movimento** *(da bilanciare)*. È un segmento sul bordo tra due caselle (muretto) oppure una casella (mobile, barriera).
- **Libero**.

**Copertura**
- Un bersaglio è in copertura se, **nella direzione da cui arriva l'attacco** (una delle 8), la casella o il bordo adiacente a lui è a mezza altezza. È un solo controllo, a ogni attacco.
- Effetto: **+1 armatura contro gli attacchi a distanza**. Non vale per mischia, Intrusione (ignora la LOS), Soffio ed Esplosione.
- Vale per eroi e nemici, e il giocatore la vede prima di sparare.

**Appostarsi** (nuovo ordine di Prepararsi, insieme a Mira, Schivata, Riposo, Guardia)
- Un eroe con l'ordine è **Nascosto** se ha una **copertura adiacente** (in qualunque direzione) e **nessun nemico adiacente**.
- Si sceglie: dipende dall'**approccio del giocatore**, non è automatico.
- L'ordine si perde se l'eroe **spende punti movimento**, **subisce ferite** o **attacca** (come Mira e Guardia).
- **Archetipo e abilità**: gli eroi con abilità di **astuzia o hacking** possono muoversi fino a **2 caselle** mantenendo l'ordine (da una copertura all'altra). Gli **attacchi silenziosi** (armi silenziate, Intrusione riuscita) **non** rompono l'ordine. Il Picchiatore, di norma, lo perde al primo passo o al primo colpo.

**Allerta dei nemici** (un campo `alert` per nemico)
- **Dormiente** (già esiste: area non rivelata) → **Di guardia** → **Sospettoso** → **Allertato**.
- **Vigilanza**: raggio in caselle, campo della scheda del nemico *(da bilanciare)*.
- Un nemico Di guardia o Sospettoso, **quando si attiva**, nota un eroe se: distanza ≤ vigilanza, ha **LOS**, e l'eroe **non è Nascosto**. → **Allertato**.
- Un eroe Nascosto viene notato solo da un nemico **adiacente**.
- **Sospettoso**: va verso la causa (casella dello sparo o ultima posizione vista). Se in **2 round** non trova niente, torna Di guardia. Se vede un eroe non Nascosto, è Allertato.
- **Allertato**: comportamento attuale dello script. Non torna indietro per tutta la missione (semplificazione).
- **Allarme**: **+1** per ogni nemico che diventa Allertato *(da bilanciare)*.

**Rumore** (un evento per azione, nessun calcolo di percorso)
- **Sparo** (distanza, arma non silenziata): i nemici **Di guardia nella stessa area** entro 6 caselle diventano **Sospettosi** verso la casella dello sparo.
- **Mischia**: solo entro 2 caselle.
- **Intrusione riuscita**: **silenziosa**. Con un **Mancato** = **tracciamento**: Allarme +1, l'Incursore diventa **Tracciato** (sezione 8) e può apparire un **Demone** al nodo (`docs/NEMICI.md`).
- Il rumore non si propaga tra aree diverse (le aree esistono già nel motore: è un confronto di id).
- Correre non fa rumore (per ora).

**Telecamere** (Sistema, segnalino)
- Hanno vigilanza e LOS come un nemico, ma **non si lasciano ingannare da Nascosto**: vedono anche gli eroi appostati.
- Quando vedono un eroe: **Allarme +1** e i nemici entro 6 caselle diventano **Sospettosi** verso di lui. Al massimo una volta per round per telecamera.
- L'Incursore le **disattiva** con l'Intrusione (come attaccare un bersaglio).
- Fisse, senza rotazione (per ora).

**Peso sul browser**: copertura = 1 controllo per attacco; vigilanza = 1 raggio + la LOS già esistente, solo all'attivazione dei nemici non Allertati; rumore = un confronto di distanza e di area per sparo. Nessun lavoro per frame.

## 10. Avversario [cambia]

- **Allarme** (ex Odio): +1 per eroe a ogni round *(da bilanciare)*. Spende Allarme per evocazioni e trappole, solo in spazi che nessun eroe vede.
- **Mazzo dell'Avversario** (ex Mazzo del Male): resta la struttura (Evocazione, Evento, Trappola, Potere). Le carte "firmate dalla Corp" arrivano dopo, sopra un gioco che regge.
- **Mostri**: la squadra è sempre di 3 eroi, quindi **una sola colonna di ferite** per scheda (non più 2-3/4/5 giocatori).
- **Famiglie di nemici** (prime 8-10 voci, *da scrivere*):
  - 🧍 **Umanoidi**: bruto, tiratore, infiltrato/netrunner. Tre ruoli speculari agli eroi
  - 🤖 **Macchine**: droni, torrette, mech. Poteri e debolezze diversi
  - 🔌 **Sistemi** (segnalini): telecamere, porte elettroniche, terminali ostili, ICE. Danno Allarme e sono bersaglio dell'Incursore
- Già in gioco (cyber): `corp-guard`, `rogue-netrunner`, `sentry-drone`, `war-mech`. Mancano i sistemi.

## 11. Eventi, obiettivi e contratti [resta]

Tutto il sistema di eventi, variabili, aree, incontri, zone, prove e inneschi (sezione 2e della v1) resta com'è. È il motore dei contratti scritti. Il **validatore** è il cancello di qualità: un contratto è valido se la Verifica non dà errori. Un contratto valido non è per forza giocabile: la verifica di giocabilità è *da decidere*.

## 12. Modalità di gioco [nuovo]

- **Singolo**: un giocatore + 2 Network contro l'Avversario CPU.
- **Cooperativa**: fino a 3 giocatori (uno per eroe) contro l'Avversario CPU. Ognuno applica i **propri** pin.
- **Multiplayer totale**: fino a 4 giocatori, uno è l'Avversario. **Niente progresso** (non si sbloccano pin né oggetti); i pin esistenti valgono come loadout.

## 13. Fuori scope per ora

Corp e influenza di zona, Fixer, Badlands, contratti rari, valuta persistente, famigli (potrebbero diventare droni), prove d20 (sezione 4 v1, in pausa), anti-GPS-falso, backend, luce e ombra (neon, zone buie), coni di vista, pattuglie con percorso, telecamere rotanti, parametro del contratto *silenzioso/misto/aperto*.

## 14. Punti aperti

- 🏷️ Nome definitivo di **Fama** (alternative: Slancio, Margine)
- 🎲 Facce nuove dei dadi (cuori, scintille, Mancato) e bilanciamento
- ⚖️ Come si bilancia l'eroe 1,1,1
- 🧱 Quanti punti di accesso può usare l'Incursore in un turno
- 🖥️ Aspetto del token **Terminale**: computer a pavimento (occupa una casella) o strumento a parete (non blocca)? Cambia LOS, movimento e caselle di rientro
- 💻 Catalogo dei **cyberdeck**: dadi, raggio base, ICE, prezzo; e di quanto le abilità di hacking li aumentano
- 🏠 Il **Terminale** come interfaccia della rete esterna: collegamento narrativo con il Fixer e il Ritrovo (da pensare)
- ☠️ Numero di tentativi di un contratto fallito
- 🎒 Tempo di vita del contratto in tasca (scade?)
- 🥷 Valori di partenza: vigilanza dei nemici, raggio dello sparo (6), copertura (+1), scavalcare (2), Allarme per rilevamento (+1)
- 🥷 Gli attacchi a sorpresa su nemici non Allertati danno un bonus (es. +2 danni in mischia)? Per ora no
- 🥷 Le armi silenziate: tag dell'oggetto o abilità? Costano di più al Briefing?
