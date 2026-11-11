// Tester for trapphull og fri høyde (src/trapp/trapphull.js), høyde målt før gulvet er lagt, og
// tette opptrinn. Kontrolleksempel 2 i PLAN-trapp.md punkt 4. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losTrapp } from '../src/trapp/solver.js';
import { lagTrapphull } from '../src/trapp/trapphull.js';
import { lagVange } from '../src/trapp/vange.js';
import { lagTrappMaterialer } from '../src/trapp/materialer.js';

const omtrent = (faktisk, forventet, toleranse = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= toleranse, `${faktisk} skulle vært ${forventet}`);

const l2 = losTrapp({ hoyde: 2700, lengdevalg: 'lengde', lengde: 3640, type: 'boenhet' }).valgt;

test('Kontrolleksempel 2: etasjeskiller 300 mm, krav 2,0 m, trapphullet må være minst 3323 mm', () => {
  const t = lagTrapphull(l2, { etasjeskiller: 300, type: 'boenhet' });
  assert.equal(t.ok, true);
  assert.equal(t.krav, 2000);
  assert.equal(t.minsteHull, 3323); // 3322,2 rundet opp
  assert.equal(t.friHoyde, null);   // uten lengde på hullet: bare minstemålet
});

test('3323 mm holder, 3300 mm gir varsel som må fikses', () => {
  const ok = lagTrapphull(l2, { etasjeskiller: 300, hullLengde: 3323, type: 'boenhet' });
  assert.ok(ok.friHoyde >= 2000);
  assert.equal(ok.varsler.length, 0);
  const kort = lagTrapphull(l2, { etasjeskiller: 300, hullLengde: 3300, type: 'boenhet' });
  omtrent(kort.friHoyde, 1984.6); // 180 · 3300 / 260 − 300
  assert.equal(kort.varsler[0].niva, 'ma');
  assert.match(kort.varsler[0].tekst, /minst 3\s?323 mm/);
});

test('Krav 2,1 m for andre trapper enn inne i boligen', () => {
  const t = lagTrapphull(l2, { etasjeskiller: 300, type: 'flere' });
  assert.equal(t.krav, 2100);
  assert.equal(t.minsteHull, Math.ceil(3640 - 260 * ((2700 - 300 - 2100) / 180 - 1)));
});

test('Eget trinn øverst: ganglinja er flat over øverste trinn', () => {
  const l = losTrapp({ hoyde: 2700, lengdevalg: 'fri', ovreTrinn: 'eget', type: 'boenhet' }).valgt;
  const t = lagTrapphull(l, { etasjeskiller: 300, hullLengde: l.inntrinn / 2, type: 'boenhet' });
  // Kanten står over øverste trinn, som ligger i høyde med dekket: 2700 − 300 − 2700 < 0
  assert.ok(t.friHoyde < 0);
  assert.equal(t.varsler[0].niva, 'ma');
});

test('Hull lengre enn trappa: fri høyde fra gulvet foran trappa', () => {
  const t = lagTrapphull(l2, { etasjeskiller: 300, hullLengde: 5000, type: 'boenhet' });
  omtrent(t.friHoyde, 2400);
});

test('For tykk etasjeskiller og feil i inndata', () => {
  assert.match(lagTrapphull(l2, { etasjeskiller: 800, type: 'boenhet' }).feil[0], /mindre enn kravet/);
  assert.ok(lagTrapphull(l2, { etasjeskiller: 0 }).feil.length > 0);
  assert.ok(lagTrapphull(l2, { etasjeskiller: 300, hullLengde: -1 }).feil.length > 0);
});

test('Høyde målt slik det står nå: ferdig høyde = målt − gulv nede + gulv oppe', () => {
  const s = losTrapp({ hoyde: 2650, maltSom: 'naa', gulvNede: 20, gulvOppe: 15, lengdevalg: 'fri' });
  assert.equal(s.hoyde.ferdig, 2645);
  omtrent(s.valgt.opptrinn * s.valgt.antallOpptrinn, 2645, 1e-9);
  // Målt fra ferdig til ferdig: gulvene endrer ikke høyden
  assert.equal(losTrapp({ hoyde: 2650, gulvNede: 20, gulvOppe: 15, lengdevalg: 'fri' }).hoyde.ferdig, 2650);
  assert.ok(losTrapp({ hoyde: 2650, maltSom: 'naa', gulvOppe: -3, lengdevalg: 'fri' }).feil.length > 0);
});

test('Tette opptrinn: ett stusstrinn per trinn, opptrinn minus trinntykkelse høyt', () => {
  const l = losTrapp({ hoyde: 2700, lengdevalg: 'lengde', lengde: 3640, type: 'boenhet' }).valgt; // h 180, 14 trinn
  const vange = lagVange(l, { nese: 30, trinnTykkelse: 48 });
  const liste = lagTrappMaterialer({ l, vange, bredde: 900, trinnTykkelse: 48, nese: 30, stusstrinn: { tykkelse: 21 } });
  const st = liste.linjer.find((x) => x.del === 'Stusstrinn');
  assert.equal(st.antall, 14);
  assert.equal(st.dim.navn, '21 × 132'); // 180 − 48
  assert.equal(st.lengde, 950);
  assert.match(liste.varsler.find((v) => v.type === 'stusstrinn-nese').tekst, /9 mm fram/);
  // Tykkere stusstrinn enn nesa: bør sjekkes
  const tykk = lagTrappMaterialer({ l, vange, bredde: 900, trinnTykkelse: 48, nese: 20, stusstrinn: { tykkelse: 25 } });
  assert.equal(tykk.varsler.find((v) => v.type === 'stusstrinn-nese').niva, 'bor');
  assert.match(lagTrappMaterialer({ l, vange, bredde: 900, trinnTykkelse: 48, stusstrinn: { tykkelse: null } }).feil[0], /tykkelsen på stusstrinnene/);
});

test('Tegningen viser etasjeskiller, trapphull og fri høyde, rødt når hullet er for kort', async () => {
  const { tegnTrapp } = await import('../src/skjerm/trapp-tegning.js');
  const v = lagVange(l2, { nese: 20, trinnTykkelse: 48 });
  const minst = tegnTrapp(l2, v, { trinnTykkelse: 48, trapphull: lagTrapphull(l2, { etasjeskiller: 300, type: 'boenhet' }) });
  assert.ok(minst.includes('class="t-etasjeskiller"'));
  assert.ok(/Trapphull minst 3\s323 mm/.test(minst));
  assert.ok(/Fri høyde 2\s000/.test(minst));
  const kort = tegnTrapp(l2, v, { trinnTykkelse: 48, trapphull: lagTrapphull(l2, { etasjeskiller: 300, hullLengde: 3300, type: 'boenhet' }) });
  assert.ok(/Fri høyde 1\s985/.test(kort));
  assert.ok(kort.includes('var(--feil-tekst)'));
  // Uten trapphull: ingen etasjeskiller
  assert.ok(!tegnTrapp(l2, v, { trinnTykkelse: 48 }).includes('t-etasjeskiller'));
  // Stusstrinn: ett per trinn
  assert.equal(tegnTrapp(l2, v, { trinnTykkelse: 48, stusstrinn: 21 }).split('class="t-stusstrinn"').length - 1, 14);
});

test('Utskriften har trapphullet, ferdig høyde og stusstrinn', async () => {
  const { lagTrappUtskrift } = await import('../src/skjerm/trapp-utskrift.js');
  const s = losTrapp({ hoyde: 2690, maltSom: 'naa', gulvNede: 0, gulvOppe: 10, lengdevalg: 'lengde', lengde: 3640, type: 'boenhet' });
  const l = s.valgt;
  const valg = { nese: 30, trinnTykkelse: 48, vangeBredde: 223, vangeTykkelse: 48, beleggNede: 0, stusstrinn: 21 };
  const vange = lagVange(l, valg);
  const hull = lagTrapphull(l, { etasjeskiller: 300, hullLengde: 3300, type: 'boenhet' });
  const html = lagTrappUtskrift({ tilstand: {}, d: { type: 'boenhet', hoyde: 2700, ovreTrinn: 'dekke', lengdevalg: 'lengde', lengde: 3640 },
    l, vange, valg, liste: null, hull, hoyde: s.hoyde, versjon: 'test' });
  assert.ok(/2\s700 mm ferdig \(målt 2\s690/.test(html));
  assert.ok(html.includes('Etasjeskiller') && /3\s300 mm/.test(html));
  assert.ok(html.includes('Stusstrinn 21 mm'));
  assert.ok(html.includes('Fri høyde under kanten av trapphullet'));
  assert.ok(!html.includes('NaN') && !html.includes('undefined'));
});
