// Tester for utskriften av trappa og innlasting av data (src/skjerm/trapp-utskrift.js).
// Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { lagTrappMaterialer } from '../src/trapp/materialer.js';
import { lagTrappUtskrift, lesTrappdata } from '../src/skjerm/trapp-utskrift.js';
import { EKSEMPELTRAPP } from '../src/skjerm/eksempel.js';

const tell = (tekst, bit) => tekst.split(bit).length - 1;
const TILSTAND = { type: 'utvendig', hoyde: '850', ovre: 'dekke', bredde: '1000', lengdevalg: 'trinn',
  antall: '2', bordbredde: '145', spalte: '5', nese: '20', lengde: '', innstillinger: { vangeBredde: '223' } };

function utskrift() {
  const d = EKSEMPELTRAPP;
  const l = losTrapp(d).valgt;
  const valg = { nese: 20, trinnTykkelse: 28, vangeBredde: 223, vangeTykkelse: 48, beleggNede: 0 };
  const vange = lagVange(l, valg);
  const liste = lagTrappMaterialer({ l, vange, bredde: 1000, trinnbord: d.trinnbord, trinnTykkelse: 28 });
  return lagTrappUtskrift({ tilstand: TILSTAND, d, l, vange, valg, liste, versjon: 'test', dato: new Date(2026, 10, 11) });
}

test('Utskriften har trappa, vangen med skisser, materialene og dataene', () => {
  const html = utskrift();
  for (const t of ['<h1>Trapp</h1>', '11.11.2026', '<h2>Inndata</h2>', '<h2>Kontroll</h2>', 'Trappa sett fra siden',
    '<h2>Merking av vangen</h2>', 'Merk spissene', 'Tegn toppen', '<h2>Materialer</h2>', 'class="tu-nr">5<',
    'Kappliste', '3 stk, hver minst 1 418 mm', 'Data for å gjenskape eksempelet']) {
    assert.ok(html.includes(t) || html.includes(t.replace(' ', ' ')), `mangler ${t}`);
  }
  // Sideriss, vangen lagt flatt og de tre skissene
  assert.equal(tell(html, '<svg'), 5);
  assert.ok(!html.includes('NaN') && !html.includes('undefined'));
  assert.ok(!html.includes('\u2014'));
});

test('Dataene i utskriften kan lastes inn igjen og gir samme skjema', () => {
  const html = utskrift();
  const json = html.match(/<pre>([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  assert.deepEqual(lesTrappdata(json), TILSTAND);
});

test('Feil data gir forklaring på norsk', () => {
  assert.throws(() => lesTrappdata('ikke json'), /ikke gyldige data/);
  assert.throws(() => lesTrappdata('{"app":"tommermannspanel","hus":{"vegger":[{}]}}'), /ikke data for en trapp/);
});
