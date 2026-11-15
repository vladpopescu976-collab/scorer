// Scorer: service worker minimal. Face site-ul instalabil ca aplicație și
// arată o pagină simplă când nu e internet. Nu păstrează date personale:
// paginile vin mereu de pe server, cache-ul e doar pentru fișierele statice.
const CACHE = "scorer-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/pwa/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chei) => Promise.all(chei.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const cerere = event.request;
  if (cerere.method !== "GET") return;
  const url = new URL(cerere.url);
  if (url.origin !== self.location.origin) return;

  // Paginile: mereu de pe server; fără internet, pagina „offline”.
  if (cerere.mode === "navigate") {
    event.respondWith(fetch(cerere).catch(() => caches.match(OFFLINE)));
    return;
  }

  // Fișierele statice ale site-ului (cu nume unic la fiecare versiune): din cache.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(cerere).then(
        (salvat) =>
          salvat ||
          fetch(cerere).then((raspuns) => {
            const copie = raspuns.clone();
            caches.open(CACHE).then((c) => c.put(cerere, copie));
            return raspuns;
          })
      )
    );
  }
});
