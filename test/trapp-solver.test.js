// Tester for regnemodellen for trapp (PLAN-trapp.md punkt 4 og 8). Kjøres med: npm test
// Kontrolleksempel 1 (utvendig trapp) er første test og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp, trinnFraBord } from '../src/trapp/solver.js';

const omtrent = (faktisk, forventet, toleranse = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= toleranse, `${faktisk} skulle vært ${forventet}`);

const medOpptrinn = (svar, n) => svar.alle.find((l) => l.antallOpptrinn === n);
const harVarsel = (l, type) => l.varsler.some((v) => v.type === type);

// Terrasse 850 mm over helle, dekket er øverste trinn. Trinn av 2 stk 28 × 145 med 5 mm spalte.
const EKSEMPEL_1 = { hoyde: 850, lengdevalg: 'trinn', trinnbord: { antall: 2, bredde: 145, spalte: 5 },
  nese: 20, ovreTrinn: 'dekke', type: 'utvendig' };

test('Kontrolleksempel 1: utvendig trapp 850 mm med trinn av to bord 28 × 145', () => {
  const svar = losTrapp(EKSEMPEL_1);
  assert.equal(svar.ok, true);
  assert.deepEqual(svar.trinn, { dybde: 295, inntrinn: 275 });

  const l = svar.valgt;
  assert.equal(l.antallOpptrinn, 5);
  assert.equal(l.antallInntrinn, 4);
  omtrent(l.opptrinn, 170);
  omtrent(l.inntrinn, 275);
  omtrent(l.formel, 615);
  assert.equal(l.innenforFormel, true);
  omtrent(l.vinkel, 31.7);
  omtrent(l.lopslengde, 1100);
  assert.deepEqual(l.hoyder, [170, 340, 510, 680, 850]);
  assert.deepEqual(l.posisjoner, [275, 550, 825, 1100]);
  assert.equal(harVarsel(l, 'formel'), false);
  // Inntrinn under 280 og over 30 grader: greit å vite om trappa står fritt i hagen (§ 8-9)
  assert.equal(l.varsler.find((v) => v.type === 'uteareal').niva, 'vite');

  // Ett trinn færre og ett flere: lov, men trappeformelen er utenfor og gir varsel
  const fire = medOpptrinn(svar, 4);
  omtrent(fire.opptrinn, 212.5);
  omtrent(fire.formel, 700);
  assert.equal(fire.varsler.find((v) => v.type === 'formel').niva, 'bor');
  const seks = medOpptrinn(svar, 6);
  omtrent(seks.opptrinn, 141.7);
  omtrent(seks.formel, 558.3);
  assert.equal(harVarsel(seks, 'formel'), true);
});

test('Kontrolleksempel 1 med 2 stk 28 × 120: inntrinn 225 mm er ikke lov', () => {
  const svar = losTrapp({ ...EKSEMPEL_1, trinnbord: { antall: 2, bredde: 120, spalte: 5 } });
  assert.equal(svar.ok, false);
  assert.deepEqual(svar.trinn, { dybde: 245, inntrinn: 225 });
  assert.match(svar.melding, /225 mm/);
  assert.match(svar.melding, /minst 250 mm/);
  assert.match(svar.forslag[0].tekst, /minst 270 mm dypt/);
  // Tre bord går opp
  assert.deepEqual(svar.forslag[1].trinnbord, { antall: 3, bredde: 120, spalte: 5 });
  assert.equal(losTrapp({ ...EKSEMPEL_1, trinnbord: svar.forslag[1].trinnbord }).ok, true);
});

test('Kontrolleksempel 2: innvendig trapp 2700 mm på 3640 mm lengde', () => {
  const svar = losTrapp({ hoyde: 2700, lengdevalg: 'lengde', lengde: 3640, ovreTrinn: 'dekke', type: 'boenhet' });
  assert.equal(svar.ok, true);
  const l = svar.valgt;
  assert.equal(l.antallOpptrinn, 15);
  assert.equal(l.antallInntrinn, 14);
  omtrent(l.opptrinn, 180);
  omtrent(l.inntrinn, 260);
  omtrent(l.formel, 620);
  omtrent(l.vinkel, 34.7);
  assert.equal(l.varsler.length, 0);

  const fjorten = medOpptrinn(svar, 14);
  omtrent(fjorten.opptrinn, 192.9);
  omtrent(fjorten.inntrinn, 280);
  omtrent(fjorten.formel, 665.7);
  assert.equal(harVarsel(fjorten, 'formel'), true);
  // 16 opptrinn gir inntrinn 242,7: ikke lov, og er derfor ikke med
  assert.equal(medOpptrinn(svar, 16), undefined);
});

test('Trinn av bord: dybde er bord og spalter, inntrinn er dybde minus nese', () => {
  assert.deepEqual(trinnFraBord({ antall: 2, bredde: 145, spalte: 5 }, 20), { dybde: 295, inntrinn: 275 });
  assert.deepEqual(trinnFraBord({ antall: 3, bredde: 95, spalte: 6 }, 0), { dybde: 297, inntrinn: 297 });
  assert.deepEqual(trinnFraBord({ antall: 1, bredde: 300 }, 20), { dybde: 300, inntrinn: 280 });
});

test('Inntrinnet kan også oppgis direkte', () => {
  const svar = losTrapp({ hoyde: 850, lengdevalg: 'trinn', inntrinn: 275 });
  assert.equal(svar.ok, true);
  assert.equal(svar.trinn, null);
  assert.equal(svar.valgt.antallOpptrinn, 5);
});

test('Fri lengde: inntrinn 620 − 2 × opptrinn, opptrinnet nærmest 175 mm', () => {
  const svar = losTrapp({ hoyde: 850, lengdevalg: 'fri' });
  const l = svar.valgt;
  assert.equal(l.antallOpptrinn, 5);
  omtrent(l.opptrinn, 170);
  omtrent(l.inntrinn, 280);
  omtrent(l.formel, 620);
  omtrent(l.lopslengde, 1120);
  // 4 opptrinn gir 212,5 og inntrinn 195: ikke lov
  assert.equal(medOpptrinn(svar, 4), undefined);
  for (const alt of svar.alle) omtrent(alt.formel, 620);
});

test('Eget trinn øverst: like mange inntrinn som opptrinn', () => {
  const svar = losTrapp({ ...EKSEMPEL_1, ovreTrinn: 'eget' });
  assert.equal(svar.valgt.antallOpptrinn, 5);
  assert.equal(svar.valgt.antallInntrinn, 5);
  omtrent(svar.valgt.lopslengde, 1375);
  assert.equal(svar.valgt.posisjoner.length, 5);
});

test('Sum av opptrinn er alltid høyden, og sum av inntrinn alltid løpslengden', () => {
  let tilfeldig = 7;
  const neste = () => { tilfeldig = (tilfeldig * 16807) % 2147483647; return tilfeldig / 2147483647; };
  for (let i = 0; i < 300; i++) {
    const hoyde = Math.round(200 + neste() * 3000);
    const lengde = Math.round(hoyde * (1 + neste() * 1.5));
    const ovreTrinn = neste() < 0.5 ? 'dekke' : 'eget';
    const svar = losTrapp({ hoyde, lengdevalg: 'lengde', lengde, ovreTrinn, type: 'annen' });
    if (!svar.ok) continue;
    for (const l of svar.alle) {
      assert.equal(l.hoyder.length, l.antallOpptrinn);
      assert.equal(l.hoyder.at(-1), Math.round(hoyde));
      assert.equal(l.posisjoner.at(-1), Math.round(lengde));
      omtrent(l.opptrinn * l.antallOpptrinn, hoyde, 1e-6);
      omtrent(l.inntrinn * l.antallInntrinn, lengde, 1e-6);
      assert.ok(l.inntrinn >= 250 - 1e-6, 'inntrinn under 250 skal aldri være med');
      // Løpende mål er avrundet hver for seg: ingen avvik som vokser bortover
      l.hoyder.forEach((v, k) => assert.equal(v, Math.round((k + 1) * hoyde / l.antallOpptrinn)));
    }
  }
});

test('Lengde som er for kort: forslag til lengde som går opp', () => {
  // 800 mm går med 4 opptrinn (inntrinn 266,7, men trappeformel 691,7 gir varsel)
  const kort = losTrapp({ hoyde: 850, lengdevalg: 'lengde', lengde: 800 });
  assert.equal(kort.valgt.antallOpptrinn, 4);
  assert.equal(harVarsel(kort.valgt, 'formel'), true);
  // 700 mm: ingen inndeling gir inntrinn på minst 250
  const svar = losTrapp({ hoyde: 850, lengdevalg: 'lengde', lengde: 700 });
  assert.equal(svar.ok, false);
  assert.match(svar.melding, /700 mm lengde/);
  assert.equal(svar.forslag[0].lengde, 1120);
  assert.equal(losTrapp({ hoyde: 850, lengdevalg: 'lengde', lengde: 1120 }).valgt.antallOpptrinn, 5);
});

test('Over 3,3 m må trappa ha repos', () => {
  const svar = losTrapp({ hoyde: 3400, lengdevalg: 'fri', type: 'boenhet' });
  assert.equal(svar.ok, true);
  assert.equal(svar.valgt.varsler.find((v) => v.type === 'repos').niva, 'ma');
  const lav = losTrapp({ hoyde: 3300, lengdevalg: 'fri', type: 'boenhet' });
  assert.equal(harVarsel(lav.valgt, 'repos'), false);
});

test('Bredde kontrolleres mot typen trapp', () => {
  const bredde = (type, b) => losTrapp({ hoyde: 2700, lengdevalg: 'fri', type, bredde: b }).valgt;
  assert.equal(harVarsel(bredde('boenhet', 800), 'bredde'), false);
  assert.equal(harVarsel(bredde('boenhet', 790), 'bredde'), true);
  assert.equal(harVarsel(bredde('utvendig', 900), 'bredde'), false);
  assert.equal(bredde('utvendig', 850).varsler.find((v) => v.type === 'bredde').niva, 'ma');
  assert.equal(harVarsel(bredde('flere', 1000), 'bredde'), true);
  assert.equal(harVarsel(bredde('flere', 1100), 'bredde'), false);
  // Kravet gjelder trinnene: 850 mm over vangene med 30 mm utstikk er 910 mm å gå på
  const medUtstikk = losTrapp({ hoyde: 2700, lengdevalg: 'fri', type: 'utvendig', bredde: 850, utstikk: 30 }).valgt;
  assert.equal(harVarsel(medUtstikk, 'bredde'), false);
  const forSmal = losTrapp({ hoyde: 2700, lengdevalg: 'fri', type: 'utvendig', bredde: 820, utstikk: 30 }).valgt;
  assert.match(forSmal.varsler.find((v) => v.type === 'bredde').tekst, /880 mm bred målt over trinnene/);
  assert.ok(losTrapp({ hoyde: 850, lengdevalg: 'fri', utstikk: -5 }).feil.some((f) => /Utstikket/.test(f)));
  // Uten bredde: ingen kontroll
  assert.equal(harVarsel(losTrapp({ hoyde: 2700, lengdevalg: 'fri', type: 'flere' }).valgt, 'bredde'), false);
});

test('Svært lave trapper: to og tre opptrinn', () => {
  const to = losTrapp({ hoyde: 340, lengdevalg: 'trinn', inntrinn: 280 });
  assert.equal(to.valgt.antallOpptrinn, 2);
  assert.equal(to.valgt.antallInntrinn, 1);
  omtrent(to.valgt.formel, 620);
  const tre = losTrapp({ hoyde: 510, lengdevalg: 'trinn', inntrinn: 280 });
  assert.equal(tre.valgt.antallOpptrinn, 3);
  assert.deepEqual(tre.valgt.hoyder, [170, 340, 510]);
});

test('Feil i inndata gir tydelig melding', () => {
  assert.equal(losTrapp({ hoyde: 0 }).ok, false);
  assert.ok(losTrapp({ hoyde: -5, lengdevalg: 'trinn', inntrinn: 275 }).feil.some((f) => /Høyden/.test(f)));
  assert.ok(losTrapp({ hoyde: 850, lengdevalg: 'trinn' }).feil.some((f) => /Inntrinnet/.test(f)));
  assert.ok(losTrapp({ hoyde: 850, lengdevalg: 'lengde' }).feil.some((f) => /Lengden/.test(f)));
  assert.ok(losTrapp({ hoyde: 850, lengdevalg: 'fri', type: 'garasje' }).feil.some((f) => /type/.test(f)));
  assert.ok(losTrapp({ ...EKSEMPEL_1, trinnbord: { antall: 1.5, bredde: 145 } }).feil.length > 0);
});
