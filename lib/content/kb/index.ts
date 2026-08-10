import type { CourseLesson, KbPost } from "./types";
import { post as srednicaDStar } from "./posts/srednica-d-star";

export type { CourseLesson, KbBlock, KbContent, KbPost } from "./types";
export { kbContent } from "./types";

/** Baza artykułów — nowy tekst dopisujesz tutaj po zaimportowaniu modułu. */
const ALL: KbPost[] = [srednicaDStar];

/** Artykuły w kolejności od najnowszego (lista i mapa witryny). */
export const KB_POSTS: KbPost[] = [...ALL].sort((a, b) => b.date.localeCompare(a.date));

/**
 * Artykuły dostępne w danym języku. EN pokazuje wyłącznie przetłumaczone —
 * lista z polskimi tytułami pod adresem /en byłaby ślepą uliczką dla czytelnika
 * i duplikatem treści dla robota.
 */
export function kbPosts(locale: string): KbPost[] {
  return locale === "en" ? KB_POSTS.filter((p) => p.en) : KB_POSTS;
}

export function getKbPost(slug: string): KbPost | undefined {
  return KB_POSTS.find((p) => p.slug === slug);
}

/** Unikalne tagi artykułów dostępnych w danym języku — filtr na liście. */
export function kbTags(locale: string): string[] {
  const tags = kbPosts(locale).flatMap((p) => (locale === "en" ? p.en?.tags ?? [] : p.pl.tags));
  return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b, locale));
}

// Program kursu „FDS + PyroSim od zera". Lekcje bez `slug` są zapowiedziane, ale
// jeszcze nie napisane — strona kursu renderuje je BEZ linku, żeby nie prowadzić
// czytelnika (i robota) na 404. Publikacja lekcji = dopisanie artykułu do ALL
// z polem `lesson` i uzupełnienie `slug` w obu tablicach niżej.
const COURSE_PL: CourseLesson[] = [
  {
    n: 1,
    title: "Czym jest FDS i czego się po nim nie spodziewać",
    summary:
      "Model LES, zakres stosowalności, ograniczenia. Kiedy symulacja CFD odpowiada na pytanie projektowe, a kiedy jest kosztowną ilustracją.",
  },
  {
    n: 2,
    title: "Instalacja i anatomia projektu",
    summary:
      "FDS i Smokeview, licencja PyroSim, struktura plików: .fds, .smv, .out, _hrr.csv, _devc.csv. Co gdzie szukać po zakończonych obliczeniach.",
  },
  {
    n: 3,
    title: "Pierwszy wsad: pomieszczenie, pożar, wynik",
    summary:
      "Minimalny działający plik .fds — HEAD, MESH, TIME, REAC, SURF, OBST, VENT, DEVC, TAIL — krok po kroku, z omówieniem każdej linii.",
  },
  {
    n: 4,
    title: "Geometria w PyroSim",
    summary:
      "Import DWG/IFC, praca na warstwach, przyciąganie do siatki, grupy i kopie. Jak nie zrobić z rzutu architektury modelu nie do policzenia.",
  },
  {
    n: 5,
    title: "Siatka obliczeniowa i podział na MPI",
    summary:
      "D*, dobór wymiaru komórki, zgodność krawędzi siatek, balans obciążenia rdzeni. Dlaczego osiem siatek nie znaczy osiem razy szybciej.",
    slug: srednicaDStar.slug,
  },
  {
    n: 6,
    title: "Pożar projektowy: reakcja, HRRPUA, krzywa t²",
    summary:
      "REAC i wydajność sadzy, moc na jednostkę powierzchni, rampy rozwoju mocy. Przełożenie scenariusza z opracowania na namelisty.",
  },
  {
    n: 7,
    title: "Wentylacja i oddymianie",
    summary:
      "VENT z zadaną prędkością kontra model HVAC, nawiew kompensacyjny, klapy i kurtyny dymowe, sterowanie przez CTRL.",
  },
  {
    n: 8,
    title: "Pomiary: DEVC, SLCF, BNDF, ISOF",
    summary:
      "Co i gdzie mierzyć, żeby wynik dało się ocenić względem kryteriów — widzialność, temperatura, CO, wysokość warstwy dymu.",
  },
  {
    n: 9,
    title: "Uruchomienie i nadzór nad obliczeniami",
    summary:
      "Lokalnie czy w chmurze, ile rdzeni, jak czytać plik .out i wykres HRR w trakcie liczenia, kiedy przerwać i poprawić model.",
  },
  {
    n: 10,
    title: "Analiza wyników i raport",
    summary:
      "Smokeview, wykresy z CSV, badanie wrażliwości siatki, struktura opracowania, które przechodzi uzgodnienie z rzeczoznawcą.",
  },
];

const COURSE_EN: CourseLesson[] = [
  {
    n: 1,
    title: "What FDS is — and what not to expect from it",
    summary:
      "The LES model, its range of applicability and its limits. When a CFD simulation answers a design question, and when it is an expensive illustration.",
  },
  {
    n: 2,
    title: "Installation and the anatomy of a project",
    summary:
      "FDS and Smokeview, the PyroSim licence, the file layout: .fds, .smv, .out, _hrr.csv, _devc.csv. Where to look for what once a run finishes.",
  },
  {
    n: 3,
    title: "Your first input file: a room, a fire, a result",
    summary:
      "A minimal working .fds file — HEAD, MESH, TIME, REAC, SURF, OBST, VENT, DEVC, TAIL — step by step, with every line explained.",
  },
  {
    n: 4,
    title: "Geometry in PyroSim",
    summary:
      "Importing DWG/IFC, working with layers, snapping to the mesh, groups and copies. How not to turn an architectural plan into a model nobody can compute.",
  },
  {
    n: 5,
    title: "The computational mesh and the MPI split",
    summary:
      "D*, choosing the cell size, conforming mesh boundaries, balancing the load across cores. Why eight meshes does not mean eight times faster.",
    slug: srednicaDStar.slug,
  },
  {
    n: 6,
    title: "The design fire: reaction, HRRPUA, the t² curve",
    summary:
      "REAC and soot yield, heat release per unit area, growth ramps. Translating the scenario from your report into namelists.",
  },
  {
    n: 7,
    title: "Ventilation and smoke control",
    summary:
      "A VENT with a prescribed velocity versus the HVAC model, make-up air, vents and smoke curtains, control logic through CTRL.",
  },
  {
    n: 8,
    title: "Measurements: DEVC, SLCF, BNDF, ISOF",
    summary:
      "What to measure and where, so the result can be judged against the criteria — visibility, temperature, CO, smoke layer height.",
  },
  {
    n: 9,
    title: "Running the solver and watching over it",
    summary:
      "Locally or in the cloud, how many cores, how to read the .out file and the HRR chart mid-run, and when to stop and fix the model.",
  },
  {
    n: 10,
    title: "Analysing results and writing the report",
    summary:
      "Smokeview, charts from the CSVs, the grid sensitivity study, and the structure of a report that passes review.",
  },
];

/** Program kursu w języku strony. */
export function fdsCourse(locale: string): CourseLesson[] {
  return locale === "en" ? COURSE_EN : COURSE_PL;
}

/** Liczba lekcji z opublikowaną treścią w danym języku. */
export function publishedLessons(locale: string): CourseLesson[] {
  return fdsCourse(locale).filter((l) => {
    if (!l.slug) return false;
    const post = getKbPost(l.slug);
    return locale === "en" ? !!post?.en : !!post;
  });
}
