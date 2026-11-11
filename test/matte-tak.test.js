// Tester for regnemodellen for fall og tak i Matte (src/matte/tak.js). Kjøres med: npm test
// Kontrolleksempelet i PLAN-matte.md punkt 4 er første test og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regnFall, KJENT_FALL } from '../src/matte/tak.js';

const naer = (faktisk, ventet, toleranse, tekst) =>
  assert.ok(Math.abs(faktisk - ventet) <= toleranse, `${tekst}: fikk ${faktisk}, ventet ${ventet}`);

test('Kontrolleksempel (PLAN-matte.md punkt 4): 1:50, 22° og målt 35 mm på 2400 mm', () => {
  // 1:50 = 2,0 % = 20 mm/m = 1,1°, og 48 mm på 2400 mm
  const a = regnFall({ kjent: 'forhold', verdi: 50, lengde: 2400 });
  assert.equal(a.ok, true);
  naer(a.prosent, 2.0, 1e-9, 'prosent');
  naer(a.mmPerMeter, 20, 1e-9, 'mm per meter');
  naer(a.grader, 1.1458, 0.0001, 'grader');
  naer(a.hoydeforskjell, 48, 1e-9, 'høydeforskjell');

  // 22° = 40,4 % = 1:2,48 = 404 mm/m
  const b = regnFall({ kjent: 'grader', verdi: 22 });
  naer(b.prosent, 40.40, 0.005, 'prosent');
  naer(b.forhold, 2.475, 0.0005, 'forhold');
  naer(b.mmPerMeter, 404.0, 0.05, 'mm per meter');
  assert.equal(b.hoydeforskjell, null);

  // Målt 35 mm på 2400 mm = 1:68,6
  const c = regnFall({ kjent: 'malt', hoyde: 35, lengde: 2400 });
  naer(c.forhold, 68.571, 0.001, 'forhold');
  assert.equal(c.hoydeforskjell, 35);
  assert.equal(c.lengde, 2400);
});

test('Omregning fram og tilbake gir samme fall fra alle fire utgangspunkt', () => {
  const start = regnFall({ kjent: 'grader', verdi: 27.5 });
  for (const [kjent, verdi] of [['prosent', start.prosent], ['forhold', start.forhold], ['mmPerMeter', start.mmPerMeter]]) {
    const r = regnFall({ kjent, verdi });
    naer(r.grader, 27.5, 1e-9, kjent);
  }
});

test('Prosent og mm per meter: 2 % er 20 mm per meter og 1:50', () => {
  naer(regnFall({ kjent: 'prosent', verdi: 2 }).forhold, 50, 1e-9, 'fra prosent');
  naer(regnFall({ kjent: 'mmPerMeter', verdi: 20 }).forhold, 50, 1e-9, 'fra mm per meter');
});

test('Ingen fall: 0 gir flatt (forhold uendelig) uten feil', () => {
  const r = regnFall({ kjent: 'prosent', verdi: 0, lengde: 3000 });
  assert.equal(r.ok, true);
  assert.equal(r.grader, 0);
  assert.equal(r.forhold, Infinity);
  assert.equal(r.hoydeforskjell, 0);
  assert.deepEqual(r.varsler, []);
});

test('Umulige mål gir beskjed og aldri NaN', () => {
  const feil = [
    { kjent: 'grader', verdi: 90 },
    { kjent: 'grader', verdi: -2 },
    { kjent: 'forhold', verdi: 0 },
    { kjent: 'prosent', verdi: null },
    { kjent: 'malt', hoyde: 20, lengde: 0 },
    { kjent: 'malt', hoyde: -1, lengde: 1000 },
    { kjent: 'malt', hoyde: 20, lengde: null },
    { kjent: 'forhold', verdi: 50, lengde: -100 },
  ];
  for (const inn of feil) {
    const r = regnFall(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => typeof t === 'string' && !t.includes('NaN')));
  }
});

test('Fall til sluk: «greit å vite» med kilde på slakt fall, ikke på tak', () => {
  const gulv = regnFall({ kjent: 'forhold', verdi: 50 });
  assert.equal(gulv.varsler.length, 1);
  assert.equal(gulv.varsler[0].niva, 'vite');
  assert.equal(gulv.varsler[0].kilde, 'TEK17 § 13-15');
  assert.ok(!gulv.varsler[0].tekst.includes('\u2014'));
  assert.deepEqual(regnFall({ kjent: 'grader', verdi: 22 }).varsler, []);
});

test('Alle valg for hva som er kjent, er med', () => {
  assert.deepEqual([...KJENT_FALL], ['grader', 'prosent', 'forhold', 'mmPerMeter', 'malt']);
});
