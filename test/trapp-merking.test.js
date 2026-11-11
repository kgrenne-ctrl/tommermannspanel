// Tester for «Se det steg for steg» (merking av vangen). Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { lagMerkesteg } from '../src/skjerm/trapp-merking.js';
import { tegnMerkesteg } from '../src/skjerm/trapp-tegning.js';
import { EKSEMPELTRAPP } from '../src/skjerm/eksempel.js';

const tell = (tekst, bit) => tekst.split(bit).length - 1;
const VALG = { nese: 20, trinnTykkelse: 28, vangeBredde: 223 };

function lag(inndata = EKSEMPELTRAPP) {
  const l = losTrapp(inndata).valgt;
  const v = lagVange(l, VALG);
  return { l, v, steg: lagMerkesteg(v, l, VALG) };
}

test('Stegene kommer i riktig rekkefølge: bordet, spissene, hakkene, bunn, topp, kapp, reis', () => {
  const { steg } = lag();
  // 4 hakk: spiss 1–4 (4 er hjelpespissen), hakk 1–4
  assert.deepEqual(steg.map((s) => `${s.type}${s.nr}`), ['bord0', 'spiss1', 'spiss2', 'spiss3', 'spiss4',
    'hakk1', 'hakk2', 'hakk3', 'hakk4', 'bunn0', 'topp0', 'kapp0', 'reis0']);
});

test('Tekstene har målene fra vangen', () => {
  const { steg } = lag();
  assert.match(steg[0].tekst, /Mål 75 mm fra venstre ende/);
  assert.match(steg[1].tekst, /Mål 323 mm fra spiss 0/);
  assert.match(steg[4].tittel, /hjelpespiss/);
  assert.match(steg[4].tekst, /1\s293 mm/);
  assert.match(steg[5].tekst, /275 mm mot spiss 0 og 170 mm mot spiss 1/);
  assert.match(steg[8].tekst, /mot spiss 3 og 170 mm mot spiss 4/);
  assert.match(steg[9].tekst, /bare 142 mm/);
  assert.match(steg[10].tekst, /Toppkuttet blir 92 mm/);
  for (const s of steg) assert.ok(!s.tekst.includes('—') && !s.tittel.includes('—'), 'tankestrek (em dash) i teksten');
});

test('Tegningen bygges opp steg for steg', () => {
  const { l, v, steg } = lag();
  const tegn = (i) => tegnMerkesteg(v, l, steg[i], VALG);
  // Spissene som er merket så langt
  assert.equal(tell(tegn(0), 'class="m-spiss"'), 1);
  assert.equal(tell(tegn(2), 'class="m-spiss"'), 3);
  assert.equal(tell(tegn(5), 'class="m-spiss"'), 5);
  // Hakkene som er tegnet så langt, og vinkelen bare mens hakkene tegnes
  assert.equal(tell(tegn(5), 'class="m-hakk"'), 1);
  assert.equal(tell(tegn(8), 'class="m-hakk"'), 4);
  assert.equal(tell(tegn(5), 'class="m-vinkel"'), 1);
  assert.equal(tell(tegn(9), 'class="m-vinkel"'), 0);
  // Bunn og topp
  assert.equal(tell(tegn(8), 'class="m-bunn"'), 0);
  assert.equal(tell(tegn(9), 'class="m-bunn"'), 1);
  assert.equal(tell(tegn(10), 'class="m-topp"'), 1);
  // Kapp: hele vangen, det som kappes bort er hvitt
  assert.equal(tell(tegn(11), 'class="v-vange"'), 1);
  assert.equal(tell(tegn(11), 'class="m-bord"'), 0);
  // Reis: vangen dreies med matrisen fra vange.js, og trinnene kommer fram
  const reis = tegn(12);
  assert.ok(reis.includes('class="reis"') && reis.includes('--reis: matrix('));
  assert.equal(tell(reis, '<rect '), 4);
});

test('Alle steg tegnes uten feil, også lang trapp, eget trinn og belegg nede', () => {
  for (const inndata of [
    EKSEMPELTRAPP,
    { ...EKSEMPELTRAPP, ovreTrinn: 'eget' },
    { hoyde: 2700, lengdevalg: 'lengde', lengde: 4420, type: 'boenhet' },
    { hoyde: 340, lengdevalg: 'trinn', inntrinn: 280 },
  ]) {
    const l = losTrapp(inndata).valgt;
    const v = lagVange(l, { ...VALG, beleggNede: 30 });
    const steg = lagMerkesteg(v, l, VALG);
    assert.equal(steg.length, 1 + v.merker.length - 1 + v.hakk.length + 4);
    for (const s of steg) {
      const svg = tegnMerkesteg(v, l, s, VALG);
      assert.ok(svg.startsWith('<svg') && !svg.includes('NaN') && !svg.includes('Infinity'), `${s.type}${s.nr}`);
    }
  }
});
