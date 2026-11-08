import { Injectable, signal } from '@angular/core';

/** Chi è entrato. Per ora solo il nome; con Firebase Auth ci sarà anche l'identificativo. */
export interface AuthUser {
  name: string;
}

/**
 * Come si entra e si esce. Sta dietro un'interfaccia (come `SaveStore`): oggi è un login finto, domani Firebase Auth
 * sostituirà `FakeAuthBackend` senza toccare pagine e rotte.
 */
export interface AuthBackend {
  /** Restituisce l'utente se i dati sono giusti, altrimenti `null`. */
  login(name: string, password: string): Promise<AuthUser | null>;
  logout(): Promise<void>;
  /** L'utente rimasto dentro da una visita precedente, se c'è. */
  restore(): AuthUser | null;
}

const KEY = 'cad-auth-user';

/** Login finto per lo sviluppo: l'unico utente è `test` con password `test`; l'accesso resta nel localStorage. */
export class FakeAuthBackend implements AuthBackend {
  async login(name: string, password: string): Promise<AuthUser | null> {
    if (name.trim() !== 'test' || password !== 'test') return null;
    const user: AuthUser = { name: 'test' };
    try { localStorage.setItem(KEY, JSON.stringify(user)); } catch { /* archivio bloccato: si entra lo stesso, ma solo per questa visita */ }
    return user;
  }

  async logout(): Promise<void> {
    try { localStorage.removeItem(KEY); } catch { /* niente da togliere */ }
  }

  restore(): AuthUser | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}

/** L'utente di adesso, per pagine e guardia di rotta. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend: AuthBackend = new FakeAuthBackend();
  private readonly current = signal<AuthUser | null>(this.backend.restore());
  readonly user = this.current.asReadonly();

  /** `true` se i dati sono giusti e l'utente è entrato. */
  async login(name: string, password: string): Promise<boolean> {
    const user = await this.backend.login(name, password);
    this.current.set(user);
    return user !== null;
  }

  async logout(): Promise<void> {
    await this.backend.logout();
    this.current.set(null);
  }
}
