// Tegner trappa som SVG ut fra en løsning fra src/trapp/solver.js og vangen fra
// src/trapp/vange.js. Ingen regning av trappa her, bare tegning. Alle mål i mm, i riktig målestokk.
//
// tegnTrapp:       trappa sett fra siden. Trappa går opp mot høyre. x = 0 er forkant av
//                  nederste trinn, y = 0 er ferdig underlag. I SVG går y nedover, så høyder
//                  tegnes som topp − y.
// tegnVangeFlatt:  vangen lagt flatt, slik den ligger på bukkene, med overkanten øverst og
//                  merkene langs den. Nederste spiss er 0 (oransje).

import { mm } from './format.js';

export function tegnTrapp(l, vange, { nese = 20, trinnTykkelse = 28, beleggNede = 0 } = {}) {
  const h = l.opptrinn;
  const b = l.inntrinn;
  const H = l.opptrinn * l.antallOpptrinn;
  const m = l.antallInntrinn;
  const eget = m === l.antallOpptrinn;
  const lop = l.lopslengde;
  const t = trinnTykkelse;

  const storst = Math.max(H, lop, 800);
  const skrift = storst * 0.05;
  const strek = storst * 0.0022;
  const kant = storst * 0.06;
  const dekkeLengde = Math.max(400, lop * 0.3);
  const dekkeTykkelse = Math.min(200, H * 0.25);

  const xMin = -kant * 2.2;                 // plass til høydemålet til venstre
  const xMaks = lop + dekkeLengde;
  const yTopp = H + kant;
  const yBunn = -kant * 2 - beleggNede;     // plass til lengdemålet under
  const Y = (y) => yTopp - y;

  const deler = [];

  // Vangen, fra regnemodellen
  if (vange?.omriss) {
    deler.push(`<polygon class="t-vange" points="${vange.omriss.map(({ x, y }) => `${x},${Y(y)}`).join(' ')}" `
      + `fill="var(--vange)" stroke="var(--bord-kant)" stroke-width="${strek}" stroke-linejoin="round"/>`);
  }

  // Dekket oppe, fra forkant av dekket og innover
  deler.push(`<rect class="t-dekke" x="${lop}" y="${Y(H)}" width="${dekkeLengde}" height="${dekkeTykkelse}" `
    + `fill="var(--dekke)" stroke="var(--tekst-gra)" stroke-width="${strek}"/>`);
  deler.push(`<text x="${lop + dekkeLengde / 2}" y="${Y(H) + dekkeTykkelse / 2 + skrift * 0.35}" font-size="${skrift}" `
    + 'text-anchor="middle" fill="var(--tekst)">Dekke</text>');

  // Trinnene. Trinnet stikker nesa ut foran hakket. Med eget trinn øverst slutter det mot dekket.
  for (let k = 1; k <= m; k++) {
    const fra = (k - 1) * b;
    const dybde = eget && k === m ? b : b + nese;
    deler.push(`<rect class="t-trinn" x="${fra}" y="${Y(k * h)}" width="${dybde}" height="${t}" `
      + `fill="var(--trinn)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    deler.push(`<text x="${fra + dybde / 2}" y="${Y(k * h) - skrift * 0.35}" font-size="${skrift * 0.8}" `
      + `text-anchor="middle" fill="var(--tekst-gra)">${k}</text>`);
  }

  // Ferdig underlag, og der vangen står når belegget legges senere (stiplet)
  deler.push(`<line x1="${xMin}" y1="${Y(0)}" x2="${xMaks}" y2="${Y(0)}" stroke="var(--tekst-gra)" stroke-width="${strek * 2.5}"/>`);
  if (beleggNede > 0) {
    deler.push(`<line x1="${xMin}" y1="${Y(-beleggNede)}" x2="${xMaks}" y2="${Y(-beleggNede)}" stroke="var(--tekst-gra)" `
      + `stroke-width="${strek * 1.5}" stroke-dasharray="${skrift * 0.4}"/>`);
  }

  // Mål: høyden til venstre, løpslengden under
  const pil = skrift * 0.35;
  const xH = -kant * 1.2;
  const yL = -kant * 0.9 - beleggNede;
  deler.push(`<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="${xH}" y1="${Y(0)}" x2="${xH}" y2="${Y(H)}"/>`
    + `<line x1="${xH - pil}" y1="${Y(0)}" x2="${xH + pil}" y2="${Y(0)}"/>`
    + `<line x1="${xH - pil}" y1="${Y(H)}" x2="${xH + pil}" y2="${Y(H)}"/>`
    + `<line x1="${xH}" y1="${Y(H)}" x2="${lop}" y2="${Y(H)}" stroke-dasharray="${skrift * 0.3}" stroke="var(--kant)"/>`
    + `<line x1="0" y1="${Y(yL)}" x2="${lop}" y2="${Y(yL)}"/>`
    + `<line x1="0" y1="${Y(yL) - pil}" x2="0" y2="${Y(yL) + pil}"/>`
    + `<line x1="${lop}" y1="${Y(yL) - pil}" x2="${lop}" y2="${Y(yL) + pil}"/>`
    + '</g>');
  deler.push(`<text x="${xH - skrift * 0.5}" y="${Y(H / 2)}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)" `
    + `transform="rotate(-90 ${xH - skrift * 0.5} ${Y(H / 2)})">${mm(H)} mm</text>`);
  deler.push(`<text x="${lop / 2}" y="${Y(yL) + skrift * 1.3}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${mm(lop)} mm</text>`);

  return `<svg class="tegning" viewBox="${xMin} 0 ${xMaks - xMin} ${yTopp - yBunn}" xmlns="http://www.w3.org/2000/svg" role="img" `
    + `aria-label="Trappa sett fra siden, ${l.antallOpptrinn} opptrinn à ${mm(h, 1)} mm og ${m} trinn">`
    + deler.join('')
    + '</svg>';
}

// Felles for tegningene av vangen lagt flatt: emnet (stiplet) og vangen slik den blir (fylt).
// Det som kappes bort, er det hvite mellom dem.
function emneOgVange(vange, W, strek, strekMonster) {
  const fra = -vange.spissFraEnden;
  return `<rect class="v-emne" x="${fra}" y="0" width="${vange.emnelengde}" height="${W}" fill="var(--hvit)" `
    + `stroke="var(--kant)" stroke-width="${strek}" stroke-dasharray="${strekMonster}"/>`
    + `<polygon class="v-vange" points="${vange.flatt.map(({ u, v }) => `${u},${v}`).join(' ')}" `
    + `fill="var(--vange)" stroke="var(--bord-kant)" stroke-width="${strek * 1.5}" stroke-linejoin="round"/>`;
}

const tekst = (x, y, f, innhold, { anker = 'middle', farge = 'var(--tekst)', vekt = '', klasse = '' } = {}) =>
  `<text${klasse ? ` class="${klasse}"` : ''} x="${x}" y="${y}" font-size="${f}" text-anchor="${anker}" fill="${farge}"`
  + `${vekt ? ` font-weight="${vekt}"` : ''}>${innhold}</text>`;

// Hvit kant bak teksten, så den kan leses oppå streker og flater
const STYRK = 'paint-order="stroke" stroke="var(--hvit)" stroke-linejoin="round"';

function svg(xMin, yMin, bredde, hoyde, etikett, innhold) {
  return `<svg class="tegning" viewBox="${xMin} ${yMin} ${bredde} ${hoyde}" xmlns="http://www.w3.org/2000/svg" `
    + `role="img" aria-label="${etikett}">${innhold}</svg>`;
}

// Hele vangen lagt flatt, med overkanten opp og et merke for hver spiss.
// Tallene står på høykant over merkene. Skriften er aldri høyere enn 55 % av avstanden mellom
// merkene, så tallene ikke kan gå inn i hverandre, uansett hvor lang vangen er.
export function tegnVangeFlatt(vange, { vangeBredde = 223 } = {}) {
  const W = vangeBredde;
  const fra = -vange.spissFraEnden;
  const lengde = vange.emnelengde;
  const skala = Math.max(lengde, 800);
  const skrift = Math.min(0.55 * vange.s, 0.55 * W, 0.05 * skala);
  const strek = skala * 0.0018;
  const kant = skrift * 0.8;
  const merkeTopp = -skrift * 0.6;
  const lengsteTall = Math.max(...vange.merker.map((m) => mm(m.avstand).length));
  const yMin = merkeTopp - skrift * 0.3 - lengsteTall * skrift * 0.62;
  const yUnder = W + skrift * 1.6;

  const deler = [emneOgVange(vange, W, strek, skrift * 0.4)];
  for (const merke of vange.merker) {
    const farge = merke.hakk === 1 ? 'var(--bakoy-oransje)' : 'var(--tekst)';
    const u = merke.eksakt;
    deler.push(`<line class="v-merke" x1="${u}" y1="${merkeTopp}" x2="${u}" y2="${skrift * 0.4}" stroke="${farge}" stroke-width="${strek * 2}"/>`);
    const x = u + skrift * 0.35;
    const y = merkeTopp - skrift * 0.3;
    deler.push(`<text class="v-tall" x="${x}" y="${y}" font-size="${skrift}" text-anchor="start" fill="var(--tekst)" `
      + `font-weight="600" transform="rotate(-90 ${x} ${y})">${mm(merke.avstand)}</text>`);
  }
  const pil = skrift * 0.35;
  deler.push(`<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="${fra}" y1="${yUnder}" x2="${fra + lengde}" y2="${yUnder}"/>`
    + `<line x1="${fra}" y1="${yUnder - pil}" x2="${fra}" y2="${yUnder + pil}"/>`
    + `<line x1="${fra + lengde}" y1="${yUnder - pil}" x2="${fra + lengde}" y2="${yUnder + pil}"/></g>`);
  deler.push(tekst(fra + lengde / 2, yUnder + skrift * 1.3, skrift, `Emne minst ${mm(lengde)} mm`));
  deler.push(`<text x="${fra - kant}" y="${W / 2}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)" `
    + `transform="rotate(-90 ${fra - kant} ${W / 2})">${mm(W)}</text>`);

  const xMin = fra - kant * 2.2;
  const xMaks = fra + lengde + kant;
  const yMaks = yUnder + skrift * 1.8;
  const ut = svg(xMin, yMin, xMaks - xMin, yMaks - yMin, `Vangen lagt flatt med ${vange.merker.length} hakk`, deler.join(''));
  // Omtrent 56 piksler mellom spissene. Blir det bredere enn en telefon, får tegningen fast bredde
  // og kan skyves sideveis (zoomBoks leser width), ellers fyller den bredden som før.
  const piksler = Math.round(((xMaks - xMin) / vange.s) * 56);
  return piksler > 360 ? ut.replace('<svg ', `<svg width="${piksler}" `) : ut;
}

// Ett hakk forstørret, med vinkelen lagt på: hakket mellom nederste spiss (0) og neste spiss.
// Vinkelen ligger med hjørnet i det innerste punktet i hakket. Den ene armen går gjennom
// spiss 0 (inntrinnet, setet trinnet ligger på), den andre gjennom neste spiss (opptrinnet).
export function tegnHakk(vange, l, { vangeBredde = 223 } = {}) {
  const W = vangeBredde;
  const { s, hakkDybde } = vange;
  const h = l.opptrinn;
  const b = l.inntrinn;
  const spiss0 = { u: 0, v: 0 };
  const spiss1 = { u: s, v: 0 };
  const hjorne = { u: (b * b) / s, v: hakkDybde };

  const uFra = -0.22 * s;
  const uTil = 1.6 * s;
  const f = (uTil - uFra) * 0.042;
  const strek = f * 0.06;
  const vFra = -f * 2.4;
  const vTil = W + f * 0.9;

  const deler = [emneOgVange(vange, W, strek, f * 0.3)];

  // Vinkelen: to brede, gjennomsiktige armer langs hakket, litt forbi spissene
  const forbi = (fra, til, ekstra) => {
    const lengde = Math.hypot(til.u - fra.u, til.v - fra.v);
    return { u: fra.u + ((til.u - fra.u) * (lengde + ekstra)) / lengde, v: fra.v + ((til.v - fra.v) * (lengde + ekstra)) / lengde };
  };
  const arm1 = forbi(hjorne, spiss0, 0.16 * s);
  const arm2 = forbi(hjorne, spiss1, 0.16 * s);
  deler.push(`<polyline class="v-vinkel" points="${arm1.u},${arm1.v} ${hjorne.u},${hjorne.v} ${arm2.u},${arm2.v}" fill="none" `
    + `stroke="var(--bakoy-oransje)" stroke-opacity="0.45" stroke-width="${f * 0.75}" stroke-linejoin="miter"/>`);
  // Strekene du tegner langs armene
  deler.push(`<polyline points="${spiss0.u},${spiss0.v} ${hjorne.u},${hjorne.v} ${spiss1.u},${spiss1.v}" fill="none" `
    + `stroke="var(--bord-kant)" stroke-width="${strek * 2.5}"/>`);

  // Spissene på overkanten
  for (const [p, tall, farge] of [[spiss0, 0, 'var(--bakoy-oransje)'], [spiss1, vange.merker[1]?.avstand ?? Math.round(s), 'var(--tekst)']]) {
    deler.push(`<line x1="${p.u}" y1="${-f * 0.7}" x2="${p.u}" y2="${f * 0.25}" stroke="${farge}" stroke-width="${strek * 3}"/>`);
    deler.push(tekst(p.u, -f * 1.0, f, `Spiss ${mm(tall)}`, { vekt: '600' }));
  }

  // Mål langs armene
  const midt1 = { u: (spiss0.u + hjorne.u) / 2, v: (spiss0.v + hjorne.v) / 2 };
  const midt2 = { u: (spiss1.u + hjorne.u) / 2, v: (spiss1.v + hjorne.v) / 2 };
  deler.push(`<text x="${midt1.u - f * 0.4}" y="${midt1.v + f * 1.5}" font-size="${f}" text-anchor="middle" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">Inntrinn ${mm(b, 1)}</text>`);
  deler.push(`<text x="${midt1.u - f * 0.4}" y="${midt1.v + f * 2.6}" font-size="${f * 0.8}" text-anchor="middle" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">trinnet ligger her</text>`);
  deler.push(`<text x="${midt2.u + f * 0.6}" y="${midt2.v + f * 0.3}" font-size="${f}" text-anchor="start" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">Opptrinn ${mm(h, 1)}</text>`);

  // Hakkdybde og resthøyde: rett inn fra overkanten gjennom innerste punkt
  const u = hjorne.u;
  deler.push(`<g stroke="var(--tekst-gra)" stroke-width="${strek * 1.5}" stroke-dasharray="${f * 0.25}">`
    + `<line x1="${u}" y1="0" x2="${u}" y2="${W}"/></g>`);
  deler.push(`<text x="${u - f * 0.3}" y="${hakkDybde * 0.55}" font-size="${f * 0.8}" text-anchor="end" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">Hakk ${mm(hakkDybde, 1)}</text>`);
  deler.push(`<text x="${u - f * 0.3}" y="${hakkDybde + (W - hakkDybde) * 0.6}" font-size="${f * 0.8}" text-anchor="end" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">Rest ${mm(vange.resthoyde, 1)}</text>`);
  deler.push(`<text x="${hjorne.u + f * 0.5}" y="${hjorne.v + f * 1.3}" font-size="${f * 0.8}" text-anchor="start" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">Hjørnet av vinkelen</text>`);

  return svg(uFra, vFra, uTil - uFra, vTil - vFra, 'Ett hakk med vinkelen lagt på', deler.join(''));
}

// Bunnen av vangen forstørret: fra enden av emnet til litt forbi bunnkuttet.
export function tegnBunn(vange, { vangeBredde = 223 } = {}) {
  const W = vangeBredde;
  const [foran, spiss0] = vange.flatt;            // nederst foran, nederste spiss
  const fot = vange.flatt.at(-1);                 // bakerste punkt av bunnkuttet
  const ende = -vange.spissFraEnden;
  const uFra = ende - 0.12 * vange.s;
  const uTil = Math.max(fot.u, spiss0.u) + 0.35 * vange.s;
  const f = (uTil - uFra) * 0.045;
  const strek = f * 0.06;
  const vFra = -f * 2.6;
  const vTil = W + f * 2.2;

  const deler = [emneOgVange(vange, W, strek, f * 0.3)];
  // Bunnkuttet og den loddrette kanten foran, uthevet
  deler.push(`<polyline points="${spiss0.u},${spiss0.v} ${foran.u},${foran.v} ${fot.u},${fot.v}" fill="none" `
    + `stroke="var(--bord-kant)" stroke-width="${strek * 3}"/>`);
  // Fra enden av emnet til nederste spiss
  const y = -f * 0.6;
  deler.push(`<g stroke="var(--tekst)" stroke-width="${strek * 1.5}">`
    + `<line x1="${ende}" y1="${y}" x2="${spiss0.u}" y2="${y}"/>`
    + `<line x1="${ende}" y1="${y - f * 0.3}" x2="${ende}" y2="${y + f * 0.3}"/>`
    + `<line x1="${spiss0.u}" y1="${y - f * 0.3}" x2="${spiss0.u}" y2="${y + f * 0.3}"/></g>`);
  deler.push(tekst((ende + spiss0.u) / 2, y - f * 0.45, f, mm(vange.spissFraEnden), { vekt: '600' }));
  deler.push(`<line x1="${spiss0.u}" y1="${-f * 0.95}" x2="${spiss0.u}" y2="${f * 0.25}" stroke="var(--bakoy-oransje)" stroke-width="${strek * 3}"/>`);
  deler.push(tekst(spiss0.u + f * 0.3, -f * 1.05, f, 'Spiss 0', { anker: 'start', vekt: '600' }));
  // Mål på kantene
  const m1 = { u: (spiss0.u + foran.u) / 2, v: (spiss0.v + foran.v) / 2 };
  const m2 = { u: (foran.u + fot.u) / 2, v: (foran.v + fot.v) / 2 };
  deler.push(`<text x="${m1.u - f * 0.4}" y="${m1.v + f * 0.3}" font-size="${f}" text-anchor="end" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(vange.nedersteOpptrinn, 1)}</text>`);
  deler.push(`<text x="${m2.u - f * 0.6}" y="${Math.max(m2.v, fot.v) + f * 1.6}" font-size="${f}" text-anchor="end" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">Bunnkutt ${mm(vange.fot)}</text>`);

  return svg(uFra, vFra, uTil - uFra, vTil - vFra, 'Bunnen av vangen', deler.join(''));
}

// Toppen av vangen forstørret: øverste spiss, øverste hakk og toppkuttet.
export function tegnTopp(vange, { vangeBredde = 223 } = {}) {
  const W = vangeBredde;
  const n = vange.flatt.length;
  const sete = vange.flatt[n - 4];                // starten av setet i øverste hakk (= øverste spiss)
  const kuttTopp = vange.flatt[n - 3];            // der toppkuttet starter, på setet
  const kuttBunn = vange.flatt[n - 2];            // der toppkuttet treffer underkanten
  const sisteSpiss = vange.merker.at(-1);
  const uFra = Math.min(sisteSpiss.eksakt, sete.u) - 0.3 * vange.s;
  const uTil = Math.max(kuttTopp.u, kuttBunn.u) + 0.25 * vange.s;
  const f = (uTil - uFra) * 0.045;
  const strek = f * 0.06;
  const vFra = -f * 2.6;
  const vTil = W + f * 2.2;

  const deler = [emneOgVange(vange, W, strek, f * 0.3)];
  deler.push(`<line x1="${kuttTopp.u}" y1="${kuttTopp.v}" x2="${kuttBunn.u}" y2="${kuttBunn.v}" stroke="var(--bord-kant)" stroke-width="${strek * 3}"/>`);
  deler.push(`<line x1="${sisteSpiss.eksakt}" y1="${-f * 0.7}" x2="${sisteSpiss.eksakt}" y2="${f * 0.25}" stroke="var(--tekst)" stroke-width="${strek * 3}"/>`);
  deler.push(tekst(sisteSpiss.eksakt, -f * 1.0, f, `Spiss ${mm(sisteSpiss.avstand)}`, { vekt: '600' }));
  const midt = { u: (kuttTopp.u + kuttBunn.u) / 2, v: (kuttTopp.v + kuttBunn.v) / 2 };
  deler.push(`<text x="${midt.u - f * 0.5}" y="${midt.v + f * 0.3}" font-size="${f}" text-anchor="end" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">Toppkutt ${mm(vange.toppkutt.lengde)}</text>`);
  if (vange.toppkutt.foranBakkant === 0) {
    deler.push(`<circle cx="${kuttTopp.u}" cy="${kuttTopp.v}" r="${f * 0.25}" fill="var(--bord-kant)"/>`);
    deler.push(`<text x="${kuttTopp.u - f * 0.5}" y="${kuttTopp.v - f * 0.4}" font-size="${f * 0.8}" text-anchor="end" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">Innerste hjørne</text>`);
  }
  if (vange.toppkutt.foranBakkant > 0) {
    deler.push(`<text x="${kuttTopp.u}" y="${kuttTopp.v - f * 0.5}" font-size="${f * 0.8}" text-anchor="middle" fill="var(--tekst-gra)" ${STYRK} stroke-width="${f * 0.2}">${mm(vange.toppkutt.foranBakkant)} foran hjørnet</text>`);
  }
  return svg(uFra, vFra, uTil - uFra, vTil - vFra, 'Toppen av vangen', deler.join(''));
}
