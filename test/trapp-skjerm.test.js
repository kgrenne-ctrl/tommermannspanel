// Tester for skjermdelen for trapp som kan kjøres uten nettleser: tegningen, trinnlista og
// eksempeltrappa. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp, lagTrinnliste } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { tegnTrapp, tegnVangeFlatt } from '../src/skjerm/trapp-tegning.js';
import { EKSEMPELTRAPP } from '../src/skjerm/eksempel.js';

const tell = (tekst, bit) => tekst.split(bit).length - 1;

test('Eksempeltrappa går opp uten noe som må fikses eller bør sjekkes', () => {
  const svar = losTrapp(EKSEMPELTRAPP);
  assert.equal(svar.ok, true);
  assert.equal(svar.valgt.antallOpptrinn, 5);
  assert.deepEqual(svar.valgt.varsler.filter((v) => v.niva !== 'vite'), []);
});

test('Trinnlista: dekket som øverste trinn', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  assert.deepEqual(lagTrinnliste(l), [
    { nr: 1, hoyde: 170, forkant: 0 },
    { nr: 2, hoyde: 340, forkant: 275 },
    { nr: 3, hoyde: 510, forkant: 550 },
    { nr: 4, hoyde: 680, forkant: 825 },
    { nr: null, hoyde: 850, forkant: 1100 },
  ]);
});

test('Trinnlista: eget trinn øverst i samme høyde som dekket', () => {
  const l = losTrapp({ ...EKSEMPELTRAPP, ovreTrinn: 'eget' }).valgt;
  const rader = lagTrinnliste(l);
  assert.equal(rader.length, 6);
  assert.deepEqual(rader[4], { nr: 5, hoyde: 850, forkant: 1100 });
  assert.deepEqual(rader[5], { nr: null, hoyde: 850, forkant: 1375 });
});

test('Tegningen har ett trinn per inntrinn, vange, dekke og begge målene', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  const svg = tegnTrapp(l, lagVange(l, { nese: 20, trinnTykkelse: 28, vangeBredde: 223 }), { nese: 20, trinnTykkelse: 28 });
  assert.ok(svg.startsWith('<svg'));
  assert.equal(tell(svg, 'class="t-trinn"'), 4);
  assert.equal(tell(svg, 'class="t-vange"'), 1);
  assert.equal(tell(svg, 'class="t-dekke"'), 1);
  assert.ok(svg.includes('>850 mm<'));
  assert.ok(svg.includes('>1 100 mm<') || svg.includes('>1 100 mm<'), 'løpslengden 1100 mm mangler');
  assert.ok(!svg.includes('NaN'));
  // Fargene kommer fra variablene i stil.css
  assert.ok(svg.includes('var(--trinn)') && svg.includes('var(--vange)'));
});

test('Tegningen: trinnene ligger i riktig høyde og avstand, i mm', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  const svg = tegnTrapp(l, lagVange(l), { nese: 20, trinnTykkelse: 28 });
  const trinn = [...svg.matchAll(/class="t-trinn" x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)]
    .map((t) => t.slice(1).map(Number));
  // Forkant 0, 275, 550, 825. Dybde = inntrinn + nese = 295. Tykkelse 28.
  assert.deepEqual(trinn.map((t) => t[0]), [0, 275, 550, 825]);
  for (const t of trinn) { assert.equal(t[2], 295); assert.equal(t[3], 28); }
  // Ett opptrinn (170 mm) mellom hvert trinn i SVG-høyde
  for (let k = 1; k < trinn.length; k++) assert.ok(Math.abs(trinn[k - 1][1] - trinn[k][1] - 170) < 1e-9);
});

test('Tegningen virker for lav, høy og innvendig trapp', () => {
  for (const inndata of [
    { hoyde: 340, lengdevalg: 'trinn', inntrinn: 280 },
    { hoyde: 2700, lengdevalg: 'lengde', lengde: 3640, type: 'boenhet' },
    { hoyde: 1200, lengdevalg: 'fri', ovreTrinn: 'eget' },
  ]) {
    const l = losTrapp(inndata).valgt;
    const svg = tegnTrapp(l, lagVange(l));
    assert.ok(!svg.includes('NaN') && !svg.includes('Infinity'), JSON.stringify(inndata));
    assert.equal(tell(svg, 'class="t-trinn"'), l.antallInntrinn);
  }
});

test('Vangen lagt flatt: ett merke per hakk, emnelengde og 0 i oransje', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  const v = lagVange(l, { nese: 20, trinnTykkelse: 28, vangeBredde: 223 });
  const svg = tegnVangeFlatt(v, { vangeBredde: 223 });
  assert.equal(tell(svg, 'class="v-vange"'), 1);
  assert.equal(tell(svg, 'class="v-merke"'), 4); // ett per hakk
  for (const tall of ['>0<', '>323<', '>647<', '>970<']) assert.ok(svg.includes(tall), `mangler ${tall}`);
  assert.ok(svg.includes('Emne minst 1\u00a0279 mm') || svg.includes('Emne minst 1 279 mm'));
  assert.ok(svg.includes('var(--bakoy-oransje)'));
  assert.ok(!svg.includes('NaN'));
});

test('Sideriss med belegg nede viser stiplet linje der vangen står', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  const med = tegnTrapp(l, lagVange(l, { beleggNede: 40 }), { beleggNede: 40 });
  const uten = tegnTrapp(l, lagVange(l), { beleggNede: 0 });
  assert.equal(tell(med, 'stroke-dasharray'), tell(uten, 'stroke-dasharray') + 1);
  const svg = med;
  assert.ok(!svg.includes('NaN'));
});
