// Lagrer det som er skrevet inn på telefonen (i nettleseren), så det ikke forsvinner når
// siden lastes på nytt eller appen henter en ny versjon. Lagres bare på denne telefonen.
// Nettleseren kan nekte lagring (privat modus, full lagring). Da virker appen som før,
// bare uten å huske.

const PREFIKS = 'tommermannspanel:';

export function lagre(nokkel, data) {
  try {
    window.localStorage.setItem(PREFIKS + nokkel, JSON.stringify(data));
  } catch {
    // Lagring ikke tillatt: ignorer
  }
}

export function hent(nokkel) {
  try {
    const tekst = window.localStorage.getItem(PREFIKS + nokkel);
    return tekst ? JSON.parse(tekst) : null;
  } catch {
    return null;
  }
}

export function slett(nokkel) {
  try {
    window.localStorage.removeItem(PREFIKS + nokkel);
  } catch {
    // ignorer
  }
}
