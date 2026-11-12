/** Banda de sus a paginilor „Găsește meci”, în stilul primei pagini. */
export function AntetMeciuri({
  eticheta,
  titlu,
  accent,
  descriere,
  children,
}: {
  eticheta: string;
  titlu: string;
  accent: string;
  descriere: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0B2A1C_0%,#07160F_100%)] text-[#F3EFE6]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[200px] rotate-[-24deg] bg-gradient-to-b from-[#F3EFE6]/[0.12] to-transparent blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pb-14 sm:pt-16">
        <p className="text-[13px] font-medium text-[#F3EFE6]/60">{eticheta}</p>
        <h1 className="mt-3 text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.2rem]">
          {titlu} <span className="font-display font-normal italic text-[#F3EFE6]/60">{accent}</span>
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#F3EFE6]/65">{descriere}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
