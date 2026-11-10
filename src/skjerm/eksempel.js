// Eksempelhuset som «Fyll inn eksempelhus» legger inn (Kenny 2026-11-10): et enkelt hus på
// 8 x 6 m med fire vegger, lagt inn i rekkefølge rundt huset mot høyre. Langveggene går forbi
// hjørnene, og gavlveggene slutter mot dem. Alle mål i mm.
//
// Åpningene er plassert slik at alle felt går opp med omlegg innenfor anbefalt. Det sjekkes av
// en test i test/hus.test.js, så eksempelet ikke slutter å virke når regnemodellen endres.

const vindu = (x, bredde = 1000) => ({ type: 'vindu', x, bredde, hoyde: 1200, bunn: 900 });
const dor = (x) => ({ type: 'dor', x, bredde: 900, hoyde: 2100, bunn: 0 });
const hjorner = (type) => ({ venstre: { type }, hoyre: { type } });
const BORD = { hoyde: 2400, bu: 98, bo: 98 };

export const EKSEMPELHUS = Object.freeze({
  lukket: true,
  vegger: [
    { navn: 'Sør', lengde: 8000, ...BORD, hjorner: hjorner('forbi'), apninger: [vindu(900), dor(3300), vindu(5600)] },
    { navn: 'Øst', lengde: 6000, ...BORD, hjorner: hjorner('mot'), apninger: [vindu(2200, 1200)] },
    { navn: 'Nord', lengde: 8000, ...BORD, hjorner: hjorner('forbi'), apninger: [vindu(1200), vindu(5300)] },
    { navn: 'Vest', lengde: 6000, ...BORD, hjorner: hjorner('mot'), apninger: [vindu(2000, 1600)] },
  ],
});
