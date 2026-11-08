import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RezultatSocial =
  | { ok: true; id: string; nume: string; email: string; rol: Role; telefon: string | null }
  | { ok: false; eroare: string };

/**
 * Autentificarea prin Google sau Apple, comună pentru site și aplicație.
 *
 * Reguli de securitate:
 * - emailul trebuie confirmat de furnizor; altfel cineva ar putea revendica
 *   adresa altcuiva doar scriind-o la un furnizor care nu o verifică;
 * - un cont existent se leagă doar dacă tipul ales (Personal/Business) e cel
 *   al contului, la fel ca la autentificarea cu parolă;
 * - un cont nou primește o parolă aleatoare, pe care nimeni nu o cunoaște:
 *   intri prin furnizor sau prin „Am uitat parola".
 */
export async function autentificaSocial(date: {
  email: string | null | undefined;
  emailConfirmat: boolean;
  nume?: string | null;
  rol: Role;
}): Promise<RezultatSocial> {
  const email = date.email?.trim().toLowerCase();
  if (!email) return { ok: false, eroare: "Furnizorul nu ne-a trimis adresa de email." };
  if (!date.emailConfirmat) {
    return { ok: false, eroare: "Adresa de email nu este confirmată la furnizor." };
  }

  const existent = await prisma.user.findUnique({ where: { email } });
  if (existent) {
    if (existent.role !== date.rol) {
      return {
        ok: false,
        eroare:
          date.rol === "PERSONAL"
            ? "Acest email are un cont Business. Alege „Business” la autentificare."
            : "Acest email are un cont Personal. Alege „Personal” la autentificare.",
      };
    }
    // Furnizorul a confirmat adresa, deci contul neconfirmat se poate activa.
    const user = existent.emailVerified
      ? existent
      : await prisma.user.update({ where: { id: existent.id }, data: { emailVerified: new Date() } });
    return {
      ok: true, id: user.id, nume: user.name, email: user.email, rol: user.role, telefon: user.phone,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: date.nume?.trim() || email.split("@")[0],
      password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      role: date.rol,
      emailVerified: new Date(),
      acceptedTermsAt: new Date(),
    },
  });
  return {
    ok: true, id: user.id, nume: user.name, email: user.email, rol: user.role, telefon: user.phone,
  };
}

export const googleActiv = () => !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
export const appleActiv = () => !!process.env.AUTH_APPLE_ID && !!process.env.AUTH_APPLE_SECRET;
