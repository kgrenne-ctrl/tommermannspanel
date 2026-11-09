// Tester for veggmodellen (fase 3). Kjøres med: npm test
//
// ===================================================================================
// HÅNDREGNING – garasjevegg
// ===================================================================================
// Vegg 6000 × 2400 mm. Bord 148/148. Påbord i hjørnene og inn på karmen (standard).
// Innlegg på karm 10–20 mm, standard 15, SAMME på begge sider av en åpning.
// Omlegg minst 20 mm, ideelt 25, varsel over 30. Startvalg: venstre.
//   Vindu 1: 600 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//   Port:   2000 fra hjørnet, 2400 bred, 2100 høy, på bakken
//   Vindu 2: 4700 fra hjørnet, 1000 bredt, 600 høyt, 1200 over bakken
//
// Med påbord i begge ender (O–O): L = k·148 + k·g + 148, altså g = (L − 148·k − 148)/k.
//
// 1) Vindu 1, innlegg e. Avgjør feltet til venstre og feltet over og under vinduet.
//    (Over og under har samme deling og er ett felt.)
//    Venstre felt:  L = 600 + e.            k = 2.
//    Over/under:    L = 1000 + 2·148 − 2e.  k = 5.
//    e = 10: venstre L = 610, g = (610 − 296 − 148)/2 = 83,   o = 32,5  (over 30)
//            over    L = 1276, g = (1276 − 740 − 148)/5 = 77,6, o = 35,2  (over 30)
//            felt over 30: 1 + 1 = 2
//    e = 20: venstre L = 620, g = 88,   o = 30,0  (akkurat innenfor)
//            over    L = 1256, g = 73,6, o = 37,2  (over 30)
//            felt over 30: 0 + 1 = 1
//    Færrest felt over 30 veier tyngst, så e = 20. (Venstre felt er under 30 bare ved e = 20.)
//    Feltet over starter på 600 + 20 − 148 = 472.
//
// 2) Port, innlegg e. Avgjør feltet mellom vindu 1 og porten, og feltet over porten.
//    Mellom: L = (2000 − 1600) + 20 + e = 430–440. k = 1 gir g = 124–134 og o under 12.
//            k = 2 gir negativ g. Feltet går ikke opp, uansett innlegg.
//    Over porten: L = 2400 + 296 − 2e = 2656–2676. k = 10: ideelt L = 2608.
//            e = 20: L = 2656, g = (2656 − 1480 − 148)/10 = 102,8, o = 22,6 (nærmest 25)
//            e = 10: L = 2676, g = 104,8, o = 21,6
//    e = 20 er best.
// ===================================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losVegg, foreslaVegg, vurderVegg, lagMerkeliste } from '../src/tommermann/vegg.js';
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

test('Garasje: vindu 1 får innlegg 20 på begge sider (punkt 1 i håndregningen)', () => {
  const r = losVegg(GARASJE);
  assert.deepEqual(r.apninger[0].innlegg, { venstre: 20, hoyre: 20 });
  const f = felt(r, 'Venstre hjørne – Vindu 1');
  naer(f.losning.L, 620);
  naer(f.losning.klaring, 88);
  naer(f.losning.omlegg, 30);
  assert.equal(f.losning.innenforAnbefalt, true);
  // Første underbord: (148 + 88)/2 = 118, så 118 + 236 = 354. Påbord: 0, 236, 472.
  assert.deepEqual(starter(f.underliggere), [118, 354]);
  assert.deepEqual(starter(f.overliggere), [0, 236, 472]);
});

test('Garasje: over og under vindu 1 er ett felt som fortsetter rytmen fra sidebordet', () => {
  const r = losVegg(GARASJE);
  const f = felt(r, 'Over og under vindu 1');
  naer(f.losning.L, 1256);
  naer(f.losning.omlegg, 37.2);
  naer(f.x0, 472); // samme sted som siste påbord i feltet til venstre
  // Sidebordene er tatt ut: 5 underbord og 4 påbord mellom dem
  assert.equal(f.underliggere.length, 5);
  assert.equal(f.overliggere.length, 4);
  // To høyder: under vinduet (0–1200) og over vinduet (1800–2400)
  assert.deepEqual(f.deler, [[0, 1200], [1800, 2400]]);
  assert.equal(felt(r, 'Over vindu 1'), undefined);
  assert.equal(felt(r, 'Under vindu 1'), undefined);
});

test('Garasje: feltet mellom vindu 1 og porten går ikke opp, og appen sier det', () => {
  const r = losVegg(GARASJE);
  assert.equal(r.ok, false);
  const f = felt(r, 'Vindu 1 – Port');
  assert.equal(f.ok, false);
  assert.match(f.melding, /går ikke opp/);
  assert.ok(r.varsler.some((v) => v.felt === 'Vindu 1 – Port' && v.alvorlig));
});

test('Garasje: porten får innlegg 20, og over porten blir 22,6 mm (punkt 2)', () => {
  const r = losVegg(GARASJE);
  assert.deepEqual(r.apninger[1].innlegg, { venstre: 20, hoyre: 20 });
  const f = felt(r, 'Over port');
  naer(f.losning.L, 2656);
  naer(f.losning.omlegg, 22.6);
  assert.equal(felt(r, 'Over og under port'), undefined); // porten står på bakken
  assert.deepEqual(f.deler, [[2100, 2400]]);
});

test('Påbord inn på karmen trenger ikke kloss, men påbord i hjørnet trenger underlag', () => {
  const r = losVegg(GARASJE); // påbord både på karm og i hjørnene
  assert.equal(r.klosser, undefined);
  assert.ok(!r.varsler.some((v) => /kloss bak|trenger kloss/i.test(v.tekst)));
  const underlag = r.varsler.filter((v) => /underlag/.test(v.tekst)).map((v) => v.felt);
  assert.deepEqual(underlag, ['Venstre hjørne', 'Høyre hjørne']);
  const medUnderbordIHjornene = losVegg({ ...GARASJE, hjorneVenstre: 'U', hjorneHoyre: 'U' });
  assert.ok(!medUnderbordIHjornene.varsler.some((v) => /underlag/.test(v.tekst)));
});

test('Innlegget brukes først: treffer ideelt omlegg når det går', () => {
  // Dør i full høyde (ingen felt over eller under), så bare feltet til venstre avgjør innlegget.
  // 625 fra hjørnet. O–O, k = 2: ideelt L = 640 = 625 + 15. Innlegget blir 15, omlegg 25.
  const dor = (x) => losVegg({ lengde: 3000, hoyde: 2400, bu: 148, bo: 148,
    apninger: [{ type: 'dor', x, bredde: 1000, hoyde: 2400, bunn: 0 }] });
  const r = dor(625);
  naer(r.apninger[0].innlegg.venstre, 15);
  naer(felt(r, 'Venstre hjørne – Dør').losning.omlegg, 25);
  // 630 fra hjørnet: innlegget må ned til 10 for å treffe 640, og omlegget blir fortsatt 25.
  const r2 = dor(630);
  naer(r2.apninger[0].innlegg.venstre, 10);
  naer(felt(r2, 'Venstre hjørne – Dør').losning.omlegg, 25);
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
    { type: 'vindu', x: 2100, bredde: 1000, hoyde: 1000, bunn: 900 },
  ] };
  const v = losVegg({ ...vegg, startvalg: 'venstre' });
  const h = losVegg({ ...vegg, startvalg: 'hoyre' });
  assert.deepEqual(v.apninger.map((a) => a.innlegg.venstre), [20, 20]);
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
        const over = r.felt.find((f) => f.apning === a.navn && f.type === 'overunder');
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

test('Merkeliste: alle underbord i rekkefølge, med mål fra hjørnet og fra karmkanten', () => {
  const r = losVegg(GARASJE);
  const liste = lagMerkeliste(r);
  // Like mange rader som underbord i feltene som går opp
  const antall = r.felt.filter((f) => f.ok).reduce((sum, f) => sum + f.underliggere.length, 0);
  assert.equal(liste.length, antall);
  // Sortert fra venstre, nummerert 1, 2, 3 ...
  liste.forEach((m, i) => {
    assert.equal(m.nr, i + 1);
    if (i > 0) assert.ok(m.fraEksakt > liste[i - 1].fraEksakt);
  });
  // Felt 1 (håndregning punkt 1): underbord på 118 og 354 fra hjørnet, full høyde, kloss 88
  assert.deepEqual(liste.slice(0, 2).map((m) => [m.fra, m.referanse, m.hoyde]),
    [[118, 'hjørnet', 'Full høyde'], [354, 'hjørnet', 'Full høyde']]);
  naer(liste[0].klaring, 88);
  // Første underbord over og under vindu 1 starter 17 mm før karmkanten (600): 583
  assert.equal(liste[2].fra, 583);
  assert.equal(liste[2].fraReferanse, -17);
  assert.equal(liste[2].referanse, 'venstre karm vindu 1');
  assert.equal(liste[2].hoyde, 'Over og under vindu 1');
  // Mål fra karm og mål fra hjørnet henger sammen for alle rader
  for (const m of liste) {
    const refX = m.referanse === 'hjørnet' ? 0
      : m.referanse.startsWith('venstre karm') ? r.apninger.find((a) => m.referanse.endsWith(a.navn.toLowerCase())).x
        : (() => { const a = r.apninger.find((x) => m.referanse.endsWith(x.navn.toLowerCase())); return a.x + a.bredde; })();
    assert.ok(Math.abs(m.fraEksakt - refX - m.fraReferanse) <= 0.5, `rad ${m.nr}`);
  }
});

test('Merkeliste: felt som ikke går opp, er ikke med', () => {
  const r = losVegg(GARASJE);
  const liste = lagMerkeliste(r);
  assert.ok(!liste.some((m) => m.feltNavn === 'Vindu 1 – Port'));
});

test('Eksempelveggen i appen går opp med omlegg innenfor anbefalt', async () => {
  // Samme vegg som «Fyll inn eksempel» (src/skjerm/vegg-skjerm.js), regnet slik appen gjør
  // (gjennom huset, med påbord ytterst og «mot naboveggen» i begge hjørner)
  const { losHus } = await import('../src/tommermann/hus.js');
  const r = losHus({ vegger: [{ lengde: 6000, hoyde: 2400, bu: 98, bo: 98, karmBord: 'O',
    hjorneVenstre: 'O', hjorneHoyre: 'O', startvalg: 'lik',
    hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'mot' } }, apninger: [
      { type: 'vindu', x: 800, bredde: 1000, hoyde: 1200, bunn: 900 },
      { type: 'dor', x: 2600, bredde: 900, hoyde: 2100, bunn: 0 },
      { type: 'vindu', x: 4200, bredde: 1000, hoyde: 1200, bunn: 900 }] }] }).vegger[0];
  assert.equal(r.ok, true);
  assert.ok(r.felt.every((f) => f.losning.innenforAnbefalt));
  assert.ok(!r.varsler.some((v) => v.type === 'spikring' || v.alvorlig));
});

test('Slik setter du opp: første underbord, kloss, antall og kontrollmål per felt', async () => {
  const { lagOppsettliste } = await import('../src/tommermann/vegg.js');
  const liste = lagOppsettliste(losVegg(GARASJE));
  // Felt 2 (over og under vindu 1), som i merkelista: første underbord 583, 17 mm før
  // venstre karm (600), kloss 73,6, 5 underbord, siste slutter 1469 + 148 = 1617.
  const f2 = liste[1];
  assert.equal(f2.navn, 'Over og under vindu 1');
  assert.deepEqual([f2.fra, f2.fraReferanse, f2.referanse, f2.antall, f2.til],
    [583, -17, 'venstre karm vindu 1', 5, 1617]);
  assert.ok(Math.abs(f2.kloss - 73.6) < 1e-9);
  // Kontroll: første + (antall − 1) · (bredde + kloss) + bredde = siste slutt
  assert.ok(Math.abs(583 + 4 * (148 + 73.6) + 148 - 1617) < 1);
  // Feltet som ikke går opp, er med og sier fra
  assert.equal(liste[2].ok, false);
  assert.match(liste[2].melding, /går ikke opp/);
});

test('Jevnest over hele veggen: finner den beste kombinasjonen av innlegg (sjekket mot alle)', () => {
  // Summen som skal være minst: [går ikke opp, spikervarsel, over maks, mm over maks,
  // (omlegg − 25)², innlegg fra 15], sammenlignet tall for tall.
  const kost = (r) => {
    const k = [0, 0, 0, 0, 0, 0];
    for (const f of r.felt) {
      if (!f.ok) { k[0]++; continue; }
      const l = f.losning;
      k[1] += l.spikring.ok ? 0 : 1; k[2] += l.innenforAnbefalt ? 0 : 1;
      k[3] += Math.max(0, l.omlegg - 30); k[4] += (l.omlegg - 25) ** 2;
    }
    for (const a of r.apninger) k[5] += Math.abs(a.innlegg.venstre - 15);
    return k;
  };
  const sammenlign = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) return a[i] - b[i]; return 0; };
  const vegger = [
    { lengde: 6000, hoyde: 2400, bu: 148, bo: 148, apninger: [
      { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
      { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 },
      { type: 'vindu', x: 4700, bredde: 1000, hoyde: 600, bunn: 1200 }] },
    { lengde: 5000, hoyde: 2500, bu: 98, bo: 98, apninger: [
      { type: 'vindu', x: 700, bredde: 900, hoyde: 1100, bunn: 900 },
      { type: 'dor', x: 2300, bredde: 900, hoyde: 2100, bunn: 0 }] },
  ];
  for (const v of vegger) {
    const jevnt = losVegg({ ...v, startvalg: 'jevnt' });
    const n = v.apninger.length;
    let best = null;
    const prov = (valgt) => {
      if (valgt.length === n) {
        const k = kost(losVegg({ ...v, fasteInnlegg: valgt }));
        if (!best || sammenlign(k, best) < 0) best = k;
        return;
      }
      for (let e = 10; e <= 20; e++) prov([...valgt, e]);
    };
    prov([]);
    assert.equal(sammenlign(kost(jevnt), best), 0, `jevnt ${kost(jevnt)} mot beste ${best}`);
  }
});

test('Kløyvde underbord: forslag og ny utlegging for felt over 30 mm (håndregnet)', () => {
  const r = losVegg(GARASJE);
  const f = r.felt.find((x) => x.navn === 'Over og under vindu 1');
  // Påbord i begge ender, 5 underbord, L = 1256. For omlegg 25 må klossen bli 148 − 50 = 98.
  // Underbord: (1256 − 148 − 5 · 98) / 5 = 123,6, rundet til 124. Da blir klossen
  // (1256 − 5 · 124 − 148) / 5 = 97,6 og omlegget (148 − 97,6) / 2 = 25,2.
  assert.deepEqual([f.kloyvForslag.bredde, f.kloyvForslag.antall, f.kloyvForslag.fra], [124, 5, 148]);
  assert.ok(Math.abs(f.kloyvForslag.kloss - 97.6) < 1e-9);
  assert.ok(Math.abs(f.kloyvForslag.omlegg - 25.2) < 1e-9);
  // Felt innenfor anbefalt får ikke forslag
  assert.equal(r.felt.find((x) => x.navn === 'Over port').kloyvForslag, null);

  const r2 = losVegg({ ...GARASJE, kloyvUnderbord: { 'Over og under vindu 1': 124 } });
  const f2 = r2.felt.find((x) => x.navn === 'Over og under vindu 1');
  assert.ok(f2.losning.innenforAnbefalt);
  assert.equal(f2.kloyvForslag, null);
  assert.deepEqual(f2.losning.kloyvdUnderbord, { bredde: 124, antall: 5 });
  // Feltet starter og slutter der det gjorde, og underbordene står med lik kloss
  assert.ok(Math.abs(f2.x0 - f.x0) < 1e-9 && Math.abs(f2.x1 - f.x1) < 1e-9);
  const U = f2.underliggere;
  for (const b of U) assert.ok(Math.abs(b.tilEksakt - b.fraEksakt - 124) < 1e-9);
  for (let i = 1; i < U.length; i++) assert.ok(Math.abs(U[i].fraEksakt - U[i - 1].tilEksakt - 97.6) < 1e-9);
  // Påbordene ligger 25,2 mm inn over underbordet på hver side
  for (const o of f2.overliggere) {
    const v = U.find((u) => u.fraEksakt < o.fraEksakt && u.tilEksakt > o.fraEksakt);
    const h = U.find((u) => u.tilEksakt > o.tilEksakt && u.fraEksakt < o.tilEksakt);
    assert.ok(Math.abs(v.tilEksakt - o.fraEksakt - 25.2) < 1e-9);
    assert.ok(Math.abs(o.tilEksakt - h.fraEksakt - 25.2) < 1e-9);
  }
  // Ugyldig kløyving (bredere enn fullt bord) brukes ikke, og appen sier fra
  const r3 = losVegg({ ...GARASJE, kloyvUnderbord: { 'Over og under vindu 1': 160 } });
  assert.ok(r3.varsler.some((v) => v.type === 'kloyv-ugyldig' && v.felt === 'Over og under vindu 1'));
});


test('Lik avstand mellom påbordene: Kennys vegg (6650 mm, 98 mm bord) går fra 16,3 til 9,2 mm spenn', async () => {
  const { losHus } = await import('../src/tommermann/hus.js');
  const v = { navn: 'Vegg 1', lengde: 6650, hoyde: 2400, bu: 98, bo: 98, karmBord: 'O', hjorneVenstre: 'O', hjorneHoyre: 'O',
    hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'mot' } }, apninger: [
      { type: 'vindu', x: 800, bredde: 1000, hoyde: 1200, bunn: 900 },
      { type: 'dor', x: 2600, bredde: 900, hoyde: 2100, bunn: 0 },
      { type: 'vindu', x: 4200, bredde: 1000, hoyde: 1200, bunn: 900 }] };
  const spenn = (r) => { const a = r.felt.map((f) => f.losning.avstandPabord); return Math.max(...a) - Math.min(...a); };
  const gammel = losHus({ vegger: [{ ...v, startvalg: 'venstre' }] }).vegger[0];
  const ny = losHus({ vegger: [{ ...v, startvalg: 'lik' }] }).vegger[0];
  assert.ok(Math.abs(spenn(gammel) - 16.3) < 0.05);
  assert.ok(spenn(ny) <= 10, `spenn ${spenn(ny)}`);
  // Felt 7 får 9 bord i stedet for 10 (avstand 57,6 mm, nær felt 6)
  const f7 = ny.felt.find((f) => f.navn === 'Vindu 2 – Høyre hjørne');
  assert.equal(f7.losning.antallUnderliggere, 9);
  // Over døra: avstanden er 41,7 mm med fulle bord. Påbordene inni kløyves 7 mm, til 91 mm.
  const over = ny.felt.find((f) => f.navn === 'Over dør');
  assert.deepEqual(over.losning.kloyvdPabord, { bredde: 91, antall: 6 });
  assert.ok(ny.felt.every((f) => f.losning.omlegg >= 20 - 1e-9));
  // Kløyvde påbord står midt over mellomrommet: likt omlegg på begge sider
  for (const o of over.overliggere.filter((b) => b.klyvd)) {
    assert.ok(Math.abs(o.tilEksakt - o.fraEksakt - 91) < 1e-9);
    const v1 = over.underliggere.find((u) => u.fraEksakt < o.fraEksakt && u.tilEksakt > o.fraEksakt);
    const h1 = over.underliggere.find((u) => u.tilEksakt > o.tilEksakt && u.fraEksakt < o.tilEksakt);
    assert.ok(Math.abs((v1.tilEksakt - o.fraEksakt) - (o.tilEksakt - h1.fraEksakt)) < 1e-9);
  }
});
