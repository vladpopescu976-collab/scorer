import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { confirmareaEsteObligatorie, trimiteConfirmarea } from "@/lib/verificare-email";
import { normalizeazaOras } from "@/lib/orase";
import { ipDinCerere } from "@/lib/limitare";
import { verificaInregistrare } from "@/lib/inregistrare-sigura";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();

  // Capcană pentru scripturi: câmpul e ascuns oamenilor, deci doar un script îl
  // completează. Răspundem ca la o reușită, ca să nu afle ce l-a trădat.
  if (typeof body?.confirmaEmail === "string" && body.confirmaEmail !== "") {
    return NextResponse.json({ stare: "asteapta-confirmare", email: String(body.email ?? ""), emailTrimis: true });
  }
  // Un om nu completează patru pași în sub patru secunde.
  const deschisLa = Number(body?.deschisLa);
  if (Number.isFinite(deschisLa) && Date.now() - deschisLa < 4000) {
    return NextResponse.json({ error: "Ai completat formularul prea repede. Mai încearcă o dată." }, { status: 429 });
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Date invalide. Verifică formularul." },
      { status: 400 }
    );
  }

  const {
    name, email, password, role, phone, city, sports,
    birthDate, skillLevel, preferredTimes,
    companyName, website,
    marketingOptIn,
  } = parsed.data;

  const refuz = await verificaInregistrare({
    ip: ipDinCerere(request),
    email,
    parola: password,
    nume: name,
  });
  if (refuz) return NextResponse.json({ error: refuz.mesaj }, { status: refuz.status });

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (existingUser) {
    // Un cont creat si neconfirmat blocheaza adresa. In loc sa spunem doar
    // „exista deja”, retrimitem linkul: e cazul cel mai probabil, cineva care
    // a inchis emailul si a reluat inregistrarea.
    if (!existingUser.emailVerified) {
      const rezultat = await trimiteConfirmarea(existingUser);
      return NextResponse.json({
        stare: "asteapta-confirmare",
        email: existingUser.email,
        emailTrimis: rezultat.trimis,
        motiv: rezultat.trimis ? undefined : rezultat.motiv,
      });
    }

    return NextResponse.json(
      { error: "Există deja un cont cu acest email." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || null,
      city: city ? normalizeazaOras(city) : null,
      // Fiecare tip de cont pastreaza doar ce l-am intrebat: un cont Personal
      // n-are CUI, iar unul Business n-are nivel de joc.
      ...(role === "BUSINESS"
        ? {
            companyName: companyName || null,
            website: website || null,
            sports,
          }
        : {
            sports,
            birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null,
            skillLevel: skillLevel ?? null,
            preferredTimes,
          }),
      acceptedTermsAt: new Date(),
      marketingOptIn,
      // Ramane null cand confirmarea e obligatorie: contul exista, dar nu se
      // poate autentifica pana cand adresa nu e confirmata.
      emailVerified: confirmareaEsteObligatorie ? null : new Date(),
    },
  });

  if (!confirmareaEsteObligatorie) {
    return NextResponse.json({ stare: "gata", email: user.email }, { status: 201 });
  }

  const rezultat = await trimiteConfirmarea(user);

  return NextResponse.json(
    {
      stare: "asteapta-confirmare",
      email: user.email,
      emailTrimis: rezultat.trimis,
      motiv: rezultat.trimis ? undefined : rezultat.motiv,
    },
    { status: 201 }
  );
}
