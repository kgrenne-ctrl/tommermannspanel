// Tegner trappa som SVG ut fra en løsning fra src/trapp/solver.js og vangen fra
// src/trapp/vange.js. Ingen regning av trappa her, bare tegning. Alle mål i mm, i riktig målestokk.
//
// tegnTrapp:       trappa sett fra siden. Trappa går opp mot høyre. x = 0 er forkant av
//                  nederste trinn, y = 0 er ferdig underlag. I SVG går y nedover, så høyder
//                  tegnes som topp − y.
// tegnVangeFlatt:  vangen lagt flatt, slik den ligger på bukkene, med overkanten øverst og
//                  merkene langs den. Nederste spiss er 0 (oransje).

import { mm } from './format.js';

// trapphull: fra lagTrapphull (valgfri). Da tegnes etasjeskilleren over trappa, kanten av hullet
// og fri høyde ved kanten. Uten lengde på hullet vises minste trapphull.
// stusstrinn: tykkelsen på tette opptrinn (valgfri).
export function tegnTrapp(l, vange, { nese = 20, trinnTykkelse = 28, beleggNede = 0, trapphull = null, stusstrinn = null } = {}) {
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
  const dekkeTykkelse = trapphull ? trapphull.etasjeskiller : Math.min(200, H * 0.25);
  // Kanten av trapphullet: den som er lagt inn, ellers der hullet minst må gå
  const hullKant = trapphull ? (trapphull.kant ?? lop - trapphull.minsteHull) : null;

  const xMin = Math.min(-kant * 2.2, hullKant === null ? 0 : hullKant - kant * 2);
  const xMaks = lop + dekkeLengde;
  const yTopp = H + kant * (trapphull ? 2.2 : 1);
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

  // Etasjeskilleren over trappa, fra venstre kant til kanten av trapphullet
  if (trapphull) {
    deler.push(`<rect class="t-etasjeskiller" x="${xMin}" y="${Y(H)}" width="${hullKant - xMin}" height="${dekkeTykkelse}" `
      + `fill="var(--dekke)" stroke="var(--tekst-gra)" stroke-width="${strek}"${trapphull.kant === null ? ` stroke-dasharray="${skrift * 0.3}"` : ''}/>`);
  }

  // Tette opptrinn: stusstrinnet står på den loddrette flaten i hakket, fra trinnet under til trinnet over
  if (stusstrinn) {
    for (let k = 1; k <= m; k++) {
      const x = (k - 1) * b + nese;
      deler.push(`<rect class="t-stusstrinn" x="${x - stusstrinn}" y="${Y(k * h - t)}" width="${stusstrinn}" height="${h - t}" `
        + `fill="var(--trinn)" stroke="var(--bord-kant)" stroke-width="${strek * 0.8}"/>`);
    }
  }

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

  // Trapphullet: lengden over og fri høyde ved kanten
  if (trapphull) {
    const underkant = H - dekkeTykkelse;
    const fri = trapphull.friHoyde ?? trapphull.krav;
    const gang = underkant - fri;
    const yHull = H + kant * 1.2;
    const lengde = lop - hullKant;
    const forKort = trapphull.friHoyde !== null && trapphull.friHoyde < trapphull.krav - 1e-6;
    deler.push(`<g class="t-hull" stroke="var(--tekst)" stroke-width="${strek}">`
      + `<line x1="${hullKant}" y1="${Y(yHull)}" x2="${lop}" y2="${Y(yHull)}"/>`
      + `<line x1="${hullKant}" y1="${Y(yHull) - pil}" x2="${hullKant}" y2="${Y(H)}"/>`
      + `<line x1="${lop}" y1="${Y(yHull) - pil}" x2="${lop}" y2="${Y(H)}"/></g>`);
    deler.push(`<text x="${(hullKant + lop) / 2}" y="${Y(yHull) - skrift * 0.35}" font-size="${skrift * 0.9}" text-anchor="middle" `
      + `fill="var(--tekst)">${trapphull.kant === null ? `Trapphull minst ${mm(lengde)} mm` : `Trapphull ${mm(lengde)} mm`}</text>`);
    deler.push(`<line class="t-fri" x1="${hullKant}" y1="${Y(gang)}" x2="${hullKant}" y2="${Y(underkant)}" `
      + `stroke="${forKort ? 'var(--feil-tekst)' : 'var(--bakoy-oransje)'}" stroke-width="${strek * 2}" stroke-dasharray="${skrift * 0.3}"/>`);
    deler.push(`<text x="${hullKant + skrift * 0.4}" y="${Y((gang + underkant) / 2)}" font-size="${skrift * 0.9}" text-anchor="start" `
      + `fill="${forKort ? 'var(--feil-tekst)' : 'var(--tekst)'}" paint-order="stroke" stroke="var(--hvit)" stroke-width="${skrift * 0.2}">`
      + `Fri høyde ${mm(fri)}</text>`);
  }

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
  const yEnde = W + skrift * 1.1;            // målet fra enden av bordet til spiss 0
  const yUnder = W + skrift * 2.9;           // lengden på emnet

  const deler = [emneOgVange(vange, W, strek, skrift * 0.4)];
  for (const merke of vange.merker) {
    // Spiss 0 oransje, hjelpespissen for øverste hakk grå og stiplet (den kappes bort)
    const farge = merke.hakk === 1 ? 'var(--bakoy-oransje)' : merke.hjelp ? 'var(--tekst-gra)' : 'var(--tekst)';
    const u = merke.eksakt;
    deler.push(`<line class="v-merke" x1="${u}" y1="${merkeTopp}" x2="${u}" y2="${skrift * 0.4}" stroke="${farge}" stroke-width="${strek * 2}"`
      + `${merke.hjelp ? ` stroke-dasharray="${skrift * 0.2}"` : ''}/>`);
    const x = u + skrift * 0.35;
    const y = merkeTopp - skrift * 0.3;
    deler.push(`<text class="v-tall" x="${x}" y="${y}" font-size="${skrift}" text-anchor="start" `
      + `fill="${merke.hjelp ? 'var(--tekst-gra)' : 'var(--tekst)'}" font-weight="600" transform="rotate(-90 ${x} ${y})">${mm(merke.avstand)}</text>`);
  }
  const pil = skrift * 0.35;
  // Fra enden av bordet til spiss 0 (Kenny 2026-11-11): hjelpestreker ned fra enden og fra spiss 0
  deler.push(`<g class="v-ende" stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="${fra}" y1="${W}" x2="${fra}" y2="${yEnde + pil}" stroke-dasharray="${skrift * 0.2}"/>`
    + `<line x1="0" y1="0" x2="0" y2="${yEnde + pil}" stroke-dasharray="${skrift * 0.2}"/>`
    + `<line x1="${fra}" y1="${yEnde}" x2="0" y2="${yEnde}"/>`
    + `<line x1="${fra}" y1="${yEnde - pil}" x2="${fra}" y2="${yEnde + pil}"/>`
    + `<line x1="0" y1="${yEnde - pil}" x2="0" y2="${yEnde + pil}"/></g>`);
  deler.push(tekst(skrift * 0.4, yEnde + skrift * 0.35, skrift, `${mm(vange.spissFraEnden)} mm fra enden til spiss 0`,
    { anker: 'start', vekt: '600' }));
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
  const sisteSpiss = vange.merker.filter((m) => !m.hjelp).at(-1);
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

// Ett steg i «Se det steg for steg» (stegene lages av lagMerkesteg i trapp-merking.js).
// Før kapping vises hele bordet med det som er merket og tegnet så langt. Tegningen viser
// utsnittet der det skjer: venstre ende, spissen som merkes, hakket med vinkelen, bunnen eller
// toppen. Kapp viser hele vangen, og «reis» viser vangen bli reist opp i trappa med trinnene.
export function tegnMerkesteg(vange, l, steg, { vangeBredde = 223, nese = 20, trinnTykkelse = 28 } = {}) {
  const W = vangeBredde;
  const { s } = vange;
  const m = vange.hakk.length;
  const fra = -vange.spissFraEnden;
  const til = fra + vange.emnelengde;
  const rekkefolge = ['bord', 'spiss', 'hakk', 'bunn', 'topp', 'kapp', 'reis'];
  const forbi = (type) => rekkefolge.indexOf(steg.type) > rekkefolge.indexOf(type);
  const her = (type) => steg.type === type;

  if (her('reis')) return tegnReis(vange, l, { W, nese, trinnTykkelse, fra, til });

  // Utsnittet
  let uFra;
  let uTil;
  if (her('bord')) { uFra = fra - 0.25 * s; uTil = 1.5 * s; }
  else if (her('spiss')) { uFra = steg.nr * s - 1.45 * s; uTil = steg.nr * s + 0.55 * s; }
  else if (her('hakk')) { uFra = (steg.nr - 1) * s - 0.4 * s; uTil = steg.nr * s + 0.6 * s; }
  else if (her('bunn')) { uFra = fra - 0.25 * s; uTil = Math.max(vange.flatt.at(-1).u, s) + 0.45 * s; }
  else if (her('topp')) { uFra = (m - 1) * s - 0.3 * s; uTil = til + 0.3 * s; }
  else { uFra = fra - 0.1 * s; uTil = til + 0.1 * s; }
  const hele = her('kapp');
  const bredde = uTil - uFra;
  const f = hele ? Math.min(0.5 * s, 0.5 * W, 0.045 * bredde) : bredde * 0.042;
  const strek = f * 0.06;
  const vFra = -f * 4.3;
  const vTil = W + f * 1.8;

  const deler = [];
  if (hele) {
    deler.push(emneOgVange(vange, W, strek, f * 0.35));
  } else {
    // Bordet før kapping
    deler.push(`<rect class="m-bord" x="${fra}" y="0" width="${vange.emnelengde}" height="${W}" fill="var(--vange)" `
      + `stroke="var(--bord-kant)" stroke-width="${strek * 1.5}"/>`);
  }

  // Spissene som er merket så langt
  const antallSpisser = her('bord') ? 1 : her('spiss') ? steg.nr + 1 : vange.merker.length;
  vange.merker.slice(0, antallSpisser).forEach((merke, i) => {
    const naa = (her('spiss') && i === steg.nr) || (her('bord') && i === 0);
    const farge = i === 0 || naa ? 'var(--bakoy-oransje)' : merke.hjelp ? 'var(--tekst-gra)' : 'var(--tekst)';
    deler.push(`<line class="m-spiss" x1="${merke.eksakt}" y1="${-f * 0.9}" x2="${merke.eksakt}" y2="${f * 0.35}" `
      + `stroke="${farge}" stroke-width="${strek * (naa ? 5 : 3)}"${merke.hjelp ? ` stroke-dasharray="${f * 0.25}"` : ''}/>`);
    if (!hele) {
      deler.push(tekst(merke.eksakt, -f * 1.15, f * (naa ? 1.1 : 0.85), mm(merke.avstand),
        { vekt: naa ? '700' : '600', farge: merke.hjelp ? 'var(--tekst-gra)' : 'var(--tekst)' }));
    }
  });

  // Målet som tas akkurat nå: fra enden av bordet til spiss 0, eller fra spiss 0 til spissen
  const malLinje = (u1, u2, etikett) => {
    const y = -f * 2.6;
    deler.push(`<g class="m-mal" stroke="var(--tekst)" stroke-width="${strek * 1.5}">`
      + `<line x1="${u1}" y1="${y}" x2="${u2}" y2="${y}"/>`
      + `<line x1="${u1}" y1="${y - f * 0.3}" x2="${u1}" y2="${y + f * 0.3}"/>`
      + `<line x1="${u2}" y1="${y - f * 0.3}" x2="${u2}" y2="${y + f * 0.3}"/></g>`);
    const midt = Math.max((u1 + u2) / 2, uFra + f * 4);
    deler.push(`<text x="${midt}" y="${y - f * 0.35}" font-size="${f}" text-anchor="middle" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${etikett}</text>`);
  };
  if (her('bord')) malLinje(fra, 0, `${mm(vange.spissFraEnden)} mm`);
  if (her('spiss')) malLinje(0, vange.merker[steg.nr].eksakt, `${mm(vange.merker[steg.nr].avstand)} mm fra spiss 0`);

  // Hakkene som er tegnet så langt
  const antallHakk = her('hakk') ? steg.nr : forbi('hakk') ? m : 0;
  for (const hk of vange.hakk.slice(0, antallHakk)) {
    deler.push(`<polyline class="m-hakk" points="${hk.spiss.u},0 ${hk.hjorne.u},${hk.hjorne.v} ${hk.nesteSpiss.u},0" fill="none" `
      + `stroke="var(--bord-kant)" stroke-width="${strek * (her('hakk') && hk.nr === steg.nr ? 4 : 2.5)}" stroke-linejoin="round"/>`);
  }
  // Vinkelen på hakket som tegnes nå
  if (her('hakk')) {
    const hk = vange.hakk[steg.nr - 1];
    const lengre = (p, ekstra) => {
      const du = p.u - hk.hjorne.u;
      const dv = p.v - hk.hjorne.v;
      const lengde = Math.hypot(du, dv);
      return { u: hk.hjorne.u + (du * (lengde + ekstra)) / lengde, v: hk.hjorne.v + (dv * (lengde + ekstra)) / lengde };
    };
    const a1 = lengre(hk.spiss, 0.18 * s);
    const a2 = lengre(hk.nesteSpiss, 0.18 * s);
    deler.push(`<polyline class="m-vinkel" points="${a1.u},${a1.v} ${hk.hjorne.u},${hk.hjorne.v} ${a2.u},${a2.v}" fill="none" `
      + `stroke="var(--bakoy-oransje)" stroke-opacity="0.5" stroke-width="${f * 0.7}" stroke-linejoin="miter"/>`);
    const m1 = { u: (hk.spiss.u + hk.hjorne.u) / 2, v: (hk.spiss.v + hk.hjorne.v) / 2 };
    const m2 = { u: (hk.nesteSpiss.u + hk.hjorne.u) / 2, v: (hk.nesteSpiss.v + hk.hjorne.v) / 2 };
    deler.push(`<text x="${m1.u - f * 0.3}" y="${m1.v + f * 1.6}" font-size="${f}" text-anchor="middle" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(l.inntrinn, 1)}</text>`);
    deler.push(`<text x="${m2.u + f * 0.7}" y="${m2.v + f * 0.4}" font-size="${f}" text-anchor="start" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(l.opptrinn, 1)}</text>`);
  }

  // Bunn og topp
  const [foran, spiss0] = vange.flatt;
  const fot = vange.flatt.at(-1);
  const kuttTopp = vange.flatt.at(-3);
  const kuttBunn = vange.flatt.at(-2);
  if (her('bunn') || (forbi('bunn') && !hele)) {
    deler.push(`<polyline class="m-bunn" points="${spiss0.u},${spiss0.v} ${foran.u},${foran.v} ${fot.u},${fot.v}" fill="none" `
      + `stroke="var(--bord-kant)" stroke-width="${strek * (her('bunn') ? 4 : 2.5)}"/>`);
  }
  if (her('bunn')) {
    const mb = { u: (spiss0.u + foran.u) / 2, v: (spiss0.v + foran.v) / 2 };
    deler.push(`<text x="${mb.u - f * 0.4}" y="${mb.v + f * 0.3}" font-size="${f}" text-anchor="end" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(vange.nedersteOpptrinn, 1)}</text>`);
    deler.push(`<text x="${(foran.u + fot.u) / 2}" y="${Math.max(foran.v, fot.v) + f * 1.3}" font-size="${f}" text-anchor="middle" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(vange.fot)}</text>`);
  }
  if (her('topp') || (forbi('topp') && !hele)) {
    deler.push(`<line class="m-topp" x1="${kuttTopp.u}" y1="${kuttTopp.v}" x2="${kuttBunn.u}" y2="${kuttBunn.v}" `
      + `stroke="var(--bord-kant)" stroke-width="${strek * (her('topp') ? 4 : 2.5)}"/>`);
  }
  if (her('topp')) {
    deler.push(`<circle cx="${kuttTopp.u}" cy="${kuttTopp.v}" r="${f * 0.25}" fill="var(--bakoy-oransje)"/>`);
    deler.push(`<text x="${(kuttTopp.u + kuttBunn.u) / 2 - f * 0.5}" y="${(kuttTopp.v + kuttBunn.v) / 2 + f * 0.3}" font-size="${f}" text-anchor="end" fill="var(--tekst)" font-weight="600" ${STYRK} stroke-width="${f * 0.25}">${mm(vange.toppkutt.lengde)}</text>`);
  }

  return svg(uFra, vFra, bredde, vTil - vFra, `Merking av vangen: ${steg.type} ${steg.nr || ''}`.trim(), deler.join(''));
}

// Vangen reises: tegnes lagt flatt og dreies til den står som i trappa (CSS-animasjon med
// matrisen fra vange.reis). Trinnene og underlaget kommer fram når den står.
function tegnReis(vange, l, { W, nese, trinnTykkelse, fra, til }) {
  const { a, b, c, d, e, f: ff } = vange.reis;
  const h = l.opptrinn;
  const bi = l.inntrinn;
  const m = l.antallInntrinn;
  const eget = m === l.antallOpptrinn;
  const t = trinnTykkelse;

  // Plassen tegningen trenger: vangen lagt flatt, og vangen og trinnene der de står
  const xs = [fra, til, ...vange.omriss.map((p) => p.x), 0, (m - 1) * bi + bi + nese];
  const ys = [0, W, ...vange.omriss.map((p) => -p.y), -m * h];
  const storst = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const kant = storst * 0.05;
  const xMin = Math.min(...xs) - kant;
  const yMin = Math.min(...ys) - kant;
  const strek = storst * 0.002;

  const deler = [];
  deler.push(`<g class="reis" style="--reis: matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${ff})">`
    + `<polygon points="${vange.flatt.map(({ u, v }) => `${u},${v}`).join(' ')}" fill="var(--vange)" `
    + `stroke="var(--bord-kant)" stroke-width="${strek * 1.5}" stroke-linejoin="round"/></g>`);
  const trinn = [];
  for (let k = 1; k <= m; k++) {
    const dybde = eget && k === m ? bi : bi + nese;
    trinn.push(`<rect x="${(k - 1) * bi}" y="${-k * h}" width="${dybde}" height="${t}" fill="var(--trinn)" `
      + `stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
  }
  deler.push(`<g class="reis-trinn">${trinn.join('')}`
    + `<line x1="${xMin}" y1="0" x2="${Math.max(...xs) + kant}" y2="0" stroke="var(--tekst-gra)" stroke-width="${strek * 2.5}"/></g>`);

  return svg(xMin, yMin, Math.max(...xs) + kant - xMin, Math.max(...ys) + kant - yMin, 'Vangen reist i trappa med trinnene', deler.join(''));
}
