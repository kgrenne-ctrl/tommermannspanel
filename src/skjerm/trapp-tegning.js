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

export function tegnVangeFlatt(vange, { vangeBredde = 223 } = {}) {
  const W = vangeBredde;
  const fra = -vange.spissFraEnden;          // enden av emnet, i u
  const lengde = vange.emnelengde;
  const skrift = Math.max(lengde, 800) * 0.032;
  const strek = Math.max(lengde, 800) * 0.0018;
  const kant = skrift * 0.8;
  const yOver = -skrift * 2.4;               // tallene over overkanten
  const yUnder = W + skrift * 2.2;           // lengdemålet under

  const deler = [];
  // Emnet (bordet før kapping), stiplet
  deler.push(`<rect class="v-emne" x="${fra}" y="0" width="${lengde}" height="${W}" fill="var(--hvit)" `
    + `stroke="var(--kant)" stroke-width="${strek}" stroke-dasharray="${skrift * 0.4}"/>`);
  // Vangen slik den blir
  deler.push(`<polygon class="v-vange" points="${vange.flatt.map(({ u, v }) => `${u},${v}`).join(' ')}" `
    + `fill="var(--vange)" stroke="var(--bord-kant)" stroke-width="${strek * 1.5}" stroke-linejoin="round"/>`);

  // Merkene langs overkanten. 0 er oransje (nullpunktet), som i kledningsdelen.
  for (const merke of vange.merker) {
    const farge = merke.hakk === 1 ? 'var(--bakoy-oransje)' : 'var(--tekst)';
    deler.push(`<line class="v-merke" x1="${merke.eksakt}" y1="${-skrift * 0.9}" x2="${merke.eksakt}" y2="${skrift * 0.4}" `
      + `stroke="${farge}" stroke-width="${strek * 2}"/>`);
    deler.push(`<text x="${merke.eksakt}" y="${yOver + skrift}" font-size="${skrift}" text-anchor="middle" `
      + `fill="var(--tekst)" font-weight="600">${mm(merke.avstand)}</text>`);
  }
  // Mål: emnelengden under, vangebredden til venstre
  const pil = skrift * 0.35;
  deler.push(`<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="${fra}" y1="${yUnder}" x2="${fra + lengde}" y2="${yUnder}"/>`
    + `<line x1="${fra}" y1="${yUnder - pil}" x2="${fra}" y2="${yUnder + pil}"/>`
    + `<line x1="${fra + lengde}" y1="${yUnder - pil}" x2="${fra + lengde}" y2="${yUnder + pil}"/>`
    + '</g>');
  deler.push(`<text x="${fra + lengde / 2}" y="${yUnder + skrift * 1.3}" font-size="${skrift}" text-anchor="middle" `
    + `fill="var(--tekst)">Emne minst ${mm(lengde)} mm</text>`);
  deler.push(`<text x="${fra - kant}" y="${W / 2}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)" `
    + `transform="rotate(-90 ${fra - kant} ${W / 2})">${mm(W)}</text>`);

  const xMin = fra - kant * 2.2;
  const xMaks = fra + lengde + kant;
  const yMin = yOver - skrift * 0.2;
  const yMaks = yUnder + skrift * 1.8;
  return `<svg class="tegning" viewBox="${xMin} ${yMin} ${xMaks - xMin} ${yMaks - yMin}" xmlns="http://www.w3.org/2000/svg" role="img" `
    + `aria-label="Vangen lagt flatt med ${vange.merker.length} hakk">`
    + deler.join('')
    + '</svg>';
}
