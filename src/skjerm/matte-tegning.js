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
