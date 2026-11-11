// Bytter mellom verktøyene i appen: Kledning (tømmermannspanel) og Trapp.
// Valget huskes på telefonen. Toppbåndet viser navnet på verktøyet som er valgt.
// Hvert verktøy har sin egen del på siden (#kledning-del, #trapp-del).

import { lagre, hent } from './lagring.js';

const VERKTOY = {
  kledning: { del: 'kledning-del', tittel: 'Tømmermannspanel', under: 'Inndeling av stående kledning' },
  trapp: { del: 'trapp-del', tittel: 'Trapp', under: 'Inndeling og merking av vange' },
};

function visVerktoy(navn) {
  const valgt = VERKTOY[navn] ? navn : 'kledning';
  for (const [nokkel, v] of Object.entries(VERKTOY)) {
    document.getElementById(v.del).hidden = nokkel !== valgt;
  }
  document.getElementById('topp-tittel').textContent = VERKTOY[valgt].tittel;
  document.getElementById('topp-under').textContent = VERKTOY[valgt].under;
  lagre('verktoy', valgt);
}

for (const radio of document.querySelectorAll('input[name="verktoy"]')) {
  radio.addEventListener('input', () => { if (radio.checked) visVerktoy(radio.value); });
}

const lagret = hent('verktoy');
if (lagret && VERKTOY[lagret]) {
  document.querySelector(`input[name="verktoy"][value="${lagret}"]`).checked = true;
  visVerktoy(lagret);
}
