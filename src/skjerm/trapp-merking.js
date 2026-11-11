// Stegene i «Se det steg for steg»: hvordan vangen merkes, ett grep om gangen.
// Bare tekst og rekkefølge her. Målene kommer fra vange.js, tegningen fra tegnMerkesteg.
//
// Rekkefølge: bordet og spiss 0, én spiss om gangen (med hjelpespissen øverst), ett hakk om
// gangen med vinkelen, bunnen, toppen, kapping, og til slutt vangen reist i trappa.

import { mm } from './format.js';

export function lagMerkesteg(vange, l, { nese = 20, trinnTykkelse = 28 } = {}) {
  if (vange.type === 'hel') return lagMerkestegHel(vange, l, { nese, trinnTykkelse });
  const h = mm(l.opptrinn, 1);
  const b = mm(l.inntrinn, 1);
  const m = vange.hakk.length;
  const eget = l.antallInntrinn === l.antallOpptrinn;
  const steg = [];

  steg.push({ type: 'bord', nr: 0, tittel: 'Bordet',
    tekst: `Legg bordet på bukkene med overkanten mot deg. Mål ${mm(vange.spissFraEnden)} mm fra venstre ende `
      + 'langs overkanten og sett et merke. Det er spiss 0. Alle andre mål tas fra den.' });

  vange.merker.forEach((merke, i) => {
    if (i === 0) return;
    steg.push({ type: 'spiss', nr: i, tittel: merke.hjelp ? `Spiss ${i} (hjelpespiss)` : `Spiss ${i}`,
      tekst: `Mål ${mm(merke.avstand)} mm fra spiss 0 langs overkanten og sett et merke.`
        + (merke.hjelp ? ' Denne trengs bare for å tegne øverste hakk, og kappes bort.' : '') });
  });

  for (let k = 1; k <= m; k++) {
    steg.push({ type: 'hakk', nr: k, tittel: `Hakk ${k} av ${m}`,
      tekst: `Legg vinkelen med ${b} mm mot spiss ${k - 1} og ${h} mm mot spiss ${k}. Tegn langs begge armene.`
        + (k === 1 ? ` Streken for inntrinnet${l.inntrinn > l.opptrinn ? ' (den lange)' : ''} er der trinnet ligger.` : '') });
  }

  steg.push({ type: 'bunn', nr: 0, tittel: 'Bunnen',
    tekst: `Tegn opptrinnet fra spiss 0 og nedover, men bare ${mm(vange.nedersteOpptrinn, 1)} mm, fordi trinnet `
      + `ligger oppå. Tegn bunnkuttet derfra i rett vinkel ut til underkanten (${mm(vange.fot)} mm).` });

  steg.push({ type: 'topp', nr: 0, tittel: 'Toppen',
    tekst: (eget
      ? `Gå ${mm(vange.toppkutt.foranBakkant)} mm tilbake fra innerste hjørne i hakk ${m}, langs inntrinnet. Tegn en strek derfra i rett vinkel ned til underkanten.`
      : `Forleng opptrinnet i hakk ${m} fra innerste hjørne og ned til underkanten.`)
      + ` Toppkuttet blir ${mm(vange.toppkutt.lengde)} mm.` });

  steg.push({ type: 'kapp', nr: 0, tittel: 'Kapp',
    tekst: 'Kapp langs strekene. Det hvite med stiplet kant kappes bort, også hjelpespissen.' });

  steg.push({ type: 'reis', nr: 0, tittel: 'Slik står den',
    tekst: `Reist i trappa blir inntrinnene vannrette. Trinnene ligger oppå og stikker ${mm(nese)} mm fram (nesa).` });

  return steg;
}

// De fem stegene i «Slik merker du vangen», som tekst med mål. Brukes både på skjermen og i
// utskriften, så teksten er lik begge steder. Tegningene legges til av den som viser stegene.
export function lagVangeSteg(vange, l, { trinnTykkelse = 28, beleggNede = 0, nese = 20 } = {}) {
  if (vange.type === 'hel') return lagVangeStegHel(vange, l, { trinnTykkelse, beleggNede, nese });
  const eget = l.antallInntrinn === l.antallOpptrinn;
  const h = mm(l.opptrinn, 1);
  const b = mm(l.inntrinn, 1);
  const t = mm(trinnTykkelse);
  const bunnGrunn = beleggNede > 0
    ? `${h} minus ${t} mm trinntykkelse, pluss ${mm(beleggNede)} mm belegg som legges senere`
    : `${h} minus ${t} mm, fordi trinnet ligger oppå`;
  return [
    { id: 'spisser', tittel: 'Merk spissene.',
      tekst: `Mål ${mm(vange.spissFraEnden)} mm fra enden av bordet langs overkanten. Det er nederste spiss (0). `
        + 'Merk resten av spissene med målene under. Alle mål er fra 0, ikke fra forrige merke.' },
    { id: 'hakk', tittel: 'Tegn hakkene.',
      tekst: `Sett av <strong>${b} mm</strong> (inntrinn) på den ene armen av vinkelen og <strong>${h} mm</strong> `
        + '(opptrinn) på den andre. Legg vinkelen på vangen så de to målene treffer to spisser ved siden av hverandre, '
        + 'og tegn langs armene. Gjør det for hvert hakk. Streken for inntrinnet er der trinnet ligger.' },
    { id: 'bunn', tittel: 'Tegn bunnen.',
      tekst: `Tegn streken for opptrinnet fra spiss 0 og nedover, men bare <strong>${mm(vange.nedersteOpptrinn, 1)} mm</strong> `
        + `(${bunnGrunn}). Tegn bunnkuttet derfra i rett vinkel, parallelt med inntrinnene, ut til underkanten. `
        + `Det blir ${mm(vange.fot)} mm langt.` },
    { id: 'topp', tittel: 'Tegn toppen.',
      tekst: `${eget
        ? `Gå ${mm(vange.toppkutt.foranBakkant)} mm tilbake fra innerste hjørne i øverste hakk, langs streken for inntrinnet. `
          + 'Tegn en strek derfra i rett vinkel ned til underkanten. Der begynner dekket.'
        : 'Forleng streken for opptrinnet i øverste hakk, fra innerste hjørne og ned til underkanten.'} `
        + `Toppkuttet blir ${mm(vange.toppkutt.lengde)} mm langt.` },
    { id: 'kapp', tittel: 'Kapp og prøv.',
      tekst: `Kapp langs strekene. Legg et trinn i et hakk: forkanten av trinnet skal stikke ${mm(nese)} mm forbi `
        + `streken for opptrinnet.${eget ? '' : ` Dekket må stikke like mye (${mm(nese)} mm) ut foran bjelken, ellers blir øverste inntrinn feil.`}` },
  ];
}

// Hel vange (fase T6): trinnene står mellom vangene. Spissene ligger på en hjelpelinje gjennom
// forkantene av trinnene, og strekene viser overkant og underkant trinn på innsiden av vangen.
function hjelpTekst(vange, l, { trinnTykkelse, beleggNede, nese }) {
  const k = vange.kuttMal;
  const m = vange.hakk.length;
  const eget = l.antallInntrinn === l.antallOpptrinn;
  return {
    m, eget, k,
    h: mm(l.opptrinn, 1), b: mm(l.inntrinn, 1), t: mm(trinnTykkelse), n: mm(nese),
    linje: mm(vange.linje, 1),
    gulv: `${mm(k.fraSpissTilGulv, 1)} mm${beleggNede > 0 ? ` (opptrinnet pluss ${mm(beleggNede)} mm gulv som legges senere)` : ''}`,
  };
}

function lagVangeStegHel(vange, l, valg) {
  const x = hjelpTekst(vange, l, valg);
  return [
    { id: 'spisser', tittel: 'Tegn hjelpelinja og merk spissene.',
      tekst: `Tegn en strek langs vangen <strong>${x.linje} mm</strong> inn fra overkanten. Den går gjennom forkantene av trinnene. `
        + `Mål ${mm(vange.spissFraEnden)} mm fra enden av bordet langs hjelpelinja: det er spiss 0. Merk resten av spissene `
        + 'på hjelpelinja med målene under. Alle mål er fra 0, ikke fra forrige merke.' },
    { id: 'hakk', tittel: 'Tegn trinnene.',
      tekst: `Sett av <strong>${x.b} mm</strong> (inntrinn) og <strong>${x.h} mm</strong> (opptrinn) på vinkelen. Legg den på `
        + 'hjelpelinja så målene treffer to spisser ved siden av hverandre. Tegn langs armen for inntrinnet og forleng '
        + `streken ${x.n} mm bakover: det er overkant trinn. Tegn underkant trinn ${x.t} mm under, parallelt. Gjør det for hvert trinn`
        + `${x.eget ? `, men øverste trinn er bare ${x.b} mm dypt (det slutter mot dekket)` : ''}.` },
    { id: 'bunn', tittel: 'Tegn bunnen.',
      tekst: 'Tegn streken for opptrinnet gjennom spiss 0, fra overkanten og ned. Den er kuttet foran. '
        + `Mål ${x.gulv} ned fra spiss 0 langs den: der står vangen. Tegn bunnkuttet derfra i rett vinkel, parallelt med `
        + `trinnene, ut til underkanten (${mm(x.k.bunnVannrett)} mm).` },
    { id: 'topp', tittel: 'Tegn toppen.',
      tekst: x.eget
        ? `Forleng overkant av øverste trinn forover til overkanten av vangen. Det er det vannrette kuttet (${mm(x.k.toppVannrett)} mm), `
          + `i høyde med dekket. Der øverste trinn slutter, ${x.b} mm bak spiss ${x.m - 1}, tegner du en loddrett strek ned til `
          + `underkanten: kutt mot bjelken (${mm(x.k.toppLodd)} mm).`
        : `Tegn streken for inntrinnet fra hjelpespissen (spiss ${x.m}), som for et trinn. Den er overkant dekke. Tegn en strek `
          + `${x.t} mm under, parallelt, fra overkanten av vangen: det vannrette kuttet (${mm(x.k.toppVannrett)} mm). Gå ${x.n} mm `
          + `bakover fra hjelpespissen langs streken og tegn en loddrett strek ned til underkanten: kutt mot bjelken (${mm(x.k.toppLodd)} mm).` },
    { id: 'kapp', tittel: 'Kapp og fest.',
      tekst: 'Kapp bunnen og toppen. Resten av vangen er hel. Fest trinnene mellom vangene med overkant trinn på den '
        + `øverste streken.${x.eget ? '' : ` Dekket må stikke ${x.n} mm ut foran bjelken, like mye som nesa på trinnene.`}` },
  ];
}

function lagMerkestegHel(vange, l, valg) {
  const x = hjelpTekst(vange, l, valg);
  const steg = [];
  steg.push({ type: 'bord', nr: 0, tittel: 'Bordet og hjelpelinja',
    tekst: `Legg bordet på bukkene med overkanten mot deg. Tegn en hjelpelinje ${x.linje} mm inn fra overkanten. `
      + `Mål ${mm(vange.spissFraEnden)} mm fra venstre ende langs hjelpelinja og sett et merke: spiss 0.` });
  vange.merker.forEach((merke, i) => {
    if (i === 0) return;
    steg.push({ type: 'spiss', nr: i, tittel: merke.hjelp ? `Spiss ${i} (hjelpespiss)` : `Spiss ${i}`,
      tekst: `Mål ${mm(merke.avstand)} mm fra spiss 0 langs hjelpelinja og sett et merke.`
        + (merke.hjelp ? ' Den trengs for å tegne øverste trinn og toppen, og kappes bort.' : '') });
  });
  for (let k = 1; k <= x.m; k++) {
    const siste = x.eget && k === x.m;
    steg.push({ type: 'hakk', nr: k, tittel: `Trinn ${k} av ${x.m}`,
      tekst: `Legg vinkelen med ${x.b} mm mot spiss ${k - 1} og ${x.h} mm mot spiss ${k}. Tegn langs armen for inntrinnet`
        + `${siste ? '' : ` og forleng ${x.n} mm bakover`}: overkant trinn. Tegn underkant trinn ${x.t} mm under.` });
  }
  steg.push({ type: 'bunn', nr: 0, tittel: 'Bunnen',
    tekst: `Tegn opptrinnet gjennom spiss 0 fra overkanten og ned (kuttet foran). Mål ${x.gulv} ned fra spiss 0: der står vangen. `
      + `Tegn bunnkuttet derfra i rett vinkel ut til underkanten (${mm(x.k.bunnVannrett)} mm).` });
  steg.push({ type: 'topp', nr: 0, tittel: 'Toppen',
    tekst: x.eget
      ? `Forleng overkant av øverste trinn forover til overkanten: vannrett kutt (${mm(x.k.toppVannrett)} mm). Der trinnet slutter, `
        + `loddrett ned til underkanten: kutt mot bjelken (${mm(x.k.toppLodd)} mm).`
      : `Fra hjelpespissen: overkant dekke, og ${x.t} mm under den det vannrette kuttet (${mm(x.k.toppVannrett)} mm). ${x.n} mm `
        + `bak hjelpespissen: loddrett ned til underkanten, kutt mot bjelken (${mm(x.k.toppLodd)} mm).` });
  steg.push({ type: 'kapp', nr: 0, tittel: 'Kapp',
    tekst: 'Kapp bunnen og toppen. Det hvite med stiplet kant kappes bort. Resten av vangen er hel, med strekene for trinnene.' });
  steg.push({ type: 'reis', nr: 0, tittel: 'Slik står den',
    tekst: `Reist i trappa blir strekene vannrette. Trinnene står mellom vangene og stikker ${x.n} mm fram over trinnet under.` });
  return steg;
}
