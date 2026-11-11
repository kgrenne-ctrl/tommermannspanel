// Tester for uttatt vange (src/trapp/vange.js). Kjøres med: npm test
// Tallene i kontrolleksempel 1 er håndregnet i PLAN-trapp.md punkt 4.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';

const omtrent = (faktisk, forventet, toleranse = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= toleranse, `${faktisk} skulle vært ${forventet}`);

const EKSEMPEL_1 = { hoyde: 850, lengdevalg: 'trinn', trinnbord: { antall: 2, bredde: 145, spalte: 5 },
  nese: 20, ovreTrinn: 'dekke', type: 'utvendig' };
const VALG = { nese: 20, trinnTykkelse: 28, vangeBredde: 223 };
const l1 = losTrapp(EKSEMPEL_1).valgt;

test('Kontrolleksempel 1: vange 48 × 223 med trinn på 28 mm', () => {
  const v = lagVange(l1, VALG);
  assert.equal(v.ok, true);
  omtrent(v.s, 323.3);
  omtrent(v.hakkDybde, 144.6);
  omtrent(v.resthoyde, 78.4);
  // Nederste opptrinn i vangen er kortere med trinntykkelsen
  omtrent(v.nedersteOpptrinn, 142);
  // Fire spisser pluss én hjelpespiss for å tegne øverste hakk med vinkelen
  assert.deepEqual(v.merker.map((m) => m.avstand), [0, 323, 647, 970, 1293]);
  assert.deepEqual(v.merker.map((m) => m.hjelp), [false, false, false, false, true]);
  // Toppkuttet starter i innerste hjørne i øverste hakk
  assert.equal(v.toppkutt.foranBakkant, 0);
  omtrent(v.toppkutt.lengde, 92.2);
  omtrent(v.fot, 194.4);
  // Bordet må rekke til hjelpespissen: 74,7 + 1293,2 = 1367,9
  assert.equal(v.emnelengde, 1368);
  omtrent(v.spissFraEnden, 74.7);
  assert.deepEqual(v.varsler, []);
});

test('Vange 48 × 198: resthøyde 53,4 mm', () => {
  omtrent(lagVange(l1, { ...VALG, vangeBredde: 198 }).resthoyde, 53.4);
});

test('Omrisset følger trinnene: setene ligger i underkant trinn, med nesa foran', () => {
  const v = lagVange(l1, VALG);
  // Fra nederst foran: bunn, spiss 1, så sete og opptrinn for hvert trinn
  assert.deepEqual(v.omriss.slice(0, 4).map(({ x, y }) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]),
    [[20, 0], [20, 142], [295, 142], [295, 312]]);
  // Setene: underkant trinn k = k·170 − 28
  const seter = [...new Set(v.omriss.slice(1, -2).map((p) => Math.round(p.y * 10) / 10))];
  assert.deepEqual(seter, [142, 312, 482, 652]);
  // Toppkuttet står loddrett i bakkant av øverste hakk, x = 4 · 275 + 20
  const [topp, bunnTopp] = v.omriss.slice(-3, -1);
  omtrent(topp.x, 1120);
  omtrent(bunnTopp.x, 1120);
});

test('Lagt flatt: spissene ligger på overkanten (v = 0), underkanten er vangebredden inn', () => {
  const v = lagVange(l1, VALG);
  const spisser = v.flatt.filter((p, i) => i >= 1 && i < v.flatt.length - 2 && Math.abs(p.v) < 1e-6);
  // Spissene på vangen er de fire første merkene (den femte er hjelpespissen som kappes bort)
  assert.deepEqual(spisser.map((p) => Math.round(p.u)), [0, 323, 647, 970]);
  for (const p of v.flatt) assert.ok(p.v >= -1e-6 && p.v <= 223 + 1e-6, `punkt utenfor bordet: v = ${p.v}`);
  // Innerste vinkel i hakket ligger hakkdybden inn
  const innerst = v.flatt.filter((p) => Math.abs(p.v - v.hakkDybde) < 1e-6);
  assert.equal(innerst.length, 4);
});

test('Belegg nede som legges senere: vangen står lavere og nederste opptrinn blir høyere', () => {
  const v = lagVange(l1, { ...VALG, beleggNede: 40 });
  omtrent(v.nedersteOpptrinn, 182);
  assert.equal(v.omriss[0].y, -40);
  assert.ok(v.fot < lagVange(l1, VALG).fot);
  assert.equal(v.varsler.find((x) => x.type === 'belegg-nede').niva, 'vite');
  // Merkene og toppen endres ikke
  assert.deepEqual(v.merker.map((m) => m.avstand), [0, 323, 647, 970, 1293]);
});

test('Eget trinn øverst: toppkuttet står nesa foran bakkant av øverste hakk', () => {
  const l = losTrapp({ ...EKSEMPEL_1, ovreTrinn: 'eget' }).valgt;
  const v = lagVange(l, VALG);
  assert.equal(v.merker.length, 6);
  assert.equal(v.toppkutt.foranBakkant, 20);
  // Toppkuttet i x = 5 · 275 = 1375, der dekket begynner
  omtrent(v.omriss.at(-2).x, 1375);
  // Setet i øverste hakk er nesa kortere enn de andre: fra 4 · 275 + 20 til 1375
  omtrent(v.omriss.at(-3).x - v.omriss.at(-4).x, 275 - 20);
});

test('For smal vange gir feil som må fikses', () => {
  const v = lagVange(l1, { ...VALG, vangeBredde: 140 });
  assert.equal(v.ok, false);
  assert.equal(v.varsler[0].niva, 'ma');
  assert.match(v.varsler[0].tekst, /for smal/);
});

test('Feil i inndata', () => {
  assert.ok(lagVange(l1, { ...VALG, trinnTykkelse: 200 }).feil.some((f) => /mindre enn opptrinnet/.test(f)));
  assert.ok(lagVange(l1, { ...VALG, vangeBredde: 0 }).feil.length > 0);
  assert.ok(lagVange(l1, { ...VALG, beleggNede: -5 }).feil.length > 0);
});

test('Emnet rekker fra enden til alt som skal merkes og kappes', () => {
  for (const ovreTrinn of ['dekke', 'eget']) {
    const l = losTrapp({ ...EKSEMPEL_1, ovreTrinn }).valgt;
    const v = lagVange(l, VALG);
    const fra = -v.spissFraEnden;
    const til = fra + v.emnelengde;
    for (const p of v.flatt) assert.ok(p.u >= fra - 1e-6 && p.u <= til + 1e-6);
    // Alle merkene, også hjelpespissen, ligger på bordet
    for (const m of v.merker) assert.ok(m.eksakt >= fra && m.eksakt <= til, `${m.eksakt} utenfor ${til}`);
    // Hvert hakk går fra én spiss til neste, med hjørnet hakkdybden inn
    v.hakk.forEach((hk, i) => {
      omtrent(hk.spiss.u, v.merker[i].eksakt, 1e-9);
      omtrent(hk.nesteSpiss.u, v.merker[i + 1].eksakt, 1e-9);
      omtrent(hk.hjorne.v, v.hakkDybde, 1e-9);
    });
  }
});

test('Reist opp igjen: vangen lagt flatt havner der den står i trappa', () => {
  const v = lagVange(l1, VALG);
  const { a, b, c, d, e, f } = v.reis;
  v.flatt.forEach((p, i) => {
    omtrent(a * p.u + c * p.v + e, v.omriss[i].x, 1e-6);
    omtrent(b * p.u + d * p.v + f, -v.omriss[i].y, 1e-6);
  });
});

test('Mange trapper: siste merke stemmer med antall steg ganger s, og vangen holder seg på bordet', () => {
  for (const hoyde of [340, 600, 850, 1200, 1800, 2700]) {
    for (const ovreTrinn of ['dekke', 'eget']) {
      const l = losTrapp({ hoyde, lengdevalg: 'fri', ovreTrinn, type: 'annen' }).valgt;
      const v = lagVange(l, { ...VALG, vangeBredde: 223 });
      assert.equal(v.merker.at(-1).avstand, Math.round(l.antallInntrinn * v.s));
      assert.ok(v.emnelengde > 0 && Number.isFinite(v.emnelengde));
      for (const p of v.flatt) assert.ok(p.v >= -1e-6 && p.v <= 223 + 1e-6);
    }
  }
});
