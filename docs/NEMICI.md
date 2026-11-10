# Nemici di Cyber CADungeon (bozza 1)

Parte dalle schede legacy (`docs/legacy/cards/monsters.md`) e dal regolamento v2 (`docs/REGOLE-v2.md`). Tutti i numeri sono valori di partenza *(da bilanciare)*.

## Come leggere le schede

- **Una sola colonna di ferite**: la squadra è sempre di 3 eroi, quindi vale il vecchio scaglione "4 giocatori" (3 eroi + Avversario). **N / P** = normale / potenziato.
- **Potenziato**: ferite e armatura in più, **dado nero** in più e abilità aggiuntive (come nelle schede legacy).
- **Gittata**: campo fisso (non più dai dadi). **Vigilanza**: raggio in caselle con cui nota gli eroi (sezione 9b del regolamento).
- **Colore dei dadi base** (con la faccia Mancato): rosso = mischia, blu = distanza, bianco = Intrusione.
- Gli stati e le parole chiave non elencate (Perforare, Esplosione, Contraccolpo, Stordire, Spazzata, Bruciare, Attacco veloce, Volo, Comando, Immortale, Raggiungere) restano quelle della v1.

## 1. Tabella

| Nemico | Famiglia | Dim. | Attacco | Gittata | Ferite N/P | Vel. | Arm. N/P | Dadi (N) | Vig. |
|---|---|---|---|---|---|---|---|---|---|
| **Teppista** | 🧍 umanoide (Picchiatore) | 1×1 | mischia | 1 | 3 / 4 | 4 | 1 / 2 | rosso, verde | 5 |
| **Corazzato** | 🧍 umanoide (Picchiatore) | 2×2 | mischia | 1 | 9 / 10 | 3 | 4 / 5 | rosso, 2 verdi, giallo | 4 |
| **Tiratore** | 🧍 umanoide (Artigliere) | 1×1 | distanza | 5 | 3 / 4 | 4 | 0 / 1 | blu, verde | 6 |
| **Cecchino** | 🧍 umanoide (Artigliere) | 1×1 | distanza | 10 | 2 / 3 | 3 | 0 / 1 | blu, giallo | 10 |
| **Bombarolo** | 🧍 umanoide (Artigliere) | 1×1 | distanza | 4 | 3 / 4 | 4 | 1 / 2 | blu, giallo | 5 |
| **Netrunner** | 🧍 umanoide (Incursore) | 1×1 | Intrusione | 4 (raggio del suo deck) | 3 / 4 | 4 | 0 / 1 | bianco, giallo | 6 |
| **Drone da sorveglianza** | 🤖 macchina mobile | 1×1 | distanza | 4 | 2 / 3 | 6 | 1 / 2 | blu, verde | 7 |
| **Mech da guerra** | 🤖 macchina mobile | 2×2 | distanza | 6 | 10 / 11 | 3 | 4 / 5 | blu, verde, giallo | 6 |
| **Torretta** | 🤖 macchina fissa | 1×1 | distanza | 7 | 4 / 5 | 0 | 2 / 3 | blu, verde | 7 |

(Potenziato: il dado nero si aggiunge a quelli elencati.)

## 2. Abilità speciali

| Nemico | Normale | Potenziato |
|---|---|---|
| Teppista | +1 Danno | +2 Danno, Comando |
| Corazzato | Contraccolpo, Stordire | Contraccolpo, Stordire, Spazzata |
| Tiratore | Perforare 1 | Perforare 2 |
| Cecchino | Perforare 2, **Postazione** | Perforare 3, Postazione |
| Bombarolo | Esplosione 1 | Esplosione 1, Bruciare |
| Netrunner | **Sabotatore**, **Intrusione sugli eroi** | Sabotatore, Intrusione sugli eroi, Stordire |
| Drone | Volo, **Segnale**, **Macchina** | Volo, Segnale, Macchina, Attacco veloce |
| Mech | **Macchina**, Perforare 2 | Macchina, Perforare 3, Esplosione 1 |
| Torretta | **Fissa**, **Macchina**, Attacco veloce | Fissa, Macchina, Attacco veloce, Perforare 1 |

## 2b. ICE (armatura digitale) *(da bilanciare)*

Contro l'Intrusione il danno = cuori + bonus − (ICE − Perforare). Gli **umanoidi senza impianti** hanno ICE 0: l'Intrusione li colpisce al pieno, ma serve sempre un **nodo** entro il raggio del deck.

| Bersaglio | ICE N/P |
|---|---|
| Teppista, Corazzato, Tiratore, Cecchino, Bombarolo | 0 |
| Netrunner (ha un deck) | 2 / 3 |
| Drone da sorveglianza | 1 / 2 |
| Mech da guerra | 2 / 3 |
| Torretta | 1 / 2 |
| Demoni | 1 / 2 |
| Telecamera, Porta elettronica | 1 |
| Terminale ostile | 2 |

## 3. Parole chiave nuove

- **Macchina**: immune a Veleno. Hanno un **ICE** (armatura digitale) più basso dell'armatura fisica, quindi sono vulnerabili all'Intrusione. Vedono come telecamere (non sono ingannate dal Nascosto) *(da valutare)*.
- **Fissa**: non si muove mai; attacca solo se ha LOS entro la gittata.
- **Postazione**: se non si è mosso nel suo turno, +2 danni.
- **Segnale**: la prima volta che nota un eroe, **Allarme +1** e i nemici entro 6 caselle diventano Sospettosi.
- **Sabotatore**: nel suo turno può attivare o disattivare un **Sistema** (telecamera, porta, torretta) entro 6 caselle; le macchine entro 3 caselle da lui hanno +1 danno (come Comando).
- **Intrusione sugli eroi**: il Netrunner **carica hacking** su un eroe entro la sua gittata. Serve **LOS**, a meno che l'eroe sia **Tracciato** (sezione 5 e regolamento, sezione 8): allora può agire su di lui **senza LOS**. Contro un eroe il danno si calcola contro il suo **ICE** (quello del cyberdeck e degli oggetti, 0 se non ne ha), non contro l'armatura fisica.

## 4. Sistemi (segnalini, non pedine)

| Sistema | Funzione | Note |
|---|---|---|
| **Telecamera** | vede anche gli eroi Nascosti; Allarme +1 e nemici Sospettosi | disattivabile con Intrusione |
| **Porta elettronica** | chiusa finché non è sbloccata | si apre con Intrusione o con un evento |
| **Terminale ostile** | **nodo di accesso**: punto per Netrunner e Demoni | l'Incursore lo può requisire |

## 5. Rete: tracciamento, ICE e Demoni

**Tracciamento** (decisione presa)
- Un **Mancato** sul dado base dell'Intrusione = **tracciamento**: l'Incursore diventa **Tracciato** (stato), l'Allarme sale di 1, e può **apparire un Demone** al nodo.
- Un eroe **Tracciato** può essere bersagliato dai nemici con Intrusione (Netrunner, Demone) **senza LOS**.
- Il Tracciato **finisce** se muore il Netrunner che lo sfrutta o se il **nodo** da cui è partito viene **sovraccaricato**.

**ICE** (armatura digitale)
- Ogni bersaglio dell'Intrusione ha un valore ICE (tabella 2b). Per l'Incursore lo dà il **cyberdeck**, potenziabile con oggetti e abilità. I Sistemi hanno ICE e ferite scritti sul segnalino.

**Demone** (programma caricato, come in Cyberpunk)
- Si **rilascia su un nodo di accesso** (terminale) e da lì **si combatte come un nemico in mappa**: pedina con scheda, nessuna schermata nuova.
- **Fisso** sul nodo. Attacca con l'Intrusione chi è Tracciato (senza LOS) e chi è entro la sua gittata.
- Si danneggia con l'Intrusione: l'Incursore usa i **dadi del cyberdeck** come arma e il Demone ha il suo **ICE**. **Sovraccaricare il nodo** (azione dell'Incursore) lo interrompe subito, ma rende il nodo **inutilizzabile** per il resto della missione. *(Sparare al terminale: da valutare)*
- Ogni Demone porta uno stato, e i nomi vengono dagli *quickhack* di Cyberpunk:

| Demone | Stato | Gittata | Ferite N/P | Dadi |
|---|---|---|---|---|
| **Surriscaldamento** | Bruciare | 5 | 4 / 5 | bianco, giallo |
| **Contagio** | Veleno | 5 | 4 / 5 | bianco, giallo |
| **Cortocircuito** | Folgorazione | 5 | 4 / 5 | bianco, giallo |

(Fissi, armatura 0, abilità: lo stato del Demone, **Macchina** non si applica.)

## 6. Da definire

- 🛡️ Oggetti e abilità **firewall** per gli eroi non Incursori (ICE per tutti)
- 🔫 Gli altri eroi possono **sparare al terminale** per dissolvere un Demone o interrompere un tracciamento?
- 🎨 Nomi e identità cyber dei nemici (qui sono segnaposto)
- 🏢 Il **catalogo Corp**: quali nemici sono "di base" e quali variano per Corp
- 🤖 Altre macchine (cani robot, mine, droni da riparazione) e umanoidi (medico, ingegnere)
