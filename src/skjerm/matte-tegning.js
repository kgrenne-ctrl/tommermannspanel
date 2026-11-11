// Skissene i Matte, som SVG. Ingen regning her, bare tegning av det regnemodellen har gitt.
// Ingen kobling til nettleseren, så de testes med node --test.
// Skissene viser hvilket mål som er hvilket. De er i riktig forhold når det gir mening, ellers
// står det i skissen at den ikke er i målestokk.

import { mm, grader } from './format.js';

const RAD = Math.PI / 180;

// Skrifta i skissene. viewBox er 400 bred, og skissen fyller bredden på telefonen.
const SKRIFT = 15;

function tekst(x, y, innhold, { anker = 'middle', farge = 'var(--tekst)', storrelse = SKRIFT, vekt = 400 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${storrelse}" font-weight="${vekt}" text-anchor="${anker}" fill="${farge}" `
    + `paint-order="stroke" stroke="var(--hvit)" stroke-width="3">${innhold}</text>`;
}

function svg(bredde, hoyde, innhold, etikett) {
  return `<svg class="tegning matte-skisse" viewBox="0 0 ${bredde} ${hoyde}" xmlns="http://www.w3.org/2000/svg" `
    + `role="img" aria-label="${etikett}">${innhold}</svg>`;
}

// Forholdet 1:x slik det skrives på skjermen. Bratte fall får to desimaler (1:2,48).
export function forholdTekst(forhold) {
  if (!Number.isFinite(forhold)) return 'Flatt';
  return `1:${mm(forhold, forhold < 10 ? 2 : 1)}`;
}

// Fall og takvinkel: rettvinklet trekant med lengden vannrett, fallet loddrett og vinkelen
// nede til venstre. Uten lengde vises fallet på 1000 mm (mm per meter).
// Vinkler under 6° og over 70° tegnes med 6° og 70° så skissen blir lesbar, og da står det.
export function tegnFall(r) {
  const B = 400;
  const x0 = 62;     // plass til vinkelen til venstre for hjørnet
  const topp = 34;   // plass til forholdet over trekanten
  const lengde = r.lengde ?? 1000;
  const fall = r.hoydeforskjell ?? r.mmPerMeter;
  const lengdeTekst = `${mm(lengde)} mm`;
  const fallTekst = `${mm(fall, r.lengde === null ? 1 : 0)} mm`;

  if (r.tan === 0) {
    const y = 50;
    const innhold = `<line x1="${x0}" y1="${y}" x2="${x0 + 260}" y2="${y}" stroke="var(--skisse-strek)" stroke-width="3"/>`
      + tekst(x0 + 130, y + 26, lengdeTekst)
      + tekst(x0 + 130, y - 16, 'Flatt, ingen fall');
    return svg(B, 90, innhold, 'Flatt, ingen fall');
  }

  const vist = Math.min(70, Math.max(6, r.grader));
  const overdrevet = vist !== r.grader;
  const tanVist = Math.tan(vist * RAD);
  // Trekanten får plass innenfor 240 bredt og 170 høyt, med plass til målet på høyre side
  // (opptil «12 345 mm»). Høyden på skissen følger trekanten, så et slakt fall ikke gir en stor
  // tom flate over.
  let bunn = 240;
  let hoyde = bunn * tanVist;
  if (hoyde > 170) { hoyde = 170; bunn = hoyde / tanVist; }
  const x1 = x0 + bunn;
  const y1 = topp;
  const y0 = topp + hoyde;
  const H = y0 + (overdrevet ? 50 : 38);

  // Buen for vinkelen nede til venstre
  const rb = Math.min(60, bunn * 0.45);
  const bx = x0 + rb * Math.cos(vist * RAD);
  const by = y0 - rb * Math.sin(vist * RAD);

  const deler = [
    `<polygon points="${x0},${y0} ${x1},${y0} ${x1},${y1}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" `
      + 'stroke-width="2.5" stroke-linejoin="round"/>',
    // Rett vinkel nede til høyre
    `<polyline points="${x1 - 12},${y0} ${x1 - 12},${y0 - 12} ${x1},${y0 - 12}" fill="none" stroke="var(--skisse-strek)" stroke-width="1.5"/>`,
    `<path d="M ${x0 + rb} ${y0} A ${rb} ${rb} 0 0 0 ${bx} ${by}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`,
    // Vinkelen står til venstre for hjørnet, så den aldri havner oppå strekene
    tekst(x0 - 8, y0 + 5, grader(r.grader), { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }),
    tekst((x0 + x1) / 2, y0 + 26, lengdeTekst),
    tekst(x1 + 10, (y0 + y1) / 2 + 5, fallTekst, { anker: 'start' }),
    tekst((x0 + x1) / 2 - 10, (y0 + y1) / 2 - 12, forholdTekst(r.forhold), { anker: 'end', farge: 'var(--bla-mork)' }),
  ];
  if (overdrevet) deler.push(tekst(B / 2, H - 6, 'Ikke i målestokk', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, H, deler.join(''), `Fall ${grader(r.grader)}, ${fallTekst} på ${lengdeTekst}`);
}

const klem = (x, min, maks) => Math.min(maks, Math.max(min, x));

// Trekanten: liggende nederst, stående til høyre, skrå fra hjørnet nede til venstre opp til
// toppen. Tegnes i riktig forhold, unntatt når vinkelen er under 8° eller over 82°.
export function tegnTrekant(r) {
  const B = 400;
  const x0 = 90;     // plass til vinkelen og skrå til venstre
  const topp = 30;   // plass til vinkelen oppe
  const vist = klem(r.vinkel, 8, 82);
  const overdrevet = Math.abs(vist - r.vinkel) > 1e-9;
  const tanVist = Math.tan(vist * RAD);
  let bunn = 220;
  let hoyde = bunn * tanVist;
  if (hoyde > 190) { hoyde = 190; bunn = hoyde / tanVist; }
  const x1 = x0 + bunn;
  const y1 = topp;
  const y0 = topp + hoyde;
  const H = y0 + (overdrevet ? 52 : 40);

  const rb = Math.min(50, bunn * 0.45);
  const bx = x0 + rb * Math.cos(vist * RAD);
  const by = y0 - rb * Math.sin(vist * RAD);

  // Skrå skrives ved midten av den lange siden, på utsiden av trekanten
  const mx = (x0 + x1) / 2 - Math.sin(vist * RAD) * 14;
  const my = (y0 + y1) / 2 - Math.cos(vist * RAD) * 14;
  const skraTekst = `${mm(r.skra)} mm`;
  const skra = vist > 45
    ? tekst(mx, my - 4, 'Skrå', { anker: 'end' }) + tekst(mx, my + 14, skraTekst, { anker: 'end' })
    : tekst(mx, my, `Skrå ${skraTekst}`, { anker: 'end' });

  const deler = [
    `<polygon points="${x0},${y0} ${x1},${y0} ${x1},${y1}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" `
      + 'stroke-width="2.5" stroke-linejoin="round"/>',
    `<polyline points="${x1 - 12},${y0} ${x1 - 12},${y0 - 12} ${x1},${y0 - 12}" fill="none" stroke="var(--skisse-strek)" stroke-width="1.5"/>`,
    `<path d="M ${x0 + rb} ${y0} A ${rb} ${rb} 0 0 0 ${bx} ${by}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`,
    tekst(x0 - 8, y0 + 5, grader(r.vinkel), { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }),
    tekst(x1, y1 - 10, grader(r.vinkelTopp), { farge: 'var(--bla-mork)' }),
    tekst((x0 + x1) / 2, y0 + 26, `Liggende ${mm(r.liggende)} mm`),
    tekst(x1 + 10, (y0 + y1) / 2 - 4, 'Stående', { anker: 'start' }),
    tekst(x1 + 10, (y0 + y1) / 2 + 14, `${mm(r.staende)} mm`, { anker: 'start' }),
    skra,
  ];
  if (overdrevet) deler.push(tekst(B / 2, H - 6, 'Ikke i målestokk', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, H, deler.join(''), `Trekant: liggende ${mm(r.liggende)} mm, stående ${mm(r.staende)} mm, `
    + `skrå ${mm(r.skra)} mm, vinkel ${grader(r.vinkel)}`);
}

// Hvilke punkter som får mål i skissen: første og siste alltid, ellers så mange som får plass
// uten at tallene går i hverandre.
function punkterMedMal(xer, minAvstand) {
  const valgt = [0];
  for (let i = 1; i < xer.length - 1; i += 1) {
    if (xer[i] - xer[valgt.at(-1)] >= minAvstand) valgt.push(i);
  }
  const siste = xer.length - 1;
  if (siste > 0) {
    if (valgt.length > 1 && xer[siste] - xer[valgt.at(-1)] < minAvstand) valgt.pop();
    valgt.push(siste);
  }
  return valgt;
}

// Kiler og oppforing: oppforingen sett fra siden, lav ende til venstre. Høyden er nesten alltid
// forstørret for at fallet skal synes, og da står det at skissen ikke er i målestokk.
export function tegnOppforing(r) {
  const B = 400;
  const x0 = 40;
  const bredde = 320;
  const topp = 34;
  const maksHoyde = 110;
  const sx = bredde / r.lengde;
  const hoyest = Math.max(r.hoydeEnde, r.start);
  const sy = hoyest > 0 ? maksHoyde / hoyest : 0;
  const bunnY = topp + maksHoyde;
  const overdrevet = hoyest > 0 && Math.abs(sy / sx - 1) > 0.05;
  const H = bunnY + (overdrevet ? 66 : 54);

  const x = (avstand) => x0 + avstand * sx;
  const y = (h) => bunnY - h * sy;
  const xer = r.punkter.map((p) => x(p.avstand));
  const medMal = new Set(punkterMedMal(xer, 48));

  const deler = [
    `<polygon points="${x0},${bunnY} ${x0 + bredde},${bunnY} ${x0 + bredde},${y(r.hoydeEnde)} ${x0},${y(r.start)}" `
      + 'fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2.5" stroke-linejoin="round"/>',
  ];
  r.punkter.forEach((p, i) => {
    const px = xer[i];
    deler.push(`<line x1="${px}" y1="${bunnY}" x2="${px}" y2="${y(p.hoyde)}" stroke="var(--skisse-strek)" stroke-width="1"/>`);
    if (medMal.has(i)) {
      deler.push(tekst(px, y(p.hoyde) - 8, mm(p.hoyde), { vekt: 700, farge: 'var(--bla-mork)' }));
      deler.push(tekst(px, bunnY + 20, mm(p.avstand), { storrelse: 13 }));
    }
  });
  deler.push(tekst(x0, bunnY + 40, 'Lav ende', { anker: 'start', storrelse: 13, farge: 'var(--tekst-gra)' }));
  deler.push(tekst(x0 + bredde, bunnY + 40, 'Høy ende', { anker: 'end', storrelse: 13, farge: 'var(--tekst-gra)' }));
  if (overdrevet) deler.push(tekst(B / 2, H - 6, 'Høyden er forstørret, ikke i målestokk', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, H, deler.join(''), `Oppforing over ${mm(r.lengde)} mm, fra ${mm(r.start)} til ${mm(r.hoydeEnde)} mm`);
}

// Rett vinkel og diagonal: rektangelet med begge diagonalene. Er det målt skjevhet, vises den
// skjeve formen stiplet og en pil for hvor siden motsatt av a skal skyves.
export function tegnDiagonal(r) {
  const B = 400;
  const skjev = r.skjevhet !== null && Math.round(r.skjevhet) > 0;
  const topp = skjev ? 44 : 20;
  const skala = Math.min(220 / r.a, 160 / r.b);
  const w = r.a * skala;
  const h = r.b * skala;
  const x0 = 82 + (220 - w) / 2;
  const yt = topp;
  const yb = topp + h;
  const H = yb + (skjev ? 52 : 40);

  const deler = [
    `<rect x="${x0}" y="${yt}" width="${w}" height="${h}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2.5"/>`,
    `<line x1="${x0}" y1="${yb}" x2="${x0 + w}" y2="${yt}" stroke="var(--skisse-strek)" stroke-width="1.5" stroke-dasharray="6 4"/>`,
    `<line x1="${x0}" y1="${yt}" x2="${x0 + w}" y2="${yb}" stroke="var(--skisse-strek)" stroke-width="1.5" stroke-dasharray="6 4"/>`,
    tekst(x0 + w / 2, yt + h / 2 - 10, `${mm(r.diagonal)} mm`, { vekt: 700, farge: 'var(--bla-mork)' }),
    tekst(x0 + w / 2, yb + 24, `a = ${mm(r.a)} mm`),
    tekst(x0 - 8, yt + h / 2 - 4, 'b =', { anker: 'end' }),
    tekst(x0 - 8, yt + h / 2 + 14, `${mm(r.b)} mm`, { anker: 'end' }),
  ];
  // Den skjeve formen tegnes over rektangelet, så begge de skrå sidene synes
  if (skjev) {
    const forskyv = klem(r.skjevhet * skala, 24, 40);
    deler.push(`<polygon points="${x0},${yb} ${x0 + w},${yb} ${x0 + w + forskyv},${yt} ${x0 + forskyv},${yt}" fill="none" `
      + 'stroke="var(--tekst-gra)" stroke-width="2" stroke-dasharray="5 4"/>');
    const py = yt - 14;
    deler.push(`<line x1="${x0 + w + forskyv}" y1="${py}" x2="${x0 + w + 8}" y2="${py}" stroke="var(--bakoy-oransje)" stroke-width="3"/>`);
    deler.push(`<polygon points="${x0 + w},${py} ${x0 + w + 11},${py - 6} ${x0 + w + 11},${py + 6}" fill="var(--bakoy-oransje)"/>`);
    deler.push(tekst(x0 + w - 8, py + 5, `Skyv ${mm(r.skjevhet)} mm`, { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }));
  }
  if (skjev) deler.push(tekst(B / 2, H - 6, 'Skjevheten er forstørret, ikke i målestokk', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, H, deler.join(''), `Rektangel ${mm(r.a)} × ${mm(r.b)} mm, diagonal ${mm(r.diagonal)} mm`);
}

// Målelinje med endestreker og tekst under, for mål som lysåpning og bredde
function malelinje(xa, xb, y, innhold) {
  return `<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="var(--tekst-gra)" stroke-width="1"/>`
    + `<line x1="${xa}" y1="${y - 6}" x2="${xa}" y2="${y + 6}" stroke="var(--tekst-gra)" stroke-width="1"/>`
    + `<line x1="${xb}" y1="${y - 6}" x2="${xb}" y2="${y + 6}" stroke="var(--tekst-gra)" stroke-width="1"/>`
    + tekst((xa + xb) / 2, y + 20, innhold);
}

// Lik avstand: lengden som en list med et merke for hvert punkt. Tegnes i riktig forhold.
export function tegnInndeling(r) {
  const B = 400;
  const x0 = 30;
  const bredde = 340;
  const y = 44;
  const s = bredde / r.lengde;
  const punkter = [0, ...r.merker, r.lengde];
  const xer = punkter.map((p) => x0 + p * s);
  const medMal = new Set(punkterMedMal(xer, 44)); // «12 345» er om lag 40 px bred i 14 px
  const overskrift = r.metode === 'fast'
    ? `C/c ${mm(r.cc)} mm, rest ${mm(r.rest)} mm`
    : `${r.antallFelt} felt à ${mm(r.cc, 1)} mm`;
  const deler = [
    tekst(B / 2, 20, overskrift, { vekt: 700, farge: 'var(--bla-mork)' }),
    `<rect x="${x0}" y="${y}" width="${bredde}" height="16" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2"/>`,
  ];
  if (r.metode === 'fast' && r.merker.length) {
    const xr = xer.at(-2);
    deler.push(`<rect x="${xr}" y="${y}" width="${x0 + bredde - xr}" height="16" fill="var(--hvit)" stroke="var(--skisse-strek)" `
      + 'stroke-width="2" stroke-dasharray="4 3"/>');
  }
  xer.forEach((px, i) => {
    deler.push(`<line x1="${px}" y1="${y - 8}" x2="${px}" y2="${y + 24}" stroke="var(--skisse-strek)" stroke-width="2"/>`);
    if (medMal.has(i)) deler.push(tekst(px, y + 42, mm(punkter[i]), { storrelse: 14 }));
  });
  return svg(B, y + 54, deler.join(''), `${overskrift} over ${mm(r.lengde)} mm`);
}

// Spiler i rekkverk sett forfra: stolpene i hver ende, håndlist over og spilene i riktig forhold.
export function tegnSpiler(r) {
  const B = 400;
  const x0 = 34;
  const bredde = 332;
  const topp = 24;
  const bunn = 140;
  const s = bredde / r.lysapning;
  const sb = Math.max(1.5, r.bredde * s);
  const deler = [
    `<rect x="${x0 - 14}" y="${topp - 8}" width="14" height="${bunn - topp + 16}" fill="var(--skisse-strek)"/>`,
    `<rect x="${x0 + bredde}" y="${topp - 8}" width="14" height="${bunn - topp + 16}" fill="var(--skisse-strek)"/>`,
    `<rect x="${x0}" y="${topp - 8}" width="${bredde}" height="8" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="1.5"/>`,
  ];
  for (const f of r.forkant) {
    deler.push(`<rect x="${x0 + f * s}" y="${topp}" width="${sb}" height="${bunn - topp}" fill="var(--skisse-strek)" opacity="0.8"/>`);
  }
  // Første åpning markert, så det synes hva «åpning» er
  const xa = x0;
  const xb = x0 + r.apning * s;
  deler.push(`<line x1="${xa}" y1="${(topp + bunn) / 2}" x2="${xb}" y2="${(topp + bunn) / 2}" stroke="var(--bakoy-oransje)" stroke-width="3"/>`);
  deler.push(tekst(x0 + 2, bunn + 22, `Åpning ${mm(r.apning, 1)} mm`, { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' }));
  deler.push(malelinje(x0, x0 + bredde, bunn + 40, `Lysåpning ${mm(r.lysapning)} mm, ${r.antall} spiler`));
  return svg(B, bunn + 70, deler.join(''), `${r.antall} spiler i ${mm(r.lysapning)} mm, åpning ${mm(r.apning, 1)} mm`);
}

// Utsetting av spiler: starten av rekkverket forstørret. Båndet holdes mot innsiden av stolpen,
// merkene står ved målene i lista, og forkanten av hver spile settes på merket med spilen bort fra
// stolpen. Viser de tre første spilene. Er det flere, fortsetter rekkverket til høyre (…).
const SPILER_I_UTSETTING = 3;

export function tegnSpilerUtsetting(r) {
  if (!r.antall) return '';
  const B = 400;
  const x0 = 58;            // innsiden av stolpen, 0 på båndet
  const vist = Math.min(r.antall, SPILER_I_UTSETTING);
  const flere = r.antall > vist;
  const plass = flere ? 300 : 314;
  const spenn = vist * (r.apning + r.bredde) + (flere ? r.apning * 0.5 : r.apning);
  const s = plass / spenn;
  const yBand = 62;         // båndet
  const ySpile = 98;        // toppen av spilene
  const yBunn = 196;
  const yMal = 212;
  const H = 268;
  const x = (mm0) => x0 + mm0 * s;

  const deler = [
    tekst(16, 22, 'Slik setter du ut målene', { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' }),
    // Stolpen til venstre
    `<rect x="${x0 - 24}" y="40" width="24" height="${yBunn - 40 + 10}" fill="var(--skisse-strek)"/>`,
    tekst(x0 - 12, H - 8, 'Stolpe', { storrelse: 13 }), // under målene, så det ikke kolliderer med første åpning
    // Båndet fra innsiden av stolpen
    `<rect x="${x0}" y="${yBand}" width="${(flere ? 334 : plass) + 2}" height="12" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="1.5"/>`,
    tekst(x0 + 3, yBand + 30, '0', { anker: 'start', storrelse: 13, farge: 'var(--tekst-gra)' }),
  ];
  if (!flere) {
    deler.push(`<rect x="${x(r.lysapning)}" y="40" width="24" height="${yBunn - 40 + 10}" fill="var(--skisse-strek)"/>`);
  }
  for (let i = 0; i < vist; i += 1) {
    const xf = x(r.forkant[i]);
    const xb = xf + r.bredde * s;
    // Spilen
    deler.push(`<rect x="${xf}" y="${ySpile}" width="${r.bredde * s}" height="${yBunn - ySpile}" fill="var(--skisse-flate)" `
      + 'stroke="var(--skisse-strek)" stroke-width="2"/>');
    // Merket på båndet og ned til forkanten av spilen
    deler.push(`<polygon points="${xf - 6},${yBand - 10} ${xf + 6},${yBand - 10} ${xf},${yBand}" fill="var(--bakoy-oransje)"/>`);
    deler.push(`<line x1="${xf}" y1="${yBand}" x2="${xf}" y2="${ySpile}" stroke="var(--bakoy-oransje)" stroke-width="2.5" stroke-dasharray="5 3"/>`);
    deler.push(tekst(xf, yBand - 15, mm(r.forkant[i]), { vekt: 700, farge: 'var(--bla-mork)' }));
    // Åpningen før spilen og bredden på spilen
    const xForrige = i === 0 ? x0 : x(r.forkant[i - 1]) + r.bredde * s;
    deler.push(malelinje(xForrige, xf, yMal, mm(r.apning, 1)));
    deler.push(malelinje(xf, xb, yMal, mm(r.bredde)));
  }
  if (flere) {
    deler.push(tekst(B - 14, (ySpile + yBunn) / 2 + 6, '…', { anker: 'end', storrelse: 24, farge: 'var(--tekst-gra)' }));
  } else {
    const xSiste = x(r.forkant[vist - 1]) + r.bredde * s;
    deler.push(malelinje(xSiste, x(r.lysapning), yMal, mm(r.apning, 1)));
  }
  return svg(B, H, deler.join(''), `Utsetting: forkant av spile 1 på ${mm(r.forkant[0])} mm fra innsiden av stolpen`);
}

// Terrassebord og spaltekledning sett ovenfra: bordene side om side over bredden, i riktig forhold.
export function tegnBord(r) {
  const B = 400;
  const x0 = 30;
  const bredde = 340;
  const topp = 34;
  const hoyde = 80;
  const s = bredde / r.bredde;
  const deler = [tekst(B / 2, 20, `${r.antall} bord, spalte ${mm(r.spalte, 1)} mm`, { vekt: 700, farge: 'var(--bla-mork)' })];
  for (const f of r.forkant) {
    deler.push(`<rect x="${x0 + f * s}" y="${topp}" width="${r.bordbredde * s}" height="${hoyde}" fill="var(--skisse-flate)" `
      + 'stroke="var(--skisse-strek)" stroke-width="1"/>');
  }
  deler.push(malelinje(x0, x0 + bredde, topp + hoyde + 16, `Bredde ${mm(r.bredde)} mm`));
  return svg(B, topp + hoyde + 46, deler.join(''), `${r.antall} bord à ${mm(r.bordbredde)} mm over ${mm(r.bredde)} mm`);
}

// Tekst som følger en skrå linje (dreid vinkel grader mot klokka)
function skraTekst(x, y, vinkel, innhold, { farge = 'var(--tekst)', vekt = 400 } = {}) {
  return `<text x="${x}" y="${y}" font-size="${SKRIFT}" font-weight="${vekt}" text-anchor="middle" fill="${farge}" `
    + `paint-order="stroke" stroke="var(--hvit)" stroke-width="3" transform="rotate(${-vinkel} ${x} ${y})">${innhold}</text>`;
}

// Vinkelbue fra vannrett (mot høyre) og opp til vinkelen, med tekst
function vinkelbue(x, y, vinkel, radius, innhold) {
  const bx = x + radius * Math.cos(vinkel * RAD);
  const by = y - radius * Math.sin(vinkel * RAD);
  const tx = x + (radius + 10) * Math.cos((vinkel / 2) * RAD);
  const ty = y - (radius + 10) * Math.sin((vinkel / 2) * RAD) + 5;
  return `<path d="M ${x + radius} ${y} A ${radius} ${radius} 0 0 0 ${bx} ${by}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`
    + tekst(tx, ty, innhold, { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' });
}

// Sperre sett fra siden: utstikket til venstre, mønet til høyre. I riktig forhold.
export function tegnSperre(r) {
  const B = 400;
  const tan = Math.tan(r.vinkel * RAD);
  const cos = Math.cos(r.vinkel * RAD);
  const horisontalt = r.utstikk + r.lop;
  const s = Math.min(270 / horisontalt, 170 / (horisontalt * tan + r.hoyde / cos));
  const xe = 34;
  const xh = xe + r.utstikk * s;
  const xr = xe + horisontalt * s;
  const xBord = xr - (r.monebord / 2) * s;
  const fm = r.fuglemunn;
  const L = fm ? fm.loddrett * s : 0;
  const d = (r.hoyde / cos) * s;
  const yS = 40 + d + r.lop * tan * s - L;
  const yb = (x) => yS + L - (x - xh) * tan;
  const deler = [];

  // Vegg og svill under hakket
  const svillB = Math.max(8, (fm ? fm.sete : 98) * s);
  deler.push(`<rect x="${xh}" y="${yS}" width="${svillB}" height="12" fill="var(--skisse-strek)"/>`);
  deler.push(`<rect x="${xh}" y="${yS + 12}" width="${svillB}" height="34" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="1"/>`);

  // Sperra
  const punkter = [[xe, yb(xe)]];
  if (fm) punkter.push([xh, yb(xh)], [xh, yS], [xh + fm.sete * s, yS]);
  punkter.push([xBord, yb(xBord)], [xBord, yb(xBord) - d], [xe, yb(xe) - d]);
  deler.push(`<polygon points="${punkter.map((p) => p.join(',')).join(' ')}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" `
    + 'stroke-width="2" stroke-linejoin="round"/>');

  // Midt møne
  deler.push(`<line x1="${xr}" y1="22" x2="${xr}" y2="${yS + 46}" stroke="var(--tekst-gra)" stroke-width="1" stroke-dasharray="6 4"/>`);
  deler.push(tekst(xr, 16, 'Midt møne', { storrelse: 12, farge: 'var(--tekst-gra)' }));

  // Takvinkelen der underkanten går fra setet
  const xv = xh + (fm ? fm.sete * s : 0);
  deler.push(`<line x1="${xv}" y1="${yS}" x2="${xv + 70}" y2="${yS}" stroke="var(--tekst-gra)" stroke-width="1" stroke-dasharray="4 3"/>`);
  deler.push(vinkelbue(xv, yS, r.vinkel, 44, grader(r.vinkel)));

  // Lengde langs overkant, skrevet langs sperra
  const xm = (xe + xBord) / 2;
  const ym = yb(xm) - d - 10;
  deler.push(skraTekst(xm, ym, r.vinkel, `Overkant ${mm(r.lengde, 1)} mm`, { vekt: 700, farge: 'var(--bla-mork)' }));

  // Stigning til høyre for mønet
  const yTopp = yb(xr);
  const yBunn = yb(xh);
  deler.push(`<line x1="${xr + 12}" y1="${yBunn}" x2="${xr + 12}" y2="${yTopp}" stroke="var(--tekst-gra)" stroke-width="1"/>`);
  deler.push(tekst(xr + 18, (yBunn + yTopp) / 2 - 4, 'Stigning', { anker: 'start', storrelse: 13 }));
  deler.push(tekst(xr + 18, (yBunn + yTopp) / 2 + 13, mm(r.stigning, 1), { anker: 'start', storrelse: 13 }));

  // Utstikk og løp, vannrett under
  const yMal = Math.max(yb(xe), yS + 46) + 18;
  deler.push(malelinje(xh, xr, yMal, `Løp ${mm(r.lop)}`));
  let H = yMal + 32;
  if (r.utstikk > 0) {
    if (xh - xe >= mm(r.utstikk).length * 8 + 8) { // tallet får plass mellom endestrekene
      deler.push(malelinje(xe, xh, yMal, mm(r.utstikk)));
    } else {
      // Smalt utstikk: målet skrives på egen linje under, så det ikke går i løpet
      deler.push(`<line x1="${xe}" y1="${yMal}" x2="${xh}" y2="${yMal}" stroke="var(--tekst-gra)" stroke-width="1"/>`
        + `<line x1="${xe}" y1="${yMal - 6}" x2="${xe}" y2="${yMal + 6}" stroke="var(--tekst-gra)" stroke-width="1"/>`);
      deler.push(tekst(xe, yMal + 40, `Utstikk ${mm(r.utstikk)}`, { anker: 'start' }));
      H += 22;
    }
  }
  return svg(B, H, deler.join(''), `Sperre ${grader(r.vinkel)}, ${mm(r.lengde, 1)} mm langs overkant`);
}

// Fuglemunnen forstørret: setet på svilla, loddsnittet og hvor mye som står igjen av sperra.
export function tegnFuglemunn(r) {
  const fm = r.fuglemunn;
  if (!fm) return '';
  const B = 400;
  const tan = Math.tan(r.vinkel * RAD);
  const sin = Math.sin(r.vinkel * RAD);
  const cos = Math.cos(r.vinkel * RAD);
  const s = Math.min(110 / fm.sete, 140 / r.hoyde);
  const xh = 150;
  const yS = 186;
  const L = fm.loddrett * s;
  const d = (r.hoyde / cos) * s;
  const xSete = xh + fm.sete * s;
  const yb = (x) => yS + L - (x - xh) * tan;
  const venstre = -400;
  const hoyre = 800;
  const hS = Math.max(60, L + 20);   // svill og vegg, minst så dypt som hakket går
  const H = yS + hS + 56;
  const sperre = [[venstre, yb(venstre)], [xh, yb(xh)], [xh, yS], [xSete, yS], [hoyre, yb(hoyre)],
    [hoyre, yb(hoyre) - d], [venstre, yb(venstre) - d]];
  const deler = [
    tekst(16, 22, 'Fuglemunnen', { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' }),
    `<defs><clipPath id="fuglemunn-klipp"><rect x="0" y="32" width="${B}" height="${yS + hS - 32}"/></clipPath></defs>`,
    // Svilla, med setet på toppen
    `<rect x="${xh}" y="${yS}" width="${xSete - xh}" height="${hS}" fill="var(--hvit)" stroke="var(--skisse-strek)" stroke-width="2"/>`,
    tekst((xh + xSete) / 2, yS + hS - 8, 'Svill', { storrelse: 13, farge: 'var(--tekst-gra)' }),
    `<g clip-path="url(#fuglemunn-klipp)"><polygon points="${sperre.map((p) => p.join(',')).join(' ')}" fill="var(--skisse-flate)" `
      + 'stroke="var(--skisse-strek)" stroke-width="2" stroke-linejoin="round"/></g>',
    // Det som tas ut, stiplet oransje
    `<polygon points="${xh},${yS} ${xh},${yS + L} ${xSete},${yS}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="2.5" stroke-dasharray="5 3"/>`,
  ];
  // Loddrett del av hakket, til venstre for loddsnittet
  deler.push(`<line x1="${xh - 10}" y1="${yS}" x2="${xh - 10}" y2="${yS + L}" stroke="var(--tekst-gra)" stroke-width="1"/>`);
  deler.push(tekst(xh - 16, yS + L / 2 + 5, `Loddrett ${mm(fm.loddrett, 1)}`, { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }));
  // Resthøyden: vinkelrett fra hjørnet i hakket opp til overkanten
  const rx = xh - sin * fm.rest * s;
  const ry = yS - cos * fm.rest * s;
  deler.push(`<line x1="${xh}" y1="${yS}" x2="${rx}" y2="${ry}" stroke="var(--bla-mork)" stroke-width="1.5"/>`);
  // Teksten står ved siden av streken, ned og til venstre for midten, så den ikke ligger oppå
  deler.push(tekst((xh + rx) / 2 - cos * 10, (yS + ry) / 2 + sin * 10 + 5, `Rest ${mm(fm.rest, 1)}`,
    { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }));
  // Dybden: fra hjørnet i hakket, vinkelrett ned på linja der underkanten gikk
  const dx = xh + sin * fm.dybde * s;
  const dy = yS + cos * fm.dybde * s;
  deler.push(`<line x1="${xh}" y1="${yS}" x2="${dx}" y2="${dy}" stroke="var(--bla-mork)" stroke-width="1.5"/>`);
  deler.push(`<line x1="${dx}" y1="${dy}" x2="${xSete + 10}" y2="${yS + 30}" stroke="var(--tekst-gra)" stroke-width="1"/>`);
  deler.push(tekst(xSete + 14, yS + 35, `Dybde ${mm(fm.dybde, 1)}`, { anker: 'start', storrelse: 13 }));
  // Navn på sperra, inne i den
  const xn = xSete + 110;
  deler.push(tekst(xn, yb(xn) - 30, 'Sperre', { storrelse: 13, farge: 'var(--tekst-gra)' }));
  deler.push(malelinje(xh, xSete, yS + hS + 16, `Sete ${mm(fm.sete)}`));
  return svg(B, H, deler.join(''), `Fuglemunn: sete ${mm(fm.sete)} mm, loddrett ${mm(fm.loddrett, 1)} mm, rest ${mm(fm.rest, 1)} mm`);
}

// Stendere i gavl sett forfra: den skrå svilla øverst, stenderne under i riktig forhold.
// Stenderne er brutt nederst, for de er mye lengre enn forskjellen mellom dem.
export function tegnGavlstendere(r) {
  const B = 400;
  const tan = Math.tan(r.vinkel * RAD);
  const x0 = 40;
  const s = Math.min(300 / (r.lengde + r.tykkelse), 150 / (r.lengde * tan + r.forskjell));
  const w = Math.max(3, r.tykkelse * s);
  const yForste = 40 + (r.lengde * tan + r.forskjell) * s;
  const yBrudd = yForste + 50;
  const yTopp = (x) => yForste - (x - x0) * tan;
  const xEnde = x0 + r.lengde * s + w;
  const deler = [
    `<polygon points="${x0 - 10},${yTopp(x0 - 10)} ${xEnde + 10},${yTopp(xEnde + 10)} ${xEnde + 10},${yTopp(xEnde + 10) - 12} ${x0 - 10},${yTopp(x0 - 10) - 12}" `
      + 'fill="var(--skisse-strek)"/>',
  ];
  const xer = r.stendere.map((st) => x0 + st.avstand * s);
  const medMal = new Set(punkterMedMal(xer, 44));
  r.stendere.forEach((st, i) => {
    const x = xer[i];
    deler.push(`<polygon points="${x},${yBrudd} ${x},${yTopp(x)} ${x + w},${yTopp(x + w)} ${x + w},${yBrudd}" `
      + 'fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="1.5"/>');
    if (medMal.has(i)) deler.push(tekst(x + w / 2, yBrudd + 20, mm(st.kort), { storrelse: 14, vekt: 700, farge: 'var(--bla-mork)' }));
  });
  // Bruddlinje
  deler.push(`<path d="M ${x0 - 12} ${yBrudd - 4} l 8 8 l 8 -8 L ${xEnde + 12} ${yBrudd - 4}" fill="none" stroke="var(--tekst-gra)" stroke-width="1.5"/>`);
  deler.push(tekst(B / 2, yBrudd + 42, 'Kort side. Stenderne er brutt, lengdene står i lista.', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, yBrudd + 52, deler.join(''), `${r.stendere.length} stendere, ${mm(r.okning, 1)} mm lengre for hver`);
}

// Toppen av én stender forstørret: kort og lang side, og vinkelen på emnet.
export function tegnStenderTopp(r) {
  const B = 400;
  const tan = Math.tan(r.vinkel * RAD);
  const s = Math.min(80 / r.tykkelse, 110 / (r.tykkelse * tan));
  const w = r.tykkelse * s;
  const xv = 160;
  const xh = xv + w;
  const yH = 52;
  const yV = yH + w * tan;
  const yBunn = yV + 90;
  const deler = [
    tekst(16, 22, 'Toppen av stenderen', { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' }),
    // Svilla over, i samme vinkel
    `<polygon points="${xv - 60},${yV + 60 * tan} ${xh + 60},${yH - 60 * tan} ${xh + 60},${yH - 60 * tan - 14} ${xv - 60},${yV + 60 * tan - 14}" `
      + 'fill="var(--skisse-strek)"/>',
    `<polygon points="${xv},${yBunn} ${xv},${yV} ${xh},${yH} ${xh},${yBunn}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2"/>`,
    `<path d="M ${xv - 6} ${yBunn - 6} l 6 6 l 6 -6 L ${xh + 6} ${yBunn - 6}" fill="none" stroke="var(--tekst-gra)" stroke-width="1.5"/>`,
    tekst(xv - 10, (yV + yBunn) / 2, 'Kort side', { anker: 'end' }),
    tekst(xh + 10, (yH + yBunn) / 2 - 8, 'Lang side', { anker: 'start' }),
    tekst(xh + 10, (yH + yBunn) / 2 + 12, `+${mm(r.forskjell, 1)} mm`, { anker: 'start', vekt: 700, farge: 'var(--bla-mork)' }),
  ];
  // Vinkelen på emnet ved lang side, mellom kanten og snittet
  const rb = Math.min(28, w * 0.6);
  const ax = xh - rb * Math.cos(r.vinkel * RAD);
  const ay = yH + rb * Math.sin(r.vinkel * RAD);
  deler.push(`<path d="M ${xh} ${yH + rb} A ${rb} ${rb} 0 0 1 ${ax} ${ay}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`);
  deler.push(tekst(xh - rb - 4, yH + rb + 18, grader(r.vinkelEmne), { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }));
  deler.push(tekst(B / 2, yBunn + 24, `Saga på ${grader(r.sag)}. Vinkelen på emnet er ${grader(r.vinkelEmne)}.`, { storrelse: 13 }));
  return svg(B, yBunn + 34, deler.join(''), `Stendertopp: lang side ${mm(r.forskjell, 1)} mm lengre enn kort side`);
}

// Takflate i snitt: saltak med mønet midt på, eller pulttak med én flate.
export function tegnTakflate(r) {
  const B = 400;
  const tan = Math.tan(r.vinkel * RAD);
  const x0 = 50;
  const flate = r.vannrettPerFlate;
  const hoydeMm = flate * tan;
  const s = hoydeMm > 0 ? Math.min(300 / r.bredde, 140 / hoydeMm) : 300 / r.bredde;
  const bredde = r.bredde * s;
  const h = hoydeMm * s;
  const yBunn = 50 + h;
  const xTopp = r.taktype === 'saltak' ? x0 + bredde / 2 : x0 + bredde;
  const punkter = r.taktype === 'saltak'
    ? `${x0},${yBunn} ${xTopp},${yBunn - h} ${x0 + bredde},${yBunn}`
    : `${x0},${yBunn} ${x0 + bredde},${yBunn - h} ${x0 + bredde},${yBunn}`;
  const deler = [
    tekst(B / 2, 20, `Takflate ${mm(r.takflate, 2)} m²`, { vekt: 700, farge: 'var(--bla-mork)' }),
    `<polygon points="${punkter}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2.5" stroke-linejoin="round"/>`,
  ];
  if (r.vinkel > 0) {
    deler.push(vinkelbue(x0, yBunn, r.vinkel, 36, grader(r.vinkel)));
    const xm = (x0 + xTopp) / 2 - 8;
    const ym = yBunn - h / 2 - 12;
    deler.push(skraTekst(xm, ym, r.vinkel, `Langs taket ${mm(r.langsTaket)} mm`, { vekt: 700, farge: 'var(--bla-mork)' }));
  }
  deler.push(malelinje(x0, x0 + bredde, yBunn + 18, `Bredde ${mm(r.bredde)} mm, vannrett`));
  return svg(B, yBunn + 48, deler.join(''), `${r.taktype === 'saltak' ? 'Saltak' : 'Pulttak'} ${grader(r.vinkel)}, takflate ${mm(r.takflate, 2)} m²`);
}

// Gjæring i hjørne sett ovenfra: to lister møtes i hjørnet, og gjæringen deler vinkelen likt.
// Vinkler under 40° og over 170° tegnes med 40° og 170°, så skissen blir lesbar.
export function tegnGjaering(r) {
  const B = 400;
  const vist = klem(r.hjorne, 40, 170);
  const overdrevet = vist !== r.hjorne;
  const h = vist * RAD;
  const L = 160;
  const t = 26;
  const inn = r.type === 'innvendig';
  const u1 = [1, 0];
  const u2 = [Math.cos(h), -Math.sin(h)];
  const b = [Math.cos(h / 2), -Math.sin(h / 2)];
  const n1 = inn ? [0, -1] : [0, 1];
  const n2 = inn ? [Math.sin(h), Math.cos(h)] : [-Math.sin(h), -Math.cos(h)];
  const q = (inn ? 1 : -1) * (t / Math.sin(h / 2));
  const P = [B / 2 - (L + L * Math.min(0, Math.cos(h))) / 2, 40 + L * Math.sin(h) + (inn ? 0 : 6)];
  const pt = (base, ...ledd) => ledd.reduce((acc, [v, k]) => [acc[0] + v[0] * k, acc[1] + v[1] * k], base);
  const Q = pt(P, [b, q]);
  const fmt = (p) => `${p[0]},${p[1]}`;
  const band = (u, n) => [P, pt(P, [u, L]), pt(P, [u, L], [n, t]), Q].map(fmt).join(' ');
  const deler = [
    // Veggene
    `<line x1="${P[0]}" y1="${P[1]}" x2="${pt(P, [u1, L + 10])[0]}" y2="${P[1]}" stroke="var(--tekst-gra)" stroke-width="5"/>`,
    `<line x1="${P[0]}" y1="${P[1]}" x2="${pt(P, [u2, L + 10])[0]}" y2="${pt(P, [u2, L + 10])[1]}" stroke="var(--tekst-gra)" stroke-width="5"/>`,
    `<polygon points="${band(u1, n1)}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2" stroke-linejoin="round"/>`,
    `<polygon points="${band(u2, n2)}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2" stroke-linejoin="round"/>`,
    // Gjæringen
    `<line x1="${P[0]}" y1="${P[1]}" x2="${Q[0]}" y2="${Q[1]}" stroke="var(--bla-mork)" stroke-width="3"/>`,
  ];
  // Vinkelen i hjørnet, mellom veggene
  const rb = 64;
  const a2 = pt(P, [u2, rb]);
  deler.push(`<path d="M ${P[0] + rb} ${P[1]} A ${rb} ${rb} 0 0 0 ${a2[0]} ${a2[1]}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`);
  const lp = pt(P, [b, inn ? rb + 46 : rb + 14]);
  deler.push(tekst(lp[0], lp[1] + 5, `Hjørne ${grader(r.hjorne)}`, { vekt: 700, farge: 'var(--bla-mork)' }));
  const y = P[1] + (inn ? 28 : 46);
  deler.push(tekst(B / 2, y, `Saga på ${grader(r.sag)}. Vinkel på emnet ${grader(r.emne)}.`, { storrelse: 14 }));
  deler.push(tekst(B / 2, y + 20, inn ? 'Lista er lengst på baksiden, mot veggen.' : 'Lista er lengst på forsiden.',
    { storrelse: 13, farge: 'var(--tekst-gra)' }));
  if (overdrevet) deler.push(tekst(B / 2, y + 38, 'Ikke i målestokk', { storrelse: 12, farge: 'var(--tekst-gra)' }));
  return svg(B, y + (overdrevet ? 46 : 30), deler.join(''), `Gjæring i ${r.type} hjørne på ${grader(r.hjorne)}`);
}

// Mangekant: ramme med gjæring i hvert hjørne, en flate nederst.
export function tegnMangekant(r) {
  const B = 400;
  const n = r.sider;
  const Ro = 120;
  const w = 18;
  const halv = Math.PI / n;
  const Ri = Ro - w / Math.cos(halv);
  const cx = B / 2;
  const cy = 30 + Ro;
  const hjorne = (R, k) => {
    const a = Math.PI / 2 + halv + (k * 2 * Math.PI) / n;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  };
  const ytre = Array.from({ length: n }, (_, k) => hjorne(Ro, k));
  const indre = Array.from({ length: n }, (_, k) => hjorne(Ri, k));
  const deler = [
    `<polygon points="${ytre.map((p) => p.join(',')).join(' ')}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2"/>`,
    `<polygon points="${indre.map((p) => p.join(',')).join(' ')}" fill="var(--hvit)" stroke="var(--skisse-strek)" stroke-width="2"/>`,
    ...ytre.map((p, k) => `<line x1="${p[0]}" y1="${p[1]}" x2="${indre[k][0]}" y2="${indre[k][1]}" stroke="var(--bla-mork)" stroke-width="2"/>`),
  ];
  const bunn = cy + Ro * Math.cos(halv);
  if (r.sidelengde !== null) {
    deler.push(tekst(cx, bunn + 22, `Side ${mm(r.sidelengde, 1)} mm utvendig`, { vekt: 700, farge: 'var(--bla-mork)' }));
  }
  if (r.mal !== null) {
    deler.push(tekst(cx, cy + 5, `${r.malType === 'flater' ? 'Over flatene' : 'Over hjørnene'} ${mm(r.mal)} mm`, { storrelse: 14 }));
  }
  deler.push(tekst(cx, bunn + (r.sidelengde !== null ? 44 : 24), `Saga på ${grader(r.sag)}. Vinkel på emnet ${grader(r.emne)}.`, { storrelse: 14 }));
  return svg(B, bunn + (r.sidelengde !== null ? 56 : 36), deler.join(''), `Mangekant med ${n} sider, saga på ${grader(r.sag)}`);
}

// Sammensatt gjæring: snitt gjennom taklista i hjørnet mellom vegg og tak, med helningen.
export function tegnSammensatt(r) {
  const B = 400;
  const vist = klem(r.helning, 10, 80) * RAD;
  const xv = 150;
  const yt = 40;
  const Lb = 150;
  const tk = 18;
  const w = [xv, yt + Lb * Math.cos(vist)];
  const c = [xv + Lb * Math.sin(vist), yt];
  const nn = [Math.cos(vist), Math.sin(vist)];
  const pts = [w, c, [c[0] + tk * nn[0], c[1] + tk * nn[1]], [w[0] + tk * nn[0], w[1] + tk * nn[1]]];
  const yBunn = Math.max(w[1] + 40, 220);
  const deler = [
    `<line x1="${xv - 30}" y1="${yt}" x2="${B - 20}" y2="${yt}" stroke="var(--tekst-gra)" stroke-width="5"/>`,
    `<line x1="${xv}" y1="${yt - 10}" x2="${xv}" y2="${yBunn}" stroke="var(--tekst-gra)" stroke-width="5"/>`,
    tekst(B - 24, yt - 10, 'Tak', { anker: 'end', storrelse: 13, farge: 'var(--tekst-gra)' }),
    tekst(xv - 10, yBunn - 4, 'Vegg', { anker: 'end', storrelse: 13, farge: 'var(--tekst-gra)' }),
    `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="var(--skisse-flate)" stroke="var(--skisse-strek)" stroke-width="2" stroke-linejoin="round"/>`,
    tekst((w[0] + c[0]) / 2 + nn[0] * 46, (w[1] + c[1]) / 2 + nn[1] * 46 + 5, 'Taklist', { anker: 'start', storrelse: 13 }),
  ];
  // Helningen: mellom veggen (opp) og baksiden av lista
  const rb = 46;
  const a = [w[0] + rb * Math.sin(vist), w[1] - rb * Math.cos(vist)];
  deler.push(`<path d="M ${w[0]} ${w[1] - rb} A ${rb} ${rb} 0 0 1 ${a[0]} ${a[1]}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="3"/>`);
  deler.push(tekst(w[0] - 10, w[1] - rb / 2, `Helning ${grader(r.helning)}`, { anker: 'end', vekt: 700, farge: 'var(--bla-mork)' }));
  deler.push(tekst(B / 2, yBunn + 26, `Dreieskiva ${grader(r.dreieskive)}, bladet ${grader(r.blad)}`, { storrelse: 14 }));
  deler.push(tekst(B / 2, yBunn + 46, `Hjørnet mellom veggene: ${grader(r.vegg)}`, { storrelse: 13, farge: 'var(--tekst-gra)' }));
  return svg(B, yBunn + 56, deler.join(''), `Taklist med helning ${grader(r.helning)} i hjørne på ${grader(r.vegg)}`);
}
