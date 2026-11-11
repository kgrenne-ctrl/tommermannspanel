// Tester for hel vange (fase T6): trinnene står mellom vangene. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { lagTrappMaterialer } from '../src/trapp/materialer.js';
import { lagMerkesteg, lagVangeSteg } from '../src/skjerm/trapp-merking.js';
import { tegnMerkesteg, tegnVangeFlatt, tegnHakk, tegnBunn, tegnTopp, tegnTrapp } from '../src/skjerm/trapp-tegning.js';
import { lagTrappUtskrift } from '../src/skjerm/trapp-utskrift.js';

const omtrent = (faktisk, forventet, toleranse = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= toleranse, `${faktisk} skulle vært ${forventet}`);
const tell = (tekst, bit) => tekst.split(bit).length - 1;

// Eksempeltrappa: 850 mm, inntrinn 275, opptrinn 170, nese 20, trinn 28, vange 48 × 273
const l = losTrapp({ hoyde: 850, lengdevalg: 'trinn', inntrinn: 275 }).valgt;
const VALG = { vangetype: 'hel', nese: 20, trinnTykkelse: 28, vangeBredde: 273 };
const v = lagVange(l, VALG);
const tilStaende = (p) => ({ x: v.reis.a * p.u + v.reis.c * p.v + v.reis.e, y: -(v.reis.b * p.u + v.reis.d * p.v + v.reis.f) });

test('Trinnene står midt i vangen: like mye vange over forkanten som under bakkanten', () => {
  assert.equal(v.ok, true);
  assert.equal(v.type, 'hel');
  omtrent(v.s, 323.3);
  // Trinnet tar (295 · 170 + 28 · 275) / 323,3 = 178,9 mm av bredden, vinkelrett på vangen
  omtrent(v.overkant, (273 - 178.9) / 2, 0.1);
  omtrent(v.underTrinn, v.overkant, 1e-9);
  assert.equal(v.linje, v.overkant);
  assert.ok(v.varsler.some((x) => x.type === 'vange-midt'));
});

test('Avstand over forkanten kan settes', () => {
  const v2 = lagVange(l, { ...VALG, overkant: 30 });
  assert.equal(v2.overkant, 30);
  omtrent(v2.underTrinn, 273 - 30 - 178.9, 0.1);
  assert.ok(!v2.varsler.some((x) => x.type === 'vange-midt'));
});

test('Reist opp: omrisset stemmer, og strekene for trinnene blir vannrette i riktig høyde', () => {
  v.flatt.forEach((p, i) => {
    const q = tilStaende(p);
    omtrent(q.x, v.omriss[i].x, 1e-6);
    omtrent(q.y, v.omriss[i].y, 1e-6);
  });
  v.trinn.forEach((tr, i) => {
    const [a, b, c, d] = tr.map(tilStaende);
    const k = i + 1;
    omtrent(a.y, k * 170, 1e-6); omtrent(b.y, k * 170, 1e-6);     // overkant trinn
    omtrent(c.y, k * 170 - 28, 1e-6); omtrent(d.y, k * 170 - 28, 1e-6); // underkant trinn
    omtrent(a.x, (k - 1) * 275, 1e-6);                             // forkant
    omtrent(b.x - a.x, 295, 1e-6);                                 // inntrinn + nese
  });
});

test('Spissene ligger på hjelpelinja, og hakkene går fra spiss til spiss', () => {
  assert.equal(v.merker.length, 5);
  assert.deepEqual(v.merker.map((m) => m.avstand), [0, 323, 647, 970, 1293]);
  for (const hk of v.hakk) {
    assert.equal(hk.spiss.v, v.linje);
    assert.equal(hk.nesteSpiss.v, v.linje);
  }
  // Spiss 0 er forkanten av nederste trinn
  const s0 = tilStaende(v.hakk[0].spiss);
  omtrent(s0.x, 0, 1e-6); omtrent(s0.y, 170, 1e-6);
});

test('Kuttene: loddrett foran og vannrett bunn, vannrett topp under dekket og loddrett mot bjelken', () => {
  const [bunnForan, gulvForan, gulvBak] = v.kutt.bunn.map(tilStaende);
  omtrent(bunnForan.x, 0, 1e-6); omtrent(gulvForan.x, 0, 1e-6); omtrent(gulvForan.y, 0, 1e-6);
  omtrent(gulvBak.y, 0, 1e-6);
  omtrent(v.kuttMal.bunnLodd, 170 + v.overkant * 323.3 / 275, 0.1);
  const [vStart, hjorne, lodBunn] = v.kutt.topp.map(tilStaende);
  omtrent(vStart.y, 850 - 28, 1e-6);        // underkant dekke, dekkebord like tykt som trinnene
  omtrent(hjorne.x, 4 * 275 + 20, 1e-6);    // bjelken står nesa bak forkanten av dekket
  omtrent(lodBunn.x, hjorne.x, 1e-6);
  assert.ok(v.kuttMal.toppLodd > 0 && v.kuttMal.toppVannrett > 0);
  // Emnet rekker til alle merkene
  assert.ok(v.emnelengde >= v.spissFraEnden + v.merker.at(-1).eksakt);
});

test('Eget trinn øverst: toppen kappes i høyde med dekket, øverste trinn bare inntrinnet dypt', () => {
  const le = losTrapp({ hoyde: 850, lengdevalg: 'trinn', inntrinn: 275, ovreTrinn: 'eget' }).valgt;
  const ve = lagVange(le, VALG);
  const st = (p) => ({ x: ve.reis.a * p.u + ve.reis.c * p.v + ve.reis.e, y: -(ve.reis.b * p.u + ve.reis.d * p.v + ve.reis.f) });
  omtrent(st(ve.kutt.topp[0]).y, 850, 1e-6);
  omtrent(st(ve.kutt.topp[1]).x, 5 * 275, 1e-6);
  const siste = ve.trinn.at(-1).map(st);
  omtrent(siste[1].x - siste[0].x, 275, 1e-6);
});

test('For smal vange gir feil som må fikses', () => {
  const smal = lagVange(l, { ...VALG, vangeBredde: 170 });
  assert.equal(smal.ok, false);
  assert.equal(smal.varsler[0].niva, 'ma');
  assert.match(smal.varsler[0].tekst, /for smal for trinnene/);
});

test('Uttatt vange er uendret når vangetype ikke er oppgitt', () => {
  const u = lagVange(l, { nese: 20, trinnTykkelse: 28, vangeBredde: 223 });
  assert.equal(u.type, 'uttatt');
  omtrent(u.hakkDybde, 144.6);
  assert.equal(u.linje, 0);
});

test('Bredde og materialer: trinnene står mellom to vanger', () => {
  // TEK: 900 over vangene, hel vange 48 mm gir 804 mm å gå på. Utvendig krever 900.
  const s = losTrapp({ hoyde: 850, lengdevalg: 'trinn', inntrinn: 275, bredde: 900, vangetype: 'hel', vangeTykkelse: 48 });
  assert.match(s.valgt.varsler.find((x) => x.type === 'bredde').tekst, /804 mm bred målt over trinnene/);
  const liste = lagTrappMaterialer({ l, vange: v, bredde: 1000, trinnbord: { antall: 2, bredde: 145, spalte: 5 },
    trinnTykkelse: 28, vangetype: 'hel', antallVanger: 4, utstikk: 50 });
  assert.equal(liste.antallVanger, 2);                 // alltid to, antall og utstikk brukes ikke
  assert.equal(liste.linjer[1].lengde, 1000 - 96 + 50); // trinn mellom vangene, med kapptillegg
  assert.match(liste.varsler.find((x) => x.type === 'vange-avstand').tekst, /spenner trinnene 952 mm/);
  const tykk = lagTrappMaterialer({ l, vange: v, bredde: 1000, trinnTykkelse: 48, vangetype: 'hel' });
  assert.ok(!tykk.varsler.some((x) => x.type === 'vange-avstand'));
});

test('Stegene og tegningene for hel vange', () => {
  const steg = lagVangeSteg(v, l, VALG);
  assert.match(steg[0].tekst, /hjelpelinja/);
  assert.match(steg[1].tekst, /overkant trinn/);
  assert.match(steg[3].tekst, /hjelpespissen/);
  const ms = lagMerkesteg(v, l, VALG);
  assert.equal(ms.length, 13);
  assert.match(ms[5].tittel, /Trinn 1 av 4/);
  const tegn = (i) => tegnMerkesteg(v, l, ms[i], VALG);
  assert.ok(tegn(0).includes('v-hjelpelinje'));
  assert.equal(tell(tegn(5), 'class="v-trinnmerke"'), 1);
  assert.equal(tell(tegn(8), 'class="v-trinnmerke"'), 4);
  assert.equal(tell(tegn(11), 'class="v-trinnmerke"'), 4); // kapp: strekene står igjen
  for (const s of ms) assert.ok(!/NaN|Infinity|undefined/.test(tegnMerkesteg(v, l, s, VALG)), s.type);
  for (const svg of [tegnVangeFlatt(v, VALG), tegnHakk(v, l, VALG), tegnBunn(v, VALG), tegnTopp(v, VALG), tegnTrapp(l, v, VALG)]) {
    assert.ok(!/NaN|Infinity|undefined/.test(svg));
  }
  assert.ok(tegnHakk(v, l, VALG).includes('overkant trinn'));
  assert.ok(tegnTopp(v, VALG).includes('Vannrett'));
  const html = lagTrappUtskrift({ tilstand: {}, d: { type: 'utvendig', hoyde: 850, ovreTrinn: 'dekke', lengdevalg: 'trinn' },
    l, vange: v, valg: { ...VALG, vangeTykkelse: 48 }, liste: null, versjon: 't' });
  assert.ok(html.includes('hel (trinn mellom)') && html.includes('Over forkant'));
  for (const t of [...steg.map((x) => x.tekst), ...ms.map((x) => x.tekst)]) assert.ok(!t.includes('\u2014'));
});
