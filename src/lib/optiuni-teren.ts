import type { FieldExtra } from "@prisma/client";

import type { LinieDePlata, OptiuneTeren } from "@/lib/pret-rezervare";

/** Rândul din baza de date, adus la forma cu care lucrează calculul. */
export function optiuneDinTeren(extra: FieldExtra): OptiuneTeren {
  return {
    id: extra.id,
    name: extra.name,
    price: Number(extra.price),
    pricing: extra.pricing,
    autoLaIntuneric: extra.autoLaIntuneric,
    autoLaFrig: extra.autoLaFrig,
  };
}

/**
 * Linia de plată, pregătită pentru salvare. Numele și prețul se copiază pe
 * rezervare: o schimbare de tarif de mâine nu trebuie să rescrie o rezervare
 * de azi.
 */
export function linieDeSalvat(linie: LinieDePlata) {
  return {
    name: linie.nume,
    unitPrice: linie.pretUnitar,
    pricing: linie.pricing,
    units: linie.unitati,
    total: linie.total,
  } as const;
}
