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

import { regnFall, regnTrekant, regnOppforing } from '../matte/tak.js';
import { regnDiagonal } from '../matte/vinkel.js';
import { lesTall, mm, grader } from './format.js';
import { tegnFall, forholdTekst, tegnTrekant, tegnOppforing, tegnDiagonal } from './matte-tegning.js';

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

// Alle utregningene, i den rekkefølgen de står i menyen innenfor hver gruppe.
export const KALKULATORER = Object.freeze([fallOgTakvinkel, trekanten, oppforing, diagonal]);

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
