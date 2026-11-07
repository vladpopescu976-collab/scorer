// Culoarea unui bloc din calendar spune de unde vine ora ocupată, nu în ce
// stare e. Proprietarul care se uită la zi vrea întâi să știe pe cine are în
// față: un client venit de pe site, unul care a sunat, sau propriul eveniment.

export type FelInterval = "site" | "telefon" | "privat";

export type StilInterval = {
  eticheta: string;
  /** Fundalul blocului, în temă deschisă și întunecată. */
  fundal: string;
  /** Dunga groasă din stânga. */
  margine: string;
  text: string;
  /** Bulina din legendă. */
  bulina: string;
};

export const FEL_INTERVAL: Record<FelInterval, StilInterval> = {
  site: {
    eticheta: "Rezervare pe site",
    fundal: "bg-emerald-50 dark:bg-emerald-500/10",
    margine: "border-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bulina: "bg-emerald-500",
  },
  telefon: {
    eticheta: "Comandă telefonică",
    fundal: "bg-blue-50 dark:bg-blue-500/10",
    margine: "border-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bulina: "bg-blue-500",
  },
  privat: {
    eticheta: "Eveniment privat",
    fundal: "bg-violet-50 dark:bg-violet-500/10",
    margine: "border-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    bulina: "bg-violet-500",
  },
};

/** Cum arată o rezervare care nu mai e activă: anulată, respinsă, expirată. */
export const STIL_INACTIV: StilInterval = {
  eticheta: "Anulată sau respinsă",
  fundal: "bg-muted",
  margine: "border-muted-foreground/50",
  text: "text-muted-foreground",
  bulina: "bg-muted-foreground/50",
};

/**
 * Haşura peste o rezervare la care proprietarul încă nu a răspuns. Culoarea
 * rămâne a sursei, ca să nu se piardă de unde vine ora; haşura adaugă
 * informația că mai e ceva de făcut.
 */
export const HASURA_IN_ASTEPTARE =
  "repeating-linear-gradient(45deg, rgba(100,116,139,0.16) 0 5px, transparent 5px 10px)";

/**
 * O blocare cu nume de client e o oră luată la telefon; fără nume, e
 * evenimentul propriu al proprietarului (mentenanță, turneu, chirie privată).
 */
export function felBlocare(clientName: string | null | undefined): FelInterval {
  return clientName?.trim() ? "telefon" : "privat";
}
