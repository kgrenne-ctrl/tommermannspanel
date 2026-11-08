# Tømmermannspanel – regler for prosjektet

Webapp for inndeling av stående tømmermannskledning. Hele planen står i `PLAN.md`, og planen er
fasit. Er noe i planen uklart eller ser feil ut: spør Kenny før du koder, ikke etterpå.

## Hvem appen er for
- Bakøys egne tømrere, på mobilen i nettleseren, gjerne på stillaset.
- Telefon først: store knapper, stor skrift, lite tekst. Ingen innlogging, ingen App Store.
- Skal på sikt virke uten nett (PWA, fase 6).

## Hvordan Kenny vil ha det
- Kenny er prosjektleder og tømrer, og ny på koding. Forklar kort på norsk hva som gjøres og
  hvorfor, med vanlige ord i stedet for faguttrykk.
- **Aldri em dash (—)** i tekst, kommentarer eller kode. Bruk komma eller vanlig tankestrek (–).
- Én fase om gangen (se PLAN.md punkt 6). Ikke bygg neste fase før Kenny sier fra.

## Teknisk valg
- Ren HTML, CSS og JavaScript. Ingen rammeverk og ingen byggesteg.
- JavaScript-moduler (`import`/`export`), så samme fil brukes både i nettleseren og i testene.
- Tegning med SVG. Lagring i nettleseren (localStorage). Publisering på GitHub Pages.

## Regnemodellen ligger for seg selv
- All matematikk ligger i `src/`, uten noe skjermkode (ingen `document`, ingen HTML).
- Én mappe per kledningstype. Tømmermannskledning: `src/tommermann/`.
  En ny kledningstype får egen mappe, uten å endre det som finnes.
- `solver.js` regner ut ett felt. `fagverdier.js` holder standardverdiene.
- Skjermdelen leser bare resultatet fra regnemodellen. Den regner aldri selv.

## Alle mål i mm
- Alle lengder inn og ut av regnemodellen er i millimeter.
- Regn med desimaler hele veien. Avrund bare hver løpende posisjon til nærmeste mm til slutt.
  Aldri avrund klaringen og legg den sammen, da vokser feilen bortover veggen.

## Fagverdier (PLAN.md punkt 8)
Byggforsk 542.101 er ikke lest i fulltekst. Verdiene bygger på Treteknisk, G3 Gausdal og Talgø.
Alle skal kunne endres i innstillinger.
- **Omlegg:** standard (ideelt) 25 mm, minimum 20 mm, anbefalt maks 25 mm. Over maks gir varsel,
  ikke sperre. Under minimum er aldri lov.
- **Klaring:** ingen egen minsteverdi, den følger av omlegget (`g = bo − 2·o`).
- **Spikring:** ikke spikre gjennom to bord. Én spiker i underligger, to i overligger.
  Bord fra 123 mm og bredere festes med to festemidler.
- **Spikersjekk (avklart med Kenny 2026-11-08):** ingen kantavstand (0 mm), én spiker trenger
  bare klaring større enn 0. Fra 123 mm overligger regnes to spikre, med minst 30 mm mellom,
  så klaringen må være minst 30 mm.
- **Lekteavstand (råd):** cc 600–900 mm etter 542.101, Talgø anbefaler maks cc 600 mm.
- **Standard bordbredder:** 73, 98, 123, 148, 173, 198 og 223 mm. Målt faktisk bredde kan alltid
  legges inn.
- Kledningen kløyves ikke for å få det til å gå opp. Omlegget justeres i stedet.
- **Synlig underligger (lagt til i fase 1, 2026-11-08):** `bu − 2·o` kan ikke være negativ.
  Ellers ligger to overliggere oppå hverandre. Ikke i planen, men fysisk umulig å bygge.

## Se appen lokalt
- `npm start` og åpne http://localhost:8000. Dobbeltklikk på `index.html` virker ikke, fordi
  nettleseren ikke laster JavaScript-moduler fra en fil på disken.

## Publisering
- Offentlig repo: https://github.com/kgrenne-ctrl/tommermannspanel (offentlig etter Kennys valg
  2026-11-08, fordi gratis GitHub Pages krever det). Ikke legg passord, priser fra leverandører
  eller annet internt i repoet.
- Appen: https://kgrenne-ctrl.github.io/tommermannspanel/ . GitHub Pages bygger fra `main`,
  rotmappa. Hver `git push` til `main` oppdaterer siden etter et par minutter.

## Skjermdelen (fase 2)
- `src/skjerm/app.js` leser skjemaet og viser svaret. `tegning.js` lager SVG, `format.js` tall.
- `tegning.js` og `format.js` har ingen kobling til nettleseren, så de testes med `node --test`.
- Regn bare på nytt på `input`-hendelser, ikke `change`. `change` kommer også når man trykker
  utenfor et tekstfelt, og da tegnes knappen man trykket på bort før trykket registreres.

## Tester
- `npm test` (eller `node --test`) kjører alle tester i `test/`.
- Alle tester skal være grønne før en fase er ferdig og før commit.
- NDLA-eksempelet i PLAN.md punkt 3 er første test og skal aldri slettes.

## Bakøy-stil
Appen har Bakøy Entreprenør AS sin profil. Kilde: `context/brand-assets/brand-assets.md` i Kennys
Claude-mappe. Ved uenighet gjelder den fila.
- Firmanavnet skrives alltid «Bakøy Entreprenør AS».
- Merkeblå `#074EA2` i toppbåndet.
- Oransje `#F36F21` bare som grafisk aksent (streken under båndet), aldri på liten tekst.
- Logoen ligger på det blå båndet, så bruk `assets/BAKOY_logo_hvit_transparent.png`. Aldri JPG.
- Font: `font-family: Aptos, system-ui, sans-serif`. Ikke legg Aptos-fontfila inn i appen før
  lisensen er sjekket.
- Alle farger er CSS-variabler i `:root` øverst i `css/stil.css`. Bruk alltid variablene, aldri
  fargekoder rett i koden.

## Mappestruktur
```
index.html            siden som åpnes i nettleseren
css/stil.css          utseende, fargene øverst
assets/               logo
src/tommermann/       regnemodellen for tømmermannskledning
src/skjerm/           skjermdelen (skjema, tegning, tallformat)
test/                 automatiske tester
PLAN.md               planen (fasit)
```
