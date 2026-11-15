import { AntetPagina } from "@/components/antet-pagina";

/** Banda de sus a paginilor „Găsește meci”: aceeași ca restul site-ului. */
export function AntetMeciuri(props: { eticheta: string; titlu: string; accent: string; descriere: string; children?: React.ReactNode }) {
  return <AntetPagina {...props} />;
}
