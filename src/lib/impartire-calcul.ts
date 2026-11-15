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
