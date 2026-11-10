# Tømmermannspanel – regler for prosjektet

Webapp for inndeling av stående tømmermannskledning. Hele planen står i `PLAN.md`, og planen er
fasit. Er noe i planen uklart eller ser feil ut: spør Kenny før du koder, ikke etterpå.

## Hvem appen er for
- Bakøys egne tømrere, på mobilen i nettleseren, gjerne på stillaset.
- Telefon først: store knapper, stor skrift, lite tekst. Ingen innlogging, ingen App Store.
- Virker uten nett når den har vært åpnet én gang (se «Uten nett» under).

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
- **Omlegg:** standard (ideelt) 25 mm, minimum 20 mm, varsel over 30 mm (Kenny 2026-11-08, planen
  sa 25; G3 og Talgø anbefaler maks 25, men Bakøy flagger først over 30). Over maks gir varsel,
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
- **Åpninger (avklart med Kenny 2026-11-08, PLAN.md punkt 4):** ingen belistning. Underbordet
  eller påbordet går 10–20 mm inn på karmen (innlegg, standard 15 mm) og dekker fugen.
  Feltlengde = mål fra karmkant + innlegg. Brukeren velger om underbord eller påbord går inn.
  Innlegget er likt på begge sider av en åpning (Kenny 2026-11-08).
  Rekkefølge for å få delingen til å gå opp: juster innlegget innenfor 10–20 mm først, juster
  omlegget (20–30 mm) bare når innlegget ikke strekker til. Startvalget (venstre, høyre,
  midten, en åpning, jevnest eller lik avstand) avgjør hvor justeringen havner. Påbord inn på karm ligger an på karmen og
  trenger IKKE kloss (Kenny 2026-11-08). Påbord i hjørnet trenger underlag.
- **Synlig underligger (lagt til i fase 1, 2026-11-08):** `bu − 2·o` kan ikke være negativ.
  Ellers ligger to overliggere oppå hverandre. Ikke i planen, men fysisk umulig å bygge.

## Versjonsnummer (så telefonene alltid får nyeste versjon)
- Alle JavaScript-filer lastes via et importkart i `index.html` med `?v=versjon`. Stilfila også.
- `scripts/versjon.mjs` setter nytt nummer. Det kjøres automatisk ved hver commit
  (`.githooks/pre-commit`, aktivert med `git config core.hooksPath .githooks`).
  Manuelt: `npm run versjon`.
- Ny JavaScript-fil i `src/`: kjør `npm run versjon`, ellers feiler `test/versjon.test.js`.
- `src/skjerm/oppdater.js` sjekker `versjon.json` ved oppstart og laster siden på nytt hvis
  telefonen har en eldre lagret side. Ikke start appen med `<script src=...>`, bruk `import`.

## Bruk uten nett (fase 6, 2026-11-09)
- `sw.js` (service worker) lagrer appen på telefonen. Siden og versjon.json hentes fra nett først
  (nyeste versjon når det er dekning), alt annet fra lageret først (filene har ?v=nummer).
- `scripts/versjon.mjs` skriver fillista og versjonsnummeret i `sw.js` ved hver commit. Nytt nummer
  = ny service worker, som henter alt på nytt og sletter det gamle lageret.
- `manifest.webmanifest` og ikonene (`assets/ikon-*.png`, laget med `swift scripts/lag-ikon.swift`)
  gjør at appen kan legges på hjemskjermen.
- Nettleseren inne i Claude-appen godtar ikke service worker. Test uten nett i Chrome (localhost),
  og fjern registreringen etterpå.

## Utskrift og data for eksempler (2026-11-09)
- «Skriv ut / PDF» øverst i resultatet bygger `src/skjerm/utskrift.js` (`lagUtskrift`): hele huset,
  vegg for vegg med inndata, varsler, oppsett, tegning og hjørner, så huset, materialer og til slutt
  dataene som gjenskaper eksempelet. Nettleserens utskrift lagrer som PDF (filnavn fra sidetittelen).
- «Data for eksempler» under Huset: kopier dataene, eller lim inn og last inn (`lesEksempeldata`).
  Dataformat: `{ app: 'tommermannspanel', versjon, hus }`, der hus er det som lagres på telefonen.
- Når Kenny sender et eksempel: be om dataene (teksten), last dem inn med `lesEksempeldata` og
  `losHus` i node, så regnes nøyaktig det samme.

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

## Veggmodellen (fase 3)
- `src/tommermann/vegg.js` deler veggen i felt og regner dem som en kjede fra hjørne til hjørne.
- Sidebordet ved en åpning går i full høyde forbi åpningen (avklart 2026-11-08). Feltene over og
  under åpningen ligger mellom de to sidebordene og fortsetter rytmen, så de deler innlegg med
  feltene ved siden av. Over og under har samme deling og er ETT felt med to høyder
  (`deler: [[y0, y1], ...]`), kalt «Over og under vindu 1» (Kenny 2026-11-08).
- Hver åpning har ett innlegg (likt på begge sider). Det påvirker feltet til venstre, feltet over
  og under, og feltet til høyre. Innlegget prøves i hele mm fra 10 til 20, og det som gir best
  omlegg i feltene som avgjøres der, velges. Startvalget bestemmer rekkefølgen åpningene velges i,
  og dermed hvor restjusteringen havner.
- Startvalg «Jevnest over hele veggen» (`jevnt`, `velgJevnt`): alle innlegg velges samtidig med
  dynamisk programmering (kjede åpning for åpning), minst sum av (omlegg − 25)². Sjekket mot
  gjennomprøving av alle kombinasjoner. Målt på 300 tilfeldige vegger: bedre på 78, men liten
  gevinst (verste avvik i snitt 12,47 → 12,39 mm), fordi innlegget bare kan variere 10 mm.
  Selve kjeden ligger i `besteKjede` og er felles for `jevnt` og `lik`.
- **Lik avstand mellom påbordene** (startvalg `lik`, `velgLikAvstand`, Kenny 2026-11-09): det
  viktigste er at avstanden mellom påbordene er mest mulig lik. Alle felt sikter mot samme
  avstand G (prøves i hele mm slik at G ± `avvikPabord` gir omlegg 20–30). Hvert felt velger
  antall bord nærmest G. Innleggene velges samtidig for hele veggen.
  Avstand mellom påbord = senteravstand − påbordbredde; omlegg = (bu − avstand)/2.
  `lik` er standard startvalg, satt ett sted: `STANDARD_VEGG.startvalg` i `fagverdier.js`.
- **Ingen kløyving for å få det til å gå opp (Kenny 2026-11-10).** Kløyvde påbord (i `lik`) og
  kløyvde underbord (forslag per felt) ble lagt inn 2026-11-09 og tatt ut igjen. Koden ligger i
  git til og med commit b34b40e hvis de skal inn igjen. Uten kløyving gir `lik` lite: Kennys
  vegg (6650 mm, 98 mm bord) har spenn 16,3 mm fra venstre og 15,8 mm med `lik`, og 574
  tilfeldige vegger 33,5 → 31,0 mm i snitt. Med kløyving var spennet reelt 12,3 mm på Kennys
  vegg (appen viste 9,2, fordi avstanden mot hele endebord ikke var med).
  Hjørnebordet kløyves fortsatt mot naboveggen (se Hjørner og hus). Lagrede vegger kan ha
  `kloyvUnderbord` og `maksKloyvPabord` fra før. De leses ikke lenger.
- «Finn bedre oppsett» prøver karm, hjørner, startvalg og standardbredder. Omlegg innenfor
  20–30 mm regnes som like bra. Skjermen bruker `foreslaHus` (hus.js), som regner hvert forsøk
  gjennom huset (Kenny 2026-11-10): veggen med hjørnene slik huset gir dem, og naboveggene (regnes
  én gang per hjørnevalg og huskes). Et forslag tas med når veggen blir bedre, veggen ikke får
  et annet bord ytterst i et hjørne enn naboveggen har, og ingen nabovegg blir dårligere.
  Naboveggene som endres, står i forslaget (`naboer: [{ navn, bedre }]`). `foreslaVegg` (vegg.js)
  gjør selve prøvingen og regner veggen alene når den ikke får `regn` fra huset. I en fri ende
  regnes naboen som lik veggen selv, så der endrer et byttet hjørnebord også feltlengden.
  Knappen viser «Regner …» mens den regner (utregningen startes med `setTimeout`, så nettleseren
  rekker å tegne teksten først).
- Påbord er standard både i hjørnene og inn på karmen (Kenny 2026-11-08).
- `solver.js` har `losFeltFleksibel` for felt med slingringsmonn i lengden. `losFelt` er det
  samme med fast lengde.

## Lagring og merkeliste
- `src/skjerm/lagring.js` lagrer skjemaene (hel vegg, ett felt og valgt visning) i nettleseren
  (localStorage) ved hver endring, med try/catch. Bare på telefonen, ikke på nett.
- `lagMerkeliste(r)` i `vegg.js`: alle underbord fra venstre, med mål fra hjørnet og fra nærmeste
  karmkant til venstre, høyde (full / over og under), felt og distanseklosse.

## Hjørner og hus (fase 4, avklart med Kenny 2026-11-09)
- Hvert hjørne har en hjørnetype: `forbi` (kledningen går forbi hjørnet), `mot` (slutter mot
  naboveggen, som går forbi) eller `kasse` (slutter mot hjørnekasse med egen bredde).
- Vegglengden måles utenpå lektene. `forbi` gjør feltet lengre med naboveggens kledningstykkelse
  i hjørnet: underbordets tykkelse, pluss påbordets når naboveggen har påbord i hjørnet.
  `kasse` gjør feltet kortere med kassebredden. `losVegg` får dette som `forlengVenstre` og
  `forlengHoyre` (mm, minus = kortere).
- `mot` med påbord ytterst på naboveggen: kledningen går likevel forbi hjørnet med naboveggens
  underbordtykkelse (klossen bak hjørnet), så påbordene møtes (Kenny 2026-11-09, ut fra hans
  skisse «Overligger i hjørnet»). Med underbord ytterst på naboveggen er tillegget 0.
- Vanlig er samme bord ytterst på begge veggene i et hjørne. Ulikt gir varsel (`hjorne-bord`).
- Hjørnebordet på veggen som slutter mot (`mot`) kløyves med tykkelsen på hjørnebordet på
  naboveggen (det som synes som endeved), så hjørnet er like bredt sett fra begge sider
  (Kenny 2026-11-09). `losVegg` får `klyvVenstre/klyvHoyre`: delingen regnes med helt bord og
  feltet så mye lengre, og etterpå kappes ytterkanten av hjørnebordet (`kloyvHjornebord`).
  `forleng` og `kledning` i resultatet er det som faktisk dekkes.
- Nullpunktet er alltid hjørnet på veggen. Bord som går forbi hjørnet får minusmål.
- «Hjørnene sett ovenfra» (`tegnHjorne` i tegning.js): hvert hjørne i riktig målestokk med
  begge veggene, bord og kloss. Snittet A–A har overdrevet bordtykkelse og viser hjørnet bare forenklet.
- Bordtykkelsen i snittene sett ovenfra (ett felt og A–A) tegnes som `TEGNET_TYKKELSE` (40 mm) i
  `tegning.js`, uansett feltlengde. Før fulgte den feltlengden i «Ett felt» (5 %), og lange felt
  fikk bord som så ut som stolper (Kenny 2026-11-10). Mål langs veggen er alltid i riktig skala.
- «Ett felt» har en skisse over tabellen med utdelingsmål (`tegnNullpunkt`, Kenny 2026-11-10):
  starten av feltet sett ovenfra, nullpunktet (0 = startkanten, oransje strek) og de første
  løpende målene. Nullpunktet er ytterkanten av første bord, og feltlengden måles fra samme kant.
- «Hel vegg»: nullpunktet for alle mål er venstre hjørne utenpå lektene (der vegglengden måles
  fra), ikke ytterkanten av kledningen. Hjørneskissene (`tegnHjorne`) viser det med oransje strek
  og «0» i venstre hjørne og vegglengden i høyre (Kenny 2026-11-10). Går kledningen forbi
  hjørnet, starter første bord før 0 og får minusmål.
- «Ett felt» har valget «Feltet starter» (`startsted`: ikke i hjørne, mot eller forbi naboveggen,
  Kenny 2026-11-10). I et hjørne vises «Hjørnet sett ovenfra» med `tegnHjorne` og
  `feltSomHjorne` (hus.js): nullpunktet er startkanten av feltet, og skissen sier hvor langt
  utenfor lekthjørnet den ligger (påbord mot: 19, påbord forbi: 38, underbord mot: 0, forbi: 19).
  Naboveggen er antatt: samme bord ytterst og 19 mm tykkelse. Hjørnebordet kløyves ikke her.
- Alle snitt sett ovenfra har veggen øverst og utsiden (påbordene) ned, også i «Ett felt»
  (snudd 2026-11-10 etter ønske fra Kenny, så de stemmer med veggsnittet og hjørneskissene).
- `src/tommermann/hus.js`: et hus er veggene i rekkefølge rundt huset. Høyre hjørne på vegg k er
  venstre hjørne på vegg k+1, og siste møter første når huset er lukket. `losHus` regner ut
  forlengelsene og sier fra når et hjørne ikke henger sammen (begge går forbi, eller ingen).
- «Hele huset sett ovenfra» (`tegnHus`) og «Hjørnene i huset» (`lagHjorneoversikt`, `hjorneLinjer`):
  skisse med rette hjørner som viser rekkefølgen og hvem som går forbi, og én linje per hjørne med
  tillegg og kløyving. `kontrollerFirkant` sjekker at motstående vegger i et hus med fire vegger er
  like lange. Hjørnene er også med i teksten som deles. Bare utvendige hjørner støttes.
- Bordtykkelse per vegg, standard 19 mm for både underbord og påbord (antakelse, kan endres).
- Skjermen viser én vegg om gangen med veggene som knapper øverst (status per vegg). Huset lagres
  under nøkkelen `hus` ({ vegger, aktiv, lukket, materialer }). Gammel nøkkel `vegg` blir første vegg.
  Hjørnet på veggen som vises, bestemmer hjørnet på naboveggen (`synkHjorner`).

## Materialer (fase 5, avklart med Kenny 2026-11-09)
- `src/tommermann/materialer.js`: `lagMaterialliste(vegger, { kapptillegg, svinn, priser })`.
  Bestilling i løpemeter per dimensjon (tykkelse × bredde). Bordlengde = høyden på delen bordet
  dekker + kapptillegg (standard 50 mm). Svinn standard 10 %, bestilt mengde rundes opp til hel meter.
- Kappliste per vegg og felt: antall stykker per lengde og dimensjon.
- Felt som ikke går opp, er ikke med, og lista sier fra om det.
- Lista kan kopieres eller deles som tekst (`materialTekst`).

## Språk og resultatside (gjennomgang 2026-11-09, godkjent av Kenny)
- Samme ord overalt på skjermen: **underbord, påbord, kloss** (ikke underligger/overligger/klaring
  i tekst brukeren ser). Koden kan fortsatt hete `underliggere` osv.
- Varsler skrives som tømrerspråk og sorteres i «Må fikses før du begynner», «Bør sjekkes» og
  «Greit å vite». Like varsler slås sammen.
- Resultatet for en vegg: status, varsler, forslag, **«Slik setter du opp»** (`lagOppsettliste`:
  første underbord, kloss, antall, kontrollmål per felt), tegning, materialer. Alt for den som
  planlegger (snitt, alle mål bord for bord, innlegg, felt for felt) ligger under «Detaljer».
- Mål fra karm skrives «X mm før / etter … karm», ikke med minus.
- «Fyll inn eksempelvegg» skal alltid gi en vegg som går opp (sjekkes av test i `vegg.test.js`).
- «Fyll inn eksempelhus (4 vegger)» under Huset (Kenny 2026-11-10) erstatter huset med
  `EKSEMPELHUS` fra `src/skjerm/eksempel.js`: 8 x 6 m, Sør, Øst, Nord, Vest, 98 mm bord,
  langveggene forbi og gavlene mot. Alle vegger skal gå opp med omlegg innenfor anbefalt
  (sjekkes av test i `hus.test.js`). Spør før det erstatter et hus med innhold.

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
sw.js                 lagrer appen på telefonen, så den virker uten nett
manifest.webmanifest  navn og ikon når appen legges på hjemskjermen
versjon.json          versjonsnummeret appen sjekker mot (skrives ved commit)
assets/               logo og app-ikoner
src/tommermann/       regnemodellen: felt, vegg, hus (hjørner), materialer, fagverdier
src/skjerm/           skjermdelen (felt, vegg, tegning, utskrift, lagring, tallformat, felles
                      biter, versjonssjekk)
scripts/versjon.mjs   setter versjonsnummer på filene (kjøres ved commit)
scripts/lag-ikon.swift lager app-ikonene
.githooks/            git-kroker (pre-commit setter versjon)
test/                 automatiske tester
PLAN.md               planen (fasit)
```
