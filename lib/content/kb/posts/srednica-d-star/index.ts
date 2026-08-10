import type { KbPost } from "../../types";
import { pl } from "./pl";
import { en } from "./en";

// Metadane wspólne dla obu języków (slug, data, czas czytania, numer lekcji);
// treść — w plikach językowych obok.
export const post: KbPost = {
  slug: "srednica-d-star-rozdzielczosc-siatki-fds",
  date: "2026-07-31",
  readingMinutes: 8,
  lesson: 5,
  pl,
  en,
};
