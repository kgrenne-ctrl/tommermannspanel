// Tester for regnemodellen for fall og tak i Matte (src/matte/tak.js). Kjøres med: npm test
// Kontrolleksempelet i PLAN-matte.md punkt 4 er første test og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regnFall, KJENT_FALL, regnTrekant, KJENT_TREKANT, regnOppforing } from '../src/matte/tak.js';

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

// ---------- Trekanten (fase M1) ----------

test('Kontrolleksempel trekant (PLAN-matte.md punkt 4): 3000 og 4000 gir skrå 5000 og 53,13°', () => {
  const r = regnTrekant({ kjent: 'liggendeStaende', liggende: 3000, staende: 4000 });
  assert.equal(r.ok, true);
  naer(r.skra, 5000, 1e-9, 'skrå');
  naer(r.vinkel, 53.1301, 0.0001, 'vinkel');
  naer(r.vinkelTopp, 36.8699, 0.0001, 'vinkel oppe');
  // Stag mot liggende: saga på 90 − v. Mot stående: saga på v.
  naer(r.sagMotLiggende, 36.8699, 0.0001, 'saga mot liggende');
  naer(r.sagMotStaende, 53.1301, 0.0001, 'saga mot stående');
});

test('Trekanten går opp fra alle seks kombinasjoner av to kjente', () => {
  const fasit = { liggende: 3000, staende: 4000, skra: 5000, vinkel: Math.atan2(4000, 3000) * 180 / Math.PI };
  for (const kjent of KJENT_TREKANT) {
    const r = regnTrekant({ kjent, ...fasit });
    assert.equal(r.ok, true, kjent);
    for (const navn of ['liggende', 'staende', 'skra', 'vinkel']) naer(r[navn], fasit[navn], 1e-6, `${kjent}.${navn}`);
  }
  // 3-4-5 har 53,1° på saga mot stående, over 45°: «greit å vite» om at saga kanskje ikke går så langt
  assert.equal(regnTrekant({ kjent: 'liggendeStaende', liggende: 3000, staende: 4000 }).varsler[0].type, 'sag-vinkel');
  assert.deepEqual(regnTrekant({ kjent: 'liggendeVinkel', liggende: 3000, vinkel: 45 }).varsler, []);
  const tretti = regnTrekant({ kjent: 'skraVinkel', skra: 2000, vinkel: 30 });
  naer(tretti.staende, 1000, 1e-9, 'stående ved 30°');
  naer(tretti.liggende, 1732.05, 0.01, 'liggende ved 30°');
});

test('Trekanten: umulige mål gir beskjed og aldri NaN', () => {
  const feil = [
    { kjent: 'liggendeSkra', liggende: 3000, skra: 3000 },
    { kjent: 'staendeSkra', staende: 5000, skra: 4000 },
    { kjent: 'liggendeVinkel', liggende: 3000, vinkel: 90 },
    { kjent: 'skraVinkel', skra: 3000, vinkel: 0 },
    { kjent: 'liggendeStaende', liggende: 0, staende: 4000 },
    { kjent: 'liggendeStaende', liggende: 3000, staende: null },
    { kjent: 'ukjent', liggende: 3000, staende: 4000 },
  ];
  for (const inn of feil) {
    const r = regnTrekant(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => !t.includes('NaN')));
  }
});

// ---------- Kiler og oppforing (fase M1) ----------

test('Kontrolleksempel oppforing (PLAN-matte.md punkt 4): 2 % over 3000, c/c 600, 10 mm i lav ende', () => {
  const r = regnOppforing({ kjent: 'prosent', verdi: 2, lengde: 3000, cc: 600, start: 10 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.punkter.map((p) => p.avstand), [0, 600, 1200, 1800, 2400, 3000]);
  r.punkter.forEach((p, i) => naer(p.hoyde, [10, 22, 34, 46, 58, 70][i], 1e-9, `punkt ${i + 1}`));
  naer(r.hoydeEnde, 70, 1e-9, 'høy ende');
  naer(r.okningPerCc, 12, 1e-9, 'økning per c/c');
});

test('Oppforing: siste punkt er alltid enden, og hver høyde regnes fra starten', () => {
  const r = regnOppforing({ kjent: 'forhold', verdi: 60, lengde: 2000, cc: 600 });
  assert.deepEqual(r.punkter.map((p) => p.avstand), [0, 600, 1200, 1800, 2000]);
  naer(r.punkter.at(-1).hoyde, 2000 / 60, 1e-9, 'enden');
  assert.equal(r.start, 0);
  // Lengden går opp i c/c: ingen dobbel ende
  assert.equal(regnOppforing({ kjent: 'prosent', verdi: 1, lengde: 1800, cc: 600 }).punkter.length, 4);
  // C/c lengre enn lengden: bare start og ende
  assert.equal(regnOppforing({ kjent: 'prosent', verdi: 1, lengde: 500, cc: 600 }).punkter.length, 2);
  // Desimaler i c/c skal ikke gi et ekstra punkt like før enden
  assert.equal(regnOppforing({ kjent: 'prosent', verdi: 1, lengde: 1000, cc: 100 / 3 }).punkter.length, 31);
});

test('Oppforing: umulige mål gir beskjed og aldri NaN', () => {
  const feil = [
    { kjent: 'prosent', verdi: 2, lengde: 0, cc: 600 },
    { kjent: 'prosent', verdi: 2, lengde: 3000, cc: 0 },
    { kjent: 'prosent', verdi: 2, lengde: 3000, cc: 600, start: -5 },
    { kjent: 'prosent', verdi: 2, lengde: 300000, cc: 0.6 },
    { kjent: 'grader', verdi: 95, lengde: 3000, cc: 600 },
    { kjent: 'malt', verdi: 2, lengde: 3000, cc: 600 },
  ];
  for (const inn of feil) {
    const r = regnOppforing(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => !t.includes('NaN')));
  }
});
