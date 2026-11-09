// Skjermdelen for hel vegg: leser skjemaet, spør veggmodellen og viser svaret.
// Regner aldri selv. All matematikk ligger i src/tommermann/.

import { foreslaVegg, vurderVegg, lagMerkeliste } from '../tommermann/vegg.js';
import { losHus, naboer, speilHjorne } from '../tommermann/hus.js';
import { STANDARD_INNSTILLINGER, STANDARD_VEGG, STANDARD_HJORNE } from '../tommermann/fagverdier.js';
import { tegnVegg, tegnSnitt } from './tegning.js';
import { lesTall, mm } from './format.js';
import { fyllBreddevalg, settBredde, kort, boks, tabell, zoomBoks, kobleZoom } from './biter.js';
import { lagre, hent } from './lagring.js';

const finn = (id) => document.getElementById(id);
const skjema = finn('vegg-skjema');
const resultat = finn('vegg-resultat');
const liste = finn('apninger');

const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };
const INNSTILLINGER = ['innleggMin', 'innleggStandard', 'innleggMax', 'oMin', 'oIdeal', 'oMax'];
const STANDARD = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG };
const SIDER = [['venstre', 'Venstre'], ['hoyre', 'Hoyre']];

// Hvilket horisontalsnitt som vises (etiketten i nedtrekkslista). Huskes mellom omregninger.
let valgtSnitt = null;

// Siste forslag som ble regnet ut (nullstilles når skjemaet endres).
let sisteForslag = null;

// Siste resultat for veggen som vises (trengs når forslagene regnes ut).
let sisteResultat = null;

// Huset: alle veggene som tekst slik de står i skjemaet, og hvilken som vises.
// Skjemaet viser én vegg om gangen. Når man bytter, lagres den gamle i hus.vegger.
let hus = { vegger: [], aktiv: 0, lukket: true };

// ---------- Oppstart ----------

kobleZoom(resultat);
fyllBreddevalg('vbu');
fyllBreddevalg('vbo');
for (const navn of INNSTILLINGER) finn(`v-${navn}`).value = String(STANDARD[navn]);
finn('v-tykkelseUnder').value = String(STANDARD.tykkelseUnder);
finn('v-tykkelseOver').value = String(STANDARD.tykkelseOver);
finn('v-hjorneVenstre').value = STANDARD.hjorneVenstre;
finn('v-hjorneHoyre').value = STANDARD.hjorneHoyre;
for (const [, Side] of SIDER) {
  finn(`v-hjorne${Side}Type`).value = STANDARD_HJORNE.type;
  finn(`v-hjorne${Side}Kasse`).value = String(STANDARD_HJORNE.kasse);
}
skjema.elements.karmBord.value = STANDARD.karmBord;
oppdaterStartvalg();

// Hent huset som sist ble skrevet inn på denne telefonen. Fra før fase 4 fantes bare én
// vegg (lagret som 'vegg'), den blir første vegg i huset.
const lagretHus = hent('hus');
const lagretVegg = hent('vegg');
if (lagretHus && Array.isArray(lagretHus.vegger) && lagretHus.vegger.length) {
  hus = { aktiv: 0, lukket: true, ...lagretHus };
  hus.aktiv = Math.min(Math.max(0, hus.aktiv), hus.vegger.length - 1);
  settTilstand(hus.vegger[hus.aktiv]);
} else {
  if (lagretVegg) settTilstand(lagretVegg);
  hus.vegger = [lesTilstand()];
}
finn('v-lukket').checked = hus.lukket;

// Bytte mellom «Ett felt» og «Hel vegg». Valget huskes også.
function visModus(modus) {
  const vegg = modus === 'vegg';
  finn('vegg-del').hidden = !vegg;
  finn('felt-del').hidden = vegg;
  lagre('modus', modus);
  if (vegg) oppdater();
}
for (const radio of document.querySelectorAll('input[name="modus"]')) {
  radio.addEventListener('input', () => { if (radio.checked) visModus(radio.value); });
}
if (hent('modus') === 'vegg') {
  document.querySelector('input[name="modus"][value="vegg"]').checked = true;
  visModus('vegg');
}

// Regn på nytt bare på 'input' (se CLAUDE.md om hvorfor ikke 'change').
skjema.addEventListener('input', (hendelse) => {
  // Byttes typen til dør eller port, står den på bakken.
  if (hendelse.target.classList.contains('a-type') && hendelse.target.value !== 'vindu') {
    hendelse.target.closest('.apning').querySelector('.a-bunn').value = '0';
  }
  if (hendelse.target.id === 'v-lukket') hus.lukket = hendelse.target.checked;
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
  } else if (knapp.id === 'v-tom') {
    tomVeggen();
  } else if (knapp.dataset.vegg !== undefined) {
    byttVegg(Number(knapp.dataset.vegg));
  } else if (knapp.id === 'v-ny-vegg') {
    nyVegg();
  } else if (knapp.id === 'v-slett-vegg') {
    if (!slettVegg()) return;
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
    // Hjørnene regnes ut av huset (naboveggene), så de tas med som de er
    const inndata = { ...lesSkjema(), forlengVenstre: sisteResultat.forleng.venstre,
      forlengHoyre: sisteResultat.forleng.hoyre };
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

function leggTilApning({ type, x = '', bredde = '', hoyde = '', bunn, fokus = true }) {
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
  if (fokus && x === '') kortet.querySelector('.a-x').focus();
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

// ---------- Lagring av det som er skrevet inn ----------

// Alt i skjemaet som tekst, akkurat slik det står (også halvskrevne tall).
function lesTilstand() {
  const bredde = (id) => ({ valg: finn(`${id}-valg`).value, egen: finn(`${id}-egen`).value });
  const hjorne = (Side) => ({ type: finn(`v-hjorne${Side}Type`).value, kasse: finn(`v-hjorne${Side}Kasse`).value });
  return {
    navn: finn('v-navn').value,
    lengde: finn('v-lengde').value,
    hoyde: finn('v-hoyde').value,
    vbu: bredde('vbu'),
    vbo: bredde('vbo'),
    tykkelseUnder: finn('v-tykkelseUnder').value,
    tykkelseOver: finn('v-tykkelseOver').value,
    karmBord: skjema.elements.karmBord.value,
    hjorneVenstre: finn('v-hjorneVenstre').value,
    hjorneHoyre: finn('v-hjorneHoyre').value,
    hjorner: { venstre: hjorne('Venstre'), hoyre: hjorne('Hoyre') },
    startvalg: finn('v-startvalg').value,
    innstillinger: Object.fromEntries(INNSTILLINGER.map((n) => [n, finn(`v-${n}`).value])),
    apninger: [...liste.querySelectorAll('.apning')].map((k) => ({
      type: k.querySelector('.a-type').value,
      x: k.querySelector('.a-x').value,
      bredde: k.querySelector('.a-bredde').value,
      hoyde: k.querySelector('.a-hoyde').value,
      bunn: k.querySelector('.a-bunn').value,
    })),
  };
}

// Fyller skjemaet med en lagret vegg. Det som mangler (for eksempel fra en eldre versjon
// av appen), får standardverdien, så ingenting blir hengende igjen fra forrige vegg.
function settTilstand(t) {
  try {
    finn('v-navn').value = t.navn ?? '';
    finn('v-lengde').value = t.lengde ?? '';
    finn('v-hoyde').value = t.hoyde ?? '';
    for (const id of ['vbu', 'vbo']) {
      const b = t[id] ?? { valg: '148', egen: '' };
      finn(`${id}-valg`).value = b.valg;
      finn(`${id}-egen`).value = b.egen ?? '';
      finn(`${id}-egen`).hidden = b.valg !== 'egen';
    }
    finn('v-tykkelseUnder').value = t.tykkelseUnder ?? String(STANDARD.tykkelseUnder);
    finn('v-tykkelseOver').value = t.tykkelseOver ?? String(STANDARD.tykkelseOver);
    skjema.elements.karmBord.value = t.karmBord ?? STANDARD.karmBord;
    finn('v-hjorneVenstre').value = t.hjorneVenstre ?? STANDARD.hjorneVenstre;
    finn('v-hjorneHoyre').value = t.hjorneHoyre ?? STANDARD.hjorneHoyre;
    for (const [side, Side] of SIDER) {
      const h = t.hjorner?.[side] ?? {};
      finn(`v-hjorne${Side}Type`).value = h.type ?? STANDARD_HJORNE.type;
      finn(`v-hjorne${Side}Kasse`).value = h.kasse || String(STANDARD_HJORNE.kasse);
    }
    for (const n of INNSTILLINGER) {
      finn(`v-${n}`).value = t.innstillinger?.[n] ?? String(STANDARD[n]);
    }
    liste.innerHTML = '';
    for (const a of t.apninger ?? []) leggTilApning({ ...a, fokus: false });
    oppdaterStartvalg();
    finn('v-startvalg').value = [...finn('v-startvalg').options].some((o) => o.value === t.startvalg)
      ? t.startvalg : STANDARD.startvalg;
  } catch {
    // Lagret tilstand fra en eldre versjon som ikke passer: start blankt
  }
}

// ---------- Veggene i huset ----------

function veggNavn(t, k) {
  return t?.navn?.trim() ? t.navn.trim() : `Vegg ${k + 1}`;
}

function byttVegg(k) {
  if (k === hus.aktiv || !hus.vegger[k]) return;
  hus.vegger[hus.aktiv] = lesTilstand();
  hus.aktiv = k;
  settTilstand(hus.vegger[k]);
  sisteForslag = null;
  valgtSnitt = null;
  finn('vegg-skjema').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Ny vegg til høyre for den siste. Den får samme bord, høyde og innstillinger som veggen som
// vises nå, og hjørnene som passer med naboene.
function nyVegg() {
  hus.vegger[hus.aktiv] = lesTilstand();
  const mal = hus.vegger[hus.aktiv];
  const k = hus.vegger.length;
  const ny = {
    ...structuredClone(mal),
    navn: `Vegg ${k + 1}`, lengde: '', apninger: [], startvalg: STANDARD.startvalg,
  };
  const standard = { ...STANDARD_HJORNE, kasse: String(STANDARD_HJORNE.kasse) };
  const forrigeHoyre = hus.vegger[k - 1].hjorner?.hoyre ?? standard;
  const forsteVenstre = hus.vegger[0].hjorner?.venstre ?? standard;
  ny.hjorner = {
    venstre: { ...forrigeHoyre, type: speilHjorne(forrigeHoyre.type) },
    hoyre: hus.lukket && k + 1 >= 3
      ? { ...forsteVenstre, type: speilHjorne(forsteVenstre.type) }
      : standard,
  };
  hus.vegger.push(ny);
  hus.aktiv = k;
  settTilstand(ny);
  sisteForslag = null;
  valgtSnitt = null;
  finn('v-lengde').focus();
}

function slettVegg() {
  if (hus.vegger.length <= 1) {
    tomVeggen();
    return true;
  }
  const navn = veggNavn(lesTilstand(), hus.aktiv);
  if (!window.confirm(`Slette ${navn}? Det du har skrevet inn på denne veggen, blir borte.`)) return false;
  hus.vegger.splice(hus.aktiv, 1);
  hus.aktiv = Math.min(hus.aktiv, hus.vegger.length - 1);
  settTilstand(hus.vegger[hus.aktiv]);
  sisteForslag = null;
  valgtSnitt = null;
  return true;
}

// Hjørnet på veggen som vises, bestemmer hjørnet på naboveggen: går denne forbi, slutter
// naboen mot den, og omvendt. Hjørnekasse gjelder begge.
function synkHjorner() {
  const k = hus.aktiv;
  const denne = hus.vegger[k];
  const nb = naboer(k, hus.vegger.length, hus.lukket);
  for (const [side, nabo, naboSide] of [['venstre', nb.venstre, 'hoyre'], ['hoyre', nb.hoyre, 'venstre']]) {
    if (nabo === null) continue;
    const min = denne.hjorner[side];
    const deres = hus.vegger[nabo].hjorner ?? (hus.vegger[nabo].hjorner = {});
    const forrige = deres[naboSide] ?? {};
    deres[naboSide] = {
      type: speilHjorne(min.type),
      // Kassebredden følger med når kassa velges, ellers beholder naboen sin egen
      kasse: min.type === 'kasse' && forrige.type !== 'kasse' ? min.kasse : (forrige.kasse ?? min.kasse),
    };
  }
}

function tomVeggen() {
  finn('v-lengde').value = '';
  liste.innerHTML = '';
  sisteForslag = null;
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

// Fra lagret tekst til tall for regnemodellen. Gir null når veggen ikke er ferdig utfylt.
function tilInndata(t) {
  const bredde = (b) => (b.valg === 'egen' ? lesTall(b.egen) : Number(b.valg));
  const inndata = {
    navn: veggNavn(t, hus.vegger.indexOf(t)),
    lengde: lesTall(t.lengde),
    hoyde: lesTall(t.hoyde),
    bu: bredde(t.vbu ?? { valg: '148' }),
    bo: bredde(t.vbo ?? { valg: '148' }),
    tykkelseUnder: lesTall(t.tykkelseUnder) ?? STANDARD.tykkelseUnder,
    tykkelseOver: lesTall(t.tykkelseOver) ?? STANDARD.tykkelseOver,
    karmBord: t.karmBord ?? STANDARD.karmBord,
    hjorneVenstre: t.hjorneVenstre ?? STANDARD.hjorneVenstre,
    hjorneHoyre: t.hjorneHoyre ?? STANDARD.hjorneHoyre,
    hjorner: Object.fromEntries(SIDER.map(([side]) => {
      const h = t.hjorner?.[side] ?? {};
      return [side, { type: h.type ?? STANDARD_HJORNE.type, kasse: lesTall(h.kasse) ?? STANDARD_HJORNE.kasse }];
    })),
    startvalg: t.startvalg ?? STANDARD.startvalg,
    apninger: (t.apninger ?? []).map((a) => ({
      type: a.type, x: lesTall(a.x), bredde: lesTall(a.bredde), hoyde: lesTall(a.hoyde), bunn: lesTall(a.bunn),
    })),
  };
  for (const navn of INNSTILLINGER) {
    const tall = lesTall(t.innstillinger?.[navn]);
    if (tall !== null) inndata[navn] = tall;
  }
  return inndata;
}

function lesSkjema() {
  return tilInndata(hus.vegger[hus.aktiv]);
}

// Hva mangler før veggen kan regnes? null når alt er på plass.
function mangler(inndata) {
  if (inndata.lengde === null || inndata.hoyde === null) {
    return 'Skriv inn vegglengde og vegghøyde, og legg til vinduer, dører og porter.';
  }
  if (inndata.bu === null || inndata.bo === null) return 'Skriv inn målt bordbredde.';
  const nr = inndata.apninger.findIndex((a) => [a.x, a.bredde, a.hoyde, a.bunn].includes(null));
  if (nr >= 0) return `Fyll inn alle målene for åpning nr. ${nr + 1}.`;
  return null;
}

function oppdater() {
  hus.vegger[hus.aktiv] = lesTilstand();
  synkHjorner();
  lagre('hus', hus);
  for (const [, Side] of SIDER) {
    finn(`v-hjorne${Side}KasseFelt`).hidden = finn(`v-hjorne${Side}Type`).value !== 'kasse';
  }

  // Regn alle veggene, så hjørnene og statusen på hver vegg stemmer
  const alle = hus.vegger.map(tilInndata);
  const husSvar = losHus({ vegger: alle.map((v) => (mangler(v) ? null : v)), lukket: hus.lukket });
  visFaner(husSvar);
  visNaboer(husSvar.vegger[hus.aktiv]);

  const melding = mangler(alle[hus.aktiv]);
  sisteResultat = null;
  if (melding) {
    resultat.innerHTML = `<p class="hjelp stor">${melding}</p>`;
    return;
  }
  const r = husSvar.vegger[hus.aktiv];
  if (r.feil) {
    resultat.innerHTML = boks('feil', r.feil.map((t) => `<p>${t}</p>`).join(''));
    return;
  }
  sisteResultat = r;
  resultat.innerHTML = visVegg(r);
}

// Veggene som knapper øverst, med status på hver
function visFaner(husSvar) {
  const merke = (r) => {
    if (!r) return '<span class="merke">Ikke ferdig</span>';
    if (r.feil || !r.ok || r.varsler.some((v) => v.alvorlig)) return '<span class="merke merke-feil">Sjekk</span>';
    const over = r.felt.some((f) => !f.losning.innenforAnbefalt);
    return over ? `<span class="merke merke-varsel">Over ${mm(r.rytme.maks)}</span>` : '<span class="merke merke-ok">OK</span>';
  };
  finn('hus-vegger').innerHTML = hus.vegger.map((t, k) => `
    <button type="button" data-vegg="${k}" class="${k === hus.aktiv ? 'aktiv' : ''}" ${k === hus.aktiv ? 'aria-current="true"' : ''}>
      ${k + 1}. ${veggNavn(t, k)} ${merke(husSvar.vegger[k])}</button>`).join('');
  finn('v-slett-vegg').textContent = hus.vegger.length > 1 ? 'Slett denne veggen' : 'Tøm hele veggen';
}

// Under hvert hjørne: hvilken vegg det møter, og hva det gjør med kledningen
function visNaboer(r) {
  const nb = naboer(hus.aktiv, hus.vegger.length, hus.lukket);
  for (const [side, Side] of SIDER) {
    const nabo = nb[side];
    const mot = nabo === null ? 'Ingen nabovegg lagt inn.' : `Møter ${veggNavn(hus.vegger[nabo], nabo)}.`;
    let tillegg = '';
    const f = r && !r.feil ? r.forleng[side] : null;
    if (f !== null && f !== undefined) {
      if (f > 0) tillegg = ` Kledningen går ${mm(f, 1)} mm forbi hjørnet.`;
      else if (f < 0) tillegg = ` Kledningen starter ${mm(-f, 1)} mm fra hjørnet.`;
      else tillegg = ' Kledningen slutter i hjørnet.';
    }
    finn(`v-nabo${Side}`).textContent = mot + tillegg;
  }
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
    <a class="knapp lenkeknapp hopp" href="#v-merkeliste">Gå til merkelista</a>
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
      Rød stiplet = feltet går ikke opp. Oransje linje = der snittet under er tatt.
      Grått i hjørnet = hjørnekasse.</p>

    <h3>Horisontalsnitt A–A</h3>
    <label class="felt"><span>Snitt i høyde</span>
      <select id="v-snitt">${snittValg.map((v) => `<option ${v.etikett === snitt.etikett ? 'selected' : ''}>${v.etikett}</option>`).join('')}</select></label>
    ${zoomBoks('snitt', tegnSnitt(r, snitt.hoyde))}
    <p class="hjelp">Sett ovenfra, veggen øverst og utsiden ned. Zoom med + og −, og skyv for å se resten.
      Tallene under kledningen ved karmen er innlegget i mm. Oransje stiplet = underlag bak påbord i hjørnet.
      Grått ved hjørnet = kledningen på naboveggen. Hjørnekasse er tegnet som karm.
      Bordtykkelsen er tegnet tykkere enn den er.</p>


    ${visMerkeliste(r)}

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

function visMerkeliste(r) {
  const rader = lagMerkeliste(r);
  const mangler = r.felt.map((f, i) => ({ f, nr: i + 1 })).filter(({ f }) => !f.ok);
  let forrigeKloss = null;
  const linjer = rader.map((m) => {
    const nyKloss = forrigeKloss === null || Math.abs(m.klaring - forrigeKloss) > 0.05;
    forrigeKloss = m.klaring;
    const ref = m.referanse === 'hjørnet' ? '' : `<span class="liten">${m.fraReferanse >= 0 ? '' : '−'}${mm(Math.abs(m.fraReferanse))} fra ${m.referanse}</span>`;
    return `<tr class="${nyKloss ? 'ny-kloss' : ''}">
      <td>${m.nr}</td>
      <td><strong>${mm(m.fra)}</strong>${ref}</td>
      <td>${m.hoyde}<span class="liten">felt ${m.feltNr}</span></td>
      <td>${nyKloss ? `<strong>${mm(m.klaring, 1)}</strong>` : mm(m.klaring, 1)}</td>
    </tr>`;
  }).join('');
  return `<h3 id="v-merkeliste">Merkeliste</h3>
    <p class="hjelp">Alle underbord fra venstre mot høyre. Merk venstre kant av hvert underbord,
      målt fra hjørnet (store tall) eller fra karmkanten (små tall, tryggere ved vinduer og dører).
      Minus betyr at bordet starter utenfor hjørnet (kledningen går forbi).
      Kloss = distanseklosse mellom underbordene. Fet skrift betyr at klossen er ny fra den raden.
      Påbordene settes midt over klaringen.</p>
    ${mangler.length ? boks('feil', `<p>Mangler i lista fordi feltet ikke går opp: ${mangler.map(({ f, nr }) => `${nr}. ${f.navn}`).join(', ')}.</p>`) : ''}
    <table class="maltabell merkeliste">
      <thead><tr><th>Nr</th><th>Venstre kant (mm)</th><th>Høyde</th><th>Kloss</th></tr></thead>
      <tbody>${linjer}</tbody>
    </table>`;
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
