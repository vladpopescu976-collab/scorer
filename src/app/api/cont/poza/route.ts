import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { primulFisier, salveazaPozaProfil, stergePozaProfil } from "@/lib/poza-profil";

export const maxDuration = 60;

/** Poza de profil încărcată de pe site (sesiunea din cookie). */
export async function POST(request: Request) {
  const sesiune = await auth();
  if (!sesiune?.user?.id) return NextResponse.json({ error: "Trebuie să fii conectat." }, { status: 401 });

  try {
    const rezultat = await salveazaPozaProfil(sesiune.user.id, primulFisier(await request.formData()));
    if (!rezultat.ok) return NextResponse.json({ error: rezultat.mesaj }, { status: rezultat.cod });
    return NextResponse.json({ poza: rezultat.adresa }, { status: 201 });
  } catch (error) {
    console.error("[poza-profil-web]", error);
    return NextResponse.json({ error: "Poza nu a putut fi salvată. Încearcă din nou." }, { status: 500 });
  }
}

export async function DELETE() {
  const sesiune = await auth();
  if (!sesiune?.user?.id) return NextResponse.json({ error: "Trebuie să fii conectat." }, { status: 401 });

  try {
    await stergePozaProfil(sesiune.user.id);
    return NextResponse.json({ sters: true });
  } catch (error) {
    console.error("[sterge-poza-profil-web]", error);
    return NextResponse.json({ error: "Poza nu a putut fi scoasă." }, { status: 500 });
  }
}
