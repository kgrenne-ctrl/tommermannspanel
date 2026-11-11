// Tegner trappa sett fra siden som SVG ut fra en løsning fra src/trapp/solver.js.
// Ingen regning av trappa her, bare tegning. Alle mål i mm, i riktig målestokk.
//
// Trappa går opp mot høyre. x = 0 er forkant av nederste trinn, y = 0 er ferdig underlag.
// I SVG går y nedover, så høyder tegnes som topp − y.
//
// Vangen er tegnet forenklet (fase T2): hakk under hvert trinn og rett underkant, med
// vangebredden som er satt. Kutt i topp og bunn og merkene kommer i fase T3.

import { mm } from './format.js';

export function tegnTrapp(l, { nese = 20, trinnTykkelse = 28, vangeBredde = 223, ovreTrinn = 'dekke' } = {}) {
  const h = l.opptrinn;
  const b = l.inntrinn;
  const H = l.opptrinn * l.antallOpptrinn;
  const m = l.antallInntrinn;
  const lop = l.lopslengde;
  const t = trinnTykkelse;

  const storst = Math.max(H, lop, 800);
  const skrift = storst * 0.05;
  const strek = storst * 0.0022;
  const kant = storst * 0.06;
  const dekkeLengde = Math.max(400, lop * 0.3);
  const dekkeTykkelse = Math.min(200, H * 0.25);

  // Utsnitt: fra litt foran nederste trinn til litt inn på dekket, fra under bakken til over dekket
  const xMin = -kant * 2.2;                 // plass til høydemålet til venstre
  const xMaks = lop + dekkeLengde;
  const yTopp = H + kant;                    // øverste kant i mm over underlaget
  const yBunn = -kant * 2;                   // plass til lengdemålet under
  const Y = (y) => yTopp - y;                // mm over underlaget -> SVG y

  const deler = [];

  // Vangen, forenklet. Riss: hakket for trinn k har loddrett flate i xk = (k−1)·b + nese
  // og vannrett flate under trinnet i yk = k·h − t.
  const xk = (k) => (k - 1) * b + nese;
  const yk = (k) => k * h - t;
  const s = Math.hypot(h, b);
  // Underkanten er parallell med linja gjennom hakkspissene, vangebredden lenger ned
  const underkant = (x) => (h / b) * (x - nese) + h - t - vangeBredde * s / b;
  const xBakke = nese + (b / h) * (vangeBredde * s / b - h + t);
  const xSlutt = xk(m + 1);
  const punkter = [[xk(1), 0]];
  for (let k = 1; k <= m; k++) punkter.push([xk(k), yk(k)], [xk(k + 1), yk(k)]);
  punkter.push([xSlutt, underkant(xSlutt)], [Math.max(xBakke, xk(1)), 0]);
  deler.push(`<polygon class="t-vange" points="${punkter.map(([x, y]) => `${x},${Y(y)}`).join(' ')}" `
    + `fill="var(--vange)" stroke="var(--bord-kant)" stroke-width="${strek}" stroke-linejoin="round"/>`);

  // Dekket oppe: fra forkant av dekket og innover
  deler.push(`<rect class="t-dekke" x="${lop}" y="${Y(H)}" width="${dekkeLengde}" height="${dekkeTykkelse}" `
    + `fill="var(--dekke)" stroke="var(--tekst-gra)" stroke-width="${strek}"/>`);
  deler.push(`<text x="${lop + dekkeLengde / 2}" y="${Y(H) + dekkeTykkelse / 2 + skrift * 0.35}" font-size="${skrift}" `
    + 'text-anchor="middle" fill="var(--tekst)">Dekke</text>');

  // Trinnene. Trinnet stikker nesa ut foran hakket. Øverste trinn med eget trinn slutter mot dekket.
  for (let k = 1; k <= m; k++) {
    const fra = (k - 1) * b;
    const dybde = ovreTrinn === 'eget' && k === m ? b : b + nese;
    deler.push(`<rect class="t-trinn" x="${fra}" y="${Y(k * h)}" width="${dybde}" height="${t}" `
      + `fill="var(--trinn)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    deler.push(`<text x="${fra + dybde / 2}" y="${Y(k * h) - skrift * 0.35}" font-size="${skrift * 0.8}" `
      + `text-anchor="middle" fill="var(--tekst-gra)">${k}</text>`);
  }

  // Underlaget
  deler.push(`<line x1="${xMin}" y1="${Y(0)}" x2="${xMaks}" y2="${Y(0)}" stroke="var(--tekst-gra)" stroke-width="${strek * 2.5}"/>`);

  // Mål: høyden til venstre, løpslengden under
  const pil = skrift * 0.35;
  const xH = -kant * 1.2;
  const yL = -kant * 0.9;
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

  const bredde = xMaks - xMin;
  const hoyde = yTopp - yBunn;
  return `<svg class="tegning" viewBox="${xMin} 0 ${bredde} ${hoyde}" xmlns="http://www.w3.org/2000/svg" role="img" `
    + `aria-label="Trappa sett fra siden, ${l.antallOpptrinn} opptrinn à ${mm(h, 1)} mm og ${m} trinn">`
    + deler.join('')
    + '</svg>';
}
