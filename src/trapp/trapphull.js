// Trapphull og fri høyde for en innvendig trapp (PLAN-trapp.md punkt 4, fase T5).
// Ingen skjermkode her, bare regning. Alle mål i mm.
//
// Riss sett fra siden som i solver.js: x = 0 er forkant av nederste trinn, y = 0 er ferdig gulv
// nede. Dekket (ferdig gulv oppe) ligger i høyde H, og forkanten av dekket i x = løpslengden.
// Trapphullet går fra forkanten av dekket og bakover over trappa. Kanten av hullet står i
// x = løpslengde − hullets lengde.
//
// Fri høyde måles loddrett fra linja gjennom forkantene av trinnene (ganglinja i et rett løp) til
// underkant av etasjeskilleren ved kanten av trapphullet. Etasjeskilleren er tykkelsen fra
// underkant himling til ferdig gulv oppe, så underkanten ligger i H − etasjeskiller.
// Krav: 2,0 m inne i boligen, ellers 2,1 m (TEK17 § 12-14, rette løp).

import { TRAPPETYPER } from './fagverdier.js';

const SLINGRING = 1e-6;
const en = (tall) => String(Math.round(tall * 10) / 10).replace('.', ',');

// Høyden på linja gjennom forkantene av trinnene i x. Foran nederste trinn står man på gulvet.
function ganglinje(l, x) {
  const H = l.opptrinn * l.antallOpptrinn;
  if (x < 0) return 0;
  return Math.min(H, l.opptrinn * (x / l.inntrinn + 1));
}

// Inn: en løsning fra losTrapp og { etasjeskiller, hullLengde (valgfri), type }.
// Ut:  { ok, krav, friHoyde, minsteHull, kant, varsler } eller { ok: false, feil }.
export function lagTrapphull(l, { etasjeskiller, hullLengde = null, type = 'boenhet', friHoydeKrav = null } = {}) {
  const feil = [];
  if (!(Number.isFinite(etasjeskiller) && etasjeskiller > 0)) feil.push('Etasjeskilleren må være et tall større enn 0.');
  if (hullLengde !== null && !(Number.isFinite(hullLengde) && hullLengde > 0)) feil.push('Lengden på trapphullet må være et tall større enn 0.');
  if (feil.length) return { ok: false, feil };

  const H = l.opptrinn * l.antallOpptrinn;
  const h = l.opptrinn;
  const b = l.inntrinn;
  const lop = l.lopslengde;
  const krav = friHoydeKrav ?? TRAPPETYPER[type]?.friHoyde ?? 2100;
  const underkant = H - etasjeskiller;
  const varsler = [];

  if (underkant - krav < -SLINGRING) {
    return { ok: false, feil: [`Etasjeskilleren på ${en(etasjeskiller)} mm gir bare ${en(underkant)} mm under himlingen. Det er mindre enn kravet på ${en(krav)} mm fri høyde.`] };
  }

  // Der ganglinja er nøyaktig kravet under etasjeskilleren. Hullet må gå minst hit.
  let xKrav = b * ((underkant - krav) / h - 1);
  if (xKrav < 0) xKrav = 0; // kravet gjelder fra nederste trinn
  const minsteHull = Math.ceil(lop - xKrav - SLINGRING);

  let friHoyde = null;
  let kant = null;
  if (hullLengde !== null) {
    kant = lop - hullLengde;
    friHoyde = underkant - ganglinje(l, kant);
    if (friHoyde < krav - SLINGRING) {
      varsler.push({ niva: 'ma', type: 'fri-hoyde', kilde: 'TEK17 § 12-14',
        tekst: `Fri høyde under kanten av trapphullet blir ${en(friHoyde)} mm. Kravet er ${en(krav)} mm. `
          + `Trapphullet må være minst ${en(minsteHull)} mm langt.` });
    }
  }
  return { ok: true, krav, etasjeskiller, underkant, minsteHull, xKrav, hullLengde, kant, friHoyde, varsler };
}
