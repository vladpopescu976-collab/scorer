import { cheieOras } from "@/lib/orase";

/**
 * Răsăritul și apusul, calculate pe loc.
 *
 * „Nocturnă” nu se poate lega de o oră fixă: la 18:00 în decembrie e beznă,
 * iar în iunie mai sunt trei ore de lumină. Formulele sunt cele folosite de
 * NOAA pentru poziția Soarelui; nu cer rețea, deci nu adaugă nici întârziere,
 * nici un serviciu care poate pica.
 */

/** Coordonatele reședințelor de județ, plus câteva orașe mari. */
const COORDONATE: Record<string, [number, number]> = {
  "alba iulia": [46.07, 23.58],
  arad: [46.18, 21.32],
  pitesti: [44.86, 24.87],
  bacau: [46.57, 26.91],
  oradea: [47.06, 21.93],
  "bistrita": [47.13, 24.49],
  botosani: [47.75, 26.66],
  brasov: [45.66, 25.61],
  braila: [45.27, 27.96],
  buzau: [45.15, 26.82],
  resita: [45.3, 21.89],
  "cluj-napoca": [46.77, 23.6],
  constanta: [44.18, 28.63],
  "sfantu gheorghe": [45.86, 25.79],
  targoviste: [44.93, 25.46],
  craiova: [44.32, 23.8],
  galati: [45.44, 28.05],
  giurgiu: [43.9, 25.97],
  "targu jiu": [45.04, 23.27],
  miercurea: [46.36, 25.8],
  "miercurea ciuc": [46.36, 25.8],
  deva: [45.88, 22.9],
  slobozia: [44.56, 27.37],
  iasi: [47.16, 27.59],
  bucuresti: [44.43, 26.11],
  "baia mare": [47.66, 23.58],
  "drobeta-turnu severin": [44.63, 22.66],
  "targu mures": [46.54, 24.56],
  "piatra neamt": [46.93, 26.37],
  slatina: [44.43, 24.37],
  ploiesti: [44.94, 26.03],
  "satu mare": [47.79, 22.88],
  zalau: [47.19, 23.06],
  sibiu: [45.79, 24.15],
  suceava: [47.65, 26.26],
  alexandria: [43.97, 25.33],
  timisoara: [45.75, 21.23],
  tulcea: [45.18, 28.8],
  vaslui: [46.64, 27.73],
  "ramnicu valcea": [45.1, 24.37],
  "râmnicu vâlcea": [45.1, 24.37],
  focsani: [45.7, 27.18],
  "calarasi": [44.2, 27.33],
};

/** Mijlocul țării — folosit când orașul nu e în listă. */
const IMPLICIT: [number, number] = [45.9, 24.9];

export function coordonateleOrasului(oras: string): [number, number] {
  return COORDONATE[cheieOras(oras)] ?? IMPLICIT;
}

const rad = (grade: number) => (grade * Math.PI) / 180;
const sin = (grade: number) => Math.sin(rad(grade));
const cos = (grade: number) => Math.cos(rad(grade));

/**
 * Momentele răsăritului și apusului pentru o zi, ca instanți UTC.
 *
 * Întoarce null în situația (imposibilă în România) în care Soarele nu răsare
 * sau nu apune deloc în ziua aceea.
 */
export function rasaritSiApus(
  zi: Date,
  latitudine: number,
  longitudine: number
): { rasarit: Date; apus: Date } | null {
  const zilaJuliana = zi.getTime() / 86_400_000 + 2440587.5;
  const nrZile = Math.round(zilaJuliana - 2451545.0 + 0.0008);

  // Amiaza solară medie. Longitudinea estică se scade: mai la est, Soarele
  // ajunge la zenit mai devreme.
  const amiazaMedie = nrZile - longitudine / 360;

  const anomalie = (357.5291 + 0.98560028 * amiazaMedie) % 360;
  const ecuatiaCentrului =
    1.9148 * sin(anomalie) + 0.02 * sin(2 * anomalie) + 0.0003 * sin(3 * anomalie);
  const longitudineEcliptica = (anomalie + ecuatiaCentrului + 180 + 102.9372) % 360;

  const tranzit =
    2451545.0 +
    amiazaMedie +
    0.0053 * sin(anomalie) -
    0.0069 * sin(2 * longitudineEcliptica);

  const sinDeclinatie = sin(longitudineEcliptica) * sin(23.44);
  const declinatie = (Math.asin(sinDeclinatie) * 180) / Math.PI;

  // -0,833° ține cont de refracția atmosferică și de raza discului solar.
  const cosUnghiOrar =
    (sin(-0.833) - sin(latitudine) * sinDeclinatie) / (cos(latitudine) * cos(declinatie));
  if (cosUnghiOrar > 1 || cosUnghiOrar < -1) return null;

  const unghiOrar = (Math.acos(cosUnghiOrar) * 180) / Math.PI;
  const laInstant = (zileJuliene: number) =>
    new Date(Math.round((zileJuliene - 2440587.5) * 86_400_000));

  return {
    rasarit: laInstant(tranzit - unghiOrar / 360),
    apus: laInstant(tranzit + unghiOrar / 360),
  };
}

/**
 * Câte ore din interval au nevoie de lumină artificială.
 *
 * Se numără ora cu ora: o rezervare de la 17:00 la 20:00 în octombrie are
 * două ore de nocturnă, nu trei.
 */
export function oreDeIntuneric(
  inceput: Date,
  sfarsit: Date,
  oras: string
): number {
  const [latitudine, longitudine] = coordonateleOrasului(oras);
  let intunecate = 0;

  for (let ora = new Date(inceput); ora < sfarsit; ora = new Date(ora.getTime() + 3_600_000)) {
    const urmatoarea = new Date(Math.min(ora.getTime() + 3_600_000, sfarsit.getTime()));
    // Mijlocul orei decide: o oră care începe fix la apus e deja în amurg.
    const mijloc = new Date((ora.getTime() + urmatoarea.getTime()) / 2);

    const lumina = rasaritSiApus(mijloc, latitudine, longitudine);
    if (!lumina) continue;
    if (mijloc < lumina.rasarit || mijloc > lumina.apus) intunecate++;
  }

  return intunecate;
}
