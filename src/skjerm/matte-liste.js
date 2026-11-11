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
//   vis:       (svar, d) => { nokkeltall: [[tittel, verdi, under]], utregning: [tekst],
//                 forklaring: [tekst] (valgfri, vises rett under nøkkeltallene),
//                 liste: { tittel, kolonner: [tekst], rader: [[tekst]] } (valgfri tabell) }
//   tegn:      (svar, d) => SVG
//   eksempel:  verdiene «Fyll inn eksempel» legger inn (skal alltid gå opp)
// d er det som er fylt inn: tall for tallfelt (null når tomt eller skjult), tekst for valg.
// Ingen kobling til nettleseren her, så alt kan testes med node --test.

import {
  regnFall, regnTrekant, regnOppforing, regnSperre, regnGavlstendere, regnTakflate,
} from '../matte/tak.js';
import { regnDiagonal } from '../matte/vinkel.js';
import { fordelLikt, fordelSpiler, fordelBord } from '../matte/inndeling.js';
import { lesTall, mm, grader } from './format.js';
import {
  tegnFall, forholdTekst, tegnTrekant, tegnOppforing, tegnDiagonal, tegnInndeling, tegnSpiler, tegnSpilerUtsetting, tegnBord,
  tegnSperre, tegnFuglemunn, tegnGavlstendere, tegnStenderTopp, tegnTakflate,
} from './matte-tegning.js';

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

// ---------- Trekanten (fase M1) ----------

const TREKANT_SIDER = {
  liggendeStaende: ['liggende', 'staende'],
  liggendeSkra: ['liggende', 'skra'],
  staendeSkra: ['staende', 'skra'],
  liggendeVinkel: ['liggende', 'vinkel'],
  staendeVinkel: ['staende', 'vinkel'],
  skraVinkel: ['skra', 'vinkel'],
};
const brukerTrekant = (v, id) => (TREKANT_SIDER[v.kjent] ?? []).includes(id);

// Utregningen av de to ukjente, med tallene satt inn
const TREKANT_UTREGNING = {
  liggendeStaende: (r) => [
    `Skrå: √(liggende² + stående²) = √(${mm(r.liggende)}² + ${mm(r.staende)}²) = ${mm(r.skra, 1)} mm.`,
    `Vinkel: atan(stående / liggende) = atan(${mm(r.staende)} / ${mm(r.liggende)}) = ${grader(r.vinkel, 2)}.`,
  ],
  liggendeSkra: (r) => [
    `Stående: √(skrå² − liggende²) = √(${mm(r.skra)}² − ${mm(r.liggende)}²) = ${mm(r.staende, 1)} mm.`,
    `Vinkel: acos(liggende / skrå) = acos(${mm(r.liggende)} / ${mm(r.skra)}) = ${grader(r.vinkel, 2)}.`,
  ],
  staendeSkra: (r) => [
    `Liggende: √(skrå² − stående²) = √(${mm(r.skra)}² − ${mm(r.staende)}²) = ${mm(r.liggende, 1)} mm.`,
    `Vinkel: asin(stående / skrå) = asin(${mm(r.staende)} / ${mm(r.skra)}) = ${grader(r.vinkel, 2)}.`,
  ],
  liggendeVinkel: (r) => [
    `Stående: liggende × tan(v) = ${mm(r.liggende)} × tan(${grader(r.vinkel, 2)}) = ${mm(r.staende, 1)} mm.`,
    `Skrå: liggende / cos(v) = ${mm(r.liggende)} / cos(${grader(r.vinkel, 2)}) = ${mm(r.skra, 1)} mm.`,
  ],
  staendeVinkel: (r) => [
    `Liggende: stående / tan(v) = ${mm(r.staende)} / tan(${grader(r.vinkel, 2)}) = ${mm(r.liggende, 1)} mm.`,
    `Skrå: stående / sin(v) = ${mm(r.staende)} / sin(${grader(r.vinkel, 2)}) = ${mm(r.skra, 1)} mm.`,
  ],
  skraVinkel: (r) => [
    `Liggende: skrå × cos(v) = ${mm(r.skra)} × cos(${grader(r.vinkel, 2)}) = ${mm(r.liggende, 1)} mm.`,
    `Stående: skrå × sin(v) = ${mm(r.skra)} × sin(${grader(r.vinkel, 2)}) = ${mm(r.staende, 1)} mm.`,
  ],
};

const trekanten = {
  id: 'trekant',
  gruppe: 'fall',
  tittel: 'Trekanten',
  beskrivelse: 'Liggende, stående, skrå og vinkel. To kjente gir resten, med vinkel på saga',
  felt: [
    {
      id: 'kjent',
      type: 'valg',
      ledetekst: 'Det du vet',
      standard: 'liggendeStaende',
      hjelp: 'Liggende er vannrett, stående er loddrett og skrå er den lange siden. Vinkelen er mellom liggende og skrå.',
      valg: [
        { verdi: 'liggendeStaende', tekst: 'Liggende og stående' },
        { verdi: 'liggendeSkra', tekst: 'Liggende og skrå' },
        { verdi: 'staendeSkra', tekst: 'Stående og skrå' },
        { verdi: 'liggendeVinkel', tekst: 'Liggende og vinkel' },
        { verdi: 'staendeVinkel', tekst: 'Stående og vinkel' },
        { verdi: 'skraVinkel', tekst: 'Skrå og vinkel' },
      ],
    },
    { id: 'liggende', type: 'tall', ledetekst: 'Liggende (mm)', plassholder: 'f.eks. 3000', vis: (v) => brukerTrekant(v, 'liggende') },
    { id: 'staende', type: 'tall', ledetekst: 'Stående (mm)', plassholder: 'f.eks. 4000', vis: (v) => brukerTrekant(v, 'staende') },
    { id: 'skra', type: 'tall', ledetekst: 'Skrå (mm)', plassholder: 'f.eks. 5000', vis: (v) => brukerTrekant(v, 'skra') },
    { id: 'vinkel', type: 'tall', ledetekst: 'Vinkel mot liggende (grader)', plassholder: 'f.eks. 45', vis: (v) => brukerTrekant(v, 'vinkel') },
  ],
  mangler: (d) => ((TREKANT_SIDER[d.kjent] ?? []).some((id) => d[id] === null) ? 'Skriv inn de to målene du vet.' : null),
  regn: (d) => regnTrekant(d),
  vis: (r) => ({
    nokkeltall: [
      ['Liggende', `${mm(r.liggende)} mm`, 'Vannrett'],
      ['Stående', `${mm(r.staende)} mm`, 'Loddrett'],
      ['Skrå', `${mm(r.skra)} mm`, 'Den lange siden'],
      ['Vinkel', grader(r.vinkel), `Mot liggende. Oppe ${grader(r.vinkelTopp)}`],
      ['Saga mot liggende', grader(r.sagMotLiggende), `Vinkel på emnet ${grader(r.vinkel)}`],
      ['Saga mot stående', grader(r.sagMotStaende), `Vinkel på emnet ${grader(r.vinkelTopp)}`],
    ],
    forklaring: [
      `Et stag langs skrå kappes med saga på ${grader(r.sagMotLiggende)} der det ligger an mot liggende, og på `
        + `${grader(r.sagMotStaende)} der det ligger an mot stående. 0° på saga er rett kapp.`,
      'Målene gjelder linjene i trekanten. På et stag med tykkelse er lang og kort side ulike, så merk hvilken kant målet gjelder.',
    ],
    utregning: [
      ...TREKANT_UTREGNING[r.kjent](r),
      `Vinkel oppe: 90° − ${grader(r.vinkel, 2)} = ${grader(r.vinkelTopp, 2)}.`,
      `Saga: 0° er rett kapp. Mot liggende 90° − ${grader(r.vinkel, 2)} = ${grader(r.sagMotLiggende, 2)}, mot stående ${grader(r.sagMotStaende, 2)}.`,
    ],
  }),
  tegn: (r) => tegnTrekant(r),
  eksempel: { kjent: 'liggendeStaende', liggende: '3000', staende: '4000' },
};

// ---------- Kiler og oppforing (fase M1) ----------

const oppforing = {
  id: 'oppforing',
  gruppe: 'fall',
  tittel: 'Kiler og oppforing',
  beskrivelse: 'Høyden på oppforingen for hver c/c bortover, for flatt tak, terrasse og avretting',
  felt: [
    {
      id: 'kjent',
      type: 'valg',
      ledetekst: 'Fallet er oppgitt som',
      standard: 'forhold',
      valg: [
        { verdi: 'forhold', tekst: '1:x' },
        { verdi: 'prosent', tekst: 'Prosent' },
        { verdi: 'mmPerMeter', tekst: 'Mm per meter' },
        { verdi: 'grader', tekst: 'Grader' },
      ],
    },
    {
      id: 'verdi',
      type: 'tall',
      ledetekst: (v) => FALL_LEDETEKST[v.kjent] ?? 'Fall',
      plassholder: (v) => FALL_PLASSHOLDER[v.kjent] ?? '',
    },
    { id: 'lengde', type: 'tall', ledetekst: 'Lengde fra lav til høy ende (mm)', plassholder: 'f.eks. 3000' },
    {
      id: 'cc',
      type: 'tall',
      ledetekst: 'C/c mellom punktene (mm)',
      plassholder: 'f.eks. 600',
      hjelp: 'For eksempel avstanden mellom bjelkene. Siste punkt er alltid enden.',
    },
    {
      id: 'start',
      type: 'tall',
      ledetekst: 'Høyde i lav ende (mm)',
      standard: 0,
      plassholder: '0',
      hjelp: 'Tykkelsen der oppforingen er lavest. 0 når den starter i null.',
    },
  ],
  mangler: (d) => {
    if (d.verdi === null) return 'Skriv inn fallet.';
    if (d.lengde === null) return 'Skriv inn lengden.';
    if (d.cc === null) return 'Skriv inn c/c mellom punktene.';
    return null;
  },
  regn: (d) => regnOppforing({ kjent: d.kjent, verdi: d.verdi, lengde: d.lengde, cc: d.cc, start: d.start ?? 0 }),
  vis: (r) => {
    const andre = r.punkter[1];
    return {
      nokkeltall: [
        ['Høy ende', `${mm(r.hoydeEnde)} mm`, `Over ${mm(r.lengde)} mm`],
        ['Per c/c', `${mm(r.okningPerCc, 1)} mm`, `Økning for hver ${mm(r.cc)} mm`],
        ['Fall', forholdTekst(r.forhold), `${mm(r.prosent, 1)} %, ${grader(r.grader)}`],
        ['Punkter', String(r.punkter.length), 'Med begge endene'],
      ],
      liste: {
        tittel: 'Høyde i hvert punkt',
        kolonner: ['Nr', 'Fra lav ende (mm)', 'Høyde (mm)'],
        rader: r.punkter.map((p) => [String(p.nr), mm(p.avstand), mm(p.hoyde)]),
      },
      utregning: [
        `Fallet som forhold mellom høyde og lengde (tangens): ${mm(r.tan, 4)}.`,
        'Høyde i et punkt = høyde i lav ende + avstand fra lav ende × fallet. Hvert punkt regnes fra lav ende og avrundes for seg.',
        `Punkt 2: ${mm(r.start, 1)} + ${mm(andre.avstand)} × ${mm(r.tan, 4)} = ${mm(andre.hoyde, 1)} mm.`,
        `Enden: ${mm(r.start, 1)} + ${mm(r.lengde)} × ${mm(r.tan, 4)} = ${mm(r.hoydeEnde, 1)} mm.`,
      ],
    };
  },
  tegn: (r) => tegnOppforing(r),
  eksempel: { kjent: 'prosent', verdi: '2', lengde: '3000', cc: '600', start: '10' },
};

// ---------- Rett vinkel og diagonal (fase M1) ----------

const diagonal = {
  id: 'diagonal',
  gruppe: 'vinkel',
  tittel: 'Rett vinkel og diagonal',
  beskrivelse: 'Diagonalen, 3-4-5 og hvor mye hjørnet står feil ut fra to målte diagonaler',
  felt: [
    { id: 'a', type: 'tall', ledetekst: 'Side a (mm)', plassholder: 'f.eks. 8000', hjelp: 'Er det skjevt, rettes det langs side a.' },
    { id: 'b', type: 'tall', ledetekst: 'Side b (mm)', plassholder: 'f.eks. 6000' },
    {
      id: 'd1',
      type: 'tall',
      ledetekst: 'Målt diagonal (mm), kan stå tomt',
      plassholder: 'f.eks. 10016',
      hjelp: 'Mål begge diagonalene for å se hvor mye hjørnet står feil.',
    },
    { id: 'd2', type: 'tall', ledetekst: 'Den andre diagonalen (mm), kan stå tomt', plassholder: 'f.eks. 9984' },
  ],
  mangler: (d) => (d.a === null || d.b === null ? 'Skriv inn begge sidene.' : null),
  regn: (d) => regnDiagonal(d),
  vis: (r) => {
    const nokkeltall = [['Diagonal', `${mm(r.diagonal)} mm`, 'Når hjørnene er rette']];
    const utregning = [`Diagonal: √(a² + b²) = √(${mm(r.a)}² + ${mm(r.b)}²) = ${mm(r.diagonal, 1)} mm.`];
    const forklaring = [];
    if (r.trekant) {
      const t = r.trekant;
      const langSide = t.kortSide === 'a' ? 'b' : 'a';
      nokkeltall.push(['Kontroll 3-4-5', `${mm(t.skra)} mm`, `${mm(t.kort)} på ${t.kortSide}, ${mm(t.lang)} på ${langSide}`]);
      utregning.push(`3-4-5: ${mm(Math.min(r.a, r.b))} / 3 og ${mm(Math.max(r.a, r.b))} / 4, den minste rundet ned til hele `
        + `100 mm: ${mm(t.faktor)}. Trekanten blir ${mm(t.kort)}, ${mm(t.lang)} og ${mm(t.skra)} mm.`);
    }
    if (r.skjevhet !== null) {
      const lang = Math.max(r.d1, r.d2);
      const kort = Math.min(r.d1, r.d2);
      nokkeltall.push(['Skjevhet', `${mm(r.skjevhet)} mm`, 'Skyv siden motsatt av a']);
      if (Math.round(r.skjevhet) === 0) {
        forklaring.push('Diagonalene er like på nærmeste mm. Hjørnene er rette.');
      } else {
        forklaring.push(`Den lange diagonalen (${mm(lang)} mm) går til hjørnet som står for langt ut. Skyv siden motsatt av a `
          + `${mm(r.skjevhet)} mm langs a, slik at den lange diagonalen blir kortere og den korte lengre. `
          + `Mål på nytt: begge skal være ${mm(r.diagonal)} mm.`);
      }
      utregning.push(`Skjevhet: (lang² − kort²) / (4 × a) = (${mm(lang)}² − ${mm(kort)}²) / (4 × ${mm(r.a)}) = ${mm(r.skjevhet, 1)} mm.`);
      utregning.push(`Kontroll av sidene: √((${mm(r.d1)}² + ${mm(r.d2)}²) / 2) = ${mm(r.snittDiagonal, 1)} mm. `
        + `Stemmer sidene, er dette nær ${mm(r.diagonal, 1)} mm.`);
    } else {
      const malt = r.d1 ?? r.d2;
      const avvik = r.avvik1 ?? r.avvik2;
      if (malt !== null) {
        const tittel = Math.round(avvik) === 0 ? 'Målt diagonal' : (avvik > 0 ? 'For lang' : 'For kort');
        nokkeltall.push([tittel, `${mm(Math.abs(avvik))} mm`, `Målt ${mm(malt)} mm`]);
        forklaring.push('Mål også den andre diagonalen for å se hvor mye og hvilken vei det er skjevt.');
        utregning.push(`Avvik: ${mm(malt)} − ${mm(r.diagonal, 1)} = ${mm(avvik, 1)} mm.`);
      }
    }
    return { nokkeltall, forklaring, utregning };
  },
  tegn: (r) => tegnDiagonal(r),
  eksempel: { a: '8000', b: '6000', d1: '10016', d2: '9984' },
};

// ---------- Lik avstand (fase M2) ----------

const LIKT_MAKS = { lik: 'Største c/c (mm)', fast: 'C/c (mm)', lekter: 'Største lekteavstand (mm)' };

const likAvstand = {
  id: 'likAvstand',
  gruppe: 'inndeling',
  tittel: 'Lik avstand',
  beskrivelse: 'Del en lengde i like felt, fast c/c med rest, eller lekter med minste og største avstand',
  felt: [
    {
      id: 'metode',
      type: 'valg',
      ledetekst: 'Hvordan',
      standard: 'lik',
      valg: [
        { verdi: 'lik', tekst: 'Like felt mellom to faste punkter' },
        { verdi: 'fast', tekst: 'Fast c/c fra start, rest til slutt' },
        { verdi: 'lekter', tekst: 'Lekter, med minste og største avstand' },
      ],
    },
    {
      id: 'lengde',
      type: 'tall',
      ledetekst: (v) => (v.metode === 'lekter' ? 'Fra første til øverste lekt (mm)' : 'Lengde mellom de faste punktene (mm)'),
      plassholder: 'f.eks. 4000',
    },
    {
      id: 'maks',
      type: 'tall',
      ledetekst: (v) => LIKT_MAKS[v.metode] ?? 'C/c (mm)',
      plassholder: (v) => (v.metode === 'lekter' ? 'fra leggeanvisningen' : 'f.eks. 600'),
    },
    {
      id: 'min',
      type: 'tall',
      ledetekst: 'Minste lekteavstand (mm)',
      plassholder: 'fra leggeanvisningen',
      hjelp: 'Avstandene står i leggeanvisningen for steinen. Appen har ingen standardverdier for lekter.',
      vis: (v) => v.metode === 'lekter',
    },
  ],
  mangler: (d) => {
    if (d.lengde === null) return 'Skriv inn lengden.';
    if (d.maks === null) return d.metode === 'fast' ? 'Skriv inn c/c.' : 'Skriv inn største avstand.';
    if (d.metode === 'lekter' && d.min === null) return 'Skriv inn minste lekteavstand.';
    return null;
  },
  regn: (d) => fordelLikt(d),
  vis: (r, d) => {
    const nokkeltall = [];
    const utregning = [];
    if (r.metode === 'fast') {
      nokkeltall.push(
        ['Felt', String(r.antallFelt), `${r.merker.length} merker mellom endene`],
        ['C/c', `${mm(r.cc)} mm`, 'Fra start'],
        ['Rest', `${mm(r.rest)} mm`, 'Siste felt'],
      );
      utregning.push(`Merker for hver ${mm(r.cc)} mm fra start så lenge det er under ${mm(r.lengde)} mm.`);
      const siste = r.merker.at(-1) ?? 0;
      utregning.push(`Rest: ${mm(r.lengde)} − ${mm(siste)} = ${mm(r.rest, 1)} mm.`);
    } else {
      nokkeltall.push(
        ['Felt', String(r.antallFelt), `${r.merker.length} merker mellom endene`],
        ['C/c', `${mm(r.cc, 1)} mm`, r.metode === 'lekter' ? `Mellom ${mm(d.min)} og ${mm(d.maks)} mm` : `Høyst ${mm(d.maks)} mm`],
      );
      utregning.push(`Antall felt: ${mm(r.lengde)} / ${mm(d.maks)} = ${mm(r.lengde / d.maks, 2)}, rundet opp til ${r.antallFelt}.`);
      utregning.push(`C/c: ${mm(r.lengde)} / ${r.antallFelt} = ${mm(r.cc, 2)} mm.`);
      if (r.merker.length > 1) {
        utregning.push(`Merke nummer n = n × ${mm(r.lengde)} / ${r.antallFelt}. Merke 2: 2 × ${mm(r.lengde)} / ${r.antallFelt} = ${mm(r.merker[1], 1)} mm.`);
      }
    }
    utregning.push('Hvert merke er regnet fra start og rundet til nærmeste mm for seg, så det samler seg ikke opp feil bortover.');
    return {
      nokkeltall,
      forklaring: r.merker.length ? ['Mål alle merkene fra samme start, ikke fra merke til merke.'] : [],
      liste: r.merker.length ? {
        tittel: 'Merker',
        kolonner: ['Nr', 'Fra start (mm)'],
        rader: r.merker.map((m, i) => [String(i + 1), mm(m)]),
      } : null,
      utregning,
    };
  },
  tegn: (r) => tegnInndeling(r),
  eksempel: { metode: 'lik', lengde: '4000', maks: '600' },
};

// ---------- Spiler og rekkverk (fase M2) ----------

const spiler = {
  id: 'spiler',
  gruppe: 'inndeling',
  tittel: 'Spiler og rekkverk',
  beskrivelse: 'Antall spiler og nøyaktig åpning mellom stolpene, under kravet på 100 mm',
  felt: [
    { id: 'lysapning', type: 'tall', ledetekst: 'Lysåpning mellom stolpene (mm)', plassholder: 'f.eks. 1800' },
    { id: 'bredde', type: 'tall', ledetekst: 'Bredde på spilene (mm)', plassholder: 'f.eks. 21' },
    {
      id: 'maks',
      type: 'tall',
      ledetekst: 'Største åpning (mm)',
      standard: 100,
      plassholder: '100',
      hjelp: 'Kravet er høyst 100 mm. Sett lavere for å ha margin.',
    },
  ],
  mangler: (d) => {
    if (d.lysapning === null) return 'Skriv inn lysåpningen mellom stolpene.';
    if (d.bredde === null) return 'Skriv inn bredden på spilene.';
    if (d.maks === null) return 'Skriv inn største åpning.';
    return null;
  },
  regn: (d) => fordelSpiler(d),
  vis: (r) => {
    const nokkeltall = [
      ['Spiler', String(r.antall), `${mm(r.bredde)} mm brede`],
      ['Åpning', `${mm(r.apning, 1)} mm`, `Høyst ${mm(r.maks)} mm`],
    ];
    if (r.apningEnFaerre !== null) nokkeltall.push(['Én spile færre', `${mm(r.apningEnFaerre, 1)} mm`, 'Gir for stor åpning']);
    nokkeltall.push(['Lysåpning', `${mm(r.lysapning)} mm`, 'Mellom stolpene']);
    const utregning = [
      `Antall: (lysåpning − største åpning) / (bredde + største åpning) = (${mm(r.lysapning)} − ${mm(r.maks)}) / `
        + `(${mm(r.bredde)} + ${mm(r.maks)}) = ${mm((r.lysapning - r.maks) / (r.bredde + r.maks), 2)}, rundet opp til ${r.antall}.`,
      `Åpning: (lysåpning − antall × bredde) / (antall + 1) = (${mm(r.lysapning)} − ${r.antall} × ${mm(r.bredde)}) / `
        + `${r.antall + 1} = ${mm(r.apning, 2)} mm.`,
    ];
    if (r.antall > 1) {
      utregning.push(`Forkant spile n = n × åpning + (n − 1) × bredde. Spile 2: 2 × ${mm(r.apning, 2)} + ${mm(r.bredde)} = ${mm(r.forkant[1], 1)} mm.`);
    }
    return {
      nokkeltall,
      forklaring: r.antall ? [
        '1. Hold enden av båndet mot innsiden av den ene stolpen, og mål langs håndlista eller bunnlista.',
        '2. Sett et merke ved hvert mål i lista under.',
        '3. Sett forkanten av spilen på merket, med spilen på siden bort fra stolpen.',
        `4. Kontroller til slutt: åpningen mot den andre stolpen skal være ${mm(r.apning, 1)} mm.`,
      ] : ['Lysåpningen er ikke større enn største åpning, så det trengs ingen spiler.'],
      liste: r.antall ? {
        tittel: 'Forkant av hver spile',
        kolonner: ['Nr', 'Fra stolpen (mm)'],
        rader: r.forkant.map((f, i) => [String(i + 1), mm(f)]),
      } : null,
      utregning,
    };
  },
  tegn: (r) => tegnSpiler(r) + tegnSpilerUtsetting(r),
  eksempel: { lysapning: '1800', bredde: '21', maks: '100' },
};

// ---------- Terrassebord og spaltekledning (fase M2) ----------

const bord = {
  id: 'bord',
  gruppe: 'inndeling',
  tittel: 'Terrassebord og spaltekledning',
  beskrivelse: 'Antall hele bord og nøyaktig spalte, med ett bord færre og ett mer',
  felt: [
    { id: 'bredde', type: 'tall', ledetekst: 'Bredde på flaten (mm)', plassholder: 'f.eks. 3000', hjelp: 'Bord helt ut i begge kanter.' },
    { id: 'bordbredde', type: 'tall', ledetekst: 'Bordbredde (mm)', plassholder: 'f.eks. 120' },
    { id: 'spalte', type: 'tall', ledetekst: 'Ønsket spalte (mm)', plassholder: 'f.eks. 5' },
  ],
  mangler: (d) => {
    if (d.bredde === null) return 'Skriv inn bredden på flaten.';
    if (d.bordbredde === null) return 'Skriv inn bordbredden.';
    if (d.spalte === null) return 'Skriv inn ønsket spalte.';
    return null;
  },
  regn: (d) => fordelBord(d),
  vis: (r) => ({
    nokkeltall: [
      ['Bord', String(r.antall), `à ${mm(r.bordbredde)} mm`],
      ['Spalte', `${mm(r.spalte, 1)} mm`, `Ønsket ${mm(r.onsket, 1)} mm`],
      ...r.alternativer.map((a) => [`${a.antall} bord`, `${mm(a.spalte, 1)} mm`, a.antall < r.antall ? 'Spalte med ett færre' : 'Spalte med ett mer']),
    ],
    liste: {
      tittel: 'Forkant av hvert bord',
      kolonner: ['Nr', 'Fra kanten (mm)'],
      rader: r.forkant.map((f, i) => [String(i + 1), mm(f)]),
    },
    utregning: [
      `Antall: (bredde + spalte) / (bordbredde + spalte) = (${mm(r.bredde)} + ${mm(r.onsket, 1)}) / (${mm(r.bordbredde)} + `
        + `${mm(r.onsket, 1)}) = ${mm((r.bredde + r.onsket) / (r.bordbredde + r.onsket), 2)}, rundet til ${r.antall}.`,
      `Spalte: (bredde − antall × bordbredde) / (antall − 1) = (${mm(r.bredde)} − ${r.antall} × ${mm(r.bordbredde)}) / `
        + `${r.antall - 1} = ${mm(r.spalte, 2)} mm.`,
      `Forkant bord n = (n − 1) × (bordbredde + spalte) = (n − 1) × ${mm(r.bordbredde + r.spalte, 2)} mm.`,
    ],
  }),
  tegn: (r) => tegnBord(r),
  eksempel: { bredde: '3000', bordbredde: '120', spalte: '5' },
};

// ---------- Sperre (fase M3) ----------

const vinkelFelt = { id: 'vinkel', type: 'tall', ledetekst: 'Takvinkel (grader)', plassholder: 'f.eks. 30' };

const sperre = {
  id: 'sperre',
  gruppe: 'fall',
  tittel: 'Sperre',
  beskrivelse: 'Lengde, emne, loddsnitt og fuglemunn fra løp, takvinkel og utstikk',
  felt: [
    { id: 'lop', type: 'tall', ledetekst: 'Løp (mm)', plassholder: 'f.eks. 4000', hjelp: 'Vannrett fra utsiden av svilla til midt møne.' },
    vinkelFelt,
    { id: 'utstikk', type: 'tall', ledetekst: 'Utstikk (mm), kan stå tomt', plassholder: 'f.eks. 600', hjelp: 'Vannrett utenfor svilla.' },
    {
      id: 'hoyde',
      type: 'tall',
      ledetekst: 'Sperrehøyde (mm)',
      plassholder: 'f.eks. 198',
      hjelp: 'Målt vinkelrett på kanten, 198 på en 48 × 198.',
    },
    {
      id: 'sete',
      type: 'tall',
      ledetekst: 'Sete i fuglemunnen (mm), kan stå tomt',
      plassholder: 'f.eks. 98',
      hjelp: 'Vannrett, som regel bredden på svilla.',
    },
    {
      id: 'monebord',
      type: 'tall',
      ledetekst: 'Mønebord (mm), kan stå tomt',
      plassholder: 'f.eks. 48',
      hjelp: 'Tykkelsen. Halvparten trekkes fra løpet.',
    },
  ],
  mangler: (d) => {
    if (d.lop === null) return 'Skriv inn løpet.';
    if (d.vinkel === null) return 'Skriv inn takvinkelen.';
    if (d.hoyde === null) return 'Skriv inn sperrehøyden.';
    return null;
  },
  regn: (d) => regnSperre(d),
  vis: (r) => {
    const fm = r.fuglemunn;
    const nokkeltall = [
      ['Emne', `${mm(r.emne)} mm`, 'Minste lengde å kappe fra'],
      ['Overkant', `${mm(r.lengde, 1)} mm`, 'Mellom loddsnittene'],
      ['Møne til hakk', `${mm(r.lengdeMoneTilHakk, 1)} mm`, 'Langs kanten'],
    ];
    if (r.utstikk > 0) nokkeltall.push(['Utstikk', `${mm(r.lengdeUtstikk, 1)} mm`, 'Langs kanten']);
    nokkeltall.push(
      ['Stigning', `${mm(r.stigning, 1)} mm`, 'Fra hakket til midt møne'],
      ['Loddsnitt', grader(r.sagLoddsnitt), `Saga. På emnet ${grader(90 - r.vinkel)}`],
      ['Vannrett snitt', grader(r.sagVannrett), `Saga. På emnet ${grader(r.vinkel)}`],
    );
    if (fm) {
      nokkeltall.push(
        ['Fuglemunn loddrett', `${mm(fm.loddrett, 1)} mm`, `Sete ${mm(fm.sete)} mm vannrett`],
        ['Resthøyde', `${mm(fm.rest, 1)} mm`, `Dybde ${mm(fm.dybde, 1)} mm`],
      );
    }
    const forklaring = [
      `Merk loddsnittene ved mønet og ved enden av utstikket med saga på ${grader(r.sagLoddsnitt)}. `
        + `Lengden langs overkant mellom dem er ${mm(r.lengde, 1)} mm.`,
    ];
    if (r.utstikk > 0 && fm) {
      forklaring.push(`Hakket står ${mm(r.lengdeUtstikk, 1)} mm fra enden av utstikket, målt langs underkanten.`);
    }
    if (fm) {
      forklaring.push(`Fuglemunnen: merk et loddsnitt ved hakket, mål ${mm(fm.loddrett, 1)} mm opp langs det fra underkanten, `
        + `og merk setet vannrett derfra, ${mm(fm.sete)} mm. Langs underkanten blir det ${mm(fm.langsUnderkant, 1)} mm.`);
    }
    const c = mm(Math.cos(r.vinkel * Math.PI / 180), 4);
    const t = mm(Math.tan(r.vinkel * Math.PI / 180), 4);
    const utregning = [
      `cos(${grader(r.vinkel)}) = ${c} og tan(${grader(r.vinkel)}) = ${t}.`,
      r.monebord > 0
        ? `Møne til hakk: (løp − mønebord / 2) / cos = (${mm(r.lop)} − ${mm(r.monebord / 2, 1)}) / ${c} = ${mm(r.lengdeMoneTilHakk, 1)} mm.`
        : `Møne til hakk: løp / cos = ${mm(r.lop)} / ${c} = ${mm(r.lengdeMoneTilHakk, 1)} mm.`,
    ];
    if (r.utstikk > 0) utregning.push(`Utstikk: ${mm(r.utstikk)} / ${c} = ${mm(r.lengdeUtstikk, 1)} mm.`);
    utregning.push(
      `Overkant: ${mm(r.lengdeMoneTilHakk, 1)}${r.utstikk > 0 ? ` + ${mm(r.lengdeUtstikk, 1)}` : ''} = ${mm(r.lengde, 1)} mm.`,
      `Emne: overkant + sperrehøyde × tan = ${mm(r.lengde, 1)} + ${mm(r.hoyde)} × ${t} = ${mm(r.emne, 1)} mm. `
        + 'Loddsnittene står skrått, så det lange punktet er på overkanten ved mønet og på underkanten ved utstikket.',
      `Stigning: løp × tan = ${mm(r.lop)} × ${t} = ${mm(r.stigning, 1)} mm.`,
      `Saga: 0° er rett kapp. Loddsnitt ${grader(r.sagLoddsnitt)}, vannrett snitt 90° − ${grader(r.vinkel)} = ${grader(r.sagVannrett)}.`,
    );
    if (fm) {
      utregning.push(
        `Fuglemunn loddrett: sete × tan = ${mm(fm.sete)} × ${t} = ${mm(fm.loddrett, 1)} mm.`,
        `Dybde vinkelrett på kanten: sete × sin = ${mm(fm.sete)} × ${mm(Math.sin(r.vinkel * Math.PI / 180), 4)} = ${mm(fm.dybde, 1)} mm.`,
        `Resthøyde: ${mm(r.hoyde)} − ${mm(fm.dybde, 1)} = ${mm(fm.rest, 1)} mm.`,
      );
    }
    return { nokkeltall, forklaring, utregning };
  },
  tegn: (r) => tegnSperre(r) + tegnFuglemunn(r),
  eksempel: { lop: '4000', vinkel: '30', utstikk: '600', hoyde: '198', sete: '98' },
};

// ---------- Stendere i gavl og skråvegg (fase M3) ----------

const gavlstendere = {
  id: 'gavl',
  gruppe: 'fall',
  tittel: 'Stendere i gavl og skråvegg',
  beskrivelse: 'Lengden på hver stender under en skrå svill, kort og lang side, og vinkel på saga',
  felt: [
    vinkelFelt,
    { id: 'cc', type: 'tall', ledetekst: 'C/c (mm)', plassholder: 'f.eks. 600' },
    { id: 'tykkelse', type: 'tall', ledetekst: 'Stendertykkelse (mm)', plassholder: 'f.eks. 48' },
    {
      id: 'forste',
      type: 'tall',
      ledetekst: 'Første stender, kort side (mm)',
      plassholder: 'f.eks. 2400',
      hjelp: 'Kort side er siden mot den lave enden.',
    },
    {
      id: 'lengde',
      type: 'tall',
      ledetekst: 'Fra første til siste stender (mm)',
      plassholder: 'f.eks. 2400',
      hjelp: 'Langs bunnsvilla. Siste stender står i enden.',
    },
  ],
  mangler: (d) => {
    if (d.vinkel === null) return 'Skriv inn takvinkelen.';
    if (d.cc === null) return 'Skriv inn c/c.';
    if (d.tykkelse === null) return 'Skriv inn stendertykkelsen.';
    if (d.forste === null) return 'Skriv inn lengden på første stender.';
    if (d.lengde === null) return 'Skriv inn lengden fra første til siste stender.';
    return null;
  },
  regn: (d) => regnGavlstendere(d),
  vis: (r) => ({
    nokkeltall: [
      ['Per stender', `${mm(r.okning, 1)} mm`, `Lengre for hver ${mm(r.cc)} mm`],
      ['Lang side', `+${mm(r.forskjell, 1)} mm`, 'Mot kort side'],
      ['Saga', grader(r.sag), `På emnet ${grader(r.vinkelEmne)}`],
      ['Stendere', String(r.stendere.length), `Siste ${mm(r.stendere.at(-1).kort)} mm`],
    ],
    forklaring: [
      `Lengdene i lista gjelder kort side, den siden som vender mot den lave enden. Lang side er ${mm(r.forskjell, 1)} mm lengre.`,
      `Kapp toppen med saga på ${grader(r.sag)}. Hver lengde er regnet fra første stender og rundet for seg.`,
    ],
    liste: {
      tittel: 'Lengde på hver stender',
      kolonner: ['Nr', 'Fra første (mm)', 'Kort side', 'Lang side'],
      rader: r.stendere.map((st) => [String(st.nr), mm(st.avstand), mm(st.kort), mm(st.lang)]),
    },
    utregning: [
      `tan(${grader(r.vinkel)}) = ${mm(Math.tan(r.vinkel * Math.PI / 180), 4)}.`,
      `Per stender: c/c × tan = ${mm(r.cc)} × ${mm(Math.tan(r.vinkel * Math.PI / 180), 4)} = ${mm(r.okning, 1)} mm.`,
      `Stender n, kort side: første + avstand fra første × tan. Stender 2: ${mm(r.forste)} + ${mm(r.stendere[1]?.avstand ?? 0)} × `
        + `${mm(Math.tan(r.vinkel * Math.PI / 180), 4)} = ${mm(r.stendere[1]?.kort ?? r.forste, 1)} mm.`,
      `Lang side: tykkelse × tan = ${mm(r.tykkelse)} × ${mm(Math.tan(r.vinkel * Math.PI / 180), 4)} = ${mm(r.forskjell, 1)} mm lengre.`,
      `Saga: ${grader(r.sag)}. Vinkelen på emnet, mellom kanten og snittet, er 90° − ${grader(r.vinkel)} = ${grader(r.vinkelEmne)}.`,
    ],
  }),
  tegn: (r) => tegnGavlstendere(r) + tegnStenderTopp(r),
  eksempel: { vinkel: '30', cc: '600', tykkelse: '48', forste: '2400', lengde: '2400' },
};

// ---------- Takflate (fase M3) ----------

const takflate = {
  id: 'takflate',
  gruppe: 'fall',
  tittel: 'Takflate',
  beskrivelse: 'Grunnflate regnet om til flaten langs taket, til takstein, undertak og lekter',
  felt: [
    {
      id: 'taktype',
      type: 'valg',
      ledetekst: 'Taktype',
      standard: 'saltak',
      valg: [{ verdi: 'saltak', tekst: 'Saltak, to like flater' }, { verdi: 'pulttak', tekst: 'Pulttak, én flate' }],
    },
    { id: 'lengde', type: 'tall', ledetekst: 'Lengde (mm)', plassholder: 'f.eks. 8000', hjelp: 'Grunnflaten målt vannrett, med utstikk.' },
    {
      id: 'bredde',
      type: 'tall',
      ledetekst: 'Bredde (mm)',
      plassholder: 'f.eks. 4000',
      hjelp: (v) => (v.taktype === 'pulttak' ? 'Fra lav til høy raft, vannrett.' : 'På tvers av mønet, fra raft til raft, vannrett.'),
    },
    { ...vinkelFelt },
  ],
  mangler: (d) => {
    if (d.lengde === null) return 'Skriv inn lengden.';
    if (d.bredde === null) return 'Skriv inn bredden.';
    if (d.vinkel === null) return 'Skriv inn takvinkelen.';
    return null;
  },
  regn: (d) => regnTakflate(d),
  vis: (r) => {
    const nokkeltall = [['Takflate', `${mm(r.takflate, 2)} m²`, `Grunnflate ${mm(r.grunnflate, 2)} m²`]];
    if (r.flater === 2) nokkeltall.push(['Per side', `${mm(r.perFlate, 2)} m²`, 'To like flater']);
    nokkeltall.push(
      ['Langs taket', `${mm(r.langsTaket)} mm`, r.flater === 2 ? 'Fra raft til møne' : 'Fra raft til raft'],
      ['Tillegg', `${mm(r.tillegg * 100, 1)} %`, 'Mer enn grunnflaten'],
    );
    const c = mm(Math.cos(r.vinkel * Math.PI / 180), 4);
    return {
      nokkeltall,
      forklaring: ['Gjelder når alle takflatene har samme vinkel. Svinn og omlegg er ikke med.'],
      utregning: [
        `Grunnflate: ${mm(r.lengde)} × ${mm(r.bredde)} mm = ${mm(r.grunnflate, 2)} m².`,
        `Takflate: grunnflate / cos(${grader(r.vinkel)}) = ${mm(r.grunnflate, 2)} / ${c} = ${mm(r.takflate, 2)} m².`,
        `Langs taket: ${mm(r.vannrettPerFlate)} / ${c} = ${mm(r.langsTaket, 1)} mm${r.flater === 2 ? ' per side' : ''}.`,
      ],
    };
  },
  tegn: (r) => tegnTakflate(r),
  eksempel: { taktype: 'saltak', lengde: '8000', bredde: '4000', vinkel: '30' },
};

// Alle utregningene, i den rekkefølgen de står i menyen innenfor hver gruppe.
export const KALKULATORER = Object.freeze([
  fallOgTakvinkel, trekanten, oppforing, sperre, gavlstendere, takflate, diagonal, likAvstand, spiler, bord,
]);

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
