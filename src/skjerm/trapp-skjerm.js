// Skjermdelen for trapp: leser skjemaet, spør regnemodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/trapp/.

import { losTrapp, trinnFraBord, lagTrinnliste } from '../trapp/solver.js';
import { STANDARD_TRAPP } from '../trapp/fagverdier.js';
import { tegnTrapp } from './trapp-tegning.js';
import { lesTall, mm } from './format.js';
import { kort, boks, zoomBoks, kobleZoom } from './biter.js';
import { EKSEMPELTRAPP } from './eksempel.js';
import { lagre, hent } from './lagring.js';

const skjema = document.getElementById('trapp-skjema');
const resultat = document.getElementById('trapp-resultat');
const finn = (id) => document.getElementById(id);

// Innstillinger som kan endres. Trinntykkelse og vangebredde brukes bare i tegningen ennå.
const INNSTILLINGER = ['onsketOpptrinn', 'formelIdeal', 'formelMin', 'formelMax'];
const TEGNING = ['trinnTykkelse', 'vangeBredde'];

// Hvilken av løsningene som vises (0 = den beste). Nullstilles når inndata endres.
let valgtIndeks = 0;
let sisteSvar = null;

// ---------- Oppstart ----------

kobleZoom(resultat);
for (const navn of INNSTILLINGER) finn(`t-${navn}`).value = String(STANDARD_TRAPP[navn]);
finn('t-vangeBredde').value = String(STANDARD_TRAPP.vangeBredde);
finn('t-nese').value = String(STANDARD_TRAPP.nese);

const lagret = hent('trapp');
if (lagret) settTilstand(lagret);

// Regn på nytt bare på 'input' (se CLAUDE.md om hvorfor ikke 'change').
skjema.addEventListener('input', () => { valgtIndeks = 0; oppdater(); });

finn('t-eksempel').addEventListener('click', () => {
  const e = EKSEMPELTRAPP;
  settTilstand({ type: e.type, hoyde: String(e.hoyde), ovre: e.ovreTrinn, bredde: String(e.bredde),
    lengdevalg: e.lengdevalg, antall: String(e.trinnbord.antall), bordbredde: String(e.trinnbord.bredde),
    spalte: String(e.trinnbord.spalte), nese: String(e.nese) });
  valgtIndeks = 0;
  oppdater();
});

resultat.addEventListener('click', (hendelse) => {
  const knapp = hendelse.target.closest('button');
  if (!knapp) return;
  if (knapp.dataset.losning !== undefined) {
    valgtIndeks = Number(knapp.dataset.losning);
    oppdater();
  } else if (knapp.dataset.forslag !== undefined) {
    const f = sisteSvar.forslag[Number(knapp.dataset.forslag)];
    if (f.trinnbord) finn('t-antall').value = String(f.trinnbord.antall);
    valgtIndeks = 0;
    oppdater();
  }
});

oppdater();

// ---------- Lese og skrive skjemaet ----------

// Alt i skjemaet som tekst, slik det står, for lagring på telefonen
function lesTilstand() {
  return {
    type: finn('t-type').value,
    hoyde: finn('t-hoyde').value,
    ovre: skjema.elements['t-ovre'].value,
    bredde: finn('t-bredde').value,
    lengdevalg: skjema.elements['t-lengdevalg'].value,
    antall: finn('t-antall').value,
    bordbredde: finn('t-bordbredde').value,
    spalte: finn('t-spalte').value,
    nese: finn('t-nese').value,
    lengde: finn('t-lengde').value,
    innstillinger: Object.fromEntries([...INNSTILLINGER, ...TEGNING].map((n) => [n, finn(`t-${n}`).value])),
  };
}

function settTilstand(t) {
  try {
    if (t.type) finn('t-type').value = t.type;
    if (t.ovre) skjema.elements['t-ovre'].value = t.ovre;
    if (t.lengdevalg) skjema.elements['t-lengdevalg'].value = t.lengdevalg;
    if (t.antall) finn('t-antall').value = t.antall;
    for (const [felt, id] of [['hoyde', 't-hoyde'], ['bredde', 't-bredde'], ['bordbredde', 't-bordbredde'],
      ['spalte', 't-spalte'], ['nese', 't-nese'], ['lengde', 't-lengde']]) {
      if (t[felt] !== undefined) finn(id).value = t[felt];
    }
    for (const [n, v] of Object.entries(t.innstillinger ?? {})) if (finn(`t-${n}`)) finn(`t-${n}`).value = v;
  } catch {
    // Lagret tilstand fra en eldre versjon som ikke passer: start blankt
  }
}

function lesSkjema() {
  const t = lesTilstand();
  const inndata = {
    type: t.type,
    hoyde: lesTall(t.hoyde),
    ovreTrinn: t.ovre,
    bredde: lesTall(t.bredde),
    lengdevalg: t.lengdevalg,
    nese: lesTall(t.nese) ?? 0,
  };
  if (t.lengdevalg === 'trinn') {
    inndata.trinnbord = { antall: Number(t.antall), bredde: lesTall(t.bordbredde), spalte: lesTall(t.spalte) ?? 0 };
  }
  if (t.lengdevalg === 'lengde') inndata.lengde = lesTall(t.lengde);
  for (const navn of INNSTILLINGER) {
    const tall = lesTall(t.innstillinger[navn]);
    if (tall !== null) inndata[navn] = tall;
  }
  return inndata;
}

// Trinntykkelse og vangebredde til tegningen. Trinntykkelsen følger typen trapp når feltet er tomt.
function tegneValg(inndata) {
  const ute = inndata.type === 'utvendig';
  const tykkelse = lesTall(finn('t-trinnTykkelse').value)
    ?? (ute ? STANDARD_TRAPP.trinnTykkelseUte : STANDARD_TRAPP.trinnTykkelseInne);
  return { nese: inndata.nese, trinnTykkelse: tykkelse, ovreTrinn: inndata.ovreTrinn,
    vangeBredde: lesTall(finn('t-vangeBredde').value) ?? STANDARD_TRAPP.vangeBredde };
}

// ---------- Vise resultatet ----------

function oppdater() {
  lagre('trapp', lesTilstand());
  const inndata = lesSkjema();

  // Vis bare feltene som hører til valget for inntrinnet
  for (const valg of ['trinn', 'lengde', 'fri']) finn(`t-valg-${valg}`).hidden = inndata.lengdevalg !== valg;
  finn('t-trinnTykkelse').placeholder = String(tegneValg({ ...inndata, nese: 0 }).trinnTykkelse);

  // Hvor dypt trinnet blir av bordene, rett under feltene
  const info = finn('t-trinninfo');
  const tb = inndata.trinnbord;
  if (tb && tb.bredde !== null && tb.bredde > 0) {
    const trinn = trinnFraBord(tb, inndata.nese);
    info.textContent = `Trinnet blir ${mm(trinn.dybde)} mm dypt. Inntrinnet blir ${mm(trinn.inntrinn)} mm `
      + `(dybden minus ${mm(inndata.nese)} mm nese).`;
  } else {
    info.textContent = 'Nesa er hvor langt trinnet stikker ut foran trinnet under.';
  }

  const mangler = inndata.hoyde === null ? 'Skriv inn høyden for å få trinnene.'
    : (tb && tb.bredde === null) ? 'Skriv inn bordbredden.'
      : (inndata.lengdevalg === 'lengde' && inndata.lengde === null) ? 'Skriv inn plassen til trappa.'
        : null;
  if (mangler) {
    sisteSvar = null;
    resultat.innerHTML = `<p class="hjelp stor">${mangler}</p>`;
    return;
  }

  const svar = losTrapp(inndata);
  sisteSvar = svar;
  if (svar.feil) {
    resultat.innerHTML = `<section class="del">${boks('feil', svar.feil.map((t) => `<p>${t}</p>`).join(''))}</section>`;
    return;
  }
  if (!svar.ok) {
    resultat.innerHTML = visIngenLosning(svar);
    return;
  }
  const indeks = Math.min(valgtIndeks, svar.alle.length - 1);
  resultat.innerHTML = visTrapp(svar.alle[indeks], svar, indeks, inndata);
}

function statusMerke(l) {
  if (l.varsler.some((v) => v.niva === 'ma')) return '<span class="merke merke-feil">Må fikses</span>';
  if (l.varsler.some((v) => v.niva === 'bor')) return '<span class="merke merke-varsel">Sjekk</span>';
  return '<span class="merke merke-ok">OK</span>';
}

// Varslene i samme tre grupper som i kledningsdelen
function visVarsler(l) {
  const linjer = (niva) => l.varsler.filter((v) => v.niva === niva)
    .map((v) => `<p>${v.tekst} (${v.kilde})</p>`).join('');
  const deler = [];
  if (linjer('ma')) deler.push(boks('feil', `<p><strong>Må fikses før du begynner</strong></p>${linjer('ma')}`));
  if (linjer('bor')) deler.push(boks('varsel', `<p><strong>Bør sjekkes</strong></p>${linjer('bor')}`));
  if (!linjer('ma') && !linjer('bor')) {
    deler.push(boks('ok', '<p>Inntrinnet følger kravet i TEK17, og trappeformelen er innenfor anbefalt.</p>'));
  }
  if (linjer('vite')) deler.push(boks('info', `<p><strong>Greit å vite</strong></p>${linjer('vite')}`));
  return deler.join('');
}

function visTrapp(l, svar, indeks, inndata) {
  const underInntrinn = svar.trinn ? `Trinnet ${mm(svar.trinn.dybde)} mm dypt` : `${l.antallInntrinn} trinn`;

  // Andre inndelinger: de innenfor anbefalt trappeformel, ellers de to beste
  const brukbare = svar.alle.map((a, i) => ({ a, i })).slice(0, 5)
    .filter(({ a, i }) => a.innenforFormel || i < 2 || i === indeks);
  const andre = brukbare.length > 1
    ? `<h3>Andre måter å dele trappa på</h3><div class="alternativer">${brukbare.map(({ a, i }) => `
        <button type="button" data-losning="${i}" class="${i === indeks ? 'aktiv' : ''}">
          ${a.antallOpptrinn} opptrinn à ${mm(a.opptrinn, 1)} mm, inntrinn ${mm(a.inntrinn, 1)} mm,
          trappeformel ${mm(a.formel, 1)}${a.innenforFormel ? '' : ' (utenfor anbefalt)'}
        </button>`).join('')}</div>`
    : '';

  const rader = lagTrinnliste(l).map((r) => `<tr><td>${r.nr ?? 'Dekket'}</td><td>${mm(r.hoyde)}</td><td>${mm(r.forkant)}</td></tr>`).join('');
  const toppTekst = inndata.ovreTrinn === 'dekke'
    ? 'Kanten av dekket er øverste trinn.' : 'Øverste trinn ligger i samme høyde som dekket.';

  return `
    <section class="del">
    <div class="del-topp"><h2>Resultat</h2>${statusMerke(l)}</div>
    <div class="nokkeltall">
      ${kort('Opptrinn', `${mm(l.opptrinn, 1)} mm`, `${l.antallOpptrinn} opptrinn`)}
      ${kort('Inntrinn', `${mm(l.inntrinn, 1)} mm`, underInntrinn)}
      ${kort('Trappeformel', `${mm(l.formel, 1)} mm`, '2 × opptrinn + inntrinn')}
      ${kort('Stigning', `${mm(l.vinkel, 1)}°`, `Løpslengde ${mm(l.lopslengde)} mm`)}
    </div>
    ${visVarsler(l)}
    ${andre}
    </section>

    <section class="del">
    <h2>Tegning</h2>
    ${zoomBoks('trapp', tegnTrapp(l, tegneValg(inndata)))}
    <p class="hjelp">Sett fra siden, i riktig målestokk. ${toppTekst} Vangen er tegnet forenklet med hakk
      under trinnene. Merking og kutt i topp og bunn av vangen kommer i neste versjon.</p>
    </section>

    <section class="del">
    <h2>Trinn for trinn</h2>
    <p class="hjelp">Høyde er overkant trinn over ferdig underlag. Forkant er vannrett fra forkant av nederste
      trinn. Hvert mål er regnet fra 0, så feilen vokser ikke oppover trappa.</p>
    <table class="maltabell">
      <caption>${l.antallInntrinn} trinn og dekket</caption>
      <thead><tr><th>Trinn</th><th>Høyde (mm)</th><th>Forkant (mm)</th></tr></thead>
      <tbody>${rader}</tbody>
    </table>
    </section>`;
}

function visIngenLosning(svar) {
  const forslag = svar.forslag.map((f, i) => (f.trinnbord
    ? `<div class="alternativer"><button type="button" data-forslag="${i}">${f.tekst}</button></div>`
    : `<p>${f.tekst}</p>`)).join('');
  return `
    <section class="del">
    <div class="del-topp"><h2>Resultat</h2><span class="merke merke-feil">Går ikke opp</span></div>
    ${boks('feil', `<p>${svar.melding}</p>`)}
    ${forslag ? `<h3>Dette kan endres</h3>${forslag}` : ''}
    </section>`;
}
