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
// Feltene som ikke går opp, får rød skravur så de er lette å finne.
export function tegnVegg(vegg) {
  const { lengde: W, hoyde: H, felt, apninger } = vegg;
  const kant = W * 0.02;
  const skrift = Math.max(W, H) * 0.028;
  const strek = Math.max(W, H) * 0.0012;
  const yMal = H + kant * 2;
  const hoyde = yMal + skrift * 1.6;
  const y = (verdi) => H - verdi; // SVG teller ovenfra, veggen nedenfra

  const deler = [];
  deler.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bakgrunn)" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);

  for (const f of felt) {
    if (!f.ok) {
      const til = f.x1 ?? f.x0;
      deler.push(`<rect data-feil="ja" x="${f.x0}" y="${y(f.y1)}" width="${Math.max(til - f.x0, 0)}" height="${f.y1 - f.y0}" fill="var(--feil-flate)" stroke="var(--feil-tekst)" stroke-width="${strek * 2}" stroke-dasharray="${strek * 6} ${strek * 4}"/>`);
      continue;
    }
    for (const [liste, type] of [[f.underliggere, 'u'], [f.overliggere, 'o']]) {
      for (const b of liste) {
        const fyll = type === 'u' ? 'var(--underligger)' : 'var(--overligger)';
        deler.push(`<rect data-bord="${type}" x="${b.fraEksakt}" y="${y(f.y1)}" width="${b.tilEksakt - b.fraEksakt}" height="${f.y1 - f.y0}" fill="${fyll}" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
      }
    }
  }

  // Åpningene tegnes oppå, med navn i midten
  for (const a of apninger) {
    deler.push(`<rect data-apning="${a.navn}" x="${a.x}" y="${y(a.bunn + a.hoyde)}" width="${a.bredde}" height="${a.hoyde}" fill="var(--flate)" stroke="var(--tekst)" stroke-width="${strek * 2}"/>`);
    deler.push(`<text x="${a.x + a.bredde / 2}" y="${y(a.bunn + a.hoyde / 2) + skrift * 0.35}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${a.navn}</text>`);
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
