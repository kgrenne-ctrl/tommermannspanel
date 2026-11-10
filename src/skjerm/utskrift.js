// Utskrift (og lagre som PDF): hele huset med all inndata og alle resultater, vegg for vegg.
// Laget for å kunne vise et eksempel til andre (eller Claude) og finne løsninger sammen.
// Nederst står dataene som gjenskaper eksempelet nøyaktig («Last inn data» i appen).
// Ren HTML-bygging uten skjermkode, så den kan testes uten nettleser.

import { lagOppsettliste } from '../tommermann/vegg.js';
import { lagHjorneoversikt, hjorneLinjer, kontrollerFirkant, naboer } from '../tommermann/hus.js';
import { tegnVegg, tegnHjorne, tegnHus } from './tegning.js';
import { mm } from './format.js';

const HJORNETYPE = { mot: 'Mot naboveggen', forbi: 'Går forbi', kasse: 'Hjørnekasse' };
const BORD = { O: 'Påbord', U: 'Underbord' };
const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };
const STARTNAVN = { venstre: 'Fra venstre hjørne', hoyre: 'Fra høyre hjørne', midten: 'Midten av veggen',
  jevnt: 'Jevnest over hele veggen', lik: 'Lik avstand mellom påbordene' };

const vask = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tall = (x, d = 0) => (Number.isFinite(x) ? mm(x, d) : '–');

function karmTekst(avstand, referanse) {
  if (referanse === 'hjørnet') return 'fra hjørnet';
  return avstand < 0 ? `${mm(-avstand)} mm før ${referanse}` : `${mm(avstand)} mm etter ${referanse}`;
}

function startNavn(sv) {
  if (STARTNAVN[sv]) return STARTNAVN[sv];
  const nr = Number(String(sv).split(':')[1]);
  return Number.isInteger(nr) ? `Midten av åpning nr. ${nr + 1} fra venstre` : String(sv);
}

const rader = (par) => par.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');

// Inndata for én vegg (det som står i skjemaet, slik det ble tolket)
function inndataTabell(v) {
  const hjorne = (side) => {
    const h = v.hjorner?.[side] ?? {};
    const bord = side === 'venstre' ? v.hjorneVenstre : v.hjorneHoyre;
    return `${HJORNETYPE[h.type] ?? h.type}, ${BORD[bord] ?? bord} ytterst${h.type === 'kasse' ? `, kasse ${tall(h.kasse)} mm` : ''}`;
  };
  return `<table class="u-tabell"><tbody>${rader([
    ['Vegglengde', `${tall(v.lengde)} mm`],
    ['Vegghøyde', `${tall(v.hoyde)} mm`],
    ['Underbord / påbord', `${tall(v.bu, 1)} / ${tall(v.bo, 1)} mm`],
    ['Tykkelse underbord / påbord', `${tall(v.tykkelseUnder, 1)} / ${tall(v.tykkelseOver, 1)} mm`],
    ['Inn på karmen går', BORD[v.karmBord] ?? v.karmBord],
    ['Venstre hjørne', hjorne('venstre')],
    ['Høyre hjørne', hjorne('hoyre')],
    ['Start inndelingen', startNavn(v.startvalg)],
    ['Innlegg på karm (min / standard / maks)', `${tall(v.innleggMin)} / ${tall(v.innleggStandard)} / ${tall(v.innleggMax)} mm`],
    ['Omlegg (min / ideelt / varsel over)', `${tall(v.oMin)} / ${tall(v.oIdeal)} / ${tall(v.oMax)} mm`],
    ['Godtatt avvik i avstand mellom påbord', `±${tall(v.avvikPabord ?? 5)} mm`],
  ])}</tbody></table>
  <table class="u-tabell"><thead><tr><th>Åpning</th><th>Fra venstre hjørne</th><th>Bredde</th><th>Høyde på karm</th><th>Fra bakken</th></tr></thead>
    <tbody>${(v.apninger ?? []).length ? v.apninger.map((a, i) => `<tr><td>${i + 1}. ${TYPENAVN[a.type] ?? a.type}</td>
      <td>${tall(a.x)}</td><td>${tall(a.bredde)}</td><td>${tall(a.hoyde)}</td><td>${tall(a.bunn)}</td></tr>`).join('')
      : '<tr><td colspan="5">Ingen vinduer, dører eller porter</td></tr>'}</tbody></table>`;
}

function oppsettTabell(r) {
  const linjer = lagOppsettliste(r).map((o) => {
    if (!o.ok) return `<tr class="u-feil"><td>${o.nr}</td><td>${vask(o.navn)}</td><td colspan="6">${vask(o.melding)}</td></tr>`;
    const merk = [];
    for (const h of o.hjornebord) merk.push(`Hjørnebord kløyves til ${tall(h.bredde, 1)} mm`);
    return `<tr${o.innenforAnbefalt ? '' : ' class="u-varsel"'}><td>${o.nr}</td><td>${vask(o.navn)}</td>
      <td>${tall(o.fra)}<br><small>${karmTekst(o.fraReferanse, o.referanse)}</small></td>
      <td>${tall(o.kloss, 1)}</td><td>${o.antall}</td><td>${tall(o.til)}</td><td>${tall(o.avstandPabord, 1)}</td>
      <td>${tall(o.omlegg, 1)}${merk.length ? `<br><small>${merk.join('<br>')}</small>` : ''}</td></tr>`;
  }).join('');
  return `<table class="u-tabell"><thead><tr><th>Nr</th><th>Felt</th><th>Første underbord</th><th>Kloss</th>
    <th>Antall</th><th>Siste slutter</th><th>Mellom påbord</th><th>Omlegg</th></tr></thead><tbody>${linjer}</tbody></table>`;
}

function varselListe(r) {
  if (!r.varsler.length) return '<p>Ingen varsler. Alle felt går opp med omlegg innenfor anbefalt.</p>';
  return `<ul class="u-varsler">${r.varsler.map((v) => `<li class="${v.alvorlig ? 'u-feil' : ''}"><strong>${vask(v.felt)}:</strong> ${vask(v.tekst)}</li>`).join('')}</ul>`;
}

// hus: lagret tilstand ({ vegger, aktiv, lukket, materialer }), alle: inndata per vegg (tall),
// husSvar: losHus(...), liste: lagMaterialliste(...), versjon: appens versjon.
export function lagUtskrift({ hus, alle, husSvar, liste, versjon, dato = new Date() }) {
  const lukket = hus.lukket;
  const oversikt = lagHjorneoversikt({ vegger: alle, resultater: husSvar.vegger, lukket });
  const navn = (k) => alle[k]?.navn ?? `Vegg ${k + 1}`;

  const vegger = alle.map((v, k) => {
    const r = husSvar.vegger[k];
    let resultat;
    if (!r) resultat = '<p class="u-feil">Veggen er ikke ferdig utfylt og er ikke regnet.</p>';
    else if (r.feil) resultat = `<ul class="u-varsler">${r.feil.map((t) => `<li class="u-feil">${vask(t)}</li>`).join('')}</ul>`;
    else {
      const ok = r.felt.filter((f) => f.ok);
      const omlegg = ok.map((f) => f.losning.omlegg);
      const nb = naboer(k, alle.length, lukket);
      const hjorne = (side) => {
        const n = nb[side];
        return tegnHjorne(r, side, n === null ? null : husSvar.vegger[n], n === null ? 'Naboveggen' : navn(n));
      };
      resultat = `
        <p><strong>${r.felt.length} felt, ${ok.filter((f) => f.losning.innenforAnbefalt).length} innenfor anbefalt omlegg.</strong>
          Avstand mellom påbord ${ok.length ? `${tall(Math.min(...ok.map((f) => f.losning.avstandPabord)), 1)}–${tall(Math.max(...ok.map((f) => f.losning.avstandPabord)), 1)}` : '–'} mm.
          Omlegg ${omlegg.length ? `${tall(Math.min(...omlegg), 1)}–${tall(Math.max(...omlegg), 1)}` : '–'} mm.
          ${new Set(ok.map((f) => Math.round(f.losning.klaring))).size} ulike klosser.</p>
        <h4>Varsler</h4>${varselListe(r)}
        <h4>Slik setter du opp</h4>${oppsettTabell(r)}
        <div class="u-blokk"><h4>Tegning</h4><div class="u-tegning">${tegnVegg(r)}</div></div>
        <div class="u-blokk"><h4>Hjørnene sett ovenfra</h4>
        <div class="u-hjorner"><div><p>Venstre</p>${hjorne('venstre')}</div><div><p>Høyre</p>${hjorne('hoyre')}</div></div></div>`;
    }
    return `<section class="u-vegg"><h2>${k + 1}. ${vask(navn(k))}</h2><h3>Inndata</h3>${inndataTabell(v)}<h3>Resultat</h3>${resultat}</section>`;
  }).join('');

  const husDel = alle.length >= 2 ? `<section class="u-vegg"><h2>Hele huset</h2>
    <p>${alle.length} vegger${lukket && alle.length >= 3 ? ', går rundt hele huset' : ', ikke lukket'}.</p>
    <div class="u-hus">${tegnHus({ vegger: alle.map((v) => ({ navn: v.navn, lengde: v.lengde })), hjorner: oversikt.hjorner, lukket, aktiv: -1 })}</div>
    ${kontrollerFirkant(alle).map((t) => `<p class="u-varsel">${vask(t)}</p>`).join('')}
    ${hjorneLinjer(oversikt).map((h) => `<p class="${h.feil ? 'u-feil' : ''}"><strong>${vask(h.tittel)}</strong><br>${h.linjer.map(vask).join('<br>')}</p>`).join('')}
  </section>` : '';

  const materialer = liste && liste.linjer.length ? `<section class="u-vegg"><h2>Materialer</h2>
    <p>Svinn ${tall(liste.svinn)} %, kapptillegg ${tall(liste.kapptillegg)} mm per bord.</p>
    <table class="u-tabell"><thead><tr><th>Dimensjon</th><th>Netto (lm)</th><th>Bestill (lm)</th></tr></thead>
      <tbody>${liste.linjer.map((l) => `<tr><td>${l.dim.navn}</td><td>${tall(l.netto, 1)}</td><td>${tall(l.bestill)}</td></tr>`).join('')}</tbody></table>
    ${liste.mangler.length ? `<p class="u-feil">Ikke med fordi feltet ikke går opp: ${liste.mangler.map(vask).join(', ')}.</p>` : ''}
    ${liste.kappliste.map((v) => `<h4>Kappliste ${vask(v.navn)}</h4><table class="u-tabell"><tbody>${v.felt.map((f) =>
    `<tr><th colspan="3">${f.nr}. ${vask(f.navn)}</th></tr>${f.biter.map((b) => `<tr><td>${b.antall} stk</td><td>${tall(b.lengde)} mm</td><td>${b.dim.navn}, ${b.del.toLowerCase()}</td></tr>`).join('')}${(f.kloyves ?? []).map((kl) => `<tr><td colspan="3">${kl.tekst ?? 'Hjørnebord'} kløyves til ${tall(kl.bredde, 1)} mm</td></tr>`).join('')}`).join('')}</tbody></table>`).join('')}
  </section>` : '';

  const data = JSON.stringify({ app: 'tommermannspanel', versjon, hus });
  const tid = `${String(dato.getDate()).padStart(2, '0')}.${String(dato.getMonth() + 1).padStart(2, '0')}.${dato.getFullYear()}`;
  return `<header class="u-topp"><img src="assets/BAKOY_logo_hvit_transparent.png" alt="Bakøy Entreprenør AS">
      <div><strong>Tømmermannspanel</strong><br>Utskrift ${tid}, versjon ${vask(versjon)}</div></header>
    ${vegger}${husDel}${materialer}
    <section class="u-vegg u-data"><h2>Data for å gjenskape eksempelet</h2>
      <p>Kopier teksten under og lim den inn under «Data for eksempler» i appen for å få nøyaktig det samme.</p>
      <pre>${vask(data)}</pre></section>
    <footer class="u-bunn">Bakøy Entreprenør AS</footer>`;
}

// Leser data som er limt inn. Gir huset, eller kaster en feil med forklaring på norsk.
export function lesEksempeldata(tekst) {
  let d;
  try {
    d = JSON.parse(String(tekst).trim());
  } catch {
    throw new Error('Teksten er ikke gyldige data. Kopier hele teksten fra «Data for å gjenskape eksempelet».');
  }
  if (!d || d.app !== 'tommermannspanel' || !d.hus || !Array.isArray(d.hus.vegger) || !d.hus.vegger.length) {
    throw new Error('Dette er ikke data fra Tømmermannspanel.');
  }
  return d.hus;
}
