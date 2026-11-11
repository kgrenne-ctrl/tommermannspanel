// Stegene i «Se det steg for steg»: hvordan vangen merkes, ett grep om gangen.
// Bare tekst og rekkefølge her. Målene kommer fra vange.js, tegningen fra tegnMerkesteg.
//
// Rekkefølge: bordet og spiss 0, én spiss om gangen (med hjelpespissen øverst), ett hakk om
// gangen med vinkelen, bunnen, toppen, kapping, og til slutt vangen reist i trappa.

import { mm } from './format.js';

export function lagMerkesteg(vange, l, { nese = 20 } = {}) {
  const h = mm(l.opptrinn, 1);
  const b = mm(l.inntrinn, 1);
  const m = vange.hakk.length;
  const eget = l.antallInntrinn === l.antallOpptrinn;
  const steg = [];

  steg.push({ type: 'bord', nr: 0, tittel: 'Bordet',
    tekst: `Legg bordet på bukkene med overkanten mot deg. Mål ${mm(vange.spissFraEnden)} mm fra venstre ende `
      + 'langs overkanten og sett et merke. Det er spiss 0. Alle andre mål tas fra den.' });

  vange.merker.forEach((merke, i) => {
    if (i === 0) return;
    steg.push({ type: 'spiss', nr: i, tittel: merke.hjelp ? `Spiss ${i} (hjelpespiss)` : `Spiss ${i}`,
      tekst: `Mål ${mm(merke.avstand)} mm fra spiss 0 langs overkanten og sett et merke.`
        + (merke.hjelp ? ' Denne trengs bare for å tegne øverste hakk, og kappes bort.' : '') });
  });

  for (let k = 1; k <= m; k++) {
    steg.push({ type: 'hakk', nr: k, tittel: `Hakk ${k} av ${m}`,
      tekst: `Legg vinkelen med ${b} mm mot spiss ${k - 1} og ${h} mm mot spiss ${k}. Tegn langs begge armene.`
        + (k === 1 ? ` Streken for inntrinnet${l.inntrinn > l.opptrinn ? ' (den lange)' : ''} er der trinnet ligger.` : '') });
  }

  steg.push({ type: 'bunn', nr: 0, tittel: 'Bunnen',
    tekst: `Tegn opptrinnet fra spiss 0 og nedover, men bare ${mm(vange.nedersteOpptrinn, 1)} mm, fordi trinnet `
      + `ligger oppå. Tegn bunnkuttet derfra i rett vinkel ut til underkanten (${mm(vange.fot)} mm).` });

  steg.push({ type: 'topp', nr: 0, tittel: 'Toppen',
    tekst: (eget
      ? `Gå ${mm(vange.toppkutt.foranBakkant)} mm tilbake fra innerste hjørne i hakk ${m}, langs inntrinnet. Tegn en strek derfra i rett vinkel ned til underkanten.`
      : `Forleng opptrinnet i hakk ${m} fra innerste hjørne og ned til underkanten.`)
      + ` Toppkuttet blir ${mm(vange.toppkutt.lengde)} mm.` });

  steg.push({ type: 'kapp', nr: 0, tittel: 'Kapp',
    tekst: 'Kapp langs strekene. Det hvite med stiplet kant kappes bort, også hjelpespissen.' });

  steg.push({ type: 'reis', nr: 0, tittel: 'Slik står den',
    tekst: `Reist i trappa blir inntrinnene vannrette. Trinnene ligger oppå og stikker ${mm(nese)} mm fram (nesa).` });

  return steg;
}
