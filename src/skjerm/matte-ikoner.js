// Symbolene i Matte-menyen, ett per utregning (nøkkel = id i matte-liste.js). Samme stil som på
// forsiden: strek i currentColor på blå boks, klassen «a» er oransje aksent og «t» er tynn strek.
// viewBox er 24 × 24. Ingen kobling til nettleseren, så de testes med node --test.

export const IKONER = Object.freeze({
  // Fall: skrå flate over vannrett, med pil ned for fallet
  fall: '<path d="M3 8.5l18 6"/><path d="M3 19.5h18" class="t"/><path class="a" d="M17 2.5v6.5m-2.5-2.5L17 9l2.5-2.5"/>',
  // Trekanten: rettvinklet trekant med vinkelbue
  trekant: '<path d="M3 20.5h18V4z"/><path class="a" d="M9.5 20.5a6.5 6.5 0 0 0-1.6-4.3"/><path class="t" d="M17.5 20.5V17H21"/>',
  // Kiler og oppforing: skrå overkant over stendere som blir høyere bortover
  oppforing: '<path d="M2.5 20h19" class="t"/><path class="a" d="M2.5 16.5l19-7"/><path d="M2.5 20v-3.5M8.8 20v-5.8M15.2 20v-8.2M21.5 20V9.5"/>',
  // Sperre: sperra skrått over veggen, med midt møne stiplet
  sperre: '<path d="M2 15.5L19.5 5.5l1.6 2.6L3.6 18z"/><path d="M7.5 15.8V21.5M11.5 13.5v8" class="t"/><path class="a" d="M20.5 2.5v19" stroke-dasharray="2 2"/>',
  // Stendere i gavl: gavlvegg med stendere opp til takfallet
  gavl: '<path class="a" d="M2.5 12.5L12 4l9.5 8.5"/><path d="M2.5 12.5v8h19v-8"/><path d="M7 20.5V8.5M12 20.5V4M17 20.5V8.5" class="t"/>',
  // Takflate: takflate over en vegg
  takflate: '<path class="a" d="M3 13l4.5-8.5h13.5L16.5 13z"/><path d="M3 13v7.5h13.5V13M16.5 20.5l4.5-8.5V4.5"/>',
  // Gjæring i hjørne: to lister i vinkel med gjæringen i hjørnet
  gjaering: '<path d="M3.5 20.5v-17h5v12h12v5z"/><path class="a" d="M3.5 20.5l5-5"/>',
  // Mangekant: åttekant med indre åttekant og gjæringer
  mangekant: '<path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8z"/><path class="t" d="M9.4 6h5.2l3.4 3.4v5.2L14.6 18H9.4L6 14.6V9.4z"/><path class="a" d="M8 2.5L9.4 6M16 2.5L14.6 6M21.5 8L18 9.4M21.5 16L18 14.6M16 21.5L14.6 18M8 21.5L9.4 18M2.5 16L6 14.6M2.5 8L6 9.4"/>',
  // Sammensatt gjæring: taklist i hjørnet mellom vegg og tak
  sammensatt: '<path d="M4 21.5v-18h17.5" /><path class="a" d="M4 13.5L13 3.5h3.5L4 17.5z"/><path class="t" d="M4 9a4.5 4.5 0 0 0 3 1.2"/>',
  // Rett vinkel og diagonal: rektangel med diagonal og rett vinkel
  diagonal: '<path d="M3 5.5h18v13H3z"/><path class="a" d="M3 18.5L21 5.5"/><path class="t" d="M3 9h3.5V5.5"/>',
  // Lik avstand: lengde med like store felt
  likAvstand: '<path d="M2 12h20"/><path d="M2 7.5v9M22 7.5v9"/><path class="a" d="M7 9.5v5M12 9.5v5M17 9.5v5"/>',
  // Spiler og rekkverk: stolper, håndlist og spiler, med åpningen markert
  spiler: '<path d="M2.5 4.5h19"/><path d="M3 4.5v17M21 4.5v17"/><path class="t" d="M7.5 6.5v15M12 6.5v15M16.5 6.5v15"/><path class="a" d="M3 14h4.5"/>',
  // Terrassebord og spaltekledning: bord side om side med spalte
  bord: '<path d="M2.5 3.5h3.6v17H2.5zM8.1 3.5h3.6v17H8.1zM13.7 3.5h3.6v17h-3.6zM19.3 3.5h2.2v17h-2.2"/><path class="a" d="M6.1 22.5h2"/>',
});

// SVG-en for ett symbol, eller tom tekst når utregningen ikke har symbol
export function ikonSvg(id) {
  const innhold = IKONER[id];
  return innhold ? `<svg viewBox="0 0 24 24" aria-hidden="true">${innhold}</svg>` : '';
}
