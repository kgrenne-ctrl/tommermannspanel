// Standardverdier for tømmermannskledning (PLAN.md punkt 8). Alle mål i mm.
// Kilde: Treteknisk, G3 Gausdal og Talgø. Byggforsk 542.101 er ikke lest i fulltekst.
// Alle verdiene kan overstyres når man kaller losFelt().

export const STANDARD_INNSTILLINGER = Object.freeze({
  // Omlegg: hvor langt overliggeren går inn over underliggeren på hver side.
  oMin: 20,    // aldri mindre enn dette
  oIdeal: 25,  // det vi sikter mot
  oMax: 25,    // over dette gis varsel, men løsningen vises likevel

  // Spikersjekk (avklart med Kenny 2026-11-08).
  spikerKantavstand: 0,     // avstand fra spiker til kanten av underliggeren
  toSpikreFraBredde: 123,   // overligger fra denne bredden festes med to spikre
  spikeravstand: 30,        // minste avstand mellom to spikre i samme overligger
});

// Standardverdier for en hel vegg med åpninger (PLAN.md punkt 4, avklart 2026-11-08).
export const STANDARD_VEGG = Object.freeze({
  // Bordet går inn på karmen og dekker fugen. Ingen belistning.
  innleggMin: 10,
  innleggStandard: 15,
  innleggMax: 20,
  karmBord: 'O',        // hvilket bord som går inn på karmen: 'O' påbord, 'U' underbord
  hjorneVenstre: 'O',   // hva veggen starter med i venstre hjørne
  hjorneHoyre: 'O',     // hva veggen slutter med i høyre hjørne
  startvalg: 'venstre', // 'venstre', 'hoyre', 'midten' eller 'apning:N' (midten av åpning N)
});

// Standard bordbredder (godkjent 2026-11-08).
export const STANDARD_BREDDER = Object.freeze([73, 98, 123, 148, 173, 198, 223]);
