// Regnemodell for fall og tak i Matte. Ingen skjermkode her.
// Alle lengder i mm, alle vinkler i grader. Ingenting avrundes her, det gjør skjermdelen.
//
// regnFall: omregning mellom grader, prosent, forhold 1:x og mm per meter, og høydeforskjell
//           over en lengde. Alt regnes fra tangens til vinkelen:
//           tan(v) = prosent / 100 = 1 / x = mm per meter / 1000.

const RAD = Math.PI / 180;

// Hva som er kjent. Samme navn brukes i skjermdelen.
export const KJENT_FALL = Object.freeze(['grader', 'prosent', 'forhold', 'mmPerMeter', 'malt']);

// Grensen for når appen tror det er fall på et gulv (bad, terrasse) og ikke et tak.
// Bare for å vise «greit å vite» om fall til sluk, ikke et krav.
const GULV_UNDER_GRADER = 5;

const erTall = (x) => typeof x === 'number' && Number.isFinite(x);

// Finner tangens ut fra det som er kjent. Gir { tan } eller { feil }.
function finnTangens({ kjent, verdi, hoyde, lengde }) {
  if (kjent === 'malt') {
    if (!erTall(hoyde) || !erTall(lengde)) return { feil: 'Skriv inn både høydeforskjellen og lengden du har målt.' };
    if (lengde <= 0) return { feil: 'Lengden må være større enn 0.' };
    if (hoyde < 0) return { feil: 'Høydeforskjellen kan ikke være under 0.' };
    return { tan: hoyde / lengde };
  }
  if (!erTall(verdi)) return { feil: 'Skriv inn fallet.' };
  if (verdi < 0) return { feil: 'Fallet kan ikke være under 0.' };
  switch (kjent) {
    case 'grader':
      if (verdi >= 90) return { feil: 'Vinkelen må være under 90°.' };
      return { tan: Math.tan(verdi * RAD) };
    case 'prosent':
      return { tan: verdi / 100 };
    case 'forhold':
      if (verdi === 0) return { feil: 'Tallet etter 1: må være større enn 0. 1:50 betyr 1 mm per 50 mm.' };
      return { tan: 1 / verdi };
    case 'mmPerMeter':
      return { tan: verdi / 1000 };
    default:
      return { feil: `Ukjent valg: ${kjent}` };
  }
}

// inndata: { kjent, verdi, hoyde, lengde }
//   kjent:  'grader' | 'prosent' | 'forhold' (x i 1:x) | 'mmPerMeter' | 'malt'
//   verdi:  tallet for det som er kjent (ikke brukt for 'malt')
//   hoyde:  målt høydeforskjell (bare 'malt')
//   lengde: målt lengde ('malt'), eller lengden høydeforskjellen skal regnes over (valgfri)
// Gir { ok: true, kjent, tan, grader, prosent, forhold, mmPerMeter, lengde, hoydeforskjell, varsler }
// eller { ok: false, feil: [tekst] }. forhold er Infinity når det ikke er noe fall.
export function regnFall(inndata) {
  const { kjent } = inndata;
  const lengde = erTall(inndata.lengde) ? inndata.lengde : null;
  if (kjent !== 'malt' && lengde !== null && lengde <= 0) return { ok: false, feil: ['Lengden må være større enn 0.'] };

  const t = finnTangens(inndata);
  if (t.feil) return { ok: false, feil: [t.feil] };
  const { tan } = t;

  const grader = Math.atan(tan) / RAD;
  const varsler = [];
  if (grader > 0 && grader < GULV_UNDER_GRADER) {
    varsler.push({
      niva: 'vite',
      type: 'fall-sluk',
      tekst: 'På bad er dette preaksepterte ytelser for fall til sluk: minst 1:50 i 0,8 m rundt sluket i dusjsonen, '
        + 'eller minst 1:100 i dusjens nedslagsfelt når det er senket minst 10 mm, eller minst 1:100 over hele gulvet.',
      kilde: 'TEK17 § 13-15',
    });
  }

  return {
    ok: true,
    kjent,
    tan,
    grader,
    prosent: tan * 100,
    forhold: tan === 0 ? Infinity : 1 / tan,
    mmPerMeter: tan * 1000,
    lengde,
    hoydeforskjell: lengde === null ? null : (kjent === 'malt' ? inndata.hoyde : lengde * tan),
    varsler,
  };
}
