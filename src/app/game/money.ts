/** La valuta del gioco: gli eurodollari, sempre scritti «E$» dopo il numero, separati da uno spazio che non va a capo (uguale in tutte le lingue). */
export const CURRENCY = 'E$';

/** Un importo con la sua unità: `money(300)` dà «300 E$». */
export const money = (n: number): string => `${n}\u00a0${CURRENCY}`;
