"use server";

import { auth, signOut } from "@/auth";
import { stergeContul } from "@/lib/cont";
import { type ActionResult, fail, ok, toActionError } from "@/lib/actions/result";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cereSchimbare, confirmaSchimbare } from "@/lib/schimbari-cont";

/**
 * Ștergerea contului cerută din interfața web.
 *
 * Deconectarea se face aici, nu în client: după ștergere, cookie-ul de sesiune
 * ar trimite mai departe către un cont care nu mai există.
 */
export async function stergeContulMeu(parola: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return fail("Sesiunea a expirat. Autentifică-te din nou.");

    const rezultat = await stergeContul(session.user.id, parola);
    if (!rezultat.ok) return fail(rezultat.motiv);

    await signOut({ redirect: false });
    return ok();
  } catch (error) {
    return toActionError("stergeContulMeu", error);
  }
}

// MARK: schimbarea emailului, telefonului și parolei

const tipSchimbare = z.enum(["email", "telefon", "parola"]);

export async function cereSchimbareCont(input: {
  tip: "email" | "telefon" | "parola";
  parolaCurenta: string;
  valoareNoua: string;
}): Promise<ActionResult<{ token: string; trimisLa: string }>> {
  try {
    const session = await auth();
    if (!session?.user) return fail("Sesiunea a expirat. Autentifică-te din nou.");
    const date = z
      .object({ tip: tipSchimbare, parolaCurenta: z.string().min(1, "Scrie parola actuală."), valoareNoua: z.string().min(1, "Completează valoarea nouă.") })
      .parse(input);
    const rezultat = await cereSchimbare({ userId: session.user.id, ...date });
    return rezultat.ok ? ok(rezultat.date) : fail(rezultat.eroare);
  } catch (error) {
    return toActionError("cereSchimbareCont", error);
  }
}

export async function confirmaSchimbareCont(input: { token: string; cod: string }): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return fail("Sesiunea a expirat. Autentifică-te din nou.");
    const date = z.object({ token: z.string().min(10), cod: z.string().min(6, "Codul are 6 cifre.") }).parse(input);
    const rezultat = await confirmaSchimbare({ userId: session.user.id, ...date });
    if (!rezultat.ok) return fail(rezultat.eroare);
    revalidatePath("/contul-meu");
    return ok();
  } catch (error) {
    return toActionError("confirmaSchimbareCont", error);
  }
}
