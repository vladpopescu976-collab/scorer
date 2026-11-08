"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import { cerinteParola } from "@/lib/parola-sigura";
import { cn } from "@/lib/utils";

/** Lista de cerințe, care se bifează animat cât scrii parola. */
export function CerinteParola({ parola, nume, email }: { parola: string; nume: string; email: string }) {
  if (!parola) return null;
  const cerinte = cerinteParola(parola, nume, email);

  return (
    <motion.ul
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 grid grid-cols-1 gap-3 overflow-hidden rounded-xl border bg-muted/40 p-4"
      aria-label="Cerințe pentru parolă"
    >
      {cerinte.map((c) => (
        <li
          key={c.id}
          className={cn(
            "flex items-center gap-3 text-sm leading-snug transition-colors",
            c.indeplinita ? "font-medium text-primary" : "text-foreground/75"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              c.indeplinita
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40"
            )}
          >
            <AnimatePresence initial={false}>
              {c.indeplinita && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span>
            {c.eticheta}
            {!c.obligatorie && <span className="font-normal text-muted-foreground"> · recomandat</span>}
          </span>
        </li>
      ))}
    </motion.ul>
  );
}
