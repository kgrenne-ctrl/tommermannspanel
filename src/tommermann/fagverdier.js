// Standardverdier for tømmermannskledning (PLAN.md punkt 8). Alle mål i mm.
// Kilde: Treteknisk, G3 Gausdal og Talgø. Byggforsk 542.101 er ikke lest i fulltekst.
// Alle verdiene kan overstyres når man kaller losFelt().

export const STANDARD_INNSTILLINGER = Object.freeze({
  // Omlegg: hvor langt overliggeren går inn over underliggeren på hver side.
  oMin: 20,    // aldri mindre enn dette
  oIdeal: 25,  // det vi sikter mot
  oMax: 30,    // over dette gis varsel, men løsningen vises likevel (Kenny 2026-11-08)

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

  // Hjørner (fase 4, Kenny 2026-11-09). Hvor mye lengre feltet blir enn vegglengden i hvert
  // hjørne: pluss når kledningen går forbi hjørnet, minus ved hjørnekasse. Regnes ut av hus.js.
  forlengVenstre: 0,
  forlengHoyre: 0,
  // Hjørnebordet på veggen som slutter mot naboveggen kløyves med tykkelsen på hjørnebordet
  // på naboveggen, så hjørnet ser like bredt ut fra begge sider (Kenny 2026-11-09).
  klyvVenstre: 0,
  klyvHoyre: 0,
  // Lik avstand mellom påbordene (Kenny 2026-11-09): hvor mye avstanden kan avvike fra felles mål
  // før påbordene i feltet kløyves, og hvor mye et påbord høyst kløyves. Antakelser, kan endres.
  avvikPabord: 5,
  maksKloyvPabord: 20,
  // Bordtykkelse. 19 mm er en antakelse om vanlig kledning, kan endres per vegg.
  tykkelseUnder: 19,
  tykkelseOver: 19,
});

// Standard bordbredder (godkjent 2026-11-08).
// Hjørnetype: 'forbi' (kledningen går forbi hjørnet), 'mot' (slutter mot naboveggen, som
// går forbi) eller 'kasse' (slutter mot hjørnekasse). Én vegg alene starter og slutter rett.
export const STANDARD_HJORNE = Object.freeze({ type: 'mot', kasse: 98 });

export const STANDARD_BREDDER = Object.freeze([73, 98, 123, 148, 173, 198, 223]);
