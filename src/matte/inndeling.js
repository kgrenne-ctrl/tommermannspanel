// Regnemodell for inndeling i Matte. Ingen skjermkode her.
// Alle lengder i mm. Ingenting avrundes her, det gjør skjermdelen. Løpende merker regnes hvert
// for seg fra start, aldri ved å legge sammen avrundede avstander.
//
// fordelLikt:  lik avstand mellom to faste punkter, fast c/c med rest til slutt, eller lekter
//              med både minste og største avstand.
// fordelSpiler: spiler i rekkverk med åpning under kravet. Brukes også av trapp fase T7.
// fordelBord:   terrassebord og spaltekledning, antall hele bord og nøyaktig spalte.

const erTall = (x) => typeof x === 'number' && Number.isFinite(x);

// Flere merker enn dette er en skrivefeil (c/c i meter i stedet for mm, for eksempel).
const MAKS_MERKER = 500;

// Krav til åpninger i rekkverk, lest på dibk.no 2026-11-11 (TEK17 § 12-15 femte ledd).
export const KRAV_APNING_REKKVERK = 100;
const KILDE_REKKVERK = 'TEK17 § 12-15 femte ledd';

// Tall som er så nær et helt antall at det er avrundingsstøy (4000 / 400 = 10,000000001)
const EPS = 1e-9;

// ---------- Lik avstand ----------

export const METODE_LIKT = Object.freeze(['lik', 'fast', 'lekter']);

// inndata: { metode, lengde, maks, min }
//   lik:    flest mulig like felt med c/c høyst maks
//   fast:   c/c = maks fra start, resten til slutt
//   lekter: like felt med c/c mellom min og maks
// Gir { ok: true, metode, lengde, antallFelt, cc, merker: [avstand fra start], rest, varsler }
// eller { ok: false, feil }. merker er punktene mellom endene, ikke 0 og lengden.
export function fordelLikt(inndata) {
  const { metode, lengde, maks, min } = inndata;
  if (!METODE_LIKT.includes(metode)) return { ok: false, feil: [`Ukjent valg: ${metode}`] };
  const feil = [];
  if (!erTall(lengde) || lengde <= 0) feil.push('Lengden må være større enn 0.');
  if (!erTall(maks) || maks <= 0) feil.push(metode === 'fast' ? 'C/c må være større enn 0.' : 'Største avstand må være større enn 0.');
  if (metode === 'lekter') {
    if (!erTall(min) || min <= 0) feil.push('Minste avstand må være større enn 0.');
    else if (erTall(maks) && min > maks) feil.push('Minste avstand kan ikke være større enn største.');
  }
  if (feil.length) return { ok: false, feil };
  if (Math.ceil(lengde / maks - EPS) > MAKS_MERKER) {
    return { ok: false, feil: [`Det blir over ${MAKS_MERKER} felt. Sjekk at målene er i mm.`] };
  }

  const varsler = [];
  if (metode === 'fast') {
    const merker = [];
    for (let i = 1; i * maks < lengde - EPS; i += 1) merker.push(i * maks);
    const rest = lengde - (merker.length ? merker.at(-1) : 0);
    return { ok: true, metode, lengde, antallFelt: merker.length + 1, cc: maks, merker, rest, varsler };
  }

  const antallFelt = Math.max(1, Math.ceil(lengde / maks - EPS));
  const cc = lengde / antallFelt;
  const merker = [];
  for (let i = 1; i < antallFelt; i += 1) merker.push((i * lengde) / antallFelt);
  if (metode === 'lekter' && cc < min - EPS) {
    varsler.push({
      niva: 'ma',
      type: 'lekter-gar-ikke-opp',
      tekst: 'Lik avstand går ikke opp innenfor minste og største avstand: med dette antallet felt blir avstanden '
        + 'under minste, og med ett felt færre over største. Juster ved første eller øverste lekt etter '
        + 'leggeanvisningen, eller endre lengden.',
      kilde: '',
    });
  }
  return { ok: true, metode, lengde, antallFelt, cc, merker, rest: null, varsler };
}

// ---------- Spiler og rekkverk ----------

// inndata: { lysapning, bredde, maks }
//   lysapning: mellom stolpene (mm)
//   bredde:    spilebredde (mm)
//   maks:      største åpning (mm), standard 100 etter kravet, kan settes lavere for margin
// Gir { ok: true, lysapning, bredde, maks, antall, apning, apningEnFaerre, forkant: [mm fra
// venstre stolpe], varsler } eller { ok: false, feil }.
// antall = (lysåpning − maks) / (bredde + maks), rundet opp. Åpning = (lysåpning − antall × bredde) / (antall + 1).
export function fordelSpiler(inndata) {
  const { lysapning, bredde, maks } = inndata;
  const feil = [];
  if (!erTall(lysapning) || lysapning <= 0) feil.push('Lysåpningen må være større enn 0.');
  if (!erTall(bredde) || bredde <= 0) feil.push('Spilebredden må være større enn 0.');
  if (!erTall(maks) || maks <= 0) feil.push('Største åpning må være større enn 0.');
  if (feil.length) return { ok: false, feil };
  if ((lysapning - maks) / (bredde + maks) > MAKS_MERKER) {
    return { ok: false, feil: [`Det blir over ${MAKS_MERKER} spiler. Sjekk at målene er i mm.`] };
  }

  const antall = Math.max(0, Math.ceil((lysapning - maks) / (bredde + maks) - EPS));
  const apning = (lysapning - antall * bredde) / (antall + 1);
  const apningEnFaerre = antall > 0 ? (lysapning - (antall - 1) * bredde) / antall : null;
  const forkant = [];
  for (let i = 1; i <= antall; i += 1) forkant.push(i * apning + (i - 1) * bredde);

  const varsler = [];
  if (maks > KRAV_APNING_REKKVERK) {
    varsler.push({
      niva: 'ma',
      type: 'rekkverk-apning',
      tekst: `Største åpning er satt til over ${KRAV_APNING_REKKVERK} mm. Åpninger i rekkverk skal være høyst `
        + `${KRAV_APNING_REKKVERK} mm opp til minst 0,75\u00a0m høyde.`,
      kilde: KILDE_REKKVERK,
    });
  } else {
    varsler.push({
      niva: 'vite',
      type: 'rekkverk-krav',
      tekst: `Åpninger i rekkverk skal være høyst ${KRAV_APNING_REKKVERK} mm opp til minst 0,75\u00a0m høyde. `
        + 'Det gjelder også mellom rekkverket og gulv eller trinn.',
      kilde: KILDE_REKKVERK,
    });
  }
  return { ok: true, lysapning, bredde, maks, antall, apning, apningEnFaerre, forkant, varsler };
}

// ---------- Terrassebord og spaltekledning ----------

// inndata: { bredde, bordbredde, spalte }
//   bredde:     hele flaten, med bord helt ut i begge kanter (mm)
//   bordbredde: dekkbredden på ett bord (mm)
//   spalte:     ønsket spalte (mm)
// Gir { ok: true, bredde, bordbredde, onsket, antall, spalte, alternativer: [{ antall, spalte }],
// forkant: [mm fra kanten], varsler } eller { ok: false, feil }.
// Antall er det som gir spalten nærmest ønsket: (bredde + spalte) / (bordbredde + spalte), rundet.
export function fordelBord(inndata) {
  const { bredde, bordbredde } = inndata;
  const onsket = inndata.spalte;
  const feil = [];
  if (!erTall(bredde) || bredde <= 0) feil.push('Bredden må være større enn 0.');
  if (!erTall(bordbredde) || bordbredde <= 0) feil.push('Bordbredden må være større enn 0.');
  if (!erTall(onsket) || onsket < 0) feil.push('Spalten kan ikke være under 0.');
  if (feil.length) return { ok: false, feil };
  if (bordbredde > bredde) return { ok: false, feil: ['Bordet er bredere enn flaten.'] };
  if (bredde / bordbredde > MAKS_MERKER) {
    return { ok: false, feil: [`Det blir over ${MAKS_MERKER} bord. Sjekk at målene er i mm.`] };
  }

  // Største antall som får plass uten at bordene overlapper
  const flest = Math.floor(bredde / bordbredde + EPS);
  if (flest < 2) return { ok: false, feil: ['Det får bare plass ett bord, så det blir ingen spalte å regne.'] };
  const spalteFor = (n) => (bredde - n * bordbredde) / (n - 1);
  const antall = Math.max(2, Math.min(flest, Math.round((bredde + onsket) / (bordbredde + onsket))));
  const alternativer = [antall - 1, antall + 1]
    .filter((n) => n >= 2 && n <= flest)
    .map((n) => ({ antall: n, spalte: spalteFor(n) }));
  const spalte = spalteFor(antall);
  const forkant = [];
  for (let i = 0; i < antall; i += 1) forkant.push(i * (bordbredde + spalte));

  return { ok: true, bredde, bordbredde, onsket, antall, spalte, alternativer, forkant, varsler: [] };
}
