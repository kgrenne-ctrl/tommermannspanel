// Passer på at alle filene appen laster, har samme versjonsnummer. Ellers kan nettleseren
// blande en gammel, lagret fil med nye filer etter en oppdatering.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { finnModuler } from '../scripts/versjon.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const { versjon } = JSON.parse(readFileSync(new URL('../versjon.json', import.meta.url), 'utf8'));

test('Alle JavaScript-filer står i importkartet med samme versjon', () => {
  const kart = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  const moduler = finnModuler();
  assert.ok(moduler.length >= 9);
  for (const fil of moduler) {
    assert.equal(kart.imports[`./${fil}`], `./${fil}?v=${versjon}`,
      `${fil} mangler eller har feil versjon. Kjør: npm run versjon`);
  }
  assert.equal(Object.keys(kart.imports).length, moduler.length, 'importkartet har filer som ikke finnes');
});

test('Siden, stilfila og versjon.json har samme versjon', () => {
  assert.ok(html.includes(`window.APP_VERSJON = '${versjon}'`), 'APP_VERSJON stemmer ikke');
  assert.ok(html.includes(`css/stil.css?v=${versjon}`), 'stilfila har feil versjon');
  // Appen startes via importkartet, ikke direkte (da ville versjonen ikke blitt brukt)
  assert.ok(!/<script type="module" src=/.test(html), 'appen må startes med import, ikke src=');
});
