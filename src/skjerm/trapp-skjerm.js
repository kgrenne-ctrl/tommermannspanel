// Skjermdelen for trapp: leser skjemaet, spør regnemodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/trapp/.

import { losTrapp, trinnFraBord, lagTrinnliste } from '../trapp/solver.js';
import { lagVange } from '../trapp/vange.js';
import { lagTrappMaterialer, trappMaterialTekst } from '../trapp/materialer.js';
import { STANDARD_TRAPP } from '../trapp/fagverdier.js';
import { tegnTrapp, tegnVangeFlatt, tegnHakk, tegnBunn, tegnTopp, tegnMerkesteg } from './trapp-tegning.js';
import { lagMerkesteg, lagVangeSteg } from './trapp-merking.js';
import { lagTrappUtskrift, lesTrappdata } from './trapp-utskrift.js';
import { lesTall, mm } from './format.js';
import { kort, boks, zoomBoks, kobleZoom } from './biter.js';
import { EKSEMPELTRAPP } from './eksempel.js';
import { lagre, hent } from './lagring.js';

const skjema = document.getElementById('trapp-skjema');
const resultat = document.getElementById('trapp-resultat');
const finn = (id) => document.getElementById(id);

// Innstillinger som kan endres, målene for vangen og materialene. Alt lagres under «innstillinger».
const INNSTILLINGER = ['onsketOpptrinn', 'formelIdeal', 'formelMin', 'formelMax'];
const VANGE = ['trinnTykkelse', 'vangeBredde', 'beleggNede', 'vangeTykkelse', 'antallVanger', 'utstikk'];
const MATERIAL = ['maksAvstandVangerTynn', 'maksAvstandVangerTykk', 'kapptillegg', 'svinn'];

// Det som vises nå, til utskrift og deling av materiallista
let sisteTrapp = null;  // { tilstand, d, l, vange, valg, liste }

// Hvilken av løsningene som vises (0 = den beste). Nullstilles når inndata endres.
let valgtIndeks = 0;
let sisteSvar = null;

// «Se det steg for steg»: stegene for vangen som vises, hvilket steg man står på, og
// avspillingen. Steget huskes når appen regner på nytt, så man ikke hopper tilbake til start.
let merking = null;     // { steg, vange, l, valg }
let merkeIndeks = 0;
let avspilling = null;

// ---------- Oppstart ----------

kobleZoom(resultat);
for (const navn of INNSTILLINGER) finn(`t-${navn}`).value = String(STANDARD_TRAPP[navn]);
for (const navn of MATERIAL) finn(`t-${navn}`).value = String(STANDARD_TRAPP[navn]);
finn('t-vangeBredde').value = String(STANDARD_TRAPP.vangeBredde);
finn('t-vangeTykkelse').value = String(STANDARD_TRAPP.vangeTykkelse);
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
  if (knapp.id === 't-skriv-ut') { skrivUt(); return; }
  if (knapp.id === 't-del-liste') { delListe(knapp); return; }
  if (knapp.dataset.merkesteg) {
    if (knapp.dataset.merkesteg === 'spill') {
      if (avspilling) stoppAvspilling(); else startAvspilling();
      return;
    }
    stoppAvspilling();
    visMerkesteg(merkeIndeks + (knapp.dataset.merkesteg === 'neste' ? 1 : -1));
    return;
  }
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

// Glideren for stegene
resultat.addEventListener('input', (hendelse) => {
  if (!hendelse.target.classList.contains('merke-glider')) return;
  stoppAvspilling();
  visMerkesteg(Number(hendelse.target.value));
});

oppdater();

// ---------- Utskrift, deling og data for eksempler ----------

// Hele trappa med inndata og resultater. Nettleserens utskrift kan lagre som PDF.
function skrivUt() {
  if (!sisteTrapp) return;
  const omrade = finn('utskrift');
  omrade.innerHTML = lagTrappUtskrift({ ...sisteTrapp, versjon: window.APP_VERSJON ?? '' });
  omrade.hidden = false;
  document.body.classList.add('skriver-ut');
  // Navnet på PDF-fila hentes fra sidetittelen
  const tittel = document.title;
  const d = new Date();
  document.title = `Trapp ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ferdig = () => {
    document.body.classList.remove('skriver-ut');
    omrade.hidden = true;
    omrade.innerHTML = '';
    document.title = tittel;
    window.removeEventListener('afterprint', ferdig);
  };
  window.addEventListener('afterprint', ferdig);
  setTimeout(() => window.print(), 150); // la tegningene og logoen komme på plass først
}

// Del med telefonens Del-meny (SMS, e-post) når den finnes, ellers kopier til utklippstavla
async function delListe(knapp) {
  if (!sisteTrapp?.liste?.ok) return;
  const tekst = trappMaterialTekst(sisteTrapp.liste);
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Materialliste trapp', text: tekst });
      return;
    }
    await navigator.clipboard.writeText(tekst);
    knapp.textContent = 'Kopiert';
  } catch (feil) {
    if (feil?.name === 'AbortError') return; // brukeren lukket Del-menyen
    knapp.textContent = 'Fikk ikke kopiert. Merk teksten under.';
    knapp.insertAdjacentHTML('afterend', `<textarea class="del-tekst" readonly rows="10">${tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>`);
  }
}

finn('t-kopier-data').addEventListener('click', async () => {
  const tekst = JSON.stringify({ app: 'tommermannspanel', verktoy: 'trapp', versjon: window.APP_VERSJON ?? '', trapp: lesTilstand() });
  const melding = finn('t-data-melding');
  try {
    await navigator.clipboard.writeText(tekst);
    melding.textContent = 'Kopiert. Lim inn i en e-post eller melding.';
  } catch {
    finn('t-data').value = tekst;
    finn('t-data').select();
    melding.textContent = 'Fikk ikke kopiert automatisk. Teksten er merket i feltet, kopier den selv.';
  }
});

finn('t-last-data').addEventListener('click', () => {
  const melding = finn('t-data-melding');
  let ny;
  try {
    ny = lesTrappdata(finn('t-data').value);
  } catch (feil) {
    melding.textContent = feil.message;
    return;
  }
  if (!window.confirm('Erstatte trappa som er lagt inn nå med trappa fra dataene?')) return;
  settTilstand(ny);
  finn('t-data').value = '';
  melding.textContent = 'Lastet inn.';
  valgtIndeks = 0;
  merkeIndeks = 0;
  oppdater();
});

// ---------- Se det steg for steg ----------

function visMerkesteg(i) {
  const boksen = finn('merkevisning');
  if (!merking || !boksen) return;
  const { steg, vange, l, valg } = merking;
  merkeIndeks = Math.max(0, Math.min(i, steg.length - 1));
  const st = steg[merkeIndeks];
  boksen.querySelector('.merke-tegning').innerHTML = tegnMerkesteg(vange, l, st, valg);
  boksen.querySelector('.merke-tekst').innerHTML = `<strong>${st.tittel}</strong> ${st.tekst}`;
  boksen.querySelector('.merke-teller').textContent = `${merkeIndeks + 1} av ${steg.length}`;
  boksen.querySelector('.merke-glider').value = String(merkeIndeks);
  boksen.querySelector('[data-merkesteg="forrige"]').disabled = merkeIndeks === 0;
  boksen.querySelector('[data-merkesteg="neste"]').disabled = merkeIndeks === steg.length - 1;
}

function startAvspilling() {
  if (!merking) return;
  if (merkeIndeks >= merking.steg.length - 1) visMerkesteg(0);
  const knapp = resultat.querySelector('[data-merkesteg="spill"]');
  if (knapp) knapp.textContent = 'Stopp';
  avspilling = setInterval(() => {
    if (!merking || merkeIndeks >= merking.steg.length - 1) { stoppAvspilling(); return; }
    visMerkesteg(merkeIndeks + 1);
  }, 1600);
}

function stoppAvspilling() {
  if (avspilling) clearInterval(avspilling);
  avspilling = null;
  const knapp = resultat.querySelector('[data-merkesteg="spill"]');
  if (knapp) knapp.textContent = 'Spill av';
}

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
    innstillinger: Object.fromEntries([...INNSTILLINGER, ...VANGE, ...MATERIAL].map((n) => [n, finn(`t-${n}`).value])),
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

// Målene for vangen. Trinntykkelsen følger typen trapp når feltet er tomt (28 ute, 48 inne).
function vangeValg(inndata) {
  const ute = inndata.type === 'utvendig';
  const tykkelse = lesTall(finn('t-trinnTykkelse').value)
    ?? (ute ? STANDARD_TRAPP.trinnTykkelseUte : STANDARD_TRAPP.trinnTykkelseInne);
  return { nese: inndata.nese, trinnTykkelse: tykkelse,
    vangeBredde: lesTall(finn('t-vangeBredde').value) ?? STANDARD_TRAPP.vangeBredde,
    vangeTykkelse: lesTall(finn('t-vangeTykkelse').value) ?? STANDARD_TRAPP.vangeTykkelse,
    beleggNede: lesTall(finn('t-beleggNede').value) ?? 0 };
}

// Materiallista for løsningen som vises
function materialer(inndata, l, vange, valg) {
  const tall = (id, standard) => lesTall(finn(id).value) ?? standard;
  const antall = finn('t-antallVanger').value;
  return lagTrappMaterialer({ l, vange, bredde: inndata.bredde,
    trinnbord: inndata.lengdevalg === 'trinn' ? inndata.trinnbord : null,
    trinnTykkelse: valg.trinnTykkelse, nese: valg.nese, vangeTykkelse: valg.vangeTykkelse, vangeBredde: valg.vangeBredde,
    utstikk: tall('t-utstikk', STANDARD_TRAPP.utstikk), antallVanger: antall ? Number(antall) : null,
    kapptillegg: tall('t-kapptillegg', STANDARD_TRAPP.kapptillegg), svinn: tall('t-svinn', STANDARD_TRAPP.svinn),
    maksAvstandVangerTynn: tall('t-maksAvstandVangerTynn', STANDARD_TRAPP.maksAvstandVangerTynn),
    maksAvstandVangerTykk: tall('t-maksAvstandVangerTykk', STANDARD_TRAPP.maksAvstandVangerTykk) });
}

// ---------- Vise resultatet ----------

function oppdater() {
  stoppAvspilling();
  merking = null;
  lagre('trapp', lesTilstand());
  const inndata = lesSkjema();

  // Vis bare feltene som hører til valget for inntrinnet
  for (const valg of ['trinn', 'lengde', 'fri']) finn(`t-valg-${valg}`).hidden = inndata.lengdevalg !== valg;
  finn('t-trinnTykkelse').placeholder = String(vangeValg(inndata).trinnTykkelse);

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
  const l = svar.alle[indeks];
  const valg = vangeValg(inndata);
  const vange = lagVange(l, valg);
  const liste = vange.ok ? materialer(inndata, l, vange, valg) : null;
  sisteTrapp = vange.ok ? { tilstand: lesTilstand(), d: inndata, l, vange, valg, liste } : null;
  resultat.innerHTML = visTrapp(l, svar, indeks, inndata, vange, valg, liste);
  if (vange.ok) {
    merking = { steg: lagMerkesteg(vange, l, valg), vange, l, valg };
    visMerkesteg(merkeIndeks);
  }
}

function statusMerke(varsler) {
  if (varsler.some((v) => v.niva === 'ma')) return '<span class="merke merke-feil">Må fikses</span>';
  if (varsler.some((v) => v.niva === 'bor')) return '<span class="merke merke-varsel">Sjekk</span>';
  return '<span class="merke merke-ok">OK</span>';
}

// Varslene i samme tre grupper som i kledningsdelen. Trappa og vangen sammen.
function visVarsler(varsler) {
  const linjer = (niva) => varsler.filter((v) => v.niva === niva)
    .map((v) => `<p>${v.tekst}${v.kilde ? ` (${v.kilde})` : ''}</p>`).join('');
  const deler = [];
  if (linjer('ma')) deler.push(boks('feil', `<p><strong>Må fikses før du begynner</strong></p>${linjer('ma')}`));
  if (linjer('bor')) deler.push(boks('varsel', `<p><strong>Bør sjekkes</strong></p>${linjer('bor')}`));
  if (!linjer('ma') && !linjer('bor')) {
    deler.push(boks('ok', '<p>Inntrinnet følger kravet i TEK17, og trappeformelen er innenfor anbefalt.</p>'));
  }
  if (linjer('vite')) deler.push(boks('info', `<p><strong>Greit å vite</strong></p>${linjer('vite')}`));
  return deler.join('');
}

function visTrapp(l, svar, indeks, inndata, vange, valg, liste) {
  // Varsler fra trappa, vangen og materialene (det som bare er «greit å vite» om materialene,
  // står under Materialer)
  const varsler = [...l.varsler, ...(vange.varsler ?? []),
    ...(liste?.ok ? liste.varsler.filter((v) => v.niva !== 'vite') : [])];
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
    <div class="del-topp"><h2>Resultat</h2>${statusMerke(varsler)}</div>
    <div class="nokkeltall">
      ${kort('Opptrinn', `${mm(l.opptrinn, 1)} mm`, `${l.antallOpptrinn} opptrinn`)}
      ${kort('Inntrinn', `${mm(l.inntrinn, 1)} mm`, underInntrinn)}
      ${kort('Trappeformel', `${mm(l.formel, 1)} mm`, '2 × opptrinn + inntrinn')}
      ${kort('Stigning', `${mm(l.vinkel, 1)}°`, `Løpslengde ${mm(l.lopslengde)} mm`)}
    </div>
    ${visVarsler(varsler)}
    ${andre}
    ${vange.ok ? '<button type="button" class="knapp bred" id="t-skriv-ut">Skriv ut / PDF</button>' : ''}
    </section>

    <section class="del">
    <h2>Tegning</h2>
    ${zoomBoks('trapp', tegnTrapp(l, vange, valg))}
    <p class="hjelp">Sett fra siden, i riktig målestokk. ${toppTekst} Vangen er uttatt: trinnene ligger
      oppå hakk i vangen.${valg.beleggNede > 0 ? ' Stiplet strek nederst er der vangen står før belegget er lagt.' : ''}</p>
    </section>

    ${visVange(l, vange, valg)}

    <section class="del">
    <h2>Trinn for trinn</h2>
    <p class="hjelp">Høyde er overkant trinn over ferdig underlag. Forkant er vannrett fra forkant av nederste
      trinn. Hvert mål er regnet fra 0, så feilen vokser ikke oppover trappa.</p>
    <table class="maltabell">
      <caption>${l.antallInntrinn} trinn og dekket</caption>
      <thead><tr><th>Trinn</th><th>Høyde (mm)</th><th>Forkant (mm)</th></tr></thead>
      <tbody>${rader}</tbody>
    </table>
    </section>

    ${liste ? visMaterialer(liste, l) : ''}`;
}

function visMaterialer(liste, l) {
  if (!liste.ok) {
    return `<section class="del"><h2>Materialer</h2><p class="hjelp stor">${liste.feil.join(' ')}</p></section>`;
  }
  const bestill = liste.linjer.map((x) => `<tr><td>${x.del}</td><td>${x.dim.navn}</td><td>${x.hel
    ? `${x.antall} stk à minst ${mm(x.lengde)} mm` : `<strong>${mm(x.bestill)} lm</strong> <small>(netto ${mm(x.netto, 1)})</small>`}</td></tr>`).join('');
  const kapp = liste.linjer.map((x) => `<tr><td class="tall">${x.antall} stk</td><td class="tall">${mm(x.lengde)} mm</td><td>${x.del} ${x.dim.navn}</td></tr>`).join('');
  const vite = liste.varsler.filter((v) => v.niva === 'vite').map((v) => `<p>${v.tekst}</p>`).join('');
  const valgt = liste.antallVanger === liste.anbefaltVanger ? 'Som anbefalt' : `Anbefalt ${liste.anbefaltVanger}`;
  return `
    <section class="del">
    <h2>Materialer</h2>
    <div class="nokkeltall">
      ${kort('Vanger', `${liste.antallVanger} stk`, `${mm(liste.avstandVanger)} mm mellom (c/c). ${valgt}`)}
      ${kort('Trinn', `${l.antallInntrinn} stk`, `${mm(liste.trinnLengde)} mm lange`)}
    </div>
    <table class="maltabell">
      <caption>Bestilling</caption>
      <thead><tr><th>Del</th><th>Dimensjon</th><th>Bestill</th></tr></thead>
      <tbody>${bestill}</tbody>
    </table>
    <p class="hjelp">Vangene må være hele, så de bestilles i stykk. Trinn bestilles i løpemeter med
      ${mm(liste.svinn)} % svinn. Kapptillegg ${mm(liste.kapptillegg)} mm per bit.</p>
    <button type="button" class="knapp" id="t-del-liste">Kopier eller del lista</button>
    <h3>Kappliste</h3>
    <table class="maltabell"><thead><tr><th>Antall</th><th>Lengde</th><th>Del</th></tr></thead><tbody>${kapp}</tbody></table>
    ${vite ? boks('info', `<p><strong>Greit å vite</strong></p>${vite}`) : ''}
    </section>`;
}

function visVange(l, v, valg) {
  if (v.feil) {
    return `<section class="del"><h2>Vangen</h2>${boks('feil', v.feil.map((t) => `<p>${t}</p>`).join(''))}</section>`;
  }
  if (!v.ok) return '<section class="del"><h2>Vangen</h2><p class="hjelp">Se «Må fikses» over.</p></section>';

  const rader = v.merker.map((m, i) => `<tr><td>${i}</td><td>${m.hjelp ? '<small>hjelpespiss, kappes bort</small> ' : ''}${mm(m.avstand)}</td></tr>`).join('');
  const tegninger = {
    spisser: `${zoomBoks('vange', tegnVangeFlatt(v, valg))}
        <table class="maltabell">
          <caption>Spisser langs overkanten</caption>
          <thead><tr><th>Spiss</th><th>Fra spiss 0 (mm)</th></tr></thead>
          <tbody>${rader}</tbody>
        </table>`,
    hakk: zoomBoks('vange-hakk', tegnHakk(v, l, valg)),
    bunn: zoomBoks('vange-bunn', tegnBunn(v, valg)),
    topp: zoomBoks('vange-topp', tegnTopp(v, valg)),
    kapp: '',
  };
  const steg = lagVangeSteg(v, l, valg)
    .map((st) => `<li><strong>${st.tittel}</strong> ${st.tekst}${tegninger[st.id]}</li>`).join('');

  return `
    <section class="del">
    <h2>Vangen</h2>
    <div class="nokkeltall">
      ${kort('Hakk', `${mm(v.hakkDybde, 1)} mm`, 'Dybde inn fra overkanten')}
      ${kort('Resthøyde', `${mm(v.resthoyde, 1)} mm`, `Igjen av vangen på ${mm(valg.vangeBredde)} mm`)}
      ${kort('Mellom spissene', `${mm(v.s, 1)} mm`, 'Langs overkanten')}
      ${kort('Emne', `${mm(v.emnelengde)} mm`, 'Minste lengde på bordet')}
    </div>

    <h3>Slik merker du vangen</h3>
    <div id="merkevisning" class="merkevisning">
      <p class="merke-overskrift">Se det steg for steg</p>
      <div class="merke-tegning"></div>
      <p class="merke-tekst"></p>
      <div class="merke-kontroll">
        <button type="button" class="knapp" data-merkesteg="forrige" aria-label="Forrige steg">‹ Forrige</button>
        <span class="merke-teller" aria-live="polite"></span>
        <button type="button" class="knapp primar" data-merkesteg="neste" aria-label="Neste steg">Neste ›</button>
      </div>
      <input type="range" class="merke-glider" min="0" max="${lagMerkesteg(v, l, valg).length - 1}" value="0" aria-label="Velg steg">
      <button type="button" class="knapp lenkeknapp" data-merkesteg="spill">Spill av</button>
    </div>

    <p class="hjelp">Alle stegene med mål og skisser. Legg vangen på bukkene med overkanten mot deg. Nederste
      ende av trappa er til venstre.</p>
    <ol class="steg">${steg}</ol>
    <p class="hjelp">Grått på tegningene er vangen, hvitt med stiplet kant er det som kappes bort. Oransje
      er spiss 0 og vinkelen. Appen har ingen grense for resthøyde ennå, og regner ikke bæreevne.
      Dimensjon og antall vanger må vurderes for hver trapp.</p>
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
