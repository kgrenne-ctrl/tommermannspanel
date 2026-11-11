// Utskrift (og lagre som PDF) for trappa: inndata, resultat, tegning, trinn for trinn, merking av
// vangen med skisser, materialliste og dataene som gjenskaper eksempelet («Last inn data»).
// Samme oppsett og stil (u-…) som utskriften av kledning. Ren HTML-bygging uten skjermkode,
// så den kan testes uten nettleser.

import { lagTrinnliste } from '../trapp/solver.js';
import { TRAPPETYPER } from '../trapp/fagverdier.js';
import { tegnTrapp, tegnVangeFlatt, tegnHakk, tegnBunn, tegnTopp } from './trapp-tegning.js';
import { lagVangeSteg } from './trapp-merking.js';
import { mm } from './format.js';

const vask = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tall = (x, d = 0) => (Number.isFinite(x) ? mm(x, d) : '–');
const rader = (par) => par.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
const LENGDEVALG = { trinn: 'Bordene i trinnet', lengde: 'Plassen til trappa', fri: 'Fritt (trappeformelen)' };

function inndataTabell(d, valg) {
  const par = [
    ['Type trapp', vask(TRAPPETYPER[d.type]?.navn ?? d.type)],
    ['Høyde', `${tall(d.hoyde)} mm`],
    ['Øverste trinn', d.ovreTrinn === 'eget' ? 'Eget trinn i samme høyde som dekket' : 'Dekket er øverste trinn'],
    ['Bredde på trappa', d.bredde ? `${tall(d.bredde)} mm` : 'Ikke oppgitt'],
    ['Inntrinnet bestemmes av', LENGDEVALG[d.lengdevalg] ?? d.lengdevalg],
  ];
  if (d.trinnbord) par.push(['Trinn av bord', `${d.trinnbord.antall} stk ${tall(d.trinnbord.bredde)} mm, spalte ${tall(d.trinnbord.spalte)} mm`]);
  if (d.lengdevalg === 'lengde') par.push(['Plass til trappa', `${tall(d.lengde)} mm`]);
  par.push(
    ['Nese', `${tall(valg.nese)} mm`],
    ['Vange', `${tall(valg.vangeTykkelse)} × ${tall(valg.vangeBredde)} mm, uttatt (trinnene oppå)`],
    ['Trinntykkelse', `${tall(valg.trinnTykkelse)} mm`],
    ['Belegg nede som legges senere', `${tall(valg.beleggNede)} mm`],
  );
  return `<table class="u-tabell"><tbody>${rader(par)}</tbody></table>`;
}

function varselListe(varsler) {
  if (!varsler.length) return '<p>Inntrinnet følger kravet i TEK17, og trappeformelen er innenfor anbefalt.</p>';
  return `<ul class="u-varsler">${varsler.map((v) => `<li class="${v.niva === 'ma' ? 'u-feil' : ''}">${vask(v.tekst)}${v.kilde ? ` (${vask(v.kilde)})` : ''}</li>`).join('')}</ul>`;
}

function materialDel(liste) {
  if (!liste) return '';
  if (!liste.ok) return `<section class="u-vegg"><h2>Materialer</h2><p>${liste.feil.map(vask).join(' ')}</p></section>`;
  const bestill = liste.linjer.map((l) => `<tr><td>${vask(l.del)}</td><td>${l.dim.navn}</td><td>${l.hel
    ? `${l.antall} stk, hver minst ${tall(l.lengde)} mm` : `${tall(l.bestill)} lm (netto ${tall(l.netto, 1)})`}</td></tr>`).join('');
  const kapp = liste.linjer.map((l) => `<tr><td>${l.antall} stk</td><td>${tall(l.lengde)} mm</td><td>${vask(l.del)} ${l.dim.navn}</td></tr>`).join('');
  return `<section class="u-vegg"><h2>Materialer</h2>
    <p>${liste.antallVanger} vanger, ${tall(liste.avstandVanger)} mm mellom (senter til senter). Kapptillegg
      ${tall(liste.kapptillegg)} mm per bit, ${tall(liste.svinn)} % svinn på trinn i løpemeter.</p>
    <table class="u-tabell"><thead><tr><th>Del</th><th>Dimensjon</th><th>Bestill</th></tr></thead><tbody>${bestill}</tbody></table>
    <h3>Kappliste</h3>
    <table class="u-tabell"><tbody>${kapp}</tbody></table>
    ${varselListe(liste.varsler)}</section>`;
}

// tilstand: skjemaet slik det lagres (gjenskaper eksempelet). d: inndata til losTrapp.
// l: valgt løsning. vange: lagVange(...). valg: målene for vangen. liste: lagTrappMaterialer(...).
export function lagTrappUtskrift({ tilstand, d, l, vange, valg, liste, versjon, dato = new Date() }) {
  const varsler = [...l.varsler, ...(vange.varsler ?? []), ...(liste?.ok ? liste.varsler.filter((v) => v.niva !== 'vite') : [])];
  const trinn = lagTrinnliste(l).map((r) => `<tr><td>${r.nr ?? 'Dekket'}</td><td>${tall(r.hoyde)}</td><td>${tall(r.forkant)}</td></tr>`).join('');
  const merker = vange.merker.map((m, i) => `<tr><td>${i}</td><td>${tall(m.avstand)}${m.hjelp ? ' (hjelpespiss, kappes bort)' : ''}</td></tr>`).join('');
  const steg = lagVangeSteg(vange, l, valg).map((s) => `<li><strong>${s.tittel}</strong> ${s.tekst}</li>`).join('');
  const data = JSON.stringify({ app: 'tommermannspanel', verktoy: 'trapp', versjon, trapp: tilstand });
  const tid = `${String(dato.getDate()).padStart(2, '0')}.${String(dato.getMonth() + 1).padStart(2, '0')}.${dato.getFullYear()}`;

  return `<header class="u-topp"><img src="assets/BAKOY_logo_hvit_transparent.png" alt="Bakøy Entreprenør AS">
      <div><strong>Trapp</strong><br>Utskrift ${tid}, versjon ${vask(versjon)}</div></header>
    <section class="u-vegg"><h2>Trappa</h2>
      ${inndataTabell(d, valg)}
      <table class="u-tabell"><tbody>${rader([
    ['Opptrinn', `${tall(l.opptrinn, 1)} mm (${l.antallOpptrinn} stk)`],
    ['Inntrinn', `${tall(l.inntrinn, 1)} mm (${l.antallInntrinn} trinn)`],
    ['Trappeformel', `${tall(l.formel, 1)} mm (2 × opptrinn + inntrinn)`],
    ['Stigning', `${tall(l.vinkel, 1)}°`],
    ['Løpslengde', `${tall(l.lopslengde)} mm`],
  ])}</tbody></table>
      <h3>Varsler</h3>${varselListe(varsler)}
      <div class="u-tegning u-lav">${tegnTrapp(l, vange, valg)}</div>
      <h3>Trinn for trinn</h3>
      <table class="u-tabell"><thead><tr><th>Trinn</th><th>Høyde over underlag (mm)</th><th>Forkant fra nederste trinn (mm)</th></tr></thead><tbody>${trinn}</tbody></table>
    </section>
    <section class="u-vegg"><h2>Vangen</h2>
      <table class="u-tabell"><tbody>${rader([
    ['Hakk', `${tall(vange.hakkDybde, 1)} mm inn fra overkanten`],
    ['Resthøyde', `${tall(vange.resthoyde, 1)} mm`],
    ['Mellom spissene', `${tall(vange.s, 1)} mm`],
    ['Emne', `minst ${tall(vange.emnelengde)} mm`],
  ])}</tbody></table>
      <h3>Slik merker du vangen</h3>
      <ol class="u-steg">${steg}</ol>
      <div class="u-tegning u-lav">${tegnVangeFlatt(vange, valg)}</div>
      <div class="u-skisser"><div>${tegnHakk(vange, l, valg)}</div><div>${tegnBunn(vange, valg)}</div><div>${tegnTopp(vange, valg)}</div></div>
      <table class="u-tabell"><thead><tr><th>Spiss</th><th>Fra spiss 0 (mm)</th></tr></thead><tbody>${merker}</tbody></table>
      <p><small>Appen har ingen grense for resthøyde ennå, og regner ikke bæreevne.</small></p>
    </section>
    ${materialDel(liste)}
    <section class="u-vegg u-data u-samme-side"><h2>Data for å gjenskape eksempelet</h2>
      <p>Kopier teksten under og lim den inn under «Data for eksempler» i trappeverktøyet for å få nøyaktig det samme.</p>
      <pre>${vask(data)}</pre></section>
    <footer class="u-bunn">Bakøy Entreprenør AS</footer>`;
}

// Leser data som er limt inn. Gir skjemaet for trappa, eller kaster en feil med forklaring på norsk.
export function lesTrappdata(tekst) {
  let d;
  try {
    d = JSON.parse(String(tekst).trim());
  } catch {
    throw new Error('Teksten er ikke gyldige data. Kopier hele teksten fra «Data for å gjenskape eksempelet».');
  }
  if (!d || d.app !== 'tommermannspanel' || d.verktoy !== 'trapp' || !d.trapp || typeof d.trapp !== 'object') {
    throw new Error('Dette er ikke data for en trapp. Data for kledning lastes inn under «Hel vegg».');
  }
  return d.trapp;
}
