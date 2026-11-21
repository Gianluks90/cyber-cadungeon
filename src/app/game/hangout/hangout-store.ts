import { deleteField, doc, getFirestore, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase/firebase';

/** Il luogo pubblico su cui il giocatore ha fissato il suo ritrovo. */
export interface HangoutPlace {
  /** Il nome del luogo, se ne ha uno (molti oggetti pubblici, come le fontanelle, non ce l'hanno). */
  name: string | null;
  /** Il tipo di luogo nei dati della mappa (`library`, `fountain`…). */
  kind: string;
  lng: number;
  lat: number;
}

/**
 * Il ritrovo del giocatore: il luogo pubblico di partenza e l'area che ne deriva, fatta di edifici. Gli edifici sono riconosciuti dall'identificativo che hanno nei dati della
 * mappa; la loro forma non si salva, si rilegge dai tasselli. Sta sull'account (Firestore, `users/{uid}.hangout`) e, per ogni edificio, c'è un documento `territory/{id}`
 * che dice di chi è: un edificio ha un solo proprietario.
 */
export interface Hangout {
  place: HangoutPlace;
  buildings: number[];
  /** Il soprannome scelto dal Fixer (1-32 caratteri); `null` se non l'ha scelto. */
  nickname: string | null;
  /** L'immagine scelta dal Fixer (indirizzo https); `null` se non l'ha scelta. */
  photoURL: string | null;
  /** Nascosto: gli altri giocatori non possono trovare il ritrovo esplorando la zona. */
  hidden: boolean;
}

/** Ciò che il Fixer può personalizzare nel ritrovo. */
export type HangoutCustom = Pick<Hangout, 'nickname' | 'photoURL' | 'hidden'>;

/** Lunghezze massime, le stesse delle regole di Firestore (`firestore.rules`). */
export const HANGOUT_NICKNAME_MAX = 32;
export const HANGOUT_PHOTO_URL_MAX = 500;

/** Com'è andato il salvataggio: `taken` = almeno uno degli edifici è già di un altro Fixer; `error` = non è stato possibile (rete, permessi). */
export type HangoutSaveResult = 'ok' | 'taken' | 'error';

/** Quanto si aspetta la risposta del server prima di dire che non è andata: senza rete una transazione resterebbe in attesa. */
const SAVE_TIMEOUT_MS = 15_000;

/** Legge il ritrovo da ciò che sta nel documento del giocatore; `null` se manca o non è valido. */
export function parseHangout(raw: unknown): Hangout | null {
  const data = raw as { place?: Partial<HangoutPlace>; buildings?: unknown; nickname?: unknown; photoURL?: unknown; hidden?: unknown } | null | undefined;
  const p = data?.place;
  if (!p || typeof p.kind !== 'string' || typeof p.lng !== 'number' || typeof p.lat !== 'number' || !Array.isArray(data?.buildings)) return null;
  const buildings = data.buildings.filter(isBuildingId);
  if (buildings.length === 0) return null;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  return {
    place: { name: typeof p.name === 'string' ? p.name : null, kind: p.kind, lng: p.lng, lat: p.lat },
    buildings,
    nickname: text(data.nickname),
    photoURL: text(data.photoURL),
    hidden: data.hidden === true,
  };
}

/** Un identificativo di edificio utilizzabile come nome di documento: intero non negativo e sicuro. */
const isBuildingId = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id >= 0;

/** Il ritrovo sull'account. Si legge insieme al profilo (`ProfileService`); qui si scrive. */
export interface HangoutStore {
  /** Fissa il ritrovo e prende gli edifici, tutto insieme: o riesce per tutti o per nessuno. */
  save(hangout: Hangout): Promise<HangoutSaveResult>;
  /** Toglie il ritrovo e libera i suoi edifici, tutto insieme. */
  clear(hangout: Hangout): Promise<HangoutSaveResult>;
  /** Salva la personalizzazione del ritrovo (soprannome, immagine, nascosto); `null` toglie il soprannome o l'immagine. */
  customize(custom: HangoutCustom): Promise<HangoutSaveResult>;
}

/** Il ritrovo su Firestore: il documento del giocatore più un documento `territory/{id}` per edificio, in un'unica transazione. */
export class FirestoreHangoutStore implements HangoutStore {
  private readonly db = getFirestore(firebaseApp);

  constructor(private readonly uid: () => string | null) {}

  save(hangout: Hangout): Promise<HangoutSaveResult> {
    const uid = this.uid();
    if (!uid || !hangout.buildings.length || !hangout.buildings.every(isBuildingId)) return Promise.resolve('error');
    const { place, buildings } = hangout;
    return this.run((tx) => {
      for (const id of buildings) tx.set(doc(this.db, 'territory', String(id)), { ownerUid: uid, at: serverTimestamp() });
      tx.set(
        doc(this.db, 'users', uid),
        { hangout: { place: { name: place.name, kind: place.kind, lng: place.lng, lat: place.lat }, buildings, at: serverTimestamp() } },
        { merge: true },
      );
    });
  }

  clear(hangout: Hangout): Promise<HangoutSaveResult> {
    const uid = this.uid();
    if (!uid) return Promise.resolve('error');
    return this.run((tx) => {
      for (const id of hangout.buildings) tx.delete(doc(this.db, 'territory', String(id)));
      tx.update(doc(this.db, 'users', uid), { hangout: deleteField() });
    });
  }

  async customize(custom: HangoutCustom): Promise<HangoutSaveResult> {
    const uid = this.uid();
    if (!uid) return 'error';
    try {
      await Promise.race([
        updateDoc(doc(this.db, 'users', uid), {
          'hangout.nickname': custom.nickname ?? deleteField(),
          'hangout.photoURL': custom.photoURL ?? deleteField(),
          'hangout.hidden': custom.hidden,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), SAVE_TIMEOUT_MS)),
      ]);
      return 'ok';
    } catch (e) {
      console.warn('Ritrovo non personalizzato', e);
      return 'error';
    }
  }

  /** Una transazione di sole scritture: senza rete fallisce invece di restare in attesa, e col tempo massimo non si resta mai bloccati. */
  private async run(writes: (tx: Parameters<Parameters<typeof runTransaction>[1]>[0]) => void): Promise<HangoutSaveResult> {
    try {
      const done = runTransaction(this.db, async (tx) => writes(tx)).then(() => 'ok' as const);
      const timeout = new Promise<'error'>((resolve) => setTimeout(() => resolve('error'), SAVE_TIMEOUT_MS));
      return await Promise.race([done, timeout]);
    } catch (e) {
      // Le regole rifiutano la creazione di un documento che esiste già (un edificio già preso): è l'unico rifiuto che ci aspettiamo.
      const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
      console.warn('Ritrovo non salvato', code, e); // se un edificio libero risulta «preso», qui si vede il vero motivo
      return code === 'permission-denied' ? 'taken' : 'error';
    }
  }
}
