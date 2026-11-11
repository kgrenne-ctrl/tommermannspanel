// Tester for skjermdelen for trapp som kan kjøres uten nettleser: tegningen, trinnlista og
// eksempeltrappa. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp, lagTrinnliste } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { tegnTrapp, tegnVangeFlatt, tegnHakk, tegnBunn, tegnTopp } from '../src/skjerm/trapp-tegning.js';
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
  assert.equal(tell(svg, 'class="v-merke"'), 5); // ett per hakk, pluss hjelpespissen for øverste hakk
  for (const tall of ['>0<', '>323<', '>647<', '>970<']) assert.ok(svg.includes(tall), `mangler ${tall}`);
  assert.ok(svg.includes('Emne minst 1\u00a0368 mm') || svg.includes('Emne minst 1 368 mm'));
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

test('Tallene over vangen overlapper aldri, heller ikke på en lang vange', () => {
  for (const inndata of [
    EKSEMPELTRAPP,
    { hoyde: 2700, lengdevalg: 'lengde', lengde: 4420, type: 'boenhet' },  // 14 hakk, som Kennys skjermbilde
    { hoyde: 3300, lengdevalg: 'fri', type: 'annen' },
    { hoyde: 400, lengdevalg: 'trinn', inntrinn: 300 },
  ]) {
    const l = losTrapp(inndata).valgt;
    const v = lagVange(l, { vangeBredde: 223 });
    const svg = tegnVangeFlatt(v, { vangeBredde: 223 });
    const tall = [...svg.matchAll(/class="v-tall" x="([\d.-]+)" y="[\d.-]+" font-size="([\d.]+)"/g)]
      .map((t) => ({ x: Number(t[1]), f: Number(t[2]) }));
    assert.equal(tall.length, v.merker.length);
    // Tallene står på høykant: hvert tall tar omtrent én skrifthøyde i bredden
    for (let i = 1; i < tall.length; i++) {
      assert.ok(tall[i].x - tall[i - 1].x >= tall[i].f * 1.5, `tall ${i} overlapper (${JSON.stringify(inndata)})`);
    }
  }
});

test('Skissene av hakk, bunn og topp har målene som står i stegene', () => {
  const l = losTrapp(EKSEMPELTRAPP).valgt;
  const v = lagVange(l, { nese: 20, trinnTykkelse: 28, vangeBredde: 223 });
  const hakk = tegnHakk(v, l, { vangeBredde: 223 });
  for (const t of ['Inntrinn 275', 'Opptrinn 170', 'Hakk 144,6', 'Rest 78,4', 'Spiss 0', 'Spiss 323', 'class="v-vinkel"']) {
    assert.ok(hakk.includes(t), `hakk mangler ${t}`);
  }
  const bunn = tegnBunn(v, { vangeBredde: 223 });
  for (const t of ['>75<', '>142<', 'Bunnkutt 194', 'Spiss 0']) assert.ok(bunn.includes(t), `bunn mangler ${t}`);
  const topp = tegnTopp(v, { vangeBredde: 223 });
  for (const t of ['Toppkutt 92', 'Spiss 970']) assert.ok(topp.includes(t), `topp mangler ${t}`);
  assert.ok(!topp.includes('foran hjørnet'));
  for (const s of [hakk, bunn, topp]) assert.ok(!s.includes('NaN') && !s.includes('Infinity'));

  // Eget trinn øverst: toppkuttet står nesa foran hjørnet
  const le = losTrapp({ ...EKSEMPELTRAPP, ovreTrinn: 'eget' }).valgt;
  const ve = lagVange(le, { nese: 20, trinnTykkelse: 28, vangeBredde: 223 });
  assert.ok(tegnTopp(ve, { vangeBredde: 223 }).includes('20 foran hjørnet'));
});
