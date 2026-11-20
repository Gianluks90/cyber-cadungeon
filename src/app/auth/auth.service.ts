import { Injectable, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseApp } from '../firebase/firebase';

/** Chi è entrato: `uid` è l'identificativo che userà Firestore. */
export interface AuthUser {
  uid: string;
  /** Il nome da mostrare: quello dell'account Google, altrimenti l'email. */
  name: string;
  email: string | null;
  /** La foto dell'account Google; `null` per chi è entrato con email e password. */
  photoURL: string | null;
}

/** Perché un accesso o una registrazione non sono andati a buon fine (il testo lo sceglie la pagina). */
export type AuthError =
  | 'missing' // manca l'email o la password
  | 'credentials' // email o password sbagliate
  | 'email-in-use'
  | 'weak-password'
  | 'invalid-email'
  | 'too-many' // troppi tentativi
  | 'network'
  | 'popup-blocked' // il browser ha bloccato la finestra di Google
  | 'cancelled' // l'utente ha chiuso la finestra di Google: non è un errore da mostrare
  | 'unknown';

export type AuthResult = { user: AuthUser } | { error: AuthError };

/**
 * Come si entra e si esce. Sta dietro un'interfaccia (come `SaveStore`): oggi c'è `FirebaseAuthBackend`, ma pagine e rotte
 * non sanno che dietro c'è Firebase.
 */
export interface AuthBackend {
  /** Chiama `listener` con l'utente di adesso appena si sa chi è (anche dopo un riavvio dell'app) e a ogni cambio. */
  watch(listener: (user: AuthUser | null) => void): void;
  login(email: string, password: string): Promise<AuthResult>;
  register(email: string, password: string): Promise<AuthResult>;
  loginWithGoogle(): Promise<AuthResult>;
  /** Manda l'email per reimpostare la password. `null` se è partita, altrimenti il motivo. */
  resetPassword(email: string): Promise<AuthError | null>;
  logout(): Promise<void>;
}

const ERRORS: Record<string, AuthError> = {
  'auth/invalid-credential': 'credentials',
  'auth/wrong-password': 'credentials',
  'auth/user-not-found': 'credentials',
  'auth/invalid-email': 'invalid-email',
  'auth/missing-email': 'invalid-email',
  'auth/email-already-in-use': 'email-in-use',
  'auth/weak-password': 'weak-password',
  'auth/too-many-requests': 'too-many',
  'auth/network-request-failed': 'network',
  'auth/popup-blocked': 'popup-blocked',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
};

function toUser(user: User): AuthUser {
  return { uid: user.uid, name: user.displayName || user.email || '', email: user.email, photoURL: user.photoURL };
}

function toError(e: unknown): AuthResult {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  return { error: ERRORS[code] ?? 'unknown' };
}

/** Firebase Auth: email e password, e Google. La sessione resta nel browser (la gestisce Firebase). */
export class FirebaseAuthBackend implements AuthBackend {
  private readonly auth = getAuth(firebaseApp);

  watch(listener: (user: AuthUser | null) => void): void {
    onAuthStateChanged(this.auth, (user) => listener(user ? toUser(user) : null));
  }

  async login(email: string, password: string): Promise<AuthResult> {
    if (!email.trim() || !password) return { error: 'missing' };
    try {
      return { user: toUser((await signInWithEmailAndPassword(this.auth, email.trim(), password)).user) };
    } catch (e) {
      return toError(e);
    }
  }

  async register(email: string, password: string): Promise<AuthResult> {
    if (!email.trim() || !password) return { error: 'missing' };
    try {
      return { user: toUser((await createUserWithEmailAndPassword(this.auth, email.trim(), password)).user) };
    } catch (e) {
      return toError(e);
    }
  }

  async loginWithGoogle(): Promise<AuthResult> {
    try {
      return { user: toUser((await signInWithPopup(this.auth, new GoogleAuthProvider())).user) };
    } catch (e) {
      return toError(e);
    }
  }

  async resetPassword(email: string): Promise<AuthError | null> {
    if (!email.trim()) return 'invalid-email';
    try {
      await sendPasswordResetEmail(this.auth, email.trim());
      return null;
    } catch (e) {
      const result = toError(e);
      return 'error' in result ? result.error : 'unknown';
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}

/** L'utente di adesso, per pagine e guardia di rotta. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend: AuthBackend = new FirebaseAuthBackend();
  private readonly current = signal<AuthUser | null>(null);
  readonly user = this.current.asReadonly();
  /** Si compie quando si sa se qualcuno è già dentro: le rotte partono solo dopo (vedi `app.config.ts`). */
  private readonly known = new Promise<void>((resolve) => {
    this.backend.watch((user) => {
      this.current.set(user);
      resolve();
    });
  });

  ready(): Promise<void> {
    return this.known;
  }

  login(email: string, password: string): Promise<AuthResult> {
    return this.enter(this.backend.login(email, password));
  }

  register(email: string, password: string): Promise<AuthResult> {
    return this.enter(this.backend.register(email, password));
  }

  loginWithGoogle(): Promise<AuthResult> {
    return this.enter(this.backend.loginWithGoogle());
  }

  /** Segna l'utente appena si sa, senza aspettare l'avviso di Firebase: la rotta che segue lo trova già dentro. */
  private async enter(attempt: Promise<AuthResult>): Promise<AuthResult> {
    const result = await attempt;
    if ('user' in result) this.current.set(result.user);
    return result;
  }

  resetPassword(email: string): Promise<AuthError | null> {
    return this.backend.resetPassword(email);
  }

  async logout(): Promise<void> {
    await this.backend.logout();
  }
}
