// Uttatt vange: trinnene ligger oppå hakk som er skåret ut av vangen (PLAN-trapp.md punkt 4).
// Ingen skjermkode her, bare regning. Alle mål i mm.
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

// Inn: en løsning fra losTrapp, og { nese, trinnTykkelse, vangeBredde, beleggNede }.
//      Om dekket eller et eget trinn er øverst, leses fra løsningen (like mange inntrinn som
//      opptrinn = eget trinn), så vangen og trappa aldri kan spriker.
// Ut:  { ok, s, hakkDybde, resthoyde, nedersteOpptrinn, fot, toppkutt, merker, emnelengde,
//        spissFraEnden, omriss, flatt, varsler } eller { ok: false, feil: [...] }.
export function lagVange(l, {
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

  const feil = [];
  if (!(Number.isFinite(W) && W > 0)) feil.push('Vangebredden må være et tall større enn 0.');
  if (!(Number.isFinite(t) && t >= 0)) feil.push('Trinntykkelsen må være 0 eller mer.');
  if (Number.isFinite(t) && t >= h) feil.push('Trinntykkelsen må være mindre enn opptrinnet.');
  if (!(Number.isFinite(B) && B >= 0)) feil.push('Belegg nede må være 0 eller mer.');
  if (!(Number.isFinite(nese) && nese >= 0 && nese < b)) feil.push('Nesa må være 0 eller mer og mindre enn inntrinnet.');
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
