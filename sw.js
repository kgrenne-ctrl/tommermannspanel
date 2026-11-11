// Lagrer appen på telefonen, så den virker uten nett (på stillaset).
// Listen og versjonsnummeret under settes av scripts/versjon.mjs ved hver commit. Når nummeret
// endres, ser nettleseren at dette er en ny fil, henter alt på nytt og sletter det gamle.
//
// - Selve siden (index.html) og versjon.json hentes fra nett først, så man får nyeste versjon
//   når man har dekning. Uten nett brukes det som er lagret.
// - Alt annet (skript med ?v=nummer, stil, bilder) hentes fra lageret først. Filene har
//   versjonsnummer i navnet, så en lagret fil er aldri utdatert.

// versjon:start (settes av scripts/versjon.mjs, ikke rediger for hånd)
const VERSJON = '20261111-121000';
const FILER = [
  "./",
  "./versjon.json",
  "./manifest.webmanifest",
  "./css/stil.css?v=20261111-121000",
  "./src/skjerm/app.js?v=20261111-121000",
  "./src/skjerm/biter.js?v=20261111-121000",
  "./src/skjerm/eksempel.js?v=20261111-121000",
  "./src/skjerm/format.js?v=20261111-121000",
  "./src/skjerm/lagring.js?v=20261111-121000",
  "./src/skjerm/oppdater.js?v=20261111-121000",
  "./src/skjerm/tegning.js?v=20261111-121000",
  "./src/skjerm/trapp-merking.js?v=20261111-121000",
  "./src/skjerm/trapp-skjerm.js?v=20261111-121000",
  "./src/skjerm/trapp-tegning.js?v=20261111-121000",
  "./src/skjerm/utskrift.js?v=20261111-121000",
  "./src/skjerm/vegg-skjerm.js?v=20261111-121000",
  "./src/skjerm/verktoy.js?v=20261111-121000",
  "./src/tommermann/fagverdier.js?v=20261111-121000",
  "./src/tommermann/hus.js?v=20261111-121000",
  "./src/tommermann/materialer.js?v=20261111-121000",
  "./src/tommermann/solver.js?v=20261111-121000",
  "./src/tommermann/vegg.js?v=20261111-121000",
  "./src/trapp/fagverdier.js?v=20261111-121000",
  "./src/trapp/solver.js?v=20261111-121000",
  "./src/trapp/vange.js?v=20261111-121000",
  "./assets/BAKOY_logo_hvit_transparent.png",
  "./assets/ikon-180.png",
  "./assets/ikon-192.png",
  "./assets/ikon-512.png"
];
// versjon:slutt

const LAGER = `tommermannspanel-${VERSJON}`;

self.addEventListener('install', (hendelse) => {
  hendelse.waitUntil(caches.open(LAGER).then((lager) => lager.addAll(FILER)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (hendelse) => {
  hendelse.waitUntil(caches.keys()
    .then((navn) => Promise.all(navn.filter((n) => n.startsWith('tommermannspanel-') && n !== LAGER)
      .map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (hendelse) => {
  const { request } = hendelse;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const erSiden = request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  const erVersjon = url.pathname.endsWith('/versjon.json');

  if (erSiden || erVersjon) {
    // Nett først, lageret uten nett. Siden lagres uten ?v= i adressen.
    hendelse.respondWith(fetch(request).then((svar) => {
      if (svar.ok && erSiden) {
        const kopi = svar.clone();
        caches.open(LAGER).then((lager) => lager.put('./', kopi));
      }
      return svar;
    }).catch(() => caches.match(erSiden ? './' : request, { ignoreSearch: erVersjon })));
    return;
  }

  // Lageret først, ellers nett (og lagre det som hentes)
  hendelse.respondWith(caches.match(request).then((lagret) => lagret ?? fetch(request).then((svar) => {
    if (svar.ok) {
      const kopi = svar.clone();
      caches.open(LAGER).then((lager) => lager.put(request, kopi));
    }
    return svar;
  })));
});
