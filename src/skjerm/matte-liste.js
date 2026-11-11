// Alle utregningene i Matte, beskrevet som oppføringer. matte-skjerm.js bygger menyen, skjemaet
// og resultatet ut fra dem. En ny utregning er én oppføring her og én regnefunksjon i src/matte/
// med test. index.html endres ikke.
//
// En oppføring:
//   id, gruppe (nøkkel i GRUPPER), tittel, beskrivelse (én linje i menyen)
//   felt:      [{ id, type: 'tall' | 'valg', ledetekst, enhet, standard, plassholder, hjelp,
//                 valg: [{ verdi, tekst }] (bare 'valg'), vis: (verdier) => true/false }]
//              ledetekst, plassholder og hjelp kan være tekst eller (verdier) => tekst.
//   mangler:   (d) => tekst når noe må fylles inn før det kan regnes, ellers null
//   regn:      (d) => svar fra regnemodellen ({ ok, feil, varsler, ... })
//   vis:       (svar, d) => { nokkeltall: [[tittel, verdi, under]], utregning: [tekst] }
//   tegn:      (svar, d) => SVG
//   eksempel:  verdiene «Fyll inn eksempel» legger inn (skal alltid gå opp)
// d er det som er fylt inn: tall for tallfelt (null når tomt eller skjult), tekst for valg.
// Ingen kobling til nettleseren her, så alt kan testes med node --test.

import { regnFall } from '../matte/tak.js';
import { lesTall, mm, grader } from './format.js';
import { tegnFall, forholdTekst } from './matte-tegning.js';

// Rekkefølgen på gruppene i menyen. Grupper uten utregninger vises ikke.
export const GRUPPER = Object.freeze([
  { id: 'fall', tittel: 'Fall og tak' },
  { id: 'vinkel', tittel: 'Vinkler og gjæring' },
  { id: 'inndeling', tittel: 'Inndeling' },
  { id: 'bue', tittel: 'Buer' },
  { id: 'areal', tittel: 'Areal og betong' },
  { id: 'mengde', tittel: 'Mengder og vekt' },
  { id: 'omregning', tittel: 'Omregning' },
]);

// ---------- Fall og takvinkel (fase M0) ----------

const FALL_LEDETEKST = {
  grader: 'Vinkel (grader)',
  prosent: 'Fall (prosent)',
  forhold: 'Fall 1:',
  mmPerMeter: 'Fall (mm per meter)',
};
const FALL_PLASSHOLDER = { grader: 'f.eks. 22', prosent: 'f.eks. 2', forhold: 'f.eks. 50', mmPerMeter: 'f.eks. 20' };
const FALL_UTGANGSPUNKT = {
  grader: (d, r) => `tan(${grader(d.verdi)}) = ${mm(r.tan, 4)}`,
  prosent: (d, r) => `${mm(d.verdi, 2)} % betyr ${mm(d.verdi, 2)} mm per 100 mm: ${mm(d.verdi, 2)} / 100 = ${mm(r.tan, 4)}`,
  forhold: (d, r) => `1:${mm(d.verdi, 2)} betyr 1 mm per ${mm(d.verdi, 2)} mm: 1 / ${mm(d.verdi, 2)} = ${mm(r.tan, 4)}`,
  mmPerMeter: (d, r) => `${mm(d.verdi, 2)} mm per 1000 mm: ${mm(d.verdi, 2)} / 1000 = ${mm(r.tan, 4)}`,
  malt: (d, r) => `${mm(d.hoyde, 1)} mm på ${mm(d.lengde)} mm: ${mm(d.hoyde, 1)} / ${mm(d.lengde)} = ${mm(r.tan, 4)}`,
};

const fallOgTakvinkel = {
  id: 'fall',
  gruppe: 'fall',
  tittel: 'Fall og takvinkel',
  beskrivelse: 'Grader, prosent, 1:x og mm per meter, og fall over en lengde',
  felt: [
    {
      id: 'kjent',
      type: 'valg',
      ledetekst: 'Det du vet',
      standard: 'grader',
      valg: [
        { verdi: 'grader', tekst: 'Vinkel i grader' },
        { verdi: 'prosent', tekst: 'Fall i prosent' },
        { verdi: 'forhold', tekst: 'Fall som 1:x' },
        { verdi: 'mmPerMeter', tekst: 'Fall i mm per meter' },
        { verdi: 'malt', tekst: 'Målt høydeforskjell på en lengde' },
      ],
    },
    {
      id: 'verdi',
      type: 'tall',
      ledetekst: (v) => FALL_LEDETEKST[v.kjent] ?? 'Fall',
      plassholder: (v) => FALL_PLASSHOLDER[v.kjent] ?? '',
      vis: (v) => v.kjent !== 'malt',
    },
    {
      id: 'hoyde',
      type: 'tall',
      ledetekst: 'Målt høydeforskjell (mm)',
      plassholder: 'f.eks. 35',
      vis: (v) => v.kjent === 'malt',
    },
    {
      id: 'lengde',
      type: 'tall',
      ledetekst: (v) => (v.kjent === 'malt' ? 'Målt lengde (mm)' : 'Lengde (mm), kan stå tomt'),
      plassholder: 'f.eks. 2400',
      hjelp: (v) => (v.kjent === 'malt'
        ? 'Vannrett lengde, eller lengden på vateret eller retteskinna du måler med.'
        : 'Med lengde regnes høydeforskjellen over lengden. For eksempel fra sluk til vegg.'),
    },
  ],
  mangler: (d) => {
    if (d.kjent === 'malt') {
      if (d.hoyde === null) return 'Skriv inn høydeforskjellen du har målt.';
      if (d.lengde === null) return 'Skriv inn lengden du har målt på.';
      return null;
    }
    return d.verdi === null ? 'Skriv inn fallet for å regne om.' : null;
  },
  regn: (d) => regnFall({ kjent: d.kjent, verdi: d.verdi, hoyde: d.hoyde, lengde: d.lengde }),
  vis: (r, d) => {
    const nokkeltall = [
      ['Vinkel', grader(r.grader), 'Fra vannrett'],
      ['Prosent', `${mm(r.prosent, 1)} %`, 'Høyde / lengde × 100'],
      ['Forhold', forholdTekst(r.forhold), Number.isFinite(r.forhold) ? `1 mm per ${forholdTekst(r.forhold).slice(2)} mm` : 'Ingen fall'],
      ['Per meter', `${mm(r.mmPerMeter, 1)} mm`, 'Fall på 1000 mm'],
    ];
    if (r.hoydeforskjell !== null && r.kjent !== 'malt') {
      nokkeltall.push(['Høydeforskjell', `${mm(r.hoydeforskjell)} mm`, `Over ${mm(r.lengde)} mm`]);
    }
    const utregning = [
      `Alt regnes fra forholdet mellom høyde og lengde (tangens til vinkelen). ${FALL_UTGANGSPUNKT[r.kjent](d, r)}.`,
      `Vinkel: atan(${mm(r.tan, 4)}) = ${grader(r.grader, 2)}.`,
      `Prosent: ${mm(r.tan, 4)} × 100 = ${mm(r.prosent, 2)} %.`,
      Number.isFinite(r.forhold) ? `Forhold: 1 / ${mm(r.tan, 4)} = ${mm(r.forhold, 2)}, altså 1:${mm(r.forhold, 2)}.` : 'Forhold: ingen fall.',
      `Per meter: ${mm(r.tan, 4)} × 1000 = ${mm(r.mmPerMeter, 2)} mm.`,
    ];
    if (r.hoydeforskjell !== null && r.kjent !== 'malt') {
      utregning.push(`Høydeforskjell: ${mm(r.lengde)} × ${mm(r.tan, 4)} = ${mm(r.hoydeforskjell, 1)} mm.`);
    }
    return { nokkeltall, utregning };
  },
  tegn: (r) => tegnFall(r),
  eksempel: { kjent: 'forhold', verdi: '50', lengde: '2400' },
};

// Alle utregningene, i den rekkefølgen de står i menyen innenfor hver gruppe.
export const KALKULATORER = Object.freeze([fallOgTakvinkel]);

export function finnKalkulator(id) {
  return KALKULATORER.find((k) => k.id === id) ?? null;
}

// Tekst eller funksjon av verdiene (ledetekst, plassholder, hjelp)
export function tekstFor(verdi, verdier) {
  return typeof verdi === 'function' ? verdi(verdier) : (verdi ?? '');
}

// Verdiene slik de står i skjemaet (tekst), med standardverdi der ingenting er fylt inn ennå.
export function startverdier(k, lagret = {}) {
  const v = {};
  for (const f of k.felt) v[f.id] = lagret[f.id] ?? (f.standard !== undefined ? String(f.standard) : '');
  return v;
}

export function erSynlig(felt, verdier) {
  return felt.vis ? felt.vis(verdier) : true;
}

// Gjør verdiene i skjemaet om til det regnemodellen får: tall for tallfelt, null når feltet er
// tomt eller skjult, og teksten for valg.
export function lesInndata(k, verdier) {
  const d = {};
  for (const f of k.felt) {
    if (f.type === 'valg') d[f.id] = verdier[f.id];
    else d[f.id] = erSynlig(f, verdier) ? lesTall(verdier[f.id]) : null;
  }
  return d;
}
