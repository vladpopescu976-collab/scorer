"use client";

import { useEffect } from "react";

/** Marchează pagina ca hidratată: de aici framer-motion preia animațiile (vezi globals.css). */
export function Hidratat() {
  useEffect(() => {
    document.documentElement.dataset.hidratat = "1";
  }, []);
  return null;
}
