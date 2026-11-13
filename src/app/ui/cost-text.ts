/**
 * I valori nei testi: si scrive `{mov:N}` (punti movimento), `{overclock:N}` (overclock), `{alarm:N}` (Odio), `{armor:N}` (armatura), `{ice:N}` (ICE), `{range:N}` (gittata) o `{health:N}` (salute)
 * e l'interfaccia li mostra come il valore con l'icona, nel colore giusto, invece di "N punti movimento". Un `+` prima del numero (`{armor:+2}`) resta nel valore, e dopo una barra
 * (`{armor:+2|Armatura}`) c'è il nome del parametro, che segue l'icona nello stesso colore ("+2 🛡 Armatura"). Senza numero (`{overclock}`) c'è solo l'icona, da mettere dopo la parola
 * ("l'overclock {overclock} al massimo"). Il grassetto si scrive `**così**`. Dove il testo non può avere icone (un suggerimento col mouse), `plainCostText` li riscrive a parole.
 */
const COST = /\{(mov|overclock|alarm|armor|ice|range|health)(?::(\+?)(\d+))?(?:\|([^}]+))?\}/g;

export type CostKind = 'mov' | 'overclock' | 'alarm' | 'armor' | 'ice' | 'range' | 'health';

/** Un pezzo di testo con valori: testo semplice (anche in grassetto) o un valore (`n` è null se c'è solo l'icona; `label` è il nome del parametro, se scritto). */
export type CostSegment = { text: string; bold?: boolean } | { kind: CostKind; n: number | null; plus: boolean; label: string | null };

/** Il nome a parole di un valore, per i testi senza icone. */
const WORDS = (kind: CostKind, n: string): string =>
  kind === 'mov' ? `${n} ${n === '1' ? 'punto' : 'punti'} movimento` : kind === 'overclock' ? `${n} overclock` : kind === 'alarm' ? `${n} Odio` : kind === 'armor' ? `${n} armatura` : kind === 'ice' ? `${n} ICE` : kind === 'range' ? `${n} gittata` : `${n} salute`;

/** Il testo con i valori riscritti a parole ("2 punti movimento", "1 overclock", "3 Odio"); le icone senza numero spariscono. */
export function plainCostText(text: string): string {
  return text
    .replace(COST, (_, kind: CostKind, plus: string | undefined, n: string | undefined, label: string | undefined) => {
      if (n === undefined) return '';
      return label ? `${plus ?? ''}${n} ${label}` : `${plus ?? ''}${WORDS(kind, n)}`;
    })
    .replace(/\*\*/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/ ([.,;:!?)])/g, '$1');
}

/** Il testo a pezzi: pezzi di testo (con il grassetto) e valori. */
export function costSegments(text: string): CostSegment[] {
  const out: CostSegment[] = [];
  const pushText = (t: string) => {
    t.split(/\*\*(.+?)\*\*/).forEach((part, i) => {
      if (part) out.push(i % 2 ? { text: part, bold: true } : { text: part });
    });
  };
  let last = 0;
  for (const m of text.matchAll(COST)) {
    if (m.index > last) pushText(text.slice(last, m.index));
    out.push({ kind: m[1] as CostKind, n: m[3] === undefined ? null : Number(m[3]), plus: m[2] === '+', label: m[4] ?? null });
    last = m.index + m[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return out;
}
