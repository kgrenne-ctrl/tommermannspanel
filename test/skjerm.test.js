// Tester for hjelpefilene til skjermen (tallformat og tegning). Kjøres med: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lesTall, mm, trygtNavn } from '../src/skjerm/format.js';
import { tegnFelt, tegnNullpunkt, tegnVegg, tegnSnitt, tegnHjorne, tegnHus } from '../src/skjerm/tegning.js';
import { losFelt } from '../src/tommermann/solver.js';
import { losHus } from '../src/tommermann/hus.js';

const tell = (tekst, bit) => tekst.split(bit).length - 1;

test('lesTall forstår komma, mellomrom og tomt felt', () => {
  assert.equal(lesTall('1350'), 1350);
  assert.equal(lesTall('92,4'), 92.4);
  assert.equal(lesTall(' 1 350 '), 1350);
  assert.equal(lesTall(''), null);
  assert.equal(lesTall('abc'), null);
});

test('mm skriver desimalkomma og runder av', () => {
  assert.equal(mm(92.4, 1), '92,4');
  assert.equal(mm(27.8333, 1), '27,8');
  assert.equal(mm(240.4), '240');
});

test('Tegningen har alle bordene, i begge visningene', () => {
  // NDLA: 6 underliggere og 5 overliggere, tegnet både forfra og i snitt
  const l = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  const svg = tegnFelt(l);
  assert.ok(svg.startsWith('<svg'));
  assert.equal(tell(svg, 'data-bord="u"'), 12);
  assert.equal(tell(svg, 'data-bord="o"'), 10);
  assert.equal(tell(svg, 'data-underlag'), 0);
});

test('Tegningen: bordene i snittet er like tykke i korte og lange felt, og flatere enn de er brede', () => {
  // Før var tykkelsen 5 % av feltlengden: 438 mm i et felt på 8760 mm (Kenny 2026-11-10)
  const tykkelser = [1350, 8760].map((L) => {
    const l = losFelt({ L, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
    const bord = [...tegnFelt(l).matchAll(/<rect data-bord="[uo]"[^>]* width="([\d.]+)" height="([\d.]+)"/g)]
      .map((m) => ({ bredde: Number(m[1]), hoyde: Number(m[2]) }));
    // Første halvdel er tegningen forfra, andre halvdel er snittet
    const snitt = bord.filter((b) => b.hoyde < L * 0.3 - 1e-6);
    assert.equal(snitt.length, bord.length / 2);
    for (const b of snitt) assert.ok(b.hoyde < b.bredde / 3, `bord ${b.bredde} x ${b.hoyde}`);
    return snitt[0].hoyde;
  });
  assert.equal(tykkelser[0], tykkelser[1]);
});

test('Skissen av nullpunktet viser startkanten og de første målene i tabellen', () => {
  // Kennys felt: 8760 mm, 148/148, påbord i begge ender. Første underbord står fra 123 til 271.
  const o = losFelt({ L: 8760, bu: 148, bo: 148, start: 'O', slutt: 'O' }).valgt;
  assert.deepEqual([o.underliggere[0].fra, o.underliggere[0].til], [123, 271]);
  const svgO = tegnNullpunkt(o);
  assert.equal(tell(svgO, 'data-nullpunkt'), 1);
  const maal = (svg) => [...svg.matchAll(/data-maal="(\d+)" x1="0"/g)].map((m) => Number(m[1]));
  assert.deepEqual(maal(svgO), [123, 271, o.underliggere[1].fra]);
  assert.ok(svgO.includes('0 = startkanten'));
  // Starter feltet med underbord, står det i nullpunktet: da er første mål enden av bordet
  const u = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  assert.deepEqual(maal(tegnNullpunkt(u)), [148, u.underliggere[1].fra]);
});

test('Snittene i «Ett felt» har veggen øverst og påbordene nederst, som veggskissen', () => {
  const l = losFelt({ L: 1350, bu: 148, bo: 148, start: 'O', slutt: 'O' }).valgt;
  const y = (svg, type) => [...svg.matchAll(new RegExp(`<rect data-bord="${type}"[^>]* y="([\\d.]+)"`, 'g'))].map((m) => Number(m[1]));
  // tegnFelt: første halvdel er tegningen forfra, andre halvdel snittet
  const fU = y(tegnFelt(l), 'u'); const fO = y(tegnFelt(l), 'o');
  assert.ok(fO.at(-1) > fU.at(-1), 'påbordene skal ligge under underbordene i snittet');
  // Skissen av nullpunktet
  const nU = y(tegnNullpunkt(l), 'u'); const nO = y(tegnNullpunkt(l), 'o');
  assert.ok(Math.min(...nO) > Math.max(...nU));
});

test('Ett felt som starter i et hjørne: hjørnet tegnes med nullpunktet i startkanten', async () => {
  const { feltSomHjorne } = await import('../src/tommermann/hus.js');
  const o = losFelt({ L: 1266, bu: 98, bo: 98, start: 'O', slutt: 'O' }).valgt;
  const u = losFelt({ L: 1350, bu: 148, bo: 148, start: 'U', slutt: 'U' }).valgt;
  // Hvor langt utenfor lekthjørnet startkanten ligger (19 mm bord, samme bord på naboveggen):
  // påbord mot: 19 (inn til påbordet på naboveggen), påbord forbi: 38, underbord mot: 0, forbi: 19
  const ut = (l, type) => feltSomHjorne(l, type).forleng.venstre;
  assert.deepEqual([ut(o, 'mot'), ut(o, 'forbi'), ut(u, 'mot'), ut(u, 'forbi')], [19, 38, 0, 19]);
  // Første påbord står fra −19 til 79 målt fra lekthjørnet, og er 98 mm bredt (ikke kløyvd)
  const v = feltSomHjorne(o, 'mot');
  assert.deepEqual([v.felt[0].overliggere[0].fraEksakt, v.felt[0].overliggere[0].tilEksakt], [-19, 79]);
  const svg = tegnHjorne(v, 'venstre', null, 'Naboveggen', { startkant: -19 });
  assert.match(svg, /<line data-nullpunkt="0" x1="-19" /);
  assert.match(svg, /0 = startkanten, 19 mm utenfor hjørnet på lektene/);
  assert.match(svg, /x="-19" y="19" width="98" height="19"[^>]*data-bord="o"/);
  // Underbord som slutter mot: startkanten er i lekthjørnet
  assert.match(tegnHjorne(feltSomHjorne(u, 'mot'), 'venstre', null, 'Naboveggen', { startkant: 0 }), /0 = startkanten, i hjørnet på lektene/);
});

test('Tegningen markerer underlag i kanter med overligger', () => {
  const l = losFelt({ L: 1266, bu: 98, bo: 98, start: 'O', slutt: 'O' }).valgt;
  assert.equal(tell(tegnFelt(l), 'data-underlag'), 2);
});

test('Veggtegningen har åpningene og markerer felt som ikke går opp', async () => {
  const { tegnVegg } = await import('../src/skjerm/tegning.js');
  const { losVegg } = await import('../src/tommermann/vegg.js');
  const r = losVegg({ lengde: 6000, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 },
  ] });
  const svg = tegnVegg(r);
  assert.equal(tell(svg, 'data-apning='), 2);
  assert.equal(tell(svg, 'data-feil='), 1); // feltet mellom vinduet og porten
  const feilFelt = r.felt.find((f) => !f.ok);
  assert.ok(feilFelt.x1 - feilFelt.x0 > 400, 'feltet som ikke går opp skal ha bredde i tegningen');
  // Hvert bord tegnes én gang per høyde feltet har (over og under en åpning = to høyder)
  const antallBord = r.felt.filter((f) => f.ok)
    .reduce((sum, f) => sum + (f.underliggere.length + f.overliggere.length) * f.deler.length, 0);
  assert.equal(tell(svg, 'data-bord='), antallBord);
});

test('Horisontalsnitt gjennom vinduet viser karm og sidefelt, uten kloss ved karmen', async () => {
  const { tegnSnitt } = await import('../src/skjerm/tegning.js');
  const { losVegg } = await import('../src/tommermann/vegg.js');
  const r = losVegg({ lengde: 7599, hoyde: 2400, bu: 148, bo: 148, hjorneVenstre: 'U', hjorneHoyre: 'U',
    apninger: [{ type: 'vindu', x: 1560, bredde: 1000, hoyde: 1000, bunn: 1000 }] });
  const gjennom = tegnSnitt(r, 1500);
  assert.equal(tell(gjennom, 'data-karm='), 1);
  assert.equal(tell(gjennom, 'data-kloss='), 0); // påbordet ligger an på karmen
  assert.equal(tell(gjennom, 'data-underlag='), 0); // underbord i hjørnene i denne testen
  const sider = r.felt.filter((f) => f.type === 'side');
  const antallSide = sider.reduce((s, f) => s + f.underliggere.length + f.overliggere.length, 0);
  assert.equal(tell(gjennom, 'data-bord='), antallSide);
  // Over vinduet er det ingen karm, men feltet over vinduet er med
  const over = tegnSnitt(r, 2200);
  assert.equal(tell(over, 'data-karm='), 0);
  assert.equal(tell(over, 'data-kloss='), 0);
  // Med påbord i hjørnene vises underlag ved begge hjørner
  const medPabord = losVegg({ lengde: 7599, hoyde: 2400, bu: 148, bo: 148,
    apninger: [{ type: 'vindu', x: 1560, bredde: 1000, hoyde: 1000, bunn: 1000 }] });
  assert.equal(tell(tegnSnitt(medPabord, 1500), 'data-underlag='), 2);
  const overFelt = r.felt.find((f) => f.type === 'overunder');
  assert.equal(tell(over, 'data-bord='), antallSide + overFelt.underliggere.length + overFelt.overliggere.length);
});

test('Veggtegningen legger alle underbord bak alle påbord', async () => {
  const { tegnVegg } = await import('../src/skjerm/tegning.js');
  const { losVegg } = await import('../src/tommermann/vegg.js');
  const r = losVegg({ lengde: 7599, hoyde: 2400, bu: 148, bo: 148,
    apninger: [{ type: 'vindu', x: 1560, bredde: 1000, hoyde: 1000, bunn: 1000 }] });
  const svg = tegnVegg(r);
  assert.ok(svg.lastIndexOf('data-bord="u"') < svg.indexOf('data-bord="o"'),
    'ingen underbord skal tegnes etter første påbord');
});

test('Veggtegningen har nummer på hvert felt, også felt som ikke går opp', async () => {
  const { tegnVegg } = await import('../src/skjerm/tegning.js');
  const { losVegg } = await import('../src/tommermann/vegg.js');
  const r = losVegg({ lengde: 6000, hoyde: 2400, bu: 148, bo: 148, apninger: [
    { type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 },
    { type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 },
  ] });
  const svg = tegnVegg(r);
  assert.equal(tell(svg, 'data-feltnr='), r.felt.length);
  for (let nr = 1; nr <= r.felt.length; nr++) assert.ok(svg.includes(`data-feltnr="${nr}"`));
});

test('Hjørner: hjørnekasse tegnes forfra, og snittet viser kasse og nabovegg', () => {
  const { vegger: [r] } = losHus({ vegger: [{ lengde: 3000, hoyde: 2400, bu: 148, bo: 148,
    hjorner: { venstre: { type: 'kasse', kasse: 98 }, hoyre: { type: 'forbi' } } }] });
  const forfra = tegnVegg(r);
  assert.match(forfra, /data-hjornekasse="venstre" x="0" y="0" width="98"/);
  assert.doesNotMatch(forfra, /data-hjornekasse="hoyre"/);
  const snitt = tegnSnitt(r, 1200);
  assert.match(snitt, /data-hjorne="venstre" x="0" y="\d+" width="98"/);
  // Naboveggen til høyre: kledningen går 38 mm forbi og dekker enden av naboens kledning
  assert.match(snitt, /data-hjorne="hoyre" data-nabo="ja" x="3000" y="\d+" width="38"/);
});

test('Hjørnet sett ovenfra: påbord mot påbord med kloss, i riktig mål', () => {
  // A går forbi i høyre hjørne, B slutter mot i venstre, påbord ytterst på begge
  const v = { lengde: 3000, hoyde: 2400, bu: 148, bo: 148 };
  const { vegger: [a, b] } = losHus({ lukket: false, vegger: [
    { ...v, navn: 'A', hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'forbi' } } },
    { ...v, navn: 'B', hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'mot' } } }] });
  const svgB = tegnHjorne(b, 'venstre', a, 'A');
  // Påbordet på B starter 19 mm før hjørnet, utenpå underbordsjiktet (y = 19, 19 mm tykt)
  // og er kløyvd 19 mm, til 129 mm
  assert.match(svgB, /x="-19" y="19" width="129" height="19"[^>]*data-bord="o"/);
  // Påbordet på A står på tvers, fra x = −38 til −19, og går ned til y = 38
  assert.match(svgB, /x="-38" y="-110" width="19" height="148"[^>]*data-bord="o" data-nabo="ja"/);
  // Kloss bak påbordene på begge veggene
  assert.equal((svgB.match(/data-kloss="ja"/g) ?? []).length, 2);
  assert.match(svgB, />A</);
  // Nullpunktet er hjørnet utenpå lektene (x = 0 i tegningen). Påbordet starter 19 mm før.
  assert.match(svgB, /<line data-nullpunkt="0" x1="0" /);
  assert.match(svgB, /0 = hjørnet utenpå lektene/);
  // I høyre hjørne er samme punkt vegglengden
  const svgHoyre = tegnHjorne(b, 'hoyre', null, 'Naboveggen');
  assert.match(svgHoyre, /<line data-nullpunkt="3000" x1="0" /);
  assert.match(svgHoyre, /3\s000 = hjørnet utenpå lektene \(vegglengden\)/);
  // Uten nabovegg: bare hjørnebordet, merket som antatt
  assert.match(tegnHjorne(b, 'hoyre', null, 'Naboveggen'), /Naboveggen \(antatt\)/);
});

test('Husskissen: fire vegger går i ring, og veggen som går forbi vises i hjørnet', async () => {
  const { lagHjorneoversikt } = await import('../src/tommermann/hus.js');
  const vegger = [3000, 5000, 3000, 5000].map((lengde, i) => ({ lengde, hoyde: 2400, bu: 148, bo: 148,
    navn: `Vegg ${i + 1}`, hjorner: { venstre: { type: 'mot' }, hoyre: { type: 'forbi' } } }));
  const o = lagHjorneoversikt({ vegger, resultater: losHus({ vegger, lukket: true }).vegger, lukket: true });
  const svg = tegnHus({ vegger, hjorner: o.hjorner, lukket: true, aktiv: 0 });
  // Vegg 1 mot høyre, Vegg 2 opp, Vegg 3 mot venstre, Vegg 4 ned til start
  assert.match(svg, /data-husvegg="0" x1="0" y1="0" x2="3000" y2="0"/);
  assert.match(svg, /data-husvegg="1" x1="3000" y1="0" x2="3000" y2="-5000"/);
  assert.match(svg, /data-husvegg="3" x1="0" y1="-5000" x2="0" y2="0"/);
  assert.equal((svg.match(/data-forbi=/g) ?? []).length, 4);
  assert.doesNotMatch(svg, /data-glipe/);
  // Feil lengde: huset går ikke i ring
  const skjev = tegnHus({ vegger: vegger.map((v, i) => (i === 2 ? { ...v, lengde: 3500 } : v)), hjorner: o.hjorner, lukket: true });
  assert.match(skjev, /data-glipe="ja"/);
});

test('trygtNavn tar bort tegn som ville blitt lest som kode i siden', () => {
  assert.equal(trygtNavn('  Vegg mot nord '), 'Vegg mot nord');
  assert.equal(trygtNavn('<b>Sør</b>'), 'bSør/b');
  assert.equal(trygtNavn('Vegg 2 & garasje'), 'Vegg 2 & garasje');
  assert.equal(trygtNavn(undefined), '');
  assert.equal(trygtNavn('<>'), '');
});
