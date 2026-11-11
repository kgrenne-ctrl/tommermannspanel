// Regnemodell for vinkler og diagonaler i Matte. Ingen skjermkode her.
// Alle lengder i mm, alle vinkler i grader. Ingenting avrundes her, det gjør skjermdelen.
//
// regnDiagonal: diagonalen i et rektangel, største 3-4-5-trekant som får plass, og skjevhet
//               ut fra to målte diagonaler.
// regnGjaering:   gjæring i et hjørne, vinkel på emnet og på saga (fase M4).
// regnMangekant:  saga og sidelengde for en mangekant (fase M4).
// regnSammensatt: dreieskive og blad for taklist som ligger flatt på saga (fase M4).
// Saga: 0° er rett kapp. Formlene for sammensatt gjæring er regnet, ikke hentet fra fagkilde, og
// skal prøves på ekte list (PLAN-matte.md punkt 9).

import { sagVarsel } from './tak.js';

const RAD = Math.PI / 180;

const erTall = (x) => typeof x === 'number' && Number.isFinite(x);

// 3-4-5-trekanten lages med hele 100 mm, så målene er lette å sette av med båndet.
const TREKANT_TRINN = 100;

// inndata: { a, b, d1, d2 }
//   a, b:   sidene (mm). Skjevheten rettes ved å skyve siden motsatt av a langs a.
//   d1, d2: målte diagonaler (mm), kan stå tomme
// Gir { ok: true, a, b, diagonal, trekant, d1, d2, avvik1, avvik2, skjevhet, varsler }
// eller { ok: false, feil }.
//   trekant:  { faktor, kort, lang, skra, kortSide: 'a' | 'b' } eller null når sidene er for korte
//   skjevhet: hvor langt siden motsatt av a må skyves langs a (null uten to diagonaler).
//             Når motstående sider er like lange (parallellogram), er d1² − d2² = 4 × a × s.
export function regnDiagonal(inndata) {
  const { a, b } = inndata;
  const feil = [];
  for (const [navn, x] of [['a', a], ['b', b]]) {
    if (!erTall(x)) feil.push(`Skriv inn side ${navn}.`);
    else if (x <= 0) feil.push(`Side ${navn} må være større enn 0.`);
  }
  const d1 = erTall(inndata.d1) ? inndata.d1 : null;
  const d2 = erTall(inndata.d2) ? inndata.d2 : null;
  if ((d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0)) feil.push('En målt diagonal må være større enn 0.');
  if (feil.length) return { ok: false, feil };

  const diagonal = Math.hypot(a, b);

  const kortSide = a <= b ? 'a' : 'b';
  const kort = Math.min(a, b);
  const lang = Math.max(a, b);
  const faktor = Math.floor(Math.min(kort / 3, lang / 4) / TREKANT_TRINN) * TREKANT_TRINN;
  const trekant = faktor > 0 ? { faktor, kort: 3 * faktor, lang: 4 * faktor, skra: 5 * faktor, kortSide } : null;

  const varsler = [];
  let skjevhet = null;
  if (d1 !== null && d2 !== null) {
    skjevhet = Math.abs(d1 * d1 - d2 * d2) / (4 * a);
    varsler.push({
      niva: 'vite',
      type: 'diagonal-sider',
      tekst: 'Skjevheten er regnet som om motstående sider er like lange. Mål sidene før diagonalene.',
      kilde: '',
    });
  }

  return {
    ok: true,
    a,
    b,
    diagonal,
    trekant,
    d1,
    d2,
    avvik1: d1 === null ? null : d1 - diagonal,
    avvik2: d2 === null ? null : d2 - diagonal,
    skjevhet,
    snittDiagonal: d1 !== null && d2 !== null ? Math.sqrt((d1 * d1 + d2 * d2) / 2) : null,
    varsler,
  };
}

// ---------- Gjæring i hjørne (fase M4) ----------

export const HJORNETYPER = Object.freeze(['innvendig', 'utvendig']);

// inndata: { hjorne, type }
//   hjorne: vinkelen mellom de to flatene lista ligger mot, målt med vinkelmåler (grader)
//   type:   'innvendig' eller 'utvendig'. Endrer ikke tallene, bare hvilken side som er lengst.
// Vinkel på emnet = hjørne / 2 (mellom kappet og kanten). Saga = 90 − hjørne / 2.
export function regnGjaering(inndata) {
  const { hjorne, type } = inndata;
  const feil = [];
  if (!HJORNETYPER.includes(type)) feil.push(`Ukjent hjørne: ${type}`);
  if (!erTall(hjorne)) feil.push('Skriv inn vinkelen i hjørnet.');
  else if (hjorne <= 0 || hjorne >= 180) feil.push('Vinkelen i hjørnet må være over 0° og under 180°.');
  if (feil.length) return { ok: false, feil };
  const emne = hjorne / 2;
  const sag = 90 - emne;
  return { ok: true, hjorne, type, emne, sag, varsler: sagVarsel(sag, 'Kappet') };
}

// ---------- Mangekant (fase M4) ----------

export const MAL_MANGEKANT = Object.freeze(['flater', 'hjorner']);
const MAKS_SIDER = 100;

// inndata: { sider, malType, mal, bredde }
//   sider:   antall sider (helt tall, minst 3)
//   malType: 'flater' (mål fra flate til motsatt flate) eller 'hjorner' (fra hjørne til hjørne)
//   mal:     målet utvendig (mm), kan stå tomt
//   bredde:  bredden på emnet (mm), kan stå tomt. Gir lengden på innsiden.
// Saga = 180 / n. Vinkel på emnet = 90 − 180 / n.
// Sidelengde utvendig = mål × tan(180 / n) over flatene, mål × sin(180 / n) over hjørnene.
export function regnMangekant(inndata) {
  const { sider, malType } = inndata;
  const mal = erTall(inndata.mal) ? inndata.mal : null;
  const bredde = erTall(inndata.bredde) ? inndata.bredde : null;
  const feil = [];
  if (!MAL_MANGEKANT.includes(malType)) feil.push(`Ukjent mål: ${malType}`);
  if (!erTall(sider)) feil.push('Skriv inn antall sider.');
  else if (!Number.isInteger(sider) || sider < 3) feil.push('Antall sider må være et helt tall, minst 3.');
  else if (sider > MAKS_SIDER) feil.push(`Antall sider kan ikke være over ${MAKS_SIDER}.`);
  if (mal !== null && mal <= 0) feil.push('Målet må være større enn 0.');
  if (bredde !== null && bredde <= 0) feil.push('Bredden må være større enn 0.');
  if (feil.length) return { ok: false, feil };

  const halv = (180 / sider) * RAD;
  const sag = 180 / sider;
  const sidelengde = mal === null ? null : mal * (malType === 'flater' ? Math.tan(halv) : Math.sin(halv));
  let innside = null;
  if (sidelengde !== null && bredde !== null) {
    innside = sidelengde - 2 * bredde * Math.tan(halv);
    if (innside <= 0) return { ok: false, feil: ['Emnet er for bredt til denne mangekanten. Innsiden blir 0 eller mindre.'] };
  }
  return {
    ok: true,
    sider,
    malType,
    mal,
    bredde,
    sag,
    emne: 90 - sag,
    sidelengde,
    innside,
    varsler: sagVarsel(sag, 'Kappet'),
  };
}

// ---------- Sammensatt gjæring (fase M4) ----------

// inndata: { vegg, helning }
//   vegg:    vinkelen i hjørnet mellom veggene, målt med vinkelmåler (grader)
//   helning: vinkelen mellom baksiden av lista og veggen (grader)
// Lista ligger flatt på bordet med baksiden ned:
//   dreieskiva (gjæring)     = atan(sin(helning) / tan(vegg / 2))
//   bladet (skråstilling)    = asin(cos(helning) × cos(vegg / 2))
// Opp-ned mot anlegget, slik den står i taket, trengs bare dreieskiva på 90 − vegg / 2.
export function regnSammensatt(inndata) {
  const { vegg, helning } = inndata;
  const feil = [];
  if (!erTall(vegg)) feil.push('Skriv inn vinkelen i hjørnet.');
  else if (vegg <= 0 || vegg > 180) feil.push('Vinkelen i hjørnet må være over 0° og høyst 180°.');
  if (!erTall(helning)) feil.push('Skriv inn helningen på lista.');
  else if (helning < 0 || helning > 90) feil.push('Helningen må være fra 0° til 90°.');
  if (feil.length) return { ok: false, feil };

  const halv = (vegg / 2) * RAD;
  const s = helning * RAD;
  // Ved 180° er tan(90°) uendelig, og gjæringen er 0
  const dreieskive = vegg === 180 ? 0 : Math.atan2(Math.sin(s), Math.tan(halv)) / RAD;
  const blad = Math.asin(Math.min(1, Math.cos(s) * Math.cos(halv))) / RAD;
  return {
    ok: true,
    vegg,
    helning,
    dreieskive,
    blad,
    oppNed: 90 - vegg / 2,
    varsler: [{
      niva: 'vite',
      type: 'proevekapp',
      tekst: 'Kapp to prøvestumper og hold dem opp i hjørnet før du kapper lista. Hvilken vei dreieskiva og '
        + 'bladet skal stå, avhenger av hvilken ende av lista du kapper og hvilken side av saga du står på.',
      kilde: '',
    }],
  };
}
