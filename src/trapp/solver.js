// Regnemodell for ett rett trappeløp (PLAN-trapp.md punkt 4).
// Ingen skjermkode her, bare regning. Alle mål i mm.
//
// Ord som brukes:
//   H   høyde fra ferdig underlag nede til ferdig dekke eller gulv oppe
//   n   antall opptrinn
//   h   opptrinn, høyden på ett trinn (H / n)
//   b   inntrinn, hvor langt man går fram for hvert trinn (trinndybde minus nese)
//   m   antall inntrinn: n − 1 når dekket oppe er øverste trinn, n når trappa har eget trinn øverst
//
// Tre måter å gi lengden på (lengdevalg):
//   'trinn'   inntrinnet er gitt, enten direkte eller av bordene i trinnet. Lengden følger.
//   'lengde'  plassen er gitt. b = lengde / m.
//   'fri'     bare høyden er kjent. b = 620 − 2·h, og opptrinnet nærmest ønsket velges.

import { STANDARD_TRAPP, TRAPPETYPER, UTEAREAL } from './fagverdier.js';

// Liten slingringsmonn for desimaltall i datamaskinen (en milliontedels mm).
const SLINGRING = 1e-6;

const LENGDEVALG = ['trinn', 'lengde', 'fri'];
const OVRE_TRINN = ['dekke', 'eget'];

const en = (tall) => String(Math.round(tall * 10) / 10).replace('.', ',');

// Trinn av bord: dybden er bordene og spaltene mellom dem. Inntrinnet er dybden minus nesa.
export function trinnFraBord({ antall, bredde, spalte = 0 }, nese) {
  const dybde = antall * bredde + (antall - 1) * spalte;
  return { dybde, inntrinn: dybde - nese };
}

function kontrollerInndata(d) {
  const feil = [];
  const positiv = (verdi) => Number.isFinite(verdi) && verdi > 0;
  if (!positiv(d.hoyde)) feil.push('Høyden må være et tall større enn 0.');
  if (!LENGDEVALG.includes(d.lengdevalg)) feil.push(`Lengdevalg må være ${LENGDEVALG.join(', ')}.`);
  if (!OVRE_TRINN.includes(d.ovreTrinn)) feil.push("Øverste trinn må være 'dekke' eller 'eget'.");
  if (!TRAPPETYPER[d.type]) feil.push(`Ukjent type trapp: ${d.type}.`);
  if (!(Number.isFinite(d.nese) && d.nese >= 0)) feil.push('Nesa må være 0 eller mer.');
  if (d.bredde !== null && !positiv(d.bredde)) feil.push('Bredden må være et tall større enn 0.');
  if (!(Number.isFinite(d.utstikk) && d.utstikk >= 0)) feil.push('Utstikket må være 0 eller mer.');
  if (d.lengdevalg === 'trinn') {
    if (d.trinnbord) {
      const { antall, bredde, spalte = 0 } = d.trinnbord;
      if (!(Number.isInteger(antall) && antall >= 1)) feil.push('Antall bord i trinnet må være et helt tall, minst 1.');
      if (!positiv(bredde)) feil.push('Bordbredden må være et tall større enn 0.');
      if (!(Number.isFinite(spalte) && spalte >= 0)) feil.push('Spalten må være 0 eller mer.');
    } else if (!positiv(d.inntrinn)) {
      feil.push('Inntrinnet må være et tall større enn 0, eller oppgi bordene i trinnet.');
    }
  }
  if (d.lengdevalg === 'lengde' && !positiv(d.lengde)) feil.push('Lengden må være et tall større enn 0.');
  return feil;
}

// Varsler for én løsning. niva: 'ma' (må fikses før du begynner), 'bor' (bør sjekkes),
// 'vite' (greit å vite). Samme tre grupper som i kledningsdelen.
function varslerFor(l, d, inn) {
  const varsler = [];
  const type = TRAPPETYPER[d.type];

  if (d.hoyde > inn.reposOver + SLINGRING) {
    varsler.push({ niva: 'ma', type: 'repos', kilde: 'TEK17 § 12-14',
      tekst: `Høyden er ${en(d.hoyde)} mm. Over ${en(inn.reposOver)} mm må trappa ha repos.` });
  }
  // Kravet gjelder bredden man går på: trinnene, altså bredden over vangene pluss utstikket
  const trinnBredde = d.bredde === null ? null : d.bredde + 2 * d.utstikk;
  if (trinnBredde !== null && trinnBredde < type.breddeMin - SLINGRING) {
    varsler.push({ niva: 'ma', type: 'bredde', kilde: 'TEK17 § 12-14',
      tekst: `Trappa er ${en(trinnBredde)} mm bred${d.utstikk > 0 ? ' målt over trinnene' : ''}. `
        + `${type.navn} med rett løp skal være minst ${en(type.breddeMin)} mm.` });
  }
  if (!l.innenforFormel) {
    varsler.push({ niva: 'bor', type: 'formel', kilde: 'TEK17 § 12-14, veiledning',
      tekst: `Trappeformelen gir ${en(l.formel)} mm (2 × ${en(l.opptrinn)} + ${en(l.inntrinn)}). `
        + `Anbefalt er ${inn.formelMin}–${inn.formelMax} mm. Trappa er lov, men `
        + `${l.formel > inn.formelMax ? 'stegene blir lange' : 'stegene blir korte'} og den er tyngre å gå i.` });
  }
  if (d.type === 'utvendig' && (l.inntrinn < UTEAREAL.inntrinnMin - SLINGRING || l.vinkel >= UTEAREAL.vinkelUnder)) {
    varsler.push({ niva: 'vite', type: 'uteareal', kilde: 'TEK17 § 8-9, veiledning',
      tekst: `Står trappa fritt i hagen og er ikke bygd sammen med huset, anbefales inntrinn minst `
        + `${UTEAREAL.inntrinnMin} mm og stigning under ${UTEAREAL.vinkelUnder} grader. `
        + `Denne har inntrinn ${en(l.inntrinn)} mm og ${en(l.vinkel)} grader.` });
  }
  return varsler;
}

function byggLosning(n, b, d, inn) {
  const h = d.hoyde / n;
  const m = d.ovreTrinn === 'dekke' ? n - 1 : n;
  const formel = 2 * h + b;
  const l = {
    antallOpptrinn: n,
    antallInntrinn: m,
    opptrinn: h,
    inntrinn: b,
    formel,
    innenforFormel: formel >= inn.formelMin - SLINGRING && formel <= inn.formelMax + SLINGRING,
    vinkel: Math.atan2(h, b) * 180 / Math.PI,
    lopslengde: m * b,
    // Løpende mål, hvert avrundet for seg til nærmeste mm. Aldri avrundet trinn lagt sammen.
    hoyder: Array.from({ length: n }, (_, i) => Math.round((i + 1) * d.hoyde / n)),
    posisjoner: Array.from({ length: m }, (_, i) => Math.round((i + 1) * b)),
  };
  l.varsler = varslerFor(l, d, inn);
  return l;
}

// Alle gyldige løsninger, rangert med den beste først.
// Gyldig: inntrinn minst kravet for typen trapp (forskriftskrav).
// Rangering: først de med trappeformel innenfor 600–640, nærmest 620, så de utenfor, nærmest 620.
// Er lengden fri, gir alle 620, og opptrinnet nærmest ønsket velges.
function alleLosninger(d, inn) {
  const type = TRAPPETYPER[d.type];
  const nMin = Math.max(d.ovreTrinn === 'dekke' ? 2 : 1, Math.ceil(d.hoyde / inn.sokOpptrinnMax - SLINGRING));
  const nMaks = Math.max(nMin, Math.floor(d.hoyde / inn.sokOpptrinnMin + SLINGRING));
  const losninger = [];
  for (let n = nMin; n <= nMaks; n++) {
    const h = d.hoyde / n;
    const m = d.ovreTrinn === 'dekke' ? n - 1 : n;
    let b;
    if (d.lengdevalg === 'trinn') b = d.inntrinn;
    else if (d.lengdevalg === 'lengde') b = d.lengde / m;
    else b = inn.formelIdeal - 2 * h;
    if (b < type.inntrinnMin - SLINGRING) continue;
    losninger.push(byggLosning(n, b, d, inn));
  }
  const avstand = (l) => Math.abs(l.formel - inn.formelIdeal);
  const opptrinnAvstand = (l) => Math.abs(l.opptrinn - inn.onsketOpptrinn);
  return losninger.sort((a, b) => Number(b.innenforFormel) - Number(a.innenforFormel)
    || avstand(a) - avstand(b)
    || opptrinnAvstand(a) - opptrinnAvstand(b)
    || a.antallOpptrinn - b.antallOpptrinn);
}

// Når ingen løsning gir lovlig inntrinn: si hva som må endres.
function finnForslag(d, inn) {
  const type = TRAPPETYPER[d.type];
  const forslag = [];
  if (d.lengdevalg === 'trinn') {
    const minsteDybde = type.inntrinnMin + d.nese;
    forslag.push({ endring: 'trinn',
      tekst: `Trinnet må være minst ${en(minsteDybde)} mm dypt med ${en(d.nese)} mm nese. `
        + 'Bruk flere eller bredere bord, eller mindre nese.' });
    if (d.trinnbord) {
      const ett = { ...d.trinnbord, antall: d.trinnbord.antall + 1 };
      const nytt = trinnFraBord(ett, d.nese);
      forslag.push({ endring: 'antall-bord', trinnbord: ett,
        tekst: `Med ${ett.antall} bord blir trinnet ${en(nytt.dybde)} mm dypt og inntrinnet ${en(nytt.inntrinn)} mm.` });
    }
  }
  if (d.lengdevalg === 'lengde') {
    const fri = alleLosninger({ ...d, lengdevalg: 'fri' }, inn)[0];
    if (fri) {
      forslag.push({ endring: 'lengde', lengde: Math.ceil(fri.lopslengde),
        tekst: `Trappa trenger om lag ${en(Math.ceil(fri.lopslengde))} mm lengde for ${fri.antallOpptrinn} opptrinn `
          + `à ${en(fri.opptrinn)} mm og inntrinn ${en(fri.inntrinn)} mm.` });
    }
  }
  return forslag;
}

// Trinn for trinn, til tabellen og tegningen. Høyde er overkant trinn over ferdig underlag.
// Forkant er vannrett fra forkant av nederste trinn (0). Siste rad er kanten av dekket.
// Begge målene er løpende og avrundet hver for seg til nærmeste mm.
export function lagTrinnliste(l) {
  const rader = [];
  for (let k = 1; k <= l.antallInntrinn; k++) {
    rader.push({ nr: k, hoyde: l.hoyder[k - 1], forkant: k === 1 ? 0 : l.posisjoner[k - 2] });
  }
  rader.push({ nr: null, hoyde: l.hoyder.at(-1), forkant: l.posisjoner.at(-1) ?? 0 });
  return rader;
}

// Hovedfunksjonen. Regner ut ett rett trappeløp.
//
// Inn: { hoyde, lengdevalg, inntrinn, trinnbord: { antall, bredde, spalte }, lengde, nese,
//        ovreTrinn, type, bredde, utstikk } pluss eventuelle innstillinger (se STANDARD_TRAPP).
//      bredde er over ytterkant av vangene. Trinnene er bredde + 2 × utstikk.
// Ut:  { ok: true, valgt, alle, trinn } der trinn er { dybde, inntrinn } når bordene er oppgitt
//      eller { ok: false, melding, forslag } når ingen løsning gir lovlig inntrinn
//      eller { ok: false, feil: [...] } når inndata er feil.
export function losTrapp(inndata) {
  const { hoyde, lengdevalg = 'trinn', inntrinn = null, trinnbord = null, lengde = null,
    nese = STANDARD_TRAPP.nese, ovreTrinn = 'dekke', type = 'utvendig', bredde = null,
    utstikk = STANDARD_TRAPP.utstikk, ...resten } = inndata;
  const inn = { ...STANDARD_TRAPP, ...resten };
  const d = { hoyde, lengdevalg, inntrinn, trinnbord, lengde, nese, ovreTrinn, type, bredde, utstikk };

  const feil = kontrollerInndata(d);
  if (feil.length > 0) return { ok: false, feil };

  let trinn = null;
  if (lengdevalg === 'trinn' && trinnbord) {
    trinn = trinnFraBord(trinnbord, nese);
    d.inntrinn = trinn.inntrinn;
  }

  const alle = alleLosninger(d, inn);
  if (alle.length > 0) return { ok: true, valgt: alle[0], alle, trinn };

  const krav = TRAPPETYPER[type].inntrinnMin;
  const melding = {
    trinn: `Inntrinnet blir ${en(d.inntrinn)} mm. ${TRAPPETYPER[type].navn} skal ha inntrinn på minst ${krav} mm (TEK17 § 12-14).`,
    lengde: `Trappa går ikke opp med inntrinn på minst ${krav} mm (TEK17 § 12-14) på ${en(lengde)} mm lengde.`,
    fri: `Fant ingen inndeling med inntrinn på minst ${krav} mm (TEK17 § 12-14). Sjekk innstillingene.`,
  }[lengdevalg];
  return { ok: false, melding, forslag: finnForslag(d, inn), trinn };
}
