import { Blog } from "@/types/blog";

const blogData: Blog[] = [
  {
    id: 1,
    title: "Symulacja CFD w oddymianiu klatek schodowych",
    paragraph:
      "Dowiedz się, w jakich przypadkach przepisy i wytyczne CNBOP-PIB-0003:2016 wymagają wykonania inżynierskiej symulacji CFD dla klatki schodowej.",
    image: "/images/blog/blog.png",
    author: {
      name: "Jakub Baran",
      image: "/images/blog/jakub.jpg",
      designation: "Inżynier Bezpieczeństwa Pożarowego",
    },
    tags: ["CFD", "Oddymianie"],
    publishDate: "11.04.2025",
    // To pole naprawia błąd 404. 
    // Wpisz tutaj dokładnie nazwę folderu z artykułem (bez ukośników).
    slug: "symulacja-cfd-w-oddymianiu-klatek-schodowych",
  },
  // Tu możesz dodawać kolejne obiekty wpisów...
];

export default blogData;