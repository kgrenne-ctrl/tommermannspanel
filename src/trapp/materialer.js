// Materialliste og kappliste for trappa (PLAN-trapp.md fase T4, avklart med Kenny 2026-11-11).
// Ingen skjermkode her, bare regning. Mål i mm, løpemeter i m.
//
// - Vangene må være hele: de bestilles som antall stykk med minste lengde (emnet + kapptillegg).
// - Trinnbord bestilles i løpemeter per dimensjon, med svinn, rundet opp til hel meter.
// - Bredden på trappa måles over ytterkant av vangene (Kenny 2026-11-11). Trinnene er bredden
//   pluss utstikket på hver side.
// - Antall vanger: appen foreslår ut fra største avstand mellom vangene (Bakøys praksis, se
//   fagverdier.js). Tømreren kan velge et annet antall, og får varsel om avstanden blir større.

import { STANDARD_TRAPP } from './fagverdier.js';

const SLINGRING = 1e-6;
const en = (tall) => String(Math.round(tall * 10) / 10).replace('.', ',');

export function dimensjon(tykkelse, bredde) {
  return { nokkel: `${tykkelse}x${bredde}`, navn: `${en(tykkelse)} × ${en(bredde)}`, tykkelse, bredde };
}

// Største avstand mellom vangene for en trinntykkelse
export function maksAvstandVanger(trinnTykkelse, inn = STANDARD_TRAPP) {
  return trinnTykkelse >= inn.tykkeTrinnFra - SLINGRING ? inn.maksAvstandVangerTykk : inn.maksAvstandVangerTynn;
}

// Inn: { l, vange, bredde, trinnbord, trinnTykkelse, nese, vangeTykkelse, vangeBredde, utstikk,
//        antallVanger (null = som anbefalt), kapptillegg, svinn } pluss eventuelle innstillinger.
// Ut:  { ok: true, ... } eller { ok: false, feil: [...] }.
export function lagTrappMaterialer({ l, vange, bredde, trinnbord = null, trinnTykkelse, nese = STANDARD_TRAPP.nese,
  vangeTykkelse = STANDARD_TRAPP.vangeTykkelse, vangeBredde = STANDARD_TRAPP.vangeBredde,
  utstikk = STANDARD_TRAPP.utstikk, antallVanger = null, kapptillegg = STANDARD_TRAPP.kapptillegg,
  svinn = STANDARD_TRAPP.svinn, stusstrinn = null, ...resten }) {
  const inn = { ...STANDARD_TRAPP, ...resten };
  const feil = [];
  const positiv = (x) => Number.isFinite(x) && x > 0;
  if (!positiv(bredde)) feil.push('Skriv inn bredden på trappa for å få materiallista.');
  if (!positiv(vangeTykkelse)) feil.push('Vangetykkelsen må være et tall større enn 0.');
  if (!(Number.isFinite(utstikk) && utstikk >= 0)) feil.push('Utstikket må være 0 eller mer.');
  if (!(Number.isFinite(kapptillegg) && kapptillegg >= 0)) feil.push('Kapptillegget må være 0 eller mer.');
  if (!(Number.isFinite(svinn) && svinn >= 0)) feil.push('Svinnet må være 0 eller mer.');
  if (antallVanger !== null && !(Number.isInteger(antallVanger) && antallVanger >= 2)) feil.push('Antall vanger må være minst 2.');
  if (stusstrinn && !(Number.isFinite(stusstrinn.tykkelse) && stusstrinn.tykkelse > 0)) feil.push('Skriv inn tykkelsen på stusstrinnene.');
  if (feil.length) return { ok: false, feil };

  // Vangene: senter til senter mellom de ytterste. Bredden er over ytterkant av vangene.
  const spenn = bredde - vangeTykkelse;
  if (spenn <= SLINGRING) {
    return { ok: false, feil: [`Trappa på ${en(bredde)} mm er for smal for to vanger på ${en(vangeTykkelse)} mm.`] };
  }
  const maks = maksAvstandVanger(trinnTykkelse, inn);
  const anbefalt = Math.max(2, Math.ceil(spenn / maks - SLINGRING) + 1);
  const antall = antallVanger ?? anbefalt;
  const avstand = spenn / (antall - 1);

  const m = l.antallInntrinn;
  const eget = m === l.antallOpptrinn;
  const varsler = [];
  if (avstand > maks + SLINGRING) {
    varsler.push({ niva: 'bor', type: 'vange-avstand', kilde: null,
      tekst: `Med ${antall} vanger blir avstanden mellom dem ${en(avstand)} mm. Bakøy bruker høyst ${en(maks)} mm `
        + `med ${en(trinnTykkelse)} mm trinn, altså ${anbefalt} vanger.` });
  }

  // Bitene, med kapptillegg
  const biter = [];
  const vangeDim = dimensjon(vangeTykkelse, vangeBredde);
  biter.push({ del: 'Vange', dim: vangeDim, antall, lengde: vange.emnelengde + kapptillegg, hel: true });
  const trinnBredde = bredde + 2 * utstikk;   // lengden på trinnene
  const trinnLengde = trinnBredde + kapptillegg;
  if (trinnbord) {
    biter.push({ del: 'Trinnbord', dim: dimensjon(trinnTykkelse, trinnbord.bredde), antall: m * trinnbord.antall, lengde: trinnLengde, hel: false });
  } else {
    // Trinnet er ikke gitt av bord: ett trinn per inntrinn, like dypt som inntrinn + nese
    const dybde = Math.ceil(l.inntrinn + nese - SLINGRING);
    const vanlige = eget ? m - 1 : m;
    if (vanlige > 0) biter.push({ del: 'Trinn', dim: dimensjon(trinnTykkelse, dybde), antall: vanlige, lengde: trinnLengde, hel: false });
    if (eget) biter.push({ del: 'Øverste trinn', dim: dimensjon(trinnTykkelse, Math.ceil(l.inntrinn - SLINGRING)), antall: 1, lengde: trinnLengde, hel: false });
  }

  // Tette opptrinn (fase T5): ett stusstrinn foran hvert hakk, festet på den loddrette flaten.
  // Det går fra trinnet under (eller gulvet) opp til undersiden av trinnet over: opptrinn − trinn.
  // Med dekket øverst er det øverste opptrinnet bjelken under dekket, så antallet er antall trinn.
  // Stusstrinnene er like lange som bredden over vangene.
  if (stusstrinn) {
    const r = stusstrinn.tykkelse;
    biter.push({ del: 'Stusstrinn', dim: dimensjon(r, Math.ceil(l.opptrinn - trinnTykkelse - SLINGRING)), antall: m,
      lengde: bredde + kapptillegg, hel: false });
    const synligNese = nese - r;
    varsler.push(synligNese < -SLINGRING
      ? { niva: 'bor', type: 'stusstrinn-nese', kilde: null,
        tekst: `Stusstrinnene er ${en(r)} mm tykke, mer enn nesa på ${en(nese)} mm. Trinnene stikker ikke fram foran stusstrinnene. Øk nesa eller bruk tynnere stusstrinn.` }
      : { niva: 'vite', type: 'stusstrinn-nese', kilde: null,
        tekst: `Med tette opptrinn stikker trinnet ${en(synligNese)} mm fram foran stusstrinnet (nesa ${en(nese)} minus ${en(r)} mm).` });
  }

  // Bestilling: vanger i stykk med minste lengde, trinn i løpemeter med svinn
  const linjer = biter.map((bit) => {
    if (bit.hel) return { ...bit, netto: (bit.antall * bit.lengde) / 1000, bestill: null };
    const netto = (bit.antall * bit.lengde) / 1000;
    return { ...bit, netto, medSvinn: netto * (1 + svinn / 100), bestill: Math.ceil(netto * (1 + svinn / 100) - SLINGRING) };
  });

  varsler.push({ niva: 'vite', type: 'vange-praksis', kilde: null,
    tekst: `Antall vanger er foreslått ut fra Bakøys praksis: høyst ${en(inn.maksAvstandVangerTynn)} mm mellom vangene med trinn `
      + `under ${en(inn.tykkeTrinnFra)} mm og ${en(inn.maksAvstandVangerTykk)} mm med tykkere trinn. Appen regner ikke bæreevne.` });

  return { ok: true, anbefaltVanger: anbefalt, antallVanger: antall, avstandVanger: avstand, maksAvstand: maks,
    trinnLengde: trinnBredde, linjer, varsler, kapptillegg, svinn };
}

// Lista som ren tekst, til å kopiere eller dele (SMS, e-post) med trelast
export function trappMaterialTekst(liste, { tittel = 'Trapp' } = {}) {
  const tall = (x, d = 0) => x.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const ut = [`${tittel} – Bakøy Entreprenør AS`, '', 'Bestilling:'];
  for (const l of liste.linjer) {
    ut.push(l.hel
      ? `${l.del} ${l.dim.navn} mm: ${l.antall} stk, hver minst ${tall(l.lengde)} mm lang`
      : `${l.del} ${l.dim.navn} mm: ${tall(l.bestill)} lm`);
  }
  const lm = liste.linjer.filter((l) => !l.hel);
  if (lm.length) {
    ut.push('', `Netto ${lm.map((l) => `${tall(l.netto, 1)} lm ${l.dim.navn}`).join(', ')}, pluss ${tall(liste.svinn)} % svinn.`);
  }
  ut.push(`Kapptillegg ${tall(liste.kapptillegg)} mm per bit. ${liste.antallVanger} vanger, ${tall(liste.avstandVanger)} mm mellom (senter til senter).`);
  ut.push('', 'Kappliste:');
  for (const l of liste.linjer) ut.push(`  ${l.antall} stk ${tall(l.lengde)} mm ${l.del.toLowerCase()} ${l.dim.navn}`);
  return ut.join('\n');
}
