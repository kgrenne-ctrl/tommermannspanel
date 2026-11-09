// Et helt hus: veggene i rekkefølge rundt huset (PLAN.md punkt 4, Kenny 2026-11-09).
// Ingen skjermkode her, bare regning. Alle mål i mm.
//
// Høyre hjørne på vegg k er venstre hjørne på vegg k+1. Når huset er lukket (minst tre
// vegger), møter høyre hjørne på siste vegg venstre hjørne på første.
//
// Hvert hjørne har en type på hver av de to veggene:
// - 'forbi': kledningen går forbi hjørnet og dekker enden av kledningen på naboveggen.
//            Feltet blir lengre med naboveggens kledningstykkelse i hjørnet.
// - 'mot':   kledningen slutter mot naboveggen, som går forbi. Feltet = vegglengden.
// - 'kasse': kledningen slutter mot en hjørnekasse. Feltet blir kortere med kassebredden.
// Vegglengden måles utenpå lektene, og målene regnes fra hjørnet på veggen.

import { losVegg } from './vegg.js';
import { STANDARD_VEGG, STANDARD_HJORNE } from './fagverdier.js';

const SPEIL = { forbi: 'mot', mot: 'forbi', kasse: 'kasse' };

// Typen på den andre veggen i samme hjørne, når denne veggen har typen `type`.
export function speilHjorne(type) {
  return SPEIL[type] ?? 'mot';
}

// Kledningstykkelsen ytterst i hjørnet på en vegg: underbordet ligger rett på lekta, og et
// påbord i hjørnet ligger utenpå underlaget, så da teller begge tykkelsene.
export function tykkelseIHjornet(vegg, side) {
  const v = { ...STANDARD_VEGG, ...vegg };
  const bord = side === 'venstre' ? v.hjorneVenstre : v.hjorneHoyre;
  return v.tykkelseUnder + (bord === 'O' ? v.tykkelseOver : 0);
}

// Hvor mye lengre (pluss) eller kortere (minus) feltet blir enn vegglengden i ett hjørne.
// `naboTykkelse` er kledningstykkelsen i hjørnet på naboveggen.
export function forlengelse(hjorne, naboTykkelse) {
  const h = { ...STANDARD_HJORNE, ...hjorne };
  if (h.type === 'forbi') return naboTykkelse;
  if (h.type === 'kasse') return -h.kasse;
  return 0;
}

// Hvilke vegger møtes i hvert hjørne? Gir naboen til venstre og høyre for vegg k (indeks
// eller null når hjørnet er en fri ende).
export function naboer(k, antall, lukket) {
  const rundt = lukket && antall >= 3;
  const venstre = k > 0 ? k - 1 : (rundt ? antall - 1 : null);
  const hoyre = k < antall - 1 ? k + 1 : (rundt ? 0 : null);
  return { venstre, hoyre };
}

// Regner alle veggene. Hver vegg er inndata til losVegg() pluss
//   navn, hjorner: { venstre: { type, kasse }, hoyre: { type, kasse } }.
// En vegg kan være null (ikke ferdig utfylt). Den regnes ikke, men den er fortsatt nabo.
// For en fri ende (ingen nabovegg) regnes naboen som lik veggen selv.
export function losHus({ vegger, lukket = true }) {
  const n = vegger.length;
  const ut = vegger.map((v, k) => {
    if (!v) return null;
    const nb = naboer(k, n, lukket);
    const hj = {
      venstre: { ...STANDARD_HJORNE, ...v.hjorner?.venstre },
      hoyre: { ...STANDARD_HJORNE, ...v.hjorner?.hoyre },
    };
    // Naboveggens kledningstykkelse i det hjørnet de deler (dens høyre er vårt venstre)
    const naboVenstre = nb.venstre !== null && vegger[nb.venstre] ? vegger[nb.venstre] : null;
    const naboHoyre = nb.hoyre !== null && vegger[nb.hoyre] ? vegger[nb.hoyre] : null;
    const tV = naboVenstre ? tykkelseIHjornet(naboVenstre, 'hoyre') : tykkelseIHjornet(v, 'venstre');
    const tH = naboHoyre ? tykkelseIHjornet(naboHoyre, 'venstre') : tykkelseIHjornet(v, 'hoyre');
    const forlengVenstre = forlengelse(hj.venstre, tV);
    const forlengHoyre = forlengelse(hj.hoyre, tH);

    const r = losVegg({ ...v, hjorner: hj, forlengVenstre, forlengHoyre });
    if (r.feil) return { navn: v.navn, feil: r.feil, forleng: { venstre: forlengVenstre, hoyre: forlengHoyre } };

    // Henger hjørnet sammen med naboveggen?
    for (const [side, nabo, naboSide] of [['venstre', nb.venstre, 'hoyre'], ['hoyre', nb.hoyre, 'venstre']]) {
      if (nabo === null || !vegger[nabo]) continue;
      const min = hj[side].type;
      const deres = { ...STANDARD_HJORNE, ...vegger[nabo].hjorner?.[naboSide] }.type;
      const tekst = hjorneFeil(min, deres, vegger[nabo].navn ?? `vegg ${nabo + 1}`);
      if (tekst) {
        r.varsler.unshift({ felt: side === 'venstre' ? 'Venstre hjørne' : 'Høyre hjørne', alvorlig: true, tekst });
      }
    }
    r.navn = v.navn;
    return r;
  });
  return { vegger: ut };
}

function hjorneFeil(min, deres, naboNavn) {
  if (min === 'forbi' && deres === 'forbi') return `Både denne veggen og ${naboNavn} går forbi hjørnet. Bare én kan gjøre det.`;
  if (min === 'mot' && deres === 'mot') return `Verken denne veggen eller ${naboNavn} går forbi hjørnet. Da blir det åpent.`;
  if ((min === 'kasse') !== (deres === 'kasse')) return `Bare den ene veggen har hjørnekasse mot ${naboNavn}.`;
  return null;
}
