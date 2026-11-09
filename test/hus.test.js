// Tester for hjørner og hus (fase 4). Håndregnet:
// Bordtykkelse 19 mm. Påbord i hjørnet: kledningen er 19 + 19 = 38 mm tykk der.
// Underbord i hjørnet: 19 mm.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losHus, forlengelse, tykkelseIHjornet, naboer, speilHjorne } from '../src/tommermann/hus.js';
import { lagMerkeliste } from '../src/tommermann/vegg.js';

const E = 1e-6;
const VEGG = { lengde: 3000, hoyde: 2400, bu: 148, bo: 148 };
const hj = (venstre, hoyre, kasse = 98) => ({ venstre: { type: venstre, kasse }, hoyre: { type: hoyre, kasse } });
const sum = (f) => f.losning.L;

test('forlengelse: forbi gir pluss tykkelsen, mot gir 0, kasse gir minus bredden', () => {
  assert.equal(forlengelse({ type: 'forbi' }, 38), 38);
  assert.equal(forlengelse({ type: 'mot' }, 38), 0);
  assert.equal(forlengelse({ type: 'kasse', kasse: 98 }, 38), -98);
  assert.equal(tykkelseIHjornet({ hjorneVenstre: 'O' }, 'venstre'), 38);
  assert.equal(tykkelseIHjornet({ hjorneHoyre: 'U' }, 'hoyre'), 19);
  assert.equal(tykkelseIHjornet({ hjorneHoyre: 'O', tykkelseUnder: 19, tykkelseOver: 22 }, 'hoyre'), 41);
  assert.equal(speilHjorne('forbi'), 'mot');
  assert.equal(speilHjorne('kasse'), 'kasse');
});

test('naboer: åpen rekke og lukket hus', () => {
  assert.deepEqual(naboer(0, 4, true), { venstre: 3, hoyre: 1 });
  assert.deepEqual(naboer(3, 4, true), { venstre: 2, hoyre: 0 });
  assert.deepEqual(naboer(0, 4, false), { venstre: null, hoyre: 1 });
  // To vegger kan ikke gå rundt et hus
  assert.deepEqual(naboer(1, 2, true), { venstre: 0, hoyre: null });
  assert.deepEqual(naboer(0, 1, true), { venstre: null, hoyre: null });
});

test('én vegg som går forbi i begge ender: feltet blir 3000 + 38 + 38 = 3076', () => {
  const { vegger: [r] } = losHus({ vegger: [{ ...VEGG, hjorner: hj('forbi', 'forbi') }] });
  assert.equal(r.ok, true);
  assert.equal(r.felt.length, 1);
  assert.ok(Math.abs(sum(r.felt[0]) - 3076) < E);
  // Nullpunktet er hjørnet på veggen: kledningen starter 38 mm før det
  assert.ok(Math.abs(r.felt[0].x0 + 38) < E);
  assert.ok(Math.abs(r.felt[0].x1 - 3038) < E);
  assert.equal(r.felt[0].overliggere[0].fra, -38);
});

test('hjørnekasse 98 mm i begge ender: feltet blir 3000 − 2 · 98 = 2804 og starter på 98', () => {
  const { vegger: [r] } = losHus({ vegger: [{ ...VEGG, hjorner: hj('kasse', 'kasse') }] });
  assert.ok(Math.abs(sum(r.felt[0]) - 2804) < E);
  assert.ok(Math.abs(r.felt[0].x0 - 98) < E);
  assert.equal(r.felt[0].overliggere[0].fra, 98);
});

test('lukket hus med fire vegger: tillegget er naboveggens tykkelse i hjørnet', () => {
  // Hver vegg går forbi i høyre hjørne og slutter mot naboen i venstre. Vegg 2 har
  // underbord i venstre hjørne, så vegg 1 får bare 19 mm tillegg der.
  const vegger = [
    { ...VEGG, navn: 'Vegg 1', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 2', lengde: 4000, hjorneVenstre: 'U', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 3', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 4', lengde: 4000, hjorner: hj('mot', 'forbi') },
  ];
  const { vegger: r } = losHus({ vegger, lukket: true });
  assert.ok(Math.abs(sum(r[0].felt[0]) - (3000 + 19)) < E);
  assert.ok(Math.abs(sum(r[1].felt[0]) - (4000 + 38)) < E);
  assert.ok(Math.abs(sum(r[3].felt[0]) - (4000 + 38)) < E, 'siste vegg møter første');
  for (const v of r) assert.equal(v.varsler.filter((x) => x.alvorlig).length, 0);
});

test('hjørne som ikke henger sammen gir alvorlig varsel', () => {
  const vegger = [
    { ...VEGG, navn: 'Nord', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Øst', hjorner: hj('forbi', 'mot') },
  ];
  const { vegger: r } = losHus({ vegger, lukket: false });
  assert.match(r[0].varsler[0].tekst, /Både denne veggen og Øst/);
  assert.match(r[1].varsler[0].tekst, /Både denne veggen og Nord/);
  // Frie ender (ingen nabo) gir ikke varsel
  assert.equal(r[0].varsler.filter((x) => x.felt === 'Venstre hjørne' && x.alvorlig).length, 0);
});

test('vegg som ikke er fylt ut, er fortsatt nabo, men regnes ikke', () => {
  const { vegger: r } = losHus({ vegger: [{ ...VEGG, hjorner: hj('mot', 'forbi') }, null] });
  assert.equal(r[1], null);
  // Uten utfylt nabo regnes naboen som lik veggen selv (påbord i hjørnet: 38 mm)
  assert.ok(Math.abs(sum(r[0].felt[0]) - 3038) < E);
});

test('åpning inne i hjørnekassa er en feil', () => {
  const { vegger: [r] } = losHus({ vegger: [{ ...VEGG, hjorner: hj('kasse', 'mot'),
    apninger: [{ type: 'vindu', x: 50, bredde: 1000, hoyde: 600, bunn: 1200 }] }] });
  assert.match(r.feil[0], /hjørnekassa til venstre/);
});

test('merkelista får minusmål når bordet går forbi hjørnet', () => {
  // Fri ende uten nabovegg: veggens egen tykkelse i hjørnet brukes. Underbord i venstre
  // hjørne gir 19 mm, så første underbord starter 19 mm før hjørnet.
  const { vegger: [r] } = losHus({ vegger: [{ ...VEGG, hjorneVenstre: 'U', hjorner: hj('forbi', 'mot') }] });
  const liste = lagMerkeliste(r);
  assert.equal(liste[0].fra, -19);
  assert.equal(liste[0].referanse, 'hjørnet');
});
