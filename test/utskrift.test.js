// Tester for utskriften (PDF) og data for eksempler.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losHus } from '../src/tommermann/hus.js';
import { lagMaterialliste } from '../src/tommermann/materialer.js';
import { lagUtskrift, lesEksempeldata } from '../src/skjerm/utskrift.js';

const vegg = (navn, lengde, apninger = []) => ({ navn, lengde, hoyde: 2400, bu: 148, bo: 148, tykkelseUnder: 19,
  tykkelseOver: 19, karmBord: 'O', hjorneVenstre: 'O', hjorneHoyre: 'O', startvalg: 'venstre', innleggMin: 10,
  innleggStandard: 15, innleggMax: 20, oMin: 20, oIdeal: 25, oMax: 30, apninger,
  hjorner: { venstre: { type: 'mot', kasse: 98 }, hoyre: { type: 'forbi', kasse: 98 } } });

test('Utskriften har all inndata, resultater for hver vegg, huset og data som gjenskaper det', () => {
  const alle = [vegg('Sør', 6000, [{ type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 }]),
    vegg('Øst', 4000), vegg('Nord', 6000), vegg('Vest', 4000)];
  const husSvar = losHus({ vegger: alle, lukket: true });
  const liste = lagMaterialliste(husSvar.vegger.map((r, k) => ({ ...r, navn: alle[k].navn })));
  const hus = { vegger: alle, aktiv: 0, lukket: true, materialer: {} };
  const html = lagUtskrift({ hus, alle, husSvar, liste, versjon: 'test', dato: new Date(2026, 10, 9) });
  for (const tekst of ['Utskrift 09.11.2026, versjon test', '1. Sør', '4. Vest', 'Vegglengde', '6&nbsp;000 mm'.replace('&nbsp;', ' '),
    'Mot naboveggen, Påbord ytterst', 'Går forbi, Påbord ytterst', '1. Vindu', 'Slik setter du opp', 'Hele huset',
    'H1: Sør (høyre) møter Øst (venstre)', 'Materialer', 'Kappliste Sør', 'Data for å gjenskape eksempelet']) {
    assert.ok(html.includes(tekst), `mangler «${tekst}»`);
  }
  assert.equal((html.match(/class="u-vegg"/g) ?? []).length, 4 + 2); // 4 vegger + hus + materialer
  assert.doesNotMatch(html, /\u2014/); // ingen lang tankestrek
  // Dataene nederst gir tilbake nøyaktig det samme huset
  const data = html.match(/<pre>([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.deepEqual(lesEksempeldata(data), hus);
});

test('Data som ikke er fra appen, gir en forklaring', () => {
  assert.throws(() => lesEksempeldata('hei'), /ikke gyldige data/);
  assert.throws(() => lesEksempeldata('{"app":"noe annet"}'), /ikke data fra Tømmermannspanel/);
});
