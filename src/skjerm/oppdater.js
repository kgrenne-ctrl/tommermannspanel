// Sjekker ved oppstart om det finnes en nyere versjon av appen enn den nettleseren viser.
// Siden kan være lagret i nettleseren i opptil cirka 10 minutter etter en oppdatering.
// Er versjon.json nyere enn siden, lastes siden på nytt med versjonsnummeret i adressen.
// Da regnes den som en ny side og hentes fersk. Uten nett gjør sjekken ingenting.

export async function sjekkVersjon() {
  const naa = window.APP_VERSJON;
  if (!naa) return;
  try {
    const svar = await fetch(`versjon.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!svar.ok) return;
    const { versjon } = await svar.json();
    const adresse = new URL(window.location.href);
    // Ikke last på nytt to ganger for samme versjon (hindrer evig omlasting)
    if (versjon && versjon !== naa && adresse.searchParams.get('v') !== versjon) {
      adresse.searchParams.set('v', versjon);
      window.location.replace(adresse.toString());
    }
  } catch {
    // Uten nett: bruk versjonen vi har
  }
}

// Lagrer appen på telefonen (sw.js), så den virker uten nett. Viser nederst på siden om den
// er klar til bruk uten nett.
export function registrerUtenNett() {
  const tekst = document.getElementById('uten-nett');
  if (!('serviceWorker' in navigator)) {
    if (tekst) tekst.textContent = 'Denne nettleseren kan ikke lagre appen for bruk uten nett.';
    return;
  }
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    if (tekst) tekst.textContent = `Klar til bruk uten nett. Versjon ${window.APP_VERSJON ?? ''}.`;
  }).catch(() => {
    if (tekst) tekst.textContent = 'Kunne ikke lagre appen for bruk uten nett.';
  });
}
