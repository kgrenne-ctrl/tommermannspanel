// Tester for regnemodellen for vinkler og diagonaler i Matte (src/matte/vinkel.js). Kjøres med: npm test
// Kontrolleksempelet i PLAN-matte.md punkt 4 er første test og skal aldri slettes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regnDiagonal, regnGjaering, regnMangekant, regnSammensatt } from '../src/matte/vinkel.js';

const naer = (faktisk, ventet, toleranse, tekst) =>
  assert.ok(Math.abs(faktisk - ventet) <= toleranse, `${tekst}: fikk ${faktisk}, ventet ${ventet}`);

test('Kontrolleksempel (PLAN-matte.md punkt 4): 8000 × 6000 gir 10 000, og 10 016 og 9984 er 20 mm skjevt', () => {
  const r = regnDiagonal({ a: 8000, b: 6000, d1: 10016, d2: 9984 });
  assert.equal(r.ok, true);
  naer(r.diagonal, 10000, 1e-9, 'diagonal');
  naer(r.skjevhet, 20, 1e-9, 'skjevhet');
  naer(r.avvik1, 16, 1e-9, 'avvik diagonal 1');
  naer(r.avvik2, -16, 1e-9, 'avvik diagonal 2');
  assert.deepEqual(r.trekant, { faktor: 2000, kort: 6000, lang: 8000, skra: 10000, kortSide: 'b' });
});

test('Skjevhet: rekkefølgen på diagonalene spiller ingen rolle, og like diagonaler er rett', () => {
  naer(regnDiagonal({ a: 8000, b: 6000, d1: 9984, d2: 10016 }).skjevhet, 20, 1e-9, 'byttet om');
  assert.equal(regnDiagonal({ a: 8000, b: 6000, d1: 10000, d2: 10000 }).skjevhet, 0);
  // Et parallellogram med kjent skjevhet gir den tilbake
  const a = 5000; const b = 3000; const s = 12;
  const d1 = Math.hypot(a + s, b); const d2 = Math.hypot(a - s, b);
  naer(regnDiagonal({ a, b, d1, d2 }).skjevhet, s, 1e-9, 'parallellogram');
});

test('Uten to diagonaler: ingen skjevhet, men avvik på den ene som er målt', () => {
  const ingen = regnDiagonal({ a: 8000, b: 6000 });
  assert.equal(ingen.skjevhet, null);
  assert.equal(ingen.avvik1, null);
  assert.deepEqual(ingen.varsler, []);
  const en = regnDiagonal({ a: 8000, b: 6000, d1: 10010 });
  assert.equal(en.skjevhet, null);
  naer(en.avvik1, 10, 1e-9, 'avvik');
});

test('3-4-5-trekanten: største med hele 100 mm som får plass, og ingen når sidene er for korte', () => {
  assert.deepEqual(regnDiagonal({ a: 2500, b: 4100 }).trekant, { faktor: 800, kort: 2400, lang: 3200, skra: 4000, kortSide: 'a' });
  assert.equal(regnDiagonal({ a: 250, b: 300 }).trekant, null);
});

test('Diagonal: umulige mål gir beskjed og aldri NaN', () => {
  for (const inn of [{ a: 0, b: 6000 }, { a: 8000, b: null }, { a: -1, b: 6000 }, { a: 8000, b: 6000, d1: 0 }]) {
    const r = regnDiagonal(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.length > 0 && r.feil.every((t) => !t.includes('NaN')));
  }
});

// ---------- Gjæring (fase M4) ----------

test('Kontrolleksempel gjæring i hjørne (PLAN-matte.md punkt 4): 90° gir 45,0, 135° gir 22,5, 87° gir 46,5', () => {
  for (const [hjorne, sag, emne] of [[90, 45, 45], [135, 22.5, 67.5], [87, 46.5, 43.5]]) {
    const r = regnGjaering({ hjorne, type: 'innvendig' });
    assert.equal(r.ok, true);
    naer(r.sag, sag, 1e-9, `saga ved ${hjorne}°`);
    naer(r.emne, emne, 1e-9, `emnet ved ${hjorne}°`);
  }
  // Utvendig hjørne gir samme tall
  assert.equal(regnGjaering({ hjorne: 90, type: 'utvendig' }).sag, 45);
  // 87° gir 46,5 på saga: over 45° gir «greit å vite»
  assert.equal(regnGjaering({ hjorne: 87, type: 'innvendig' }).varsler[0].type, 'sag-vinkel');
  assert.deepEqual(regnGjaering({ hjorne: 90, type: 'innvendig' }).varsler, []);
});

test('Kontrolleksempel mangekant (PLAN-matte.md punkt 4): seks sider 30,0, åtte 22,5, åttekant 2000 gir 828,4', () => {
  naer(regnMangekant({ sider: 6, malType: 'flater' }).sag, 30, 1e-9, 'sekskant');
  const r = regnMangekant({ sider: 8, malType: 'flater', mal: 2000 });
  naer(r.sag, 22.5, 1e-9, 'åttekant');
  naer(r.emne, 67.5, 1e-9, 'vinkel på emnet');
  naer(r.sidelengde, 828.4, 0.05, 'side');
  // Over hjørnene: sekskant med 1000 mm over hjørnene har side 500
  naer(regnMangekant({ sider: 6, malType: 'hjorner', mal: 1000 }).sidelengde, 500, 1e-9, 'over hjørnene');
  // Firkant er vanlig 45° gjæring, og innsiden er to bredder kortere
  const firkant = regnMangekant({ sider: 4, malType: 'flater', mal: 1000, bredde: 70 });
  assert.equal(firkant.sag, 45);
  naer(firkant.innside, 860, 1e-9, 'innsiden');
});

test('Mangekant: umulige mål gir beskjed og aldri NaN', () => {
  for (const inn of [{ sider: 2, malType: 'flater' }, { sider: 6.5, malType: 'flater' }, { sider: 101, malType: 'flater' },
    { sider: 6, malType: 'flater', mal: -1 }, { sider: 8, malType: 'flater', mal: 300, bredde: 200 },
    { sider: null, malType: 'flater' }, { sider: 6, malType: 'tvers' }]) {
    const r = regnMangekant(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.every((t) => !t.includes('NaN')));
  }
});

test('Kontrolleksempel sammensatt gjæring (PLAN-matte.md punkt 4): de tre kjente verdiene', () => {
  for (const [helning, vegg, dreie, blad] of [[38, 90, 31.6, 33.9], [45, 90, 35.3, 30.0], [38, 135, 14.3, 17.6]]) {
    const r = regnSammensatt({ helning, vegg });
    assert.equal(r.ok, true);
    naer(r.dreieskive, dreie, 0.05, `dreieskive ${helning}/${vegg}`);
    naer(r.blad, blad, 0.05, `blad ${helning}/${vegg}`);
  }
  naer(regnSammensatt({ helning: 38, vegg: 90 }).oppNed, 45, 1e-9, 'opp-ned mot anlegget');
});

test('Sammensatt gjæring: grensetilfellene fra planen', () => {
  // Veggvinkel 180° (rett skjøt) gir 0 og 0
  const rett = regnSammensatt({ helning: 38, vegg: 180 });
  naer(rett.dreieskive, 0, 1e-9, 'dreieskive ved 180°');
  naer(rett.blad, 0, 1e-9, 'blad ved 180°');
  // Helning 90° gir 90 − vegg / 2 og 0
  for (const vegg of [90, 120, 135]) {
    const r = regnSammensatt({ helning: 90, vegg });
    naer(r.dreieskive, 90 - vegg / 2, 1e-9, `dreieskive ved helning 90 og ${vegg}°`);
    naer(r.blad, 0, 1e-9, `blad ved helning 90 og ${vegg}°`);
  }
  for (const inn of [{ helning: 38, vegg: 0 }, { helning: 38, vegg: 190 }, { helning: -1, vegg: 90 }, { helning: 91, vegg: 90 }, { helning: null, vegg: 90 }]) {
    const r = regnSammensatt(inn);
    assert.equal(r.ok, false, JSON.stringify(inn));
    assert.ok(r.feil.every((t) => !t.includes('NaN')));
  }
  assert.ok(regnSammensatt({ helning: 38, vegg: 90 }).varsler.every((v) => !v.tekst.includes('\u2014')));
});
