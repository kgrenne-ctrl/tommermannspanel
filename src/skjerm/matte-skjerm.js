// Skjermdelen for Matte: menyen med utregningene, og skjema og resultat for den som er åpen.
// Alt bygges ut fra oppføringene i matte-liste.js. Regner aldri selv, all matematikk ligger i
// src/matte/. Lagres under nøkkelen «matte»: { apen, verdier: { [id]: {...} }, sist: [id] }.

import { GRUPPER, KALKULATORER, finnKalkulator, tekstFor, startverdier, erSynlig, lesInndata } from './matte-liste.js';
import { kort, boks } from './biter.js';
import { lagre, hent } from './lagring.js';

const rot = document.getElementById('matte-del');

// «Sist brukt» øverst i menyen vises først når lista er så lang at det hjelper.
const SIST_ANTALL = 3;
const SIST_FRA_ANTALL = 5;

const lagret = hent('matte');
const tilstand = {
  apen: lagret?.apen && finnKalkulator(lagret.apen) ? lagret.apen : null,
  verdier: lagret?.verdier ?? {},
  sist: (lagret?.sist ?? []).filter((id) => finnKalkulator(id)),
};

const lagreTilstand = () => lagre('matte', tilstand);

// ---------- Menyen ----------

function menyKnapp(k) {
  return `<button type="button" class="matte-valg" data-kalk="${k.id}">
    <strong>${k.tittel}</strong><span>${k.beskrivelse}</span></button>`;
}

function visMeny() {
  const deler = [];
  if (KALKULATORER.length >= SIST_FRA_ANTALL && tilstand.sist.length) {
    deler.push(`<h3>Sist brukt</h3><div class="matte-meny">${tilstand.sist.map((id) => menyKnapp(finnKalkulator(id))).join('')}</div>`);
  }
  for (const g of GRUPPER) {
    const iGruppa = KALKULATORER.filter((k) => k.gruppe === g.id);
    if (iGruppa.length) deler.push(`<h3>${g.tittel}</h3><div class="matte-meny">${iGruppa.map(menyKnapp).join('')}</div>`);
  }
  rot.innerHTML = `<section class="del"><h2>Hva vil du regne ut?</h2>${deler.join('')}</section>`;
}

// ---------- Skjema ----------

function feltHtml(f, v) {
  const id = `m-${f.id}`;
  const ledetekst = tekstFor(f.ledetekst, v);
  const hjelp = tekstFor(f.hjelp, v);
  let inndata;
  if (f.type === 'valg') {
    inndata = `<select id="${id}" data-felt-id="${f.id}">${f.valg.map((o) =>
      `<option value="${o.verdi}"${o.verdi === v[f.id] ? ' selected' : ''}>${o.tekst}</option>`).join('')}</select>`;
  } else {
    inndata = `<input id="${id}" data-felt-id="${f.id}" type="text" inputmode="decimal" `
      + `placeholder="${tekstFor(f.plassholder, v)}" value="${String(v[f.id] ?? '').replace(/"/g, '')}">`;
  }
  return `<div class="matte-felt" data-felt="${f.id}"${erSynlig(f, v) ? '' : ' hidden'}>
    <label class="felt" for="${id}"><span data-ledetekst>${ledetekst}</span>${inndata}</label>
    <p class="hjelp" data-hjelp${hjelp ? '' : ' hidden'}>${hjelp}</p></div>`;
}

function visKalkulator(k) {
  const v = tilstand.verdier[k.id];
  rot.innerHTML = `
    <button type="button" class="knapp lenkeknapp matte-tilbake" data-tilbake>Tilbake til alle utregningene</button>
    <div class="matte-kalk">
      <form id="matte-skjema" autocomplete="off" onsubmit="return false">
        <section class="del">
          <h2>${k.tittel}</h2>
          ${k.felt.map((f) => feltHtml(f, v)).join('')}
          <div class="knapperad to">
            <button type="button" class="knapp lenkeknapp" data-eksempel>Fyll inn eksempel</button>
            <button type="button" class="knapp fare" data-tom>Tøm</button>
          </div>
        </section>
      </form>
      <section id="matte-resultat" aria-live="polite"></section>
    </div>`;
  visResultat(k);
}

// Etter hver endring: skjul og vis felt, og bytt ledetekst, plassholder og hjelp som følger
// verdiene. Skjemaet tegnes ikke på nytt, så man blir stående i feltet man skriver i.
function oppdaterSkjema(k) {
  const v = tilstand.verdier[k.id];
  for (const f of k.felt) {
    const boksen = rot.querySelector(`[data-felt="${f.id}"]`);
    boksen.hidden = !erSynlig(f, v);
    boksen.querySelector('[data-ledetekst]').textContent = tekstFor(f.ledetekst, v);
    const hjelp = boksen.querySelector('[data-hjelp]');
    hjelp.textContent = tekstFor(f.hjelp, v);
    hjelp.hidden = !hjelp.textContent;
    if (f.type === 'tall') boksen.querySelector('input').placeholder = tekstFor(f.plassholder, v);
  }
}

// ---------- Resultat ----------

function visVarsler(varsler) {
  const linjer = (niva) => varsler.filter((x) => x.niva === niva)
    .map((x) => `<p>${x.tekst}${x.kilde ? ` (${x.kilde})` : ''}</p>`).join('');
  const deler = [];
  if (linjer('ma')) deler.push(boks('feil', `<p><strong>Må fikses før du begynner</strong></p>${linjer('ma')}`));
  if (linjer('bor')) deler.push(boks('varsel', `<p><strong>Bør sjekkes</strong></p>${linjer('bor')}`));
  if (linjer('vite')) deler.push(boks('info', `<p><strong>Greit å vite</strong></p>${linjer('vite')}`));
  return deler.join('');
}

// Tabell med løpende mål. Første kolonne er nummeret, de andre er tall og står til høyre.
function listeHtml({ tittel, kolonner, rader }) {
  return `<table class="maltabell matte-liste">
    <caption>${tittel}</caption>
    <thead><tr>${kolonner.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>${rader.map((rad) => `<tr>${rad.map((celle) => `<td class="tall">${celle}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function visResultat(k) {
  const ut = document.getElementById('matte-resultat');
  const d = lesInndata(k, tilstand.verdier[k.id]);
  const mangler = k.mangler(d);
  if (mangler) {
    ut.innerHTML = `<p class="hjelp stor">${mangler}</p>`;
    return;
  }
  const svar = k.regn(d);
  if (!svar.ok) {
    ut.innerHTML = `<section class="del">${boks('feil', svar.feil.map((t) => `<p>${t}</p>`).join(''))}</section>`;
    return;
  }
  const { nokkeltall, utregning, forklaring = [], liste = null } = k.vis(svar, d);
  ut.innerHTML = `
    <section class="del">
      <h2>Resultat</h2>
      <div class="nokkeltall">${nokkeltall.map(([t, verdi, under]) => kort(t, verdi, under)).join('')}</div>
      ${forklaring.length ? `<div class="matte-forklaring">${forklaring.map((t) => `<p>${t}</p>`).join('')}</div>` : ''}
      ${visVarsler(svar.varsler ?? [])}
      ${k.tegn ? `<div class="matte-tegning">${k.tegn(svar, d)}</div>` : ''}
      ${liste ? listeHtml(liste) : ''}
      <details class="detaljer matte-utregning">
        <summary>Slik er det regnet</summary>
        ${utregning.map((linje) => `<p>${linje}</p>`).join('')}
      </details>
    </section>`;
}

// ---------- Åpne, lukke og endre ----------

function apne(id) {
  const k = finnKalkulator(id);
  if (!k) return;
  tilstand.apen = id;
  tilstand.verdier[id] = startverdier(k, tilstand.verdier[id]);
  tilstand.sist = [id, ...tilstand.sist.filter((s) => s !== id)].slice(0, SIST_ANTALL);
  lagreTilstand();
  visKalkulator(k);
  tilToppen();
}

function lukk() {
  tilstand.apen = null;
  lagreTilstand();
  visMeny();
  tilToppen();
}

// Har man blant seg ned, starter den nye visningen øverst. Ellers blir bryteren stående synlig.
function tilToppen() {
  if (rot.getBoundingClientRect().top < 0) rot.scrollIntoView({ block: 'start' });
}

rot.addEventListener('click', (hendelse) => {
  const knapp = hendelse.target.closest('button');
  if (!knapp) return;
  if (knapp.dataset.kalk) { apne(knapp.dataset.kalk); return; }
  if (knapp.dataset.tilbake !== undefined) { lukk(); return; }
  const k = finnKalkulator(tilstand.apen);
  if (!k) return;
  if (knapp.dataset.eksempel !== undefined) {
    tilstand.verdier[k.id] = startverdier(k, { ...k.eksempel });
  } else if (knapp.dataset.tom !== undefined) {
    tilstand.verdier[k.id] = startverdier(k, {});
  } else {
    return;
  }
  lagreTilstand();
  visKalkulator(k);
});

// Regn på nytt bare på 'input' (se CLAUDE.md om hvorfor ikke 'change'). Nedtrekk sender også 'input'.
rot.addEventListener('input', (hendelse) => {
  const felt = hendelse.target.closest('[data-felt-id]');
  const k = finnKalkulator(tilstand.apen);
  if (!felt || !k) return;
  tilstand.verdier[k.id][felt.dataset.feltId] = felt.value;
  lagreTilstand();
  oppdaterSkjema(k);
  visResultat(k);
});

// ---------- Oppstart ----------

if (tilstand.apen) {
  const k = finnKalkulator(tilstand.apen);
  tilstand.verdier[k.id] = startverdier(k, tilstand.verdier[k.id]);
  visKalkulator(k);
} else {
  visMeny();
}
