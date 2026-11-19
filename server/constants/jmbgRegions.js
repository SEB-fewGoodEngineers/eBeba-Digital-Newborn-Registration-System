// Montenegrin JMBG registration areas and serial blocks.
// Source: Pravilnik o utvrđivanju registarskih područja (Sl. list CG 15/2008, 19/2008).
// The law groups municipalities into 9 areas (codes 21-29) and assigns each
// municipality a block of the 3-digit serial. We use the block to pick BBB.
//
// IMPORTANT: This is a DEMO. The JMBG produced here is not issued by any
// authority. The certificate is marked DEMO. Do not use for real persons.

const MUNICIPALITY_JMBG = Object.freeze({
  // Area 21 — Podgorica group
  Podgorica: { area: "21", male: [0, 399], female: [500, 899] },
  Danilovgrad: { area: "21", male: [400, 429], female: [900, 928] },
  Kolašin: { area: "21", male: [430, 448], female: [929, 965] },
  Golubovci: { area: "21", male: [449, 477], female: [966, 982] },
  Tuzi: { area: "21", male: [478, 499], female: [983, 999] },

  // Area 22 — Bar group
  Bar: { area: "22", male: [0, 299], female: [500, 799] },
  Ulcinj: { area: "22", male: [300, 499], female: [800, 899] },

  // Area 23 — Kotor group
  Kotor: { area: "23", male: [0, 199], female: [500, 699] },
  Tivat: { area: "23", male: [200, 349], female: [700, 849] },
  Budva: { area: "23", male: [350, 499], female: [850, 999] },

  // Area 24
  "Herceg Novi": { area: "24", male: [0, 499], female: [500, 999] },

  // Area 25
  Cetinje: { area: "25", male: [0, 499], female: [500, 999] },

  // Area 26 — Nikšić group
  Nikšić: { area: "26", male: [0, 399], female: [500, 899] },
  Plužine: { area: "26", male: [400, 449], female: [900, 949] },
  Šavnik: { area: "26", male: [450, 499], female: [950, 999] },

  // Area 27 — Berane group
  Berane: { area: "27", male: [0, 199], female: [500, 699] },
  Plav: { area: "27", male: [200, 299], female: [700, 799] },
  Rožaje: { area: "27", male: [300, 399], female: [800, 899] },
  Andrijevica: { area: "27", male: [400, 499], female: [900, 999] },

  // Area 28 — Bijelo Polje group
  "Bijelo Polje": { area: "28", male: [0, 299], female: [500, 799] },
  Mojkovac: { area: "28", male: [300, 499], female: [800, 999] },

  // Area 29 — Pljevlja group
  Pljevlja: { area: "29", male: [0, 349], female: [500, 849] },
  Žabljak: { area: "29", male: [350, 499], female: [850, 999] },
});

module.exports = { MUNICIPALITY_JMBG };
