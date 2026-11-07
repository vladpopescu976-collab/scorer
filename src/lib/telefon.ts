/**
 * Numărul de contact al unui teren, pregătit pentru afișare și pentru apel.
 *
 * Proprietarii îl scriu cum vor — „0256 300 106”, „0722123456”,
 * „+40722 123 456” — iar un `tel:` cu spații sau cu prefix local nu se comportă
 * la fel pe toate telefoanele. Linkul se construiește mereu în format
 * internațional, iar afișarea se derivă din el, ca să arate la fel indiferent
 * cum a fost scris.
 */

/** Prefixul țării în care sunt terenurile. */
const PREFIX_TARA = "40";
/** Câte cifre are un număr național, fără zeroul din față. */
const CIFRE_NATIONALE = 9;

function doarCifre(valoare: string): string {
  return valoare.replace(/\D/g, "");
}

/**
 * Numărul în format internațional, pentru `href="tel:…"`.
 * Întoarce null dacă valoarea nu seamănă a număr de telefon.
 */
export function telefonPentruApel(valoare: string | null | undefined): string | null {
  if (!valoare) return null;

  const curat = valoare.trim();
  const scrisInternational = curat.startsWith("+") || doarCifre(curat).startsWith("00");

  let cifre = doarCifre(curat);
  if (cifre.startsWith("00")) cifre = cifre.slice(2);

  if (scrisInternational) {
    return cifre.length >= 8 ? `+${cifre}` : null;
  }

  // Formă locală: zeroul din față se înlocuiește cu prefixul țării.
  if (cifre.startsWith("0") && cifre.length === CIFRE_NATIONALE + 1) {
    return `+${PREFIX_TARA}${cifre.slice(1)}`;
  }
  // Scris fără zeroul din față. Verificăm explicit că nu începe cu 0, altfel
  // un număr incomplet ar primi prefixul peste zero.
  if (!cifre.startsWith("0") && cifre.length === CIFRE_NATIONALE) {
    return `+${PREFIX_TARA}${cifre}`;
  }

  // Orice altceva (interior scurt, număr străin fără prefix) rămâne ca atare,
  // dacă are măcar lungimea unui număr.
  return cifre.length >= 7 ? cifre : null;
}

/**
 * Numărul așa cum e citit cel mai ușor: „0722 123 456”.
 * Dacă nu e un număr național, îl lăsăm exact cum l-a scris proprietarul.
 */
export function telefonAfisat(valoare: string | null | undefined): string | null {
  if (!valoare) return null;
  const curat = valoare.trim();
  if (!curat) return null;

  // Pornim de la forma canonică, ca „0040…” și „+40…” să arate la fel.
  const international = telefonPentruApel(curat);
  if (!international?.startsWith(`+${PREFIX_TARA}`)) return curat;

  const national = international.slice(PREFIX_TARA.length + 1);
  if (national.length !== CIFRE_NATIONALE) return curat;

  return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
