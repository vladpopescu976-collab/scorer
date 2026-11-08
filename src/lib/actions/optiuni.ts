"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, toActionError, type ActionResult } from "@/lib/actions/result";

type Acces = { eroare: string } | { eroare?: undefined; ownerId: string };

async function terenulMeu(fieldId: string): Promise<Acces> {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS") {
    return { eroare: "Sesiunea a expirat. Autentifică-te din nou cu contul Business." };
  }
  const field = await prisma.field.findUnique({ where: { id: fieldId }, select: { ownerId: true } });
  if (!field || field.ownerId !== session.user.id) {
    return { eroare: "Terenul nu a fost găsit." };
  }
  return { ownerId: session.user.id };
}

const schema = z.object({
  fieldId: z.string().min(1),
  name: z.string().trim().min(2, "Scrie o denumire.").max(60, "Denumirea este prea lungă."),
  price: z.number().positive("Prețul trebuie să fie mai mare decât 0."),
  pricing: z.enum(["PER_HOUR", "PER_BOOKING"]),
  autoLaIntuneric: z.boolean(),
  autoLaFrig: z.boolean().optional().default(false),
});

export async function adaugaOptiune(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const date = schema.parse(input);
    const acces = await terenulMeu(date.fieldId);
    if (acces.eroare) return fail(acces.eroare);

    // O opțiune care se pune singură la întuneric se taxează pe oră; „o dată
    // pe rezervare” n-ar avea ce înmulți cu orele de după apus.
    if (date.autoLaIntuneric && date.autoLaFrig) {
      return fail("Alege o singură regulă automată: la întuneric sau în sezonul rece.");
    }
    if (date.autoLaIntuneric && date.pricing !== "PER_HOUR") {
      return fail("O opțiune care se adaugă la întuneric se taxează pe oră.");
    }

    await prisma.fieldExtra.create({
      data: {
        fieldId: date.fieldId,
        name: date.name,
        price: date.price,
        pricing: date.pricing,
        autoLaIntuneric: date.autoLaIntuneric,
        autoLaFrig: date.autoLaFrig,
      },
    });

    revalidatePath("/dashboard/business/terenuri");
    revalidatePath(`/terenuri/${date.fieldId}`);
    return ok();
  } catch (error) {
    return toActionError("adaugaOptiune", error);
  }
}

export async function stergeOptiune(extraId: string): Promise<ActionResult> {
  try {
    const extra = await prisma.fieldExtra.findUnique({
      where: { id: extraId },
      select: { fieldId: true },
    });
    if (!extra) return fail("Opțiunea nu a fost găsită.");

    const acces = await terenulMeu(extra.fieldId);
    if (acces.eroare) return fail(acces.eroare);

    // Rezervările deja făcute păstrează copia lor, deci nu se schimbă nimic
    // pentru cine a rezervat până acum.
    await prisma.fieldExtra.delete({ where: { id: extraId } });

    revalidatePath("/dashboard/business/terenuri");
    revalidatePath(`/terenuri/${extra.fieldId}`);
    return ok();
  } catch (error) {
    return toActionError("stergeOptiune", error);
  }
}
