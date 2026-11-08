// Tester for veggmodellen (fase 3). Kjøres med: npm test
//
// ===================================================================================
// HÅNDREGNING – garasjevegg
// ===================================================================================
// Vegg 6000 × 2400 mm. Bord 148/148. Påbord i hjørnene og inn på karmen (standard).
// Innlegg på karm 10–20 mm, standard 15, SAMME på begge sider av en åpning.
// Omlegg 20–25 mm, ideelt 25. Startvalg: venstre.
//   Vindu 1: 600 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//   Port:   2000 fra hjørnet, 2400 bred, 2100 høy, på bakken
//   Vindu 2: 4700 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//
// Med påbord i begge ender (O–O): L = k·148 + k·g + 148, altså g = (L − 148·k − 148)/k.
//
// 1) Vindu 1, innlegg e. Avgjør feltet til venstre og feltet over/under (teller to felt).
//    Venstre felt:  L = 600 + e.            k = 2.
//    Over/under:    L = 1000 + 2·148 − 2e.  k = 5.
//    e = 10: venstre L = 610, g = (610 − 296 − 148)/2 = 83,   o = 32,5
//            over    L = 1276, g = (1276 − 740 − 148)/5 = 77,6, o = 35,2
//            mm over 25: 7,5 + 2 × 10,2 = 27,9
//    e = 20: venstre L = 620, g = 88,   o = 30
//            over    L = 1256, g = 73,6, o = 37,2
//            mm over 25: 5 + 2 × 12,2 = 29,4
//    Hver mm mer innlegg gir 0,25 mm mindre omlegg til venstre, men 0,2 mm mer over og under
//    (som teller dobbelt). e = 10 er best. Feltet over starter på 600 + 10 − 148 = 462.
//
// 2) Port, innlegg e. Avgjør feltet mellom vindu 1 og porten, og feltet over porten.
//    Mellom: L = (2000 − 1600) + 10 + e = 420–430. k = 1 gir g = 124–134 og o under 12.
//            k = 2 gir negativ g. Feltet går ikke opp, uansett innlegg.
//    Over porten: L = 2400 + 296 − 2e = 2656–2676. k = 10: ideelt L = 2608.
//            e = 20: L = 2656, g = (2656 − 1480 − 148)/10 = 102,8, o = 22,6 (nærmest 25)
//            e = 10: L = 2676, g = 104,8, o = 21,6
//    e = 20 er best.
// ===================================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losVegg, foreslaVegg, vurderVegg } from '../src/tommermann/vegg.js';
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

test('Garasje: vindu 1 får innlegg 10 på begge sider (punkt 1 i håndregningen)', () => {
  const r = losVegg(GARASJE);
  assert.deepEqual(r.apninger[0].innlegg, { venstre: 10, hoyre: 10 });
  const f = felt(r, 'Venstre hjørne – Vindu 1');
  naer(f.losning.L, 610);
  naer(f.losning.klaring, 83);
  naer(f.losning.omlegg, 32.5);
  // Første underbord: (148 + 83)/2 = 115,5, så 115,5 + 231 = 346,5. Påbord: 0, 231, 462.
  assert.deepEqual(starter(f.underliggere), [116, 347]);
  assert.deepEqual(starter(f.overliggere), [0, 231, 462]);
});

test('Garasje: over og under vindu 1 fortsetter rytmen fra sidebordet', () => {
  const r = losVegg(GARASJE);
  const over = felt(r, 'Over vindu 1');
  const under = felt(r, 'Under vindu 1');
  naer(over.losning.L, 1276);
  naer(over.losning.omlegg, 35.2);
  naer(over.x0, 462); // samme sted som siste påbord i feltet til venstre
  // Sidebordene er tatt ut: 5 underbord og 4 påbord mellom dem
  assert.equal(over.underliggere.length, 5);
  assert.equal(over.overliggere.length, 4);
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
});

test('Garasje: porten får innlegg 20, og over porten blir 22,6 mm (punkt 2)', () => {
  const r = losVegg(GARASJE);
  assert.deepEqual(r.apninger[1].innlegg, { venstre: 20, hoyre: 20 });
  const f = felt(r, 'Over port');
  naer(f.losning.L, 2656);
  naer(f.losning.omlegg, 22.6);
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

test('Innlegget er alltid likt på begge sider av hver åpning', () => {
  for (const startvalg of ['venstre', 'hoyre', 'midten', 'apning:0', 'apning:2']) {
    for (const a of losVegg({ ...GARASJE, startvalg }).apninger) {
      assert.equal(a.innlegg.venstre, a.innlegg.hoyre, `${a.navn} med start ${startvalg}`);
    }
  }
});

test('Startvalg flytter justeringen', () => {
  // To vinduer i en 5000 mm vegg. Fra venstre velges vindu 1 først, fra høyre vindu 2 først.
  const vegg = { lengde: 5000, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 1000, bunn: 900 },
    { type: 'vindu', x: 2210, bredde: 1000, hoyde: 1000, bunn: 900 },
  ] };
  const v = losVegg({ ...vegg, startvalg: 'venstre' });
  const h = losVegg({ ...vegg, startvalg: 'hoyre' });
  assert.deepEqual(v.apninger.map((a) => a.innlegg.venstre), [10, 20]);
  assert.deepEqual(h.apninger.map((a) => a.innlegg.venstre), [20, 10]);
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

test('Forslag: bare oppsett som er bedre, og hvert forslag gir det det lover', () => {
  const f = foreslaVegg(GARASJE);
  assert.equal(f.naa.ikkeOpp, 1);
  const alle = [...f.sammeBord, ...f.andreBord];
  assert.ok(f.andreBord.length > 0, 'skal finne andre bord som går bedre opp');
  assert.equal(f.andreBord[0].vurdering.ikkeOpp, 0, 'beste forslag skal få alle felt til å gå opp');
  for (const v of alle) {
    // Bruk forslaget og regn på nytt: skal gi nøyaktig samme vurdering
    const r = losVegg({ ...GARASJE, ...v.oppsett });
    assert.deepEqual(vurderVegg(r), v.vurdering);
    // Og være bedre enn dagens
    const bedre = v.vurdering.ikkeOpp < f.naa.ikkeOpp
      || (v.vurdering.ikkeOpp === f.naa.ikkeOpp && v.vurdering.spikring < f.naa.spikring)
      || (v.vurdering.ikkeOpp === f.naa.ikkeOpp && v.vurdering.spikring === f.naa.spikring
        && (v.vurdering.overMaks < f.naa.overMaks || v.vurdering.overskudd < f.naa.overskudd));
    assert.ok(bedre, `forslaget ${v.endring.join(', ')} er ikke bedre`);
    assert.ok(v.endring.length > 0, 'forslaget skal si hva som endres');
  }
  // Med samme bord skal bordbredden ikke endres
  for (const v of f.sammeBord) assert.deepEqual([v.oppsett.bu, v.oppsett.bo], [148, 148]);
});

test('Forslag: en vegg som allerede er perfekt, får ingen forslag', () => {
  // Ett felt på 640 mm med påbord i begge ender: 2 underbord, omlegg akkurat 25.
  const f = foreslaVegg({ lengde: 640, hoyde: 2400, bu: 148, bo: 148 });
  assert.equal(f.naa.overMaks, 0);
  assert.equal(f.sammeBord.length + f.andreBord.length, 0);
});
