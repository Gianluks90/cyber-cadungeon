/** Misura del puntatore in pixel (i browser accettano fino a 128; 32 è il massimo sicuro dappertutto). */
const SIZE = 24;
const HALF = SIZE / 2;

/**
 * Il puntatore del mouse: un quadrato con un puntino dentro, nel colore `--c-cursor`, con un contorno scuro (`--c-cursor-halo`)
 * perché non si perda sopra le strade ciano della mappa. È un'immagine SVG costruita qui con i colori letti da `tokens.css`
 * (un file SVG fisso dovrebbe avere i colori scritti a mano) e messa nella variabile `--cursor`, che `styles.css` applica a tutta la pagina.
 * Il punto caldo (dove "clicca") è il centro.
 */
export function installCursor(): void {
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--c-cursor').trim();
  const halo = style.getPropertyValue('--c-cursor-halo').trim();
  if (!color || !halo) return; // senza token resta il puntatore normale
  const box = 14;
  const at = HALF - box / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<rect x="${at}" y="${at}" width="${box}" height="${box}" fill="none" stroke="${halo}" stroke-width="4"/>` +
    `<circle cx="${HALF}" cy="${HALF}" r="3" fill="${halo}"/>` +
    `<rect x="${at}" y="${at}" width="${box}" height="${box}" fill="none" stroke="${color}" stroke-width="1.5"/>` +
    `<circle cx="${HALF}" cy="${HALF}" r="1.5" fill="${color}"/>` +
    `</svg>`;
  document.documentElement.style.setProperty('--cursor', `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${HALF} ${HALF}, auto`);
}
