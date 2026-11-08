// Regnemodell for en hel vegg med vinduer, dører og porter (PLAN.md punkt 4).
// Ingen skjermkode her, bare regning. Alle mål i mm, målt fra venstre hjørne og fra bakken.
//
// Slik er veggen bygd opp (avklart med Kenny 2026-11-08):
// - Ingen belistning. Bordet ved siden av en åpning går 10–20 mm inn på karmen (innlegget)
//   og dekker fugen. Det bordet står i full høyde forbi åpningen.
// - Feltene over og under en åpning ligger mellom de to sidebordene og fortsetter rytmen.
//
// - Innlegget er det samme på begge sider av en åpning (Kenny 2026-11-08).
//
// Veggen blir da en kjede av ledd fra venstre til høyre:
//
//   ledd 0      ledd 1         ledd 2      ledd 3         ledd 4
//   [felt] | [over/under 1] | [felt] | [over/under 2] | [felt]
//          |<-- innlegg 1 -->|        |<-- innlegg 2 -->|
//
// Innlegget i åpning 1 påvirker tre ledd: feltet til venstre, feltet over og under, og
// feltet til høyre. Derfor henger feltene sammen.
//
// For hver åpning prøves alle innlegg fra minst til størst (i hele mm). Det som gir best
// omlegg i leddene som avgjøres der, velges. Slik brukes innlegget først, og omlegget
// justeres bare når innlegget ikke strekker til. Startvalget bestemmer rekkefølgen
// åpningene velges i, og dermed hvilket felt som får restjusteringen:
// - venstre:   fra venstre mot høyre, resten havner i feltet ved høyre hjørne
// - hoyre:     fra høyre mot venstre, resten havner ved venstre hjørne
// - midten:    det som ligger midt på veggen velges først, så utover mot hjørnene
// - apning:N:  åpning N velges først, så utover mot hjørnene

import { losFeltFleksibel } from './solver.js';
import { STANDARD_INNSTILLINGER, STANDARD_VEGG } from './fagverdier.js';

const SLINGRING = 1e-6;
const MINSTE_APNING = 300; // mm. Mindre enn dette er nesten alltid et tastefeil.
const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };

export function losVegg(inndata) {
  const inn = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG, ...inndata };
  const { lengde: W, hoyde: H, bu, bo } = inn;

  const apninger = (inn.apninger ?? [])
    .map((a, i) => ({ ...a, nr: i }))
    .sort((a, b) => a.x - b.x);
  navngi(apninger);

  const feil = kontroller(inn, apninger);
  if (feil.length > 0) return { ok: false, feil };

  const n = apninger.length;
  const antallLedd = 2 * n + 1;
  // Innleggene, e[2j] er venstre og e[2j+1] høyre side av åpning j. De er alltid like.
  const e = new Array(2 * n).fill(null);
  velgInnlegg(inn.startvalg, apninger, inn, e);
  const ledd = [];
  for (let m = 0; m < antallLedd; m++) ledd.push(regnLedd(m, e, apninger, inn));

  // Bygg felt med veggkoordinater
  const felt = [];
  for (let m = 0; m < antallLedd; m++) {
    felt.push(...lagFelt(m, ledd[m], e, apninger, inn));
  }

  const varsler = [];
  const klosser = [];
  for (const a of apninger) {
    // Åpenbart feile mål (for eksempel 1 mm høy dør) gir rare klosser og felt. Si fra.
    for (const [mal, verdi] of [['Høyden', a.hoyde], ['Bredden', a.bredde]]) {
      if (verdi < MINSTE_APNING) {
        varsler.push({ felt: a.navn, alvorlig: true,
          tekst: `${mal} er bare ${verdi} mm. Sjekk målene.` });
      }
    }
    if (a.type !== 'vindu' && a.bunn > SLINGRING) {
      varsler.push({ felt: a.navn, alvorlig: true,
        tekst: `Står ${a.bunn} mm over bakken. En dør eller port står vanligvis på bakken. Sjekk målene.` });
    }
  }
  if (inn.hjorneVenstre === 'O') {
    varsler.push({ felt: 'Venstre hjørne', tekst: 'Påbord i hjørnet trenger underlag.' });
  }
  if (inn.hjorneHoyre === 'O') {
    varsler.push({ felt: 'Høyre hjørne', tekst: 'Påbord i hjørnet trenger underlag.' });
  }
  if (inn.karmBord === 'O') {
    for (const a of apninger) {
      klosser.push({ apning: a.navn, antall: 2, lengde: a.hoyde,
        tekst: `Kloss bak påbordet på hver side av ${a.navn.toLowerCase()}` });
    }
  }
  for (const f of felt) {
    if (!f.ok) {
      varsler.push({ felt: f.navn, tekst: f.melding, alvorlig: true });
      continue;
    }
    for (const v of f.losning.varsler) {
      if (v.type.startsWith('underlag')) continue; // håndteres for hele veggen over
      varsler.push({ felt: f.navn, tekst: v.tekst, type: v.type });
    }
  }

  const senteravstand = bu + bo - 2 * inn.oIdeal;
  for (const f of felt) {
    if (f.ok) f.avvikRytme = f.losning.senteravstand - senteravstand;
  }

  return {
    ok: felt.every((f) => f.ok),
    lengde: W,
    hoyde: H,
    bu, bo,
    karmBord: inn.karmBord,
    hjorneVenstre: inn.hjorneVenstre,
    hjorneHoyre: inn.hjorneHoyre,
    apninger: apninger.map((a, j) => ({
      ...a,
      innlegg: { venstre: e[2 * j], hoyre: e[2 * j + 1] },
    })),
    felt,
    klosser,
    varsler,
    rytme: { senteravstand, omlegg: inn.oIdeal },
  };
}

// ---------- Kjeden ----------

const STEG = 1; // innlegget prøves i hele mm

// Velger innlegget for hver åpning, i den rekkefølgen startvalget sier.
function velgInnlegg(startvalg, apninger, inn, e) {
  const n = apninger.length;
  if (n === 0) return;
  const kandidater = [];
  for (let v = inn.innleggMin; v <= inn.innleggMax + SLINGRING; v += STEG) kandidater.push(v);
  if (kandidater.at(-1) < inn.innleggMax - SLINGRING) kandidater.push(inn.innleggMax);
  const sett = (j, v) => { e[2 * j] = v; e[2 * j + 1] = v; };

  // Prøv alle innlegg for åpningene i js (én eller to), og behold det som gir lavest
  // kostnad for leddene i lista. Leddene skal bare avhenge av innlegg som er bestemt.
  const velg = (js, ledd) => {
    let beste = null;
    const prov = (verdier) => {
      verdier.forEach((v, i) => sett(js[i], v));
      const kost = ledd.reduce((sum, m) => leggSammen(sum, kostnad(regnLedd(m, e, apninger, inn), inn, m, apninger)), null)
        ?? nullKost();
      kost[5] = verdier.reduce((sum, v) => sum + Math.abs(v - inn.innleggStandard), 0);
      if (!beste || sammenlignKost(kost, beste.kost) < 0) beste = { kost, verdier: [...verdier] };
    };
    if (js.length === 1) for (const v of kandidater) prov([v]);
    else for (const v1 of kandidater) for (const v2 of kandidater) prov([v1, v2]);
    beste.verdier.forEach((v, i) => sett(js[i], v));
  };
  const over = (j) => 2 * j + 1;       // leddet over og under åpning j
  const side = (j) => 2 * j;           // feltet til venstre for åpning j (j = n: ved høyre hjørne)
  const mot = { hoyre: (j) => velg([j], [side(j), over(j)]), venstre: (j) => velg([j], [side(j + 1), over(j)]) };

  if (startvalg === 'hoyre') {
    for (let j = n - 1; j >= 0; j--) mot.venstre(j);
    return;
  }
  if (startvalg === 'midten' || String(startvalg).startsWith('apning:')) {
    const m = startvalg === 'midten'
      ? leddVed(inn.lengde / 2, apninger)
      : 2 * Number(String(startvalg).split(':')[1]) + 1;
    let venstreFra; let hoyreFra;
    if (m % 2 === 1) {
      // Midt i en åpning: den velges først, ut fra feltet over og under
      const k = (m - 1) / 2;
      velg([k], [over(k)]);
      venstreFra = k - 1; hoyreFra = k + 1;
    } else {
      // Midt i et felt mellom to åpninger (eller ved et hjørne): begge sider velges sammen
      const j = m / 2;
      const js = [j - 1, j].filter((x) => x >= 0 && x < n);
      velg(js, [side(j), ...js.map(over)]);
      venstreFra = j - 2; hoyreFra = j + 1;
    }
    for (let j = venstreFra; j >= 0; j--) mot.venstre(j);
    for (let j = hoyreFra; j < n; j++) mot.hoyre(j);
    return;
  }
  // venstre (standard)
  for (let j = 0; j < n; j++) mot.hoyre(j);
}

// Kostnad for ett ledd, som tall som sammenlignes ett for ett (lavere er bedre):
// [går ikke opp, spikervarsel, over maks, mm over maks, mm fra ideelt, innlegg fra standard].
// Leddet over og under en åpning teller dobbelt når det gir to felt.
function kostnad(svar, inn, m, apninger) {
  if (svar.tom) return nullKost();
  let vekt = 1;
  if (m % 2 === 1) {
    const a = apninger[(m - 1) / 2];
    vekt = (a.bunn > SLINGRING ? 1 : 0) + (a.bunn + a.hoyde < inn.hoyde - SLINGRING ? 1 : 0);
  }
  if (!svar.ok) return [vekt, 0, 0, 0, 0, 0];
  const l = svar.valgt;
  return [0, l.spikring.ok ? 0 : vekt, l.innenforAnbefalt ? 0 : vekt,
    vekt * Math.max(0, l.omlegg - inn.oMax), vekt * Math.abs(l.omlegg - inn.oIdeal), 0];
}

const nullKost = () => [0, 0, 0, 0, 0, 0];
const leggSammen = (a, b) => (a === null ? [...b] : a.map((x, i) => x + b[i]));
function sammenlignKost(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > SLINGRING) return a[i] - b[i];
  }
  return 0;
}

// Hvilket ledd ligger ved punktet x?
function leddVed(x, apninger) {
  for (let j = 0; j < apninger.length; j++) {
    const a = apninger[j];
    if (x < a.x) return 2 * j;
    if (x <= a.x + a.bredde) return 2 * j + 1;
  }
  return 2 * apninger.length;
}

// Geometrien til ledd m: L = grunn + koeff·(innlegg på venstre side) + koeff·(innlegg på høyre side).
function geometri(m, apninger, inn) {
  const n = apninger.length;
  if (m % 2 === 0) {
    // Felt i full høyde mellom hjørne/åpning og åpning/hjørne. Bordene går INN på karmen,
    // så innlegget gjør feltet lengre.
    const j = m / 2;
    const fra = j === 0 ? 0 : apninger[j - 1].x + apninger[j - 1].bredde;
    const til = j === n ? inn.lengde : apninger[j].x;
    return {
      grunn: til - fra,
      koeff: 1,
      start: j === 0 ? inn.hjorneVenstre : inn.karmBord,
      slutt: j === n ? inn.hjorneHoyre : inn.karmBord,
    };
  }
  // Over og under åpning j: fra ytterkant av sidebordet til venstre til ytterkant av sidebordet
  // til høyre. Sidebordene er med som start og slutt, så rytmen fortsetter. Jo lenger
  // sidebordene går inn på karmen, jo kortere blir feltet.
  const a = apninger[(m - 1) / 2];
  const b = inn.karmBord === 'U' ? inn.bu : inn.bo;
  return { grunn: a.bredde + 2 * b, koeff: -1, start: inn.karmBord, slutt: inn.karmBord };
}

// Regner ut ledd m når innleggene er bestemt. Lengden er da fast.
function regnLedd(m, e, apninger, inn) {
  if (m % 2 === 1 && !harOverEllerUnder(apninger[(m - 1) / 2], inn.hoyde)) return { tom: true };
  const geo = geometri(m, apninger, inn);
  const n = apninger.length;
  let L = geo.grunn;
  if (m > 0) L += geo.koeff * e[m - 1];
  if (m < 2 * n) L += geo.koeff * e[m];
  return losFeltFleksibel({ ...inn, Lmin: L, Lmax: L, Lstandard: L, start: geo.start, slutt: geo.slutt });
}

function harOverEllerUnder(a, H) {
  return a.bunn > SLINGRING || a.bunn + a.hoyde < H - SLINGRING;
}

// ---------- Fra ledd til felt med veggkoordinater ----------

function lagFelt(m, svar, e, apninger, inn) {
  const n = apninger.length;
  if (svar.tom) return [];

  if (m % 2 === 0) {
    const j = m / 2;
    const venstre = j === 0 ? null : apninger[j - 1];
    const hoyre = j === n ? null : apninger[j];
    const x0 = venstre ? venstre.x + venstre.bredde - e[m - 1] : 0;
    const navn = `${venstre ? venstre.navn : 'Venstre hjørne'} – ${hoyre ? hoyre.navn : 'Høyre hjørne'}`;
    return [byggFelt({
      type: 'side', navn, x0, x1: hoyre ? hoyre.x + e[m] : inn.lengde, y0: 0, y1: inn.hoyde, svar,
      innlegg: { venstre: venstre ? e[m - 1] : null, hoyre: hoyre ? e[m] : null },
      fjernDelte: false, karmBord: inn.karmBord,
    })];
  }

  const j = (m - 1) / 2;
  const a = apninger[j];
  const b = inn.karmBord === 'U' ? inn.bu : inn.bo;
  const x0 = a.x + e[m - 1] - b;
  const felles = { x0, x1: a.x + a.bredde - e[m] + b, svar, innlegg: { venstre: e[m - 1], hoyre: e[m] }, fjernDelte: true,
    karmBord: inn.karmBord, apning: a.navn };
  const ut = [];
  if (a.bunn + a.hoyde < inn.hoyde - SLINGRING) {
    ut.push(byggFelt({ ...felles, type: 'over', navn: `Over ${a.navn.toLowerCase()}`,
      y0: a.bunn + a.hoyde, y1: inn.hoyde }));
  }
  if (a.bunn > SLINGRING) {
    ut.push(byggFelt({ ...felles, type: 'under', navn: `Under ${a.navn.toLowerCase()}`,
      y0: 0, y1: a.bunn }));
  }
  return ut;
}

function byggFelt({ type, navn, x0, x1, y0, y1, svar, innlegg, fjernDelte, karmBord, apning }) {
  if (!svar.ok) {
    return { ok: false, type, navn, x0, x1, y0, y1, innlegg, apning,
      melding: svar.melding ?? 'Feltet går ikke opp.' };
  }
  const l = svar.valgt;
  const tilVegg = (b, bordtype) => ({
    type: bordtype,
    fraEksakt: x0 + b.fraEksakt,
    tilEksakt: x0 + b.tilEksakt,
    fra: Math.round(x0 + b.fraEksakt),
    til: Math.round(x0 + b.tilEksakt),
  });
  let underliggere = l.underliggere.map((b) => tilVegg(b, 'U'));
  let overliggere = l.overliggere.map((b) => tilVegg(b, 'O'));

  // Over og under en åpning er første og siste bord sidebordene, som allerede står i
  // feltene ved siden av. De tas ut her så de ikke telles to ganger.
  if (fjernDelte) {
    if (karmBord === 'U') underliggere = underliggere.slice(1, -1);
    else overliggere = overliggere.slice(1, -1);
  }

  return {
    ok: true, type, navn, apning, x0, x1: x0 + l.L, y0, y1, innlegg,
    losning: l,
    underliggere,
    overliggere,
  };
}

// ---------- Navn og kontroll ----------

function navngi(apninger) {
  const antall = {};
  for (const a of apninger) antall[a.type] = (antall[a.type] ?? 0) + 1;
  const teller = {};
  for (const a of apninger) {
    teller[a.type] = (teller[a.type] ?? 0) + 1;
    const grunn = TYPENAVN[a.type] ?? 'Åpning';
    a.navn = antall[a.type] > 1 ? `${grunn} ${teller[a.type]}` : grunn;
  }
}

function kontroller(inn, apninger) {
  const feil = [];
  const tall = (v) => typeof v === 'number' && Number.isFinite(v);
  for (const [navn, v] of [['Vegglengde', inn.lengde], ['Vegghøyde', inn.hoyde],
    ['Bredde underligger', inn.bu], ['Bredde overligger', inn.bo]]) {
    if (!tall(v) || v <= 0) feil.push(`${navn} må være et tall større enn 0.`);
  }
  for (const [navn, v] of [['Karmbord', inn.karmBord], ['Venstre hjørne', inn.hjorneVenstre],
    ['Høyre hjørne', inn.hjorneHoyre]]) {
    if (v !== 'U' && v !== 'O') feil.push(`${navn} må være 'U' eller 'O'.`);
  }
  if (!(inn.innleggMin <= inn.innleggStandard && inn.innleggStandard <= inn.innleggMax)) {
    feil.push('Innlegg må ha minimum ≤ standard ≤ maks.');
  }
  const gyldigeStart = ['venstre', 'hoyre', 'midten'];
  const sv = String(inn.startvalg);
  if (!gyldigeStart.includes(sv)) {
    const nr = Number(sv.split(':')[1]);
    if (!sv.startsWith('apning:') || !Number.isInteger(nr) || nr < 0 || nr >= apninger.length) {
      feil.push('Ukjent startvalg.');
    }
  }
  if (feil.length > 0) return feil;

  let forrigeSlutt = 0;
  let forrigeNavn = 'venstre hjørne';
  for (const a of apninger) {
    for (const [navn, v, min] of [['avstand fra hjørnet', a.x, 0], ['bredde', a.bredde, 0],
      ['høyde', a.hoyde, 0], ['høyde over bakken', a.bunn, -1]]) {
      if (!tall(v) || v <= min) feil.push(`${a.navn}: ${navn} mangler eller er ugyldig.`);
    }
    if (feil.length > 0) continue;
    if (a.x <= forrigeSlutt) feil.push(`${a.navn} overlapper eller står inntil ${forrigeNavn}.`);
    if (a.bunn + a.hoyde > inn.hoyde + SLINGRING) feil.push(`${a.navn} går over toppen av veggen.`);
    forrigeSlutt = a.x + a.bredde;
    forrigeNavn = a.navn.toLowerCase();
  }
  if (apninger.length > 0 && forrigeSlutt >= inn.lengde) {
    feil.push(`${apninger.at(-1).navn} går forbi høyre hjørne.`);
  }
  return feil;
}

// ---------- Forslag til bedre oppsett ----------

// Hvor god en vegg er. Lavere er bedre, sammenlignes tall for tall:
// felt som ikke går opp, spikervarsler, felt over anbefalt omlegg, og hvor langt over
// anbefalt maks det verste feltet er. Omlegg innenfor 20–25 mm regnes som like bra.
export function vurderVegg(r, oMax = STANDARD_INNSTILLINGER.oMax) {
  const ok = r.felt.filter((f) => f.ok);
  const verstOmlegg = ok.length ? Math.max(...ok.map((f) => f.losning.omlegg)) : Infinity;
  return {
    ikkeOpp: r.felt.length - ok.length,
    spikring: r.varsler.filter((v) => v.type === 'spikring').length,
    overMaks: ok.filter((f) => !f.losning.innenforAnbefalt).length,
    overskudd: Math.max(0, verstOmlegg - oMax),
    verstOmlegg,
    antallFelt: r.felt.length,
  };
}

function sammenlign(a, b) {
  return a.ikkeOpp - b.ikkeOpp || a.spikring - b.spikring || a.overMaks - b.overMaks
    || (Math.abs(a.overskudd - b.overskudd) < 1e-6 ? 0 : a.overskudd - b.overskudd);
}

// Prøver andre valg for samme vegg og gir de beste oppsettene som er bedre enn dagens.
// To grupper: med samme bordbredder (bare karm, hjørner og startvalg endres), og med
// andre standardbredder. Hvert forslag sier hva som er endret.
export function foreslaVegg(inndata, { bredder = [73, 98, 123, 148, 173, 198, 223], antall = 3 } = {}) {
  const inn = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG, ...inndata };
  const naa = losVegg(inn);
  if (naa.feil) return { feil: naa.feil };
  const naaVurdering = vurderVegg(naa, inn.oMax);

  const valg = [];
  const proev = (endring) => {
    const forsok = { ...inn, ...endring };
    const r = losVegg(forsok);
    if (r.feil) return;
    const vurdering = vurderVegg(r, inn.oMax);
    if (sammenlign(vurdering, naaVurdering) >= 0) return; // bare det som er bedre
    valg.push({ endring: hvaErEndret(inn, forsok), oppsett: plukk(forsok), vurdering });
  };

  const hjorner = [['O', 'O'], ['U', 'U'], ['O', 'U'], ['U', 'O']];
  const startvalg = ['venstre', 'hoyre', 'midten'];
  const alleValg = (bu, bo) => {
    for (const karmBord of ['O', 'U']) {
      for (const [hjorneVenstre, hjorneHoyre] of hjorner) {
        for (const sv of startvalg) proev({ bu, bo, karmBord, hjorneVenstre, hjorneHoyre, startvalg: sv });
      }
    }
  };

  alleValg(inn.bu, inn.bo);
  const sammeBord = beste(valg.splice(0), antall);
  for (const bu of bredder) {
    for (const bo of bredder) {
      if (bu !== inn.bu || bo !== inn.bo) alleValg(bu, bo);
    }
  }
  const andreBord = beste(valg, antall);

  return { naa: naaVurdering, sammeBord, andreBord };
}

// De beste, uten to forslag som gir helt likt resultat (for eksempel samme vegg
// med to startvalg som ikke spiller noen rolle).
function beste(liste, antall) {
  liste.sort((a, b) => sammenlign(a.vurdering, b.vurdering) || a.endring.length - b.endring.length);
  const ut = [];
  const sett = new Set();
  for (const v of liste) {
    const nokkel = JSON.stringify([v.vurdering, v.oppsett.bu, v.oppsett.bo]);
    if (sett.has(nokkel)) continue;
    sett.add(nokkel);
    ut.push(v);
    if (ut.length === antall) break;
  }
  return ut;
}

function plukk(o) {
  const { bu, bo, karmBord, hjorneVenstre, hjorneHoyre, startvalg } = o;
  return { bu, bo, karmBord, hjorneVenstre, hjorneHoyre, startvalg };
}

const BORDNAVN = { O: 'påbord', U: 'underbord' };
const STARTNAVN = { venstre: 'fra venstre hjørne', hoyre: 'fra høyre hjørne', midten: 'fra midten av veggen' };

function hvaErEndret(fra, til) {
  const e = [];
  if (fra.bu !== til.bu || fra.bo !== til.bo) e.push(`underbord ${til.bu} mm og påbord ${til.bo} mm`);
  if (fra.karmBord !== til.karmBord) e.push(`${BORDNAVN[til.karmBord]} inn på karmen`);
  if (fra.hjorneVenstre !== til.hjorneVenstre || fra.hjorneHoyre !== til.hjorneHoyre) {
    e.push(til.hjorneVenstre === til.hjorneHoyre
      ? `${BORDNAVN[til.hjorneVenstre]} i hjørnene`
      : `${BORDNAVN[til.hjorneVenstre]} i venstre og ${BORDNAVN[til.hjorneHoyre]} i høyre hjørne`);
  }
  if (fra.startvalg !== til.startvalg) e.push(`start ${STARTNAVN[til.startvalg] ?? til.startvalg}`);
  return e;
}
