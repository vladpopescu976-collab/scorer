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
