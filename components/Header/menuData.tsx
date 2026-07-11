import { Menu } from "@/types/menu";

const menuData: Menu[] = [
  {
    id: 1,
    title: "Strona główna",
    key: "home",
    path: "/",
    newTab: false,
  },
  {
    id: 2,
    title: "O mnie",
    key: "about",
    path: "/o-mnie",
    newTab: false,
  },
  {
    id: 3,
    title: "Oferta",
    key: "offer",
    newTab: false,
    submenu: [
      { id: 31, title: "Instrukcja Bezpieczeństwa Pożarowego", key: "ibp", path: "/ibp", newTab: false },
      { id: 32, title: "Symulacje CFD", key: "cfd", path: "/cfd", newTab: false },
      { id: 33, title: "Operat przeciwpożarowy", key: "operat", path: "/operat", newTab: false },
      { id: 34, title: "Audyt przeciwpożarowy", key: "audit", path: "/audyt", newTab: false },
      { id: 35, title: "Scenariusz rozwoju pożaru", key: "scenario", path: "/scenariusz", newTab: false },
      // Ukryte do czasu powstania dedykowanych stron (unikamy linków do 404):
      // { id: 36, title: "Ocena zagrożenia wybuchem", key: "explosion", path: "/ozw", newTab: false },
      // { id: 37, title: "Projekt SSP", key: "ssp", path: "/ssp", newTab: false },
      // { id: 38, title: "Systemy oddymiania", key: "smoke", path: "/oddymianie", newTab: false },
    ],
  },
  {
    id: 4,
    title: "CFD Cloud",
    key: "cfdCloud",
    path: "/symulacje",
    newTab: false,
    highlight: true,
  },
  {
    id: 5,
    title: "Dla projektanta",
    key: "forDesigner",
    newTab: false,
    submenu: [
      { id: 51, title: "Kalkulatory", key: "calculators", path: "/narzedzia/kalkulatory", newTab: false },
      { id: 52, title: "Raporty", key: "reports", path: "/narzedzia/raporty", newTab: false },
    ],
  },
  {
    id: 6,
    title: "Blog",
    key: "blog",
    path: "/blog",
    newTab: false,
  },
  {
    id: 7,
    title: "Kontakt",
    key: "contact",
    path: "/kontakt",
    newTab: false,
  },
];

export default menuData;
