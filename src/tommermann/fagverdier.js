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

// Standard bordbredder (godkjent 2026-11-08).
export const STANDARD_BREDDER = Object.freeze([73, 98, 123, 148, 173, 198, 223]);
