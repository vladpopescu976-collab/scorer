import { Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { telefonAfisat, telefonPentruApel } from "@/lib/telefon";

/**
 * Numărul terenului, ca link de apelare.
 *
 * Pe telefon, o apăsare deschide apelul; pe desktop rămâne comportamentul
 * nativ al browserului, iar numărul se poate copia. Dacă valoarea nu seamănă
 * a număr, se afișează ca text simplu — un `tel:` gol ar fi doar un link mort.
 */
export function TelefonTeren({
  telefon,
  marime = "mic",
  className,
}: {
  telefon: string | null | undefined;
  /**
   * „mare” pentru antetul paginii terenului, „rand” pentru subsolul cardului,
   * unde linkul ocupă toată lățimea ca să fie ușor de atins cu degetul.
   */
  marime?: "mic" | "mare" | "rand";
  className?: string;
}) {
  const afisat = telefonAfisat(telefon);
  if (!afisat) return null;

  const deApelat = telefonPentruApel(telefon);

  const continut = (
    <>
      <Phone
        className={cn("shrink-0", marime === "mic" ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      <span className="tabular-nums">{afisat}</span>
    </>
  );

  if (!deApelat) {
    return (
      <span className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        {continut}
      </span>
    );
  }

  return (
    <a
      href={`tel:${deApelat}`}
      aria-label={`Sună la ${afisat}`}
      className={cn(
        "flex items-center gap-1.5 font-medium text-primary transition-colors hover:bg-primary/10",
        // Zonă de atins de cel puțin 44px pe telefon, unde se sună cel mai des.
        marime === "rand"
          ? "min-h-11 w-full px-4 py-3 text-sm"
          : marime === "mare"
            ? "-mx-2 min-h-11 rounded-lg px-2 py-2 text-[15px]"
            : "-mx-1.5 min-h-11 rounded-lg px-1.5 py-2 text-sm sm:min-h-0 sm:py-1",
        className
      )}
    >
      {continut}
    </a>
  );
}
