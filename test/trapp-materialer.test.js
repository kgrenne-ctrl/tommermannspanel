// Tester for materiallista for trapp (src/trapp/materialer.js). Kjøres med: npm test
// Tallene er håndregnet for eksempeltrappa (850 mm, 2 stk 28 × 145, bredde 1000 mm).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagVange } from '../src/trapp/vange.js';
import { lagTrappMaterialer, trappMaterialTekst, maksAvstandVanger } from '../src/trapp/materialer.js';

const omtrent = (faktisk, forventet, toleranse = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= toleranse, `${faktisk} skulle vært ${forventet}`);

const TRINNBORD = { antall: 2, bredde: 145, spalte: 5 };
function lag(trinnTykkelse = 28, ekstra = {}, inndata = {}) {
  const l = losTrapp({ hoyde: 850, lengdevalg: 'trinn', trinnbord: TRINNBORD, nese: 20, ...inndata }).valgt;
  const vange = lagVange(l, { nese: 20, trinnTykkelse, vangeBredde: 223 });
  return { l, vange, liste: lagTrappMaterialer({ l, vange, bredde: 1000, trinnbord: TRINNBORD, trinnTykkelse, ...ekstra }) };
}

test('Eksempeltrappa med 28 mm trinnbord: 3 vanger, 8 trinnbord, 10 lm', () => {
  const { liste } = lag();
  assert.equal(liste.ok, true);
  // Senter til senter mellom de ytterste vangene: 1000 − 48 = 952. Høyst 600 → 3 vanger, 476 mm.
  assert.equal(liste.anbefaltVanger, 3);
  assert.equal(liste.antallVanger, 3);
  omtrent(liste.avstandVanger, 476);
  const [vange, trinn] = liste.linjer;
  assert.equal(vange.del, 'Vange');
  assert.equal(vange.dim.navn, '48 × 223');
  assert.equal(vange.antall, 3);
  assert.equal(vange.lengde, 1368 + 50);
  assert.equal(vange.bestill, null); // vanger bestilles i stykk, ikke løpemeter
  assert.equal(trinn.dim.navn, '28 × 145');
  assert.equal(trinn.antall, 8);     // 4 trinn × 2 bord
  assert.equal(trinn.lengde, 1050);
  omtrent(trinn.netto, 8.4);
  assert.equal(trinn.bestill, 10);   // 8,4 × 1,1 = 9,24, rundet opp
  assert.ok(!liste.varsler.some((v) => v.niva === 'bor'));
});

test('48 mm trinn: høyst 1000 mm mellom vangene, så 2 vanger holder', () => {
  const { liste } = lag(48);
  assert.equal(liste.anbefaltVanger, 2);
  omtrent(liste.avstandVanger, 952);
  assert.equal(maksAvstandVanger(48), 1000);
  assert.equal(maksAvstandVanger(36), 600); // mellom 28 og 48: 600, ikke noe midt imellom
});

test('Utstikk på sidene flytter de ytterste vangene inn, trinnene er like lange', () => {
  const { liste } = lag(28, { utstikk: 30 });
  omtrent(liste.avstandVanger, (1000 - 60 - 48) / 2);
  assert.equal(liste.linjer[1].lengde, 1050);
});

test('Færre vanger enn anbefalt gir varsel, flere går fint', () => {
  const to = lag(28, { antallVanger: 2 }).liste;
  omtrent(to.avstandVanger, 952);
  assert.equal(to.varsler.find((v) => v.type === 'vange-avstand').niva, 'bor');
  const fire = lag(28, { antallVanger: 4 }).liste;
  assert.ok(!fire.varsler.some((v) => v.type === 'vange-avstand'));
  assert.equal(fire.linjer[0].antall, 4);
});

test('Kapptillegg og svinn kan endres', () => {
  const { liste } = lag(28, { kapptillegg: 0, svinn: 0 });
  assert.equal(liste.linjer[0].lengde, 1368);
  assert.equal(liste.linjer[1].bestill, 8); // 8 × 1000 mm = 8 lm
});

test('Trinn som ikke er gitt av bord: ett trinn per inntrinn, inntrinn + nese dypt', () => {
  const l = losTrapp({ hoyde: 850, lengdevalg: 'fri' }).valgt; // inntrinn 280
  const vange = lagVange(l, { nese: 20, trinnTykkelse: 28 });
  const liste = lagTrappMaterialer({ l, vange, bredde: 1000, trinnTykkelse: 28, nese: 20 });
  assert.deepEqual(liste.linjer.slice(1).map((x) => [x.del, x.dim.navn, x.antall]), [['Trinn', '28 × 300', 4]]);
  // Eget trinn øverst: det øverste er bare inntrinnet dypt
  const le = losTrapp({ hoyde: 850, lengdevalg: 'fri', ovreTrinn: 'eget' }).valgt;
  const ve = lagVange(le, { nese: 20, trinnTykkelse: 28 });
  const lst = lagTrappMaterialer({ l: le, vange: ve, bredde: 1000, trinnTykkelse: 28, nese: 20 });
  assert.deepEqual(lst.linjer.slice(1).map((x) => [x.del, x.dim.navn, x.antall]),
    [['Trinn', '28 × 300', 4], ['Øverste trinn', '28 × 280', 1]]);
});

test('Uten bredde, eller for smal trappa: tydelig melding', () => {
  const { l, vange } = lag();
  assert.match(lagTrappMaterialer({ l, vange, bredde: null, trinnTykkelse: 28 }).feil[0], /bredden på trappa/);
  assert.match(lagTrappMaterialer({ l, vange, bredde: 90, trinnTykkelse: 28, utstikk: 30 }).feil[0], /for smal/);
});

test('Lista som tekst har bestilling og kappliste', () => {
  const tekst = trappMaterialTekst(lag().liste);
  assert.match(tekst, /Vange 48 × 223 mm: 3 stk, hver minst 1\s418 mm lang/);
  assert.match(tekst, /Trinnbord 28 × 145 mm: 10 lm/);
  assert.match(tekst, /8 stk 1\s050 mm trinnbord/);
  assert.ok(!tekst.includes('\u2014'));
});
