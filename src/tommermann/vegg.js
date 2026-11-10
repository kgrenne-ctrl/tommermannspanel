// Regnemodell for en hel vegg med vinduer, dører og porter (PLAN.md punkt 4).
// Ingen skjermkode her, bare regning. Alle mål i mm, målt fra venstre hjørne og fra bakken.
//
// Slik er veggen bygd opp (avklart med Kenny 2026-11-08):
// - Ingen belistning. Bordet ved siden av en åpning går 10–20 mm inn på karmen (innlegget)
//   og dekker fugen. Det bordet står i full høyde forbi åpningen.
// - Feltene over og under en åpning ligger mellom de to sidebordene og fortsetter rytmen.
//   De får samme deling og regnes som ett felt med to høyder («Over og under vindu 1»).
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
// - jevnt:     alle innlegg velges samtidig, jevnest omlegg over hele veggen (velgJevnt)
// - lik:       lik avstand mellom påbordene over hele veggen (velgLikAvstand)

import { losFeltFleksibel } from './solver.js';
import { STANDARD_INNSTILLINGER, STANDARD_VEGG, STANDARD_BREDDER } from './fagverdier.js';

const SLINGRING = 1e-6;
const MINSTE_APNING = 300; // mm. Mindre enn dette er nesten alltid en tastefeil.
const TYPENAVN = { vindu: 'Vindu', dor: 'Dør', port: 'Port' };

export function losVegg(inndata) {
  const inn = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG, ...inndata };
  // Kløyvd hjørnebord: delingen regnes som om bordet var helt, med feltet lengre ut med
  // kløyvingen. Etterpå kappes den ytterste kanten av hjørnebordet bort (se kloyvHjornebord).
  const kV = inn.klyvVenstre;
  const kH = inn.klyvHoyre;
  inn.forlengVenstre += kV;
  inn.forlengHoyre += kH;
  const { lengde: W, hoyde: H, bu, bo } = inn;
  // Kledningen går fra fV til W + fH. Nullpunktet er hjørnet på veggen (Kenny 2026-11-09).
  const fV = inn.forlengVenstre;
  const fH = inn.forlengHoyre;

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

  if (kV > 0) kloyvHjornebord(felt[0], 'start', kV);
  if (kH > 0) kloyvHjornebord(felt.at(-1), 'slutt', kH);

  const varsler = [];
  for (const a of apninger) {
    // Åpenbart feile mål (for eksempel 1 mm høy dør) gir rare felt. Si fra.
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
    varsler.push({ felt: 'Venstre hjørne', type: 'underlag-hjorne', tekst: 'Påbordet ytterst i hjørnet har ikke underbord bak seg. Sett underlag der.' });
  }
  if (inn.hjorneHoyre === 'O') {
    varsler.push({ felt: 'Høyre hjørne', type: 'underlag-hjorne', tekst: 'Påbordet ytterst i hjørnet har ikke underbord bak seg. Sett underlag der.' });
  }
  // Påbord som går inn på karmen ligger an på karmen, slik det ellers ligger an på et
  // underbord. Det trenger ikke kloss bak (Kenny 2026-11-08).
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
    forleng: { venstre: fV - kV, hoyre: fH - kH },
    kledning: { fra: -fV + kV, til: W + fH - kH },
    klyv: { venstre: kV, hoyre: kH },
    tykkelse: { under: inn.tykkelseUnder, over: inn.tykkelseOver },
    hjorner: inn.hjorner ?? null,
    apninger: apninger.map((a, j) => ({
      ...a,
      innlegg: { venstre: e[2 * j], hoyre: e[2 * j + 1] },
    })),
    felt,
    varsler,
    rytme: { senteravstand, omlegg: inn.oIdeal, maks: inn.oMax },
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
  // Faste innlegg (brukes av testene for å prøve alle kombinasjoner)
  if (Array.isArray(inn.fasteInnlegg)) {
    inn.fasteInnlegg.forEach((v, j) => sett(j, v));
    return;
  }

  // Prøv alle innlegg for åpningene i js (én eller to), og behold det som gir lavest
  // kostnad for leddene i lista. Leddene skal bare avhenge av innlegg som er bestemt.
  const velg = (js, ledd) => {
    let beste = null;
    const prov = (verdier) => {
      verdier.forEach((v, i) => sett(js[i], v));
      const kost = ledd.reduce((sum, m) => leggSammen(sum, kostnad(regnLedd(m, e, apninger, inn), inn)), null)
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
  if (startvalg === 'jevnt') {
    velgJevnt(apninger, inn, e, kandidater);
    return;
  }
  if (startvalg === 'lik') {
    velgLikAvstand(apninger, inn, e, kandidater);
    return;
  }
  // venstre
  for (let j = 0; j < n; j++) mot.hoyre(j);
}

// Jevnest over hele veggen (Kenny 2026-11-09): velger alle innleggene samtidig, slik at
// summen over alle felt blir best: først ingen felt som ikke går opp, så færrest spikervarsler
// og felt over anbefalt, så minst omlegg over maks, og så minst (omlegg − ideelt)². Kvadratet
// gjør at to felt som avviker litt er bedre enn ett som avviker mye, så feltene blir like.
//
// Hvert felt avhenger bare av åpningene rett ved siden av: feltet mellom åpning j−1 og j av
// innleggene der, feltet over og under åpning j bare av innlegget i j. Da kan det løses som en
// kjede, åpning for åpning (dynamisk programmering), og alle kombinasjoner er likevel vurdert.
function velgJevnt(apninger, inn, e, kandidater) {
  const n = apninger.length;
  const sett = (j, v) => { e[2 * j] = v; e[2 * j + 1] = v; };
  const kost = (m) => kostnad(regnLedd(m, e, apninger, inn), inn, true);
  const innlegg = (v) => { const k = nullKost(); k[5] = Math.abs(v - inn.innleggStandard); return k; };
  besteKjede(n, kandidater, sett, kost, innlegg).spor.forEach((v, j) => sett(j, v));
}

// Selve kjeden, felles for «jevnest» og «lik avstand». Går åpning for åpning og husker, for hvert
// mulig innlegg i åpningen den står i, den beste måten å komme dit på. Gir den beste rekka av
// innlegg (spor) og kostnaden for hele veggen.
//   sett(j, v)  setter innlegg v i åpning j
//   kost(m)     kostnaden for felt m med innleggene som er satt akkurat nå
//               (felt 2j er til venstre for åpning j, felt 2j+1 er over og under den)
//   innlegg(v)  kostnaden for at innlegget v avviker fra standard
// Veggen har alltid minst én åpning her (velgInnlegg gir seg ellers før den kommer hit).
function besteKjede(n, kandidater, sett, kost, innlegg) {
  let rad = kandidater.map((v) => {
    sett(0, v);
    return { kost: leggSammen(leggSammen(leggSammen(null, kost(0)), kost(1)), innlegg(v)), spor: [v] };
  });
  for (let j = 1; j < n; j++) {
    const forrige = rad;
    rad = kandidater.map((v) => {
      sett(j, v);
      const over = leggSammen(kost(2 * j + 1), innlegg(v));
      let best = null;
      kandidater.forEach((u, i) => {
        sett(j - 1, u);
        const k = leggSammen(leggSammen(forrige[i].kost, kost(2 * j)), over);
        if (!best || sammenlignKost(k, best.kost) < 0) best = { kost: k, spor: [...forrige[i].spor, v] };
      });
      return best;
    });
  }
  let vinner = null;
  kandidater.forEach((v, i) => {
    sett(n - 1, v);
    const k = leggSammen(rad[i].kost, kost(2 * n));
    if (!vinner || sammenlignKost(k, vinner.kost) < 0) vinner = { kost: k, spor: rad[i].spor };
  });
  return vinner;
}

// ---------- Lik avstand mellom påbordene (Kenny 2026-11-09) ----------
// Slik en tømrer gjør det: alle felt sikter mot samme avstand mellom påbordene (G). Hvert felt
// får det antallet bord som kommer nærmest. Bordene kløyves ikke (Kenny 2026-11-10), så felt
// som ikke treffer, får stå med det avviket de har.
//
// Avstand mellom påbord = senteravstand − påbordets bredde = bu + g − bo.
// Omlegget blir da (bu − avstand)/2, så felles avstand gir også felles omlegg. Derfor prøves
// G mellom bu − 2·oMax og bu − 2·oMin, og den G som gir best vegg, velges.
//
// Innleggene velges samtidig for hele veggen (kjede, som velgJevnt). For hvert felt huskes valget
// (antall bord k) i inn.likValg, og lagFelt bruker det.

// Det beste valget for ett felt mot målet G: [går ikke opp, mm utenfor avviket, spikervarsel,
// over maks, (avstand − G)², 0] og valget { k, avstand }.
function feltMotMaal(svar, G, inn) {
  if (svar.tom) return { kost: nullKost(), valg: null };
  if (!svar.ok) return { kost: [1, 0, 0, 0, 0, 0], valg: null };
  let beste = null;
  for (const l of svar.alle) {
    const avstand = l.senteravstand - inn.bo;
    const utenfor = Math.max(0, Math.abs(avstand - G) - inn.avvikPabord);
    const kost = [0, utenfor, l.spikring.ok ? 0 : 1, l.omlegg > inn.oMax + SLINGRING ? 1 : 0, (avstand - G) ** 2, 0];
    if (!beste || sammenlignKost(kost, beste.kost) < 0) beste = { kost, valg: { k: l.antallUnderliggere, avstand } };
  }
  return beste;
}

function velgLikAvstand(apninger, inn, e, kandidater) {
  const n = apninger.length;
  const sett = (j, v) => { e[2 * j] = v; e[2 * j + 1] = v; };
  // Felt-løsningene avhenger bare av innleggene, ikke av G. Husk dem.
  const lager = new Map();
  const ledd = (m) => {
    const nokkel = `${m}|${m > 0 ? e[m - 1] : ''}|${m < 2 * n ? e[m] : ''}`;
    if (!lager.has(nokkel)) lager.set(nokkel, regnLedd(m, e, apninger, inn));
    return lager.get(nokkel);
  };
  const innlegg = (v) => { const k = nullKost(); k[5] = Math.abs(v - inn.innleggStandard); return k; };

  let best = null;
  // Målet holdes så langt inn at hele avviket (±) gir omlegg mellom minimum og maks
  let gFra = Math.ceil(inn.bu - 2 * inn.oMax + inn.avvikPabord);
  let gTil = Math.floor(inn.bu - 2 * inn.oMin - inn.avvikPabord);
  if (gFra > gTil) { gFra = Math.ceil(inn.bu - 2 * inn.oMax); gTil = Math.floor(inn.bu - 2 * inn.oMin); }
  for (let G = gFra; G <= gTil; G += 1) {
    const kost = (m) => feltMotMaal(ledd(m), G, inn).kost;
    const resultat = besteKjede(n, kandidater, sett, kost, innlegg);
    if (!best || sammenlignKost(resultat.kost, best.kost) < 0) best = { ...resultat, G };
  }
  best.spor.forEach((v, j) => sett(j, v));
  // Husk valget for hvert felt med de valgte innleggene
  inn.likValg = { G: best.G };
  for (let m = 0; m <= 2 * n; m++) inn.likValg[m] = feltMotMaal(ledd(m), best.G, inn).valg;
}

// Kostnad for ett ledd, som tall som sammenlignes ett for ett (lavere er bedre):
// [går ikke opp, spikervarsel, over maks, mm over maks, mm fra ideelt, innlegg fra standard].
// Over og under en åpning er ett felt (samme deling), så det teller én gang.
// Med kvadrat = true («jevnest») regnes avviket fra ideelt omlegg i annen potens, så store avvik
// straffes mest.
function kostnad(svar, inn, kvadrat = false) {
  if (svar.tom) return nullKost();
  if (!svar.ok) return [1, 0, 0, 0, 0, 0];
  const l = svar.valgt;
  const fraIdeelt = Math.abs(l.omlegg - inn.oIdeal);
  return [0, l.spikring.ok ? 0 : 1, l.innenforAnbefalt ? 0 : 1,
    Math.max(0, l.omlegg - inn.oMax), kvadrat ? fraIdeelt ** 2 : fraIdeelt, 0];
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
    const fra = j === 0 ? -inn.forlengVenstre : apninger[j - 1].x + apninger[j - 1].bredde;
    const til = j === n ? inn.lengde + inn.forlengHoyre : apninger[j].x;
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

function lagFelt(m, svarInn, e, apninger, inn) {
  const n = apninger.length;
  if (svarInn.tom) return [];
  // Lik avstand: bruk antallet bord som ble valgt for feltet
  let svar = svarInn;
  const lik = inn.likValg?.[m];
  if (lik && svarInn.ok) {
    const valgt = svarInn.alle.find((l) => l.antallUnderliggere === lik.k) ?? svarInn.valgt;
    svar = { ...svarInn, valgt };
  }

  if (m % 2 === 0) {
    const j = m / 2;
    const venstre = j === 0 ? null : apninger[j - 1];
    const hoyre = j === n ? null : apninger[j];
    const x0 = venstre ? venstre.x + venstre.bredde - e[m - 1] : -inn.forlengVenstre;
    const navn = `${venstre ? venstre.navn : 'Venstre hjørne'} – ${hoyre ? hoyre.navn : 'Høyre hjørne'}`;
    return [byggFelt({
      type: 'side', navn, x0, x1: hoyre ? hoyre.x + e[m] : inn.lengde + inn.forlengHoyre, deler: [[0, inn.hoyde]], svar,
      innlegg: { venstre: venstre ? e[m - 1] : null, hoyre: hoyre ? e[m] : null },
      fjernDelte: false, karmBord: inn.karmBord, inn,
    })];
  }

  const j = (m - 1) / 2;
  const a = apninger[j];
  const b = inn.karmBord === 'U' ? inn.bu : inn.bo;
  const x0 = a.x + e[m - 1] - b;
  const felles = { x0, x1: a.x + a.bredde - e[m] + b, svar, innlegg: { venstre: e[m - 1], hoyre: e[m] }, fjernDelte: true,
    karmBord: inn.karmBord, apning: a.navn, inn };
  // Feltet over og feltet under åpningen har nøyaktig samme deling (samme bredde, samme
  // sidebord). Det er ett felt med to høyder.
  const deler = [];
  if (a.bunn > SLINGRING) deler.push([0, a.bunn]);
  if (a.bunn + a.hoyde < inn.hoyde - SLINGRING) deler.push([a.bunn + a.hoyde, inn.hoyde]);
  if (deler.length === 0) return [];
  const sted = deler.length === 2 ? 'Over og under' : (a.bunn > SLINGRING ? 'Under' : 'Over');
  return [byggFelt({ ...felles, type: 'overunder', navn: `${sted} ${a.navn.toLowerCase()}`, deler })];
}

function byggFelt({ type, navn, x0, x1, deler, svar, innlegg, fjernDelte, karmBord, apning, inn }) {
  if (!svar.ok) {
    return { ok: false, type, navn, x0, x1, deler, innlegg, apning,
      melding: svar.melding ?? 'Feltet går ikke opp.' };
  }
  // Avstanden mellom påbordene er det som synes på veggen
  const l = { ...svar.valgt, avstandPabord: svar.valgt.senteravstand - (inn?.bo ?? svar.valgt.bo) };
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
    ok: true, type, navn, apning, x0, x1: x0 + l.L, deler, innlegg,
    losning: l,
    underliggere,
    overliggere,
  };
}

// Kapper den ytterste kanten av hjørnebordet bort. Bordet er det første (eller siste) i
// feltet, og det er bordtypen veggen har ytterst i hjørnet.
function kloyvHjornebord(f, ende, k) {
  if (!f || !f.ok) return;
  const forste = (liste) => (liste.length ? liste[ende === 'start' ? 0 : liste.length - 1] : null);
  const kandidater = [forste(f.underliggere), forste(f.overliggere)].filter(Boolean);
  const b = ende === 'start'
    ? kandidater.reduce((a, c) => (c.fraEksakt < a.fraEksakt ? c : a))
    : kandidater.reduce((a, c) => (c.tilEksakt > a.tilEksakt ? c : a));
  if (ende === 'start') { b.fraEksakt += k; b.fra = Math.round(b.fraEksakt); } else { b.tilEksakt -= k; b.til = Math.round(b.tilEksakt); }
  b.klyvd = k;
  b.bredde = b.tilEksakt - b.fraEksakt;
  f.hjornebord = { ...(f.hjornebord ?? {}), [ende]: { type: b.type, klyvd: k, bredde: b.bredde } };
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
  for (const [navn, v] of [['Tykkelse underbord', inn.tykkelseUnder], ['Tykkelse påbord', inn.tykkelseOver]]) {
    if (!tall(v) || v <= 0) feil.push(`${navn} må være et tall større enn 0.`);
  }
  for (const [navn, v] of [['Venstre hjørne', inn.forlengVenstre], ['Høyre hjørne', inn.forlengHoyre]]) {
    if (!tall(v)) feil.push(`${navn}: tillegget må være et tall.`);
  }
  if (feil.length === 0 && inn.lengde + inn.forlengVenstre + inn.forlengHoyre <= 0) {
    feil.push('Hjørnekassene er bredere enn veggen.');
  }
  for (const [navn, v] of [['Karmbord', inn.karmBord], ['Venstre hjørne', inn.hjorneVenstre],
    ['Høyre hjørne', inn.hjorneHoyre]]) {
    if (v !== 'U' && v !== 'O') feil.push(`${navn} må være 'U' eller 'O'.`);
  }
  if (!(inn.innleggMin <= inn.innleggStandard && inn.innleggStandard <= inn.innleggMax)) {
    feil.push('Innlegg må ha minimum ≤ standard ≤ maks.');
  }
  const gyldigeStart = ['venstre', 'hoyre', 'midten', 'jevnt', 'lik'];
  const sv = String(inn.startvalg);
  if (!gyldigeStart.includes(sv)) {
    const nr = Number(sv.split(':')[1]);
    if (!sv.startsWith('apning:') || !Number.isInteger(nr) || nr < 0 || nr >= apninger.length) {
      feil.push('Ukjent startvalg.');
    }
  }
  if (feil.length > 0) return feil;

  // Med hjørnekasse starter kledningen et stykke inn på veggen
  let forrigeSlutt = Math.max(0, -inn.forlengVenstre);
  let forrigeNavn = inn.forlengVenstre < 0 ? 'hjørnekassa til venstre' : 'venstre hjørne';
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
  if (apninger.length > 0 && forrigeSlutt >= inn.lengde + Math.min(0, inn.forlengHoyre)) {
    feil.push(inn.forlengHoyre < 0
      ? `${apninger.at(-1).navn} overlapper eller står inntil hjørnekassa til høyre.`
      : `${apninger.at(-1).navn} går forbi høyre hjørne.`);
  }
  return feil;
}

// ---------- Forslag til bedre oppsett ----------

// Hvor god en vegg er. Lavere er bedre, sammenlignes tall for tall:
// felt som ikke går opp, spikervarsler, felt over anbefalt omlegg, og hvor langt over
// anbefalt maks det verste feltet er. Omlegg mellom minimum og maks (20–30 mm) regnes som like bra.
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

// Varsler om ulikt bord ytterst i et hjørne enn naboveggen har (kommer fra hus.js)
const ulikeHjornebord = (r) => r.varsler.filter((v) => v.type === 'hjorne-bord').length;

// En nabovegg før og etter et forslag: −1 er bedre, 0 er like bra, 1 er dårligere. Dårligere
// er den når delingen blir dårligere eller den får et nytt varsel om ulikt bord i hjørnet,
// uansett om det andre blir bedre.
function sammenlignNabo(etter, for_) {
  if (etter.feil || for_.feil) return (etter.feil ? 1 : 0) - (for_.feil ? 1 : 0);
  const hjorne = ulikeHjornebord(etter) - ulikeHjornebord(for_);
  const deling = sammenlign(vurderVegg(etter, etter.rytme.maks), vurderVegg(for_, for_.rytme.maks));
  if (hjorne > 0 || deling > 0) return 1;
  return hjorne < 0 || deling < 0 ? -1 : 0;
}

// Prøver andre valg for samme vegg og gir de beste oppsettene som er bedre enn dagens.
// To grupper: med samme bordbredder (bare karm, hjørner og startvalg endres), og med
// andre standardbredder. Hvert forslag sier hva som er endret.
//
// `regn(vegg)` regner veggen og gir { r, naboer: [{ navn, r }] }. Uten den regnes veggen alene.
// hus.js (foreslaHus) sender inn en som regner gjennom hele huset, så hjørnene og naboveggene
// er med (Kenny 2026-11-10). Et forslag tas bare med når
// - veggen blir bedre,
// - veggen ikke får et annet bord ytterst i et hjørne enn naboveggen har der, og
// - ingen nabovegg blir dårligere.
// Naboveggene som forslaget endrer, står i forslaget som naboer: [{ navn, bedre }].
export function foreslaVegg(inndata, { bredder = STANDARD_BREDDER, antall = 3,
  regn = (vegg) => ({ r: losVegg(vegg), naboer: [] }) } = {}) {
  const inn = { ...STANDARD_INNSTILLINGER, ...STANDARD_VEGG, ...inndata };
  const naa = regn(inn);
  if (naa.r.feil) return { feil: naa.r.feil };
  const naaVurdering = vurderVegg(naa.r, inn.oMax);

  const valg = [];
  const proev = (endring) => {
    const forsok = { ...inn, ...endring };
    const hva = hvaErEndret(inn, forsok);
    if (!hva.length) return; // dagens oppsett er ikke et forslag
    const { r, naboer } = regn(forsok);
    if (r.feil || ulikeHjornebord(r) > ulikeHjornebord(naa.r)) return;
    const vurdering = vurderVegg(r, inn.oMax);
    if (sammenlign(vurdering, naaVurdering) >= 0) return; // bare det som er bedre
    const endret = [];
    for (let i = 0; i < naboer.length; i++) {
      if (naboer[i].r === naa.naboer[i].r) continue; // forslaget rører ikke denne naboveggen
      const s = sammenlignNabo(naboer[i].r, naa.naboer[i].r);
      if (s > 0) return;
      endret.push({ navn: naboer[i].navn, bedre: s < 0 });
    }
    valg.push({ endring: hva, oppsett: plukk(forsok), vurdering, naboer: endret });
  };

  const hjorner = [['O', 'O'], ['U', 'U'], ['O', 'U'], ['U', 'O']];
  const startvalg = ['lik', 'venstre', 'hoyre', 'midten', 'jevnt'];
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
const STARTNAVN = { venstre: 'fra venstre hjørne', hoyre: 'fra høyre hjørne', midten: 'fra midten av veggen',
  jevnt: 'jevnest over hele veggen', lik: 'lik avstand mellom påbordene' };

function hvaErEndret(fra, til) {
  const e = [];
  if (fra.bu !== til.bu || fra.bo !== til.bo) e.push(`underbord ${til.bu} mm og påbord ${til.bo} mm`);
  if (fra.karmBord !== til.karmBord) e.push(`${BORDNAVN[til.karmBord]} inn på karmen`);
  if (fra.hjorneVenstre !== til.hjorneVenstre || fra.hjorneHoyre !== til.hjorneHoyre) {
    e.push(til.hjorneVenstre === til.hjorneHoyre
      ? `${BORDNAVN[til.hjorneVenstre]} i hjørnene`
      : `${BORDNAVN[til.hjorneVenstre]} i venstre og ${BORDNAVN[til.hjorneHoyre]} i høyre hjørne`);
  }
  if (fra.startvalg !== til.startvalg) {
    e.push(['jevnt', 'lik'].includes(til.startvalg) ? STARTNAVN[til.startvalg] : `start ${STARTNAVN[til.startvalg] ?? til.startvalg}`);
  }
  return e;
}

// ---------- Oppsettliste og merkeliste ----------

// Referanse for mål i et felt: karmkanten til venstre for feltet, ellers venstre hjørne.
function referanseFor(r, f) {
  if (f.type === 'overunder') {
    const a = r.apninger.find((x) => x.navn === f.apning);
    return { navn: `venstre karm ${a.navn.toLowerCase()}`, x: a.x };
  }
  const venstre = r.apninger.filter((a) => a.x + a.bredde <= f.x0 + 50).at(-1);
  if (venstre) return { navn: `høyre karm ${venstre.navn.toLowerCase()}`, x: venstre.x + venstre.bredde };
  return { navn: 'hjørnet', x: 0 };
}

// «Slik setter du opp»: én linje per felt med det tømreren trenger når han bruker
// distanseklosser. Hvor første underbord står (fra hjørnet og fra karmen), klossen, hvor
// mange underbord, og hvor det siste slutter (kontrollmål). Feltene i rekkefølge fra venstre.
export function lagOppsettliste(r) {
  return r.felt.map((f, i) => {
    if (!f.ok) return { nr: i + 1, navn: f.navn, ok: false, melding: f.melding };
    const ref = referanseFor(r, f);
    // Over og under en åpning kan underbordene være tatt ut (sidebordene er underbord når
    // underbordet går inn på karmen). Da kan feltet ha bare påbord.
    const bord = f.underliggere.length ? f.underliggere : f.overliggere;
    const forste = bord[0];
    const siste = bord.at(-1);
    return {
      nr: i + 1,
      navn: f.navn,
      ok: true,
      type: f.type,
      hoyde: f.type === 'side' ? 'Full høyde' : f.navn,
      bordtype: f.underliggere.length ? 'U' : 'O',
      antall: bord.length,
      fra: forste.fra,
      fraReferanse: Math.round(forste.fraEksakt - ref.x),
      referanse: ref.navn,
      til: siste.til,
      kloss: f.losning.klaring,
      hjornebord: Object.values(f.hjornebord ?? {}),
      avstandPabord: f.losning.avstandPabord,
      omlegg: f.losning.omlegg,
      innenforAnbefalt: f.losning.innenforAnbefalt,
    };
  });
}

// Merkeliste: alle underbord på veggen i rekkefølge fra venstre, slik tømreren merker dem.
// For hvert bord: løpende mål fra venstre hjørne, mål fra nærmeste karmkant til venstre
// (tryggere enn å måle hele veien fra hjørnet), om bordet går i full høyde eller bare over
// og under en åpning, og distanseklossen (klaringen) i feltet.
export function lagMerkeliste(r) {
  const rader = [];
  r.felt.forEach((f, i) => {
    if (!f.ok) return;
    const ref = referanseFor(r, f);
    const hoyde = f.type === 'side' ? 'Full høyde' : f.navn;
    for (const b of f.underliggere) {
      rader.push({
        fra: b.fra,
        til: b.til,
        fraEksakt: b.fraEksakt,
        fraReferanse: Math.round(b.fraEksakt - ref.x),
        referanse: ref.navn,
        hoyde,
        deler: f.deler,
        feltNr: i + 1,
        feltNavn: f.navn,
        klaring: f.losning.klaring,
      });
    }
  });
  rader.sort((a, b) => a.fraEksakt - b.fraEksakt);
  rader.forEach((rad, i) => { rad.nr = i + 1; });
  return rader;
}
