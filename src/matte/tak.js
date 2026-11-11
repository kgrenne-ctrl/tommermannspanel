// Regnemodell for fall og tak i Matte. Ingen skjermkode her.
// Alle lengder i mm, alle vinkler i grader. Ingenting avrundes her, det gjør skjermdelen.
//
// regnFall: omregning mellom grader, prosent, forhold 1:x og mm per meter, og høydeforskjell
//           over en lengde. Alt regnes fra tangens til vinkelen:
//           tan(v) = prosent / 100 = 1 / x = mm per meter / 1000.
// regnTrekant:   rettvinklet trekant, to kjente gir de andre, med vinkel på saga (fase M1).
// regnOppforing: høyden på kiler og oppforing for hver c/c bortover et fall (fase M1).

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

// ---------- Trekanten (fase M1) ----------
// Rettvinklet trekant: liggende (vannrett), stående (loddrett), skrå (den lange siden) og vinkel
// (mellom liggende og skrå). To kjente gir de andre. Grunnlaget for stag, avstivere og kiler.

export const KJENT_TREKANT = Object.freeze([
  'liggendeStaende', 'liggendeSkra', 'staendeSkra', 'liggendeVinkel', 'staendeVinkel', 'skraVinkel',
]);

// Kapp over denne vinkelen på saga får en «greit å vite» om at saga kanskje ikke går så langt
const SAG_SIKKER_GRADER = 45;

const NAVN_TREKANT = { liggende: 'Liggende', staende: 'Stående', skra: 'Skrå' };
// Hvilke sider som er kjent for hvert valg (vinkelen kommer i tillegg der valget slutter på Vinkel)
const SIDER_TREKANT = {
  liggendeStaende: ['liggende', 'staende'],
  liggendeSkra: ['liggende', 'skra'],
  staendeSkra: ['staende', 'skra'],
  liggendeVinkel: ['liggende'],
  staendeVinkel: ['staende'],
  skraVinkel: ['skra'],
};

// inndata: { kjent, liggende, staende, skra, vinkel }. Bare de to som er kjent, brukes.
// Gir { ok: true, kjent, liggende, staende, skra, vinkel, vinkelTopp, sagMotLiggende,
// sagMotStaende, varsler } eller { ok: false, feil }.
// Saga: et stag langs skrå som skal ligge an mot liggende, kappes med vinkelen v mot emnet, og
// saga stilles da på 90 − v (0 er rett kapp). Mot stående er det omvendt.
export function regnTrekant(inndata) {
  const { kjent } = inndata;
  if (!KJENT_TREKANT.includes(kjent)) return { ok: false, feil: [`Ukjent valg: ${kjent}`] };
  const feil = [];
  for (const navn of SIDER_TREKANT[kjent]) {
    const x = inndata[navn];
    if (!erTall(x)) feil.push(`Skriv inn ${NAVN_TREKANT[navn].toLowerCase()}.`);
    else if (x <= 0) feil.push(`${NAVN_TREKANT[navn]} må være større enn 0.`);
  }
  if (kjent.endsWith('Vinkel')) {
    const v = inndata.vinkel;
    if (!erTall(v)) feil.push('Skriv inn vinkelen.');
    else if (v <= 0 || v >= 90) feil.push('Vinkelen må være mellom 0° og 90°.');
  }
  if (feil.length) return { ok: false, feil };

  let liggende; let staende; let skra;
  const { vinkel } = inndata;
  switch (kjent) {
    case 'liggendeStaende':
      ({ liggende, staende } = inndata);
      skra = Math.hypot(liggende, staende);
      break;
    case 'liggendeSkra':
      ({ liggende, skra } = inndata);
      if (skra <= liggende) return { ok: false, feil: ['Skrå må være lengre enn liggende.'] };
      staende = Math.sqrt(skra * skra - liggende * liggende);
      break;
    case 'staendeSkra':
      ({ staende, skra } = inndata);
      if (skra <= staende) return { ok: false, feil: ['Skrå må være lengre enn stående.'] };
      liggende = Math.sqrt(skra * skra - staende * staende);
      break;
    case 'liggendeVinkel':
      ({ liggende } = inndata);
      staende = liggende * Math.tan(vinkel * RAD);
      skra = liggende / Math.cos(vinkel * RAD);
      break;
    case 'staendeVinkel':
      ({ staende } = inndata);
      liggende = staende / Math.tan(vinkel * RAD);
      skra = staende / Math.sin(vinkel * RAD);
      break;
    case 'skraVinkel':
      ({ skra } = inndata);
      liggende = skra * Math.cos(vinkel * RAD);
      staende = skra * Math.sin(vinkel * RAD);
      break;
    default:
      break;
  }
  const v = kjent.endsWith('Vinkel') ? vinkel : Math.atan2(staende, liggende) / RAD;
  // Alle kapp- og gjærsager går til 45°. Over det er det ikke sikkert saga går så langt.
  const storst = Math.max(v, 90 - v);
  const varsler = storst > SAG_SIKKER_GRADER ? [{
    niva: 'vite',
    type: 'sag-vinkel',
    tekst: `Det ene kappet er over ${SAG_SIKKER_GRADER}° på saga. Går ikke saga di så langt, merk kappet på emnet `
      + 'med vinkelen på emnet og kapp etter streken.',
    kilde: '',
  }] : [];
  return {
    ok: true,
    kjent,
    liggende,
    staende,
    skra,
    vinkel: v,
    vinkelTopp: 90 - v,
    sagMotLiggende: 90 - v,
    sagMotStaende: v,
    varsler,
  };
}

// ---------- Kiler og oppforing (fase M1) ----------
// Fall og c/c gir høyden på oppforingen i hvert punkt bortover fra den lave enden.
// Høyden i hvert punkt regnes fra starten, aldri ved å legge sammen avrundede økninger.

export const KJENT_OPPFORING = Object.freeze(['grader', 'prosent', 'forhold', 'mmPerMeter']);

// Flere punkter enn dette er en skrivefeil (c/c i meter i stedet for mm, for eksempel).
const MAKS_PUNKTER = 500;

// inndata: { kjent, verdi, lengde, cc, start }
//   kjent, verdi: fallet, som i regnFall (uten 'malt')
//   lengde:       fra lav til høy ende (mm)
//   cc:           avstand mellom punktene (mm). Siste punkt er alltid enden.
//   start:        høyden i den lave enden (mm), 0 når den er tom
// Gir { ok: true, ...fallet, lengde, cc, start, punkter: [{ nr, avstand, hoyde }], hoydeEnde,
// okningPerCc, varsler } eller { ok: false, feil }.
export function regnOppforing(inndata) {
  const { kjent, verdi, lengde, cc } = inndata;
  const start = erTall(inndata.start) ? inndata.start : 0;
  if (!KJENT_OPPFORING.includes(kjent)) return { ok: false, feil: [`Ukjent valg: ${kjent}`] };
  const feil = [];
  if (!erTall(lengde) || lengde <= 0) feil.push('Lengden må være større enn 0.');
  if (!erTall(cc) || cc <= 0) feil.push('C/c må være større enn 0.');
  if (start < 0) feil.push('Høyden i lav ende kan ikke være under 0.');
  if (feil.length) return { ok: false, feil };
  if (Math.ceil(lengde / cc - 1e-9) + 1 > MAKS_PUNKTER) {
    return { ok: false, feil: [`Det blir over ${MAKS_PUNKTER} punkter. Sjekk at lengde og c/c er i mm.`] };
  }

  const fall = regnFall({ kjent, verdi });
  if (!fall.ok) return fall;

  const punkter = [];
  for (let i = 0; i * cc < lengde - 1e-9; i += 1) {
    punkter.push({ nr: i + 1, avstand: i * cc, hoyde: start + i * cc * fall.tan });
  }
  punkter.push({ nr: punkter.length + 1, avstand: lengde, hoyde: start + lengde * fall.tan });

  return {
    ...fall,
    lengde,
    hoydeforskjell: lengde * fall.tan,
    cc,
    start,
    punkter,
    hoydeEnde: start + lengde * fall.tan,
    okningPerCc: cc * fall.tan,
  };
}
