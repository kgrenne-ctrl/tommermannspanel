// Små byggeklosser som brukes av både felt-skjermen og vegg-skjermen.

import { STANDARD_BREDDER } from '../tommermann/fagverdier.js';
import { lesTall, mm } from './format.js';

export const EGEN = 'egen';
const finn = (id) => document.getElementById(id);

// ---------- Bordbredde: nedtrekk med standardbredder, eller målt bredde ----------

export function fyllBreddevalg(id, standard = 148) {
  const valg = finn(`${id}-valg`);
  valg.innerHTML = STANDARD_BREDDER.map((b) => `<option value="${b}">${b}</option>`).join('')
    + `<option value="${EGEN}">Målt bredde …</option>`;
  valg.value = String(standard);
  valg.addEventListener('change', () => {
    const egen = finn(`${id}-egen`);
    egen.hidden = valg.value !== EGEN;
    if (!egen.hidden) egen.focus();
  });
}

export function lesBredde(id) {
  const valg = finn(`${id}-valg`).value;
  return valg === EGEN ? lesTall(finn(`${id}-egen`).value) : Number(valg);
}

export function settBredde(id, verdi) {
  const valg = finn(`${id}-valg`);
  const egen = finn(`${id}-egen`);
  if (STANDARD_BREDDER.includes(verdi)) {
    valg.value = String(verdi);
    egen.hidden = true;
  } else {
    valg.value = EGEN;
    egen.hidden = false;
    egen.value = String(verdi).replace('.', ',');
  }
}

// ---------- Visning ----------

export function kort(tittel, verdi, under) {
  return `<div class="kort"><span class="kort-tittel">${tittel}</span>
    <span class="kort-verdi">${verdi}</span><span class="kort-under">${under}</span></div>`;
}

export function boks(type, innhold) {
  return `<div class="boks boks-${type}">${innhold}</div>`;
}

export function tabell(tittel, bord) {
  const rader = bord.map((b, i) => `<tr><td>${i + 1}</td><td>${mm(b.fra)}</td><td>${mm(b.til)}</td></tr>`).join('');
  return `<table class="maltabell">
    <caption>${tittel} (${bord.length})</caption>
    <thead><tr><th>Nr</th><th>Fra (mm)</th><th>Til (mm)</th></tr></thead>
    <tbody>${rader}</tbody></table>`;
}

// ---------- Zoom på tegninger ----------
// Tegningen legges i en boks med knappene −, + og Hele. Tegningen blir bredere enn boksen
// når man zoomer inn, og man skyver for å se resten. Zoomnivået huskes per tegning, så det
// ikke hopper tilbake når appen regner på nytt.

const ZOOMTRINN = [1, 1.5, 2, 3, 4, 6, 8];
const zoomNivaa = new Map(); // tegningens id -> indeks i ZOOMTRINN
const zoomRull = new Map();  // tegningens id -> [scrollLeft, scrollTop], så man blir stående der man var

export function zoomBoks(id, svg) {
  const trinn = zoomNivaa.get(id) ?? 0;
  const faktor = ZOOMTRINN[trinn];
  // Snittet har fast bredde i piksler, de andre tegningene fyller bredden (100 %)
  const fast = svg.match(/^<svg[^>]*\swidth="(\d+)"/);
  const bredde = fast ? `${Math.round(Number(fast[1]) * faktor)}px` : `${faktor * 100}%`;
  const svgMedBredde = svg.replace('<svg ', `<svg style="width:${bredde};height:auto" `);
  return `<div class="zoom" data-zoom-id="${id}">
    <div class="zoom-knapper" role="group" aria-label="Zoom">
      <button type="button" class="knapp zoom-knapp" data-zoom="ut" aria-label="Zoom ut" ${trinn === 0 ? 'disabled' : ''}>−</button>
      <span class="zoom-tall">${Math.round(faktor * 100)} %</span>
      <button type="button" class="knapp zoom-knapp" data-zoom="inn" aria-label="Zoom inn" ${trinn === ZOOMTRINN.length - 1 ? 'disabled' : ''}>+</button>
      <button type="button" class="knapp zoom-knapp" data-zoom="hele" ${trinn === 0 ? 'disabled' : ''}>Hele</button>
    </div>
    <div class="zoom-flate">${svgMedBredde}</div>
  </div>`;
}

// Lytter på zoomknappene inne i rot (for eksempel resultat-seksjonen). Kalles én gang.
export function kobleZoom(rot) {
  // Husk hvor man har skjøvet til i hver tegning
  rot.addEventListener('scroll', (hendelse) => {
    const flate = hendelse.target;
    if (!flate.classList || !flate.classList.contains('zoom-flate')) return;
    zoomRull.set(flate.closest('.zoom').dataset.zoomId, [flate.scrollLeft, flate.scrollTop]);
  }, true);
  // Når appen regner på nytt og tegner tegningene på nytt: skyv tilbake dit man var
  new MutationObserver(() => {
    for (const boks of rot.querySelectorAll('.zoom')) {
      const [x, y] = zoomRull.get(boks.dataset.zoomId) ?? [0, 0];
      const flate = boks.querySelector('.zoom-flate');
      flate.scrollLeft = x;
      flate.scrollTop = y;
    }
  }).observe(rot, { childList: true });

  rot.addEventListener('click', (hendelse) => {
    const knapp = hendelse.target.closest('[data-zoom]');
    if (!knapp) return;
    const boks = knapp.closest('.zoom');
    const id = boks.dataset.zoomId;
    const flate = boks.querySelector('.zoom-flate');
    const svg = flate.querySelector('svg');
    const forTrinn = zoomNivaa.get(id) ?? 0;
    let trinn = forTrinn;
    if (knapp.dataset.zoom === 'inn') trinn = Math.min(trinn + 1, ZOOMTRINN.length - 1);
    if (knapp.dataset.zoom === 'ut') trinn = Math.max(trinn - 1, 0);
    if (knapp.dataset.zoom === 'hele') trinn = 0;
    if (trinn === forTrinn) return;
    zoomNivaa.set(id, trinn);

    // Hold midten av det man ser på, på samme sted
    const forhold = ZOOMTRINN[trinn] / ZOOMTRINN[forTrinn];
    const midtX = (flate.scrollLeft + flate.clientWidth / 2) * forhold;
    const midtY = (flate.scrollTop + flate.clientHeight / 2) * forhold;
    const fast = svg.getAttribute('width');
    svg.style.width = fast ? `${Math.round(Number(fast) * ZOOMTRINN[trinn])}px` : `${ZOOMTRINN[trinn] * 100}%`;
    flate.scrollLeft = midtX - flate.clientWidth / 2;
    flate.scrollTop = midtY - flate.clientHeight / 2;
    zoomRull.set(id, [flate.scrollLeft, flate.scrollTop]);

    boks.querySelector('.zoom-tall').textContent = `${Math.round(ZOOMTRINN[trinn] * 100)} %`;
    boks.querySelector('[data-zoom="ut"]').disabled = trinn === 0;
    boks.querySelector('[data-zoom="hele"]').disabled = trinn === 0;
    boks.querySelector('[data-zoom="inn"]').disabled = trinn === ZOOMTRINN.length - 1;
  });
}
