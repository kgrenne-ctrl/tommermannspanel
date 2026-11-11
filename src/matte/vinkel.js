// Regnemodell for vinkler og diagonaler i Matte. Ingen skjermkode her.
// Alle lengder i mm, alle vinkler i grader. Ingenting avrundes her, det gjør skjermdelen.
//
// regnDiagonal: diagonalen i et rektangel, største 3-4-5-trekant som får plass, og skjevhet
//               ut fra to målte diagonaler.

const erTall = (x) => typeof x === 'number' && Number.isFinite(x);

// 3-4-5-trekanten lages med hele 100 mm, så målene er lette å sette av med båndet.
const TREKANT_TRINN = 100;

// inndata: { a, b, d1, d2 }
//   a, b:   sidene (mm). Skjevheten rettes ved å skyve siden motsatt av a langs a.
//   d1, d2: målte diagonaler (mm), kan stå tomme
// Gir { ok: true, a, b, diagonal, trekant, d1, d2, avvik1, avvik2, skjevhet, varsler }
// eller { ok: false, feil }.
//   trekant:  { faktor, kort, lang, skra, kortSide: 'a' | 'b' } eller null når sidene er for korte
//   skjevhet: hvor langt siden motsatt av a må skyves langs a (null uten to diagonaler).
//             Når motstående sider er like lange (parallellogram), er d1² − d2² = 4 × a × s.
export function regnDiagonal(inndata) {
  const { a, b } = inndata;
  const feil = [];
  for (const [navn, x] of [['a', a], ['b', b]]) {
    if (!erTall(x)) feil.push(`Skriv inn side ${navn}.`);
    else if (x <= 0) feil.push(`Side ${navn} må være større enn 0.`);
  }
  const d1 = erTall(inndata.d1) ? inndata.d1 : null;
  const d2 = erTall(inndata.d2) ? inndata.d2 : null;
  if ((d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0)) feil.push('En målt diagonal må være større enn 0.');
  if (feil.length) return { ok: false, feil };

  const diagonal = Math.hypot(a, b);

  const kortSide = a <= b ? 'a' : 'b';
  const kort = Math.min(a, b);
  const lang = Math.max(a, b);
  const faktor = Math.floor(Math.min(kort / 3, lang / 4) / TREKANT_TRINN) * TREKANT_TRINN;
  const trekant = faktor > 0 ? { faktor, kort: 3 * faktor, lang: 4 * faktor, skra: 5 * faktor, kortSide } : null;

  const varsler = [];
  let skjevhet = null;
  if (d1 !== null && d2 !== null) {
    skjevhet = Math.abs(d1 * d1 - d2 * d2) / (4 * a);
    varsler.push({
      niva: 'vite',
      type: 'diagonal-sider',
      tekst: 'Skjevheten er regnet som om motstående sider er like lange. Mål sidene før diagonalene.',
      kilde: '',
    });
  }

  return {
    ok: true,
    a,
    b,
    diagonal,
    trekant,
    d1,
    d2,
    avvik1: d1 === null ? null : d1 - diagonal,
    avvik2: d2 === null ? null : d2 - diagonal,
    skjevhet,
    snittDiagonal: d1 !== null && d2 !== null ? Math.sqrt((d1 * d1 + d2 * d2) / 2) : null,
    varsler,
  };
}
