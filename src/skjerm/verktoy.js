// Forsiden og byttet mellom verktøyene i appen: Kledning (tømmermannspanel), Trapp og Matte.
// Adressen styrer hva som vises: #kledning, #trapp og #matte viser verktøyet, alt annet viser
// forsiden. Da virker tilbakeknappen på telefonen, og logoen og hjemknappen (href="#") går hjem.
// Hvert verktøy har sin egen del på siden (#kledning-del, #trapp-del, #matte-del).
// Sist brukte verktøy huskes (nøkkel «verktoy») og merkes på forsiden.

import { lagre, hent } from './lagring.js';
import { KALKULATORER } from './matte-liste.js';

const VERKTOY = {
  kledning: { del: 'kledning-del', tittel: 'Tømmermannspanel', under: 'Inndeling av stående kledning' },
  trapp: { del: 'trapp-del', tittel: 'Trapp', under: 'Inndeling og merking av vange' },
  matte: { del: 'matte-del', tittel: 'Matte', under: 'Fall, vinkler og mengder' },
};
const FORSIDE = { tittel: 'Tømrerverktøy', under: 'Bakøy Entreprenør AS' };

const forside = document.getElementById('forside');
const rad = document.getElementById('verktoyrad');

function settTittel({ tittel, under }) {
  document.getElementById('topp-tittel').textContent = tittel;
  document.getElementById('topp-under').textContent = under;
}

function visForside() {
  for (const v of Object.values(VERKTOY)) document.getElementById(v.del).hidden = true;
  rad.hidden = true;
  forside.hidden = false;
  settTittel(FORSIDE);
  const sist = hent('verktoy');
  for (const kort of forside.querySelectorAll('[data-verktoy]')) {
    kort.querySelector('.forside-merke').hidden = kort.dataset.verktoy !== sist;
  }
}

function visVerktoy(navn) {
  forside.hidden = true;
  rad.hidden = false;
  for (const [nokkel, v] of Object.entries(VERKTOY)) document.getElementById(v.del).hidden = nokkel !== navn;
  document.querySelector(`input[name="verktoy"][value="${navn}"]`).checked = true;
  settTittel(VERKTOY[navn]);
  lagre('verktoy', navn);
}

function visRute() {
  const navn = window.location.hash.slice(1);
  if (VERKTOY[navn]) visVerktoy(navn);
  else visForside();
}

// Bryteren bytter verktøy uten å lage et nytt steg i historikken, så tilbakeknappen går til
// forsiden og ikke gjennom alle byttene.
for (const radio of document.querySelectorAll('input[name="verktoy"]')) {
  radio.addEventListener('input', () => { if (radio.checked) window.location.replace(`#${radio.value}`); });
}

window.addEventListener('hashchange', () => {
  visRute();
  window.scrollTo({ top: 0, behavior: 'instant' });
});

// Hvor mange utregninger Matte har, står på kortet
document.getElementById('forside-matte-tekst').textContent = `${KALKULATORER.length} utregninger: fall, tak, gjæring og inndeling`;

visRute();
