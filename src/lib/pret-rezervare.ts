import { oreDeIntuneric } from "@/lib/soare";
import { APP_TIME_ZONE } from "@/lib/datetime";

/**
 * Cât costă o rezervare: ora terenului plus opțiunile alese.
 *
 * Aceeași funcție rulează și în browser, ca totalul să se vadă cât alegi, și
 * pe server, unde e recalculat la creare. Clientul nu trimite niciodată suma —
 * doar ce a bifat.
 */
export type OptiuneTeren = {
  id: string;
  name: string;
  price: number;
  pricing: "PER_HOUR" | "PER_BOOKING";
  autoLaIntuneric: boolean;
  /** Se pune singură în sezonul rece (octombrie–aprilie): încălzire balon. */
  autoLaFrig?: boolean;
};

/** Lunile în care încălzirea balonului se adaugă singură: octombrie–aprilie. */
export const LUNI_SEZON_RECE = [10, 11, 12, 1, 2, 3, 4];

/** Rezervarea începe în sezonul rece? Luna se citește în ora României. */
export function esteSezonRece(data: Date): boolean {
  const luna = Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, month: "numeric" }).format(data));
  return LUNI_SEZON_RECE.includes(luna);
}

export type LinieDePlata = {
  id: string;
  nume: string;
  pretUnitar: number;
  pricing: "PER_HOUR" | "PER_BOOKING";
  unitati: number;
  total: number;
  /** Adevărat pentru opțiunile puse singure, fiindcă intervalul e pe întuneric. */
  automat: boolean;
};

export type PretRezervare = {
  ore: number;
  pretTeren: number;
  linii: LinieDePlata[];
  total: number;
};

export function calculeazaPretul(input: {
  pretPeOra: number;
  inceput: Date;
  sfarsit: Date;
  oras: string;
  optiuni: OptiuneTeren[];
  /** Ce a bifat clientul. Cele automate intră oricum. */
  alese: string[];
}): PretRezervare {
  const ore = Math.max(0, (input.sfarsit.getTime() - input.inceput.getTime()) / 3_600_000);
  const pretTeren = input.pretPeOra * ore;

  // Calculat o singură dată: aceleași ore se folosesc pentru toate opțiunile
  // legate de întuneric.
  let intunecate: number | null = null;
  const oreIntunecate = () => {
    if (intunecate === null) {
      intunecate = oreDeIntuneric(input.inceput, input.sfarsit, input.oras);
    }
    return intunecate;
  };

  const linii: LinieDePlata[] = [];

  for (const optiune of input.optiuni) {
    // Două reguli automate: nocturna după apus, încălzirea în sezonul rece.
    // În afara lor, opțiunea intră doar dacă a bifat-o clientul.
    const laFrig = !!optiune.autoLaFrig;
    if (laFrig && !esteSezonRece(input.inceput)) continue;
    const automat = optiune.autoLaIntuneric || laFrig;
    if (!automat && !input.alese.includes(optiune.id)) continue;

    // Nocturna se taxează doar pentru orele fără lumină; încălzirea, pentru
    // toate orele rezervării.
    const unitati =
      optiune.pricing === "PER_BOOKING"
        ? 1
        : optiune.autoLaIntuneric
          ? oreIntunecate()
          : Math.round(ore);

    if (unitati <= 0) continue;

    linii.push({
      id: optiune.id,
      nume: optiune.name,
      pretUnitar: optiune.price,
      pricing: optiune.pricing,
      unitati,
      total: optiune.price * unitati,
      automat,
    });
  }

  const total = pretTeren + linii.reduce((suma, linie) => suma + linie.total, 0);
  return { ore, pretTeren, linii, total };
}
