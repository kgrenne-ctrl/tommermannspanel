// Tegner ett felt som SVG ut fra en løsning fra solver.js. Ingen regning av kledning her.
//
// Øverst: feltet sett forfra (slik veggen ser ut).
// Under:  snitt sett ovenfra, med veggen nederst. Underliggerne ligger inn mot veggen,
//         overliggerne utenpå. Der viser omlegget og klaringen seg tydelig.
//
// Tegningen bruker mm som enhet, så bordene står i riktig skala. Tykkelser, skrift og
// streker regnes ut fra feltlengden, så tegningen ser lik ut på korte og lange felt.

import { mm } from './format.js';

export function tegnFelt(losning) {
  const { L, underliggere, overliggere, trengerUnderlag } = losning;

  const kant = L * 0.03;           // luft rundt tegningen
  const skrift = L * 0.04;
  const strek = L * 0.0025;
  const hoydeForfra = L * 0.3;
  const tykkelse = L * 0.05;       // bordtykkelse i snittet (overdrevet så den synes)

  const yForfra = kant;
  const ySnittO = yForfra + hoydeForfra + kant * 1.5;  // overliggere (utenpå)
  const ySnittU = ySnittO + tykkelse;                  // underliggere (inn mot vegg)
  const yVegg = ySnittU + tykkelse;
  const yMal = yVegg + kant * 1.2;
  const hoyde = yMal + skrift * 1.6;
  const bredde = L + 2 * kant;

  const deler = [];

  // Feltet sett forfra: underliggere først, overliggere oppå.
  for (const b of underliggere) {
    deler.push(rekt(b, yForfra, hoydeForfra, 'u', strek));
  }
  for (const b of overliggere) {
    deler.push(rekt(b, yForfra, hoydeForfra, 'o', strek));
  }

  // Snitt sett ovenfra
  for (const b of underliggere) deler.push(rekt(b, ySnittU, tykkelse, 'u', strek));
  for (const b of overliggere) deler.push(rekt(b, ySnittO, tykkelse, 'o', strek));

  // Markering der overliggeren i kanten mangler underlag
  const forsteU = underliggere[0];
  const sisteU = underliggere[underliggere.length - 1];
  if (trengerUnderlag.start) {
    deler.push(underlag(0, forsteU.fraEksakt, ySnittU, tykkelse, strek));
  }
  if (trengerUnderlag.slutt) {
    deler.push(underlag(sisteU.tilEksakt, L, ySnittU, tykkelse, strek));
  }

  // Veggen
  deler.push(`<line x1="0" y1="${yVegg}" x2="${L}" y2="${yVegg}" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);

  // Målsetting av hele feltet
  const pil = skrift * 0.4;
  deler.push(
    `<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="0" y1="${yMal}" x2="${L}" y2="${yMal}"/>`
    + `<line x1="0" y1="${yMal - pil}" x2="0" y2="${yMal + pil}"/>`
    + `<line x1="${L}" y1="${yMal - pil}" x2="${L}" y2="${yMal + pil}"/>`
    + '</g>',
    `<text x="${L / 2}" y="${yMal + skrift * 1.3}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${mm(L)} mm</text>`,
  );

  return `<svg class="tegning" viewBox="${-kant} 0 ${bredde} ${hoyde}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tegning av feltet, ${underliggere.length} underliggere og ${overliggere.length} overliggere">`
    + deler.join('')
    + '</svg>';
}

function rekt(b, y, h, type, strek) {
  const fyll = type === 'u' ? 'var(--underligger)' : 'var(--overligger)';
  return `<rect data-bord="${type}" x="${b.fraEksakt}" y="${y}" width="${b.tilEksakt - b.fraEksakt}" height="${h}" fill="${fyll}" stroke="var(--bord-kant)" stroke-width="${strek}"/>`;
}

function underlag(fra, til, y, h, strek) {
  return `<rect data-underlag="ja" x="${fra}" y="${y}" width="${til - fra}" height="${h}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="${strek * 2}" stroke-dasharray="${strek * 4} ${strek * 3}"/>`;
}

// Tegner hele veggen sett forfra ut fra resultatet av losVegg(). Bakken er nederst.
// Karmene tegnes først og bordene oppå, så det synes at bordet går inn på karmen.
// Feltene som ikke går opp, får rød stiplet ramme. Er snittHoyde gitt, vises den som en
// stiplet linje (A–A), så man ser hvor horisontalsnittet er tatt.
export function tegnVegg(vegg, snittHoyde = null) {
  const { lengde: W, hoyde: H, felt, apninger } = vegg;
  const kant = W * 0.02;
  const skrift = Math.max(W, H) * 0.028;
  const strek = Math.max(W, H) * 0.0012;
  const yMal = H + kant * 2;
  const hoyde = yMal + skrift * 1.6;
  const y = (verdi) => H - verdi; // SVG teller ovenfra, veggen nedenfra
  const karmbredde = 60;

  const deler = [];
  deler.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bakgrunn)" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);

  // Karm (utvendig karmmål) med glass/dørblad innenfor
  for (const a of apninger) {
    deler.push(`<rect data-apning="${a.navn}" x="${a.x}" y="${y(a.bunn + a.hoyde)}" width="${a.bredde}" height="${a.hoyde}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek * 2}"/>`);
    deler.push(`<rect x="${a.x + karmbredde}" y="${y(a.bunn + a.hoyde) + karmbredde}" width="${Math.max(a.bredde - 2 * karmbredde, 0)}" height="${Math.max(a.hoyde - 2 * karmbredde, 0)}" fill="var(--glass)" stroke="var(--tekst-gra)" stroke-width="${strek}"/>`);
  }

  for (const f of felt) {
    if (!f.ok) {
      const til = f.x1 ?? f.x0;
      deler.push(`<rect data-feil="ja" x="${f.x0}" y="${y(f.y1)}" width="${Math.max(til - f.x0, 0)}" height="${f.y1 - f.y0}" fill="var(--feil-flate)" stroke="var(--feil-tekst)" stroke-width="${strek * 2}" stroke-dasharray="${strek * 6} ${strek * 4}"/>`);
    }
  }
  // Alle underbord først, så alle påbord. Ellers kan et underbord i feltet over et vindu
  // bli tegnet oppå påbordet fra feltet ved siden av, og det er omvendt i virkeligheten.
  for (const [type, fyll] of [['u', 'var(--underligger)'], ['o', 'var(--overligger)']]) {
    for (const f of felt.filter((x) => x.ok)) {
      for (const b of type === 'u' ? f.underliggere : f.overliggere) {
        deler.push(`<rect data-bord="${type}" x="${b.fraEksakt}" y="${y(f.y1)}" width="${b.tilEksakt - b.fraEksakt}" height="${f.y1 - f.y0}" fill="${fyll}" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
      }
    }
  }

  for (const a of apninger) {
    deler.push(`<text x="${a.x + a.bredde / 2}" y="${y(a.bunn + a.hoyde / 2) + skrift * 0.35}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${a.navn}</text>`);
  }

  // Nummer på hvert felt (samme nummer som i lista under tegningen). Sirkelen krymper i
  // lave felt, for eksempel over en dør, så den holder seg innenfor feltet.
  felt.forEach((f, i) => {
    const x1 = f.x1 ?? f.x0;
    const cx = (f.x0 + x1) / 2;
    const cy = y((f.y0 + f.y1) / 2);
    const r = Math.min(skrift * 0.75, ((f.y1 - f.y0) / 2) * 0.9, ((x1 - f.x0) / 2) * 0.9);
    const ramme = f.ok ? 'var(--bakoy-bla)' : 'var(--feil-tekst)';
    deler.push(`<g data-feltnr="${i + 1}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--hvit)" stroke="${ramme}" stroke-width="${strek * 2}"/>`
      + `<text x="${cx}" y="${cy + r * 0.42}" font-size="${r * 1.2}" font-weight="700" text-anchor="middle" fill="${ramme}">${i + 1}</text></g>`);
  });

  if (snittHoyde !== null) {
    deler.push(`<line data-snitt="ja" x1="${-kant}" y1="${y(snittHoyde)}" x2="${W + kant}" y2="${y(snittHoyde)}" stroke="var(--bakoy-oransje)" stroke-width="${strek * 3}" stroke-dasharray="${strek * 10} ${strek * 5}"/>`);
    deler.push(`<text x="${W}" y="${y(snittHoyde) - skrift * 0.4}" font-size="${skrift}" text-anchor="end" fill="var(--tekst)" font-weight="700">A–A</text>`);
  }

  // Målsetting av veggen
  const pil = skrift * 0.4;
  deler.push(
    `<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="0" y1="${yMal}" x2="${W}" y2="${yMal}"/>`
    + `<line x1="0" y1="${yMal - pil}" x2="0" y2="${yMal + pil}"/>`
    + `<line x1="${W}" y1="${yMal - pil}" x2="${W}" y2="${yMal + pil}"/>`
    + '</g>',
    `<text x="${W / 2}" y="${yMal + skrift * 1.3}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${mm(W)} mm</text>`,
  );

  return `<svg class="tegning" viewBox="${-kant} ${-kant} ${W + 2 * kant} ${hoyde + kant}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tegning av veggen med ${apninger.length} åpninger">`
    + deler.join('')
    + '</svg>';
}

// Horisontalsnitt A–A i høyden snittHoyde, sett ovenfra. Utsiden er opp, veggen nederst.
// Underbordene ligger inn mot veggen, påbordene utenpå. Bordtykkelsen er overdrevet (40 mm)
// så den synes, men alle mål langs veggen er i riktig skala.
// Tegningen er bred (målestokk ca. 1:8 på skjermen) og ligger i en boks man kan skyve sidelengs.
export function tegnSnitt(vegg, snittHoyde) {
  const { lengde: W, felt, apninger, karmBord } = vegg;
  const t = 40;                  // tegnet bordtykkelse
  const skrift = 100;
  const strek = 3;
  const kant = 150;
  const yO = skrift * 2;         // påbord (ytterst)
  const yU = yO + t;             // underbord
  const yVegg = yU + t;          // lekt/vegg
  const karmTopp = karmBord === 'O' ? yU : yVegg; // bordet som går inn på karmen ligger oppå den
  const karmBunn = yVegg + 120;
  const yMal = karmBunn + skrift * 1.5;
  const hoyde = yMal + skrift * 1.6;
  const pxPerMm = 0.12;

  const deler = [];
  deler.push(`<line x1="0" y1="${yVegg}" x2="${W}" y2="${yVegg}" stroke="var(--tekst-gra)" stroke-width="${strek * 3}"/>`);

  // Åpninger som snittet går gjennom: karm og glass
  const gjennom = apninger.filter((a) => snittHoyde > a.bunn && snittHoyde < a.bunn + a.hoyde);
  for (const a of gjennom) {
    deler.push(`<rect data-karm="${a.navn}" x="${a.x}" y="${karmTopp}" width="${a.bredde}" height="${karmBunn - karmTopp}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek}"/>`);
    deler.push(`<line x1="${a.x + 60}" y1="${(karmTopp + karmBunn) / 2}" x2="${a.x + a.bredde - 60}" y2="${(karmTopp + karmBunn) / 2}" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);
    deler.push(`<text x="${a.x + a.bredde / 2}" y="${karmBunn + skrift * 1.1}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${a.navn}</text>`);
  }

  // Feltene som finnes i denne høyden
  const aktive = felt.filter((f) => snittHoyde >= f.y0 && snittHoyde <= f.y1);
  for (const f of aktive) {
    if (!f.ok) {
      deler.push(`<rect data-feil="ja" x="${f.x0}" y="${yO}" width="${Math.max((f.x1 ?? f.x0) - f.x0, 0)}" height="${2 * t}" fill="var(--feil-flate)" stroke="var(--feil-tekst)" stroke-width="${strek}" stroke-dasharray="12 8"/>`);
      continue;
    }
    for (const b of f.underliggere) {
      deler.push(`<rect data-bord="u" x="${b.fraEksakt}" y="${yU}" width="${b.tilEksakt - b.fraEksakt}" height="${t}" fill="var(--underligger)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    }
    for (const b of f.overliggere) {
      deler.push(`<rect data-bord="o" x="${b.fraEksakt}" y="${yO}" width="${b.tilEksakt - b.fraEksakt}" height="${t}" fill="var(--overligger)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    }
  }

  // Der påbordet mangler underbord bak seg (mot karm eller i hjørnet): kloss/underlag
  const underbord = aktive.filter((f) => f.ok).flatMap((f) => f.underliggere)
    .sort((a, b) => a.fraEksakt - b.fraEksakt);
  const kloss = (fra, til) => {
    if (til - fra > 1) {
      deler.push(`<rect data-kloss="ja" x="${fra}" y="${yU}" width="${til - fra}" height="${t}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="${strek * 2}" stroke-dasharray="10 6"/>`);
    }
  };
  if (karmBord === 'O') {
    for (const a of gjennom) {
      const venstreU = underbord.filter((b) => b.tilEksakt <= a.x + 1).at(-1);
      const hoyreU = underbord.find((b) => b.fraEksakt >= a.x + a.bredde - 1);
      if (venstreU) kloss(venstreU.tilEksakt, a.x);
      if (hoyreU) kloss(a.x + a.bredde, hoyreU.fraEksakt);
    }
  }
  if (vegg.hjorneVenstre === 'O' && underbord.length) kloss(0, underbord[0].fraEksakt);
  if (vegg.hjorneHoyre === 'O' && underbord.length) kloss(underbord.at(-1).tilEksakt, W);

  // Innlegg på karm skrevet over karmkantene
  for (const a of gjennom) {
    for (const [x, e, anker] of [[a.x, a.innlegg.venstre, 'start'], [a.x + a.bredde, a.innlegg.hoyre, 'end']]) {
      deler.push(`<text x="${x}" y="${yO - skrift * 0.5}" font-size="${skrift * 0.8}" text-anchor="${anker}" fill="var(--tekst)">${mm(e, 1)}</text>`);
    }
  }

  const pil = skrift * 0.4;
  deler.push(
    `<g stroke="var(--tekst)" stroke-width="${strek}">`
    + `<line x1="0" y1="${yMal}" x2="${W}" y2="${yMal}"/>`
    + `<line x1="0" y1="${yMal - pil}" x2="0" y2="${yMal + pil}"/>`
    + `<line x1="${W}" y1="${yMal - pil}" x2="${W}" y2="${yMal + pil}"/>`
    + '</g>',
    `<text x="${W / 2}" y="${yMal + skrift * 1.3}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${mm(W)} mm</text>`,
  );

  const bredde = W + 2 * kant;
  return `<svg class="snitt" width="${Math.round(bredde * pxPerMm)}" height="${Math.round((hoyde + kant) * pxPerMm)}" viewBox="${-kant} 0 ${bredde} ${hoyde + kant}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horisontalsnitt i høyde ${Math.round(snittHoyde)} mm">`
    + deler.join('')
    + '</svg>';
}
