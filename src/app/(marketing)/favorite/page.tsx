import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FieldCard } from "@/components/field-card";
import { AntetPagina, StareGoala } from "@/components/antet-pagina";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Terenurile mele favorite — Scorer",
};

export default async function FavoritePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/autentificare?tip=personal");
  }
  if (session.user.role !== "PERSONAL") {
    redirect("/dashboard/business");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { field: true },
  });

  const visible = favorites.filter((f) => f.field.isActive);

  return (
    <>
    <AntetPagina eticheta="Favorite" titlu="Terenurile tale." accent="La un clic." descriere="Terenurile pe care le-ai salvat, ca să rezervi mai repede data viitoare." />
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        {visible.length === 0 ? (
          <StareGoala
            icon={Heart}
            titlu="Niciun teren salvat încă"
            text="Apasă pe inima din colțul unui teren și îl găsești aici data viitoare, la un clic."
            actiune={{ eticheta: "Caută terenuri", href: "/cauta-terenuri" }}
          />
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? "teren salvat" : "terenuri salvate"}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((favorite, index) => (
                <FieldCard
                  key={favorite.id}
                  index={index}
                  isFavorite
                  field={{
                    id: favorite.field.id,
                    name: favorite.field.name,
                    city: favorite.field.city,
                    sportType: favorite.field.sportType,
                    pricePerHour: Number(favorite.field.pricePerHour),
                    images: favorite.field.images,
                    contactPhone: favorite.field.contactPhone,
                    formate: favorite.field.formate,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
