import type { BookingStatus } from "@prisma/client";

/**
 * Ce status primește o rezervare nou creată.
 *
 * Proprietarul vrea să se uite doar la cererile de ultim moment. Cele făcute
 * cu destul timp înainte se confirmă singure, ca să nu stea clientul degeaba
 * în așteptare pentru o oră liberă de peste două săptămâni.
 *
 * `autoConfirmDays` egal cu 0 înseamnă confirmare manuală pentru tot.
 */
export function statusLaCreare(inceput: Date, autoConfirmDays: number): BookingStatus {
  if (autoConfirmDays <= 0) return "PENDING";

  const zilePanaLaOra = (inceput.getTime() - Date.now()) / 86_400_000;
  return zilePanaLaOra >= autoConfirmDays ? "CONFIRMED" : "PENDING";
}
