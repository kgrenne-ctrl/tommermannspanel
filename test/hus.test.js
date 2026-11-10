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

test('Hjørneoversikt: lukket hus med fire vegger gir fire hjørner med hvem som går forbi', async () => {
  const { lagHjorneoversikt, hjorneLinjer } = await import('../src/tommermann/hus.js');
  const vegger = [3000, 5000, 3000, 5000].map((lengde, i) => ({ ...VEGG, lengde, navn: `Vegg ${i + 1}`,
    hjorner: hj('mot', 'forbi') }));
  const resultater = losHus({ vegger, lukket: true }).vegger;
  const o = lagHjorneoversikt({ vegger, resultater, lukket: true });
  assert.equal(o.hjorner.length, 4);
  assert.equal(o.frie.length, 0);
  // H4: Vegg 4 høyre møter Vegg 1 venstre
  assert.deepEqual([o.hjorner[3].a.navn, o.hjorner[3].b.navn], ['Vegg 4', 'Vegg 1']);
  // H1: Vegg 1 går forbi med 38, Vegg 2 slutter mot med 19 og kløyves til 148 − 19 = 129
  const h1 = o.hjorner[0];
  assert.equal(h1.forbi, 'A');
  assert.deepEqual([h1.a.tillegg, h1.b.tillegg, h1.b.klyv, h1.b.kloyvesTil], [38, 19, 19, 129]);
  const tekst = hjorneLinjer(o)[0];
  assert.equal(tekst.tittel, 'H1: Vegg 1 (høyre) møter Vegg 2 (venstre)');
  assert.deepEqual(tekst.linjer, ['Går forbi: Vegg 1 (38 mm forbi hjørnet).',
    'Slutter mot: Vegg 2 (19 mm forbi hjørnet). Hjørnebordet kløyves til 129 mm.', 'Påbord mot påbord.']);
});

test('Hjørneoversikt: åpen rekke har frie ender, og feil hjørne sies fra', async () => {
  const { lagHjorneoversikt, hjorneLinjer } = await import('../src/tommermann/hus.js');
  const vegger = [{ ...VEGG, navn: 'Nord', hjorner: hj('mot', 'forbi') }, { ...VEGG, navn: 'Øst', hjorner: hj('forbi', 'mot') }];
  const o = lagHjorneoversikt({ vegger, resultater: losHus({ vegger, lukket: false }).vegger, lukket: false });
  assert.equal(o.hjorner.length, 1);
  assert.match(o.hjorner[0].feil, /Både Nord og Øst går forbi/);
  assert.deepEqual(o.frie.map((e) => [e.navn, e.side]), [['Nord', 'venstre'], ['Øst', 'hoyre']]);
  assert.equal(hjorneLinjer(o).length, 3);
});

test('Målkontroll: motstående vegger i et firkantet hus skal være like lange', async () => {
  const { kontrollerFirkant } = await import('../src/tommermann/hus.js');
  const v = (l) => l.map((lengde, i) => ({ lengde, navn: `Vegg ${i + 1}` }));
  assert.deepEqual(kontrollerFirkant(v([3000, 5000, 3020, 5000])), []);
  const feil = kontrollerFirkant(v([3000, 5000, 3100, 5000]));
  assert.equal(feil.length, 1);
  assert.match(feil[0], /Vegg 1 \(3000 mm\) og Vegg 3 \(3100 mm\).*100 mm forskjell/);
  assert.deepEqual(kontrollerFirkant(v([3000, 5000, 3000])), []); // bare for fire vegger
});

// ---------- Forslag regnet gjennom huset (Kenny 2026-11-10) ----------

const vindu = (x, bredde = 1000) => ({ type: 'vindu', x, bredde, hoyde: 1200, bunn: 900 });
const hjorner = (venstre, hoyre) => ({ venstre: { type: venstre }, hoyre: { type: hoyre } });
const FIRE = { lukket: true, vegger: [
  { navn: 'Vegg 1', lengde: 4300, hoyde: 2400, bu: 148, bo: 148, hjorner: hjorner('forbi', 'forbi'), startvalg: 'venstre', apninger: [vindu(700)] },
  { navn: 'Vegg 2', lengde: 6000, hoyde: 2400, bu: 148, bo: 148, hjorner: hjorner('mot', 'mot'), apninger: [vindu(900), vindu(3500)] },
  { navn: 'Vegg 3', lengde: 4300, hoyde: 2400, bu: 148, bo: 148, hjorner: hjorner('forbi', 'forbi'), apninger: [] },
  { navn: 'Vegg 4', lengde: 6000, hoyde: 2400, bu: 148, bo: 148, hjorner: hjorner('mot', 'mot'), apninger: [vindu(2000, 1400)] }] };
const ulikeBord = (r) => r.varsler.filter((v) => v.type === 'hjorne-bord').length;
// Tar forslaget i bruk på vegg k og regner hele huset på nytt
const medForslag = (hus, k, forslag) => losHus({ ...hus,
  vegger: hus.vegger.map((v, i) => (i === k ? { ...v, ...forslag.oppsett } : v)) }).vegger;

test('Forslag gjennom huset: en vegg med frie ender får forslag som holder når hjørnebordet byttes', async () => {
  const { foreslaHus } = await import('../src/tommermann/hus.js');
  const { vurderVegg } = await import('../src/tommermann/vegg.js');
  // I en fri ende regnes naboen som lik veggen selv. Byttes hjørnebordet, endres derfor også
  // hvor langt feltet går. Regnet alene med hjørnene låst lovet «underbord i hjørnene»
  // 35,2 mm som verste omlegg. Det blir 37,0 mm.
  const hus = { vegger: [{ navn: 'Vegg 1', lengde: 4300, hoyde: 2400, bu: 148, bo: 148, startvalg: 'venstre',
    hjorner: hjorner('mot', 'mot'), apninger: [vindu(700)] }] };
  const f = foreslaHus(hus, 0);
  const iHjornene = f.sammeBord.find((x) => x.endring.join() === 'underbord i hjørnene');
  assert.ok(iHjornene, 'skal foreslå underbord i hjørnene');
  assert.ok(Math.abs(iHjornene.vurdering.verstOmlegg - 37) < 0.05);
  for (const x of [...f.sammeBord, ...f.andreBord]) {
    assert.deepEqual(vurderVegg(medForslag(hus, 0, x)[0]), x.vurdering, x.endring.join(', '));
    assert.deepEqual(x.naboer, []);
  }
});

test('Forslag gjennom huset: bytter ikke hjørnebord når naboveggen har det samme, og rører ikke naboveggene', async () => {
  const { foreslaHus } = await import('../src/tommermann/hus.js');
  const { vurderVegg } = await import('../src/tommermann/vegg.js');
  const naa = losHus(FIRE).vegger;
  let antall = 0;
  for (let k = 0; k < 4; k++) {
    const f = foreslaHus(FIRE, k, { antall: 10 });
    for (const x of [...f.sammeBord, ...f.andreBord]) {
      antall++;
      assert.deepEqual([x.oppsett.hjorneVenstre, x.oppsett.hjorneHoyre], ['O', 'O'], `${x.endring.join(', ')} på vegg ${k + 1}`);
      const etter = medForslag(FIRE, k, x);
      assert.deepEqual(vurderVegg(etter[k]), x.vurdering);
      etter.forEach((r, i) => { if (i !== k) assert.deepEqual(r.felt, naa[i].felt); });
    }
  }
  assert.ok(antall > 0, 'huset skal ha vegger som får forslag');
});

test('Forslag gjennom huset: retter ulikt bord i hjørnet, sier hvilke nabovegger som endres, og gjør ingen dårligere', async () => {
  const { foreslaHus } = await import('../src/tommermann/hus.js');
  const { vurderVegg } = await import('../src/tommermann/vegg.js');
  // Vegg 2 har underbord ytterst i begge hjørner, naboene (vegg 1 og 3) har påbord
  const hus = { ...FIRE, vegger: FIRE.vegger.map((v, i) => (i === 1 ? { ...v, hjorneVenstre: 'U', hjorneHoyre: 'U' } : v)) };
  const naa = losHus(hus).vegger;
  assert.deepEqual(naa.map(ulikeBord), [1, 2, 1, 0]);
  const f = foreslaHus(hus, 1, { antall: 20 });
  const alle = [...f.sammeBord, ...f.andreBord];
  const medNabo = alle.filter((x) => x.naboer.length);
  assert.ok(medNabo.length > 0, 'skal finne forslag som endrer en nabovegg');
  for (const x of alle) {
    const etter = medForslag(hus, 1, x);
    assert.deepEqual(vurderVegg(etter[1]), x.vurdering, x.endring.join(', '));
    assert.ok(ulikeBord(etter[1]) <= ulikeBord(naa[1]));
    for (const i of [0, 2]) {
      // Naboveggen står i forslaget akkurat når den blir annerledes, og den blir aldri dårligere
      const endret = JSON.stringify(etter[i].felt) !== JSON.stringify(naa[i].felt) || ulikeBord(etter[i]) !== ulikeBord(naa[i]);
      const nabo = x.naboer.find((n) => n.navn === hus.vegger[i].navn);
      assert.equal(Boolean(nabo), endret, `${x.endring.join(', ')}: ${hus.vegger[i].navn}`);
      const a = vurderVegg(etter[i]); const b = vurderVegg(naa[i]);
      assert.ok(ulikeBord(etter[i]) <= ulikeBord(naa[i]));
      assert.ok(a.ikkeOpp <= b.ikkeOpp && a.spikring <= b.spikring && a.overMaks <= b.overMaks);
    }
  }
  // Påbord i begge hjørner på vegg 2 fjerner varselet på begge naboveggene
  const begge = medNabo.find((x) => x.oppsett.hjorneVenstre === 'O' && x.oppsett.hjorneHoyre === 'O');
  assert.ok(begge);
  assert.deepEqual(begge.naboer.map((n) => [n.navn, n.bedre]), [['Vegg 1', true], ['Vegg 3', true]]);
});
