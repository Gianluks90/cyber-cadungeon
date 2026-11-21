# Piano: Fixer, contratti personalizzati e Firebase

Scritto il 2026-11-20 per riprendere il lavoro da un altro computer. Fa fede solo ciò che è sotto «Fatto» e «Deciso»; «Da decidere» non si implementa finché non si decide.

## Fatto: il ritrovo del Fixer (sull'account Firestore)
Il giocatore, come Fixer, fissa un **ritrovo** su un luogo pubblico e impone la sua **influenza** su 3 edifici attorno. Flusso:
1. Riquadro **Fixer** in basso a destra (giallo senza ritrovo): tasto `add_home` → scelta del luogo. Compaiono le casette (cerchi con una casetta) dei luoghi pubblici entro `HANGOUT_PICK_RANGE_M` dal giocatore (oggi 200 m, da riportare a 50-100 m con la posizione vera). Si tocca una casetta: pannello laterale con le info e «Fissa ritrovo».
2. **Scelta dell'influenza**: edifici evidenziati entro 50 m dal luogo (+25 m alla volta fino a 500 m se meno di 3). Si scelgono 3 edifici (si toglie toccando di nuovo) e si conferma. Gli edifici dentro scuole, ospedali, caserme, ecc. sono **vietati** (righe a 45° rosse e box «Vietato»).
3. Con il ritrovo il riquadro è blu: la **lente** mostra l'area (verde) e inquadra tutto; compare la **pillola** dei comandi: matita (spenta), occhio (aree rotonde: 100 m attorno al ritrovo, 50 m attorno a ogni edificio, unite in un'area sola con il tratteggio animato), cestino (rimuove tutto, con dialog di conferma), «?» (tocco su ritrovo o edificio → pannello info con città e quartiere).
4. Gli edifici non hanno nome né indirizzo: sono blocchi anonimi (i numeri civici sono stati tolti dalla mappa).

Dove sta il codice (`src/app/world-map/` salvo diversa indicazione):
- `hangout-geo.ts`: costanti (raggi, punti, tipi di luogo ammessi `PUBLIC_POI_KINDS`, aree vietate `BLOCKED_LANDUSE`) e geometria pura (unione di cerchi, distanze, superficie).
- `hangout-layer.ts`: disegno sulla mappa (livelli per identificativo di edificio, marker, tratteggio animato) e lettura dei tasselli.
- `hangout-place-panel.component.ts`, `hangout-info-panel.component.ts`: i due pannelli laterali. `place-names.ts`: quartiere e città letti direttamente dal file dei dati (nessun servizio esterno).
- `world-map.component.ts`: modalità `none | place | influence | view`, riquadri Fixer e Mercenario (con Fama, Reputazione e la riga dei contratti).
- `game/hangout/hangout-store.ts`: `HangoutStore` (`FirestoreHangoutStore`: una transazione scrive `users/{uid}.hangout` e un documento `territory/{id edificio}` per ognuno dei suoi edifici, che dicono di chi è l'edificio; le regole fanno rifiutare un edificio già preso, e il client lo mostra con «Edificio già di un altro Fixer»). Il ritrovo si legge insieme al profilo (`ProfileService.hangout`). Nessuna importazione dal vecchio localStorage (la chiave `cad-hangout` non si usa più).
- Misure comuni dell'interfaccia sulla mappa: token `--hud-*`, `--side-panel-*` in `styles/tokens.css`.

Cose che sono ancora segnaposto o provvisorie:
- **Fama** e **Reputazione** sono sempre 0 (`fame`, `reputation` nel componente).
- Il rimborso dei punti al cestino («metà dei punti spesi, minimo 3») non è accreditato: non esiste un conto dei punti. I Contratti creati nella zona non esistono ancora (dovranno tornare «posizionabili»).
- La **matita** della pillola apre «Personalizza il ritrovo» (`ui/hangout-dialog.component.ts`): `hangout.nickname` (soprannome, 1-32), `hangout.photoURL` (https) e `hangout.hidden` (nascosto). Un tocco sul segnaposto del ritrovo (anche senza lente) apre il pannello con soprannome, immagine, visibilità, città e quartiere. **Il flag `hidden` per ora si salva e basta**: gli altri giocatori non vedono ancora i ritrovi altrui (`territory` è leggibile solo dal proprietario), quindi manca la scoperta: servirà un indice pubblico dei ritrovi non nascosti (cosa esporre: luogo, soprannome, immagine?), da decidere con l'informativa. Il codice per aggiungere edifici all'area (`reachFrom`, `EXPAND_REACH_M`) è rimasto, ma l'espansione è fuori dall'interfaccia.
- I luoghi ammessi sono una lista bianca stretta: in zone poco servite può non esserci nulla entro il raggio (la barra lo dice e dà la distanza del più vicino).

## Prossimo: il flusso dei contratti personalizzati (prima della contesa)
Obiettivo: il Fixer crea contratti suoi **dentro la propria area di influenza** e li piazza; poi si lavora sull'editor per costruirli. La contesa tra Fixer (edifici rubati, «palestre») viene dopo.

Stati del contratto (proposta, da confermare): `bozza` (nell'editor) → `posizionabile` (finito e verificato, non ancora sulla mappa) → `posizionato` (sulla mappa, dentro l'area del Fixer, visibile agli altri) → `ritirato`. Il dialog del cestino promette già lo stato «posizionabile» ai contratti di un ritrovo rimosso.

Passi proposti, piccoli e verificabili:
1. **Dato**: intestazione del contratto con autore (Fixer), stato e posizione; il contratto è sempre una missione `MapData` più la sua intestazione (come oggi in `game/contracts/`, `ContractStore`).
2. **Editor**: metadati del contratto (titolo, didascalia, numero), strumento «Posiziona» (era in «Rimandato» in `docs/PIANO-PROTOTIPO.md`: va spostato in «Fatto» quando lo si fa), Verifica prima di renderlo `posizionabile`.
3. **Mappa**: dal riquadro Fixer, elenco dei propri contratti `posizionabili` e posizionamento dentro l'area (i cerchi 100 m/50 m dicono dove si può); vietato fuori area e sugli edifici vietati.
4. **Altri giocatori**: i contratti `posizionati` compaiono come quelli attuali (marker, scheda, sblocco a portata).
5. Il cestino del ritrovo riporta i contratti `posizionati` a `posizionabili` (oggi solo promesso nel testo).

Da decidere: dove vivono le missioni create (oggi `public/maps/` è statico: servirà persistenza, quindi Firebase, vedi sotto); se i contratti hanno limiti (quanti per Fixer, quanto grandi); come si guadagna Reputazione.

## Firebase: da decidere prima di scrivere codice
Oggi tutto ciò che è dell'utente sta nel localStorage del browser (vedi tabella): si perde con la cache, non passa da un dispositivo all'altro e non può essere condiviso. Per salvarlo serve almeno **Auth**: oggi `CLAUDE.md` dice «né Auth né Hosting», quindi la decisione va presa prima.

Proposta (non ancora approvata):
- **Sull'account (Firestore)**: profilo, ritrovo e area, contratti accettati e sbloccati, contratti creati, Fama e Reputazione, e la **prova del consenso alla posizione** (data e versione dell'informativa). Solo sul dispositivo: filtri, 3D, alone, e mai la posizione in tempo reale.
- **Modello del territorio**: un documento per edificio (`territory/{identificativo edificio}`), non una lista nell'utente. Così «un edificio ha un solo proprietario» lo garantisce il database (creare un documento già esistente fallisce) e fissare il ritrovo è un'unica operazione su 3 documenti. Per la contesa (difesa, tempi di attesa) serviranno funzioni sul server (piano a pagamento); fino ad allora basta tenere pronto il modello.
- **Come**: SDK modulare di Firebase (non AngularFire), implementazioni Firestore degli archivi già dietro interfaccia (`HangoutStore`, `HeldStore`, `UnlockStore`, `ContractStore`, `SaveStore`). I metodi di oggi sono sincroni: alla login si carica in memoria e si scrive in differita, senza cambiare il resto del codice. Emulatore locale per sviluppare senza toccare i dati veri. Importazione di ciò che l'utente ha già nel browser al primo accesso.
- **Hosting**: per ora si resta su GitHub Pages (il suo dominio è tra quelli autorizzati di Auth). Passare a Firebase Hosting si può fare più avanti (`firebase.json` ha già il blocco `hosting`); attenzione alla banda gratuita: 10 GB al mese.
- **Rischi**: dati in regione europea (la regione non si cambia dopo la creazione del progetto), esportazione e cancellazione dei dati dell'utente, le chiavi web di Firebase non sono segrete (la sicurezza sta nelle regole e poi in App Check), possibili blocchi della rete aziendale ai domini di Firebase.

Domande aperte, con la risposta che consiglio:
1. Accesso: anonimo all'inizio, poi trasformabile in account vero (Google o email). Alternativa: subito Google o email.
2. Il progetto Firebase esistente è in una regione europea? Se no, conviene crearne uno nuovo.
3. La prova del consenso con data lato server (più solida): sì o no?
4. Territorio contendibile vicino o lontano? Se vicino, partire direttamente dal modello a un documento per edificio.

**Fatto**: Auth; il ritrovo del Fixer su Firestore (`users/{uid}.hangout` + `territory/{id}`, una scrittura sola, un proprietario per edificio, `territory` leggibile solo dal proprietario per ora); primo archivio Firestore `users/{uid}` con `locationConsent` (data del server e versione dell'informativa, riscritta a ogni «Accetta») e `startingPoint` (prima lettura con precisione ≤ 100 m, arrotondata a 3 decimali ≈ 100 m, scritta una volta sola e mai più modificata dal client; non si salva con la posizione finta). `nickname` (1-24 caratteri) e `photoURL` (https, max 500): li sceglie il giocatore, ancora senza schermata per cambiarli (per ora si scrivono dalla console). Ruolo `role` (`player` se manca, `admin` per l'amministratore e gli strumenti di sviluppo): lo imposta a mano chi amministra dalla console, le regole non lo lasciano scrivere al client; `ProfileService.role` e `isAdmin` lo espongono. Regole in `firestore.rules`, con elenco chiuso dei campi. L'informativa (`location.*`) dice che la zona di partenza resta sull'account.

Ordine suggerito quando si decide: Auth → archivi Firestore del ritrovo e del consenso → emulatore e regole → importazione → contratti creati → territorio.

## Lavorare da un altro computer
- `git pull`, poi `npm install` (sono arrivate due dipendenze dirette: `@mapbox/vector-tile` e `pbf`).
- Il localStorage **non viaggia**: sul nuovo computer non c'è il ritrovo, né il consenso, né i filtri. Con la posizione vera non serve la posizione finta. Il consenso si ridà dalla dialog (il tasto Accetta si attiva dopo aver scorso il testo).
- Sul computer aziendale, dove la geolocalizzazione mette il PC vicino a Parigi, la posizione finta si imposta dalla console del browser: `localStorage.setItem('cad-fake-position', '44.4167,8.8833')` (lat,lng; coordinate esatte da Google Maps, tasto destro sul punto), si toglie con `localStorage.removeItem('cad-fake-position')`. Il localStorage dell'aziendale va tenuto (non pulirlo: si perde anche la posizione finta).
- Con la posizione vera, i luoghi ammessi entro il raggio possono essere pochi o nessuno: abbassare `HANGOUT_PICK_RANGE_M` solo dopo aver visto quanti ce ne sono.
- Il «?» e le città/quartieri scaricano due tasselli da `data.source.coop`: se una rete li blocca la scelta del luogo e le info non funzionano.

## Chiavi del localStorage (tutto ciò che oggi si perde con la cache)
| Chiave | Cosa contiene |
|---|---|
| `cad-location-consent` | data in cui è stato dato il consenso alla posizione |
| `cad-fake-position` | posizione finta di sviluppo (`lat,lng`) |
| `cad-contracts-held`, `cad-contracts-unlocked` | contratti accettati e sbloccati |
| `cad-map-preset`, `cad-map-filters-custom`, `cad-map-3d`, `cad-map-halo` | preferenze della mappa |
| `cad-lang`, `cad-graphics` | lingua e grafica |
| `cad-weather-result` | l'ultima allerta meteo letta |
| `cad-party-setup`, `cad-lobbies`, `cad-editor-draft` | squadra, stanze, bozza dell'editor |
