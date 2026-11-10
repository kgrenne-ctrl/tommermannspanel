// Små hjelpere for tall på skjermen. Ingen regning av kledning her.

// Leser et tall slik folk skriver det på mobilen: "1350", "92,4", "1 350".
// Gir null hvis feltet er tomt eller ikke er et tall.
export function lesTall(tekst) {
  if (tekst === null || tekst === undefined) return null;
  const renset = String(tekst).trim().replace(/\s/g, '').replace(',', '.');
  if (renset === '') return null;
  const tall = Number(renset);
  return Number.isFinite(tall) ? tall : null;
}

// Skriver et mål på norsk: desimalkomma og mellomrom som tusenskille.
export function mm(tall, desimaler = 0) {
  return tall.toLocaleString('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: desimaler,
  });
}

// Navn som brukeren skriver, settes rett inn i siden og i tegningene. Tegnene < og > ville
// blitt lest som kode og ødelagt visningen, så de tas bort.
export function trygtNavn(tekst) {
  return String(tekst ?? '').replace(/[<>]/g, '').trim();
}
