import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Le rotte partono solo quando Firebase ha detto se qualcuno è già dentro, altrimenti la guardia manderebbe sempre a /login.
    provideAppInitializer(() => inject(AuthService).ready()),
    provideRouter(routes),
  ],
};
