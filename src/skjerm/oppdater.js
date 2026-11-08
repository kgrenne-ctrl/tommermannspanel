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
