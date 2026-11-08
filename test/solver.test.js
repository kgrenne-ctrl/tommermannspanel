// Tester for regnemodellen (PLAN.md punkt 7). Kjøres med: npm test
//
// ===================================================================================
// HÅNDREGNING – ett eksempel per start/slutt-kombinasjon
// ===================================================================================
// Omlegg minimum 20, ideelt 25. Varsel over 30 er Bakøy-standard (Kenny 2026-11-08);
// NDLA-eksempelet kontrolleres med varsel over 25, slik planen beskriver.
// Omlegg o = (bo − g) / 2. Senteravstand cc = bu + g.
//
// -----------------------------------------------------------------------------------
// 1) U–U, NDLA-eksempelet: L = 1350, bu = bo = 148
// -----------------------------------------------------------------------------------
// Ligning: L = k·bu + (k−1)·g   →   g = (L − k·bu) / (k − 1)
//   k = 5: g = (1350 − 740) / 4  = 152,5  → større enn bordet, umulig
//   k = 6: g = (1350 − 888) / 5  = 92,4   → o = (148 − 92,4)/2 = 27,8  gyldig
//   k = 7: g = (1350 − 1036) / 6 = 52,33  → o = 47,8                   gyldig
// Med maks 25: ingen har omlegg 20–25, så den nærmest 25 velges: k = 6 (27,8), med varsel.
// Med maks 30 (standard): k = 6 ligger innenfor og velges uten varsel.
// Senteravstand cc = 148 + 92,4 = 240,4.
// Underliggere: 0, 240,4, 480,8, 721,2, 961,6, 1202,0
//   avrundet:   0, 240,   481,   721,   962,   1202
// Kontroll: 5 × 240,4 + 148 = 1202 + 148 = 1350. Riktig.
// 6 underliggere, 5 overliggere.
//
// -----------------------------------------------------------------------------------
// 2) U–O: L = 1282, bu = bo = 148
// -----------------------------------------------------------------------------------
// Ligning: L = k·bu + (k−1)·g + (bo + g)/2   →   g = (L − k·bu − bo/2) / (k − 0,5)
//   k = 4: g = (1282 − 592 − 74) / 3,5 = 176    → større enn bordet, umulig
//   k = 5: g = (1282 − 740 − 74) / 4,5 = 104    → o = (148 − 104)/2 = 22   gyldig, innenfor
//   k = 6: g = (1282 − 888 − 74) / 5,5 = 58,18  → o = 44,9                 gyldig, for stort
// Velger k = 5, omlegg 22. cc = 148 + 104 = 252.
// Underliggere starter: 0, 252, 504, 756, 1008  (siste slutter 1008 + 148 = 1156)
// Overliggere starter der underliggeren slutter minus omlegget: 148 − 22 = 126, så
//   126, 378, 630, 882, 1134  (siste slutter 1134 + 148 = 1282 = L. Riktig.)
// 5 underliggere, 5 overliggere. Overligger i sluttkanten trenger underlag.
// Spikring: 148 ≥ 123 gir to spikre, krever 30 mm. Klaring 104. OK.
//
// -----------------------------------------------------------------------------------
// 3) O–U, ulik bredde: L = 1212, bu = 98, bo = 148
// -----------------------------------------------------------------------------------
// Samme ligning som U–O (speilvendt): g = (L − k·bu − bo/2) / (k − 0,5)
//   k = 5: g = (1212 − 490 − 74) / 4,5 = 144    → o = 2      for lite, forkastes
//   k = 6: g = (1212 − 588 − 74) / 5,5 = 100    → o = 24     gyldig, innenfor
//   k = 7: g = (1212 − 686 − 74) / 6,5 = 69,54  → o = 39,2   gyldig, for stort
// Velger k = 6, omlegg 24. cc = 98 + 100 = 198.
// Feltet starter med overligger 0–148. Første underligger begynner ved
//   (bo + g)/2 = (148 + 100)/2 = 124   (= 148 − 24, altså omlegget inn under overliggeren)
// Underliggere: 124, 322, 520, 718, 916, 1114  (siste slutter 1114 + 98 = 1212 = L. Riktig.)
// Overliggere: 0, 198, 396, 594, 792, 990
//   (124 + 98 − 24 = 198, deretter + 198 for hver)
// 6 underliggere, 6 overliggere. Overligger i startkanten trenger underlag.
//
// -----------------------------------------------------------------------------------
// 4) O–O, smale bord: L = 1266, bu = bo = 98
// -----------------------------------------------------------------------------------
// Ligning: L = k·bu + k·g + bo   →   g = (L − k·bu − bo) / k
//   k = 7: g = (1266 − 686 − 98) / 7 = 68,86  → o = 14,6   for lite, forkastes
//   k = 8: g = (1266 − 784 − 98) / 8 = 48     → o = 25     gyldig, akkurat ideelt
//   k = 9: g = (1266 − 882 − 98) / 9 = 31,78  → o = 33,1   gyldig, for stort
// Velger k = 8, omlegg 25. cc = 98 + 48 = 146.
// Første underligger: (98 + 48)/2 = 73.
// Underliggere: 73, 219, 365, 511, 657, 803, 949, 1095  (siste slutter 1193)
// Overliggere: 0, 146, 292, 438, 584, 730, 876, 1022, 1168  (siste slutter 1266 = L. Riktig.)
// 8 underliggere, 9 overliggere. Underlag trengs i begge kanter.
// Spikring: 98 < 123 gir én spiker, krever bare klaring > 0. OK.
// ===================================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losFelt, sjekkSpikring } from '../src/tommermann/solver.js';
import { STANDARD_BREDDER } from '../src/tommermann/fagverdier.js';

const naer = (faktisk, forventet, presisjon = 0.05) =>
  assert.ok(Math.abs(faktisk - forventet) <= presisjon,
    `forventet ${forventet}, fikk ${faktisk}`);

const starter = (bordliste) => bordliste.map((b) => b.fra);
const harVarsel = (losning, type) => losning.varsler.some((v) => v.type === type);

// ---------- 1) NDLA (første test) ----------
test('NDLA: U–U, L 1350, 148/148 gir 6 + 5 bord, klaring 92,4, omlegg 27,8 med varsel', () => {
  // PLAN.md punkt 3 regner med varsel over 25 mm. Bakøy flagger først over 30 mm
  // (Kenny 2026-11-08), så her settes maks til 25 for å kontrollere planens eksempel.
  const r = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U', oMax: 25 });
  assert.equal(r.ok, true);
  const v = r.valgt;
  assert.equal(v.antallUnderliggere, 6);
  assert.equal(v.antallOverliggere, 5);
  naer(v.klaring, 92.4, 1e-9);
  naer(v.omlegg, 27.8, 1e-9);
  naer(v.senteravstand, 240.4, 1e-9);
  assert.equal(harVarsel(v, 'omlegg-over-maks'), true);
  assert.deepEqual(starter(v.underliggere), [0, 240, 481, 721, 962, 1202]);
  // Kontroll fra planen: 5 × 240,4 + 148 = 1350
  naer(5 * v.senteravstand + 148, 1350, 1e-9);
  // Nest beste alternativ er 7 underliggere med omlegg 47,8
  assert.equal(r.alternativ.antallUnderliggere, 7);
  naer(r.alternativ.omlegg, 47.8);
});

// ---------- 2) U–O ----------
test('U–O: L 1282, 148/148 gir omlegg 22 og underlag i sluttkanten', () => {
  const v = losFelt({ L: 1282, bu: 148, bo: 148, start: 'U', slutt: 'O' }).valgt;
  assert.equal(v.antallUnderliggere, 5);
  assert.equal(v.antallOverliggere, 5);
  naer(v.klaring, 104, 1e-9);
  naer(v.omlegg, 22, 1e-9);
  assert.deepEqual(starter(v.underliggere), [0, 252, 504, 756, 1008]);
  assert.deepEqual(starter(v.overliggere), [126, 378, 630, 882, 1134]);
  assert.deepEqual(v.trengerUnderlag, { start: false, slutt: true });
  assert.equal(harVarsel(v, 'omlegg-over-maks'), false);
  assert.equal(v.spikring.antallSpikre, 2);
  assert.equal(v.spikring.ok, true);
});

// ---------- 3) O–U, ulik bredde ----------
test('O–U: L 1212, underligger 98, overligger 148 gir omlegg 24 og underlag i startkanten', () => {
  const v = losFelt({ L: 1212, bu: 98, bo: 148, start: 'O', slutt: 'U' }).valgt;
  assert.equal(v.antallUnderliggere, 6);
  assert.equal(v.antallOverliggere, 6);
  naer(v.klaring, 100, 1e-9);
  naer(v.omlegg, 24, 1e-9);
  assert.deepEqual(starter(v.underliggere), [124, 322, 520, 718, 916, 1114]);
  assert.deepEqual(starter(v.overliggere), [0, 198, 396, 594, 792, 990]);
  assert.deepEqual(v.trengerUnderlag, { start: true, slutt: false });
});

// ---------- 4) O–O ----------
test('O–O: L 1266, 98/98 gir 8 + 9 bord, omlegg 25 og underlag i begge kanter', () => {
  const v = losFelt({ L: 1266, bu: 98, bo: 98, start: 'O', slutt: 'O' }).valgt;
  assert.equal(v.antallUnderliggere, 8);
  assert.equal(v.antallOverliggere, 9);
  naer(v.klaring, 48, 1e-9);
  naer(v.omlegg, 25, 1e-9);
  assert.deepEqual(starter(v.underliggere), [73, 219, 365, 511, 657, 803, 949, 1095]);
  assert.deepEqual(starter(v.overliggere), [0, 146, 292, 438, 584, 730, 876, 1022, 1168]);
  assert.deepEqual(v.trengerUnderlag, { start: true, slutt: true });
  assert.equal(v.spikring.antallSpikre, 1);
  assert.equal(v.spikring.ok, true);
});

// ---------- Kort og langt felt ----------
test('Kort felt: L 400, U–U, 148/148 gir to underliggere og én overligger', () => {
  // g = (400 − 296) / 1 = 104, o = 22
  const v = losFelt({ L: 400, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  assert.equal(v.antallUnderliggere, 2);
  assert.equal(v.antallOverliggere, 1);
  naer(v.omlegg, 22, 1e-9);
  assert.deepEqual(starter(v.underliggere), [0, 252]);
});

test('Langt felt: L 12000, U–U, 148/148 går opp og har omlegg innenfor', () => {
  const v = losFelt({ L: 12000, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  assert.ok(v.omlegg >= 20 && v.omlegg <= 25, `omlegg ${v.omlegg}`);
  assert.equal(v.underliggere.at(-1).til, 12000);
});

// ---------- Ingen løsning ----------
test('For kort felt gir tydelig melding og forslag som faktisk virker', () => {
  const r = losFelt({ L: 200, bu: 148, bo: 148, start: 'U', slutt: 'U' });
  assert.equal(r.ok, false);
  assert.match(r.melding, /Ingen inndeling/);
  assert.ok(r.forslag.length > 0, 'skal foreslå noe');
  for (const f of r.forslag) {
    const prøv = losFelt({ L: 200, bu: f.bu, bo: f.bo, start: f.start, slutt: f.slutt });
    assert.equal(prøv.ok, true, `forslaget ${JSON.stringify(f)} skal gå opp`);
  }
});

test('Omlegg kan ikke være så stort at overliggerne møtes', () => {
  // L 150, U–U, underligger 73, overligger 173: eneste regnbare k = 2 gir g = 4 og
  // o = 84,5. Det er mer enn hele underliggeren (73), så det er ingen ekte løsning.
  const r = losFelt({ L: 150, bu: 73, bo: 173, start: 'U', slutt: 'U' });
  assert.equal(r.ok, false);
});

test('Feil inndata gir feilmelding, ikke krasj', () => {
  const r = losFelt({ L: -5, bu: 148, bo: 0, start: 'X', slutt: 'U' });
  assert.equal(r.ok, false);
  assert.ok(r.feil.length >= 3);
});

// ---------- Spikring ----------
test('Spikersjekk: to spikre fra 123 mm krever 30 mm klaring', () => {
  assert.equal(sjekkSpikring(148, 25).ok, false);
  assert.equal(sjekkSpikring(148, 30).ok, true);
  assert.equal(sjekkSpikring(123, 29).antallSpikre, 2);
  assert.equal(sjekkSpikring(98, 5).antallSpikre, 1);
  assert.equal(sjekkSpikring(98, 5).ok, true);
});

test('Smal klaring gir spikervarsel i løsningen', () => {
  // L 316, U–U, 148/148: eneste mulighet er k = 2, g = 316 − 296 = 20, o = 64
  const v = losFelt({ L: 316, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  naer(v.klaring, 20, 1e-9);
  assert.equal(harVarsel(v, 'spikring'), true);
  assert.equal(harVarsel(v, 'omlegg-over-maks'), true);
});

test('Bakøy-standard: 27,8 mm omlegg gir ikke varsel, varsel kommer først over 30 mm', () => {
  const v = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  naer(v.omlegg, 27.8, 1e-9);
  assert.equal(harVarsel(v, 'omlegg-over-maks'), false);
});

// ---------- Kontroll over mange felt ----------
// Går gjennom tusenvis av kombinasjoner av lengde, bredder og start/slutt og sjekker
// reglene som alltid skal holde.
test('Mange felt: alltid nøyaktig feltlengde, aldri under minste omlegg, riktig utvalg', () => {
  const E = 1e-6;
  let antallSjekket = 0;
  for (const bu of STANDARD_BREDDER) {
    for (const bo of STANDARD_BREDDER) {
      for (const [start, slutt] of [['U', 'U'], ['U', 'O'], ['O', 'U'], ['O', 'O']]) {
        for (let L = 150; L <= 8000; L += 37) {
          const r = losFelt({ L, bu, bo, start, slutt });
          if (!r.ok) {
            assert.ok(r.melding && Array.isArray(r.forslag));
            continue;
          }
          antallSjekket++;
          const v = r.valgt;

          // Aldri under minste omlegg, alltid klaring
          for (const l of r.alle) {
            assert.ok(l.omlegg >= 20 - E && l.klaring > 0 && l.synligUnderligger >= -E);
          }

          // Finnes en løsning innenfor minimum–maks, skal den være valgt
          assert.equal(v.innenforAnbefalt, r.alle.some((l) => l.innenforAnbefalt));

          // Antall overliggere etter kombinasjon
          const ekstra = { UU: -1, UO: 0, OU: 0, OO: 1 }[start + slutt];
          assert.equal(v.antallOverliggere, v.antallUnderliggere + ekstra);

          // Sum av bord og klaringer = feltlengden
          const kant = (bo + v.klaring) / 2;
          const sum = v.antallUnderliggere * bu + (v.antallUnderliggere - 1) * v.klaring
            + (start === 'O' ? kant : 0) + (slutt === 'O' ? kant : 0);
          assert.ok(Math.abs(sum - L) < E, `sum ${sum} ≠ ${L}`);

          // Bordene dekker hele feltet fra 0 til L uten hull
          const alleBord = [...v.underliggere, ...v.overliggere]
            .sort((a, b) => a.fraEksakt - b.fraEksakt);
          assert.ok(Math.abs(alleBord[0].fraEksakt) < E);
          let dekket = 0;
          for (const b of alleBord) {
            assert.ok(b.fraEksakt <= dekket + E, `hull ved ${dekket} (L ${L})`);
            dekket = Math.max(dekket, b.tilEksakt);
          }
          assert.ok(Math.abs(dekket - L) < E);

          // Hver overligger ligger o inn over underliggerne på begge sider (der de finnes)
          for (const o of v.overliggere) {
            for (const u of v.underliggere) {
              const overlapp = Math.min(o.tilEksakt, u.tilEksakt) - Math.max(o.fraEksakt, u.fraEksakt);
              if (overlapp > E) assert.ok(Math.abs(overlapp - v.omlegg) < E);
            }
          }

          // Posisjonene er hele mm, og avrundingen er aldri mer enn en halv mm unna
          for (const b of alleBord) {
            assert.ok(Number.isInteger(b.fra));
            assert.ok(Math.abs(b.fra - b.fraEksakt) <= 0.5);
          }
        }
      }
    }
  }
  assert.ok(antallSjekket > 10000, `sjekket bare ${antallSjekket}`);
});
