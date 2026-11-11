// Standardverdier og krav for trapp (PLAN-trapp.md punkt 9). Alle mål i mm.
// Krav: TEK17 § 12-14 med veiledning, lest på dibk.no 2026-11-11.
// Bakøys standardverdier: bekreftet av Kenny 2026-11-11.
// Alle verdiene kan overstyres når man kaller losTrapp().

export const STANDARD_TRAPP = Object.freeze({
  // Opptrinnet appen sikter mot når lengden er fri (Kenny 2026-11-11).
  onsketOpptrinn: 175,

  // Trappeformelen: 2 opptrinn + 1 inntrinn = 620 mm ± 20 mm, målt i ganglinjen.
  // Preakseptert ytelse i veiledningen til § 12-14, ikke et krav. Utenfor gir varsel, ikke sperre.
  formelIdeal: 620,
  formelMin: 600,
  formelMax: 640,

  // Repos kreves ved høydeforskjell over 3,3 m (§ 12-14 første ledd bokstav e).
  reposOver: 3300,

  // Nese: hvor langt trinnet stikker ut foran trinnet under (Kenny 2026-11-11).
  nese: 20,
  // Trinntykkelse (Kenny 2026-11-11). Brukes av vangen (fase T3).
  trinnTykkelseInne: 48,
  trinnTykkelseUte: 28,
  // Standard vange (Kenny 2026-11-11). Brukes av vangen (fase T3).
  vangeTykkelse: 48,
  vangeBredde: 223,

  // Hvor appen leter etter antall opptrinn: opptrinn mellom disse. Ikke krav, bare søkeområde.
  sokOpptrinnMin: 100,
  sokOpptrinnMax: 250,
});

// Krav per type trapp (§ 12-14). inntrinnMin er forskriftskrav: under er aldri lov.
// breddeMin gjelder rette løp.
export const TRAPPETYPER = Object.freeze({
  // Sannsynlig: utvendig trapp bygd sammen med huset (inngang, terrasse) er ikke «internt i
  // boenhet», så hovedregelen på 0,90 m gjelder. Ikke bekreftet av DiBK for akkurat dette.
  utvendig: Object.freeze({ navn: 'Utvendig trapp', inntrinnMin: 250, breddeMin: 900 }),
  boenhet: Object.freeze({ navn: 'Trapp internt i boenheten', inntrinnMin: 250, breddeMin: 800 }),
  flere: Object.freeze({ navn: 'Hovedtrapp for flere boenheter', inntrinnMin: 250, breddeMin: 1100 }),
  annen: Object.freeze({ navn: 'Annen trapp', inntrinnMin: 250, breddeMin: 900 }),
});

// Trapp i uteareal som ikke er bygd sammen med huset (§ 8-9). Preaksepterte ytelser, ikke krav.
// Vises som «greit å vite» på utvendig trapp.
export const UTEAREAL = Object.freeze({ inntrinnMin: 280, vinkelUnder: 30 });
