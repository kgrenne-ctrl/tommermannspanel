// Tester for regnemodellen for vinkler og diagonaler i Matte (src/matte/vinkel.js). Kjøres med: npm test
// Kontrolleksempelet i PLAN-matte.md punkt 4 er første test og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regnDiagonal } from '../src/matte/vinkel.js';

const naer = (faktisk, ventet, toleranse, tekst) =>
  assert.ok(Math.abs(faktisk - ventet) <= toleranse, `${tekst}: fikk ${faktisk}, ventet ${ventet}`);

test('Kontrolleksempel (PLAN-matte.md punkt 4): 8000 × 6000 gir 10 000, og 10 016 og 9984 er 20 mm skjevt', () => {
  const r = regnDiagonal({ a: 8000, b: 6000, d1: 10016, d2: 9984 });
  assert.equal(r.ok, true);
  naer(r.diagonal, 10000, 1e-9, 'diagonal');
  naer(r.skjevhet, 20, 1e-9, 'skjevhet');
  naer(r.avvik1, 16, 1e-9, 'avvik diagonal 1');
  naer(r.avvik2, -16, 1e-9, 'avvik diagonal 2');
  assert.deepEqual(r.trekant, { faktor: 2000, kort: 6000, lang: 8000, skra: 10000, kortSide: 'b' });
});

test('Skjevhet: rekkefølgen på diagonalene spiller ingen rolle, og like diagonaler er rett', () => {
  naer(regnDiagonal({ a: 8000, b: 6000, d1: 9984, d2: 10016 }).skjevhet, 20, 1e-9, 'byttet om');
  assert.equal(regnDiagonal({ a: 8000, b: 6000, d1: 10000, d2: 10000 }).skjevhet, 0);
  // Et parallellogram med kjent skjevhet gir den tilbake
  const a = 5000; const b = 3000; const s = 12;
  const d1 = Math.hypot(a + s, b); const d2 = Math.hypot(a - s, b);
  naer(regnDiagonal({ a, b, d1, d2 }).skjevhet, s, 1e-9, 'parallellogram');
});

test('Uten to diagonaler: ingen skjevhet, men avvik på den ene som er målt', () => {
  const ingen = regnDiagonal({ a: 8000, b: 6000 });
  assert.equal(ingen.skjevhet, null);
  assert.equal(ingen.avvik1, null);
  assert.deepEqual(ingen.varsler, []);
  const en = regnDiagonal({ a: 8000, b: 6000, d1: 10010 });
  assert.equal(en.skjevhet, null);
  naer(en.avvik1, 10, 1e-9, 'avvik');
});

test('3-4-5-trekanten: største med hele 100 mm som får plass, og ingen når sidene er for korte', () => {
  assert.deepEqual(regnDiagonal({ a: 2500, b: 4100 }).trekant, { faktor: 800, kort: 2400, lang: 3200, skra: 4000, kortSide: 'a' });
  assert.equal(regnDiagonal({ a: 250, b: 300 }).trekant, null);
});

test('Diagonal: umulige mål gir beskjed og aldri NaN', () => {
  for (const inn of [{ a: 0, b: 6000 }, { a: 8000, b: null }, { a: -1, b: 6000 }, { a: 8000, b: 6000, d1: 0 }]) {
    const r = regnDiagonal(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => !t.includes('NaN')));
  }
});
