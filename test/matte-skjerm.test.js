// Tester for skjermdelen i Matte som kan kjøres uten nettleser: oppføringene i matte-liste.js
// og skissene i matte-tegning.js. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRUPPER, KALKULATORER, finnKalkulator, startverdier, lesInndata, tekstFor, erSynlig } from '../src/skjerm/matte-liste.js';
import {
  tegnFall, forholdTekst, tegnTrekant, tegnOppforing, tegnDiagonal, tegnInndeling, tegnSpiler, tegnSpilerUtsetting, tegnBord,
} from '../src/skjerm/matte-tegning.js';
import { fordelLikt, fordelSpiler, fordelBord } from '../src/matte/inndeling.js';
import { regnFall, regnTrekant, regnOppforing } from '../src/matte/tak.js';
import { regnDiagonal } from '../src/matte/vinkel.js';
import { grader } from '../src/skjerm/format.js';

// Alt som skal vises: nøkkeltall, utregning og skisse
function alleTekster(k, svar, d) {
  const { nokkeltall, utregning, forklaring = [], liste = null } = k.vis(svar, d);
  return [...nokkeltall.flat(), ...utregning, ...forklaring, ...(liste ? [liste.tittel, ...liste.kolonner, ...liste.rader.flat()] : []),
    k.tegn ? k.tegn(svar, d) : '', ...(svar.varsler ?? []).map((v) => v.tekst)];
}

test('Hver oppføring er fullstendig: id, gruppe, felt, regning, visning og eksempel', () => {
  const ider = new Set();
  for (const k of KALKULATORER) {
    assert.ok(!ider.has(k.id), `id ${k.id} er brukt to ganger`);
    ider.add(k.id);
    assert.ok(GRUPPER.some((g) => g.id === k.gruppe), `${k.id}: ukjent gruppe ${k.gruppe}`);
    assert.ok(k.tittel && k.beskrivelse);
    for (const navn of ['mangler', 'regn', 'vis']) assert.equal(typeof k[navn], 'function', `${k.id}: mangler ${navn}`);
    const felt = new Set();
    for (const f of k.felt) {
      assert.ok(!felt.has(f.id), `${k.id}: felt ${f.id} er brukt to ganger`);
      felt.add(f.id);
      assert.ok(['tall', 'valg'].includes(f.type));
      if (f.type === 'valg') assert.ok(f.valg.some((o) => o.verdi === f.standard), `${k.id}.${f.id}: standard finnes ikke i valgene`);
    }
    for (const id of Object.keys(k.eksempel)) assert.ok(felt.has(id), `${k.id}: eksempelet har ukjent felt ${id}`);
  }
});

test('«Fyll inn eksempel» går alltid opp, uten NaN, undefined eller lang tankestrek', () => {
  for (const k of KALKULATORER) {
    const v = startverdier(k, { ...k.eksempel });
    const d = lesInndata(k, v);
    assert.equal(k.mangler(d), null, `${k.id}: eksempelet mangler noe`);
    const svar = k.regn(d);
    assert.equal(svar.ok, true, `${k.id}: eksempelet går ikke opp`);
    for (const t of alleTekster(k, svar, d)) {
      assert.ok(!/NaN|undefined|Infinity/.test(String(t)), `${k.id}: ${t}`);
      assert.ok(!String(t).includes('\u2014'), `${k.id}: tankestrek (em dash) i ${t}`);
    }
  }
});

test('Fall og takvinkel: eksempelet er kontrolleksempelet 1:50 på 2400 mm', () => {
  const k = finnKalkulator('fall');
  const d = lesInndata(k, startverdier(k, { ...k.eksempel }));
  const { nokkeltall } = k.vis(k.regn(d), d);
  const verdi = (tittel) => nokkeltall.find((n) => n[0] === tittel)[1];
  assert.equal(verdi('Vinkel'), '1,1°');
  assert.equal(verdi('Prosent'), '2 %');
  assert.equal(verdi('Forhold'), '1:50');
  assert.equal(verdi('Per meter'), '20 mm');
  assert.equal(verdi('Høydeforskjell'), '48 mm');
});

test('Fall og takvinkel: feltene følger valget, og skjulte felt regnes som tomme', () => {
  const k = finnKalkulator('fall');
  const v = startverdier(k, { kjent: 'malt', verdi: '50', hoyde: '35', lengde: '2400' });
  const verdiFelt = k.felt.find((f) => f.id === 'verdi');
  const hoydeFelt = k.felt.find((f) => f.id === 'hoyde');
  assert.equal(erSynlig(verdiFelt, v), false);
  assert.equal(erSynlig(hoydeFelt, v), true);
  const d = lesInndata(k, v);
  assert.equal(d.verdi, null);
  assert.equal(d.hoyde, 35);
  assert.equal(tekstFor(k.felt.find((f) => f.id === 'lengde').ledetekst, v), 'Målt lengde (mm)');

  // Tomt felt gir en beskjed, ikke en feil
  const tom = lesInndata(k, startverdier(k, {}));
  assert.equal(k.mangler(tom), 'Skriv inn fallet for å regne om.');
  // Desimalkomma som på mobilen
  assert.equal(lesInndata(k, startverdier(k, { kjent: 'grader', verdi: '22,5' })).verdi, 22.5);
});

test('Skissen for fall: vinkel, mål og «ikke i målestokk» når vinkelen er overdrevet', () => {
  const slakt = tegnFall(regnFall({ kjent: 'forhold', verdi: 50, lengde: 2400 }));
  assert.ok(slakt.startsWith('<svg'));
  assert.ok(slakt.includes('2 400 mm') || slakt.includes('2 400 mm'));
  assert.ok(slakt.includes('48 mm'));
  assert.ok(slakt.includes('1:50'));
  assert.ok(slakt.includes('Ikke i målestokk'));
  assert.ok(!/NaN|undefined/.test(slakt));

  const tak = tegnFall(regnFall({ kjent: 'grader', verdi: 30 }));
  assert.ok(tak.includes(grader(30)));
  assert.ok(!tak.includes('Ikke i målestokk'));
  assert.ok(tak.includes('1 000 mm') || tak.includes('1 000 mm'));

  const flatt = tegnFall(regnFall({ kjent: 'prosent', verdi: 0 }));
  assert.ok(flatt.includes('Flatt, ingen fall'));
  assert.ok(!/NaN|undefined|Infinity/.test(flatt));
});

test('Forholdet skrives med to desimaler når det er bratt', () => {
  assert.equal(forholdTekst(50), '1:50');
  assert.equal(forholdTekst(68.5714), '1:68,6');
  assert.equal(forholdTekst(2.4751), '1:2,48');
  assert.equal(forholdTekst(Infinity), 'Flatt');
});

// ---------- Fase M1 ----------

// mm() skriver tusenskillet som hardt mellomrom (U+00A0). Testene sammenligner med vanlig mellomrom.
const rens = (t) => String(t).replace(/\u00a0/g, ' ');

const nokkel = (id, verdier) => {
  const k = finnKalkulator(id);
  const d = lesInndata(k, startverdier(k, verdier));
  const svar = k.regn(d);
  const vist = k.vis(svar, d);
  return {
    svar,
    forklaring: (vist.forklaring ?? []).map(rens),
    liste: vist.liste,
    verdi: (tittel) => { const n = vist.nokkeltall.find((x) => x[0] === tittel); return n ? rens(n[1]) : undefined; },
  };
};

test('Trekanten: eksempelet gir 5000 og vinklene på emnet og saga', () => {
  const { verdi, forklaring } = nokkel('trekant', finnKalkulator('trekant').eksempel);
  assert.equal(verdi('Skrå'), '5 000 mm');
  assert.equal(verdi('Vinkel'), '53,1°');
  assert.equal(verdi('Saga mot liggende'), '36,9°');
  assert.equal(verdi('Saga mot stående'), '53,1°');
  assert.ok(forklaring[0].includes('0° på saga er rett kapp'));
  // Bare de to feltene som hører til valget, vises
  const k = finnKalkulator('trekant');
  const v = startverdier(k, { kjent: 'skraVinkel' });
  assert.deepEqual(k.felt.filter((f) => erSynlig(f, v)).map((f) => f.id), ['kjent', 'skra', 'vinkel']);
  assert.equal(k.mangler(lesInndata(k, v)), 'Skriv inn de to målene du vet.');
});

test('Kiler og oppforing: eksempelet gir tabell med hver høyde og høy ende 70 mm', () => {
  const { verdi, liste, svar } = nokkel('oppforing', finnKalkulator('oppforing').eksempel);
  assert.equal(verdi('Høy ende'), '70 mm');
  assert.equal(verdi('Per c/c'), '12 mm');
  assert.equal(verdi('Fall'), '1:50');
  assert.deepEqual(liste.rader.map((r) => r[2]), ['10', '22', '34', '46', '58', '70']);
  assert.equal(svar.varsler[0].kilde, 'TEK17 § 13-15');
  // Høyde i lav ende har 0 som standard, så det holder med fall, lengde og c/c
  const k = finnKalkulator('oppforing');
  assert.equal(k.mangler(lesInndata(k, startverdier(k, { verdi: '50', lengde: '3000', cc: '600' }))), null);
});

test('Rett vinkel og diagonal: eksempelet er kontrolleksempelet med 20 mm skjevhet', () => {
  const { verdi, forklaring, svar } = nokkel('diagonal', finnKalkulator('diagonal').eksempel);
  assert.equal(verdi('Diagonal'), '10 000 mm');
  assert.equal(verdi('Skjevhet'), '20 mm');
  assert.equal(verdi('Kontroll 3-4-5'), '10 000 mm');
  assert.ok(forklaring[0].includes('Skyv siden motsatt av a 20 mm'));
  assert.equal(svar.varsler.length, 1);
  // Én diagonal: hvor mye den er for lang
  const en = nokkel('diagonal', { a: '8000', b: '6000', d1: '10010' });
  assert.equal(en.verdi('For lang'), '10 mm');
  // Like diagonaler: rett
  assert.ok(nokkel('diagonal', { a: '8000', b: '6000', d1: '10000', d2: '10000' }).forklaring[0].includes('Hjørnene er rette'));
});

test('Skissene i M1: mål, ingen NaN, og «ikke i målestokk» når noe er forstørret', () => {
  const t = rens(tegnTrekant(regnTrekant({ kjent: 'liggendeStaende', liggende: 3000, staende: 4000 })));
  for (const ord of ['Liggende 3 000 mm', '4 000 mm', '5 000 mm', grader(53.13), grader(36.87)]) assert.ok(t.includes(ord), ord);
  assert.ok(!t.includes('målestokk'));
  assert.ok(tegnTrekant(regnTrekant({ kjent: 'liggendeVinkel', liggende: 3000, vinkel: 3 })).includes('Ikke i målestokk'));

  const o = rens(tegnOppforing(regnOppforing({ kjent: 'prosent', verdi: 2, lengde: 3000, cc: 600, start: 10 })));
  for (const ord of ['>10<', '>70<', '>3 000<', 'Lav ende', 'Høy ende', 'ikke i målestokk']) assert.ok(o.includes(ord), ord);
  // Mange punkter: tallene går ikke i hverandre, men første og siste har alltid mål
  const mange = rens(tegnOppforing(regnOppforing({ kjent: 'prosent', verdi: 2, lengde: 12000, cc: 300 })));
  assert.ok(mange.includes('>240<') && mange.includes('>12 000<'));
  assert.ok((mange.match(/font-weight="700"/g) ?? []).length <= 8);
  // Flatt og uten høyde i lav ende: ingen NaN
  assert.ok(!/NaN|Infinity/.test(tegnOppforing(regnOppforing({ kjent: 'prosent', verdi: 0, lengde: 3000, cc: 600 }))));

  const dg = rens(tegnDiagonal(regnDiagonal({ a: 8000, b: 6000, d1: 10016, d2: 9984 })));
  for (const ord of ['10 000 mm', 'a = 8 000 mm', '6 000 mm', 'Skyv 20 mm', 'ikke i målestokk']) assert.ok(dg.includes(ord), ord);
  assert.ok(!tegnDiagonal(regnDiagonal({ a: 8000, b: 6000 })).includes('Skyv'));
  for (const svg of [t, o, mange, dg]) assert.ok(!/NaN|undefined/.test(svg));
});

// ---------- Fase M2 ----------

test('Lik avstand: eksempelet gir 7 felt à 571,4 og merkene fra planen, og feltene følger valget', () => {
  const { verdi, liste } = nokkel('likAvstand', finnKalkulator('likAvstand').eksempel);
  assert.equal(verdi('Felt'), '7');
  assert.equal(verdi('C/c'), '571,4 mm');
  assert.deepEqual(liste.rader.map((r) => rens(r[1])), ['571', '1 143', '1 714', '2 286', '2 857', '3 429']);
  const k = finnKalkulator('likAvstand');
  const lekter = startverdier(k, { metode: 'lekter' });
  assert.equal(erSynlig(k.felt.find((f) => f.id === 'min'), lekter), true);
  assert.equal(erSynlig(k.felt.find((f) => f.id === 'min'), startverdier(k, {})), false);
  assert.equal(tekstFor(k.felt.find((f) => f.id === 'maks').ledetekst, lekter), 'Største lekteavstand (mm)');
  // Lekter har ingen standardverdier: uten minste avstand regnes det ikke
  assert.equal(k.mangler(lesInndata(k, startverdier(k, { metode: 'lekter', lengde: '4500', maks: '375' }))), 'Skriv inn minste lekteavstand.');
  const fast = nokkel('likAvstand', { metode: 'fast', lengde: '4000', maks: '600' });
  assert.equal(fast.verdi('Rest'), '400 mm');
});

test('Spiler og rekkverk: eksempelet gir 15 spiler, åpning 92,8 og merkene fra planen', () => {
  const { verdi, liste, svar } = nokkel('spiler', finnKalkulator('spiler').eksempel);
  assert.equal(verdi('Spiler'), '15');
  assert.equal(verdi('Åpning'), '92,8 mm');
  assert.equal(verdi('Én spile færre'), '100,4 mm');
  assert.deepEqual(liste.rader.slice(0, 4).map((r) => r[1]), ['93', '207', '320', '434']);
  assert.equal(svar.varsler[0].kilde, 'TEK17 § 12-15 femte ledd');
  // Største åpning har 100 som standard (avklart med Kenny)
  const k = finnKalkulator('spiler');
  assert.equal(startverdier(k, {}).maks, '100');
});

test('Terrassebord: eksempelet gir 24 bord, spalte 5,2 og ett færre og ett mer', () => {
  const { verdi, liste } = nokkel('bord', finnKalkulator('bord').eksempel);
  assert.equal(verdi('Bord'), '24');
  assert.equal(verdi('Spalte'), '5,2 mm');
  assert.equal(verdi('23 bord'), '10,9 mm');
  assert.equal(verdi('25 bord'), '0 mm');
  assert.equal(liste.rader.length, 24);
});

test('Skissene i M2: mål og ingen NaN', () => {
  const lik = rens(tegnInndeling(fordelLikt({ metode: 'lik', lengde: 4000, maks: 600 })));
  for (const ord of ['7 felt à 571,4 mm', '>571<', '>4 000<']) assert.ok(lik.includes(ord), ord);
  const fast = rens(tegnInndeling(fordelLikt({ metode: 'fast', lengde: 4000, maks: 600 })));
  assert.ok(fast.includes('rest 400 mm'));
  const mange = rens(tegnInndeling(fordelLikt({ metode: 'lik', lengde: 12000, maks: 300 })));
  // 40 felt på 340 px: mål bare der det er minst 44 px mellom tallene, altså høyst 8
  assert.ok((mange.match(/font-size="14"/g) ?? []).length <= 8);

  const sp = rens(tegnSpiler(fordelSpiler({ lysapning: 1800, bredde: 21, maks: 100 })));
  for (const ord of ['Åpning 92,8 mm', 'Lysåpning 1 800 mm, 15 spiler']) assert.ok(sp.includes(ord), ord);
  assert.equal((sp.match(/opacity="0.8"/g) ?? []).length, 15);
  const ingen = rens(tegnSpiler(fordelSpiler({ lysapning: 90, bredde: 21, maks: 100 })));
  assert.ok(ingen.includes('0 spiler'));

  const b = rens(tegnBord(fordelBord({ bredde: 3000, bordbredde: 120, spalte: 5 })));
  for (const ord of ['24 bord, spalte 5,2 mm', 'Bredde 3 000 mm']) assert.ok(b.includes(ord), ord);
  for (const svgTekst of [lik, fast, mange, sp, ingen, b]) assert.ok(!/NaN|undefined|Infinity/.test(svgTekst));
});

test('Utsetting av spiler: merkene er de samme som i lista, og forkanten står på merket', () => {
  // Kennys rekkverk 2026-11-11: 1200 mm, 48 mm spiler, maks 100 gir 8 spiler, åpning 90,7, merker 91, 229, 368
  const r = fordelSpiler({ lysapning: 1200, bredde: 48, maks: 100 });
  const u = rens(tegnSpilerUtsetting(r));
  for (const ord of ['Slik setter du ut målene', '>91<', '>229<', '>368<', '>90,7<', '>48<', 'Stolpe', '…']) assert.ok(u.includes(ord), ord);
  assert.equal((u.match(/var\(--bakoy-oransje\)" stroke-width="2.5"/g) ?? []).length, 3, 'tre merker');
  assert.ok(!/NaN|undefined|Infinity/.test(u));
  // Få spiler: alle vises, med stolpen i andre enden og siste åpning målsatt
  const to = rens(tegnSpilerUtsetting(fordelSpiler({ lysapning: 300, bredde: 48, maks: 100 })));
  assert.ok(!to.includes('…'));
  // 300 mm med to spiler: tre åpninger på 68 og første merke på 68
  assert.equal((to.match(/>68</g) ?? []).length, 4, 'tre åpninger og første merke');
  assert.ok(to.includes('>184<'));
  // Ingen spiler: ingen utsetting
  assert.equal(tegnSpilerUtsetting(fordelSpiler({ lysapning: 90, bredde: 21, maks: 100 })), '');
  // Trinnene står over skissen, og kontrollmålet er åpningen
  const { forklaring } = nokkel('spiler', { lysapning: '1200', bredde: '48', maks: '100' });
  assert.equal(forklaring.length, 4);
  assert.ok(forklaring[3].includes('90,7 mm'));
});
