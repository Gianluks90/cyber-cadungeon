import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { deleteField, doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { AuthService } from '../auth/auth.service';
import { firebaseApp } from '../firebase/firebase';

/**
 * Il ruolo del giocatore. `player` è il normale (anche quando il campo manca); `admin` abilita gli strumenti di amministrazione e di sviluppo.
 * Lo scrive solo l'amministratore a mano dalla console di Firebase (`users/{uid}`, campo `role`): le regole impediscono al client di crearlo o cambiarlo.
 * I controlli lato client servono a mostrare o nascondere strumenti, non a proteggere dati: la sicurezza vera sta nelle regole.
 */
export type UserRole = 'player' | 'admin';

/** Ciò che è scritto nel documento del giocatore e serve all'interfaccia. Il resto (consenso, zona di partenza) si scrive e basta. */
export interface UserProfile {
  role: UserRole;
  /** Il soprannome scelto dal giocatore (1-24 caratteri); `null` se non l'ha impostato. */
  nickname: string | null;
  /** L'immagine scelta dal giocatore (indirizzo https); `null` se non l'ha impostata. Chi entra con Google usa la foto di Google. */
  photoURL: string | null;
}

/** Le scelte del giocatore che si possono cambiare: ciò che manca non si tocca, `null` toglie il campo. */
export type ProfileChange = Partial<Pick<UserProfile, 'nickname' | 'photoURL'>>;

/** Lunghezze massime, le stesse delle regole di Firestore (`firestore.rules`). */
export const NICKNAME_MAX = 24;
export const PHOTO_URL_MAX = 500;

const EMPTY_PROFILE: UserProfile = { role: 'player', nickname: null, photoURL: null };

/** Cifre decimali di latitudine e longitudine salvate: 3 = circa 100 m. Basta per una «zona di partenza» e non dice dove abiti. */
const STARTING_POINT_DECIMALS = 3;

/**
 * Ciò che sappiamo del giocatore e che resta sull'account (Firestore, `users/{uid}`). Sta dietro un'interfaccia, come `SaveStore`:
 * le pagine non sanno che dietro c'è Firestore. Mai la posizione in tempo reale: solo ciò che è scritto qui.
 */
export interface ProfileStore {
  /** Il profilo del giocatore (con i valori di partenza dove il documento o il campo non ci sono). */
  load(): Promise<UserProfile>;
  /** Salva ciò che il giocatore ha scelto; `null` toglie il campo (si torna al valore di partenza). */
  saveProfile(change: ProfileChange): Promise<void>;
  /** Segna che il giocatore ha accettato l'informativa sulla posizione (data del server e versione del testo). */
  recordLocationConsent(version: number): Promise<void>;
  /** Salva la zona di partenza, arrotondata, solo se non c'è già: la prima posizione resta per sempre quella. */
  saveStartingPoint(lat: number, lng: number): Promise<void>;
}

/** Scrive sul documento del giocatore (`users/{uid}`); senza nessuno dentro non fa niente. */
export class FirestoreProfileStore implements ProfileStore {
  private readonly db = getFirestore(firebaseApp);

  constructor(private readonly uid: () => string | null) {}

  async load(): Promise<UserProfile> {
    const uid = this.uid();
    if (!uid) return EMPTY_PROFILE;
    const data = (await getDoc(doc(this.db, 'users', uid))).data();
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
    return { role: data?.['role'] === 'admin' ? 'admin' : 'player', nickname: text(data?.['nickname']), photoURL: text(data?.['photoURL']) };
  }

  async saveProfile(change: ProfileChange): Promise<void> {
    const uid = this.uid();
    if (!uid) return;
    const data: Record<string, unknown> = {};
    for (const key of ['nickname', 'photoURL'] as const) if (key in change) data[key] = change[key] ?? deleteField();
    await setDoc(doc(this.db, 'users', uid), data, { merge: true });
  }

  async recordLocationConsent(version: number): Promise<void> {
    const uid = this.uid();
    if (!uid) return;
    await setDoc(doc(this.db, 'users', uid), { locationConsent: { at: serverTimestamp(), version } }, { merge: true });
  }

  async saveStartingPoint(lat: number, lng: number): Promise<void> {
    const uid = this.uid();
    if (!uid) return;
    const ref = doc(this.db, 'users', uid);
    if ((await getDoc(ref)).data()?.['startingPoint']) return;
    const round = (n: number) => Number(n.toFixed(STARTING_POINT_DECIMALS));
    await setDoc(ref, { startingPoint: { lat: round(lat), lng: round(lng), at: serverTimestamp() } }, { merge: true });
  }
}

/** Il profilo del giocatore di adesso. Gli errori (rete assente, regole) non fermano il gioco: si scrivono in console e si riprova alla prossima visita. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly store: ProfileStore = new FirestoreProfileStore(() => this.auth.user()?.uid ?? null);
  private readonly loaded = signal<UserProfile>(EMPTY_PROFILE);
  /** Il ruolo di chi è dentro; finché non è letto (e se la lettura fallisce) è `player`. */
  readonly role = computed(() => this.loaded().role);
  readonly isAdmin = computed(() => this.role() === 'admin');
  /** Come chiamare il giocatore: il soprannome scelto, altrimenti il nome dell'account fino al primo spazio (o la parte dell'email prima della chiocciola). */
  readonly nickname = computed(() => this.loaded().nickname ?? defaultNickname(this.auth.user()?.name ?? ''));
  /** L'immagine del giocatore: la foto di Google se c'è, altrimenti quella scelta nel profilo, altrimenti niente. */
  readonly photoURL = computed(() => this.auth.user()?.photoURL ?? this.loaded().photoURL);

  constructor() {
    // A ogni cambio di utente si rilegge il profilo; chi esce torna al profilo vuoto.
    effect(() => {
      const uid = this.auth.user()?.uid ?? null;
      untracked(() => void this.refresh(uid));
    });
  }

  /** Numera le letture del profilo: vale solo l'ultima, una più vecchia che arriva in ritardo non sovrascrive niente. */
  private reads = 0;

  private async refresh(uid: string | null): Promise<void> {
    const mine = ++this.reads;
    this.loaded.set(EMPTY_PROFILE);
    if (!uid) return;
    try {
      const profile = await this.store.load();
      if (mine === this.reads && this.auth.user()?.uid === uid) this.loaded.set(profile); // nel frattempo è cambiato qualcosa: la risposta non vale
    } catch (e) {
      console.warn('Profilo non letto dall\'account', e);
    }
  }

  /** Ciò che il giocatore ha scelto davvero (senza i valori di partenza): serve alla finestra del profilo. */
  readonly stored = this.loaded.asReadonly();

  /** Il giocatore cambia nickname o immagine: si vedono subito, poi si salva sull'account. Un valore vuoto toglie la scelta. */
  async saveProfile(change: ProfileChange): Promise<void> {
    const clean: ProfileChange = {};
    if ('nickname' in change) clean.nickname = change.nickname?.trim().slice(0, NICKNAME_MAX) || null;
    if ('photoURL' in change) clean.photoURL = change.photoURL?.trim().slice(0, PHOTO_URL_MAX) || null;
    this.reads++; // una lettura ancora in corso non deve riportare il vecchio valore
    this.loaded.update((p) => ({ ...p, ...clean }));
    try { await this.store.saveProfile(clean); } catch (e) { console.warn('Profilo non salvato sull\'account', e); }
  }

  async recordLocationConsent(version: number): Promise<void> {
    try { await this.store.recordLocationConsent(version); } catch (e) { console.warn('Consenso non salvato sull\'account', e); }
  }

  async saveStartingPoint(lat: number, lng: number): Promise<void> {
    try { await this.store.saveStartingPoint(lat, lng); } catch (e) { console.warn('Punto di partenza non salvato sull\'account', e); }
  }
}

/** «Mario Rossi» → «Mario»; un'email → la parte prima della chiocciola. */
export function defaultNickname(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.includes('@') ? first.split('@')[0] : first;
}
