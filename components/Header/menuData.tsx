import { Menu } from "@/types/menu";

const menuData: Menu[] = [
  {
    id: 1,
    title: "Strona główna",
    path: "/",
    newTab: false,
  },
  {
    id: 2,
    title: "O mnie",
    path: "/o-mnie",
    newTab: false,
  },
  {
    id: 3,
    title: "Oferta",
    newTab: false,
    submenu: [
      { id: 31, title: "Instrukcja Bezpieczeństwa Pożarowego", path: "/ibp", newTab: false },
      { id: 32, title: "Symulacje CFD", path: "/cfd", newTab: false },
      { id: 33, title: "Operat przeciwpożarowy", path: "/operat", newTab: false },
      { id: 34, title: "Audyt przeciwpożarowy", path: "/audyt", newTab: false },
      { id: 35, title: "Scenariusz rozwoju pożaru", path: "/scenariusz", newTab: false },
      { id: 36, title: "Ocena zagrożenia wybuchem", path: "/ozw", newTab: false },
      { id: 37, title: "Projekt SSP", path: "/ssp", newTab: false },
      { id: 38, title: "Systemy oddymiania", path: "/oddymianie", newTab: false },
    ],
  },
  {
    id: 4,
    title: "CFD Cloud",
    path: "/narzedzia/symulacje",
    newTab: false,
    highlight: true,
  },
  {
    id: 5,
    title: "Dla projektanta",
    newTab: false,
    submenu: [
      { id: 51, title: "Kalkulatory", path: "/narzedzia/kalkulatory", newTab: false },
      { id: 52, title: "Raporty", path: "/narzedzia/raporty", newTab: false },
    ],
  },
  {
    id: 6,
    title: "Blog",
    path: "/blog",
    newTab: false,
  },
  {
    id: 7,
    title: "Kontakt",
    path: "/kontakt",
    newTab: false,
  },
];

export default menuData;