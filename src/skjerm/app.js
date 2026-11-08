// Skjermdelen: leser skjemaet, spør regnemodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/tommermann/.

import { sjekkVersjon } from './oppdater.js';
import { losFelt } from '../tommermann/solver.js';
import { STANDARD_INNSTILLINGER } from '../tommermann/fagverdier.js';
import { tegnFelt } from './tegning.js';
import { lesTall, mm } from './format.js';
import { fyllBreddevalg, lesBredde, settBredde, kort, boks, tabell } from './biter.js';
import './vegg-skjerm.js';

const INNSTILLING_FELT = ['oMin', 'oIdeal', 'oMax', 'toSpikreFraBredde', 'spikeravstand'];

const skjema = document.getElementById('skjema');
const resultat = document.getElementById('resultat');
const finn = (id) => document.getElementById(id);

// Hvilken av løsningene som vises (0 = den beste). Nullstilles når inndata endres.
let valgtIndeks = 0;
let sisteSvar = null;

// ---------- Oppstart ----------

sjekkVersjon();

fyllBreddevalg('bu');
fyllBreddevalg('bo');

for (const navn of INNSTILLING_FELT) {
  finn(navn).value = String(STANDARD_INNSTILLINGER[navn]);
}

// Regn på nytt bare når noe faktisk endres. (Ikke på 'change': den kommer også når man
// trykker utenfor et tekstfelt, og da ville knappen man trykket på blitt tegnet bort.)
skjema.addEventListener('input', () => { valgtIndeks = 0; oppdater(); });

// Knapper i resultatet (andre inndelinger og forslag)
resultat.addEventListener('click', (hendelse) => {
  const knapp = hendelse.target.closest('button');
  if (!knapp) return;
  if (knapp.dataset.losning !== undefined) {
    valgtIndeks = Number(knapp.dataset.losning);
    oppdater();
  } else if (knapp.dataset.forslag !== undefined) {
    brukForslag(sisteSvar.forslag[Number(knapp.dataset.forslag)]);
  }
});

oppdater();

// ---------- Lese og skrive skjemaet ----------

function lesSkjema() {
  const inndata = {
    L: lesTall(finn('L').value),
    bu: lesBredde('bu'),
    bo: lesBredde('bo'),
    start: skjema.elements.start.value,
    slutt: skjema.elements.slutt.value,
  };
  for (const navn of INNSTILLING_FELT) {
    const tall = lesTall(finn(navn).value);
    if (tall !== null) inndata[navn] = tall;
  }
  return inndata;
}

function brukForslag(f) {
  settBredde('bu', f.bu);
  settBredde('bo', f.bo);
  skjema.elements.start.value = f.start;
  skjema.elements.slutt.value = f.slutt;
  valgtIndeks = 0;
  oppdater();
  resultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Vise resultatet ----------

function oppdater() {
  const inndata = lesSkjema();
  if (inndata.L === null) {
    sisteSvar = null;
    resultat.innerHTML = '<p class="hjelp stor">Skriv inn feltlengden for å få utdelingsmål.</p>';
    return;
  }
  if (inndata.bu === null || inndata.bo === null) {
    sisteSvar = null;
    resultat.innerHTML = '<p class="hjelp stor">Skriv inn målt bordbredde.</p>';
    return;
  }

  const svar = losFelt(inndata);
  sisteSvar = svar;

  if (svar.feil) {
    resultat.innerHTML = boks('feil', svar.feil.map((t) => `<p>${t}</p>`).join(''));
    return;
  }
  if (!svar.ok) {
    resultat.innerHTML = visIngenLosning(svar);
    return;
  }
  const indeks = Math.min(valgtIndeks, svar.alle.length - 1);
  resultat.innerHTML = visLosning(svar.alle[indeks], svar.alle, indeks);
}

function visLosning(l, alle, indeks) {
  const varsler = l.varsler.length
    ? boks('varsel', l.varsler.map((v) => `<p>${v.tekst}</p>`).join(''))
    : boks('ok', '<p>Omlegget er innenfor anbefalt.</p>');

  const andre = alle.length > 1
    ? `<h3>Andre inndelinger</h3><div class="alternativer">${alle.slice(0, 5).map((a, i) => `
        <button type="button" data-losning="${i}" class="${i === indeks ? 'aktiv' : ''}">
          ${a.antallUnderliggere} underliggere, omlegg ${mm(a.omlegg, 1)} mm
        </button>`).join('')}</div>`
    : '';

  return `
    <h2>Resultat</h2>
    <div class="nokkeltall">
      ${kort('Distanseklosser', `${mm(l.klaring, 1)} mm`, 'Klaring mellom underliggere')}
      ${kort('Omlegg', `${mm(l.omlegg, 1)} mm`, 'På hver side')}
      ${kort('Underliggere', l.antallUnderliggere, `Senteravstand ${mm(l.senteravstand, 1)} mm`)}
      ${kort('Overliggere', l.antallOverliggere, `${l.spikring.antallSpikre} ${l.spikring.antallSpikre === 1 ? 'spiker' : 'spikre'} i bredden`)}
    </div>
    ${varsler}
    ${andre}
    <h3>Tegning</h3>
    ${tegnFelt(l)}
    <p class="hjelp">Øverst sett forfra. Under: snitt sett ovenfra med veggen nederst.
      Oransje stiplet = trenger underlag.</p>
    <h3>Utdelingsmål</h3>
    <p class="hjelp">Løpende mål fra startkanten. Underliggerne settes opp først.</p>
    ${tabell('Underliggere', l.underliggere)}
    ${tabell('Overliggere', l.overliggere)}
    <p class="hjelp">Ikke spikre gjennom to bord. Én spiker i underliggeren, spikrene i
      overliggeren går i klaringen.</p>`;
}

function visIngenLosning(svar) {
  const navn = { U: 'underligger', O: 'overligger' };
  const forslag = svar.forslag.slice(0, 6).map((f, i) => {
    let tekst;
    if (f.endring === 'start/slutt') tekst = `Start med ${navn[f.start]}, slutt med ${navn[f.slutt]}`;
    else if (f.endring === 'overligger') tekst = `Overligger ${mm(f.bo)} mm`;
    else tekst = `Begge bord ${mm(f.bu)} mm`;
    const merknad = f.innenforAnbefalt ? '' : ' (over anbefalt)';
    return `<button type="button" data-forslag="${i}">${tekst}: omlegg ${mm(f.omlegg, 1)} mm${merknad}</button>`;
  }).join('');

  return `
    <h2>Resultat</h2>
    ${boks('feil', `<p>${svar.melding}</p>`)}
    ${forslag ? `<h3>Dette går opp</h3><div class="alternativer">${forslag}</div>` : ''}`;
}
