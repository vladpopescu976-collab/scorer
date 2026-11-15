import type { MetadataRoute } from "next";

/** Descrierea aplicației: Windows, Android și Chrome/Edge o pot instala ca program. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Scorer — Rezervă terenuri sportive",
    short_name: "Scorer",
    description: "Găsește și rezervă terenuri sportive, sau administrează-ți terenurile.",
    lang: "ro",
    start_url: "/",
    scope: "/",
    // Fereastră proprie, cu bara de titlu normală a Windows-ului (fără
    // „window-controls-overlay”, care ar fi pus butoanele ferestrei peste bara site-ului).
    display: "standalone",
    background_color: "#07160F",
    theme_color: "#0B2A1C",
    categories: ["sports", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Pătratul plin, ca Windows și Android să-l poată decupa în forma lor.
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Apare în fereastra de instalare din Edge, ca previzualizare.
    screenshots: [
      { src: "/brand/aplicatie-rezervare.png", sizes: "598x1300", type: "image/png", form_factor: "narrow", label: "Rezervarea unui teren" },
    ],
    shortcuts: [
      { name: "Caută terenuri", url: "/cauta-terenuri", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Găsește meci", url: "/gaseste-meci", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Rezervările mele", url: "/rezervarile-mele", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
