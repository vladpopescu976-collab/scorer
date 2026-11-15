import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { impartirePublica } from "@/lib/impartire-plata";
import { ImpartireNota } from "@/components/imparte/impartire-nota";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Split the bill · Scorer",
  description: "Plătește-ți partea din rezervarea terenului.",
  robots: { index: false },
};

/** Pagina din linkul de split the bill: cine a plătit și butonul pentru partea ta. */
export default async function ImpartePage({ params }: { params: Promise<{ cod: string }> }) {
  const { cod } = await params;
  const sesiune = await auth();
  const date = await impartirePublica(cod, sesiune?.user?.id ?? null);
  if (!date) notFound();
  return (
    <ImpartireNota
      date={date}
      conectat={!!sesiune?.user}
      estePersonal={sesiune?.user?.role === "PERSONAL"}
    />
  );
}
