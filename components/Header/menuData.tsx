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
      {
        id: 31,
        title: "Instrukcja Bezpieczeństwa Pożarowego",
        path: "/ibp",
        newTab: false,
      },
      {
        id: 32,
        title: "Symulacje CFD",
        path: "/cfd",
        newTab: false,
      },
      {
        id: 33,
        title: "Operat przeciwpożarowy",
        path: "/operat",
        newTab: false,
      },
      {
        id: 34,
        title: "Audyt przeciwpożarowy",
        path: "/audyt",
        newTab: false,
      },
      {
        id: 35,
        title: "Scenariusz rozwoju pożaru",
        path: "/scenariusz",
        newTab: false,
      },
      // {
      //   id: 36,
      //   title: "Ocena zagrożenia wybuchem",
      //   path: "/ozw",
      //   newTab: false,
      // },
      // {
      //   id: 37,
      //   title: "Projekt Systemu Sygnalizacji Pożarowej",
      //   path: "/ssp",
      //   newTab: false,
      // },
      // {
      //   id: 38,
      //   title: "Projekt systemu oddymiania grawitacyjnego",
      //   path: "/oddymianie-grawitacyjne",
      //   newTab: false,
      // },
      // {
      //   id: 39,
      //   title: "Projekt systemu oddymiania mechanicznego",
      //   path: "/oddymianie-mechaniczne",
      //   newTab: false,
      // },
    ],
  },
  {
    id: 4,
    title: "Blog",
    path: "/blog",
    newTab: false,
  },
  {
    id: 5,
    title: "Kontakt",
    path: "/kontakt",
    newTab: false,
  },
  
];
export default menuData;
