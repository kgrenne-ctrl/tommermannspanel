// Tester for forsiden i index.html: ett kort per verktøy med symbol og tekst, og at ingen
// verktøy vises før verktoy.js har lest adressen. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const forside = html.slice(html.indexOf('<section id="forside"'), html.indexOf('</section>', html.indexOf('<section id="forside"')));

test('Forsiden har ett kort per verktøy, med lenke, symbol, navn og beskrivelse', () => {
  for (const [navn, tittel] of [['kledning', 'Kledning'], ['trapp', 'Trapp'], ['matte', 'Matte']]) {
    const start = forside.indexOf(`href="#${navn}"`);
    assert.ok(start > 0, `mangler kort for ${navn}`);
    const kort = forside.slice(start, forside.indexOf('</a>', start));
    assert.ok(kort.includes('class="forside-ikon"') && kort.includes('<svg'), `${navn}: mangler symbol`);
    assert.ok(kort.includes(`<strong>${tittel}</strong>`), `${navn}: mangler navn`);
    assert.ok(kort.includes('class="forside-merke"'), `${navn}: mangler merket «Sist brukt»`);
  }
});

test('Verktøyene og bryteren er skjult til adressen sier hvilket verktøy som skal vises', () => {
  for (const id of ['kledning-del', 'trapp-del', 'matte-del', 'verktoyrad']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*\\shidden`), `${id} skal ha hidden fra start`);
  }
  // Logoen og hjemknappen går til forsiden
  assert.ok(html.includes('class="topp-hjem" href="#"'));
  assert.ok(html.includes('class="hjemknapp" href="#"'));
  assert.ok(!forside.includes('\u2014'));
});
