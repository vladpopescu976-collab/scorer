import { createHash } from "crypto";

import { esteEmailTemporar, problemaParola } from "@/lib/parola-sigura";
import { inregistreazaEsec, verificaLimitarea } from "@/lib/limitare";

/** Parola apare în breșe publice? Interogare k-anonimă: Have I Been Pwned primește doar 5 caractere din amprentă. */
async function parolaCompromisa(parola: string): Promise<boolean> {
  try {
    const amprenta = createHash("sha1").update(parola).digest("hex").toUpperCase();
    const raspuns = await fetch(`https://api.pwnedpasswords.com/range/${amprenta.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(2500),
    });
    if (!raspuns.ok) return false;
    const sufix = amprenta.slice(5);
    return (await raspuns.text()).split("\n").some((linie) => {
      const [hash, numar] = linie.trim().split(":");
      return hash === sufix && Number(numar) > 0;
    });
  } catch {
    // Serviciul extern nu trebuie să blocheze înregistrările când e picat.
    return false;
  }
}

/**
 * Verificările de siguranță comune pentru site și aplicație. Întoarce mesajul
 * de arătat, sau null dacă înregistrarea poate continua.
 */
export async function verificaInregistrare(date: {
  ip: string;
  email: string;
  parola: string;
  nume: string;
}): Promise<{ mesaj: string; status: number } | null> {
  // Fiecare încercare se numără, nu doar cele eșuate: un script care creează
  // conturi la nesfârșit nu eșuează niciodată.
  const limita = await verificaLimitarea("inregistrare", date.ip);
  if (!limita.permis) return { mesaj: limita.mesaj, status: 429 };
  await inregistreazaEsec("inregistrare", date.ip);

  if (esteEmailTemporar(date.email)) {
    return { mesaj: "Folosește o adresă de email permanentă, nu una temporară.", status: 400 };
  }
  const problema = problemaParola(date.parola, date.nume, date.email);
  if (problema) return { mesaj: problema, status: 400 };

  if (await parolaCompromisa(date.parola)) {
    return {
      mesaj: "Această parolă apare în breșe de date publice. Alege alta, ca să-ți fie contul în siguranță.",
      status: 400,
    };
  }
  return null;
}
