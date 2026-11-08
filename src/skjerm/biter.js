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
