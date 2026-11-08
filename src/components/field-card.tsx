"use client";

import Link from "next/link";
import { FieldImage } from "@/components/field-image";
import { motion } from "framer-motion";
import { MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorite-button";
import { TelefonTeren } from "@/components/telefon-teren";
import { telefonAfisat } from "@/lib/telefon";
import { sportMeta } from "@/lib/sports";
import { formateleTerenului } from "@/lib/formate-teren";
import type { SportType } from "@prisma/client";

export type FieldCardData = {
  id: string;
  name: string;
  city: string;
  sportType: SportType;
  pricePerHour: number;
  images: string[];
  /** Numărul de contact, pentru programările date la telefon. */
  contactPhone: string | null;
  /** Dimensiunea în jucători: „5+1”, „3x3”… */
  formate?: string[];
};

export function FieldCard({
  field,
  index = 0,
  isFavorite,
}: {
  field: FieldCardData;
  index?: number;
  /** Lipsește pentru vizitatori și conturi Business — inima nu se afișează. */
  isFavorite?: boolean;
}) {
  const meta = sportMeta[field.sportType];
  const SportIcon = meta.icon;
  const coverImage = field.images[0];
  const formate = formateleTerenului(field.sportType, field.formate ?? []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] as const }}
      whileHover={{ y: -6 }}
      className="group relative"
    >
      {isFavorite !== undefined && (
        <FavoriteButton fieldId={field.id} initialFavorite={isFavorite} />
      )}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
        <Link href={`/terenuri/${field.id}`} className="block">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-muted">
            {coverImage ? (
              <FieldImage
                src={coverImage}
                alt={field.name}
                sizes="(max-width: 640px) 100vw, 33vw"
                className="transition-transform duration-500 group-hover:scale-105"
                fallback={<SportIcon className="h-12 w-12 text-primary/40" strokeWidth={1.5} />}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <SportIcon className="h-12 w-12 text-primary/40" strokeWidth={1.5} />
              </div>
            )}
            <Badge className="absolute left-3 top-3 gap-1 bg-background/90 text-foreground backdrop-blur-sm">
              <SportIcon className="h-3.5 w-3.5" />
              {meta.label}
            </Badge>
          </div>

          <div className="space-y-2 p-4 pb-3">
            <p className="truncate font-medium leading-tight">{field.name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {field.city}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold">{field.pricePerHour.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">RON / oră</span>
              </div>
              {formate.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold tabular-nums">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {formate.map((f) => f.cod).join(" · ")}
                </span>
              )}
            </div>
          </div>
        </Link>

        {telefonAfisat(field.contactPhone) && (
          <div className="border-t">
            <TelefonTeren telefon={field.contactPhone} marime="rand" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
