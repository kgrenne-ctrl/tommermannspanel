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
