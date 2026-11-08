import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    // Chrome/Edge: a schermo intero chiedono di consegnare Esc alla pagina invece di uscire (Safari e Firefox non lo permettono).
    document.addEventListener('fullscreenchange', () => {
      const keyboard = (navigator as Navigator & { keyboard?: { lock(keys: string[]): Promise<void>; unlock(): void } }).keyboard;
      if (!keyboard) return;
      if (document.fullscreenElement) void keyboard.lock(['Escape']).catch(() => {});
      else keyboard.unlock();
    });
  }
}
