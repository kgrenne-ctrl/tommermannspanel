// Skjermdelen for hel vegg: leser skjemaet, spør veggmodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/tommermann/.

import { losVegg } from '../tommermann/vegg.js';
import { STANDARD_INNSTILLINGER, STANDARD_VEGG } from '../tommermann/fagverdier.js';
import { tegnVegg } from './tegning.js';
import { lesTall, mm } from './format.js';
import { fyllBreddevalg, lesBredde, kort, boks, tabell } from './biter.js';

const finn = (id) => document.getElementById(id);
const skjema = finn('vegg-skjema');
const resultat = finn('vegg-resultat');
const liste = finn('apninger');

const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };
const INNSTILLINGER = ['innleggMin', 'innleggStandard', 'innleggMax', 'oMin', 'oIdeal', 'oMax'];
const STANDARD = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG };

// ---------- Oppstart ----------

fyllBreddevalg('vbu');
fyllBreddevalg('vbo');
for (const navn of INNSTILLINGER) finn(`v-${navn}`).value = String(STANDARD[navn]);
finn('v-hjorneVenstre').value = STANDARD.hjorneVenstre;
finn('v-hjorneHoyre').value = STANDARD.hjorneHoyre;
skjema.elements.karmBord.value = STANDARD.karmBord;
oppdaterStartvalg();

// Bytte mellom «Ett felt» og «Hel vegg»
for (const radio of document.querySelectorAll('input[name="modus"]')) {
  radio.addEventListener('input', () => {
    const vegg = radio.value === 'vegg' && radio.checked;
    finn('vegg-del').hidden = !vegg;
    finn('felt-del').hidden = vegg;
    if (vegg) oppdater();
  });
}

// Regn på nytt bare på 'input' (se CLAUDE.md om hvorfor ikke 'change').
skjema.addEventListener('input', () => { oppdaterStartvalg(); oppdater(); });

skjema.addEventListener('click', (hendelse) => {
  const knapp = hendelse.target.closest('button');
  if (!knapp) return;
  if (knapp.dataset.ny) {
    leggTilApning({ type: knapp.dataset.ny });
  } else if (knapp.dataset.fjern !== undefined) {
    knapp.closest('.apning').remove();
  } else if (knapp.id === 'v-eksempel') {
    fyllEksempel();
  } else {
    return;
  }
  oppdaterStartvalg();
  oppdater();
});

// ---------- Åpninger ----------

function leggTilApning({ type, x = '', bredde = '', hoyde = '', bunn }) {
  const standardBunn = type === 'vindu' ? '' : '0';
  const kortet = document.createElement('div');
  kortet.className = 'apning';
  kortet.innerHTML = `
    <div class="apning-topp">
      <select class="a-type" aria-label="Type åpning">
        ${Object.entries(TYPENAVN).map(([v, t]) => `<option value="${v}" ${v === type ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      <button type="button" class="knapp fjern" data-fjern aria-label="Fjern åpningen">Fjern</button>
    </div>
    <div class="to-kol">
      <label class="felt"><span>Fra venstre hjørne</span><input class="a-x" type="text" inputmode="decimal" value="${x}"></label>
      <label class="felt"><span>Bredde</span><input class="a-bredde" type="text" inputmode="decimal" value="${bredde}"></label>
      <label class="felt"><span>Høyde</span><input class="a-hoyde" type="text" inputmode="decimal" value="${hoyde}"></label>
      <label class="felt"><span>Over bakken</span><input class="a-bunn" type="text" inputmode="decimal" value="${bunn ?? standardBunn}"></label>
    </div>`;
  liste.append(kortet);
  if (x === '') kortet.querySelector('.a-x').focus();
}

function lesApninger() {
  return [...liste.querySelectorAll('.apning')].map((k) => ({
    type: k.querySelector('.a-type').value,
    x: lesTall(k.querySelector('.a-x').value),
    bredde: lesTall(k.querySelector('.a-bredde').value),
    hoyde: lesTall(k.querySelector('.a-hoyde').value),
    bunn: lesTall(k.querySelector('.a-bunn').value),
  }));
}

// Valgene for startpunkt. «Midten av …» lages for hver åpning, sortert fra venstre.
function oppdaterStartvalg() {
  const valg = finn('v-startvalg');
  const forrige = valg.value || STANDARD.startvalg;
  const apninger = lesApninger()
    .map((a, i) => ({ ...a, i }))
    .filter((a) => a.x !== null)
    .sort((a, b) => a.x - b.x);
  const telt = {};
  const totalt = {};
  for (const a of apninger) totalt[a.type] = (totalt[a.type] ?? 0) + 1;
  const ekstra = apninger.map((a, j) => {
    telt[a.type] = (telt[a.type] ?? 0) + 1;
    const navn = totalt[a.type] > 1 ? `${TYPENAVN[a.type].toLowerCase()} ${telt[a.type]}` : TYPENAVN[a.type].toLowerCase();
    return `<option value="apning:${j}">Midten av ${navn}</option>`;
  });
  valg.innerHTML = '<option value="venstre">Fra venstre hjørne</option>'
    + '<option value="hoyre">Fra høyre hjørne</option>'
    + '<option value="midten">Midten av veggen</option>'
    + ekstra.join('');
  valg.value = [...valg.options].some((o) => o.value === forrige) ? forrige : 'venstre';
}

function fyllEksempel() {
  finn('v-lengde').value = '6000';
  finn('v-hoyde').value = '2400';
  liste.innerHTML = '';
  leggTilApning({ type: 'vindu', x: 600, bredde: 1000, hoyde: 600, bunn: 1200 });
  leggTilApning({ type: 'port', x: 2000, bredde: 2400, hoyde: 2100, bunn: 0 });
  leggTilApning({ type: 'vindu', x: 4700, bredde: 1000, hoyde: 600, bunn: 1200 });
}

// ---------- Lese skjema og vise resultat ----------

function lesSkjema() {
  const inndata = {
    lengde: lesTall(finn('v-lengde').value),
    hoyde: lesTall(finn('v-hoyde').value),
    bu: lesBredde('vbu'),
    bo: lesBredde('vbo'),
    karmBord: skjema.elements.karmBord.value,
    hjorneVenstre: finn('v-hjorneVenstre').value,
    hjorneHoyre: finn('v-hjorneHoyre').value,
    startvalg: finn('v-startvalg').value,
    apninger: lesApninger(),
  };
  for (const navn of INNSTILLINGER) {
    const tall = lesTall(finn(`v-${navn}`).value);
    if (tall !== null) inndata[navn] = tall;
  }
  return inndata;
}

function oppdater() {
  const inndata = lesSkjema();
  if (inndata.lengde === null || inndata.hoyde === null) {
    resultat.innerHTML = '<p class="hjelp stor">Skriv inn vegglengde og vegghøyde, og legg til vinduer, dører og porter.</p>';
    return;
  }
  if (inndata.bu === null || inndata.bo === null) {
    resultat.innerHTML = '<p class="hjelp stor">Skriv inn målt bordbredde.</p>';
    return;
  }
  const mangler = inndata.apninger.findIndex((a) => [a.x, a.bredde, a.hoyde, a.bunn].includes(null));
  if (mangler >= 0) {
    resultat.innerHTML = `<p class="hjelp stor">Fyll inn alle målene for åpning nr. ${mangler + 1}.</p>`;
    return;
  }

  const r = losVegg(inndata);
  if (r.feil) {
    resultat.innerHTML = boks('feil', r.feil.map((t) => `<p>${t}</p>`).join(''));
    return;
  }
  resultat.innerHTML = visVegg(r);
}

function visVegg(r) {
  const okFelt = r.felt.filter((f) => f.ok);
  const ikkeOpp = r.felt.filter((f) => !f.ok);
  const overMaks = okFelt.filter((f) => !f.losning.innenforAnbefalt);

  const alvorlige = r.varsler.filter((v) => v.alvorlig);
  const andre = r.varsler.filter((v) => !v.alvorlig);
  const varselListe = (vs) => vs.map((v) => `<p><strong>${v.felt}:</strong> ${v.tekst}</p>`).join('');

  const klosser = r.klosser.length
    ? `<h3>Klosser</h3><ul class="liste">${r.klosser.map((k) => `<li>${k.antall} stk. ${mm(k.lengde)} mm, ${k.tekst.charAt(0).toLowerCase()}${k.tekst.slice(1)}</li>`).join('')}</ul>`
    : '';

  const innlegg = r.apninger.map((a) => `<tr><td>${a.navn}</td><td>${mm(a.innlegg.venstre, 1)}</td><td>${mm(a.innlegg.hoyre, 1)}</td></tr>`).join('');

  return `
    <h2>Resultat</h2>
    <div class="nokkeltall">
      ${kort('Felt', r.felt.length, `${okFelt.length - overMaks.length} innenfor 20–25 mm omlegg`)}
      ${kort('Rytme', `${mm(r.rytme.senteravstand, 1)} mm`, `Senteravstand ved ${mm(r.rytme.omlegg)} mm omlegg`)}
    </div>
    ${ikkeOpp.length ? boks('feil', `<p><strong>${ikkeOpp.length} felt går ikke opp.</strong> Flytt en åpning, bytt bordbredde eller bytt mellom påbord og underbord inn på karmen.</p>${varselListe(alvorlige)}`) : ''}
    ${andre.length ? boks('varsel', varselListe(andre)) : ''}
    ${!ikkeOpp.length && !andre.length ? boks('ok', '<p>Alle felt går opp med omlegg innenfor anbefalt.</p>') : ''}

    <h3>Tegning</h3>
    ${tegnVegg(r)}
    <p class="hjelp">Sett forfra. Lyse bord er underbord, blå er påbord. Rød stiplet = feltet går ikke opp.</p>

    ${klosser}

    ${r.apninger.length ? `<h3>Innlegg på karm</h3>
    <table class="maltabell"><thead><tr><th>Åpning</th><th>Venstre (mm)</th><th>Høyre (mm)</th></tr></thead><tbody>${innlegg}</tbody></table>` : ''}

    <h3>Felt for felt</h3>
    <p class="hjelp">Løpende mål fra venstre hjørne. Trykk på et felt for å se utdelingsmålene.</p>
    ${r.felt.map(visFelt).join('')}`;
}

function visFelt(f) {
  if (!f.ok) {
    return `<details class="feltkort feil"><summary><span>${f.navn}</span><span class="merke merke-feil">Går ikke opp</span></summary>
      <p>${f.melding}</p></details>`;
  }
  const l = f.losning;
  const merke = l.innenforAnbefalt
    ? '<span class="merke merke-ok">OK</span>'
    : '<span class="merke merke-varsel">Over 25</span>';
  const avvik = f.avvikRytme;
  return `<details class="feltkort"><summary><span>${f.navn}</span>${merke}</summary>
    <p>Omlegg <strong>${mm(l.omlegg, 1)} mm</strong>, distanseklosser <strong>${mm(l.klaring, 1)} mm</strong>,
      senteravstand ${mm(l.senteravstand, 1)} mm (${avvik >= 0 ? '+' : '−'}${mm(Math.abs(avvik), 1)} mm fra rytmen).
      ${f.type !== 'side' ? 'Sidebordene står i feltene ved siden av og er ikke med her.' : ''}</p>
    ${tabell('Underbord', f.underliggere)}
    ${tabell('Påbord', f.overliggere)}
  </details>`;
}
