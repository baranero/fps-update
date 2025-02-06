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
    id: 33,
    title: "Blog",
    path: "/blog",
    newTab: false,
  },
  {
    id: 3,
    title: "Kontakt",
    path: "/kontakt",
    newTab: false,
  },
  {
    id: 4,
    title: "Oferta",
    newTab: false,
    submenu: [
      {
        id: 41,
        title: "Instrukcja Bezpieczeństwa Pożarowego",
        path: "/ibp",
        newTab: false,
      },
      {
        id: 42,
        title: "Symulacje CFD",
        path: "/cfd",
        newTab: false,
      },
      {
        id: 43,
        title: "Operat przeciwpożarowy",
        path: "/operat",
        newTab: false,
      },
      {
        id: 44,
        title: "Audyt przeciwpożarowy",
        path: "/audyt",
        newTab: false,
      },
      {
        id: 45,
        title: "Scenariusz rozwoju pożaru",
        path: "/scenariusz",
        newTab: false,
      },
      {
        id: 46,
        title: "Ocena zagrożenia wybuchem",
        path: "/ozw",
        newTab: false,
      },
      {
        id: 47,
        title: "Projekt Systemu Sygnalizacji Pożarowej",
        path: "/ssp",
        newTab: false,
      },
      {
        id: 48,
        title: "Projekt systemu oddymiania grawitacyjnego",
        path: "/oddymianie-grawitacyjne",
        newTab: false,
      },
      {
        id: 49,
        title: "Projekt systemu oddymiania mechanicznego",
        path: "/oddymianie-mechaniczne",
        newTab: false,
      },
    ],
  },
];
export default menuData;
