import type { SportType } from "@prisma/client";

/**
 * Dimensiunea unui teren, spusă cum o spun jucătorii: „5+1” la fotbal
 * (5 jucători de câmp și un portar pe echipă), „3x3” la baschet etc.
 * Un teren poate avea mai multe formate, dacă se poate împărți sau lărgi.
 */
export type FormatTeren = {
  cod: string;
  /** Jucători în total, ambele echipe. */
  jucatori: number;
  nota?: string;
};

export const FORMATE_PE_SPORT: Record<SportType, FormatTeren[]> = {
  FOOTBALL: [
    { cod: "4+1", jucatori: 10 },
    { cod: "5+1", jucatori: 12 },
    { cod: "6+1", jucatori: 14 },
    { cod: "7+1", jucatori: 16 },
    { cod: "8+1", jucatori: 18 },
    { cod: "10+1", jucatori: 22, nota: "teren mare" },
  ],
  BASKETBALL: [
    { cod: "3x3", jucatori: 6, nota: "jumătate de teren" },
    { cod: "5x5", jucatori: 10, nota: "teren întreg" },
  ],
  TENNIS: [
    { cod: "1x1", jucatori: 2, nota: "simplu" },
    { cod: "2x2", jucatori: 4, nota: "dublu" },
  ],
  VOLLEYBALL: [
    { cod: "2x2", jucatori: 4, nota: "plajă" },
    { cod: "4x4", jucatori: 8 },
    { cod: "6x6", jucatori: 12, nota: "sală" },
  ],
  HANDBALL: [
    { cod: "4+1", jucatori: 10, nota: "minihandbal" },
    { cod: "6+1", jucatori: 14 },
  ],
  PADEL: [
    { cod: "1x1", jucatori: 2, nota: "single" },
    { cod: "2x2", jucatori: 4, nota: "dublu" },
  ],
  BADMINTON: [
    { cod: "1x1", jucatori: 2, nota: "simplu" },
    { cod: "2x2", jucatori: 4, nota: "dublu" },
  ],
  OTHER: [],
};

export function formatePentru(sport: SportType): FormatTeren[] {
  return FORMATE_PE_SPORT[sport] ?? [];
}

export function esteFormatValid(sport: SportType, cod: string): boolean {
  return formatePentru(sport).some((f) => f.cod === cod);
}

/**
 * Filtrul din URL („5+1,6+1”) → doar codurile valide pentru sport. Un „+”
 * nescăpat ajunge din URL ca spațiu, de aceea spațiile redevin „+”.
 */
export function dimensiuniDinParametru(sport: SportType, valoare: string | null | undefined): string[] {
  if (!valoare) return [];
  return valoare
    .split(",")
    .map((cod) => cod.trim().replace(/\s+/g, "+"))
    .filter((cod) => esteFormatValid(sport, cod));
}

/** Formatele salvate, în ordinea din catalog, cu detaliile lor. */
export function formateleTerenului(sport: SportType, coduri: string[]): FormatTeren[] {
  return formatePentru(sport).filter((f) => coduri.includes(f.cod));
}
