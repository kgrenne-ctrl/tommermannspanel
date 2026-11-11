// Vangen (PLAN-trapp.md punkt 4). Ingen skjermkode her, bare regning. Alle mål i mm.
// To typer (fase T6): uttatt vange, der trinnene ligger oppå hakk som er skåret ut av vangen, og
// hel vange, der trinnene står mellom to hele vanger. lagVange velger etter valg.vangetype.
//
// Begge gir det samme til tegningene og stegene: vangen lagt flatt (flatt, emnelengde,
// spissFraEnden), spissene på en linje langs vangen (merker, linje = avstand inn fra overkanten),
// hakkene som vinkelen tegner (hakk), kuttene i bunn og topp (kutt, kuttMal) og matrisen som
// reiser vangen opp i trappa (reis).
//
// UTTATT VANGE
//
// Ord og mål (samme som i solver.js, pluss):
//   t   trinntykkelse
//   W   vangebredde (høyden på bordet vangen lages av)
//   B   belegg nede som legges senere (helle, flis). Vangen står så mye lavere enn ferdig underlag.
//   s   avstand mellom hakkene langs overkanten, √(h² + b²)
//
// Riss sett fra siden: x = 0 er forkant av nederste trinn, y = 0 er ferdig underlag.
// Trinn k ligger med underkant i y = k·h − t. Den loddrette flaten i hakket under trinn k står
// i x = (k − 1)·b + nese, så trinnet stikker nesa ut foran. Spissene på hakkene ligger på
// overkanten av bordet. Den innerste vinkelen i hakket ligger hakkdybden inn fra overkanten.
//
// Toppkuttet er loddrett mot bjelken under dekket:
//   dekket er øverste trinn: fra innerste hjørne i øverste hakk, der neste opptrinn ville startet.
//     Da må dekket stikke like langt ut foran bjelken som nesa på trinnene.
//   eget trinn øverst: nesa foran innerste hjørne, der dekket begynner, så øverste trinn
//     ligger inntil dekket.
// Bunnkuttet er vannrett der vangen står, B under ferdig underlag.

import { STANDARD_TRAPP } from './fagverdier.js';

const SLINGRING = 1e-6;
const en = (tall) => String(Math.round(tall * 10) / 10).replace('.', ',');

// Inn: en løsning fra losTrapp, og { vangetype, nese, trinnTykkelse, vangeBredde, beleggNede,
//      overkant }. Om dekket eller et eget trinn er øverst, leses fra løsningen (like mange
//      inntrinn som opptrinn = eget trinn), så vangen og trappa aldri kan spriker.
export function lagVange(l, valg = {}) {
  return valg.vangetype === 'hel' ? lagHelVange(l, valg) : lagUttattVange(l, valg);
}

function kontroller({ h, b, t, W, B, nese }) {
  const feil = [];
  if (!(Number.isFinite(W) && W > 0)) feil.push('Vangebredden må være et tall større enn 0.');
  if (!(Number.isFinite(t) && t >= 0)) feil.push('Trinntykkelsen må være 0 eller mer.');
  if (Number.isFinite(t) && t >= h) feil.push('Trinntykkelsen må være mindre enn opptrinnet.');
  if (!(Number.isFinite(B) && B >= 0)) feil.push('Belegg nede må være 0 eller mer.');
  if (!(Number.isFinite(nese) && nese >= 0 && nese < b)) feil.push('Nesa må være 0 eller mer og mindre enn inntrinnet.');
  return feil;
}

// Ut:  { ok, type: 'uttatt', s, hakkDybde, resthoyde, nedersteOpptrinn, fot, toppkutt, merker,
//        emnelengde, spissFraEnden, omriss, flatt, kutt, kuttMal, varsler } eller { ok: false, feil }.
function lagUttattVange(l, {
  nese = STANDARD_TRAPP.nese,
  trinnTykkelse = STANDARD_TRAPP.trinnTykkelseUte,
  vangeBredde = STANDARD_TRAPP.vangeBredde,
  beleggNede = 0,
} = {}) {
  const h = l.opptrinn;
  const b = l.inntrinn;
  const m = l.antallInntrinn;
  const t = trinnTykkelse;
  const W = vangeBredde;
  const B = beleggNede;
  const ovreTrinn = m === l.antallOpptrinn ? 'eget' : 'dekke';
  const bunn = 0 - B; // ikke -0 når B er 0

  const feil = kontroller({ h, b, t, W, B, nese });
  if (feil.length) return { ok: false, feil };

  const s = Math.hypot(h, b);
  const hakkDybde = (h * b) / s;
  const resthoyde = W - hakkDybde;

  const xk = (k) => (k - 1) * b + nese;      // loddrett flate i hakket under trinn k
  const yk = (k) => k * h - t;               // underkant trinn k = setet i hakket
  // Underkanten av vangen: parallell med overkanten, vangebredden lenger ned
  const underkant = (x) => (h / b) * (x - nese) + h - t - (W * s) / b;

  const xTopp = ovreTrinn === 'eget' ? m * b : m * b + nese;
  const xFot = nese + (b / h) * ((W * s) / b - h + t - B);

  // Omrisset av vangen, rundt fra nederst foran
  const omriss = [{ x: xk(1), y: bunn }, { x: xk(1), y: yk(1) }];
  for (let k = 1; k <= m; k++) {
    omriss.push({ x: xk(k), y: yk(k) }, { x: Math.min(xk(k + 1), xTopp), y: yk(k) });
  }
  omriss.push({ x: xTopp, y: underkant(xTopp) }, { x: xFot, y: bunn });
  // Første punkt i løkka er det samme som det andre før løkka
  omriss.splice(2, 1);

  // Vangen lagt flatt, slik den ligger på bukkene: u langs overkanten fra nederste spiss,
  // v inn fra overkanten (0 = overkant, W = underkant).
  const tilFlatt = ({ x, y }) => ({
    u: ((x - xk(1)) * b + (y - yk(1)) * h) / s,
    v: ((x - xk(1)) * h - (y - yk(1)) * b) / s,
  });
  const flatt = omriss.map(tilFlatt);
  const uMin = Math.min(...flatt.map((p) => p.u));
  const uMaks = Math.max(...flatt.map((p) => p.u));

  // Merkene langs overkanten: spissen på hvert hakk, hvert mål regnet fra 0 og avrundet for seg.
  // Én spiss ekstra øverst (hjelp: true): vinkelen trenger to spisser for å tegne øverste hakk.
  // Den ligger utenfor vangen og kappes bort, men bordet må være langt nok til å merke den
  // (rettet 2026-11-11: emnet var oppgitt for kort til å merke øverste hakk).
  const merker = Array.from({ length: m + 1 }, (_, i) => ({
    hakk: i + 1, avstand: Math.round(i * s), eksakt: i * s, hjelp: i === m,
  }));
  const uMerking = Math.max(uMaks, m * s);

  // Hvert hakk lagt flatt: spissen der inntrinnet starter, innerste hjørne (der vinkelen har
  // hjørnet sitt) og neste spiss, der opptrinnet slutter.
  const hakk = Array.from({ length: m }, (_, i) => ({
    nr: i + 1,
    spiss: { u: i * s, v: 0 },
    hjorne: { u: i * s + (b * b) / s, v: hakkDybde },
    nesteSpiss: { u: (i + 1) * s, v: 0 },
  }));

  const r = {
    ok: true,
    type: 'uttatt',
    linje: 0, // spissene ligger på overkanten
    s,
    hakkDybde,
    resthoyde,
    nedersteOpptrinn: h - t + B,
    fot: xFot - xk(1),
    toppkutt: {
      // Kuttet starter på setet i øverste hakk og går loddrett ned til underkanten. Det merkes
      // fra innerste hjørne i hakket, ikke fra overkanten: der overkanten ville krysset
      // loddstreken, er bordet alt kappet bort.
      lengde: yk(m) - underkant(xTopp),
      // Hvor langt foran innerste hjørne i øverste hakk kuttet står (0 = i hjørnet)
      foranBakkant: ovreTrinn === 'eget' ? nese : 0,
    },
    merker,
    hakk,
    // Minste lengde på bordet: nok til å merke alle spissene og få plass til hele vangen
    emnelengde: Math.ceil(uMerking - uMin - SLINGRING),
    spissFraEnden: -uMin,
    omriss,
    flatt,
    // Fra vangen lagt flatt (u, v med v nedover) til vangen reist i trappa (x, −y i SVG):
    // x = a·u + c·v + e og −y = b·u + d·v + f. Brukes til å vise vangen bli reist.
    reis: { a: b / s, b: -h / s, c: h / s, d: b / s, e: xk(1), f: -yk(1) },
    // Kuttene lagt flatt: bunn = kanten foran ned fra spiss 0 og bunnkuttet, topp = toppkuttet
    kutt: { bunn: [flatt[1], flatt[0], flatt.at(-1)], topp: [flatt.at(-3), flatt.at(-2)] },
    kuttMal: { bunnLodd: h - t + B, bunnVannrett: xFot - xk(1), toppLodd: yk(m) - underkant(xTopp), toppVannrett: 0 },
    trinn: [],
    varsler: [],
  };

  if (resthoyde <= SLINGRING || r.toppkutt.lengde <= SLINGRING || r.fot <= SLINGRING) {
    r.ok = false;
    r.varsler.push({ niva: 'ma', type: 'vange-smal', kilde: null,
      tekst: `Vangen på ${en(W)} mm er for smal. Hakket er ${en(hakkDybde)} mm dypt, så det blir ikke noe igjen av vangen. Bruk bredere vange.` });
  }
  if (B > 0) {
    r.varsler.push({ niva: 'vite', type: 'belegg-nede', kilde: null,
      tekst: `Vangen står ${en(B)} mm under ferdig underlag, så nederste opptrinn i vangen er ${en(r.nedersteOpptrinn)} mm. Når belegget er lagt, blir alle opptrinn ${en(h)} mm.` });
  }
  return r;
}

// HEL VANGE (fase T6, 2026-11-11)
//
// Trinnene står mellom to hele vanger. Vangen svekkes ikke av hakk. På innsiden merkes hvor hvert
// trinn skal ligge: overkant og underkant trinn. Merkingen gjøres med vinkelen som for uttatt
// vange, men spissene ligger på en hjelpelinje «overkant» mm inn fra overkanten av vangen. Den
// linja går gjennom forkantene av trinnene. Vinkelens arm for inntrinnet er overkant trinn.
//
// Riss: x = 0 er forkant av nederste trinn, y = 0 er ferdig gulv. Forkanten av trinn k er
// ((k − 1)·b, k·h). Trinnet er inntrinn + nese dypt (øverste trinn med eget trinn: inntrinnet).
// Plassering i vangen: står ikke «overkant» oppgitt, står trinnene midt i vangen (like mye vange
// over forkanten som under bakkanten av trinnet). Antakelse, kan endres.
// Kutt (antakelse, kan endres i koden): bunnen vannrett der vangen står (B under ferdig gulv) og
// loddrett foran i linje med forkanten av nederste trinn. Toppen loddrett mot bjelken (som uttatt)
// og vannrett i høyde med underkant dekke, med dekkebord like tykke som trinnene. Med eget trinn
// øverst kappes toppen i høyde med dekket, så øverste trinn står mellom vangene.
function lagHelVange(l, {
  nese = STANDARD_TRAPP.nese,
  trinnTykkelse = STANDARD_TRAPP.trinnTykkelseUte,
  vangeBredde = STANDARD_TRAPP.vangeBredde,
  beleggNede = 0,
  overkant = null,
} = {}) {
  const h = l.opptrinn;
  const b = l.inntrinn;
  const m = l.antallInntrinn;
  const n = l.antallOpptrinn;
  const t = trinnTykkelse;
  const W = vangeBredde;
  const B = beleggNede;
  const H = h * n;
  const eget = m === n;
  const bunn = 0 - B;

  const feil = kontroller({ h, b, t, W, B, nese });
  if (overkant !== null && !(Number.isFinite(overkant) && overkant >= 0)) feil.push('Avstanden over forkanten må være 0 eller mer.');
  if (feil.length) return { ok: false, feil };

  const s = Math.hypot(h, b);
  const dybde = (k) => (eget && k === m ? b : b + nese);
  // Hvor mye av bredden trinnet tar, vinkelrett på vangen: fra forkant (oppe) til bakkant (nede)
  const trinnBand = ((b + nese) * h + t * b) / s;
  const a = overkant ?? (W - trinnBand) / 2;
  const under = W - a - trinnBand; // vange under bakkant av trinnet

  const ganglinje = (x) => h * (x / b + 1);
  const overkantV = (x) => ganglinje(x) + (a * s) / b;
  const underkantV = (x) => ganglinje(x) - ((W - a) * s) / b;
  const toppNivaa = eget ? H : H - t;
  const xTopp = eget ? m * b : m * b + nese;
  const xGulv = b * ((bunn + ((W - a) * s) / b) / h - 1);     // der underkanten treffer gulvet
  const xToppKutt = b * ((toppNivaa - (a * s) / b) / h - 1);  // der overkanten når toppkuttet

  const omriss = [
    { x: 0, y: bunn }, { x: 0, y: overkantV(0) }, { x: xToppKutt, y: toppNivaa }, { x: xTopp, y: toppNivaa },
    { x: xTopp, y: underkantV(xTopp) }, { x: xGulv, y: bunn },
  ];
  // Lagt flatt: u langs overkanten fra punktet rett over spiss 0, v inn fra overkanten.
  // Spiss 0 er forkanten av nederste trinn, (0, h), som ligger a inn fra overkanten.
  const tilFlatt = ({ x, y }) => ({ u: (x * b + (y - h) * h) / s, v: a + (x * h - (y - h) * b) / s });
  const flatt = omriss.map(tilFlatt);

  const merker = Array.from({ length: m + 1 }, (_, i) => ({
    hakk: i + 1, avstand: Math.round(i * s), eksakt: i * s, hjelp: i === m,
  }));
  const hakk = Array.from({ length: m }, (_, i) => ({
    nr: i + 1,
    spiss: { u: i * s, v: a },
    hjorne: { u: i * s + (b * b) / s, v: a + (h * b) / s },
    nesteSpiss: { u: (i + 1) * s, v: a },
  }));
  // Trinnene på innsiden, lagt flatt: overkant og underkant fra forkant til bakkant
  const trinn = Array.from({ length: m }, (_, i) => {
    const k = i + 1;
    const x0 = (k - 1) * b;
    return [{ x: x0, y: k * h }, { x: x0 + dybde(k), y: k * h }, { x: x0 + dybde(k), y: k * h - t }, { x: x0, y: k * h - t }].map(tilFlatt);
  });
  const us = [...flatt.map((p) => p.u), m * s];
  const uMin = Math.min(...us);
  const uMaks = Math.max(...us);

  const r = {
    ok: true,
    type: 'hel',
    linje: a,
    overkant: a,
    underTrinn: under,
    midtstilt: overkant === null,
    s,
    nedersteOpptrinn: h + B,
    fot: xGulv,
    merker,
    hakk,
    trinn,
    emnelengde: Math.ceil(uMaks - uMin - SLINGRING),
    spissFraEnden: -uMin,
    omriss,
    flatt,
    reis: { a: b / s, b: -h / s, c: h / s, d: b / s, e: (-h * a) / s, f: -h - (b * a) / s },
    // Bunn: loddrett foran fra overkanten ned til gulvet, så vannrett bakover. Topp: vannrett, så
    // loddrett mot bjelken ned til underkanten.
    kutt: { bunn: [flatt[1], flatt[0], flatt[5]], topp: [flatt[2], flatt[3], flatt[4]] },
    kuttMal: { bunnLodd: overkantV(0) - bunn, bunnVannrett: xGulv, toppLodd: toppNivaa - underkantV(xTopp),
      toppVannrett: xTopp - xToppKutt, fraSpissTilGulv: h + B, fraSpissTilOverkant: (a * s) / b,
      toppNivaa, dekketTilKutt: eget ? 0 : t },
    toppkutt: { lengde: toppNivaa - underkantV(xTopp), foranBakkant: eget ? 0 : nese },
    varsler: [],
  };

  if (a < -SLINGRING || under < -SLINGRING) {
    r.ok = false;
    r.varsler.push({ niva: 'ma', type: 'vange-smal', kilde: null,
      tekst: `Vangen på ${en(W)} mm er for smal for trinnene. Trinnene trenger ${en(trinnBand)} mm av bredden, `
        + `målt vinkelrett på vangen. Bruk bredere vange${overkant !== null ? ' eller mindre avstand over forkanten' : ''}.` });
  } else if (xGulv <= SLINGRING) {
    r.ok = false;
    r.varsler.push({ niva: 'ma', type: 'vange-gulv', kilde: null,
      tekst: 'Vangen når ikke ned til gulvet foran. Flytt trinnene høyere opp i vangen (mindre avstand over forkanten) eller bruk bredere vange.' });
  } else if (r.midtstilt) {
    r.varsler.push({ niva: 'vite', type: 'vange-midt', kilde: null,
      tekst: `Trinnene står midt i vangen: ${en(a)} mm vange over forkanten og ${en(under)} mm under bakkanten av trinnet, målt vinkelrett på vangen.` });
  }
  if (B > 0) {
    r.varsler.push({ niva: 'vite', type: 'belegg-nede', kilde: null,
      tekst: `Vangen står ${en(B)} mm under ferdig gulv. Når gulvet er lagt, blir alle opptrinn ${en(h)} mm.` });
  }
  return r;
}
