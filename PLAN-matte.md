# Plan: ny modul for matte

Plan 2026-11-11, oppdatert samme dag etter Kennys svar (punkt 10). Skrevet da appen sto på commit cdb69f1 (Kledning og Trapp til og med fase T3). Planen er skrevet for Opus 5.5 i Claude Code og bygges én fase om gangen, rett på `main`.

Trapp er satt på pause etter fase T6 (commit 0cd6980, 153 grønne tester), og Matte startet med fase M0 samme dag (Kenny 2026-11-11). M0 publisert 2026-11-11 (commit 7b76ce3, 166 tester). M1 publisert samme dag (commit 8c89330, 181 tester). M2 bygget samme dag (194 tester), med `fordelSpiler` i `src/matte/inndeling.js` klar for T7. T7–T10 i `PLAN-trapp.md` tas senere. T7 (sprosser i rekkverk) skal da bruke inndelingen for spiler fra `src/matte/inndeling.js` (fase M2).

## 1. Mål

En samling små kalkulatorer for det tømreren regner på til daglig: fall, takvinkler, sperrer, gjæring, inndeling, buer, mengder og omregning. Hver kalkulator har to til fem felt, ett tydelig svar og en skisse som viser hvilket mål som er hvilket. Tømreren skal kunne gå fra målebånd til sag uten kalkulator og uten å lure på hva tallet betyr.

Modulen skal se ut og oppføre seg som Kledning og Trapp: samme toppbånd, kort, knapper, varsler og tegninger. Telefon først, virker uten nett.

## 2. Slik passer modulen inn i appen

- **Tredje valg i verktøyvelgeren:** bryteren øverst blir «Kledning | Trapp | Matte» (`.valgknapper.tre` finnes i `css/stil.css`). Navnet er avklart med Kenny. `VERKTOY` i `src/skjerm/verktoy.js` får en linje til, og siden får `#matte-del`.
- **Meny i stedet for ett langt skjema:** Matte åpner med en liste over kalkulatorene, gruppert (Fall og tak, Vinkler og gjæring, Inndeling, Buer, Areal og betong, Mengder og vekt, Omregning). Ett trykk åpner en kalkulator, «Tilbake» går til lista. Sist brukte ligger øverst. Appen husker hvilken kalkulator som var åpen og tallene i hver.
- **Kalkulatorene beskrives som data, ikke som håndskrevet HTML.** Kledning og Trapp har skjemaene sine skrevet rett i `index.html`. Med over tjue kalkulatorer blir det uhåndterlig. Hver kalkulator er derfor én oppføring i en liste (tittel, felt, regnefunksjon, hva som vises, skisse), og én felles skjermfil bygger skjema og resultat av oppføringen. En ny kalkulator blir da én oppføring og én regnefunksjon med test, uten endring i `index.html`. Se punkt 6.
- **Regnemodellen i egen mappe:** `src/matte/`, uten skjermkode, på samme måte som `src/tommermann/` og `src/trapp/`. Kledning og Trapp røres ikke.
- **Gjenbruk:** `kort`, `boks`, `tabell` og `zoomBoks` fra `biter.js`, `lesTall` og `mm` fra `format.js`, `lagre` og `hent` fra `lagring.js`. Varsler har samme form som i trapp (`niva`: `ma`, `bor`, `vite`, pluss `type`, `tekst`, `kilde`).
- **Kobling til trapp:** fase T7 i `PLAN-trapp.md` (inndeling av sprosser) skal bruke funksjonen for spiler fra `src/matte/inndeling.js`, ikke regne det samme en gang til.
- **Versjon og uten nett:** `scripts/versjon.mjs` finner nye filer under `src/` selv. Husk `npm run versjon` når en ny JavaScript-fil er lagt til, ellers feiler `test/versjon.test.js`.

## 3. Felles regler for alle kalkulatorene

1. **Mål i mm, vinkler i grader.** Regn med desimaler hele veien. Lengder vises i hele mm, vinkler med én desimal, areal og volum med to. Løpende mål (merker bortover) avrundes hvert for seg, aldri avrundet avstand lagt sammen. Samme regel som i resten av appen.
2. **Alltid to vinkler: den på emnet og den på saga.** Skalaen på kapp- og gjærsaga viser grader fra rett kapp (0 = vinkelrett på emnet). En gjæring på 45° og et hjørne på 135° gir derfor ikke samme tall på saga. Hvert svar med vinkel viser «Vinkel på emnet» og «Still saga på», og skissen viser hvor vinkelen måles. Dette er den vanligste feilkilden og viktigste grunnen til å lage modulen.
3. **Skisse i hver kalkulator.** Liten SVG med de samme navnene som feltene (løp, utstikk, korde, pilhøyde). Tegnes i riktig forhold der det gir mening. Farger bare fra variablene i `:root`.
4. **«Slik er det regnet».** En boks som kan åpnes, med formelen og tallene satt inn. Da kan tømreren kontrollere svaret, og lærlingen ser metoden.
5. **Fornuftige grenser.** Tomt felt gir ikke feilmelding, bare ikke noe svar. Umulige mål (vinkel 90° eller mer på tak, pilhøyde over halve korden uten at det er ment, null eller minus) gir en kort beskjed om hva som er galt.
6. **Krav og råd holdes fra hverandre.** Appen viser et krav bare når det er lest i kilden (punkt 9). Alt annet er råd eller ingenting. Ingen tall for forbruk, vekt eller grenser legges inn før Kenny har bekreftet dem.
7. **Appen regner geometri, ikke bæreevne.** Der det kan misforstås (fuglemunn, sperre), sier appen det.

## 4. Kalkulatorene

«Nytt» er mine forslag i tillegg til Kennys liste. Kontrolleksemplene er regnet 2026-11-11 og blir første test for hver kalkulator.

### Fall og tak

**Fall og takvinkel (omregning).** Ett felt fylles ut (grader, prosent, 1:x eller mm per meter), de tre andre vises. Valgfri lengde gir høydeforskjellen, og «målt høydeforskjell på målt lengde» gir fallet tilbake.
- `tan(v) = prosent / 100 = 1 / x = mm per meter / 1000`.
- Kontroll: 1:50 = 2,0 % = 20 mm/m = 1,1°, og 48 mm på 2400 mm. 22° = 40,4 % = 1:2,48 = 404 mm/m. Målt 35 mm på 2400 mm = 1:68,6.
- Greit å vite på bad: preaksepterte ytelser i TEK17 § 13-15 (punkt 9).

**Nytt: Trekanten.** Rettvinklet trekant med liggende, stående, skrå og vinkel. To kjente gir de to andre. Dekker skråstag, avstivere, kiler og alt annet som er en trekant, og er grunnlaget de andre takkalkulatorene bygger på.
- Saga: et stag langs skrå kappes på 90 − v mot liggende og på v mot stående. Over 45° på saga sier appen at det kan merkes og kappes etter strek.
- Kontroll (lagt til i M1): liggende 3000 og stående 4000 gir skrå 5000 og vinkel 53,13°, saga 36,9° mot liggende og 53,1° mot stående.

**Nytt: Kiler og oppforing.** Fall og c/c gir høyden på oppforingen i hvert punkt bortover (løpende liste), for flatt tak, terrasse og avretting.
- Høyde i et punkt = høyde i lav ende + avstand × tan(v). Siste punkt er alltid enden.
- Kontroll (lagt til i M1): 2 % over 3000 mm, c/c 600, 10 mm i lav ende gir 10, 22, 34, 46, 58 og 70 mm.

**Sperre.** Inn: løp (vannrett fra utside svill til midt møne), takvinkel, utstikk (vannrett), sperrehøyde, sete i fuglemunnen, tykkelse på mønebord (0 uten).
- Lengde langs overkant = (løp + utstikk) / cos(v). Med mønebord trekkes (tykkelse / 2) / cos(v).
- Emnelengde = lengde langs overkant + sperrehøyde × tan(v), fordi loddsnittene står skrått i begge ender.
- Loddsnitt: still saga på v. Vannrett snitt: 90 − v, som ofte er mer enn saga går til. Da sier appen at det merkes med vinkel.
- Fuglemunn: loddrett høyde = sete × tan(v), dybde vinkelrett på kanten = sete × sin(v), resthøyde = sperrehøyde − dybde.
- Kontroll: løp 4000, 30°, utstikk 600, sperre 48 × 198, sete 98. Lengde 5311,6 (herav utstikk 692,8, møne til hakk 4618,8). Emne 5426. Stigning 2309,4. Hakk 56,6 loddrett og 49,0 vinkelrett, resthøyde 149,0.

**Gradsperre og kilsperre.** Første utgave gjelder lik takvinkel på begge takflater og hjørne på 90° (avklart med Kenny). Appen sier det tydelig. Ord: «skiftesperre (stikksperre)» første gang, så «skiftesperre». Begge ordene brukes hos Bakøy.
- Vannrett lengde = løp × √2. Gradvinkel = atan(tan(v) / √2). Lengde = løp × √(2 + tan²(v)).
- Loddsnitt: saga på gradvinkelen. Sidekutt mot møne og mot skiftesperrene: bladet lagt 45°.
- Fasing av overkanten: atan(sin(gradvinkel)). Alternativt senkes graden i hakket: (tykkelse / 2) × tan(gradvinkel).
- Skiftesperrene (stikksperrene, de korte inn mot graden) blir cc / cos(v) kortere for hver. Fratrekk for gradens tykkelse: (tykkelse / 2) × √2 vannrett. Kontrolleres av Kenny på første tak.
- Kilsperre har samme lengde og vinkler som grad.
- Kontroll: løp 4000, 30°. Vannrett 5656,9, gradvinkel 22,2°, lengde 6110,1, fasing 20,7°. Skiftesperrer ved c/c 600: 692,8 kortere for hver. Kjent verdi til testen: takvinkel 26,57° (1:2) gir gradvinkel 19,47° og fasing 18,43°.

**Stendere i gavl og skråvegg.** Inn: takvinkel, c/c, stendertykkelse, lengden på første stender.
- Økning per stender = cc × tan(v). Kappes med saga på v. Forskjell mellom lang og kort side = tykkelse × tan(v). Appen sier hvilken side målet gjelder.
- Kontroll: c/c 600 og 30° gir 346,4 per stender, løpende 346, 693, 1039, 1386. Lang og kort side skiller 27,7 mm på 48 mm stender.

**Nytt: Takflate.** Grunnflate / cos(v), til takstein, undertak og lekter. Kontroll: 8,0 × 4,0 m ved 30° = 36,95 m².

### Vinkler og gjæring

**Gjæring i hjørne.** Inn: målt vinkel mellom de to flatene. Vinkel på emnet = hjørne / 2. Still saga på 90 − hjørne / 2.
- Kontroll: 90° gir 45,0 på saga. 135° gir 22,5. 87° gir 46,5.

**Mangekant.** Inn: antall sider, og valgfritt mål over flatene eller over hjørnene. Still saga på 180 / n. Sidelengde = D × tan(180 / n) over flatene, D × sin(180 / n) over hjørnene.
- Kontroll: seks sider 30,0, åtte sider 22,5. Åttekant 2000 mm over flatene har side 828,4.

**Sammensatt gjæring (taklist som ligger flatt på saga).** Inn: veggvinkel W og listens helning S (vinkelen mellom baksiden av lista og veggen).
- Gjæring (dreieskiva) = atan(sin(S) / tan(W / 2)). Skråstilling (bladet) = asin(cos(S) × cos(W / 2)).
- Kontroll: S 38 og W 90 gir 31,6 og 33,9. S 45 og W 90 gir 35,3 og 30,0. S 38 og W 135 gir 14,3 og 17,6. Grensetilfellene skal også testes: W 180 gir 0 og 0, S 90 gir 90 − W / 2 og 0.
- Appen sier også den enkle metoden: lista stilt opp-ned mot anlegget, slik den står i taket, trenger bare vanlig gjæring.

**Rett vinkel og diagonal.** Diagonal = √(a² + b²), og største 3-4-5-trekant som får plass.
- **Nytt: skjevhet fra to målte diagonaler.** Hjørnet flyttes (D1² − D2²) / (4 × a) langs siden a.
- Kontroll: 8000 × 6000 gir 10 000. Diagonaler på 10 016 og 9984 betyr at hjørnet står 20 mm feil.

### Inndeling

Regnefunksjonene her er de samme som trapp fase T7 skal bruke.

**Lik avstand mellom to faste punkter.** Inn: lengde og største c/c. Antall felt = lengden delt på c/c, rundet opp. Valg: lik avstand, eller fast c/c fra den ene enden med resten til slutt. Forhåndsvalg for lekter til takstein med både minste og største avstand.
- Kontroll: 4000 med maks 600 gir 7 felt à 571,4, merker 571, 1143, 1714, 2286, 2857, 3429.

**Spiler og rekkverk.** Inn: lysåpning mellom stolpene, spilebredde, største åpning (standard 100 mm etter kravet, kan settes lavere for margin, avklart med Kenny). Over 100 gir varsel som må fikses. Antall = (lysåpning − maks) / (bredde + maks), rundet opp. Åpning = (lysåpning − antall × bredde) / (antall + 1). Løpende mål til forkant av hver spile.
- Kontroll: 1800 mm, spiler 21 mm, maks 100 gir 15 spiler og åpning 92,8 (14 spiler gir 100,4, for mye). Første merker 93, 207, 320, 434.
- Krav: TEK17 § 12-15 femte ledd (punkt 9). Lest på nytt på dibk.no 2026-11-11 i fase M2.
- Lekter: appen har ingen standardverdier. Minste og største avstand skrives inn fra leggeanvisningen for steinen. Går det ikke opp med lik avstand innenfor begge, kommer «må fikses».

**Nytt: Terrassebord og spaltekledning.** Inn: bredde, bordbredde, ønsket spalte. Gir antall hele bord og nøyaktig spalte, med ett bord færre og ett mer som alternativ.
- Kontroll: 3000 mm, 120 mm bord, ønsket 5 gir 24 bord og spalte 5,2.

### Buer

**Bue fra korde og pilhøyde.** Radius = korde² / (8 × pilhøyde) + pilhøyde / 2. Buelengde = radius × sentervinkel, der sentervinkel = 2 × asin(korde / (2 × radius)). Kan også snus: radius og korde gir pilhøyden.
- **Nytt: stikkmål.** Høyden opp til buen for hver 100 eller 200 mm ut fra midten av korden, så buen kan settes ut uten passer: `√(R² − x²) − (R − pilhøyde)`.
- Kontroll: korde 1200 og pilhøyde 150 gir radius 1275, buelengde 1249,4. Stikkmål i 0, 200, 400 og 600 fra midten: 150,0, 134,2, 85,6 og 0.

**Sirkel.** Omkrets og areal fra diameter.

### Areal og betong

**Vegg og gavl.** Rektangel og trekant (bredde og høyde, eller bredde og takvinkel), med liste over fratrekk for vinduer og dører.

**Betong.** Plate, såle, søyle (rund og firkantet) og trapp. Svinn som eget felt.
- Trapp: trinnene = antall × opptrinn × inntrinn / 2 × bredde. Plata = tykkelse × skrålengde × bredde.
- Kontroll: plate 6,0 × 4,0 × 0,10 = 2,40 m³. Rund søyle Ø300, 2400 høy = 0,170 m³. Trapp med 5 trinn 170 × 275, bredde 1000 og plate 120: 0,117 + 0,194 = 0,311 m³.

### Mengder og vekt

- Kledning i løpemeter = areal / dekkbredde. Antall plater = areal med svinn / plateareal, rundet opp. Lekter og sløyfer per m² fra c/c. Isolasjon i m² og m³ omregnet til pakker.
- Forbruk av skruer og spiker per m².
- Vekt per plate og per løpemeter, sum for et løft.
- **Produktdata (avklart med Kenny):** Opus finner platemål, pakkeinnhold, forbruk og vekt i produsentenes datablad for vanlige produkter (gips, OSB, sponplate, kryssfiner, mineralull, kledning, festemidler). Hver verdi får kilde (produsent, produkt, lenke, dato lest) i `src/matte/fagverdier.js`. Verdiene legges fram for Kenny som en tabell før de tas i bruk, og fasen er ikke ferdig før han har bekreftet dem. Alle skal kunne endres i innstillinger.

### Kappliste

- Inn: bitene som trengs (lengde og antall), lengdene som kan kjøpes, sagsnitt (standard 3 mm, antakelse som Kenny bekrefter).
- Ut: hvor mange av hver lengde som skal bestilles, hvilke biter som kappes av hver lengde, og restbiten. Appen viser også nedre grense (sum av biter delt på lengden, rundet opp), så det synes om svaret kan bli bedre.
- Metode: lengste bit først, inn i første lengde den får plass i. Er svaret over nedre grense, prøves flere rekkefølger. Det er ikke garantert beste løsning, og appen sier det.
- Kontroll: 4 × 2400, 3 × 1800 og 2 × 1200 av 5400 med sagsnitt 3 gir 4 lengder (2400 + 2400 to ganger, 1800 + 1800 + 1200, 1800 + 1200) med rest 597, 597, 594 og 2397. Nedre grense er 4.

### Omregning

- Tommer til mm (× 25,4), også brøk («2 1/2» = 63,5).
- Tommemål på trelast til faktiske mål, etter tabellen i punkt 9.

### Kan komme senere (ikke planlagt)

- Grad og kil med ulik takvinkel eller hjørne som ikke er 90°.
- Skrå kasse (blomsterkasse med skrå sider). Samme formler som sammensatt gjæring.
- Nivellering: avlesninger til høydeforskjell.

## 5. Bevisst utelatt

- Bæreevne, spennvidder og dimensjonering. Det er prosjekteringsansvar, og tabellene er Byggforsks.
- Priser. Repoet er offentlig.
- U-verdi og energiberegning.

## 6. Teknisk oppsett

```
src/matte/tak.js            fall, trekant, sperre, grad og kil, gavlstendere, takflate
src/matte/vinkel.js         gjæring, mangekant, sammensatt gjæring, diagonal
src/matte/inndeling.js      lik avstand, spiler, terrassebord
src/matte/bue.js            radius, buelengde, stikkmål, sirkel
src/matte/mengde.js         areal, betong, plater, kledning, isolasjon, vekt
src/matte/omregning.js      tommer, trelast
src/matte/kappliste.js      bestillingslengder og kapp
src/matte/fagverdier.js     standardverdier og produktdata
src/skjerm/matte-liste.js   oppføringen for hver kalkulator
src/skjerm/matte-skjerm.js  menyen, skjema og resultat bygd fra oppføringene
src/skjerm/matte-tegning.js skissene (SVG), uten kobling til nettleseren
test/matte-*.test.js        én testfil per fil i src/matte/
```

En oppføring i `matte-liste.js` ser omtrent slik ut:

```js
{
  id: 'spiler',
  gruppe: 'inndeling',
  tittel: 'Spiler og rekkverk',
  felt: [
    { id: 'lysapning', ledetekst: 'Lysåpning mellom stolpene', enhet: 'mm' },
    { id: 'bredde', ledetekst: 'Bredde på spilene', enhet: 'mm', standard: 21 },
    { id: 'maks', ledetekst: 'Største åpning', enhet: 'mm', standard: 100 },
  ],
  regn: fordelSpiler,          // fra src/matte/inndeling.js
  vis: (r) => ({ nokkeltall: [...], liste: [...], utregning: [...] }),
  tegn: tegnSpiler,            // fra matte-tegning.js
  eksempel: { lysapning: 1800, bredde: 21, maks: 100 },
}
```

- Regnefunksjonene tar ett objekt inn og gir ett objekt ut med uavrundede tall og `varsler`. Skjermdelen avrunder.
- `format.js` får en funksjon for grader ved siden av `mm`.
- Lagring under nøkkelen `matte`: `{ apen, verdier: { [id]: {...} }, sist: [...] }`.
- Endringer i det som finnes: `index.html` (tredje valg i bryteren og `#matte-del`), `verktoy.js` (ny linje), `app.js` (laster matte-skjermen), `css/stil.css` (menyen og variabler for skissene). Kledning og Trapp endres ikke.

## 7. Faser

| Fase | Innhold | Ferdig når |
|---|---|---|
| M0 Ramme | Planen inn i repoet som `PLAN-matte.md`, avsnitt i appens CLAUDE.md, tredje valg i bryteren, meny, felles skjerm bygd fra oppføringer, én kalkulator hele veien (fall og takvinkel) | Bryteren virker på 375 px bredde, Kledning og Trapp er uendret, 153 tester grønne pluss de nye |
| M1 Fall og trekant | Fall over lengde (kom med i «Fall og takvinkel» i M0), trekanten, kiler og oppforing, diagonal og skjevhet | Fall på et bad og diagonalen på et fundament kan regnes fra telefonen |
| M2 Inndeling | Lik avstand, spiler og rekkverk, terrassebord, lekter | Spiler til et rekkverk går opp med åpning under kravet |
| M3 Tak | Sperre med loddsnitt og fuglemunn, gavlstendere, takflate | Kontrolleksempelet for sperre stemmer, og skissen viser hvor hvert mål tas |
| M4 Gjæring | Hjørne, mangekant, sammensatt gjæring | De kjente verdiene i punkt 4 går grønt. Prøvd på en ekte list |
| M5 Grad og kil | Gradsperre, kilsperre, skiftesperrer | Kontrolleksempelet stemmer. Prøvd av Kenny mot et tak han kjenner |
| M6 Buer | Radius, buelengde, stikkmål, sirkel | En bue kan settes ut fra stikkmålene |
| M7 Areal, betong, omregning | Vegg og gavl med fratrekk, betong, tommer og trelast | Betong til en plate og en trapp kan bestilles fra skjermen |
| M8 Mengder og vekt | Produktdata fra datablad med kilde, så plater, kledning, isolasjon, fester og vekt | Kenny har bekreftet tabellen med produktdata, og en vegg kan regnes til bestilling |
| M9 Kappliste | Biter og lengder inn, bestilling og kapp ut, nedre grense | Kontrolleksempelet går grønt, og en ekte kappliste fra Kenny gir et svar han godtar |
| M10 Finpuss | Favoritter, søk i lista, kopier eller del svaret, utskrift | Avklares med Kenny da |

Én fase om gangen. Opus går ikke videre før Kenny sier fra, og publiserer ikke før Kenny har sagt ja. Hver fase avsluttes med grønne tester og at skjermen er sett på i mobil og bred bredde.

## 8. Tester som må finnes

- Kontrolleksemplene i punkt 4, ett per kalkulator, først i hver testfil.
- Omregning av fall fram og tilbake gir samme tall (grader til 1:x og tilbake).
- Sum av alle avstander i en inndeling er nøyaktig lengden. Siste løpende merke stemmer med lengden på nærmeste mm.
- Spiler: åpningen er aldri over største åpning, og én spile færre ville gitt for stor åpning.
- Sammensatt gjæring: de tre kjente verdiene og de to grensetilfellene.
- Grad: takvinkel 26,57° gir 19,47° og 18,43°.
- Bue: stikkmålet midt på er pilhøyden, og i enden av korden er det 0.
- Kappliste: alle biter kommer med nøyaktig én gang, ingen lengde er overfylt med sagsnitt medregnet, og antallet er aldri under nedre grense.
- Umulige inndata gir beskjed og ikke `NaN` på skjermen.
- Alle 153 testene for kledning og trapp er fortsatt grønne.

## 9. Fagverdier

**Bekreftet** på dibk.no 2026-11-11. Sidene er lest via sammendrag og leses på nytt i fasen der kravet tas i bruk.

| Krav | Verdi | Type |
|---|---|---|
| Åpninger i rekkverk | maks 0,10 m opp til minst 0,75 m høyde, også mellom rekkverk og gulv eller trinn (veiledningen). Lest på nytt 2026-11-11 i M2 | Forskrift, § 12-15 femte ledd |
| Rekkverk i trapp og rampe | minst 0,9 m over gulv eller trinn | Forskrift, § 12-15 |
| Rekkverk på balkong og terrasse | minst 1,0 m ved nivåforskjell inntil 10 m, 1,2 m over | Forskrift, § 12-15 |
| Vannrett avstand mellom bygningsdel og utenpåliggende rekkverk | maks 0,05 m | Forskrift, § 12-15 |
| Fall til sluk i våtrom | «tilstrekkelig fall», ingen tall | Forskrift, § 13-15 |
| Fall i dusjsonen | 1:50 i minst 0,8 m fra sluket, eller 1:100 i nedsenket nedslagsfelt (minst 10 mm), eller 1:100 på hele gulvet | Preakseptert, § 13-15 |

**Bekreftet av Kenny 2026-11-11** (tommemål til faktiske mål på justert trelast): 1" = 23, 1 1/2" = 36, 2" = 48, 3" = 73, 4" = 98, 5" = 123, 6" = 148, 7" = 173, 8" = 198, 9" = 223 mm. Breddene fra 73 til 223 er de samme som appen bruker i dag (`STANDARD_BREDDER`).

**Antakelse, regnet av meg og ikke hentet fra fagkilde:** formlene for grad og kil (fasing, senking, fratrekk på skiftesperrene) og sammensatt gjæring. De stemmer med kjente tabellverdier (punkt 4), men Kenny prøver dem på ekte emne før fasen regnes som ferdig.

**Ikke slått opp. Legges ikke inn før de er lest eller Kenny har bestemt dem:**

- Fall på flatt tak, terrasse og utvendig betong.
- Hvor mye som kan tas ut i en fuglemunn. Appen viser resthøyden uten grense.
- Lekteavstand for takstein (kommer fra leggeanvisningen for steinen).
- Platemål, pakkeinnhold for isolasjon, forbruk av skruer og spiker, vekt på materialer. Hentes fra datablad i fase M8 og bekreftes av Kenny.
- Sagsnitt i kapplista (3 mm er en antakelse).
- Grense for hva én person kan løfte. Arbeidstilsynets veiledning leses før appen sier noe om det.

## 10. Avklart (2026-11-11)

- **Navn:** «Matte». Bryteren blir «Kledning | Trapp | Matte».
- **Rekkefølge:** fall og inndeling først (M1 og M2), så tak og resten som i punkt 7.
- **Ord:** begge ordene brukes. Appen skriver «skiftesperre (stikksperre)» første gang. «Loddsnitt», «sete» og «fuglemunn» er riktige.
- **Rekkverk:** største åpning er 100 mm som standard og kan settes lavere for margin.
- **Grad og kil:** lik takvinkel og 90° hjørne holder i første utgave.
- **Trelasttabellen** i punkt 9 stemmer.
- **Produktdata (M8):** Opus henter dem fra produsentenes datablad med kilde, og Kenny bekrefter tabellen før den tas i bruk.
- **Kappliste** er tatt inn som egen fase (M9). Skrå kasse og nivellering står fortsatt under «Kan komme senere». Ingenting er tatt ut.

## 11. Første prompt i Claude Code (Opus 5.5)

> Les PLAN-matte.md og appens CLAUDE.md. Vi starter med fase M0. Forklar kort hva du gjør i hvert steg. Legg planen i repoet, legg inn «Matte» som tredje valg i bryteren uten å endre Kledning og Trapp, og bygg menyen og den felles skjermen som lager skjema og resultat fra en oppføring. Lag kalkulatoren «Fall og takvinkel» hele veien med regnefunksjon i `src/matte/tak.js`, test, skisse og «Slik er det regnet». Første test er kontrolleksempelet i punkt 4. Svarene mine står i punkt 10. Se på resultatet i nettleseren i mobil og bred bredde. Ikke start på M1 og ikke publiser før jeg sier fra.

Senere faser: «Fase M*n* er godkjent. Start på fase M*n+1* etter PLAN-matte.md. Samme regler som sist.»

## Kilder

- [TEK17 § 12-15 Rekkverk med veiledning – DiBK](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/12/iii/12-15)
- [TEK17 § 13-15 Våtrom og rom med vanninstallasjoner med veiledning – DiBK](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/13/vi/13-15)
- `PLAN-trapp.md` og appens `CLAUDE.md` i `~/Kode/tommermannspanel` (lest 2026-11-11)
