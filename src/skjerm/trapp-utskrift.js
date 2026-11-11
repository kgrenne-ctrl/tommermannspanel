// Utskrift (og lagre som PDF) for trappa: nøkkeltall, inndata og kontroll, trappa sett fra siden
// med trinn for trinn, merking av vangen steg for steg med skisse ved hvert steg, materialliste og
// dataene som gjenskaper eksempelet («Last inn data»).
// Eget oppsett (tu-…, Kenny 2026-11-11: «design/layout på utskrift kan gjøres bedre») etter Bakøys
// maler: merkeblått bånd, blå overskrifter i versaler, oransje bare som strek, nøkkeltall som kort,
// «Bakøy tabell» og «Bakøy nøkkel/verdi», sidetall nederst. Ren HTML-bygging uten skjermkode,
// så den kan testes uten nettleser.

import { lagTrinnliste } from '../trapp/solver.js';
import { TRAPPETYPER } from '../trapp/fagverdier.js';
import { tegnTrapp, tegnVangeFlatt, tegnHakk, tegnBunn, tegnTopp } from './trapp-tegning.js';
import { lagVangeSteg } from './trapp-merking.js';
import { mm } from './format.js';

const vask = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tall = (x, d = 0) => (Number.isFinite(x) ? mm(x, d) : '–');
const LENGDEVALG = { trinn: 'Bordene i trinnet', lengde: 'Plassen til trappa', fri: 'Fritt (trappeformelen)' };
const NIVA = { ma: 'Må fikses før du begynner', bor: 'Bør sjekkes', vite: 'Greit å vite' };

const kort = (etikett, verdi, under) => `<div class="tu-kort"><span class="tu-etikett">${etikett}</span>`
  + `<span class="tu-verdi">${verdi}</span><span class="tu-under">${under}</span></div>`;
const nokkelVerdi = (par) => `<table class="tu-nv"><tbody>${par.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;

function inndata(d, valg, hull, hoyde) {
  const par = [
    ['Type trapp', vask(TRAPPETYPER[d.type]?.navn ?? d.type)],
    ['Høyde', hoyde?.maltSom === 'naa'
      ? `${tall(hoyde.ferdig)} mm ferdig (målt ${tall(hoyde.malt)} − ${tall(hoyde.gulvNede)} + ${tall(hoyde.gulvOppe)})`
      : `${tall(d.hoyde)} mm`],
    ['Øverste trinn', d.ovreTrinn === 'eget' ? 'Eget trinn i høyde med dekket' : 'Dekket'],
    ['Bredde over vangene', d.bredde ? `${tall(d.bredde)} mm` : 'Ikke oppgitt'],
  ];
  if (d.utstikk) par.push(['Utstikk på hver side', `${tall(d.utstikk)} mm`]);
  par.push(['Inntrinnet gitt av', LENGDEVALG[d.lengdevalg] ?? d.lengdevalg]);
  if (d.trinnbord) par.push(['Trinn av bord', `${d.trinnbord.antall} × ${tall(d.trinnbord.bredde)} mm, spalte ${tall(d.trinnbord.spalte)}`]);
  if (d.lengdevalg === 'lengde') par.push(['Plass til trappa', `${tall(d.lengde)} mm`]);
  par.push(
    ['Nese', `${tall(valg.nese)} mm`],
    ['Vange', `${tall(valg.vangeTykkelse)} × ${tall(valg.vangeBredde)} mm, uttatt`],
    ['Trinntykkelse', `${tall(valg.trinnTykkelse)} mm`],
  );
  if (valg.beleggNede) par.push(['Gulv nede senere', `${tall(valg.beleggNede)} mm`]);
  if (valg.stusstrinn) par.push(['Tette opptrinn', `Stusstrinn ${tall(valg.stusstrinn)} mm`]);
  if (hull?.ok) {
    par.push(['Etasjeskiller', `${tall(hull.etasjeskiller)} mm`]);
    par.push(['Trapphull', hull.hullLengde === null ? 'Ikke oppgitt' : `${tall(hull.hullLengde)} mm`]);
  }
  return nokkelVerdi(par);
}

function kontroll(varsler) {
  if (!varsler.some((v) => v.niva !== 'vite')) {
    varsler = [{ niva: 'ok', tekst: 'Inntrinnet følger kravet i TEK17, og trappeformelen er innenfor anbefalt.' }, ...varsler];
  }
  return varsler.map((v) => `<div class="tu-melding tu-${v.niva}"><strong>${v.niva === 'ok' ? 'OK' : NIVA[v.niva]}</strong>`
    + `<span>${vask(v.tekst)}${v.kilde ? ` <em>(${vask(v.kilde)})</em>` : ''}</span></div>`).join('');
}

// Spissene i rader på inntil ti, så tabellen holder seg innenfor bredden
function spissTabell(vange) {
  const biter = [];
  for (let i = 0; i < vange.merker.length; i += 10) biter.push(vange.merker.slice(i, i + 10).map((m, j) => ({ ...m, nr: i + j })));
  // Tomme celler fyller opp siste rad, så kolonnene står likt i alle radene
  const tomme = (bit) => (biter.length > 1 ? '<td></td>'.repeat(10 - bit.length) : '');
  return biter.map((bit) => `<table class="tu-tabell tu-spisser"><tbody>
    <tr><th>Spiss</th>${bit.map((m) => `<td>${m.nr}${m.hjelp ? '*' : ''}</td>`).join('')}${tomme(bit)}</tr>
    <tr><th>Fra 0 (mm)</th>${bit.map((m) => `<td>${tall(m.avstand)}</td>`).join('')}${tomme(bit)}</tr></tbody></table>`).join('')
    + (vange.merker.at(-1).hjelp ? '<p class="tu-fotnote">* Hjelpespiss: trengs bare for å tegne øverste hakk, og kappes bort.</p>' : '');
}

function materialer(liste) {
  if (!liste) return '';
  if (!liste.ok) return `<section class="tu-del"><h2>Materialer</h2><p>${liste.feil.map(vask).join(' ')}</p></section>`;
  const bestill = liste.linjer.map((l) => `<tr><td>${vask(l.del)}</td><td>${l.dim.navn}</td><td class="tu-hoyre">${l.hel
    ? `${l.antall} stk, hver minst ${tall(l.lengde)} mm` : `<strong>${tall(l.bestill)} lm</strong> (netto ${tall(l.netto, 1)})`}</td></tr>`).join('');
  const kapp = liste.linjer.map((l) => `<tr><td>${l.antall} stk</td><td>${tall(l.lengde)} mm</td><td>${vask(l.del)} ${l.dim.navn}</td></tr>`).join('');
  const vite = liste.varsler.filter((v) => v.niva === 'vite');
  return `<section class="tu-del tu-materialer"><h2>Materialer</h2>
    <div class="tu-to">
      <div><h3>Bestilling</h3>
        <table class="tu-tabell"><thead><tr><th>Del</th><th>Dimensjon</th><th class="tu-hoyre">Bestill</th></tr></thead><tbody>${bestill}</tbody></table></div>
      <div><h3>Kappliste</h3>
        <table class="tu-tabell"><thead><tr><th>Antall</th><th>Lengde</th><th>Del</th></tr></thead><tbody>${kapp}</tbody></table></div>
    </div>
    <p class="tu-liten">${liste.antallVanger} vanger, ${tall(liste.avstandVanger)} mm mellom (senter til senter). Kapptillegg
      ${tall(liste.kapptillegg)} mm per bit, ${tall(liste.svinn)} % svinn på trinn i løpemeter. ${vite.map((v) => vask(v.tekst)).join(' ')}</p>
  </section>`;
}

// tilstand: skjemaet slik det lagres (gjenskaper eksempelet). d: inndata til losTrapp.
// l: valgt løsning. vange: lagVange(...). valg: målene for vangen. liste: lagTrappMaterialer(...).
export function lagTrappUtskrift({ tilstand, d, l, vange, valg, liste, hull = null, hoyde = null, versjon, dato = new Date() }) {
  const varsler = [...l.varsler, ...(vange.varsler ?? []), ...(hull?.ok ? hull.varsler : []),
    ...(liste?.ok ? liste.varsler.filter((v) => v.niva !== 'vite') : [])];
  // Trapphullet som melding under kontroll: minstemålet, og fri høyde når lengden er oppgitt
  if (hull?.ok && !hull.varsler.length) {
    varsler.push({ niva: 'vite', tekst: `Trapphullet må være minst ${tall(hull.minsteHull)} mm langt for ${tall(hull.krav)} mm fri høyde.`
      + (hull.friHoyde !== null ? ` Fri høyde ved kanten blir ${tall(hull.friHoyde)} mm.` : ''), kilde: 'TEK17 § 12-14' });
  }
  const trinn = lagTrinnliste(l).map((r) => `<tr><td>${r.nr ?? 'Dekket'}</td><td>${tall(r.hoyde)}</td><td>${tall(r.forkant)}</td></tr>`).join('');
  const data = JSON.stringify({ app: 'tommermannspanel', verktoy: 'trapp', versjon, trapp: tilstand });
  const tid = `${String(dato.getDate()).padStart(2, '0')}.${String(dato.getMonth() + 1).padStart(2, '0')}.${dato.getFullYear()}`;
  const typeNavn = TRAPPETYPER[d.type]?.navn ?? '';

  const skisser = { hakk: tegnHakk(vange, l, valg), bunn: tegnBunn(vange, valg), topp: tegnTopp(vange, valg) };
  const steg = lagVangeSteg(vange, l, valg).map((st, i) => {
    const tittel = st.tittel.replace(/\.$/, '');
    if (st.id === 'spisser') {
      return `<li class="tu-steg tu-steg-hel"><span class="tu-nr">${i + 1}</span><div><h3>${tittel}</h3><p>${st.tekst}</p>
        <div class="tu-figur tu-vangen">${tegnVangeFlatt(vange, valg)}</div>${spissTabell(vange)}</div></li>`;
    }
    const figur = skisser[st.id] ? `<div class="tu-figur">${skisser[st.id]}</div>` : '';
    return `<li class="tu-steg${figur ? ' tu-med-figur' : ''}"><span class="tu-nr">${i + 1}</span><div><h3>${tittel}</h3><p>${st.tekst}</p></div>${figur}</li>`;
  }).join('');

  return `<div class="tu">
    <header class="tu-topp"><img src="assets/BAKOY_logo_hvit_transparent.png" alt="Bakøy Entreprenør AS">
      <div class="tu-tittel"><h1>Trapp</h1><p>${vask(typeNavn)} · høyde ${tall(d.hoyde)} mm · ${tid}</p></div></header>

    <section class="tu-del">
      <div class="tu-tall">
        ${kort('Opptrinn', `${tall(l.opptrinn, 1)} mm`, `${l.antallOpptrinn} stk`)}
        ${kort('Inntrinn', `${tall(l.inntrinn, 1)} mm`, `${l.antallInntrinn} trinn`)}
        ${kort('Trappeformel', `${tall(l.formel, 1)} mm`, 'Anbefalt 600–640')}
        ${kort('Stigning', `${tall(l.vinkel, 1)}°`, `Løp ${tall(l.lopslengde)} mm`)}
      </div>
      <div class="tu-to">
        <div><h2>Inndata</h2>${inndata(d, valg, hull, hoyde)}</div>
        <div><h2>Kontroll</h2>${kontroll(varsler)}</div>
      </div>
      <h2>Trappa sett fra siden</h2>
      <div class="tu-tegning-rad">
        <div class="tu-figur">${tegnTrapp(l, vange, { ...valg, trapphull: hull?.ok ? hull : null })}</div>
        <table class="tu-tabell"><thead><tr><th>Trinn</th><th>Høyde</th><th>Forkant</th></tr></thead><tbody>${trinn}</tbody></table>
      </div>
      <p class="tu-fotnote">Høyde er overkant trinn over ferdig underlag. Forkant er vannrett fra forkant av nederste trinn. Alle mål i mm.</p>
    </section>

    <section class="tu-del tu-ny-side">
      <h2>Merking av vangen</h2>
      <div class="tu-tall">
        ${kort('Hakk', `${tall(vange.hakkDybde, 1)} mm`, 'Inn fra overkanten')}
        ${kort('Resthøyde', `${tall(vange.resthoyde, 1)} mm`, `Av ${tall(valg.vangeBredde)} mm`)}
        ${kort('Mellom spissene', `${tall(vange.s, 1)} mm`, 'Langs overkanten')}
        ${kort('Emne', `${tall(vange.emnelengde)} mm`, 'Minste lengde')}
      </div>
      <p class="tu-liten">Legg vangen på bukkene med overkanten mot deg. Nederste ende av trappa er til venstre.</p>
      <ol class="tu-stegliste">${steg}</ol>
      <p class="tu-fotnote">Appen har ingen grense for resthøyde ennå, og regner ikke bæreevne.</p>
    </section>

    ${materialer(liste)}

    <section class="tu-del tu-data"><h2>Data for å gjenskape eksempelet</h2>
      <p class="tu-liten">Lim inn under «Data for eksempler» i trappeverktøyet for å få nøyaktig det samme. Versjon ${vask(versjon)}.</p>
      <pre>${vask(data)}</pre></section>
  </div>`;
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
