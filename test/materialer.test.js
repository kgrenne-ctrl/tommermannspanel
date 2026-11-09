// Tester for materialliste og kappliste (fase 5). Håndregnet, kapptillegg 50 mm, svinn 10 %.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losVegg } from '../src/tommermann/vegg.js';
import { lagMaterialliste, materialTekst } from '../src/tommermann/materialer.js';

const E = 1e-9;
// Vegg uten åpninger, 1350 mm, underbord i hjørnene: 7 underbord 148 og 6 påbord 98
const ENKEL = losVegg({ lengde: 1350, hoyde: 2400, bu: 148, bo: 98, hjorneVenstre: 'U', hjorneHoyre: 'U' });
// Vegg med vindu 1200–1800 mm over bakken, bord 73/73
const MED_VINDU = losVegg({ lengde: 6000, hoyde: 2400, bu: 73, bo: 73,
  apninger: [{ type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 }] });

test('Enkel vegg: hvert bord er 2400 + 50 = 2450 mm, løpemeter per dimensjon', () => {
  assert.deepEqual(ENKEL.felt.map((f) => [f.underliggere.length, f.overliggere.length]), [[7, 6]]);
  const l = lagMaterialliste([ENKEL]);
  assert.deepEqual(l.linjer.map((x) => x.dim.navn), ['19 × 98', '19 × 148']);
  const [pa, under] = l.linjer;
  // 7 × 2450 = 17 150 mm = 17,15 lm. Med 10 % svinn 18,865, bestill 19
  assert.equal(under.antallBiter, 7);
  assert.ok(Math.abs(under.netto - 17.15) < E);
  assert.ok(Math.abs(under.medSvinn - 18.865) < 1e-9);
  assert.equal(under.bestill, 19);
  // 6 × 2450 = 14,7 lm, med svinn 16,17, bestill 17
  assert.ok(Math.abs(pa.netto - 14.7) < E);
  assert.equal(pa.bestill, 17);
});

test('Vindu: bordene over og under får hver sin lengde, 1200 + 50 og 600 + 50', () => {
  const l = lagMaterialliste([MED_VINDU]);
  const [felt1, overUnder, felt3] = l.kappliste[0].felt;
  assert.deepEqual(felt1.biter.map((b) => [b.lengde, b.del]), [[2450, 'Full høyde']]);
  assert.deepEqual(overUnder.biter.map((b) => [b.lengde, b.del]).sort(), [[1250, 'Under'], [650, 'Over']].sort());
  const f = MED_VINDU.felt;
  const antallUO = f[1].underliggere.length + f[1].overliggere.length;
  assert.equal(overUnder.biter[0].antall, antallUO);
  // Netto = bord i full høyde × 2450 + bord over og under × (1250 + 650)
  const full = [f[0], f[2]].reduce((s, x) => s + x.underliggere.length + x.overliggere.length, 0);
  assert.ok(Math.abs(l.linjer[0].netto - (full * 2450 + antallUO * 1900) / 1000) < E);
  assert.equal(felt3.biter[0].lengde, 2450);
});

test('Kapptillegg, svinn og pris kan endres', () => {
  const l = lagMaterialliste([ENKEL], { kapptillegg: 0, svinn: 0, priser: { '19x148': 30 } });
  const under = l.linjer.find((x) => x.dim.bredde === 148);
  // 7 × 2400 = 16,8 lm, uten svinn: bestill 17, à 30 kr = 510 kr
  assert.ok(Math.abs(under.netto - 16.8) < E);
  assert.equal(under.bestill, 17);
  assert.equal(under.belop, 510);
  assert.equal(l.belop, 510);
  assert.match(materialTekst(l), /Sum for linjene med pris: 510,00 kr/);
});

test('Ulik tykkelse gir egne linjer', () => {
  const r = losVegg({ lengde: 1350, hoyde: 2400, bu: 148, bo: 148, hjorneVenstre: 'U', hjorneHoyre: 'U',
    tykkelseUnder: 19, tykkelseOver: 22 });
  const l = lagMaterialliste([r]);
  assert.deepEqual(l.linjer.map((x) => x.dim.navn), ['19 × 148', '22 × 148']);
});

test('Felt som ikke går opp, er ikke med, og lista sier fra', () => {
  const r = losVegg({ lengde: 6000, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 }] });
  assert.equal(r.ok, false);
  const l = lagMaterialliste([{ ...r, navn: 'Garasje' }, null]);
  assert.ok(l.mangler.some((m) => m.startsWith('Garasje: ')));
  const tekst = materialTekst(l);
  assert.match(tekst, /OBS: Disse feltene går ikke opp/);
  assert.doesNotMatch(tekst, /\u2014/); // ingen lang tankestrek
});

test('Teksten til trelast har bestilling og kappliste', () => {
  const tekst = materialTekst(lagMaterialliste([{ ...ENKEL, navn: 'Nord' }]));
  assert.match(tekst, /Bakøy Entreprenør AS/);
  assert.match(tekst, /19 × 148 mm: 19 lm/);
  assert.match(tekst, /Nord\n  1\. Venstre hjørne – Høyre hjørne\n    7 stk 2\s450 mm \(19 × 148, full høyde\)/);
});

test('Kapplista sier fra om hjørnebord som skal kløyves', async () => {
  const { losHus } = await import('../src/tommermann/hus.js');
  const { vegger } = losHus({ lukket: false, vegger: [{ lengde: 1350, hoyde: 2400, bu: 148, bo: 148,
    hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'forbi' } } }] });
  const tekst = materialTekst(lagMaterialliste(vegger));
  // Fri ende, påbord ytterst: kløyves med påbordets tykkelse, 148 − 19 = 129
  assert.match(tekst, /Hjørnebord 19 × 148 kløyves til 129 mm bredde/);
});
