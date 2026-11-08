/**
 * Sigla Scorer: un „S” trasat pe liniile unui teren văzut de sus. Terenul și
 * cercul de la mijloc stau discret în spate, „S”-ul e traseul luminos. Ia
 * culoarea textului din jur, deci merge pe orice fundal.
 */
export function SemnScorer({ className }: { className?: string }) {
  return (
    <svg viewBox="268 192 488 640" className={className} aria-hidden fill="none" stroke="currentColor">
      <rect x="300" y="224" width="424" height="576" rx="72" strokeOpacity="0.22" strokeWidth="56" />
      <circle cx="512" cy="512" r="104" strokeOpacity="0.5" strokeWidth="40" />
      <path
        d="M724 224H372A72 72 0 0 0 300 296V440A72 72 0 0 0 372 512H652A72 72 0 0 1 724 584V728A72 72 0 0 1 652 800H300"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
