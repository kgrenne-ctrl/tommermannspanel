// Tester for veggmodellen (fase 3). Kjøres med: npm test
//
// ===================================================================================
// HÅNDREGNING – garasjevegg
// ===================================================================================
// Vegg 6000 × 2400 mm. Bord 148/148. Påbord i hjørnene og inn på karmen (standard).
// Innlegg på karm 10–20 mm, standard 15. Omlegg 20–25 mm, ideelt 25. Startvalg: venstre.
//   Vindu 1: 600 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//   Port:   2000 fra hjørnet, 2400 bred, 2100 høy, på bakken
//   Vindu 2: 4700 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//
// Med påbord i begge ender (O–O): L = k·148 + k·g + 148. Ideelt (o = 25, g = 98): L = 246·k + 148.
//
// 1) Venstre hjørne – Vindu 1. Hjørnet er fast, innlegget e0 på vindu 1 er fritt.
//    L = 600 + e0, altså 610–620.
//    k = 2: ideelt L = 640. For langt, så innlegget går til maks: e0 = 20, L = 620.
//           g = (620 − 296 − 148)/2 = 88, o = (148 − 88)/2 = 30  (varsel over 25)
//    k = 1: g = 620 − 148 − 148 = 324, bredere enn bordet, umulig.
//    Første underbord: (148 + 88)/2 = 118. Underbord: 118, 354. Påbord: 0, 236, 472.
//
// 2) Over og under vindu 1. e0 = 20 er nå fast, e1 er fritt.
//    Feltet går fra ytterkant av sidebordet til venstre til ytterkant av sidebordet til høyre:
//    L = 1000 + 2·148 − e0 − e1 = 1276 − e1, altså 1256–1266.
//    k = 5: ideelt L = 1378. For langt, så e1 = 10 og L = 1266.
//           g = (1266 − 740 − 148)/5 = 75,6, o = 36,2  (varsel)
//    k = 4: g = (1266 − 592 − 148)/4 = 131,5, o = 8,25, for lite.
//    Feltet starter på 600 + 20 − 148 = 472, samme sted som siste påbord i felt 1.
//    Det er det samme bordet, så rytmen fortsetter.
//
// 3) Vindu 1 – Port. e1 = 10 fast, e2 fritt. L = (2000 − 1600) + 10 + e2 = 420–430.
//    k = 1: g = L − 296 = 124–134, o under 12. For lite.
//    k = 2: g = (L − 444)/2 er negativ. Får ikke plass.
//    Feltet går ikke opp. Appen sier fra, og e2 settes til standard 15.
//
// 4) Over port. e2 = 15 fast, e3 fritt. L = 2400 + 296 − 15 − e3 = 2661–2671.
//    k = 10: ideelt L = 2608. For kort, så e3 = 20 og L = 2661.
//            g = (2661 − 1480 − 148)/10 = 103,3, o = 22,35  (innenfor 20–25)
// ===================================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losVegg } from '../src/tommermann/vegg.js';
import { losFelt } from '../src/tommermann/solver.js';

const naer = (faktisk, forventet, presisjon = 1e-6) =>
  assert.ok(Math.abs(faktisk - forventet) <= presisjon, `forventet ${forventet}, fikk ${faktisk}`);
const starter = (bord) => bord.map((b) => b.fra);
const felt = (r, navn) => r.felt.find((f) => f.navn === navn);

const GARASJE = {
  lengde: 6000, hoyde: 2400, bu: 148, bo: 148,
  apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 },
    { type: 'vindu', x: 4700, bredde: 1000, hoyde: 600, bunn: 1200 },
  ],
};

test('Garasje: felt 1, innlegget går til maks før omlegget justeres', () => {
  const r = losVegg(GARASJE);
  const f = felt(r, 'Venstre hjørne – Vindu 1');
  naer(r.apninger[0].innlegg.venstre, 20);
  naer(f.losning.L, 620);
  naer(f.losning.klaring, 88);
  naer(f.losning.omlegg, 30);
  assert.deepEqual(starter(f.underliggere), [118, 354]);
  assert.deepEqual(starter(f.overliggere), [0, 236, 472]);
});

test('Garasje: over og under vindu 1 fortsetter rytmen fra sidebordet', () => {
  const r = losVegg(GARASJE);
  const over = felt(r, 'Over vindu 1');
  const under = felt(r, 'Under vindu 1');
  naer(r.apninger[0].innlegg.hoyre, 10);
  naer(over.losning.L, 1266);
  naer(over.losning.omlegg, 36.2);
  naer(over.x0, 472);
  // Sidebordene er tatt ut: 5 underbord og 4 påbord mellom dem
  assert.equal(over.underliggere.length, 5);
  assert.equal(over.overliggere.length, 4);
  // Over og under har samme deling, bare ulik høyde
  assert.deepEqual(starter(over.underliggere), starter(under.underliggere));
  assert.equal(over.y0, 1800);
  assert.equal(under.y1, 1200);
});

test('Garasje: feltet mellom vindu 1 og porten går ikke opp, og appen sier det', () => {
  const r = losVegg(GARASJE);
  assert.equal(r.ok, false);
  const f = felt(r, 'Vindu 1 – Port');
  assert.equal(f.ok, false);
  assert.match(f.melding, /Ingen inndeling/);
  assert.ok(r.varsler.some((v) => v.felt === 'Vindu 1 – Port' && v.alvorlig));
  naer(r.apninger[1].innlegg.venstre, 15); // standard når feltet ikke går opp
});

test('Garasje: over porten treffer innenfor 20–25 mm', () => {
  const r = losVegg(GARASJE);
  const f = felt(r, 'Over port');
  naer(r.apninger[1].innlegg.hoyre, 20);
  naer(f.losning.L, 2661);
  naer(f.losning.omlegg, 22.35);
  assert.equal(felt(r, 'Under port'), undefined); // porten står på bakken
});

test('Garasje: kloss bak påbordet på hver side av hver åpning, lengde = åpningens høyde', () => {
  const r = losVegg(GARASJE);
  assert.deepEqual(r.klosser.map((k) => [k.apning, k.antall, k.lengde]),
    [['Vindu 1', 2, 600], ['Port', 2, 2100], ['Vindu 2', 2, 600]]);
});

test('Underbord inn på karmen gir ingen klosser', () => {
  const r = losVegg({ ...GARASJE, karmBord: 'U' });
  assert.equal(r.klosser.length, 0);
});

test('Innlegget brukes først: treffer ideelt omlegg når det går', () => {
  // Vindu 625 fra hjørnet. O–O, k = 2: ideelt L = 640 = 625 + 15. Innlegget blir 15, omlegg 25.
  const r = losVegg({ lengde: 3000, hoyde: 2400, bu: 148, bo: 148,
    apninger: [{ type: 'vindu', x: 625, bredde: 1000, hoyde: 600, bunn: 1200 }] });
  const f = felt(r, 'Venstre hjørne – Vindu');
  naer(r.apninger[0].innlegg.venstre, 15);
  naer(f.losning.omlegg, 25);
  // Vindu 630: da må innlegget ned til 10 for å treffe 640, og omlegget blir fortsatt 25.
  const r2 = losVegg({ lengde: 3000, hoyde: 2400, bu: 148, bo: 148,
    apninger: [{ type: 'vindu', x: 630, bredde: 1000, hoyde: 600, bunn: 1200 }] });
  naer(r2.apninger[0].innlegg.venstre, 10);
  naer(felt(r2, 'Venstre hjørne – Vindu').losning.omlegg, 25);
});

test('Vegg uten åpninger regnes som ett felt', () => {
  const r = losVegg({ lengde: 1350, hoyde: 2400, bu: 148, bo: 148, hjorneVenstre: 'U', hjorneHoyre: 'U' });
  const enkelt = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  assert.equal(r.felt.length, 1);
  assert.deepEqual(starter(r.felt[0].underliggere), starter(enkelt.underliggere));
});

test('Startvalg om midten av et vindu gir likt innlegg på begge sider av det', () => {
  const r = losVegg({ ...GARASJE, startvalg: 'apning:0' });
  naer(r.apninger[0].innlegg.venstre, r.apninger[0].innlegg.hoyre);
});

test('Startvalg flytter justeringen', () => {
  // Fra høyre regnes høyre hjørne først, og feltet der får fritt innlegg.
  const v = losVegg({ ...GARASJE, startvalg: 'venstre' });
  const h = losVegg({ ...GARASJE, startvalg: 'hoyre' });
  assert.notDeepEqual(v.apninger.map((a) => a.innlegg), h.apninger.map((a) => a.innlegg));
});

test('Alle felt henger sammen: sidebordene er felles, og innlegget holder seg innenfor 10–20', () => {
  for (const startvalg of ['venstre', 'hoyre', 'midten', 'apning:1']) {
    for (const karmBord of ['U', 'O']) {
      const r = losVegg({ ...GARASJE, startvalg, karmBord });
      for (const a of r.apninger) {
        for (const e of [a.innlegg.venstre, a.innlegg.hoyre]) assert.ok(e >= 10 - 1e-9 && e <= 20 + 1e-9);
      }
      for (const [j, a] of r.apninger.entries()) {
        const venstreFelt = r.felt.filter((f) => f.type === 'side')[j];
        const hoyreFelt = r.felt.filter((f) => f.type === 'side')[j + 1];
        // Sidefeltene slutter og starter inne på karmen
        if (venstreFelt.ok) naer(venstreFelt.x1, a.x + a.innlegg.venstre);
        naer(hoyreFelt.x0, a.x + a.bredde - a.innlegg.hoyre);
        // Over-feltet starter og slutter på ytterkanten av sidebordene (bu = bo = 148 her)
        const over = r.felt.find((f) => f.apning === a.navn && f.type === 'over');
        if (over && over.ok) {
          naer(over.x0, a.x + a.innlegg.venstre - 148);
          naer(over.x1, a.x + a.bredde - a.innlegg.hoyre + 148);
          assert.ok(over.losning.omlegg >= 20 - 1e-9);
        }
      }
    }
  }
});

test('Feil i veggen gir tydelige meldinger', () => {
  const r = losVegg({ ...GARASJE, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'vindu', x: 1500, bredde: 1000, hoyde: 600, bunn: 2000 },
  ] });
  assert.equal(r.ok, false);
  assert.ok(r.feil.some((t) => /overlapper/.test(t)));
  assert.ok(r.feil.some((t) => /over toppen/.test(t)));
});

test('Dør som ikke står på bakken gir tydelig varsel', () => {
  const r = losVegg({ lengde: 6509, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'dor', x: 3710, bredde: 1000, hoyde: 250, bunn: 2100 },
  ] });
  assert.ok(r.varsler.some((v) => v.felt === 'Dør' && v.alvorlig && /Står 2100 mm over bakken/.test(v.tekst)));
  const paBakken = losVegg({ ...GARASJE });
  assert.ok(!paBakken.varsler.some((v) => /over bakken/.test(v.tekst)));
});

test('Åpenbart feile mål (1 mm høy dør) gir varsel om å sjekke målene', () => {
  const r = losVegg({ lengde: 6509, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'dor', x: 3710, bredde: 1000, hoyde: 1, bunn: 0 },
  ] });
  assert.ok(r.varsler.some((v) => v.alvorlig && /Høyden er bare 1 mm/.test(v.tekst)));
  assert.ok(!losVegg(GARASJE).varsler.some((v) => /Sjekk målene/.test(v.tekst)));
});
