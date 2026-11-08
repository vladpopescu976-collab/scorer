import bcrypt from "bcryptjs";
import { createHash, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { trimiteEmail } from "@/lib/email";
import { sablon } from "@/lib/emailuri/sablon";
import { inregistreazaEsec, stergeEsecurile, verificaLimitarea } from "@/lib/limitare";
import { esteEmailTemporar, problemaParola } from "@/lib/parola-sigura";
import { parolaCompromisa } from "@/lib/inregistrare-sigura";
import { telefonSchema } from "@/lib/validations/auth";

/**
 * Schimbarea emailului, a telefonului și a parolei, cu confirmare în doi pași:
 *
 * 1. parola actuală — ca un telefon lăsat deblocat să nu fie de ajuns;
 * 2. un cod de 6 cifre pe email — pe adresa NOUĂ la schimbarea emailului
 *    (dovedește că e a ta), pe adresa actuală în rest.
 *
 * Cererea în curs nu stă în baza de date: e un token semnat cu AUTH_SECRET,
 * care ține valoarea nouă, amprenta codului și o amprentă a contului. Dacă
 * între timp se schimbă parola sau emailul, tokenul vechi nu mai e valabil.
 */

export type TipSchimbare = "email" | "telefon" | "parola";

const AUDIENTA = "scorer-schimbare-cont";
const VALABILITATE_MINUTE = 15;

function secret() {
  const valoare = process.env.AUTH_SECRET;
  if (!valoare) throw new Error("AUTH_SECRET lipsește.");
  return new TextEncoder().encode(valoare);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Se schimbă la orice modificare de parolă sau email, deci invalidează cererile vechi. */
function amprentaCont(user: { password: string; email: string }): string {
  return sha256(`${user.password}|${user.email}`);
}

function ascundeEmail(email: string): string {
  const [local, domeniu] = email.split("@");
  if (!domeniu) return email;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(2, local.length - 2))}@${domeniu}`;
}

export type Rezultat<T> = { ok: true; date: T } | { ok: false; eroare: string };

const emailSchema = z.string().trim().toLowerCase().email("Adresă de email invalidă.");

/** Pasul 1: verifică parola și valoarea nouă, apoi trimite codul. */
export async function cereSchimbare(intrare: {
  userId: string;
  tip: TipSchimbare;
  parolaCurenta: string;
  valoareNoua: string;
}): Promise<Rezultat<{ token: string; trimisLa: string }>> {
  const user = await prisma.user.findUnique({
    where: { id: intrare.userId },
    select: { id: true, name: true, email: true, password: true, phone: true },
  });
  if (!user) return { ok: false, eroare: "Contul nu mai există." };

  const cheie = `schimbare:${user.id}`;
  const limita = await verificaLimitarea(cheie, "cont");
  if (!limita.permis) return { ok: false, eroare: limita.mesaj };

  if (!(await bcrypt.compare(intrare.parolaCurenta, user.password))) {
    await inregistreazaEsec(cheie, "cont");
    return { ok: false, eroare: "Parola actuală nu este corectă." };
  }
  // Fiecare cerere trimite un email; o numărăm, ca să nu se poată trimite la nesfârșit.
  await inregistreazaEsec(cheie, "cont");

  let valoare: string;
  let destinatar = user.email;

  if (intrare.tip === "email") {
    const verificat = emailSchema.safeParse(intrare.valoareNoua);
    if (!verificat.success) return { ok: false, eroare: verificat.error.issues[0].message };
    valoare = verificat.data;
    if (valoare === user.email) return { ok: false, eroare: "Acesta e deja emailul contului." };
    if (esteEmailTemporar(valoare)) return { ok: false, eroare: "Folosește o adresă de email permanentă." };
    const ocupat = await prisma.user.findUnique({ where: { email: valoare }, select: { id: true } });
    if (ocupat) return { ok: false, eroare: "Există deja un cont cu acest email." };
    destinatar = valoare;
  } else if (intrare.tip === "telefon") {
    const curat = intrare.valoareNoua.trim();
    const verificat = telefonSchema.safeParse(curat);
    if (!curat || !verificat.success) {
      return { ok: false, eroare: "Număr de telefon invalid. Exemplu: 0722 123 456." };
    }
    valoare = curat;
    if (valoare.replace(/\D/g, "") === (user.phone ?? "").replace(/\D/g, "")) {
      return { ok: false, eroare: "Acesta e deja numărul contului." };
    }
  } else {
    const problema = problemaParola(intrare.valoareNoua, user.name, user.email);
    if (problema) return { ok: false, eroare: problema };
    if (await bcrypt.compare(intrare.valoareNoua, user.password)) {
      return { ok: false, eroare: "Parola nouă trebuie să fie diferită de cea actuală." };
    }
    if (await parolaCompromisa(intrare.valoareNoua)) {
      return { ok: false, eroare: "Această parolă apare în breșe de date publice. Alege alta." };
    }
    // În token ajunge doar amprenta parolei noi, niciodată parola.
    valoare = await bcrypt.hash(intrare.valoareNoua, 12);
  }

  const cod = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const jti = randomUUID();
  const token = await new SignJWT({ tip: intrare.tip, valoare, cod: sha256(`${jti}:${cod}`), cont: amprentaCont(user) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setAudience(AUDIENTA)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${VALABILITATE_MINUTE}m`)
    .sign(secret());

  const ce = { email: "adresa de email", telefon: "numărul de telefon", parola: "parola" }[intrare.tip];
  const { html, text } = sablon({
    titlu: `Codul tău: ${cod}`,
    salut: user.name,
    paragrafe: [
      `Ai cerut să schimbi ${ce} contului Scorer. Scrie codul de mai sus în aplicație sau pe site ca să confirmi.`,
      `Codul e valabil ${VALABILITATE_MINUTE} minute. Dacă nu ai cerut tu schimbarea, ignoră mesajul și schimbă-ți parola.`,
    ],
  });
  const trimis = await trimiteEmail({ catre: destinatar, subiect: `${cod} — codul de confirmare Scorer`, html, text });
  if (!trimis.trimis) return { ok: false, eroare: "Nu am putut trimite codul. Încearcă din nou." };

  return { ok: true, date: { token, trimisLa: ascundeEmail(destinatar) } };
}

/** Pasul 2: verifică codul și aplică schimbarea. */
export async function confirmaSchimbare(intrare: {
  userId: string;
  token: string;
  cod: string;
}): Promise<Rezultat<{ tip: TipSchimbare }>> {
  const cheie = `schimbare:${intrare.userId}`;
  const limita = await verificaLimitarea(cheie, "cont");
  if (!limita.permis) return { ok: false, eroare: limita.mesaj };

  let date: { tip?: unknown; valoare?: unknown; cod?: unknown; cont?: unknown; jti?: string; sub?: string };
  try {
    ({ payload: date } = await jwtVerify(intrare.token, secret(), { audience: AUDIENTA }));
  } catch {
    return { ok: false, eroare: "Codul a expirat. Cere altul." };
  }
  if (date.sub !== intrare.userId || typeof date.valoare !== "string" || typeof date.cod !== "string") {
    return { ok: false, eroare: "Cererea nu este valabilă. Încearcă din nou." };
  }
  const tip = date.tip as TipSchimbare;

  const user = await prisma.user.findUnique({
    where: { id: intrare.userId },
    select: { id: true, name: true, email: true, password: true },
  });
  if (!user) return { ok: false, eroare: "Contul nu mai există." };
  if (date.cont !== amprentaCont(user)) {
    return { ok: false, eroare: "Contul s-a schimbat între timp. Cere un cod nou." };
  }

  const primit = Buffer.from(sha256(`${date.jti}:${intrare.cod.replace(/\D/g, "")}`));
  const asteptat = Buffer.from(date.cod);
  if (primit.length !== asteptat.length || !timingSafeEqual(primit, asteptat)) {
    await inregistreazaEsec(cheie, "cont");
    return { ok: false, eroare: "Codul nu este corect." };
  }

  if (tip === "email") {
    const ocupat = await prisma.user.findUnique({ where: { email: date.valoare }, select: { id: true } });
    if (ocupat) return { ok: false, eroare: "Există deja un cont cu acest email." };
    await prisma.user.update({ where: { id: user.id }, data: { email: date.valoare, emailVerified: new Date() } });
  } else if (tip === "telefon") {
    await prisma.user.update({ where: { id: user.id }, data: { phone: date.valoare } });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { password: date.valoare } });
  }
  await stergeEsecurile(cheie, "cont");

  // Anunțul pleacă pe adresa veche: dacă altcineva a făcut schimbarea, titularul află.
  const ce = { email: "Adresa de email", telefon: "Numărul de telefon", parola: "Parola" }[tip];
  const { html, text } = sablon({
    titlu: `${ce} contului a fost schimbat${tip === "parola" ? "ă" : ""}`,
    salut: user.name,
    paragrafe: [
      tip === "email"
        ? `De acum, contul tău Scorer folosește adresa ${date.valoare}.`
        : `${ce} contului tău Scorer tocmai a fost schimbat${tip === "parola" ? "ă" : ""}.`,
      "Dacă nu ai făcut tu schimbarea, scrie-ne imediat răspunzând la acest mesaj.",
    ],
  });
  await trimiteEmail({ catre: user.email, subiect: "Contul tău Scorer a fost modificat", html, text }).catch(() => {});

  return { ok: true, date: { tip } };
}
