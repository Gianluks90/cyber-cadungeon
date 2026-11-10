import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guard';

/** Il gioco e l'editor sono pesanti: si scaricano solo quando si apre la loro pagina, così la home parte subito. */
export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent) },
  // Tutto il resto richiede di essere entrati.
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      // La home è la mappa del mondo (MapLibre pesa circa 1 MB: si scarica solo qui).
      { path: '', loadComponent: () => import('./world-map/world-map.component').then((m) => m.WorldMapComponent) },
      { path: 'adventures', loadComponent: () => import('./adventures/adventures.component').then((m) => m.AdventuresComponent) },
      { path: 'party/:map', loadComponent: () => import('./adventures/party.component').then((m) => m.PartyComponent) },
      { path: 'lobby/:code', loadComponent: () => import('./lobby/lobby.component').then((m) => m.LobbyComponent) },
      { path: 'editor', loadComponent: () => import('./editor/editor.component').then((m) => m.EditorComponent) },
      { path: 'play/:map', loadComponent: () => import('./game/game-scene.component').then((m) => m.GameSceneComponent) },
      // La stessa scena del gioco vista dal Maligno (ambiente di sviluppo della sua interfaccia): `/adversary/<map>`, `?party=a,b,…` per la squadra.
      { path: 'adversary/:map', loadComponent: () => import('./game/game-scene.component').then((m) => m.GameSceneComponent) },
      { path: '**', redirectTo: '' },
    ],
  },
];
