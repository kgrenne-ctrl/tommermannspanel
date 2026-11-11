// Tester for skjermdelen i Matte som kan kjøres uten nettleser: oppføringene i matte-liste.js
// og skissene i matte-tegning.js. Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRUPPER, KALKULATORER, finnKalkulator, startverdier, lesInndata, tekstFor, erSynlig } from '../src/skjerm/matte-liste.js';
import { tegnFall, forholdTekst } from '../src/skjerm/matte-tegning.js';
import { regnFall } from '../src/matte/tak.js';
import { grader } from '../src/skjerm/format.js';

// Alt som skal vises: nøkkeltall, utregning og skisse
function alleTekster(k, svar, d) {
  const { nokkeltall, utregning } = k.vis(svar, d);
  return [...nokkeltall.flat(), ...utregning, k.tegn ? k.tegn(svar, d) : '', ...(svar.varsler ?? []).map((v) => v.tekst)];
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
