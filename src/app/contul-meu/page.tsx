import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PaginaCont } from "@/components/cont/pagina-cont";

export const metadata: Metadata = { title: "Contul meu — Scorer" };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ContulMeuPage() {
  const session = await auth();
  if (!session?.user) redirect("/autentificare");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, email: true, role: true, phone: true, city: true, sports: true,
      birthDate: true, skillLevel: true, preferredTimes: true,
      companyName: true, website: true,
      marketingOptIn: true, createdAt: true,
      _count: { select: { bookings: true, fields: true, reviews: true } },
    },
  });
  if (!user) redirect("/autentificare");

  return <PaginaCont user={user} />;
}
