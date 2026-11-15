import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif cursiv pentru accentele din titluri („Restul e joc.”).
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  // Culoarea barei de titlu a aplicației instalate (Windows, Android).
  themeColor: "#0B2A1C",
};

export const metadata: Metadata = {
  applicationName: "Scorer",
  appleWebApp: { capable: true, title: "Scorer", statusBarStyle: "black-translucent" },
  title: "Scorer — Închiriază terenuri sportive",
  description:
    "Platforma prin care găsești și rezervi terenuri sportive rapid, sau îți administrezi propriile terenuri.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
