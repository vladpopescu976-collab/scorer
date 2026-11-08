"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle } from "lucide-react";

import { cerinteParola } from "@/lib/parola-sigura";
import { cn } from "@/lib/utils";

/** Lista de cerințe, care se bifează animat cât scrii parola. */
export function CerinteParola({
  parola,
  nume,
  email,
}: {
  parola: string;
  nume: string;
  email: string;
}) {
  if (!parola) return null;
  const cerinte = cerinteParola(parola, nume, email);

  return (
    <motion.ul
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2.5 overflow-hidden rounded-xl bg-muted/50 px-4 py-3.5 sm:grid-cols-2"
      aria-label="Cerințe pentru parolă"
    >
      {cerinte.map((c) => (
        <li
          key={c.id}
          className={cn(
            "flex items-center gap-2.5 text-[12.5px] leading-snug transition-colors",
            c.indeplinita ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
              c.indeplinita
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {c.indeplinita ? (
                <motion.span
                  key="da"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </motion.span>
              ) : (
                <motion.span
                  key="nu"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Circle className="h-1.5 w-1.5 fill-current opacity-40" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span>
            {c.eticheta}
            {!c.obligatorie && (
              <span className="opacity-60"> · recomandat</span>
            )}
          </span>
        </li>
      ))}
    </motion.ul>
  );
}
