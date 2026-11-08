// Skjermdelen for hel vegg: leser skjemaet, spør veggmodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/tommermann/.

import { losVegg, foreslaVegg, vurderVegg } from '../tommermann/vegg.js';
import { STANDARD_INNSTILLINGER, STANDARD_VEGG } from '../tommermann/fagverdier.js';
import { tegnVegg, tegnSnitt } from './tegning.js';
import { lesTall, mm } from './format.js';
import { fyllBreddevalg, lesBredde, settBredde, kort, boks, tabell, zoomBoks, kobleZoom } from './biter.js';

const finn = (id) => document.getElementById(id);
const skjema = finn('vegg-skjema');
const resultat = finn('vegg-resultat');
const liste = finn('apninger');

const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };
const INNSTILLINGER = ['innleggMin', 'innleggStandard', 'innleggMax', 'oMin', 'oIdeal', 'oMax'];
const STANDARD = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG };

// Hvilket horisontalsnitt som vises (etiketten i nedtrekkslista). Huskes mellom omregninger.
let valgtSnitt = null;

// Siste forslag som ble regnet ut (nullstilles når skjemaet endres).
let sisteForslag = null;

// ---------- Oppstart ----------

kobleZoom(resultat);
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
skjema.addEventListener('input', (hendelse) => {
  // Byttes typen til dør eller port, står den på bakken.
  if (hendelse.target.classList.contains('a-type') && hendelse.target.value !== 'vindu') {
    hendelse.target.closest('.apning').querySelector('.a-bunn').value = '0';
  }
  sisteForslag = null;
  oppdaterStartvalg();
  oppdater();
});

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

// Trykk på en rad i oversikten: åpne feltkortet og bla dit
resultat.addEventListener('click', (hendelse) => {
  const rad = hendelse.target.closest('tr[data-ga-til]');
  if (!rad) return;
  const kortet = finn(`felt-${rad.dataset.gaTil}`);
  kortet.open = true;
  kortet.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Forslag: regn ut når knappen trykkes, og fyll inn et forslag når det trykkes
resultat.addEventListener('click', (hendelse) => {
  const knapp = hendelse.target.closest('button');
  if (!knapp) return;
  if (knapp.id === 'v-finn-forslag') {
    const inndata = lesSkjema();
    sisteForslag = foreslaVegg(inndata);
    // Husk utgangspunktet, så man kan gå tilbake til det
    const { bu, bo, karmBord, hjorneVenstre, hjorneHoyre, startvalg } = inndata;
    sisteForslag.utgangspunkt = { bu, bo, karmBord, hjorneVenstre, hjorneHoyre, startvalg };
    sisteForslag.valgt = null;
    oppdater();
    finn('v-forslag')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (knapp.dataset.forslag) {
    const [gruppe, nr] = knapp.dataset.forslag.split(':');
    sisteForslag.valgt = knapp.dataset.forslag;
    brukForslag(sisteForslag[gruppe][Number(nr)].oppsett);
  } else if (knapp.id === 'v-utgangspunkt') {
    sisteForslag.valgt = null;
    brukForslag(sisteForslag.utgangspunkt);
  }
});

function brukForslag(o) {
  settBredde('vbu', o.bu);
  settBredde('vbo', o.bo);
  skjema.elements.karmBord.value = o.karmBord;
  finn('v-hjorneVenstre').value = o.hjorneVenstre;
  finn('v-hjorneHoyre').value = o.hjorneHoyre;
  finn('v-startvalg').value = o.startvalg;
  // Forslagslista blir stående, så man kan prøve de andre også. Den nullstilles først når
  // man selv endrer noe i skjemaet.
  oppdater();
  finn('v-forslag')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Bytte høyde for horisontalsnittet
resultat.addEventListener('input', (hendelse) => {
  if (hendelse.target.id === 'v-snitt') {
    valgtSnitt = hendelse.target.value;
    oppdater();
  }
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
      <label class="felt"><span>Høyde på karm</span><input class="a-hoyde" type="text" inputmode="decimal" value="${hoyde}"></label>
      <label class="felt"><span>Fra bakken til underkant karm</span><input class="a-bunn" type="text" inputmode="decimal" value="${bunn ?? standardBunn}"></label>
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

// Høyder det er naturlig å ta snitt i: gjennom, over og under hver åpning.
function lagSnittValg(r) {
  const valg = [];
  for (const a of r.apninger) {
    const navn = a.navn.toLowerCase();
    valg.push({ etikett: `Gjennom ${navn} (${mm(a.bunn + a.hoyde / 2)} mm)`, hoyde: a.bunn + a.hoyde / 2 });
    if (a.bunn + a.hoyde < r.hoyde) {
      const h = (a.bunn + a.hoyde + r.hoyde) / 2;
      valg.push({ etikett: `Over ${navn} (${mm(h)} mm)`, hoyde: h });
    }
    if (a.bunn > 0) valg.push({ etikett: `Under ${navn} (${mm(a.bunn / 2)} mm)`, hoyde: a.bunn / 2 });
  }
  if (valg.length === 0) valg.push({ etikett: `Midt på veggen (${mm(r.hoyde / 2)} mm)`, hoyde: r.hoyde / 2 });
  return valg;
}

function visVegg(r) {
  const snittValg = lagSnittValg(r);
  const snitt = snittValg.find((v) => v.etikett === valgtSnitt) ?? snittValg[0];
  const okFelt = r.felt.filter((f) => f.ok);
  const ikkeOpp = r.felt.filter((f) => !f.ok);
  const overMaks = okFelt.filter((f) => !f.losning.innenforAnbefalt);

  const alvorlige = r.varsler.filter((v) => v.alvorlig);
  const andre = r.varsler.filter((v) => !v.alvorlig);
  const varselListe = (vs) => vs.map((v) => `<p><strong>${v.felt}:</strong> ${v.tekst}</p>`).join('');


  const innlegg = r.apninger.map((a) => `<tr><td>${a.navn}</td><td>${mm(a.innlegg.venstre, 1)}</td></tr>`).join('');

  return `
    <h2>Resultat</h2>
    <div class="nokkeltall">
      ${kort('Felt', r.felt.length, `${okFelt.length - overMaks.length} av ${r.felt.length} innenfor anbefalt omlegg`)}
      ${kort('Rytme', `${mm(r.rytme.senteravstand, 1)} mm`, `Senteravstand ved ${mm(r.rytme.omlegg)} mm omlegg`)}
    </div>
    ${alvorlige.length ? boks('feil', `${ikkeOpp.length ? `<p><strong>${ikkeOpp.length} felt går ikke opp.</strong> Flytt en åpning, bytt bordbredde eller bytt mellom påbord og underbord inn på karmen.</p>` : ''}${varselListe(alvorlige)}`) : ''}
    ${andre.length ? boks('varsel', varselListe(andre)) : ''}
    ${!alvorlige.length && !andre.length ? boks('ok', '<p>Alle felt går opp med omlegg innenfor anbefalt.</p>') : ''}

    ${visForslag(r)}

    <h3>Oversikt</h3>
    <table class="maltabell oversikt"><thead><tr><th>Nr</th><th>Felt</th><th>Omlegg</th><th></th></tr></thead><tbody>
      ${r.felt.map((f, i) => `<tr data-ga-til="${i + 1}"><td>${i + 1}</td><td>${f.navn}</td>
        <td>${f.ok ? `${mm(f.losning.omlegg, 1)} mm` : '–'}</td><td>${merkeFor(f, r.rytme.maks)}</td></tr>`).join('')}
    </tbody></table>
    <p class="hjelp">Trykk på en rad for å se utdelingsmålene. Nummeret står også i tegningen.</p>

    <h3>Tegning</h3>
    ${zoomBoks('vegg', tegnVegg(r, snitt.hoyde))}
    <p class="hjelp">Sett forfra. Lyse bord er underbord, blå er påbord, grått er karm.
      Rød stiplet = feltet går ikke opp. Oransje linje = der snittet under er tatt.</p>

    <h3>Horisontalsnitt A–A</h3>
    <label class="felt"><span>Snitt i høyde</span>
      <select id="v-snitt">${snittValg.map((v) => `<option ${v.etikett === snitt.etikett ? 'selected' : ''}>${v.etikett}</option>`).join('')}</select></label>
    ${zoomBoks('snitt', tegnSnitt(r, snitt.hoyde))}
    <p class="hjelp">Sett ovenfra, veggen øverst og utsiden ned. Zoom med + og −, og skyv for å se resten.
      Tallene under kledningen ved karmen er innlegget i mm. Oransje stiplet = underlag bak påbord i hjørnet.
      Bordtykkelsen er tegnet tykkere enn den er.</p>


    ${r.apninger.length ? `<h3>Innlegg på karm</h3>
    <p class="hjelp">Bordet går like langt inn på karmen på begge sider.</p>
    <table class="maltabell"><thead><tr><th>Åpning</th><th>Innlegg (mm)</th></tr></thead><tbody>${innlegg}</tbody></table>` : ''}

    <h3>Felt for felt</h3>
    <p class="hjelp">Løpende mål fra venstre hjørne. Trykk på et felt for å se utdelingsmålene.</p>
    ${r.felt.map((f, i) => visFelt(f, i + 1, r.rytme.maks)).join('')}`;
}

function visForslag(r) {
  const v = vurderVegg(r, r.rytme.maks);
  // Vis seksjonen når veggen har noe å forbedre, eller når forslagene allerede er regnet ut
  if (!sisteForslag && v.ikkeOpp === 0 && v.spikring === 0 && v.overMaks === 0) return '';
  const beskriv = (x) => [
    x.ikkeOpp ? `${x.ikkeOpp} felt går ikke opp` : 'alle felt går opp',
    `${x.antallFelt - x.ikkeOpp - x.overMaks} av ${x.antallFelt} innenfor anbefalt`,
    `verste omlegg ${mm(x.verstOmlegg, 1)} mm`,
    x.spikring ? `${x.spikring} spikervarsel` : '',
  ].filter(Boolean).join(', ');

  let innhold = '<button type="button" class="knapp lenkeknapp" id="v-finn-forslag">Finn bedre oppsett</button>';
  if (sisteForslag) {
    const gruppe = (navn, tittel) => {
      const liste = sisteForslag[navn];
      if (!liste.length) return `<p class="hjelp"><strong>${tittel}:</strong> fant ikke noe bedre.</p>`;
      return `<p class="hjelp"><strong>${tittel}</strong></p><div class="alternativer">${liste.map((f, i) => `
        <button type="button" data-forslag="${navn}:${i}" class="${sisteForslag.valgt === `${navn}:${i}` ? 'aktiv' : ''}">
          ${sisteForslag.valgt === `${navn}:${i}` ? '<span class="merke merke-ok">Valgt</span> ' : ''}
          <strong>${f.endring.join(', ').replace(/^./, (c) => c.toUpperCase())}</strong><br>
          <span class="hjelp">${beskriv(f.vurdering)}</span>
        </button>`).join('')}</div>`;
    };
    const tilbake = sisteForslag.valgt
      ? '<button type="button" class="knapp lenkeknapp" id="v-utgangspunkt">Tilbake til utgangspunktet</button>'
      : '';
    innhold = `<p class="hjelp">Utgangspunkt: ${beskriv(sisteForslag.naa)}. Trykk på et forslag for å fylle det inn.
      Lista blir stående til du endrer noe selv.</p>
      ${gruppe('sammeBord', 'Med samme bord')}
      ${gruppe('andreBord', 'Med andre bordbredder')}
      ${tilbake}`;
  }
  return `<h3 id="v-forslag">Forslag</h3>${innhold}`;
}

function merkeFor(f, maks) {
  if (!f.ok) return '<span class="merke merke-feil">Går ikke opp</span>';
  return f.losning.innenforAnbefalt
    ? '<span class="merke merke-ok">OK</span>'
    : `<span class="merke merke-varsel">Over ${mm(maks)}</span>`;
}

function visFelt(f, nr, maks) {
  if (!f.ok) {
    return `<details class="feltkort feil" id="felt-${nr}"><summary><span>${nr}. ${f.navn}</span><span class="merke merke-feil">Går ikke opp</span></summary>
      <p>${f.melding}</p></details>`;
  }
  const l = f.losning;
  const merke = merkeFor(f, maks);
  const avvik = f.avvikRytme;
  return `<details class="feltkort" id="felt-${nr}"><summary><span>${nr}. ${f.navn}</span>${merke}</summary>
    <p>Omlegg <strong>${mm(l.omlegg, 1)} mm</strong>, distanseklosser <strong>${mm(l.klaring, 1)} mm</strong>,
      senteravstand ${mm(l.senteravstand, 1)} mm (${avvik >= 0 ? '+' : '−'}${mm(Math.abs(avvik), 1)} mm fra rytmen).
      ${f.type !== 'side' ? 'Sidebordene står i feltene ved siden av og er ikke med her.' : ''}</p>
    ${tabell('Underbord', f.underliggere)}
    ${tabell('Påbord', f.overliggere)}
  </details>`;
}
