// Materialliste og kappliste for et hus (PLAN.md punkt 4, fase 5, Kenny 2026-11-09).
// Ingen skjermkode her, bare regning. Mål i mm, løpemeter i m.
//
// - Det bestilles i løpemeter per dimensjon (tykkelse × bredde). Trelast leverer lengdene.
// - Hvert bord er like langt som delen av veggen det dekker (full høyde, eller høyden over
//   eller under en åpning), pluss et kapptillegg per bord for kapping og tilpasning.
// - Svinn legges på til slutt, og bestilt mengde rundes opp til hel meter.

export const STANDARD_MATERIALER = Object.freeze({
  kapptillegg: 50, // mm per bord
  svinn: 10,       // prosent
});

// Nøkkel og navn for en dimensjon, for eksempel «19 × 148»
export function dimensjon(tykkelse, bredde) {
  return { nokkel: `${tykkelse}x${bredde}`, navn: `${fmt(tykkelse)} × ${fmt(bredde)}`, tykkelse, bredde };
}

const fmt = (tall) => String(Math.round(tall * 10) / 10).replace('.', ',');

// vegger: resultater fra losHus (null eller med feil hoppes over).
// priser: { '19x148': kr per løpemeter } (valgfritt).
export function lagMaterialliste(vegger, { kapptillegg = STANDARD_MATERIALER.kapptillegg,
  svinn = STANDARD_MATERIALER.svinn, priser = {} } = {}) {
  const sum = new Map();   // dimensjon -> { dim, antall, mm }
  const kappliste = [];    // per vegg: { navn, felt: [{ nr, navn, biter: [{ dim, lengde, antall, del }] }] }
  const mangler = [];      // felt som ikke går opp
  let vegg = 0;

  for (const r of vegger) {
    vegg++;
    if (!r || r.feil) continue;
    const navn = r.navn ?? `Vegg ${vegg}`;
    const dimU = dimensjon(r.tykkelse?.under ?? 19, r.bu);
    const dimO = dimensjon(r.tykkelse?.over ?? 19, r.bo);
    const veggListe = { navn, felt: [] };

    r.felt.forEach((f, i) => {
      if (!f.ok) {
        mangler.push(`${navn}: ${i + 1}. ${f.navn}`);
        return;
      }
      const biter = new Map(); // dim + lengde + del -> bit
      const leggTil = (dim, antall) => {
        if (antall === 0) return;
        f.deler.forEach(([y0, y1], d) => {
          const lengde = Math.ceil(y1 - y0 - 1e-9) + kapptillegg;
          const del = delNavn(f, y0);
          const nokkel = `${dim.nokkel}|${lengde}|${del}|${d}`;
          const bit = biter.get(nokkel) ?? { dim, lengde, antall: 0, del };
          bit.antall += antall;
          biter.set(nokkel, bit);
          const s = sum.get(dim.nokkel) ?? { dim, antall: 0, mm: 0 };
          s.antall += antall;
          s.mm += antall * lengde;
          sum.set(dim.nokkel, s);
        });
      };
      leggTil(dimU, f.underliggere.length);
      leggTil(dimO, f.overliggere.length);
      const kloyves = Object.values(f.hjornebord ?? {}).map((h) => ({
        dim: h.type === 'O' ? dimO : dimU, bredde: h.bredde, klyvd: h.klyvd, tekst: 'Hjørnebord' }));
      if (f.losning.kloyvdUnderbord) {
        const k = f.losning.kloyvdUnderbord;
        kloyves.push({ dim: dimU, bredde: k.bredde, antall: k.antall, tekst: `${k.antall} underbord` });
      }
      veggListe.felt.push({ nr: i + 1, navn: f.navn, biter: [...biter.values()], kloyves });
    });
    kappliste.push(veggListe);
  }

  const linjer = [...sum.values()]
    .sort((a, b) => a.dim.tykkelse - b.dim.tykkelse || a.dim.bredde - b.dim.bredde)
    .map(({ dim, antall, mm }) => {
      const netto = mm / 1000;
      const medSvinn = netto * (1 + svinn / 100);
      const bestill = Math.ceil(medSvinn - 1e-9);
      const pris = Number.isFinite(priser[dim.nokkel]) ? priser[dim.nokkel] : null;
      return { dim, antallBiter: antall, netto, medSvinn, bestill, pris, belop: pris === null ? null : bestill * pris };
    });

  const belop = linjer.some((l) => l.belop !== null)
    ? linjer.reduce((s, l) => s + (l.belop ?? 0), 0) : null;

  return { linjer, kappliste, mangler, kapptillegg, svinn, belop };
}

// Full høyde ved siden av åpningene. Over og under en åpning: delen som starter på bakken
// er under åpningen, den andre er over.
function delNavn(f, y0) {
  if (f.type === 'side') return 'Full høyde';
  return y0 < 1e-6 ? 'Under' : 'Over';
}

// Lista som ren tekst, til å kopiere eller dele (SMS, e-post) med trelast.
export function materialTekst(liste, { tittel = 'Tømmermannskledning', hjorner = [] } = {}) {
  const tall = (x, d = 0) => x.toLocaleString('nb-NO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const ut = [`${tittel} – Bakøy Entreprenør AS`, ''];
  ut.push('Bestilling (løpemeter):');
  for (const l of liste.linjer) {
    let linje = `${l.dim.navn} mm: ${tall(l.bestill)} lm`;
    if (l.belop !== null) linje += ` à ${tall(l.pris, 2)} kr = ${tall(l.belop, 2)} kr`;
    ut.push(linje);
  }
  if (liste.belop !== null) {
    const alle = liste.linjer.every((l) => l.belop !== null);
    ut.push(`${alle ? 'Sum' : 'Sum for linjene med pris'}: ${tall(liste.belop, 2)} kr`);
  }
  ut.push('', `Netto ${liste.linjer.map((l) => `${tall(l.netto, 1)} lm ${l.dim.navn}`).join(', ')}, `
    + `pluss ${tall(liste.svinn)} % svinn. Kapptillegg ${tall(liste.kapptillegg)} mm per bord.`);
  if (liste.mangler.length) {
    ut.push('', 'OBS: Disse feltene går ikke opp og er ikke med:', ...liste.mangler.map((m) => `- ${m}`));
  }
  if (hjorner.length) {
    ut.push('', 'Hjørner:');
    for (const h of hjorner) ut.push(h.tittel, ...h.linjer.map((l) => `  ${l}`));
  }
  ut.push('', 'Kappliste:');
  for (const v of liste.kappliste) {
    ut.push(v.navn);
    for (const f of v.felt) {
      ut.push(`  ${f.nr}. ${f.navn}`);
      for (const b of f.biter) ut.push(`    ${b.antall} stk ${tall(b.lengde)} mm (${b.dim.navn}, ${b.del.toLowerCase()})`);
      for (const k of f.kloyves ?? []) ut.push(`    ${k.tekst ?? 'Hjørnebord'} ${k.dim.navn} kløyves til ${k.bredde.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mm bredde`);
    }
  }
  return ut.join('\n');
}
