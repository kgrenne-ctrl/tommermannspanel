// Tester for regnemodellen for inndeling i Matte (src/matte/inndeling.js). Kjøres med: npm test
// Kontrolleksemplene i PLAN-matte.md punkt 4 er de første testene og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fordelLikt, fordelSpiler, fordelBord, KRAV_APNING_REKKVERK, METODE_LIKT } from '../src/matte/inndeling.js';

const naer = (faktisk, ventet, toleranse, tekst) =>
  assert.ok(Math.abs(faktisk - ventet) <= toleranse, `${tekst}: fikk ${faktisk}, ventet ${ventet}`);

test('Kontrolleksempel lik avstand (PLAN-matte.md punkt 4): 4000 med maks 600 gir 7 felt à 571,4', () => {
  const r = fordelLikt({ metode: 'lik', lengde: 4000, maks: 600 });
  assert.equal(r.ok, true);
  assert.equal(r.antallFelt, 7);
  naer(r.cc, 571.43, 0.005, 'c/c');
  assert.deepEqual(r.merker.map(Math.round), [571, 1143, 1714, 2286, 2857, 3429]);
});

test('Kontrolleksempel spiler (PLAN-matte.md punkt 4): 1800, 21 mm, maks 100 gir 15 spiler og 92,8', () => {
  const r = fordelSpiler({ lysapning: 1800, bredde: 21, maks: 100 });
  assert.equal(r.ok, true);
  assert.equal(r.antall, 15);
  naer(r.apning, 92.8125, 1e-9, 'åpning');
  naer(r.apningEnFaerre, 100.4, 0.01, 'åpning med 14 spiler');
  assert.deepEqual(r.forkant.slice(0, 4).map(Math.round), [93, 207, 320, 434]);
});

test('Kontrolleksempel terrassebord (PLAN-matte.md punkt 4): 3000, 120 mm bord, ønsket 5 gir 24 bord og 5,2', () => {
  const r = fordelBord({ bredde: 3000, bordbredde: 120, spalte: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.antall, 24);
  naer(r.spalte, 5.2174, 0.0001, 'spalte');
  assert.deepEqual(r.alternativer.map((a) => a.antall), [23, 25]);
  naer(r.alternativer[0].spalte, 10.909, 0.001, '23 bord');
  naer(r.alternativer[1].spalte, 0, 1e-9, '25 bord');
});

test('Inndeling: summen av avstandene er nøyaktig lengden, og siste merke stemmer på nærmeste mm', () => {
  for (const [lengde, maks] of [[4000, 600], [3333, 400], [12345.6, 610], [600, 600], [599, 600]]) {
    for (const metode of ['lik', 'fast']) {
      const r = fordelLikt({ metode, lengde, maks });
      const punkter = [0, ...r.merker, lengde];
      const avstander = punkter.slice(1).map((p, i) => p - punkter[i]);
      naer(avstander.reduce((a, b) => a + b, 0), lengde, 1e-6, `${metode} ${lengde}`);
      assert.equal(avstander.length, r.antallFelt, `${metode} ${lengde}: antall felt`);
      assert.ok(avstander.every((a) => a > 0 && a <= maks + 1e-9), `${metode} ${lengde}: ingen avstand over c/c`);
    }
  }
  // Lengden går opp i c/c: ingen rest på 0 og ikke ett felt for mye
  const fast = fordelLikt({ metode: 'fast', lengde: 3600, maks: 600 });
  assert.equal(fast.antallFelt, 6);
  naer(fast.rest, 600, 1e-9, 'siste felt');
  const fastRest = fordelLikt({ metode: 'fast', lengde: 4000, maks: 600 });
  naer(fastRest.rest, 400, 1e-9, 'rest');
});

test('Lekter: lik avstand innenfor minste og største, ellers må det fikses', () => {
  const ok = fordelLikt({ metode: 'lekter', lengde: 4500, min: 310, maks: 375 });
  assert.equal(ok.antallFelt, 12);
  naer(ok.cc, 375, 1e-9, 'c/c');
  assert.deepEqual(ok.varsler, []);
  const ikke = fordelLikt({ metode: 'lekter', lengde: 1000, min: 340, maks: 345 });
  assert.equal(ikke.ok, true);
  assert.equal(ikke.varsler[0].niva, 'ma');
});

test('Spiler: åpningen er aldri over største åpning, og én spile færre ville gitt for stor åpning', () => {
  for (const lysapning of [250, 640, 999, 1234, 1800, 2400, 3150]) {
    for (const [bredde, maks] of [[21, 100], [48, 100], [36, 90], [21, 80]]) {
      const r = fordelSpiler({ lysapning, bredde, maks });
      assert.ok(r.apning <= maks + 1e-9, `${lysapning}/${bredde}/${maks}: åpning ${r.apning}`);
      if (r.antall > 0) assert.ok(r.apningEnFaerre > maks, `${lysapning}/${bredde}/${maks}: én færre ${r.apningEnFaerre}`);
      // Siste spile slutter én åpning før stolpen
      if (r.antall > 0) naer(r.forkant.at(-1) + bredde + r.apning, lysapning, 1e-9, 'siste spile');
    }
  }
  // Lysåpning under største åpning: ingen spiler
  const ingen = fordelSpiler({ lysapning: 90, bredde: 21, maks: 100 });
  assert.equal(ingen.antall, 0);
  naer(ingen.apning, 90, 1e-9, 'åpning uten spiler');
});

test('Spiler: kravet står med kilde, og over 100 mm må det fikses', () => {
  assert.equal(KRAV_APNING_REKKVERK, 100);
  const ok = fordelSpiler({ lysapning: 1800, bredde: 21, maks: 100 });
  assert.equal(ok.varsler[0].niva, 'vite');
  assert.equal(ok.varsler[0].kilde, 'TEK17 § 12-15 femte ledd');
  const for_stor = fordelSpiler({ lysapning: 1800, bredde: 21, maks: 120 });
  assert.equal(for_stor.varsler[0].niva, 'ma');
  assert.ok(!for_stor.varsler[0].tekst.includes('\u2014'));
});

test('Terrassebord: spalten er aldri under 0, og summen går opp i bredden', () => {
  for (const [bredde, bordbredde, spalte] of [[3000, 120, 5], [2400, 145, 6], [1000, 98, 0], [5000, 28, 8]]) {
    const r = fordelBord({ bredde, bordbredde, spalte });
    assert.ok(r.spalte >= -1e-9, `${bredde}/${bordbredde}: spalte ${r.spalte}`);
    naer(r.antall * bordbredde + (r.antall - 1) * r.spalte, bredde, 1e-6, `${bredde}/${bordbredde}`);
    naer(r.forkant.at(-1) + bordbredde, bredde, 1e-6, 'siste bord');
    assert.ok(r.alternativer.every((a) => a.spalte >= -1e-9));
  }
});

test('Inndeling: umulige mål gir beskjed og aldri NaN', () => {
  const feil = [
    fordelLikt({ metode: 'lik', lengde: 0, maks: 600 }),
    fordelLikt({ metode: 'lik', lengde: 4000, maks: null }),
    fordelLikt({ metode: 'lekter', lengde: 4000, maks: 300, min: 350 }),
    fordelLikt({ metode: 'lik', lengde: 400000, maks: 0.6 }),
    fordelLikt({ metode: 'ukjent', lengde: 4000, maks: 600 }),
    fordelSpiler({ lysapning: 1800, bredde: 0, maks: 100 }),
    fordelSpiler({ lysapning: null, bredde: 21, maks: 100 }),
    fordelBord({ bredde: 100, bordbredde: 120, spalte: 5 }),
    fordelBord({ bredde: 200, bordbredde: 120, spalte: 5 }),
    fordelBord({ bredde: 3000, bordbredde: 120, spalte: -1 }),
  ];
  for (const r of feil) {
    assert.equal(r.ok, false, JSON.stringify(r));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => !t.includes('NaN')));
  }
  assert.deepEqual([...METODE_LIKT], ['lik', 'fast', 'lekter']);
});
