/**
 * Cine a făcut o rezervare — fie un cont, fie cineva care a lăsat doar datele
 * de contact.
 *
 * Toate locurile care arată „clientul” trec pe aici, ca să nu ajungă undeva un
 * `customer.name` pe o rezervare fără cont și să crape pagina.
 */
export type SursaClient = {
  customer: { name: string; email?: string | null; phone?: string | null } | null;
  guestName: string | null;
  guestEmail?: string | null;
  guestPhone: string | null;
};

export type ClientRezervare = {
  nume: string;
  email: string | null;
  telefon: string | null;
  /** Fals când rezervarea a fost făcută fără cont. */
  areCont: boolean;
};

export function clientulRezervarii(rezervare: SursaClient): ClientRezervare {
  if (rezervare.customer) {
    return {
      nume: rezervare.customer.name,
      email: rezervare.customer.email ?? null,
      telefon: rezervare.customer.phone ?? null,
      areCont: true,
    };
  }

  return {
    nume: rezervare.guestName ?? "Client fără cont",
    email: rezervare.guestEmail ?? null,
    telefon: rezervare.guestPhone ?? null,
    areCont: false,
  };
}
