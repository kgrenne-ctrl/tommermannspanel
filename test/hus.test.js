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
  assert.equal(forlengelse({ type: 'mot' }, { tykkelse: 38, innside: 19 }), 19);
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

test('lukket hus med fire vegger: tillegget kommer fra naboveggen i hvert hjørne', () => {
  // Hver vegg går forbi i høyre hjørne og slutter mot naboen i venstre. Vegg 2 har
  // underbord i venstre hjørne. Håndregnet (19 mm bord):
  // Vegg 1: venstre mot vegg 4 (påbord ytterst) +19, høyre forbi vegg 2 (underbord) +19 = 3038
  // Vegg 2: venstre mot vegg 1 (påbord) +19, høyre forbi vegg 3 (påbord) +38 = 4057
  // Vegg 4: venstre mot vegg 3 (påbord) +19, høyre forbi vegg 1 (påbord) +38 = 4057
  const vegger = [
    { ...VEGG, navn: 'Vegg 1', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 2', lengde: 4000, hjorneVenstre: 'U', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 3', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'Vegg 4', lengde: 4000, hjorner: hj('mot', 'forbi') },
  ];
  const { vegger: r } = losHus({ vegger, lukket: true });
  const dekker = (x) => x.kledning.til - x.kledning.fra;
  assert.ok(Math.abs(dekker(r[0]) - 3038) < E);
  assert.ok(Math.abs(dekker(r[1]) - 4057) < E);
  assert.ok(Math.abs(dekker(r[3]) - 4057) < E, 'siste vegg møter første');
  // Hjørnebordet der veggen slutter mot naboen kløyves med tykkelsen på naboens hjørnebord
  // (påbord 19 mm). Delingen regnes da over 19 mm mer, så feltet blir 3038 + 19 = 3057.
  assert.deepEqual(r[0].klyv, { venstre: 19, hoyre: 0 });
  assert.ok(Math.abs(sum(r[0].felt[0]) - 3057) < E);
  for (const v of r) assert.equal(v.varsler.filter((x) => x.alvorlig).length, 0);
  // Vegg 1 har påbord og vegg 2 underbord ytterst i hjørnet de deler: varsel på begge
  assert.ok(r[0].varsler.some((x) => x.type === 'hjorne-bord' && x.felt === 'Høyre hjørne'));
  assert.ok(r[1].varsler.some((x) => x.type === 'hjorne-bord' && x.felt === 'Venstre hjørne'));
  assert.ok(!r[2].varsler.some((x) => x.type === 'hjorne-bord'));
});

// De to hjørneløsningene Kenny viste (2026-11-09), horisontalsnitt. Vegg A går forbi i høyre
// hjørne, vegg B slutter mot den i venstre.
test('Underbord i hjørnet: A går 19 mm forbi, B slutter i hjørnet', () => {
  const vegger = [
    { ...VEGG, navn: 'A', hjorneHoyre: 'U', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'B', hjorneVenstre: 'U', hjorner: hj('mot', 'mot') },
  ];
  const { vegger: [a, b] } = losHus({ vegger, lukket: false });
  assert.equal(a.forleng.hoyre, 19); // dekker enden av underbordet på B
  assert.equal(b.forleng.venstre, 0); // underbordet på B starter ved lekta på A
  assert.ok(!a.varsler.some((x) => x.type === 'hjorne-bord'));
});

test('Påbord i hjørnet: A går 38 mm forbi, B går 19 mm forbi så påbordene møtes', () => {
  const vegger = [
    { ...VEGG, navn: 'A', hjorneHoyre: 'O', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'B', hjorneVenstre: 'O', hjorner: hj('mot', 'mot') },
  ];
  const { vegger: [a, b] } = losHus({ vegger, lukket: false });
  // A: påbordet dekker både klossen (19) og påbordet (19) på B
  assert.equal(a.forleng.hoyre, 38);
  // B: påbordet går inn til innsiden av påbordet på A, altså over klossen bak hjørnet (19)
  assert.equal(b.forleng.venstre, 19);
  assert.equal(b.felt[0].overliggere[0].fra, -19);
  // Klossen bak hjørnet: varsel om underlag på begge
  assert.ok(a.varsler.some((x) => x.type === 'underlag-hjorne' && x.felt === 'Høyre hjørne'));
  assert.ok(b.varsler.some((x) => x.type === 'underlag-hjorne' && x.felt === 'Venstre hjørne'));
});

test('Påbord 22 mm og underbord 19 mm: tilleggene følger tykkelsene på naboveggen', () => {
  const t = { tykkelseUnder: 19, tykkelseOver: 22 };
  const vegger = [
    { ...VEGG, ...t, hjorneHoyre: 'O', hjorner: hj('mot', 'forbi') },
    { ...VEGG, ...t, hjorneVenstre: 'O', hjorner: hj('mot', 'mot') },
  ];
  const { vegger: [a, b] } = losHus({ vegger, lukket: false });
  assert.equal(a.forleng.hoyre, 41);
  assert.equal(b.forleng.venstre, 19);
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
  // Uten utfylt nabo regnes naboen som lik veggen selv (påbord ytterst): venstre slutter mot
  // naboen og går 19 mm forbi, høyre går forbi med 38 mm. Dekker 3000 + 19 + 38 = 3057
  assert.ok(Math.abs(r[0].kledning.til - r[0].kledning.fra - 3057) < E);
  assert.equal(r[0].klyv.venstre, 19);
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

test('Kløyving: hjørnebordet på veggen som slutter mot blir smalere med naboens hjørnebord', () => {
  // Påbord mot påbord, 148 mm bord, 19 mm tykke. B slutter mot A.
  // Sett fra B: endeveden på påbordet til A (19) + påbordet på B. Kløyves det 19 mm, blir
  // hjørnet 19 + 129 = 148 mm, like bredt som fra A.
  const vegger = [
    { ...VEGG, navn: 'A', hjorner: hj('mot', 'forbi') },
    { ...VEGG, navn: 'B', hjorner: hj('mot', 'mot') },
  ];
  const { vegger: [a, b] } = losHus({ vegger, lukket: false });
  assert.equal(a.klyv.hoyre, 0); // går forbi, kløyves ikke
  assert.equal(b.klyv.venstre, 19);
  const bord = b.felt[0].overliggere[0];
  assert.ok(Math.abs(bord.fraEksakt + 19) < E); // starter fortsatt 19 mm før hjørnet
  assert.ok(Math.abs(bord.bredde - 129) < E);
  assert.equal(bord.klyvd, 19);
  assert.deepEqual(b.felt[0].hjornebord.start, { type: 'O', klyvd: 19, bredde: bord.bredde });
  // Resten av delingen: neste påbord står like langt fra hjørnebordets innerkant som vanlig
  const neste = b.felt[0].overliggere[1];
  assert.ok(Math.abs(neste.fraEksakt - bord.tilEksakt - b.felt[0].losning.senteravstand + 148) < 1e-6);
});

test('Kløyving med underbord mot underbord: 19 mm av underbordet', () => {
  const vegger = [
    { ...VEGG, hjorneHoyre: 'U', hjorner: hj('mot', 'forbi') },
    { ...VEGG, hjorneVenstre: 'U', tykkelseUnder: 22, hjorner: hj('mot', 'mot') },
  ];
  const { vegger: [, b] } = losHus({ vegger, lukket: false });
  // Naboens hjørnebord er et underbord på 19 mm (A har 19 mm underbord)
  assert.equal(b.klyv.venstre, 19);
  assert.ok(Math.abs(b.felt[0].underliggere[0].bredde - 129) < E);
  assert.ok(Math.abs(b.felt[0].underliggere[0].fraEksakt) < E); // starter i hjørnet
});
