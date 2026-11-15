import type { SportType } from "@prisma/client";

/** Pozițiile fiecărui sport; la tenis, padel, badminton nu există poziții. */
export const POZITII: Record<SportType, string[]> = {
  FOOTBALL: ["Portar", "Fundaș", "Mijlocaș", "Atacant"],
  BASKETBALL: ["Conducător", "Extremă", "Pivot"],
  HANDBALL: ["Portar", "Extremă", "Inter", "Centru", "Pivot"],
  VOLLEYBALL: ["Ridicător", "Trăgător", "Central", "Libero"],
  TENNIS: [],
  PADEL: [],
  BADMINTON: [],
  OTHER: [],
};

export const ZILE_SCURTE = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"] as const;

/** „Vin, Sâm, Dum · 18:00–22:00”, sau null dacă n-a spus nimic. */
export function textDisponibilitate(zile: number[], oraDe: number | null, oraPana: number | null): string | null {
  const ore = (n: number) => `${String(n).padStart(2, "0")}:00`;
  const partiZile =
    zile.length === 0 || zile.length === 7
      ? zile.length === 7 ? "Zilnic" : null
      : zile.length === 5 && [1, 2, 3, 4, 5].every((z) => zile.includes(z))
        ? "Luni–vineri"
        : zile.length === 2 && zile.includes(6) && zile.includes(7)
          ? "Weekend"
          : zile.map((z) => ZILE_SCURTE[z - 1]).join(", ");
  const parteOre = oraDe != null && oraPana != null ? `${ore(oraDe)}–${ore(oraPana)}` : null;
  if (!partiZile && !parteOre) return null;
  return [partiZile, parteOre].filter(Boolean).join(" · ");
}
