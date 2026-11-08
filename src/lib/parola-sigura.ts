// Reguli de parolă pentru conturile noi. Fișier fără dependențe de server, ca
// aceleași verificări să ruleze și în browser, cât tastezi.

export const LUNGIME_MINIMA = 10;

const FRECVENTE = new Set([
  "parola", "parola123", "parola1234", "parola12345", "parolamea", "parolamea1", "password", "password1",
  "password123", "passw0rd", "qwerty", "qwerty123", "qwertyuiop", "azerty", "azerty123", "123456789",
  "1234567890", "12345678", "123456789a", "abc12345", "abcd1234", "abcd12345", "iloveyou", "iloveyou1",
  "welcome1", "welcome123", "admin123", "administrator", "letmein", "letmein123", "football", "football1",
  "fotbal", "fotbal123", "fotbal1234", "scorer", "scorer123", "scorer1234", "romania", "romania123",
  "bucuresti", "bucuresti1", "timisoara", "timisoara1", "monkey123", "dragon123", "master123", "sunshine1",
  "princess1", "superman1", "baseball1", "trustno1", "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "zaq12wsx",
  "test1234", "test12345", "user1234", "login123", "changeme1", "iubire123", "te iubesc", "steaua123",
  "dinamo123", "rapid1923", "cfrcluj1", "mihai1234", "andrei1234", "alex12345",
]);

export type CerintaParola = { id: string; eticheta: string; obligatorie: boolean; indeplinita: boolean };

function normalizeaza(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

/** Bucăți din nume și email pe care parola nu are voie să le conțină. */
function bucatiPersonale(nume: string, email: string): string[] {
  const dinEmail = normalizeaza(email.split("@")[0] ?? "");
  const dinNume = nume.split(/\s+/).map(normalizeaza);
  return [dinEmail, ...dinNume].filter((b) => b.length >= 4 || (b === dinEmail && b.length >= 3));
}

function esteSecventa(parola: string): boolean {
  const p = parola.toLowerCase();
  if (/^(.)\1+$/.test(p)) return true;
  const secvente = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  return secvente.some((s) => s.includes(p) || [...s].reverse().join("").includes(p));
}

export function cerinteParola(parola: string, nume = "", email = ""): CerintaParola[] {
  const simplificata = normalizeaza(parola);
  const personal = bucatiPersonale(nume, email).some((b) => simplificata.includes(b));
  return [
    { id: "lungime", eticheta: `Cel puțin ${LUNGIME_MINIMA} caractere`, obligatorie: true, indeplinita: parola.length >= LUNGIME_MINIMA },
    { id: "litera", eticheta: "O literă", obligatorie: true, indeplinita: /[a-zA-Z]/.test(parola) },
    { id: "cifra", eticheta: "O cifră", obligatorie: true, indeplinita: /\d/.test(parola) },
    {
      id: "personal",
      eticheta: "Fără numele sau emailul tău",
      obligatorie: true,
      indeplinita: parola.length > 0 && !personal,
    },
    {
      id: "frecventa",
      eticheta: "Nu e o parolă des folosită",
      obligatorie: true,
      indeplinita: parola.length > 0 && !FRECVENTE.has(parola.toLowerCase()) && !esteSecventa(parola),
    },
    { id: "mixt", eticheta: "Litere mari și mici", obligatorie: false, indeplinita: /[a-z]/.test(parola) && /[A-Z]/.test(parola) },
    { id: "simbol", eticheta: "Un simbol (ex. ! ? #)", obligatorie: false, indeplinita: /[^\w\s]/.test(parola) },
  ];
}

/** Prima regulă obligatorie încălcată, sau null dacă parola e acceptabilă. */
export function problemaParola(parola: string, nume = "", email = ""): string | null {
  const cerinte = cerinteParola(parola, nume, email);
  const lipsa = cerinte.find((c) => c.obligatorie && !c.indeplinita);
  if (!lipsa) return null;
  switch (lipsa.id) {
    case "lungime": return `Parola trebuie să aibă cel puțin ${LUNGIME_MINIMA} caractere.`;
    case "litera": return "Parola trebuie să conțină cel puțin o literă.";
    case "cifra": return "Parola trebuie să conțină cel puțin o cifră.";
    case "personal": return "Parola nu poate conține numele sau emailul tău.";
    default: return "Parola este prea ușor de ghicit. Alege alta.";
  }
}

// Greșeli de scriere frecvente la domenii mari.
const DOMENII = ["gmail.com", "yahoo.com", "yahoo.ro", "outlook.com", "hotmail.com", "icloud.com"];
const GRESELI: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.ro": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.con": "gmail.com", "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.con": "yahoo.com", "yaoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com", "iclod.com": "icloud.com",
};

export function sugestieEmail(email: string): string | null {
  const [local, domeniu] = email.trim().toLowerCase().split("@");
  if (!local || !domeniu || DOMENII.includes(domeniu)) return null;
  const corect = GRESELI[domeniu];
  return corect ? `${local}@${corect}` : null;
}

// Adrese temporare: cine le folosește nu își poate recupera contul și, de
// obicei, nu are intenții de rezervare reale.
const TEMPORARE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com",
  "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com", "tempail.com", "burnermail.io",
]);

export function esteEmailTemporar(email: string): boolean {
  return TEMPORARE.has(email.split("@")[1]?.toLowerCase() ?? "");
}
