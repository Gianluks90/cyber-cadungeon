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
- Ogni oggetto base ha **slot** per le mod. Prototipo: **2 per l'arma, 2 per l'armatura, 2 per il deck**.
- Si parte con pochi mercenari ben fatti e si lavora soprattutto sul **sistema di mod** (il Descent base ne aveva 20; non serve arrivarci).
- L'equip **trovato** in missione **si perde a fine partita**: nessun bilanciamento a lungo termine. (Un item level con nemici scalati resta un'idea futura, ⏳.)

### 2.2 Mod
- Una mod dà a un oggetto effetti **passivi**, **attivi** o entrambi.
- **Passivo**: basta avere l'oggetto equipaggiato.
- **Attivo**: si spendono **scintille** (le saette dei **dadi neri**, i dadi competenza).
- Esempio: una mod che dà passivamente *Perforare 1* e, spendendo 2 scintille, *Perforare +1*.
- Le mod cambiano il **comportamento**, non solo i numeri (es. «Spazzata» per una mazza, «Perforare 2» per una lama): ogni arma base ha un proprio elenco di mod compatibili.
- Le mod si comprano al Briefing (e ai terminali, §2.8); le **casse** danno mod diverse o armi con più slot e mod già inserite a caso.

### 2.3 Overclock e scintille (non confonderli)
- **Overclock** (OC) = la vecchia Fatica. Si spende per **forzare il movimento** (1 OC = 1 movimento) e per le **abilità** (2 OC per usarne una, primaria compresa). Mai per le mod.
- **Scintille** = le saette sui dadi neri. Attivano gli effetti **attivi** degli oggetti (e altro). Mai per il movimento.
- Facce dei dadi: restano **cuori, scintille, Mancato**. La gittata non sta più sui dadi (conferma di REGOLE-v2 §7).

### 2.4 Abilità = cyberware del corpo
- Le abilità sono **modifiche del corpo**: braccia (lama estraibile), gambe (passi silenziosi o rapidi), vista (ottiche speciali), pelle, ecc.
- Per ogni mercenario c'è una **lista corta di abilità, tutte visibili**; il giocatore **sceglie** quelle del suo mercenario (non c'è pescaggio casuale).
- Possono essere **attive** (costano OC) o **passive**.
- **Bilanciamento**: un'abilità forte costa uno **slot di mod dell'arma principale** (−1 mod). Un solo tipo di prezzo, niente valute nuove.
- Regola di pulizia: **mod = oggetto, usa scintille; abilità = corpo, usa Overclock.**
- **Cadono** i *pin* e il pescaggio casuale delle abilità secondarie (REGOLE-v2 §3 e §4; TODO L1.6 e L4.3).

### 2.5 Cyberdeck per tutti
- Ogni mercenario ha un deck con **2 slot di mod** e una **funzione base** per archetipo.
- **Incursore**: carica i **Demoni** e viola sistemi e cyberware nemici (tutta la rete di `docs/NEMICI.md` §5).
- **Picchiatore — Berserk**: si potenzia, ma **riduce Armatura e ICE** finché dura. Ha un prezzo, così non è sempre acceso.
- **Artigliere — Aggancio** (armi smart che agganciano il bersaglio): è lo specchio del Tracciato (l'Incursore marchia con la rete, l'Artigliere con il deck). Effetto di partenza: sul bersaglio agganciato si ignora la copertura *(da bilanciare)*.
- Effetto collaterale utile: **tutti hanno un deck, quindi tutti hanno un po' di ICE**; gli slot del deck possono dare ICE («firewall»). Questo chiude la questione Q13 dell'ICE per i non Incursori.
- Costo della funzione base: proposta **Overclock** (coerente con «Overclock = forzare»). 🧪

### 2.6 Briefing, budget, intel
- **Budget unico di 300 eurodollari** per tutto: mod e intel. Sempre 300; il creatore di un contratto può cambiarlo solo per ragioni narrative (come in una missione di Descent in cui gli eroi erano pagati in anticipo).
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

### 2.8 Progresso, Fama, Reputazione
- **Progresso**: la risorsa condivisa della missione (era «Fama» in REGOLE-v2 §9, e «Conquista»; nel codice resta `progress`). A **0 la missione è fallita**. Cambiano solo i testi.
- **Fama**: la risorsa del giocatore **come mercenario**. A fine missione il Progresso diventa Fama; **missione fallita = Fama 0** (per ora).
- **Reputazione**: la risorsa dello stesso giocatore **come fixer**. È separata dalla Fama e non è collegata al profilo mercenario.
- Fama e Reputazione danno **status e accessi, mai potere in partita**.
- **Terminali in missione**: spendono i soldi rimasti e quelli trovati. Vendono anche cose che al Briefing non ci sono (cure, ricariche, mod monouso) a prezzi più alti: il Briefing è prevedibile ed economico, il terminale è flessibile e caro.

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
- Abilità: c'è una **primaria fissa sulla scheda** del mercenario oltre alle scelte, o ogni abilità è nella lista corta?
- Quanti **slot del corpo** per il cyberware (braccia, gambe, vista, pelle)? Il prototipo ne usa uno o due.
- Se il pool di profili è casuale, **come si prova la «battibilità»** di un contratto (un estratto? tutti?).
- **Network** (eroi CPU): senza pin, cosa portano dal proprietario? (loadout scelto da lui?)
- Cosa succede a **Fama** con le ripetizioni e dove si salva il record (oggi non c'è un profilo giocatore).
- Nome di codice di **Fama/Reputazione** quando serviranno (oggi non esistono nel codice: solo `progress`).

## 8. Prototipo minimo (su `/play/test`)
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
