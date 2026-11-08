// Regnemodell for ett felt med stående tømmermannskledning (PLAN.md punkt 3).
// Ingen skjermkode her, bare regning. Alle mål i mm.
//
// Ord som brukes:
//   L   feltlengde
//   bu  bredde underligger
//   bo  bredde overligger
//   k   antall underliggere
//   g   klaring, åpningen mellom to underliggere
//   o   omlegg, hvor langt overliggeren går inn over underliggeren på hver side
//   cc  senteravstand mellom underliggerne (bu + g)
//
// Start og slutt er 'U' (underligger i kanten) eller 'O' (overligger i kanten).

import { STANDARD_INNSTILLINGER, STANDARD_BREDDER } from './fagverdier.js';

// Liten slingringsmonn for desimaltall i datamaskinen (en milliontedels mm).
const SLINGRING = 1e-6;

const KOMBINASJONER = [
  ['U', 'U'],
  ['U', 'O'],
  ['O', 'U'],
  ['O', 'O'],
];

// Alle tre ligningene kan skrives på samme form: L = c + d·g.
// Gir { c, d } for k underliggere, eller null hvis k ikke kan brukes.
// Da er g = (L − c) / d, og omvendt L = c + d·g.
function ligning(bu, bo, start, slutt, k) {
  const antallO = (start === 'O' ? 1 : 0) + (slutt === 'O' ? 1 : 0);
  if (antallO === 0) {
    // U–U: L = k·bu + (k−1)·g
    if (k < 2) return null;
    return { c: k * bu, d: k - 1 };
  }
  if (antallO === 1) {
    // U–O og O–U: L = k·bu + (k−1)·g + (bo + g)/2  =  k·bu + bo/2 + (k − 0,5)·g
    return { c: k * bu + bo / 2, d: k - 0.5 };
  }
  // O–O: L = k·bu + k·g + bo
  return { c: k * bu + bo, d: k };
}

// Sjekker at spikrene i overliggeren får plass i klaringen, så det ikke spikres gjennom to bord.
export function sjekkSpikring(bo, g, innstillinger = {}) {
  const inn = { ...STANDARD_INNSTILLINGER, ...innstillinger };
  const antallSpikre = bo >= inn.toSpikreFraBredde ? 2 : 1;
  const kreverKlaring = 2 * inn.spikerKantavstand + (antallSpikre - 1) * inn.spikeravstand;
  const ok = g > 0 && g >= kreverKlaring - SLINGRING;
  return { antallSpikre, kreverKlaring, ok };
}

// Bygger en ferdig løsning med alle posisjoner når k og g er funnet.
function byggLosning(L, bu, bo, start, slutt, k, g, inn) {
  const o = (bo - g) / 2;
  const cc = bu + g;

  // Hvor første underligger begynner. Starter feltet med overligger, ligger
  // overliggeren fra 0 og første underligger begynner ved (bo + g)/2.
  const forste = start === 'O' ? (bo + g) / 2 : 0;

  // Hver posisjon regnes rett fra starten (forste + i·cc) og avrundes for seg.
  // Da vokser ikke avrundingsfeilen bortover veggen.
  const underliggere = [];
  for (let i = 0; i < k; i++) {
    const fra = forste + i * cc;
    underliggere.push(bord(fra, fra + bu));
  }

  // Overliggeren mellom underligger i og i+1 begynner o før underligger i slutter.
  // Indeks −1 er overliggeren i startkanten, indeks k−1 er den i sluttkanten.
  const overliggere = [];
  const forsteO = start === 'O' ? -1 : 0;
  const sisteO = slutt === 'O' ? k - 1 : k - 2;
  for (let i = forsteO; i <= sisteO; i++) {
    const fra = forste + i * cc + bu - o;
    overliggere.push(bord(fra, fra + bo));
  }

  const varsler = [];
  if (o > inn.oMax + SLINGRING) {
    varsler.push({
      type: 'omlegg-over-maks',
      tekst: `Omlegget er ${en(o)} mm, mer enn anbefalt maks ${inn.oMax} mm.`,
    });
  }

  // Overligger i kanten har ingen underligger bak seg ytterst, så den trenger underlag.
  const trengerUnderlag = { start: start === 'O', slutt: slutt === 'O' };
  if (trengerUnderlag.start) {
    varsler.push({ type: 'underlag-start', tekst: 'Overligger i startkanten trenger underlag.' });
  }
  if (trengerUnderlag.slutt) {
    varsler.push({ type: 'underlag-slutt', tekst: 'Overligger i sluttkanten trenger underlag.' });
  }

  const spikring = sjekkSpikring(bo, g, inn);
  if (!spikring.ok) {
    varsler.push({
      type: 'spikring',
      tekst: `Klaringen er ${en(g)} mm. ${spikring.antallSpikre} spikre i overliggeren trenger minst ${spikring.kreverKlaring} mm, ellers spikres det gjennom to bord.`,
    });
  }

  return {
    L, bu, bo, start, slutt,
    antallUnderliggere: k,
    antallOverliggere: overliggere.length,
    klaring: g,
    omlegg: o,
    senteravstand: cc,
    synligUnderligger: bu - 2 * o,
    underliggere,
    overliggere,
    trengerUnderlag,
    spikring,
    innenforAnbefalt: o <= inn.oMax + SLINGRING,
    varsler,
  };
}

function bord(fraEksakt, tilEksakt) {
  return {
    fra: Math.round(fraEksakt),
    til: Math.round(tilEksakt),
    fraEksakt,
    tilEksakt,
  };
}

// Én desimal med komma, slik det skrives på norsk.
function en(tall) {
  return (Math.round(tall * 10) / 10).toString().replace('.', ',');
}

function kontrollerInndata(L, bu, bo, start, slutt, inn) {
  const feil = [];
  for (const [navn, verdi] of [['Feltlengde', L], ['Bredde underligger', bu], ['Bredde overligger', bo]]) {
    if (typeof verdi !== 'number' || !Number.isFinite(verdi) || verdi <= 0) {
      feil.push(`${navn} må være et tall større enn 0.`);
    }
  }
  if (start !== 'U' && start !== 'O') feil.push("Start må være 'U' eller 'O'.");
  if (slutt !== 'U' && slutt !== 'O') feil.push("Slutt må være 'U' eller 'O'.");
  if (!(inn.oMin <= inn.oIdeal && inn.oIdeal <= inn.oMax)) {
    feil.push('Omlegg må ha minimum ≤ ideelt ≤ maks.');
  }
  return feil;
}

// Finner alle gyldige løsninger, rangert med den beste først.
// Gyldig: klaring større enn 0, omlegg minst oMin, og synlig underligger ikke negativ.
// Rangering: først de med omlegg innenfor oMin–oMax, nærmest oIdeal.
// Deretter de med for stort omlegg, nærmest oMax.
//
// Feltlengden kan ha slingringsmonn (Lmin–Lmax), for eksempel når bordet går 10–20 mm inn
// på en karm. For hvert antall bord velges da den lengden som gir omlegg nærmest det ideelle.
// Slingringsmonnet brukes altså før omlegget justeres. Er Lmin = Lmax, er lengden fast.
function alleLosninger(Lmin, Lmax, Lstandard, bu, bo, start, slutt, inn) {
  const kMaks = Math.ceil(Lmax / bu) + 1;
  const losninger = [];
  for (let k = 1; k <= kMaks; k++) {
    const lign = ligning(bu, bo, start, slutt, k);
    if (lign === null) continue;
    // Lengden som gir akkurat ideelt omlegg, holdt innenfor slingringsmonnet.
    const Lideal = lign.c + lign.d * (bo - 2 * inn.oIdeal);
    const L = Math.min(Lmax, Math.max(Lmin, Lideal));
    const g = (L - lign.c) / lign.d;
    if (!(g > 0)) continue;
    const o = (bo - g) / 2;
    if (o < inn.oMin - SLINGRING) continue;
    // Synlig del av underliggeren (bu − 2·o) kan ikke være negativ. Da ville to
    // overliggere ligget oppå hverandre, eller overliggeren stukket ut av feltet.
    if (bu - 2 * o < -SLINGRING) continue;
    losninger.push(byggLosning(L, bu, bo, start, slutt, k, g, inn));
  }

  const innenfor = losninger
    .filter((l) => l.innenforAnbefalt)
    .sort((a, b) => Math.abs(a.omlegg - inn.oIdeal) - Math.abs(b.omlegg - inn.oIdeal)
      || Math.abs(a.L - Lstandard) - Math.abs(b.L - Lstandard)
      || a.antallUnderliggere - b.antallUnderliggere);
  const over = losninger
    .filter((l) => !l.innenforAnbefalt)
    .sort((a, b) => a.omlegg - b.omlegg);
  return [...innenfor, ...over];
}

// Hovedfunksjonen. Regner ut ett felt.
//
// Inn: { L, bu, bo, start, slutt } pluss eventuelle innstillinger
//      (oMin, oIdeal, oMax, spikerKantavstand, toSpikreFraBredde, spikeravstand).
// Ut:  { ok: true, valgt, alternativ, alle }
//      eller { ok: false, melding, forslag } når ingen løsning finnes
//      eller { ok: false, feil: [...] } når inndata er feil.
export function losFelt(inndata) {
  const { L, bu, bo, start, slutt, ...resten } = inndata;
  const inn = { ...STANDARD_INNSTILLINGER, ...resten };

  const feil = kontrollerInndata(L, bu, bo, start, slutt, inn);
  if (feil.length > 0) return { ok: false, feil };

  const alle = alleLosninger(L, L, L, bu, bo, start, slutt, inn);
  if (alle.length > 0) {
    return { ok: true, valgt: alle[0], alternativ: alle[1] ?? null, alle };
  }

  return {
    ok: false,
    melding: `Ingen inndeling gir omlegg på minst ${inn.oMin} mm for et felt på ${L} mm `
      + `med ${start}–${slutt}, underligger ${bu} mm og overligger ${bo} mm. `
      + 'Prøv annen start/slutt eller annen bordbredde.',
    forslag: finnForslag(L, bu, bo, start, slutt, inn),
  };
}

// Regner ut ett felt der lengden kan variere innenfor Lmin–Lmax (slingringsmonn).
// Brukes av veggmodellen, der bordet kan gå 10–20 mm inn på karmen.
// Inn: { Lmin, Lmax, Lstandard, bu, bo, start, slutt } pluss eventuelle innstillinger.
// Ut:  { ok: true, valgt, alle } der valgt.L er lengden som ble brukt, eller { ok: false, melding }.
export function losFeltFleksibel(inndata) {
  const { Lmin, Lmax, Lstandard = (Lmin + Lmax) / 2, bu, bo, start, slutt, ...resten } = inndata;
  const inn = { ...STANDARD_INNSTILLINGER, ...resten };

  const feil = kontrollerInndata(Lmax, bu, bo, start, slutt, inn);
  if (!(Lmin <= Lmax)) feil.push('Minste feltlengde kan ikke være større enn største.');
  if (feil.length > 0) return { ok: false, feil, melding: feil.join(' ') };

  const alle = alleLosninger(Lmin, Lmax, Lstandard, bu, bo, start, slutt, inn);
  if (alle.length > 0) return { ok: true, valgt: alle[0], alle };
  return {
    ok: false,
    melding: `Ingen inndeling gir omlegg på minst ${inn.oMin} mm for et felt på `
      + `${en(Lmin)}–${en(Lmax)} mm med ${start}–${slutt}.`,
  };
}

// Når feltet ikke går opp: prøv andre start/slutt-valg og andre standardbredder.
function finnForslag(L, bu, bo, start, slutt, inn) {
  const forslag = [];
  const leggTil = (endring, b_u, b_o, s, e) => {
    const beste = alleLosninger(L, L, L, b_u, b_o, s, e, inn)[0];
    if (beste) {
      forslag.push({ endring, bu: b_u, bo: b_o, start: s, slutt: e, omlegg: beste.omlegg,
        innenforAnbefalt: beste.innenforAnbefalt });
    }
  };

  for (const [s, e] of KOMBINASJONER) {
    if (s !== start || e !== slutt) leggTil('start/slutt', bu, bo, s, e);
  }
  for (const b of STANDARD_BREDDER) {
    if (b !== bo) leggTil('overligger', bu, b, start, slutt);
  }
  for (const b of STANDARD_BREDDER) {
    if (b !== bu || b !== bo) leggTil('begge bredder', b, b, start, slutt);
  }

  // Forslag innenfor anbefalt omlegg først.
  return forslag.sort((a, b) => Number(b.innenforAnbefalt) - Number(a.innenforAnbefalt));
}
