import { PotionKind } from '../board/marker';
import type { SkillEffect } from '../skills/skill';

/** Quanti dadi extra ha un eroe per ognuno dei tre tipi di attacco. */
export interface AttackDice {
  melee: number;
  ranged: number;
  intrusion: number;
}

/** Punti di abilità iniziali, nei tre rami. */
export interface StartingSkills {
  combat: number;
  cunning: number;
  hacking: number;
}

/**
 * La scheda di un eroe: un archetipo pronto (public/mercenaries/<id>.json). Le regole stanno in docs/REGOLE.md, sezione 10.
 * Le quattro caratteristiche (forza, conoscenza, volontà, percezione) sono in pausa e non fanno parte della scheda.
 */
export interface MercenarySheet {
  id: string;
  name: string;
  /** La classe, a parole (druido, ranger, ...): è il sottotitolo dell'eroe. */
  class: string;
  /** Immagine del ritratto (percorso in public/). */
  portrait?: string;
  /** L'immagine a figura intera (alta), per i pannelli dell'eroe. */
  portraitFull?: string;
  /** Ferite: sempre multipli di 4 (un cuore = 4 ferite). */
  wounds: number;
  /** Overclock (per ora solo dato: l'overclock è fuori scope). */
  overclock: number;
  /** Armatura fissa: si sottrae al danno. */
  armor: number;
  /** Velocità: punti movimento a inizio turno. */
  speed: number;
  /** Il valore dell'eroe: la Conquista che il gruppo perde se muore. Più è robusto, più vale. */
  value: number;
  skills: StartingSkills;
  dice: AttackDice;
  /** Le monete con cui parte (300 nel regolamento) e ciò che ha comprato prima di partire: gli oggetti (id di public/items/, equipaggiati se ci stanno) e le pozioni; il loro prezzo si toglie dalle monete. */
  coins: number;
  items: string[];
  potions: PotionKind[];
  /** Il nome dell'abilità primaria (per esempio "Ordini flessibili"): si mostra accanto all'etichetta "Abilità primaria". */
  abilityName?: string;
  /** La storia dell'eroe (testo libero): si mostra nella scheda di dettaglio; senza, c'è un segnaposto. */
  story?: string;
  /** La descrizione dell'abilità primaria, a parole (markdown: i termini di gioco in **grassetto**), senza il nome. Tono: docs/cards/abilities.md, "Tono dei testi". */
  ability: string;
  /** L'abilità dell'eroe nella forma che il gioco legge (gli stessi effetti delle carte): per esempio una reazione quando subisce ferite. */
  effects?: SkillEffect[];
}

/** Controlla che una scheda segua i pattern dei riferimenti; si limita ad avvisare (i valori sono da bilanciare). */
function check(s: MercenarySheet) {
  const sum = (o: object) => Object.values(o).reduce((a: number, b: number) => a + b, 0);
  if (s.wounds % 4 !== 0) console.warn(`Eroe "${s.id}": le ferite (${s.wounds}) dovrebbero essere un multiplo di 4`);
  if (sum(s.dice) !== 3) console.warn(`Eroe "${s.id}": i dadi dei tre attacchi di solito sommano 3 (qui ${sum(s.dice)})`);
  if (sum(s.skills) !== 3) console.warn(`Eroe "${s.id}": le abilità iniziali di solito sommano 3 (qui ${sum(s.skills)})`);
}

/** Carica le schede che servono (una per id, senza ripetizioni). Quelle che mancano si saltano: la pedina usa i valori di riserva. */
export async function loadMercenarySheets(ids: readonly (string | undefined)[]): Promise<Map<string, MercenarySheet>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const sheets = new Map<string, MercenarySheet>();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetch(`mercenaries/${id}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const sheet: MercenarySheet = await res.json();
        check(sheet);
        sheets.set(id, sheet);
      } catch {
        console.warn(`Scheda dell'eroe "${id}" non trovata`);
      }
    }),
  );
  return sheets;
}

/** Carica tutte le schede degli eroi elencate in public/mercenaries/index.json (per il catalogo dei componenti). */
export async function loadAllMercenarySheets(): Promise<MercenarySheet[]> {
  try {
    const res = await fetch('mercenaries/index.json');
    if (!res.ok) return [];
    const { mercenaries }: { mercenaries: string[] } = await res.json();
    return [...(await loadMercenarySheets(mercenaries)).values()].sort((a, b) => a.name.localeCompare(b.name, 'it')); // in ordine alfabetico
  } catch {
    return [];
  }
}

/** La squadra di una partita su un'avventura senza eroi nei dati (quelle fatte con l'editor): gli id delle schede in `public/mercenaries/`, nell'ordine in cui entrano in campo. */
export const DEFAULT_PARTY: readonly string[] = ['vesper', 'bastion'];
