// Setter nytt versjonsnummer på alle filene appen laster, så nettleseren aldri bruker en
// gammel, lagret fil etter en oppdatering. Kjøres automatisk ved hver commit (.githooks).
// Manuelt: npm run versjon
//
// Det skrives tre steder:
//  - index.html: importkartet (lista over JavaScript-filer med ?v=nummer), stilfila og
//    APP_VERSJON
//  - versjon.json: nyeste nummer, som appen sjekker ved oppstart

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(fileURLToPath(import.meta.url), '..', '..');

export function finnModuler(mappe = join(rot, 'src')) {
  const ut = [];
  for (const navn of readdirSync(mappe).sort()) {
    const sti = join(mappe, navn);
    if (statSync(sti).isDirectory()) ut.push(...finnModuler(sti));
    else if (navn.endsWith('.js')) ut.push(relative(rot, sti).split('\\').join('/'));
  }
  return ut;
}

export function lagVersjon(dato = new Date()) {
  const p = (t) => String(t).padStart(2, '0');
  return `${dato.getFullYear()}${p(dato.getMonth() + 1)}${p(dato.getDate())}-${p(dato.getHours())}${p(dato.getMinutes())}${p(dato.getSeconds())}`;
}

function settVersjon(versjon) {
  const stiHtml = join(rot, 'index.html');
  let html = readFileSync(stiHtml, 'utf8');
  const kart = { imports: Object.fromEntries(finnModuler().map((f) => [`./${f}`, `./${f}?v=${versjon}`])) };
  const blokk = `<!-- versjon:start (settes av scripts/versjon.mjs, ikke rediger for hånd) -->
  <script>window.APP_VERSJON = '${versjon}';</script>
  <script type="importmap">
${JSON.stringify(kart, null, 2).split('\n').map((l) => `  ${l}`).join('\n')}
  </script>
  <link rel="stylesheet" href="css/stil.css?v=${versjon}">
  <!-- versjon:slutt -->`;
  const monster = /<!-- versjon:start[\s\S]*?<!-- versjon:slutt -->/;
  if (!monster.test(html)) throw new Error('Fant ikke versjon:start/versjon:slutt i index.html');
  html = html.replace(monster, blokk);
  writeFileSync(stiHtml, html);
  writeFileSync(join(rot, 'versjon.json'), `${JSON.stringify({ versjon }, null, 2)}\n`);
  console.log(`Versjon ${versjon}: ${finnModuler().length} filer i importkartet.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  settVersjon(lagVersjon());
}
