// Intrarea paginii e animată doar din CSS: conținutul se vede chiar dacă
// JavaScript-ul încă se încarcă (telefon lent, prima vizită). Înainte, cu
// framer-motion, pagina pornea cu opacity:0 și rămânea ștearsă până la hidratare,
// iar textul alb apărea pe fundal aproape alb.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="intrare-pagina">{children}</div>;
}
