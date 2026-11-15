/** Split the bill: calculele, comune pentru site, server și aplicație. */

export const MIN_PARTI = 2;
export const MAX_PARTI = 30;

/** Partea fiecărui prieten, rotunjită în sus la bani; organizatorul acoperă restul. */
export function calculeazaPartile(total: number, numarParti: number) {
  const sumaParte = Math.ceil((total * 100) / numarParti) / 100;
  const parteaOrganizatorului = Math.max(0, Math.round((total - sumaParte * (numarParti - 1)) * 100) / 100);
  return { sumaParte, parteaOrganizatorului };
}

/** 15 → „15”, 14.17 → „14,17”. */
export function lei(suma: number) {
  return Number.isInteger(suma) ? String(suma) : suma.toFixed(2).replace(".", ",");
}

/**
 * Cât timp se pot strânge banii, după cât de devreme rezervi:
 * sub 12 ore nu se poate împărți; 12–24 ore: o oră; 24–36 ore: 6 ore; de la 36 de ore: 12 ore.
 */
export const ORE_MINIME_SPLIT = 12;

export function oreDeStrans(oreInainte: number): number | null {
  if (oreInainte < ORE_MINIME_SPLIT) return null;
  if (oreInainte < 24) return 1;
  if (oreInainte < 36) return 6;
  return 12;
}

/** „1 oră”, „6 ore”, „12 ore”. */
export function textOre(ore: number) {
  return ore === 1 ? "o oră" : `${ore} ore`;
}
