// Uavhengig kontroll av veggmodellen med mange tilfeldige vegger.
// Testen bruker ikke regnestykkene i vegg.js, den ser bare på bordene som kommer ut,
// og sjekker det en tømrer ville sett på veggen:
//
//  1. Antall felt: ett mellom hver åpning og hjørne, pluss ett over og ett under hver åpning
//     der det er plass.
//  2. Innlegget på karmen er alltid 10–20 mm, og bordet ved karmen slutter akkurat der.
//  3. I hver høyde dekker bordene hele veggen fra hjørne til hjørne. Eneste åpning er selve
//     vinduet eller døra innenfor karmen.
//  4. To underbord ligger aldri oppå hverandre, og to påbord ligger aldri oppå hverandre.
//  5. Et påbord ligger alltid inn over underbordene på begge sider med omlegget for feltet.
//     Unntaket er der det ikke finnes underbord: ved karm (kloss) og i hjørnet (underlag).
//  6. Omlegget er aldri under 20 mm.
//
// Veggene lages med fast startverdi, så testen gir samme vegger hver gang.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { losVegg } from '../src/tommermann/vegg.js';
import { STANDARD_BREDDER } from '../src/tommermann/fagverdier.js';

const E = 1e-6;

// Enkel tilfeldig-generator med fast start (samme tall hver gang)
function generator(start) {
  let s = start;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function lagVegg(tilfeldig) {
  const velg = (liste) => liste[Math.floor(tilfeldig() * liste.length)];
  const mellom = (a, b) => Math.round(a + tilfeldig() * (b - a));
  const lengde = mellom(3000, 12000);
  const hoyde = mellom(2200, 3000);
  const bu = velg(STANDARD_BREDDER);
  const bo = velg(STANDARD_BREDDER);
  const apninger = [];
  let x = mellom(300, 1500);
  const antall = mellom(0, 3);
  for (let i = 0; i < antall; i++) {
    const type = velg(['vindu', 'vindu', 'dor', 'port']);
    const bredde = type === 'port' ? mellom(2000, 3000) : mellom(500, 1300);
    const h = type === 'vindu' ? mellom(400, 1400) : mellom(2000, Math.min(2300, hoyde - 50));
    const bunn = type === 'vindu' ? mellom(300, hoyde - h - 100) : 0;
    if (x + bredde > lengde - 300) break;
    apninger.push({ type, x, bredde, hoyde: h, bunn });
    x += bredde + mellom(300, 2000);
  }
  return {
    lengde, hoyde, bu, bo, apninger,
    karmBord: velg(['U', 'O']),
    hjorneVenstre: velg(['U', 'O']),
    hjorneHoyre: velg(['U', 'O']),
    startvalg: velg(['venstre', 'hoyre', 'midten', ...apninger.map((_, j) => `apning:${j}`)]),
  };
}

test('Tilfeldige vegger: felt, innlegg, dekning og overlapp stemmer', () => {
  const tilfeldig = generator(20261108);
  let sjekketVegger = 0;
  let sjekketSnitt = 0;
  let ikkeOpp = 0;

  for (let nr = 0; nr < 400; nr++) {
    const inn = lagVegg(tilfeldig);
    const r = losVegg(inn);
    const hva = `vegg ${nr}: ${JSON.stringify(inn)}`;
    assert.ok(!r.feil, `${hva} ga feil: ${r.feil}`);

    // 1. Antall felt
    const forventet = r.apninger.length + 1 + r.apninger.reduce((sum, a) =>
      sum + (a.bunn + a.hoyde < r.hoyde ? 1 : 0) + (a.bunn > 0 ? 1 : 0), 0);
    assert.equal(r.felt.length, forventet, `${hva}: antall felt`);

    // 2. Innlegg 10–20 mm
    for (const a of r.apninger) {
      for (const e of [a.innlegg.venstre, a.innlegg.hoyre]) {
        assert.ok(e >= 10 - E && e <= 20 + E, `${hva}: innlegg ${e}`);
      }
    }

    if (!r.ok) { ikkeOpp++; continue; }
    sjekketVegger++;

    // 6. Omlegg aldri under 20
    for (const f of r.felt) assert.ok(f.losning.omlegg >= 20 - E, `${hva}: omlegg ${f.losning.omlegg}`);

    // Høyder å ta snitt i: nær bakken, nær toppen, og gjennom/over/under hver åpning
    const hoyder = [10, r.hoyde - 10];
    for (const a of r.apninger) {
      hoyder.push(a.bunn + a.hoyde / 2);
      if (a.bunn > 20) hoyder.push(a.bunn / 2);
      if (a.bunn + a.hoyde < r.hoyde - 20) hoyder.push((a.bunn + a.hoyde + r.hoyde) / 2);
    }

    for (const y of hoyder) {
      sjekketSnitt++;
      const hvor = `${hva}, høyde ${y}`;
      const aktive = r.felt.filter((f) => y > f.y0 && y < f.y1);
      const U = aktive.flatMap((f) => f.underliggere.map((b) => ({ ...b, felt: f })))
        .sort((a, b) => a.fraEksakt - b.fraEksakt);
      const O = aktive.flatMap((f) => f.overliggere.map((b) => ({ ...b, felt: f })))
        .sort((a, b) => a.fraEksakt - b.fraEksakt);
      const gjennom = r.apninger.filter((a) => y > a.bunn && y < a.bunn + a.hoyde);

      // 4. Ingen overlapp mellom to underbord eller to påbord
      for (const liste of [U, O]) {
        for (let i = 1; i < liste.length; i++) {
          assert.ok(liste[i].fraEksakt >= liste[i - 1].tilEksakt - E,
            `${hvor}: to ${liste === U ? 'underbord' : 'påbord'} overlapper ved ${liste[i].fra}`);
        }
      }

      // 3. Dekning fra hjørne til hjørne. Åpningen (innenfor karmen) regnes som dekket,
      //    men bordet må gå inn på karmen, så karmkanten i seg selv er ikke nok.
      const dekket = [...U, ...O].map((b) => [b.fraEksakt, b.tilEksakt]);
      for (const a of gjennom) dekket.push([a.x + a.innlegg.venstre, a.x + a.bredde - a.innlegg.hoyre]);
      dekket.sort((a, b) => a[0] - b[0]);
      let til = 0;
      assert.ok(Math.abs(dekket[0][0]) < E, `${hvor}: veggen starter ikke på 0`);
      for (const [fra, slutt] of dekket) {
        assert.ok(fra <= til + E, `${hvor}: hull i kledningen mellom ${til.toFixed(1)} og ${fra.toFixed(1)}`);
        til = Math.max(til, slutt);
      }
      assert.ok(Math.abs(til - r.lengde) < E, `${hvor}: kledningen slutter på ${til}, ikke ${r.lengde}`);

      // 2b. Bordet ved karmen slutter akkurat der innlegget sier
      for (const a of gjennom) {
        const venstreKant = Math.max(...[...U, ...O].filter((b) => b.tilEksakt <= a.x + 20 + E).map((b) => b.tilEksakt));
        const hoyreKant = Math.min(...[...U, ...O].filter((b) => b.fraEksakt >= a.x + a.bredde - 20 - E).map((b) => b.fraEksakt));
        assert.ok(Math.abs(venstreKant - (a.x + a.innlegg.venstre)) < E, `${hvor}: venstre karmkant`);
        assert.ok(Math.abs(hoyreKant - (a.x + a.bredde - a.innlegg.hoyre)) < E, `${hvor}: høyre karmkant`);
      }

      // 5. Påbord ligger inn over underbord med feltets omlegg på begge sider
      for (const o of O) {
        const venstre = U.filter((u) => u.fraEksakt < o.fraEksakt && u.tilEksakt > o.fraEksakt + E);
        const hoyre = U.filter((u) => u.tilEksakt > o.tilEksakt && u.fraEksakt < o.tilEksakt - E);
        const omleggV = venstre.length ? venstre[0].tilEksakt - o.fraEksakt : null;
        const omleggH = hoyre.length ? o.tilEksakt - hoyre[0].fraEksakt : null;
        const vedKarmEllerHjorne = (x) => x < E || x > r.lengde - E
          || gjennom.some((a) => x >= a.x - E && x <= a.x + a.bredde + E);
        if (omleggV === null) {
          assert.ok(vedKarmEllerHjorne(o.fraEksakt) || vedKarmEllerHjorne(o.tilEksakt),
            `${hvor}: påbord ved ${o.fra} mangler underbord til venstre`);
        } else {
          assert.ok(omleggV >= 20 - E, `${hvor}: omlegg ${omleggV.toFixed(1)} til venstre for påbord ved ${o.fra}`);
        }
        if (omleggH === null) {
          assert.ok(vedKarmEllerHjorne(o.fraEksakt) || vedKarmEllerHjorne(o.tilEksakt),
            `${hvor}: påbord ved ${o.fra} mangler underbord til høyre`);
        } else {
          assert.ok(omleggH >= 20 - E, `${hvor}: omlegg ${omleggH.toFixed(1)} til høyre for påbord ved ${o.fra}`);
        }
      }
    }
  }

  // Testen skal faktisk ha sjekket noe
  assert.ok(sjekketVegger > 50, `bare ${sjekketVegger} vegger gikk opp`);
  console.log(`Kontrollert ${sjekketVegger} vegger og ${sjekketSnitt} snitt. ${ikkeOpp} vegger hadde felt som ikke gikk opp.`);
});
