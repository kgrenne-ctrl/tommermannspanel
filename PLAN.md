# Plan: app for inndeling av stående tømmermannspanel

Foreløpig plan, 2026-11-08. Tas med inn i Claude Code som startpunkt. Brukere, plattform og omlegg er avklart (punkt 8 og 9), resten kan endres.

## 1. Mål

En app for Bakøys egne tømrere, brukt i nettleseren på mobilen. Den gir tømreren ferdige utdelingsmål for stående tømmermannskledning på en hel vegg, med vinduer, dører og hjørner, i stedet for ett og ett felt. Den skal kunne brukes på telefonen på stillaset, uten nett, og gi materialliste og kappliste for innkjøp.

## 2. Hva finnes i dag (research 2026-11-08)

| Verktøy | Gjør bra | Mangler |
|---|---|---|
| lommeregner.no/kledning-kalkulator | Velger start/slutt med over- eller underligger, justerer omlegget i stedet for å kløyve bord, gir løpende utdelingsmål | Ett felt om gangen. Åpninger må deles opp manuelt. Ingen bordtykkelse, ingen hjørnelogikk, ingen tegning |
| norskalkulator.com | Nedtrekk med standardbredder (73–223 mm), grovt materialbehov | Uklar og delvis selvmotsigende om omlegg. Ingen åpninger eller hjørner. Resultatfeltet var tomt da siden ble lest |
| NDLA (1P-Y BA) | God forklaring av metoden med regneeksempel | Lærestoff, ikke verktøy |
| Engelske «board and batten»-kalkulatorer (Inch Calculator, Omni, Blocklayer, FigureCalc m.fl.) | Tegning, løpende merkemål, distanseklossmål, løpemeter | Laget for dekorlekter innendørs, ikke tømmermannskledning med omlegg. Tommer som standard |
| Forum (byggebolig.no) | Viser hva folk faktisk sliter med: deling mellom vinduer, dører og hjørner | Folk lager egne regneark fordi ingen verktøy løser hele veggen |

**Hullet i markedet:** ingen av verktøyene løser en hel fasade med åpninger, der delingen over og under vinduet henger sammen med resten av veggen. Det er den største forskjellen vi kan lage.

## 3. Regnemodellen (kjernen)

Inndata per felt: feltlengde `L`, bredde underligger `bu`, bredde overligger `bo`, minste omlegg `o_min`, ideelt omlegg `o_ideal`, anbefalt største omlegg `o_max`, og hvordan feltet starter og slutter (U eller O).

Ukjent: klaringen `g` mellom underliggerne. Omlegget blir da `o = (bo − g) / 2` på hver side.

Feltlengden for hver kombinasjon, der `k` er antall underliggere:

| Start–slutt | Underliggere | Overliggere | Ligning |
|---|---|---|---|
| U–U | k | k − 1 | `L = k·bu + (k−1)·g` |
| U–O / O–U | k | k | `L = k·bu + (k−1)·g + (bo + g)/2` |
| O–O | k | k + 1 | `L = k·bu + k·g + bo` |

Løsning: prøv alle aktuelle `k`, løs ligningen for `g`, og behold løsningene der `o ≥ o_min`. Velg først blant løsningene med omlegg innenfor `o_min`–`o_max`, nærmest `o_ideal`. Finnes ingen der, velg den gyldige løsningen nærmest `o_max` og vis et varsel om at omlegget er større enn anbefalt (avklart 2026-11-08: maks er varsel, ikke sperre). Vis gjerne nest beste alternativ også, så brukeren kan velge.

Det er ingen egen minsteklaring. Klaringen følger av omlegget (`g = bo − 2·o`). I stedet sjekker appen at spikeren i overliggeren får plass i klaringen, så det ikke spikres gjennom to bord.

Prinsipp fra lommeregner.no og NDLA: kledningen kløyves ikke for å få det til å gå opp, omlegget justeres i stedet.

**Kontrolleksempel (NDLA):** L = 1350, bu = bo = 148, ideelt omlegg 20, U–U. Gir 6 underliggere og 5 overliggere, klaring 92,4 mm, senteravstand 240,4 mm, omlegg 27,8 mm, med varsel om omlegg over 25 mm (testen kjøres med maks 25; Bakøy-standard er 30, se punkt 8). Underliggerne starter på 0, 240, 481, 721, 962 og 1202 mm. Kontroll: 5 × 240,4 + 148 = 1350. Dette blir første automatiske test.

**Avrunding:** regn med desimaler hele veien og avrund hver løpende posisjon til nærmeste mm. Ikke avrund klaringen og legg den sammen, da vokser feilen bortover veggen.

**Kant med overligger (U–O, O–U, O–O):** overliggeren i kanten har ikke underligger bak seg ytterst. Appen skal flagge at det trengs underlag der.

## 4. Funksjoner som skal gjøre appen best

**Hel vegg, ikke bare felt**
- Tegn veggen med mål, legg inn vinduer og dører med posisjon og bredde (utvendig karmmål).
- **Ingen belistning (avklart 2026-11-08).** Kledningsbordet selv, enten underbordet (underligger) eller påbordet (overligger), går inn på vinduskarmen eller dørkarmen og dekker fugen.
- Appen deler veggen i felt selv: mellom hjørne og åpning, mellom åpninger, over og under åpninger.
- **Innlegg på karm:** feltet slutter inne på karmen, ikke ved karmkanten. Feltlengden = mål fra karmkant + innlegget. Innlegget er en innstilling med spenn 10–20 mm, standard 15 mm. Brukeren velger om underbordet eller påbordet går inn på karmen.
- **Samme innlegg på begge sider (avklart 2026-11-08):** innlegget er likt på venstre og høyre side av hver åpning.
- **Slik går delingen opp:** spennet på 10–20 mm i hver karmende brukes først. Omlegget (20–30 mm, varsel over 30 mm) justeres bare når innlegget ikke strekker til. Da blir omlegget så likt som mulig over hele veggen.
- **Felles rytme:** bordene over og under vinduet skal stå i linje med bordene ved siden av. Viser hvor mye hvert felt avviker fra rytmen.
- Valg: start fra venstre, fra høyre, eller symmetrisk om midten av veggen eller midten av et vindu. Startvalget avgjør hvor justeringen av innlegget havner.
- **Lik avstand mellom påbordene er viktigst (Kenny 2026-11-09):** som en tømrer gjør: tilpass antall bord i hvert felt mot en felles avstand. Går det ikke, kløyves påbordene i feltet en cm eller to som nødløsning. Det trenger ikke være helt likt, men ikke mange cm forskjell.
- **Kløyvde underbord (Kenny 2026-11-09):** felt med omlegg over 30 mm får forslag om å kløyve underbordene inni feltet, så omlegget blir 25 mm. Underbordet er stort sett dekket av påbordene. Tømreren velger det selv.
- **Påbord inn på karmen:** ligger an på karmen og trenger ikke kloss bak (endret av Kenny 2026-11-08, tidligere kloss i kapplista). Påbord i hjørnet trenger fortsatt underlag.

**Hjørner og tykkelser**
- Utvendig hjørne: legg til kledningstykkelsen fra naboveggen i feltlengden, eller velg hjørnekasse med egen bredde.
- **Avklart med Kenny 2026-11-09:** hvert hjørne velges for seg: kledningen **går forbi** hjørnet, **slutter mot** naboveggen (som går forbi), eller slutter mot en **hjørnekasse**.
  - Vegglengden måles utenpå lektene. Går kledningen forbi, blir feltet lengre med tykkelsen på kledningen på naboveggen i hjørnet: underbordets tykkelse, pluss påbordets tykkelse når naboveggen har påbord i hjørnet.
  - To vanlige løsninger (Kenny 2026-11-09): underbord mot underbord i hjørnet, eller påbord mot påbord med kloss bak. Med påbord går også veggen som slutter mot naboen forbi hjørnet med klossens tykkelse, så påbordene møtes.
  - Hjørnebordet på veggen som slutter mot naboveggen kløyves med tykkelsen på hjørnebordet på naboveggen, så hjørnet blir like bredt sett fra begge sider (Kenny 2026-11-09).
  - Hjørnekasse: feltet blir kortere med kassebredden, målt på veggen fra hjørnet til der kledningen starter.
  - Målene i merkelista regnes fra hjørnet på veggen, der tommestokken kan holdes. Bord som går forbi hjørnet får minusmål.
- **Flere vegger = ett hus, vegger rundt** (Kenny 2026-11-09): veggene legges inn i rekkefølge rundt huset. Høyre hjørne på én vegg er venstre hjørne på neste, så appen vet hvilken vegg som går forbi. Siste vegg møter den første når huset er lukket.
- Ulik tykkelse på under- og overligger (f.eks. 19 og 22 mm).
- Mulighet for å legge inn målt faktisk bordbredde, siden bordene sjelden er eksakt nominelt mål.

**På byggeplassen**
- **Merkemodus:** stor skrift, ett mål om gangen, trykk for neste. Laget for å holde i én hånd med tommestokken i den andre.
- Lengde på distanseklosser (= klaringen `g`), så man kan kappe en mal og slippe å måle hvert bord.
- Toleranse: hvor mye klaringen kan variere før omlegget går under minimum. Forteller hvor tilgivende feltet er.
- Virker uten nett (PWA), kan legges på hjemskjermen.

**Materialer og innkjøp**
- Antall bord per bredde og lengde, løpemeter, valgfritt svinnpåslag.
- Kappliste per felt (korte bord over og under vinduer). Kobles senere mot kappeplan-appen for minst mulig svinn.
- Valgfri pris per løpemeter.
- **Avklart med Kenny 2026-11-09:** det bestilles i løpemeter per dimensjon (tykkelse × bredde), trelast leverer lengdene. Hvert bord regnes som vegghøyden (eller høyden på feltet over/under åpningen) pluss et kapptillegg per bord (innstilling, standard 50 mm). Svinn standard 10 %. Lista kopieres eller deles som tekst fra telefonen (PDF i fase 6).

**Dokumentasjon**
- Tegning i skala (SVG) av hele veggen med alle bord.
- Utskrift eller PDF med tegning, utdelingsmål og materialliste, så laget på stillaset får samme grunnlag.
- Lagre prosjekter lokalt, flere vegger per hus.

## 5. Teknisk valg (forslag)

- Webapp i ren HTML, CSS og JavaScript. Ingen rammeverk i starten, så koden er lett å forstå mens du lærer.
- Regnemodellen i egen fil (`solver.js`) uten noe skjermkode, med automatiske tester (`node --test`). Da kan vi bytte ut skjermdelen senere uten å røre matematikken.
- Tegning med SVG.
- Lagring i nettleseren (localStorage) i første omgang.
- Publisering på GitHub Pages, samme måte som Matboken.
- PWA (offline og hjemskjerm) i en senere fase.

## 6. Faser

| Fase | Innhold | Ferdig når |
|---|---|---|
| 0 Oppsett | Prosjektmappe, git, egen CLAUDE.md for appen | Tom side vises i nettleseren |
| 1 Kjernen | `solver.js` for ett felt, alle fire start/slutt-kombinasjoner, tester | NDLA-eksempelet og håndregnede kontroller går grønt |
| 2 Ett felt med skjerm | Skjema, resultat, utdelingsmål-tabell, SVG-tegning, distanseklossmål | Kan brukes på et enkelt felt fra telefonen |
| 3 Vegg med åpninger | Vinduer og dører, automatisk feltdeling, felles rytme | En garasjevegg med to vinduer og en port blir riktig |
| 4 Hjørner og tykkelser | Hjørnelogikk, ulike tykkelser, målt bordbredde, flere vegger | Et helt lite hus kan legges inn |
| 5 Materialer | Materialliste, kappliste, svinn, pris | Liste som kan sendes til trelast |
| 6 Byggeplass | Merkemodus, PWA/offline, lagring, PDF-utskrift | Testet ute på en ekte vegg |

## 7. Tester som må finnes

- NDLA-eksempelet over.
- Alle fire kombinasjoner (U–U, U–O, O–U, O–O) med håndregnede svar.
- Sum av alle bord og klaringer skal alltid bli nøyaktig feltlengden.
- Omlegget skal aldri bli lavere enn minimum. Finnes ingen løsning, skal appen si det tydelig og foreslå hva som kan endres (annen bordbredde, annen start/slutt).
- Omlegg over maks gir varsel, men løsningen vises likevel. Omlegg innenfor minimum–maks foretrekkes når det finnes. (Maks er 30 mm etter Bakøys praksis, se punkt 8.)
- Svært korte felt (smale felt ved vinduer) og svært lange felt.
- Ulik bredde på under- og overligger.

## 8. Fagverdier (avklart 2026-11-08)

Byggforsk 542.101 «Liggende og stående trekledning» krever innlogging og er ikke lest i fulltekst. Verdiene under bygger på Treteknisk og monteringsanvisningene fra G3 Gausdal og Talgø, som viser til 542.101. Bør kontrolleres mot bladet hvis Bakøy har tilgang.

- **Omlegg:** standard 25 mm, minimum 20 mm, varsel over 30 mm (endret av Kenny 2026-11-08: Bakøy flagger ikke omlegg før det passerer 30 mm; opprinnelig 25 mm). Treteknisk sier at omlegget må være minst 20–25 mm. G3 og Talgø anbefaler maks 25 mm. Alle tre verdiene skal kunne endres i innstillinger.
- **Klaring:** ingen egen minsteverdi. Den følger av omlegget. Med 20–25 mm omlegg blir klaringen 98–108 mm med 148 mm overligger og 48–58 mm med 98 mm overligger.
- **Spikring (vises som råd, ikke beregning):** ikke spikre gjennom to bord (Treteknisk). Talgø: én spiker eller skrue i underligger og to i overligger, og bord bredere enn 120 mm festes med to festemidler, med henvisning til 542. En annen anvisning setter grensen ved 123 mm.
- **Lekteavstand (råd):** cc 600–900 mm etter 542.101 ifølge Talgø, som selv anbefaler maks cc 600 mm.
- **Standard bordbredder (godkjent 2026-11-08):** 73, 98, 123, 148, 173, 198 og 223 mm, slik norskalkulator.com bruker. Brukeren kan alltid legge inn målt faktisk bredde.

## 9. Avklart (2026-11-08)

- **Brukere:** Bakøys tømrere. Ingen innlogging eller App Store i første omgang.
- **Plattform:** mobil i nettleser. Skjermene lages for telefon først, med store knapper og stor skrift.
- **Videre utvikling:** appen kan bli bygget videre senere (andre kledningstyper, kappeplan). Derfor holdes regnemodellen i egne moduler, så en ny kledningstype kan legges til uten å skrive om det som finnes.

## 10. Første prompt i Claude Code

> Les PLAN.md. Vi starter med fase 0 og 1. Jeg er nybegynner, så forklar kort hva du gjør i hvert steg. Lag prosjektstrukturen, en CLAUDE.md for appen, og `solver.js` med tester for de fire start/slutt-kombinasjonene. Første test skal være NDLA-eksempelet i punkt 3. Ikke lag skjermdelen ennå.

## Kilder

- [Treteknisk, TreFokus om kledning (NOBB)](https://cdn.byggtjeneste.no/nobb/7cc9c3a1-ab27-4009-936c-bb1eaf92205b)
- [G3 Gausdal, monteringsanvisning utvendig kledning v3.1 (NOBB)](https://cdn.byggtjeneste.no/nobb/f141a3be-cdec-406e-b792-0ac08ea6c166)
- [Talgø, monteringsanvisning utvendig kledning (NOBB)](https://cdn.byggtjeneste.no/nobb/014c3756-d7d7-4860-af53-7bc6df0328da)
- [Kledning-kalkulator – lommeregner.no](https://lommeregner.no/kledning-kalkulator)
- [Inndeling av tømmermannskledning – NDLA](https://ndla.no/nn/r/matematikk-1p-y---ba/inndeling-av-tommermannskledning/fe1d8ba35d)
- [Tømmermannskledning kalkulator – norskalkulator.com](https://norskalkulator.com/tommermannskledning-kalkulator/)
- [Board and Batten Layout Calculator – Inch Calculator](https://www.inchcalculator.com/board-and-batten-layout-calculator/)
- [Board and Batten Calculator – FigureCalc](https://figurecalc.pages.dev/wall-finish/board-and-batten-calculator)
- [Blocklayer – Board & Batten spacing](https://www.blocklayer.com/centers-spacingeng.aspx)
- [Kalkulator for utregning av stående kledning – byggebolig.no](https://byggebolig.no/eksterior-tak-ytterkledning-og-maling-(ute)/kalkulator-for-utregning-av-staende-kledning)
- [Verktøy for å beregne panel – byggebolig.no](https://www.byggebolig.no/maleteknikk/verktoy-for-a-beregne-panel)
