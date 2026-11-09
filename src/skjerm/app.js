// Skjermdelen: leser skjemaet, spør regnemodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/tommermann/.

import { sjekkVersjon, registrerUtenNett } from './oppdater.js';
import { losFelt } from '../tommermann/solver.js';
import { STANDARD_INNSTILLINGER } from '../tommermann/fagverdier.js';
import { tegnFelt } from './tegning.js';
import { lesTall, mm } from './format.js';
import { fyllBreddevalg, lesBredde, settBredde, kort, boks, tabell, zoomBoks, kobleZoom } from './biter.js';
import { lagre, hent } from './lagring.js';
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
registrerUtenNett();

kobleZoom(resultat);
fyllBreddevalg('bu');
fyllBreddevalg('bo');

for (const navn of INNSTILLING_FELT) {
  finn(navn).value = String(STANDARD_INNSTILLINGER[navn]);
}

// Hent feltet som sist ble skrevet inn på denne telefonen
const lagret = hent('felt');
if (lagret) settTilstand(lagret);

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

// Alt i skjemaet som tekst, slik det står, for lagring på telefonen
function lesTilstand() {
  const bredde = (id) => ({ valg: finn(`${id}-valg`).value, egen: finn(`${id}-egen`).value });
  return {
    L: finn('L').value,
    bu: bredde('bu'),
    bo: bredde('bo'),
    start: skjema.elements.start.value,
    slutt: skjema.elements.slutt.value,
    innstillinger: Object.fromEntries(INNSTILLING_FELT.map((n) => [n, finn(n).value])),
  };
}

function settTilstand(t) {
  try {
    finn('L').value = t.L ?? '';
    for (const id of ['bu', 'bo']) {
      if (!t[id]) continue;
      finn(`${id}-valg`).value = t[id].valg;
      finn(`${id}-egen`).value = t[id].egen ?? '';
      finn(`${id}-egen`).hidden = t[id].valg !== 'egen';
    }
    if (t.start) skjema.elements.start.value = t.start;
    if (t.slutt) skjema.elements.slutt.value = t.slutt;
    for (const [n, v] of Object.entries(t.innstillinger ?? {})) if (finn(n)) finn(n).value = v;
  } catch {
    // Lagret tilstand fra en eldre versjon som ikke passer: start blankt
  }
}

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
  lagre('felt', lesTilstand());
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

  // Vis bare inndelinger som er brukbare: innenfor anbefalt omlegg, ellers de to beste.
  const brukbare = alle.map((a, i) => ({ a, i })).slice(0, 5)
    .filter(({ a, i }) => a.innenforAnbefalt || i < 2 || i === indeks);
  const andre = brukbare.length > 1
    ? `<h3>Andre måter å dele feltet på</h3><div class="alternativer">${brukbare.map(({ a, i }) => `
        <button type="button" data-losning="${i}" class="${i === indeks ? 'aktiv' : ''}">
          ${a.antallUnderliggere} underbord, omlegg ${mm(a.omlegg, 1)} mm${a.innenforAnbefalt ? '' : ' (over anbefalt)'}
        </button>`).join('')}</div>`
    : '';

  return `
    <h2>Resultat</h2>
    <div class="nokkeltall">
      ${kort('Kloss', `${mm(l.klaring, 1)} mm`, 'Avstand mellom underbordene')}
      ${kort('Omlegg', `${mm(l.omlegg, 1)} mm`, 'Påbordet over underbordet, hver side')}
      ${kort('Underbord', l.antallUnderliggere, `Senteravstand ${mm(l.senteravstand, 1)} mm`)}
      ${kort('Påbord', l.antallOverliggere, `${l.spikring.antallSpikre} ${l.spikring.antallSpikre === 1 ? 'spiker' : 'spikre'} i bredden`)}
    </div>
    ${varsler}
    ${andre}
    <h3>Tegning</h3>
    ${zoomBoks('felt', tegnFelt(l))}
    <p class="hjelp">Øverst sett forfra. Under: snitt sett ovenfra med veggen nederst.
      Oransje stiplet = trenger underlag.</p>
    <h3>Utdelingsmål</h3>
    <p class="hjelp">Løpende mål fra startkanten. Underbordene settes opp først, med klossen mellom.</p>
    ${tabell('Underbord', l.underliggere)}
    ${tabell('Påbord', l.overliggere)}
    <p class="hjelp">Ikke spikre gjennom to bord. Én spiker i underbordet, spikrene i
      påbordet går i mellomrommet mellom underbordene.</p>`;
}

function visIngenLosning(svar) {
  const navn = { U: 'underbord', O: 'påbord' };
  const forslag = svar.forslag.slice(0, 6).map((f, i) => {
    let tekst;
    if (f.endring === 'start/slutt') tekst = `Start med ${navn[f.start]}, slutt med ${navn[f.slutt]}`;
    else if (f.endring === 'overligger') tekst = `Påbord ${mm(f.bo)} mm`;
    else tekst = `Begge bord ${mm(f.bu)} mm`;
    const merknad = f.innenforAnbefalt ? '' : ' (over anbefalt)';
    return `<button type="button" data-forslag="${i}">${tekst}: omlegg ${mm(f.omlegg, 1)} mm${merknad}</button>`;
  }).join('');

  return `
    <h2>Resultat</h2>
    ${boks('feil', `<p>${svar.melding}</p>`)}
    ${forslag ? `<h3>Dette går opp</h3><div class="alternativer">${forslag}</div>` : ''}`;
}
