import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { installCursor } from './app/ui/cursor';

// Le icone che i testi in markdown mostrano dentro le frasi (`.tok` in styles.css): come `app-icon`, il percorso parte dalla base della pagina.
for (const [variable, file] of [['--ico-footprint', 'footprint'], ['--ico-speed', 'speed'], ['--ico-skull', 'skull'], ['--ico-shield', 'shield'], ['--ico-ac_unit', 'ac_unit'], ['--ico-favorite', 'favorite']]) {
  document.documentElement.style.setProperty(variable, `url("${new URL(`icons/${file}.svg`, document.baseURI).href}")`);
}

installCursor();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
