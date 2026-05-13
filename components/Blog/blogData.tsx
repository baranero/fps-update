import { Blog } from "@/types/blog";

const blogData: Blog[] = [
  {
    id: 1,
    title: "Zmiany w projektowaniu systemów oddymiania: Analiza normy PN-B-02877-4:2025-07",
    paragraph:
      "Nowa norma oficjalnie zastępuje dokument z 2001 roku. Wprowadza fundamentalne zmiany w metodyce projektowej oraz liberalizuje dopuszczalne wielkości stref dymowych.",
    image: "/images/blog/blog2.jpg",
    author: {
      name: "Jakub Baran",
      image: "/images/blog/jakub.jpg",
      designation: "Inżynier Bezpieczeństwa Pożarowego",
    },
    tags: ["Oddymianie", "Prawo", "Normy"],
    publishDate: "13 Maja 2026",
    slug: "nowa-norma-pn-b-02877-4-2025-07",
  },
  {
    id: 2,
    title: "Symulacje CFD w projektowaniu oddymiania klatek schodowych",
    paragraph:
      "Jak udowodnić warunki bezpiecznej ewakuacji za pomocą zaawansowanych symulacji komputerowych dynamiki pożaru.",
    image: "/images/blog/blog.png",
    author: {
      name: "Jakub Baran",
      image: "/images/blog/jakub.jpg",
      designation: "Inżynier Bezpieczeństwa Pożarowego",
    },
    tags: ["CFD", "Ewakuacja"],
    publishDate: "11 Kwietnia 2025",
    slug: "symulacja-cfd-w-oddymianiu-klatek-schodowych",
  },
];

export default blogData;