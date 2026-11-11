# Plan: ny modul for trapp

Plan 2026-11-11, oppdatert samme dag etter Kennys svar (punkt 10). Bygger på tømmermannspanel-appen slik den står i `~/Kode/tommermannspanel` (commit 903a708, 84 grønne tester). Første leveranse er utvendig tretrapp med uttatt vange.

## 1. Mål

Et verktøy for Bakøys tømrere som regner ut en trapp fra to mål: høyden mellom underlag og dekke (eller mellom gulvene) og plassen trappa har. Tømreren får antall trinn, opptrinn og inntrinn, kontroll mot TEK17, og ferdige merker for vangen, slik at den kan merkes og kappes uten å regne for hånd.

Verktøyet skal se ut og oppføre seg som tømmermannspanel-delen: samme toppbånd, samme kort, samme knapper, samme måte å vise varsler og tegninger på. Telefon først, virker uten nett.

## 2. Hva finnes i dag (research 2026-11-11)

| Verktøy | Gjør bra | Mangler |
|---|---|---|
| Blocklayer, «Straight Stairs» (lest) | Total høyde og ønsket opptrinn eller total lengde. Tegning av uttatt og innfelt vange med mål, løpende merker langs vangen, fri høyde mot etasjeskiller, mal i full størrelse | Engelsk, ingen kontroll mot TEK17, tommer som utgangspunkt, tungt på telefon |
| NDLA og matematikksenteret (trappeformelen) | Forklarer metoden | Lærestoff, ikke verktøy. PDF-en lot seg ikke lese, så eksempelet derfra er ikke brukt |
| byggebolig.no (søketreff, ikke lest i fulltekst) | Viser hva folk spør om: antall trinn på utvendig trapp, vange, svingtrapp | Folk regner for hånd eller i egne regneark |

**Sannsynlig:** det finnes ingen norsk trappekalkulator som gir merker for vangen og kontroll mot TEK17 i samme verktøy. To søk ga ingen. Det er ikke det samme som at den ikke finnes.

## 3. Slik passer modulen inn i appen

Trappa bygges inn i samme app og samme side (avklart 2026-11-11). Da deles utseende, lagring, versjonsnummer, bruk uten nett og utskrift, og tømrerne har ett ikon på hjemskjermen.

- **Nytt navn:** appen heter «Bakøy tømrerverktøy» i sidetittel, på hjemskjermen og i manifestet. Adressen og repoet beholdes (`kgrenne-ctrl.github.io/tommermannspanel`), så lenkene på telefonene virker som før.
- **Verktøyvelger øverst:** en bryter «Kledning | Trapp» over dagens bryter «Ett felt | Hel vegg». Samme `.valgknapper` som i dag. Valget huskes på telefonen.
- **Toppbåndet følger verktøyet:** «Tømmermannspanel – Inndeling av stående kledning» eller «Trapp – Inndeling og merking av vange».
- **Regnemodellen i egen mappe:** `src/trapp/`, uten skjermkode, på samme måte som `src/tommermann/`. Kledningsdelen røres ikke.
- **Skjermdelen gjenbruker det som finnes:** kortene (`<section class="del">`), knappene (`.knapp`, `.primar`, `.lenkeknapp`, `.fare`), nøkkeltallkortene (`kort`), varselboksene (`boks`), tabellene, zoom på tegning (`zoomBoks`), tallformat (`format.js`), lagring (`lagring.js`), snarveiene øverst og to kolonner fra 1100 px.
- **Varsler i samme tre grupper:** «Må fikses før du begynner», «Bør sjekkes», «Greit å vite».
- **Farger:** bare variablene i `:root` i `css/stil.css`. Tegningen av trappa får egne variabler (trinn, vange, underlag), ingen fargekoder i koden.
- **Versjon og uten nett:** `scripts/versjon.mjs` finner alle `.js`-filer under `src/` selv, så nye filer kommer med i importkartet og i `sw.js` uten endring i skriptet. (Bekreftet ved lesing av `finnModuler`.)

## 4. Regnemodellen (kjernen)

**Inndata:** høyde `H` fra ferdig underlag nede til ferdig gulv eller dekke oppe, og ett av tre valg for lengden:

| Valg | Brukes når | Inntrinn `b` |
|---|---|---|
| Fast inntrinn | Trinnet er gitt av materialet, f.eks. to terrassebord (vanlig ute) | `b` som oppgitt, lengden følger |
| Tilgjengelig lengde `L` | Plassen er gitt (trapphull, rom, terrasse mot gangvei) | `b = L / antall inntrinn` |
| Fritt | Bare høyden er kjent | `b = 620 − 2·h` |

**Trinn av bord (utvendig):** trinndybde = antall bord × bredde + spalter. Inntrinn = trinndybde − nese, der nesa er det trinnet stikker ut foran hakket i vangen.

**Ukjent:** antall opptrinn `n`. Opptrinn `h = H / n`. Antall inntrinn er `n − 1` når dekket eller gulvet oppe er øverste trinn, og `n` når trappa har eget trinn i samme høyde.

**Løsning:** prøv alle aktuelle `n`, regn `h` og `b`, og kontroller:

- Inntrinn minst 250 mm i ganglinjen. Under dette er aldri lov (forskriftskrav).
- Trappeformelen `2·h + b` innenfor 600–640 mm. Utenfor gir varsel, ikke sperre (preakseptert ytelse, ikke forskriftskrav).
- Stigningsvinkel `atan(h / b)` vises alltid.

Beste løsning er den som ligger nærmest 620. Naboløsningene (ett trinn færre, ett trinn flere) vises som knapper, slik «Ett felt» viser andre inndelinger i dag. Finnes ingen løsning, sier appen hva som må endres (annet bord i trinnet, lengre løp, flere trinn, repos).

Følger av de to kravene: opptrinnet kan ikke være over 195 mm når både formelen og inntrinn 250 skal holde, fordi (640 − 250) / 2 = 195. Det er min utledning, ikke et tall fra TEK17.

**Merker langs vangen:** avstanden mellom trinnene langs vangekanten er `s = √(h² + b²)`. Merkene regnes som `k·s` og avrundes hver for seg, på samme måte som utdelingsmålene i kledningsdelen. Samme for høydene: `k·h`, aldri avrundet opptrinn lagt sammen.

**Uttatt vange (med hakk, trinn oppå):**

- Dybden på hakket vinkelrett på kanten er `h·b / s`. Resthøyde = vangebredde − `h·b / s`.
- Trinntykkelsen trekkes fra nederste opptrinn i vangen, så alle opptrinn blir like når trinnene ligger på.
- Belegg som legges senere (helle nede, parkett oppe) legges inn som egne mål, så ferdig trapp får like opptrinn.

**Hel vange (trinn mellom vangene):** samme inndeling og samme merker langs vangen. Forskjellen er at merkene viser overkant trinn på innsiden av vangen, at vangen ikke svekkes av hakk, og at trinnlengden er trappebredden minus to vangetykkelser.

**Fri høyde (innvendig):** med etasjeskiller `e` (tykkelse med himling) og trapphullets kant i avstand `d` fra øverste trinnforkant, er fri høyde over trinnforkantene `d·h / b − e`. Snudd: minste trapphull = `(krav + e)·b / h`, avrundet opp.

**Kontrolleksempel 1, utvendig (håndregnet, blir første automatiske test):** terrasse 850 mm over helle, dekket er øverste trinn. Trinn av 2 stk 28 × 145 med 5 mm spalte, nese 20 mm.

- Trinndybde 2 × 145 + 5 = 295 mm. Inntrinn 295 − 20 = 275 mm.
- 5 opptrinn à 170,0 mm og 4 trinn. Trappeformel 2 × 170 + 275 = 615. Vinkel 31,7°. Løpslengde 1100 mm.
- 4 opptrinn gir 212,5 og formel 700: varsel. 6 opptrinn gir 141,7 og formel 558,3: varsel.
- Langs vangen: `s` = 323,3 mm. Merker på 323, 647, 970 og 1293 mm.
- Vange 48 × 198: hakk 144,6 mm, resthøyde 53,4 mm. Vange 48 × 223: resthøyde 78,4 mm.
- Nederste opptrinn i vangen: 170 − 28 = 142 mm.
- Samme trapp med 2 stk 28 × 120: trinndybde 245, inntrinn 225. Ikke lov.

**Kontrolleksempel 2, innvendig:** H = 2700, tilgjengelig lengde 3640, øvre gulv er øverste trinn.

- 15 opptrinn à 180,0 mm og 14 inntrinn à 260,0 mm. Trappeformel 2 × 180 + 260 = 620. Vinkel 34,7°.
- 14 opptrinn gir 192,9 og 280,0, formel 665,7: varsel. 16 opptrinn gir inntrinn 242,7: ikke lov.
- Langs vangen: `s` = 316,2 mm. Merker på 316, 632, 949 og 1265 mm. 14 steg = 4427,2 mm.
- Vange 48 × 223: hakk 148,0 mm, resthøyde 75,0 mm.
- Etasjeskiller 300 mm og krav 2,0 m: trapphullet må være minst 3322,2 mm, altså 3323 mm avrundet opp.

## 5. Funksjoner

**Utvendig tretrapp (først)**
- Høyde fra helle eller terreng til overkant dekke, og fall på underlaget.
- Trinn av bord: antall bord, bredde, spalte og nese gir inntrinnet. Appen sier fra når bordvalget gir for kort inntrinn, og foreslår bord som går opp.
- Åpne trinn.
- Nøkkeltall øverst: antall trinn, opptrinn, inntrinn, trappeformel, vinkel, løpslengde.

**Vangen**
- «Slik merker du vangen»: mål som stilles på vinkelen (opptrinn og inntrinn), løpende merker langs kanten, kutt i topp og bunn.
- Uttatt vange først, deretter hel vange med trinn mellom vangene.
- Resthøyde i vangen og nødvendig emnelengde.
- Appen regner ikke bæreevne. Den sier det tydelig, og viser dimensjon og antall vanger bare som råd.

**Kontroll mot TEK17**
- Type trapp styrer hvilke krav som brukes: utvendig, internt i boenhet, hovedtrapp for flere boenheter, annen trapp.
- Inntrinn, trappeformel, bredde, fri høyde, repos over 3,3 m, håndløper og rekkverk. Hvert varsel sier hvilket krav det gjelder.

**Innvendig rett trapp**
- Tilgjengelig lengde, trapphull og etasjeskiller, fri høyde.
- Gulv som legges senere oppe og nede.
- Tette opptrinn (stusstrinn) som valg.

**Rekkverk**
- Høyde og inndeling av sprosser, så ingen åpning blir over 100 mm. Regnes på samme måte som inndelingen i kledningsdelen.

**Tegning og utskrift**
- Trappa sett fra siden i riktig målestokk: underlag, vange, trinn med nummer, og fri høyde og trapphull inne.
- Vangen lagt flatt med alle merker, slik den ligger på bukkene.
- Utskrift eller PDF, og tekst som kan kopieres eller deles, som i kledningsdelen.

**Materialer**
- Vanger (dimensjon, lengde, antall), trinnbord og eventuelle stusstrinn, med kappliste og svinn.

## 6. Teknisk oppsett

```
src/trapp/fagverdier.js      standardverdier og krav per type trapp
src/trapp/solver.js          trinninndeling for ett rett løp
src/trapp/vange.js           merker, kutt, resthøyde, emnelengde
src/trapp/materialer.js      materialliste og kappliste
src/skjerm/verktoy.js        bryteren Kledning | Trapp og tittelen i toppbåndet
src/skjerm/trapp-skjerm.js   skjema og resultat for trapp
src/skjerm/trapp-tegning.js  SVG: sideriss og vange
test/trapp-*.test.js         tester for hver fil i src/trapp/
```

Endringer i det som finnes: `index.html` (verktøyvelger, ny del for trapp, ny sidetittel), `manifest.webmanifest` (nytt navn), `css/stil.css` (variabler for tegningen), `app.js` (laster trapp-skjermen). Regnemodellen for kledning endres ikke.

## 7. Faser

| Fase | Innhold | Ferdig når |
|---|---|---|
| T0 Oppsett | Planen inn i repoet som `PLAN-trapp.md`, eget avsnitt i appens CLAUDE.md, nytt navn, verktøyvelger, tom trapp-del | Bryteren virker, kledningsdelen er uendret, 84 tester grønne |
| T1 Kjernen | `src/trapp/solver.js` for rett løp med de tre lengdevalgene og trinn av bord, kontroll mot kravene, tester | Begge kontrolleksemplene går grønt |
| T2 Utvendig tretrapp med skjerm | Skjema (høyde, trinn av bord, bredde), nøkkeltall, varsler, andre inndelinger, sideriss, lagring | Kan brukes på en terrassetrapp fra telefonen |
| T3 Uttatt vange | Merker, kutt i topp og bunn, trinntykkelse og belegg som kommer senere, resthøyde, tegning av vangen | En vange kan merkes rett fra skjermen |
| T4 Materialer og utskrift | Materialliste, kappliste, PDF, del som tekst, eksempeldata | Liste som kan sendes til trelast. Prøvd på en ekte trapp |
| T5 Innvendig rett trapp | Tilgjengelig lengde, trapphull, etasjeskiller, fri høyde, bredde, gulv som legges senere, tette opptrinn | Varsel når trapphullet er for kort |
| T6 Hel vange | Trinn mellom vangene, merker på innsiden, trinnlengde | Begge vangetypene kan velges |
| T7 Rekkverk og håndløper | Høyde, inndeling av sprosser med åpning maks 100 mm | Sprosseinndeling som går opp |
| T8 Repos og vinkeltrapp | To løp med repos (L og U), like opptrinn i begge løp | En trapp med repos blir riktig |
| T9 Byggetrapp | Provisorisk trapp på byggeplass. Kravene er ikke slått opp og sjekkes før fasen starter | Avklares da |
| T10 Svingt trapp | Svingtrinn og ganglinje | Tas til slutt, bekreftes med Kenny før start |

Én fase om gangen, som i kledningsdelen.

## 8. Tester som må finnes

- Kontrolleksempel 1 og 2 i punkt 4.
- Sum av alle opptrinn skal alltid bli nøyaktig høyden, og sum av inntrinn nøyaktig løpslengden.
- Inntrinn under 250 mm gir aldri en godkjent løsning (2 stk 28 × 120 i eksempel 1).
- Trappeformel utenfor 600–640 gir varsel, men løsningen vises.
- Alle tre lengdevalg, og begge valg for øverste trinn.
- Svært lave trapper (to og tre opptrinn) og høyde over 3,3 m (repos).
- Løpende merker langs vangen: siste merke stemmer med `antall·s` på nærmeste mm.
- Nederste hakk er redusert med trinntykkelsen (142 mm i eksempel 1).
- Fri høyde: 3323 mm trapphull holder 2,0 m i eksempel 2, 3300 mm gir varsel. Minste trapphull rundes alltid opp.
- Alle 84 testene for kledning er fortsatt grønne.

## 9. Fagverdier

**Bekreftet** mot TEK17 § 12-14 og § 12-15 med veiledning på dibk.no (lest 2026-11-11):

| Krav | Verdi | Type |
|---|---|---|
| Inntrinn i ganglinjen | minst 0,25 m, likt i rette løp | Forskrift, § 12-14 |
| Opptrinn | samme høyde i hele trappa, ingen tallgrense i paragrafen | Forskrift, § 12-14 |
| Trappeformel | 2 opptrinn + 1 inntrinn = 620 mm ± 20 mm, målt i ganglinjen | Preakseptert, § 12-14 |
| Rett løp, bredde og fri høyde | 0,90 m og 2,1 m | Forskrift, § 12-14 |
| Rett løp internt i boenhet | 0,80 m og 2,0 m | Forskrift, § 12-14 |
| Hovedtrapp for flere boenheter | 1,10 m og 2,1 m | Forskrift, § 12-14 |
| Ikke rette løp | 0,10 m bredere enn kravet for rett løp | Forskrift, § 12-14 |
| Repos | ved høydeforskjell over 3,3 m | Forskrift, § 12-14 |
| Repos, dybde | minst lik bredden på trappeløpet | Preakseptert, § 12-14 |
| Håndløper | overkant 0,8–0,9 m over gulv eller trinn | Forskrift, § 12-14 |
| Svingt trapp, inntrinn i indre ganglinje (0,3 m fra håndløper) | minst 0,15 m | Forskrift, § 12-14 |
| Rekkverk i trapp | minst 0,9 m over trinnforkant | Forskrift, § 12-15 |
| Rekkverk på terrasse og balkong | minst 1,0 m ved nivåforskjell opp til 10 m, 1,2 m over 10 m | Forskrift, § 12-15 |
| Åpninger i rekkverk | maks 0,10 m opp til 0,75 m over trinn eller gulv | Forskrift, § 12-15 |
| Avstand mellom vange eller dekke og utenpåliggende rekkverk | maks 0,05 m | Forskrift, § 12-15 |

Utvendig trapp som er bygd sammen med huset (inngang, terrasse) følger § 12-14. § 8-9 gjelder trapper i uteareal som ikke henger sammen med byggverket. Der er de preaksepterte ytelsene inntrinn minst 0,28 m og stigning under 30 grader (lest 2026-11-11).

**Bekreftet av Kenny 2026-11-11** (Bakøys standardverdier, kan endres i innstillinger):

- Ønsket opptrinn når lengden er fri: 175 mm.
- Standard vange 48 × 223.
- Trinntykkelse 48 mm inne og 28 mm ute. Nese 20 mm.
- Appen viser resthøyden i uttatt vange. Grensen settes av Kenny når den er bestemt.

**Ikke funnet på nett** (søkt 2026-11-11, bare forumtråder uten kilde):

- Minste resthøyde i uttatt vange.
- Antall vanger etter trappebredde og trinntykkelse. En forumtråd sier tre vanger over 60 cm, uten kilde.
- Krav til åpning mellom trinn i åpen trapp. Det står ikke i § 12-14 eller § 12-15 slik sidene ble lest.
- Når rekkverk kreves på en lav trapp. Sidene som ble lest, oppgir ikke nedre grense.

Disse fire vises som råd eller ikke i det hele tatt til de er avklart. Bakøy har begrenset tilgang til Byggforsk, så bladet om trapper brukes først hvis nettet ikke gir svar når fasen kommer.

## 10. Avklart (2026-11-11)

- **Samme app**, med bryter «Kledning | Trapp» øverst.
- **Navn:** «Bakøy tømrerverktøy». Adressen står.
- **Trapper:** utvendige tretrapper, innvendige rette trapper og byggetrapper. Utvendig tretrapp først.
- **Vange:** begge typer. Uttatt først, hel vange etterpå.
- **Fagverdier:** antakelsene i første utkast er bekreftet (punkt 9).
- **Byggforsk:** begrenset tilgang. Svar søkes på nett først.

## 11. Første prompt i Claude Code

> Les PLAN-trapp.md og appens CLAUDE.md. Vi starter med fase T0 og T1. Forklar kort hva du gjør i hvert steg. Gi appen navnet «Bakøy tømrerverktøy», legg inn bryteren Kledning | Trapp uten å endre kledningsdelen, og lag `src/trapp/solver.js` med tester. Første test skal være kontrolleksempel 1 i punkt 4. Ikke lag skjermdelen for trapp ennå.

## Kilder

- [TEK17 § 12-14 Trapp med veiledning – DiBK](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/12/iii/12-14)
- [TEK17 § 12-15 Rekkverk med veiledning – DiBK](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/12/iii/12-15)
- [TEK17 § 8-9 Trapp i uteareal med veiledning – DiBK](https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/8/8-9)
- [Blocklayer – Straight Stairs](https://www.blocklayer.com/stairs/straighteng)
- [Trappeformel BA TIP – NDLA, matematikksenteret (ikke lest, PDF uten lesbar tekst)](https://www.matematikksenteret.no/sites/default/files/attachments/page/Trappeformel-BA-TIP-NDLA.pdf)
- [Bygge utvendig trapp, hvordan regne ut antall trinn – byggebolig.no (søketreff)](https://www.byggebolig.no/trearbeider-konstruksjoner-isolering/bygge-utvendig-trapp-hvordan-regne-ut-antall-trinn)
- [Dimensjonering av utvendig trapp – byggebolig.no (søketreff)](https://byggebolig.no/trearbeider-konstruksjoner-isolering/dimensjonering-av-utvendig-trapp)
