// Tegner ett felt som SVG ut fra en løsning fra solver.js. Ingen regning av kledning her.
//
// Øverst: feltet sett forfra (slik veggen ser ut).
// Under:  snitt sett ovenfra, med veggen nederst. Underliggerne ligger inn mot veggen,
//         overliggerne utenpå. Der viser omlegget og klaringen seg tydelig.
//
// Tegningen bruker mm som enhet, så bordene står i riktig skala langs veggen. Skrift og
// streker regnes ut fra feltlengden, så tegningen ser lik ut på korte og lange felt.
// Bordtykkelsen i snittet er tegnet som TEGNET_TYKKELSE, omtrent det dobbelte av et vanlig
// bord, så den synes. Den følger ikke feltlengden: før var den 5 % av lengden, og i et felt
// på 8760 mm ble bordene da tegnet 438 mm tykke (Kenny 2026-11-10).

import { mm } from './format.js';

// Synlig karm rundt vinduer og dører i tegningene, i mm. Bare til pynt, ingen regning bygger på den.
const KARMBREDDE = 60;
// Bordtykkelsen i snittene sett ovenfra, i mm. Felles for ett felt og for veggsnittet A–A.
const TEGNET_TYKKELSE = 40;

export function tegnFelt(losning) {
  const { L, underliggere, overliggere, trengerUnderlag } = losning;

  const kant = L * 0.03;           // luft rundt tegningen
  const skrift = L * 0.04;
  const strek = L * 0.0025;
  const hoydeForfra = L * 0.3;
  const tykkelse = TEGNET_TYKKELSE;
  // I snittet er bordene tynne, så streken rundt dem må være tynnere enn i tegningen forfra
  const strekSnitt = Math.min(strek, tykkelse * 0.12);

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
  for (const b of underliggere) deler.push(rekt(b, ySnittU, tykkelse, 'u', strekSnitt));
  for (const b of overliggere) deler.push(rekt(b, ySnittO, tykkelse, 'o', strekSnitt));

  // Markering der overliggeren i kanten mangler underlag
  const forsteU = underliggere[0];
  const sisteU = underliggere[underliggere.length - 1];
  if (trengerUnderlag.start) {
    deler.push(underlag(0, forsteU.fraEksakt, ySnittU, tykkelse, strekSnitt));
  }
  if (trengerUnderlag.slutt) {
    deler.push(underlag(sisteU.tilEksakt, L, ySnittU, tykkelse, strekSnitt));
  }

  // Veggen
  deler.push(`<line x1="0" y1="${yVegg + strekSnitt * 1.5}" x2="${L}" y2="${yVegg + strekSnitt * 1.5}" stroke="var(--tekst-gra)" stroke-width="${strekSnitt * 3}"/>`);

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

// Skisse til utdelingsmålene i «Ett felt» (Kenny 2026-11-10): starten av feltet sett ovenfra,
// med veggen nederst. Viser nullpunktet (startkanten, oransje strek) og de første løpende
// målene i tabellen: fra og til på første underbord og fra på det andre. Alle målene går fra 0.
export function tegnNullpunkt(losning) {
  const { L, underliggere, overliggere } = losning;
  const t = TEGNET_TYKKELSE;
  // Vis til litt forbi starten av andre underbord, eller hele feltet når det er kortere
  const andre = underliggere[1];
  const slutt = andre ? Math.min(L, andre.fraEksakt + (andre.tilEksakt - andre.fraEksakt) * 0.6) : L;
  const kant = slutt * 0.08;
  const skrift = slutt * 0.06;
  const strek = slutt * 0.004;

  // Løpende mål: avrundet tall som i tabellen, tegnet der bordkanten faktisk står
  const maal = [];
  const leggTil = (x, tall) => { if (x > 1e-6 && x <= slutt && !maal.some((m) => m.tall === tall)) maal.push({ x, tall }); };
  leggTil(underliggere[0].fraEksakt, underliggere[0].fra);
  leggTil(underliggere[0].tilEksakt, underliggere[0].til);
  if (andre) leggTil(andre.fraEksakt, andre.fra);

  const yO = skrift * 2;        // påbord (utenpå)
  const yU = yO + t;            // underbord (inn mot veggen)
  const yVegg = yU + t;
  const yMaal = (i) => yVegg + skrift * 1.4 + i * skrift * 1.5;
  const hoyde = yMaal(Math.max(maal.length - 1, 0)) + skrift * 0.9;
  const pil = skrift * 0.3;

  const deler = [`<defs><clipPath id="nullpunkt-klipp"><rect x="${-kant}" y="0" width="${kant + slutt}" height="${hoyde}"/></clipPath></defs>`];
  const bord = [];
  underliggere.forEach((b, i) => {
    if (b.fraEksakt >= slutt) return;
    bord.push(rekt(b, yU, t, 'u', strek));
    const midt = (b.fraEksakt + Math.min(b.tilEksakt, slutt)) / 2;
    bord.push(`<text x="${midt}" y="${yU + t / 2 + skrift * 0.3}" font-size="${skrift * 0.8}" text-anchor="middle" fill="var(--tekst)">${i + 1}</text>`);
  });
  for (const b of overliggere) if (b.fraEksakt < slutt) bord.push(rekt(b, yO, t, 'o', strek));
  bord.push(`<line x1="0" y1="${yVegg + strek}" x2="${slutt}" y2="${yVegg + strek}" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);
  deler.push(`<g clip-path="url(#nullpunkt-klipp)">${bord.join('')}</g>`);

  // Målene: strek fra 0 til bordkanten, tallet ved enden, og tynn hjelpestrek opp til kanten
  maal.forEach((m, i) => {
    const y = yMaal(i);
    deler.push(
      `<line x1="${m.x}" y1="${yU}" x2="${m.x}" y2="${y + pil}" stroke="var(--tekst-gra)" stroke-width="${strek * 0.6}" stroke-dasharray="${strek * 2} ${strek * 2}"/>`,
      `<line data-maal="${m.tall}" x1="0" y1="${y}" x2="${m.x}" y2="${y}" stroke="var(--tekst)" stroke-width="${strek}"/>`,
      `<text x="${m.x + skrift * 0.25}" y="${y + skrift * 0.35}" font-size="${skrift}" fill="var(--tekst)">${mm(m.tall)}</text>`,
    );
  });

  // Nullpunktet: startkanten av feltet
  deler.push(
    `<line data-nullpunkt="ja" x1="0" y1="${skrift * 1.4}" x2="0" y2="${hoyde - skrift * 0.3}" stroke="var(--bakoy-oransje)" stroke-width="${strek * 2}"/>`,
    `<text x="${-kant * 0.4}" y="${skrift * 1.1}" font-size="${skrift}" font-weight="700" fill="var(--tekst)">0 = startkanten</text>`,
  );

  return `<svg class="tegning nullpunkt" viewBox="${-kant} 0 ${slutt + kant * 3} ${hoyde}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Skisse av starten på feltet. Nullpunktet er startkanten, målene er ${maal.map((m) => mm(m.tall)).join(', ')} mm">`
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

  const deler = [];
  deler.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="var(--bakgrunn)" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);

  // Karm (utvendig karmmål) med glass/dørblad innenfor
  for (const a of apninger) {
    deler.push(`<rect data-apning="${a.navn}" x="${a.x}" y="${y(a.bunn + a.hoyde)}" width="${a.bredde}" height="${a.hoyde}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek * 2}"/>`);
    deler.push(`<rect x="${a.x + KARMBREDDE}" y="${y(a.bunn + a.hoyde) + KARMBREDDE}" width="${Math.max(a.bredde - 2 * KARMBREDDE, 0)}" height="${Math.max(a.hoyde - 2 * KARMBREDDE, 0)}" fill="var(--glass)" stroke="var(--tekst-gra)" stroke-width="${strek}"/>`);
  }

  // Hjørnekasse: kledningen starter ved kassa
  const fV = vegg.forleng?.venstre ?? 0;
  const fH = vegg.forleng?.hoyre ?? 0;
  if (fV < 0) deler.push(`<rect data-hjornekasse="venstre" x="0" y="0" width="${-fV}" height="${H}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek * 2}"/>`);
  if (fH < 0) deler.push(`<rect data-hjornekasse="hoyre" x="${W + fH}" y="0" width="${-fH}" height="${H}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek * 2}"/>`);

  // Et felt kan ha flere høyder (feltet over og under en åpning er ett felt med to deler)
  for (const f of felt) {
    if (!f.ok) {
      const til = f.x1 ?? f.x0;
      for (const [y0, y1] of f.deler) {
        deler.push(`<rect data-feil="ja" x="${f.x0}" y="${y(y1)}" width="${Math.max(til - f.x0, 0)}" height="${y1 - y0}" fill="var(--feil-flate)" stroke="var(--feil-tekst)" stroke-width="${strek * 2}" stroke-dasharray="${strek * 6} ${strek * 4}"/>`);
      }
    }
  }
  // Alle underbord først, så alle påbord. Ellers kan et underbord i feltet over et vindu
  // bli tegnet oppå påbordet fra feltet ved siden av, og det er omvendt i virkeligheten.
  for (const [type, fyll] of [['u', 'var(--underligger)'], ['o', 'var(--overligger)']]) {
    for (const f of felt.filter((x) => x.ok)) {
      for (const b of type === 'u' ? f.underliggere : f.overliggere) {
        for (const [y0, y1] of f.deler) {
          deler.push(`<rect data-bord="${type}" x="${b.fraEksakt}" y="${y(y1)}" width="${b.tilEksakt - b.fraEksakt}" height="${y1 - y0}" fill="${fyll}" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
        }
      }
    }
  }

  for (const a of apninger) {
    deler.push(`<text x="${a.x + a.bredde / 2}" y="${y(a.bunn + a.hoyde / 2) + skrift * 0.35}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${a.navn}</text>`);
  }

  // Nummer på hvert felt (samme nummer som i lista under tegningen), i den største delen
  // av feltet. Sirkelen krymper i lave felt, for eksempel over en dør, så den får plass.
  felt.forEach((f, i) => {
    const x1 = f.x1 ?? f.x0;
    const [y0, y1] = f.deler.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    const cx = (f.x0 + x1) / 2;
    const cy = y((y0 + y1) / 2);
    const r = Math.min(skrift * 0.75, ((y1 - y0) / 2) * 0.9, ((x1 - f.x0) / 2) * 0.9);
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

// Horisontalsnitt A–A i høyden snittHoyde, sett ovenfra. Veggen og karmen øverst,
// kledningen nederst (utsiden ned), slik plantegninger vanligvis er.
// Underbordene ligger inn mot veggen, påbordene utenpå. Bordtykkelsen er overdrevet (TEGNET_TYKKELSE)
// så den synes, men alle mål langs veggen er i riktig skala.
// Tegningen er bred (målestokk ca. 1:8 på skjermen) og ligger i en boks man kan skyve sidelengs.
export function tegnSnitt(vegg, snittHoyde) {
  const { lengde: W, felt, apninger, karmBord } = vegg;
  const t = TEGNET_TYKKELSE;
  const skrift = 100;
  const strek = 3;
  const kant = 150;
  const karmTopp = skrift * 1.6; // karmen går inn i veggen (opp i tegningen)
  const yVegg = karmTopp + 120;  // utsiden av lekt/vegg
  const yU = yVegg;              // underbord rett utenpå veggen
  const yO = yU + t;             // påbord ytterst (nederst i tegningen)
  // Bordet som går inn på karmen ligger rett utenpå den
  const karmBunn = karmBord === 'O' ? yO : yU;
  const yMal = yO + t + skrift * 2;
  const hoyde = yMal + skrift * 1.6;
  const pxPerMm = 0.12;

  const deler = [];
  deler.push(`<line x1="0" y1="${yVegg}" x2="${W}" y2="${yVegg}" stroke="var(--tekst-gra)" stroke-width="${strek * 3}"/>`);

  // Åpninger som snittet går gjennom: karm og glass
  const gjennom = apninger.filter((a) => snittHoyde > a.bunn && snittHoyde < a.bunn + a.hoyde);
  for (const a of gjennom) {
    deler.push(`<rect data-karm="${a.navn}" x="${a.x}" y="${karmTopp}" width="${a.bredde}" height="${karmBunn - karmTopp}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek}"/>`);
    deler.push(`<line x1="${a.x + KARMBREDDE}" y1="${(karmTopp + karmBunn) / 2}" x2="${a.x + a.bredde - KARMBREDDE}" y2="${(karmTopp + karmBunn) / 2}" stroke="var(--tekst-gra)" stroke-width="${strek * 2}"/>`);
    deler.push(`<text x="${a.x + a.bredde / 2}" y="${karmTopp - skrift * 0.4}" font-size="${skrift}" text-anchor="middle" fill="var(--tekst)">${a.navn}</text>`);
  }

  // Feltene som finnes i denne høyden
  const aktive = felt.filter((f) => f.deler.some(([y0, y1]) => snittHoyde >= y0 && snittHoyde <= y1));
  for (const f of aktive) {
    if (!f.ok) {
      deler.push(`<rect data-feil="ja" x="${f.x0}" y="${yU}" width="${Math.max((f.x1 ?? f.x0) - f.x0, 0)}" height="${2 * t}" fill="var(--feil-flate)" stroke="var(--feil-tekst)" stroke-width="${strek}" stroke-dasharray="12 8"/>`);
      continue;
    }
    for (const b of f.underliggere) {
      deler.push(`<rect data-bord="u" x="${b.fraEksakt}" y="${yU}" width="${b.tilEksakt - b.fraEksakt}" height="${t}" fill="var(--underligger)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    }
    for (const b of f.overliggere) {
      deler.push(`<rect data-bord="o" x="${b.fraEksakt}" y="${yO}" width="${b.tilEksakt - b.fraEksakt}" height="${t}" fill="var(--overligger)" stroke="var(--bord-kant)" stroke-width="${strek}"/>`);
    }
  }

  // Påbord i hjørnet har ingen underbord bak seg ytterst: underlag. (Påbord som går inn på
  // karmen ligger an på karmen og trenger ikke kloss, Kenny 2026-11-08.)
  const underbord = aktive.filter((f) => f.ok).flatMap((f) => f.underliggere)
    .sort((a, b) => a.fraEksakt - b.fraEksakt);
  const merkUnderlag = (fra, til) => {
    if (til - fra > 1) {
      deler.push(`<rect data-underlag="ja" x="${fra}" y="${yU}" width="${til - fra}" height="${t}" fill="none" stroke="var(--bakoy-oransje)" stroke-width="${strek * 2}" stroke-dasharray="10 6"/>`);
    }
  };
  const kledning = vegg.kledning ?? { fra: 0, til: W };
  if (vegg.hjorneVenstre === 'O' && underbord.length) merkUnderlag(kledning.fra, underbord[0].fraEksakt);
  if (vegg.hjorneHoyre === 'O' && underbord.length) merkUnderlag(underbord.at(-1).tilEksakt, kledning.til);

  // Hjørnene: naboveggens kledning (grå) og hjørnekasse. Naboveggen står på tvers, så den
  // går oppover i tegningen fra hjørnet. Går kledningen forbi, dekker den enden av naboens
  // kledning. Slutter den mot naboen, går naboens kledning forbi denne veggen.
  const naboTykk = (vegg.tykkelse?.under ?? 19) + (vegg.tykkelse?.over ?? 19);
  const yYtterst = yO + t;
  for (const [side, x] of [['venstre', 0], ['hoyre', W]]) {
    const type = vegg.hjorner?.[side]?.type;
    const f = vegg.forleng?.[side] ?? 0;
    const ut = side === 'venstre' ? -1 : 1; // retning ut fra veggen
    if (type === 'kasse') {
      const x0 = side === 'venstre' ? 0 : W + f;
      deler.push(`<rect data-hjorne="${side}" x="${x0}" y="${yU}" width="${-f}" height="${2 * t}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek}"/>`);
    } else if (type === 'forbi') {
      // Naboveggens kledning stopper ved lekta på denne veggen, og denne kledningen dekker enden
      const x0 = ut < 0 ? x - f : x;
      deler.push(`<rect data-hjorne="${side}" data-nabo="ja" x="${x0}" y="${karmTopp - skrift}" width="${f}" height="${yVegg - karmTopp + skrift}" fill="var(--tekst-gra)" opacity="0.5"/>`);
    } else if (type === 'mot') {
      // Naboveggen går forbi. Dens ytterste bord går ned forbi denne kledningen. Bak det
      // (mellom lekta og innsiden av bordet) går denne kledningen inn, f mm forbi hjørnet.
      const tykk = vegg.hjorner[side].nabo?.tykkelse ?? naboTykk;
      const ytterst = tykk - f; // tykkelsen på naboveggens ytterste bord
      const x0 = ut < 0 ? x - tykk : x + f;
      deler.push(`<rect data-hjorne="${side}" data-nabo="ja" x="${x0}" y="${karmTopp - skrift}" width="${ytterst}" height="${yYtterst - karmTopp + skrift}" fill="var(--tekst-gra)" opacity="0.5"/>`);
      if (f > 0) {
        const xi = ut < 0 ? x - f : x;
        deler.push(`<rect data-hjorne="${side}" data-nabo="ja" x="${xi}" y="${karmTopp - skrift}" width="${f}" height="${yVegg - karmTopp + skrift}" fill="var(--tekst-gra)" opacity="0.5"/>`);
      }
    }
  }

  // Innlegg på karm skrevet under kledningen ved karmkantene
  for (const a of gjennom) {
    for (const [x, e, anker] of [[a.x, a.innlegg.venstre, 'start'], [a.x + a.bredde, a.innlegg.hoyre, 'end']]) {
      deler.push(`<text x="${x}" y="${yO + t + skrift * 0.9}" font-size="${skrift * 0.8}" text-anchor="${anker}" fill="var(--tekst)">${mm(e, 1)}</text>`);
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

// ---------- Hjørnet sett ovenfra, i riktig målestokk ----------
// Viser ett hjørne slik det blir: veggen og naboveggen (grått), underbord, påbord og kloss
// bak påbordet der det ikke er underbord. 1 enhet = 1 mm, ca. 500 mm i hver retning.
//
// Tegnes i et eget koordinatsystem der hjørnet (der lektene på de to veggene møtes) er 0,0.
// Denne veggen går mot høyre, utsiden er ned. Naboveggen går oppover, med utsiden til venstre.
// Høyre hjørne tegnes likt og speilvendes.
//
// vegg: resultat fra losHus. side: 'venstre' eller 'hoyre'.
// nabo: resultat for naboveggen (eller null når den ikke er lagt inn), naboNavn: navnet.
export function tegnHjorne(vegg, side, nabo = null, naboNavn = 'Naboveggen') {
  const RAMME = 520;
  const venstre = side === 'venstre';
  const W = vegg.lengde;
  const tU = vegg.tykkelse?.under ?? 19;
  const tO = vegg.tykkelse?.over ?? 19;
  const mittBord = venstre ? vegg.hjorneVenstre : vegg.hjorneHoyre;
  const type = vegg.hjorner?.[side]?.type ?? 'mot';
  const f = vegg.forleng?.[side] ?? 0;

  // Denne veggens bord i hjørnefeltet, målt fra hjørnet
  const felt = venstre ? vegg.felt[0] : vegg.felt.at(-1);
  const lokal = (b) => (venstre ? [b.fraEksakt, b.tilEksakt] : [W - b.tilEksakt, W - b.fraEksakt]);
  const mineU = felt?.ok ? felt.underliggere.map(lokal) : [];
  const mineO = felt?.ok ? felt.overliggere.map(lokal) : [];

  // Naboveggen: dens høyre ende møter vårt venstre hjørne, og omvendt
  const naboSide = venstre ? 'hoyre' : 'venstre';
  let naboU = [];
  let naboO = [];
  let ntU = tU;
  let ntO = tO;
  let naboBord = mittBord;
  let antatt = false;
  if (nabo && !nabo.feil) {
    ntU = nabo.tykkelse?.under ?? 19;
    ntO = nabo.tykkelse?.over ?? 19;
    naboBord = venstre ? nabo.hjorneHoyre : nabo.hjorneVenstre;
    const nf = venstre ? nabo.felt.at(-1) : nabo.felt[0];
    const Wn = nabo.lengde;
    const tilY = (b) => (venstre ? [b.fraEksakt - Wn, b.tilEksakt - Wn] : [-b.tilEksakt, -b.fraEksakt]);
    if (nf?.ok) {
      naboU = nf.underliggere.map(tilY);
      naboO = nf.overliggere.map(tilY);
    }
  } else if (type !== 'kasse') {
    // Ikke lagt inn: vis bare hjørnebordet, antatt likt som på denne veggen
    antatt = true;
    const ende = type === 'mot' ? tU + (mittBord === 'O' ? tO : 0) : (mittBord === 'O' ? tU : 0);
    const bredde = mittBord === 'O' ? vegg.bo : vegg.bu;
    (mittBord === 'O' ? naboO : naboU).push([ende - bredde, ende]);
  }

  const synlig = ([a, b]) => b > -RAMME && a < RAMME;
  const deler = [];
  const r1 = (v) => Math.round(v * 10) / 10;
  const rekt = (x, y, w, h, fyll, ekstra = '') => deler.push(
    `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fyll}" stroke="var(--bord-kant)" stroke-width="1.2" ${ekstra}/>`);

  // Vegg og lekter (innenfor kledningen)
  const VEGG = 120;
  deler.push(`<path data-vegg="ja" d="M ${RAMME} ${-VEGG} L ${VEGG} ${-VEGG} L ${VEGG} ${-RAMME} L 0 ${-RAMME} L 0 0 L ${RAMME} 0 Z" fill="var(--karm)" stroke="var(--tekst-gra)" stroke-width="1.5"/>`);

  if (type === 'kasse') {
    const k = -f;
    const T = tU + tO;
    rekt(0, 0, k, T, 'var(--tekst-gra)', 'data-hjornekasse="ja" opacity="0.6"');
    rekt(-T, -k, T, k + T, 'var(--tekst-gra)', 'data-hjornekasse="ja" opacity="0.6"');
  }

  // Kloss bak påbordet der det ikke er underbord: i underbordsjiktet, fra første underbord
  // og inn til naboveggens underbordsjikt (ikke inn i påbordet på naboveggen).
  if (type !== 'kasse' && mittBord === 'O' && mineU.length) {
    const forste = Math.min(...mineU.map(([a]) => a));
    rekt(-ntU, 0, forste + ntU, tU, 'var(--kloss)', 'data-kloss="ja"');
  }
  if (type !== 'kasse' && naboBord === 'O' && naboU.length && !antatt) {
    const siste = Math.max(...naboU.map(([, b]) => b));
    rekt(-ntU, siste, ntU, tU - siste, 'var(--kloss)', 'data-kloss="ja"');
  }

  // Underbord, så påbord (påbordet ligger utenpå)
  for (const [a, b] of mineU.filter(synlig)) rekt(a, 0, Math.min(b, RAMME) - a, tU, 'var(--underligger)', 'data-bord="u"');
  for (const [a, b] of naboU.filter(synlig)) rekt(-ntU, Math.max(a, -RAMME), ntU, b - Math.max(a, -RAMME), 'var(--underligger)', 'data-bord="u" data-nabo="ja"');
  for (const [a, b] of mineO.filter(synlig)) rekt(a, tU, Math.min(b, RAMME) - a, tO, 'var(--overligger)', 'data-bord="o"');
  for (const [a, b] of naboO.filter(synlig)) rekt(-ntU - ntO, Math.max(a, -RAMME), ntO, b - Math.max(a, -RAMME), 'var(--overligger)', 'data-bord="o" data-nabo="ja"');

  // Speilvend høyre hjørne. Teksten skrives utenfor speilingen, så den ikke blir baklengs.
  const sx = venstre ? 1 : -1;
  const tekst = (x, y, t, anker = 'start', ekstra = '') => `<text x="${x * sx}" y="${y}" font-size="22" fill="var(--tekst)" text-anchor="${venstre ? anker : (anker === 'start' ? 'end' : anker === 'end' ? 'start' : anker)}" ${ekstra}>${t}</text>`;
  const forklaring = type === 'kasse' ? `Hjørnekasse ${Math.round(-f)} mm`
    : f > 0 ? `Kledningen går ${Math.round(f)} mm forbi hjørnet` : 'Kledningen slutter i hjørnet';
  const tekster = [
    tekst(260, tU + tO + 40, 'Denne veggen', 'middle'),
    tekst(-ntU - ntO - 70, -260, antatt ? `${naboNavn} (antatt)` : naboNavn, 'middle',
      `transform="rotate(-90 ${(-ntU - ntO - 70) * sx} -260)"`),
    tekst(-ntU - ntO - 10, tU + tO + 80, forklaring),
    tekst(VEGG + 20, -VEGG - 20, 'Vegg og lekter'),
  ];

  const vb = venstre ? `${-200} ${-RAMME} ${RAMME + 200} ${RAMME + 200}` : `${-RAMME} ${-RAMME} ${RAMME + 200} ${RAMME + 200}`;
  return `<svg class="tegning hjorne" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${venstre ? 'Venstre' : 'Høyre'} hjørne sett ovenfra">`
    + `<g transform="scale(${sx},1)">${deler.join('')}</g>${tekster.join('')}</svg>`;
}

// ---------- Huset sett ovenfra (skisse) ----------
// Veggene i rekkefølgen de er lagt inn, med rette hjørner. Man går rundt huset mot høyre sett
// utenfra, altså med huset på venstre hånd, og svinger 90° til venstre i hvert hjørne.
// I hvert hjørne vises hvilken vegg som går forbi (streken går litt forbi hjørnet), hjørnekasse
// (firkant) eller feil (rød ring). Brukes for å se at rekkefølgen stemmer med huset.
//
// vegger: [{ navn, lengde (eller null) }], hjorner: fra lagHjorneoversikt, aktiv: vegg som vises.
export function tegnHus({ vegger, hjorner, lukket, aktiv = 0 }) {
  const kjente = vegger.map((v) => v.lengde).filter((l) => Number.isFinite(l) && l > 0);
  const standard = kjente.length ? kjente.reduce((a, b) => a + b, 0) / kjente.length : 3000;

  // Gå rundt: start i 0,0 mot høyre. Sving til venstre: (dx, dy) -> (dy, -dx) (y nedover).
  let x = 0; let y = 0; let dx = 1; let dy = 0;
  const linjer = vegger.map((v, k) => {
    const kjent = Number.isFinite(v.lengde) && v.lengde > 0;
    const L = kjent ? v.lengde : standard;
    const linje = { k, navn: v.navn, kjent, x0: x, y0: y, x1: x + dx * L, y1: y + dy * L, dx, dy };
    x = linje.x1; y = linje.y1;
    [dx, dy] = [dy, -dx];
    return linje;
  });
  const xs = linjer.flatMap((l) => [l.x0, l.x1]);
  const ys = linjer.flatMap((l) => [l.y0, l.y1]);
  const D = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1000);
  const kant = D * 0.35;
  const strek = D * 0.022;
  const skrift = D * 0.055;
  const forbi = D * 0.05;

  const deler = [];
  for (const l of linjer) {
    const farge = l.k === aktiv ? 'var(--bakoy-bla)' : 'var(--tekst-gra)';
    deler.push(`<line data-husvegg="${l.k}" x1="${l.x0}" y1="${l.y0}" x2="${l.x1}" y2="${l.y1}" stroke="${farge}" stroke-width="${strek}" ${l.kjent ? '' : `stroke-dasharray="${strek * 2} ${strek * 1.5}"`}/>`);
    // Navn utenfor veggen (til høyre for gangretningen) og pil for gangretningen
    const mx = (l.x0 + l.x1) / 2; const my = (l.y0 + l.y1) / 2;
    const ux = -l.dy; const uy = l.dx; // utover
    // Loddrette vegger: teksten starter (eller slutter) et stykke ut fra streken
    const anker = Math.abs(ux) > 0.5 ? (ux > 0 ? 'start' : 'end') : 'middle';
    const avstand = Math.abs(ux) > 0.5 ? skrift * 1.4 : skrift * 1.6;
    deler.push(`<text x="${mx + ux * avstand}" y="${my + uy * avstand + skrift * 0.35}" font-size="${skrift}" text-anchor="${anker}" fill="${farge}" font-weight="${l.k === aktiv ? 700 : 400}">${l.k + 1}. ${l.navn}</text>`);
    const p = skrift * 0.5;
    const ax = mx + ux * strek * 1.8; const ay = my + uy * strek * 1.8;
    deler.push(`<path d="M ${ax + l.dx * p} ${ay + l.dy * p} L ${ax - l.dx * p + ux * p * 0.6} ${ay - l.dy * p + uy * p * 0.6} L ${ax - l.dx * p - ux * p * 0.6} ${ay - l.dy * p - uy * p * 0.6} Z" fill="${farge}"/>`);
  }

  // Hjørnene
  for (const h of hjorner) {
    const A = linjer[h.a.vegg]; const B = linjer[h.b.vegg];
    const cx = A.x1; const cy = A.y1;
    const ux = -A.dy + B.dy; const uy = A.dx - B.dx; // diagonalt utover fra hjørnet
    if (h.forbi === 'A') {
      deler.push(`<line data-forbi="${h.a.vegg}" x1="${cx}" y1="${cy}" x2="${cx + A.dx * forbi}" y2="${cy + A.dy * forbi}" stroke="var(--bakoy-oransje)" stroke-width="${strek}"/>`);
    } else if (h.forbi === 'B') {
      deler.push(`<line data-forbi="${h.b.vegg}" x1="${cx}" y1="${cy}" x2="${cx - B.dx * forbi}" y2="${cy - B.dy * forbi}" stroke="var(--bakoy-oransje)" stroke-width="${strek}"/>`);
    } else if (h.forbi === 'kasse') {
      deler.push(`<rect data-kasse="${h.nr}" x="${cx - strek * 1.5}" y="${cy - strek * 1.5}" width="${strek * 3}" height="${strek * 3}" fill="var(--karm)" stroke="var(--tekst)" stroke-width="${strek * 0.3}"/>`);
    } else {
      deler.push(`<circle data-hjornefeil="${h.nr}" cx="${cx}" cy="${cy}" r="${strek * 2.2}" fill="none" stroke="var(--feil-tekst)" stroke-width="${strek * 0.6}"/>`);
    }
    deler.push(`<text x="${cx + ux * skrift * 1.3}" y="${cy + uy * skrift * 1.3 + skrift * 0.35}" font-size="${skrift * 0.8}" text-anchor="middle" fill="var(--tekst)" font-weight="700">H${h.nr}</text>`);
  }

  // Går ikke huset i ring? Vis glipen.
  const siste = linjer.at(-1);
  if (lukket && vegger.length >= 3) {
    const glipe = Math.hypot(siste.x1 - linjer[0].x0, siste.y1 - linjer[0].y0);
    if (glipe > 50) {
      deler.push(`<line data-glipe="ja" x1="${siste.x1}" y1="${siste.y1}" x2="${linjer[0].x0}" y2="${linjer[0].y0}" stroke="var(--feil-tekst)" stroke-width="${strek * 0.5}" stroke-dasharray="${strek} ${strek}"/>`);
    }
  }

  const minX = Math.min(...xs) - kant; const minY = Math.min(...ys) - kant;
  const bredde = Math.max(...xs) - Math.min(...xs) + 2 * kant;
  const hoyde = Math.max(...ys) - Math.min(...ys) + 2 * kant;
  return `<svg class="tegning husskisse" viewBox="${minX} ${minY} ${bredde} ${hoyde}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Huset sett ovenfra med ${vegger.length} vegger">`
    + deler.join('') + '</svg>';
}
