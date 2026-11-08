import { inject } from '@angular/core';
import { Router, type CanActivateChildFn, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Chi non è entrato va a `/login`. */
export const authGuard: CanActivateChildFn = () => (inject(AuthService).user() ? true : inject(Router).createUrlTree(['/login']));

/** Chi è già dentro non ha bisogno della pagina di accesso: va alla home. */
export const guestGuard: CanActivateFn = () => (inject(AuthService).user() ? inject(Router).createUrlTree(['/']) : true);
