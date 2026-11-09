// Et helt hus: veggene i rekkefølge rundt huset (PLAN.md punkt 4, Kenny 2026-11-09).
// Ingen skjermkode her, bare regning. Alle mål i mm.
//
// Høyre hjørne på vegg k er venstre hjørne på vegg k+1. Når huset er lukket (minst tre
// vegger), møter høyre hjørne på siste vegg venstre hjørne på første.
//
// Hvert hjørne har en type på hver av de to veggene:
// - 'forbi': kledningen går forbi hjørnet og dekker enden av kledningen på naboveggen.
//            Feltet blir lengre med naboveggens kledningstykkelse i hjørnet.
// - 'mot':   kledningen slutter mot naboveggen, som går forbi. Har naboveggen påbord ytterst,
//            går kledningen likevel så langt forbi hjørnet som underbordet (klossen) på
//            naboveggen er tykt, så påbordene møtes (Kenny 2026-11-09). Ellers = vegglengden.
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

// Hvor langt inn fra naboveggens lekter innsiden av det ytterste bordet i hjørnet ligger.
// Påbord ytterst ligger utenpå klossen (underbordets tykkelse). Underbord ligger rett på lekta.
export function innsideIHjornet(vegg, side) {
  const v = { ...STANDARD_VEGG, ...vegg };
  const bord = side === 'venstre' ? v.hjorneVenstre : v.hjorneHoyre;
  return bord === 'O' ? v.tykkelseUnder : 0;
}

// Tykkelsen på det ytterste bordet i hjørnet (påbord eller underbord)
export function hjornebordTykkelse(vegg, side) {
  const v = { ...STANDARD_VEGG, ...vegg };
  const bord = side === 'venstre' ? v.hjorneVenstre : v.hjorneHoyre;
  return bord === 'O' ? v.tykkelseOver : v.tykkelseUnder;
}

// Hvor mye lengre (pluss) eller kortere (minus) feltet blir enn vegglengden i ett hjørne.
// `nabo` = { tykkelse, innside }: kledningstykkelsen i hjørnet på naboveggen, og hvor langt
// inn innsiden av det ytterste bordet der ligger. (Et tall alene regnes som tykkelsen.)
export function forlengelse(hjorne, nabo) {
  const h = { ...STANDARD_HJORNE, ...hjorne };
  const n = typeof nabo === 'number' ? { tykkelse: nabo, innside: 0 } : nabo;
  if (h.type === 'forbi') return n.tykkelse;
  if (h.type === 'kasse') return -h.kasse;
  return n.innside;
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
    const naboMal = (nabo, naboSide, minSide) => {
      const kilde = nabo ? [nabo, naboSide] : [v, minSide];
      return { tykkelse: tykkelseIHjornet(...kilde), innside: innsideIHjornet(...kilde),
        hjornebord: hjornebordTykkelse(...kilde) };
    };
    const nV = naboMal(naboVenstre, 'hoyre', 'venstre');
    const nH = naboMal(naboHoyre, 'venstre', 'hoyre');
    const forlengVenstre = forlengelse(hj.venstre, nV);
    const forlengHoyre = forlengelse(hj.hoyre, nH);
    hj.venstre.nabo = nV;
    hj.hoyre.nabo = nH;
    // Slutter kledningen mot naboveggen, kløyves hjørnebordet med tykkelsen på hjørnebordet
    // på naboveggen (det som synes som endeved), så hjørnet ser like bredt ut fra begge sider.
    const klyvVenstre = hj.venstre.type === 'mot' ? nV.hjornebord : 0;
    const klyvHoyre = hj.hoyre.type === 'mot' ? nH.hjornebord : 0;

    const r = losVegg({ ...v, hjorner: hj, forlengVenstre, forlengHoyre, klyvVenstre, klyvHoyre });
    if (r.feil) return { navn: v.navn, feil: r.feil, forleng: { venstre: forlengVenstre, hoyre: forlengHoyre } };

    // Henger hjørnet sammen med naboveggen?
    for (const [side, nabo, naboSide] of [['venstre', nb.venstre, 'hoyre'], ['hoyre', nb.hoyre, 'venstre']]) {
      if (nabo === null || !vegger[nabo]) continue;
      const min = hj[side].type;
      const deres = { ...STANDARD_HJORNE, ...vegger[nabo].hjorner?.[naboSide] }.type;
      const tekst = hjorneFeil(min, deres, vegger[nabo].navn ?? `vegg ${nabo + 1}`);
      const felt = side === 'venstre' ? 'Venstre hjørne' : 'Høyre hjørne';
      if (tekst) r.varsler.unshift({ felt, alvorlig: true, tekst });
      // Begge hjørneløsningene har samme bord ytterst på begge veggene: underbord mot
      // underbord, eller påbord mot påbord med kloss bak (Kenny 2026-11-09).
      const mitt = side === 'venstre' ? v.hjorneVenstre ?? 'O' : v.hjorneHoyre ?? 'O';
      const deresBord = naboSide === 'venstre' ? vegger[nabo].hjorneVenstre ?? 'O' : vegger[nabo].hjorneHoyre ?? 'O';
      if (!tekst && min !== 'kasse' && mitt !== deresBord) {
        const navn = { U: 'underbord', O: 'påbord' };
        r.varsler.push({ felt, type: 'hjorne-bord',
          tekst: `Denne veggen har ${navn[mitt]} ytterst, ${vegger[nabo].navn ?? `vegg ${nabo + 1}`} har ${navn[deresBord]}. Vanlig er samme bord ytterst på begge veggene i et hjørne.` });
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

// ---------- Oversikt over alle hjørnene i huset ----------
// Ett punkt per hjørne der to vegger møtes, pluss frie ender (vegger uten nabo).
// vegger: inndata (med navn, hjorner, hjorneVenstre/hjorneHoyre), også for vegger som ikke er
// ferdig utfylt. resultater: losHus(...).vegger (null for vegger som ikke er regnet).
export function lagHjorneoversikt({ vegger, resultater = [], lukket = true }) {
  const n = vegger.length;
  const ende = (k, side) => {
    const v = vegger[k];
    const r = resultater[k] && !resultater[k].feil ? resultater[k] : null;
    const h = { ...STANDARD_HJORNE, ...v.hjorner?.[side] };
    const bord = (side === 'venstre' ? v.hjorneVenstre : v.hjorneHoyre) ?? STANDARD_VEGG.hjorneVenstre;
    const felt = r ? (side === 'venstre' ? r.felt[0] : r.felt.at(-1)) : null;
    const hb = felt?.hjornebord?.[side === 'venstre' ? 'start' : 'slutt'];
    return {
      vegg: k,
      navn: v.navn ?? `Vegg ${k + 1}`,
      side,
      type: h.type,
      kasse: h.kasse,
      bord,
      tillegg: r ? r.forleng[side] : null,
      klyv: r ? r.klyv[side] : null,
      kloyvesTil: hb ? hb.bredde : null,
      regnet: Boolean(r),
    };
  };

  const hjorner = [];
  const par = [];
  for (let k = 0; k < n - 1; k++) par.push([k, k + 1]);
  if (lukket && n >= 3) par.push([n - 1, 0]);
  par.forEach(([a, b], i) => {
    const A = ende(a, 'hoyre');
    const B = ende(b, 'venstre');
    let forbi = null;
    if (A.type === 'forbi' && B.type === 'mot') forbi = 'A';
    else if (A.type === 'mot' && B.type === 'forbi') forbi = 'B';
    else if (A.type === 'kasse' && B.type === 'kasse') forbi = 'kasse';
    const feil = forbi ? null : hjorneFeil(A.type, B.type, B.navn)?.replace('denne veggen', A.navn);
    hjorner.push({ nr: i + 1, a: A, b: B, forbi, feil, likeBord: A.bord === B.bord || forbi === 'kasse' });
  });

  const frie = [];
  if (n >= 1 && !(lukket && n >= 3)) {
    frie.push(ende(0, 'venstre'));
    frie.push(ende(n - 1, 'hoyre'));
  }
  return { hjorner, frie };
}

// Kontroll av mål for et hus med fire vegger og rette hjørner: motstående vegger skal være
// omtrent like lange (målt utenpå lektene). Gir en tekst per avvik større enn toleransen.
export function kontrollerFirkant(vegger, toleranse = 30) {
  if (vegger.length !== 4 || vegger.some((v) => !Number.isFinite(v.lengde))) return [];
  const ut = [];
  for (const [i, j] of [[0, 2], [1, 3]]) {
    const avvik = Math.abs(vegger[i].lengde - vegger[j].lengde);
    if (avvik > toleranse) {
      ut.push(`${vegger[i].navn ?? `Vegg ${i + 1}`} (${vegger[i].lengde} mm) og ${vegger[j].navn ?? `Vegg ${j + 1}`} `
        + `(${vegger[j].lengde} mm) står mot hverandre, men er ikke like lange (${avvik} mm forskjell). `
        + 'Sjekk målene eller rekkefølgen på veggene.');
    }
  }
  return ut;
}

// Hjørneoversikten som tekstlinjer (til skjermen og teksten som deles)
export function hjorneLinjer(oversikt) {
  const mm = (x) => `${Math.round(x * 10) / 10}`.replace('.', ',');
  const bordNavn = { O: 'påbord', U: 'underbord' };
  return oversikt.hjorner.map((h) => {
    const tittel = `H${h.nr}: ${h.a.navn} (høyre) møter ${h.b.navn} (venstre)`;
    if (h.feil) return { tittel, linjer: [h.feil], feil: true };
    if (h.forbi === 'kasse') {
      return { tittel, linjer: [`Hjørnekasse: ${h.a.navn} ${mm(h.a.kasse)} mm, ${h.b.navn} ${mm(h.b.kasse)} mm.`] };
    }
    const [g, m] = h.forbi === 'A' ? [h.a, h.b] : [h.b, h.a];
    const linjer = [`Går forbi: ${g.navn}${g.tillegg !== null ? ` (${mm(g.tillegg)} mm forbi hjørnet)` : ''}.`];
    let mot = `Slutter mot: ${m.navn}`;
    if (m.tillegg) mot += ` (${mm(m.tillegg)} mm forbi hjørnet)`;
    mot += '.';
    if (m.kloyvesTil !== null) mot += ` Hjørnebordet kløyves til ${mm(m.kloyvesTil)} mm.`;
    else if (!m.regnet) mot += ' Veggen er ikke ferdig utfylt.';
    linjer.push(mot);
    linjer.push(h.likeBord ? `${bordNavn[h.a.bord][0].toUpperCase()}${bordNavn[h.a.bord].slice(1)} mot ${bordNavn[h.b.bord]}.`
      : `${bordNavn[h.a.bord][0].toUpperCase()}${bordNavn[h.a.bord].slice(1)} ytterst på ${h.a.navn}, ${bordNavn[h.b.bord]} på ${h.b.navn}. Vanlig er likt på begge.`);
    return { tittel, linjer, sjekk: !h.likeBord };
  }).concat(oversikt.frie.map((e) => ({
    tittel: `Fri ende: ${e.navn} (${e.side === 'venstre' ? 'venstre' : 'høyre'} hjørne)`,
    linjer: ['Ingen nabovegg lagt inn. Regnet som om naboveggen er kledd likt.'],
  })));
}
