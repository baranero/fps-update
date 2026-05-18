export interface VentilatorComponent {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  installationType: "wall" | "ducted" | "roof";
  volumeRange: [number, number];
  pressureRange: [number, number];
  power?: number;
  url?: string;
  notes?: string;
}

const ventilators: VentilatorComponent[] = [
  {
    id: "smay-isway-fc-1",
    manufacturer: "SMAY",
    model: "iSWAY-FC-1",
    type: "Kompaktowa jednostka napowietrzająca",
    installationType: "wall",
    volumeRange: [1000, 4500],
    pressureRange: [50, 400],
    power: 1.5,
    url: "https://www.smay.pl/kategoria-produktu/systemy-roznicowania-cisnien/",
    notes: "Nawiew bezpośredni (ścienny). Idealny dla klatek N i SW.",
  },
  {
    id: "smay-isway-fc-2",
    manufacturer: "SMAY",
    model: "iSWAY-FC-2",
    type: "Modułowa jednostka napowietrzająca",
    installationType: "ducted",
    volumeRange: [3000, 10000],
    pressureRange: [100, 600],
    power: 3.0,
    url: "https://www.smay.pl/kategoria-produktu/systemy-roznicowania-cisnien/",
    notes: "Wersja kanałowa dla klasycznych klatek schodowych.",
  },
  {
    id: "mercor-monsun-c",
    manufacturer: "MERCOR",
    model: "mcr Monsun C",
    type: "Wentylator osiowy nawiewny",
    installationType: "ducted",
    volumeRange: [2000, 12000],
    pressureRange: [50, 500],
    url: "https://www.mercor.com.pl/pl/produkty/wentylacja-pozarowa/wentylatory-osiowe/",
    notes: "Klasyczny wentylator do wbudowania w sieć kanałów stalowych.",
  },
  {
    id: "sodeca-hch",
    manufacturer: "SODECA",
    model: "HCH / WALL",
    type: "Wentylator osiowy ścienny",
    installationType: "wall",
    volumeRange: [1500, 18000],
    pressureRange: [50, 500],
    power: 2.2,
    url: "https://www.sodeca.com/pl/produkty/wentylatory-osiowe-z-napedem-bezposrednim-hch",
    notes: "Solidne hiszpańskie wentylatory do montażu ściennego.",
  },
  {
    id: "scroll-sc-ax",
    manufacturer: "SCROLL",
    model: "SC-AX",
    type: "Wentylator osiowy",
    installationType: "ducted",
    volumeRange: [1500, 12000],
    pressureRange: [50, 450],
    url: "https://scroll.com.pl/",
    notes: "Wentylator przystosowany do wbudowania w instalację różnicy ciśnień.",
  },
  {
    id: "venture-thgt",
    manufacturer: "Venture Industries",
    model: "THGT",
    type: "Wentylator nawiewny dachowy",
    installationType: "roof",
    volumeRange: [2500, 14000],
    pressureRange: [50, 450],
    url: "https://www.hydronetka.pl/",
    notes: "Wariant do zrzutu dachowego.",
  }
];

export interface DamperVariant {
  dimensions: string;
  aGeom: number;
}

export interface DamperComponent {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  installationType: "wall" | "roof";
  variants: DamperVariant[];
  accessoriesOptions: {
    canHaveDeflectors: boolean;
    canHaveBaffles: boolean;
  };
  cvValues: {
    base: number;
    withDeflectors: number;
    full: number;
  };
  url?: string;
  notes?: string;
}

const dampers: DamperComponent[] = [
  {
    id: "mercor-prolight-1",
    manufacturer: "MERCOR",
    model: "mcr Prolight (Jednoskrzydłowa)",
    type: "Klapa dachowa PPOŻ",
    installationType: "roof",
    accessoriesOptions: { canHaveDeflectors: true, canHaveBaffles: true },
    cvValues: { base: 0.40, withDeflectors: 0.60, full: 0.70 },
    variants: [
      { dimensions: "100x100 cm", aGeom: 1.00 },
      { dimensions: "120x120 cm", aGeom: 1.44 },
      { dimensions: "140x140 cm", aGeom: 1.96 },
      { dimensions: "150x150 cm", aGeom: 2.25 },
      { dimensions: "200x200 cm", aGeom: 4.00 },
    ],
    url: "https://www.mercor.com.pl/pl/produkty/systemy-oddymiania-grawitacyjnego/klapy-oddymiajace-mcr-prolight/",
    notes: "Najbardziej powszechna klapa w Polsce. Współczynnik zależy wprost od zamówionego osprzętu.",
  },
  {
    id: "gulajski-klapa",
    manufacturer: "Gulajski",
    model: "Klapa Certyfikowana 1-skrz.",
    type: "Klapa dachowa",
    installationType: "roof",
    accessoriesOptions: { canHaveDeflectors: true, canHaveBaffles: true },
    cvValues: { base: 0.45, withDeflectors: 0.65, full: 0.75 },
    variants: [
      { dimensions: "100x100 cm", aGeom: 1.00 },
      { dimensions: "120x120 cm", aGeom: 1.44 },
      { dimensions: "150x150 cm", aGeom: 2.25 },
      { dimensions: "180x180 cm", aGeom: 3.24 },
    ],
    url: "https://www.gulajski.pl/klapy_oddymiajace/",
    notes: "Polski producent. Wysokie parametry aerodynamiczne dla wariantu z pełnym doposażeniem.",
  },
  {
    id: "rewa-kod",
    manufacturer: "Rewa",
    model: "Klapa KOD",
    type: "Klapa dachowa",
    installationType: "roof",
    accessoriesOptions: { canHaveDeflectors: true, canHaveBaffles: true },
    cvValues: { base: 0.42, withDeflectors: 0.62, full: 0.73 },
    variants: [
      { dimensions: "120x120 cm", aGeom: 1.44 },
      { dimensions: "150x150 cm", aGeom: 2.25 },
      { dimensions: "200x200 cm", aGeom: 4.00 },
      { dimensions: "240x240 cm", aGeom: 5.76 },
    ],
    url: "https://www.rewa.com.pl/produkty/klapy-oddymiajace",
    notes: "Możliwość zamówienia wielkich gabarytów (np. 240x240) do potężnych klatek schodowych.",
  },
  {
    id: "dh-euro-shev",
    manufacturer: "D+H",
    model: "Euro-SHEV (Okno dymowe)",
    type: "Ścienne urządzenie oddymiające",
    installationType: "wall",
    accessoriesOptions: { canHaveDeflectors: false, canHaveBaffles: false },
    cvValues: { base: 0.55, withDeflectors: 0.55, full: 0.55 }, 
    variants: [
      { dimensions: "100x100 cm", aGeom: 1.00 },
      { dimensions: "120x120 cm", aGeom: 1.44 },
      { dimensions: "150x150 cm", aGeom: 2.25 },
      { dimensions: "200x100 cm", aGeom: 2.00 },
    ],
    url: "https://www.dh-partner.com/pl/produkty/oddymianie/okna-oddymiajace.html",
    notes: "Certyfikowane okna elewacyjne z napędami. Brak opcji owiewek dachowych.",
  }
];

export function suggestVentilators(
  volumeRequired: number,
  pressureRequired: number,
  installationTypePref?: "wall" | "ducted" | "roof"
): VentilatorComponent[] {
  if (!volumeRequired || !pressureRequired) return [];

  let capableFans = ventilators.filter(v => 
    v.volumeRange[1] >= volumeRequired && 
    v.pressureRange[1] >= pressureRequired
  );

  if (installationTypePref) {
    const exactTypeFans = capableFans.filter(v => v.installationType === installationTypePref);
    if (exactTypeFans.length > 0) {
      capableFans = exactTypeFans;
    }
  }

  if (capableFans.length > 0) {
    return capableFans.sort((a, b) => (a.volumeRange[1] - volumeRequired) - (b.volumeRange[1] - volumeRequired));
  }

  return [...ventilators].sort((a, b) => (b.volumeRange[1] + b.pressureRange[1]) - (a.volumeRange[1] + a.pressureRange[1]));
}

export function suggestDampers(): DamperComponent[] {
  return dampers;
}

export default {
  ventilators,
  dampers,
  suggestVentilators,
  suggestDampers,
};