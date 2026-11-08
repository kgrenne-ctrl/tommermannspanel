// Tester for hjelpefilene til skjermen (tallformat og tegning). Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lesTall, mm } from '../src/skjerm/format.js';
import { tegnFelt } from '../src/skjerm/tegning.js';
import { losFelt } from '../src/tommermann/solver.js';

const tell = (tekst, bit) => tekst.split(bit).length - 1;

test('lesTall forstår komma, mellomrom og tomt felt', () => {
  assert.equal(lesTall('1350'), 1350);
  assert.equal(lesTall('92,4'), 92.4);
  assert.equal(lesTall(' 1 350 '), 1350);
  assert.equal(lesTall(''), null);
  assert.equal(lesTall('abc'), null);
});

test('mm skriver desimalkomma og runder av', () => {
  assert.equal(mm(92.4, 1), '92,4');
  assert.equal(mm(27.8333, 1), '27,8');
  assert.equal(mm(240.4), '240');
});

test('Tegningen har alle bordene, i begge visningene', () => {
  // NDLA: 6 underliggere og 5 overliggere, tegnet både forfra og i snitt
  const l = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  const svg = tegnFelt(l);
  assert.ok(svg.startsWith('<svg'));
  assert.equal(tell(svg, 'data-bord="u"'), 12);
  assert.equal(tell(svg, 'data-bord="o"'), 10);
  assert.equal(tell(svg, 'data-underlag'), 0);
});

test('Tegningen markerer underlag i kanter med overligger', () => {
  const l = losFelt({ L: 1266, bu: 98, bo: 98, start: 'O', slutt: 'O' }).valgt;
  assert.equal(tell(tegnFelt(l), 'data-underlag'), 2);
});

test('Veggtegningen har åpningene og markerer felt som ikke går opp', async () => {
  const { tegnVegg } = await import('../src/skjerm/tegning.js');
  const { losVegg } = await import('../src/tommermann/vegg.js');
  const r = losVegg({ lengde: 6000, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 },
  ] });
  const svg = tegnVegg(r);
  assert.equal(tell(svg, 'data-apning='), 2);
  assert.equal(tell(svg, 'data-feil='), 1); // feltet mellom vinduet og porten
  const feilFelt = r.felt.find((f) => !f.ok);
  assert.ok(feilFelt.x1 - feilFelt.x0 > 400, 'feltet som ikke går opp skal ha bredde i tegningen');
  const antallBord = r.felt.filter((f) => f.ok)
    .reduce((sum, f) => sum + f.underliggere.length + f.overliggere.length, 0);
  assert.equal(tell(svg, 'data-bord='), antallBord);
});
