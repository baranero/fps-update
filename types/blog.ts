type Author = {
  name: string;
  image: string;
  designation: string;
};

export type Blog = {
  id: number;
  title: string;
  paragraph: string;
  image: string;
  author: Author;
  tags: string[];
  publishDate: string;
  /** * Przyjazny dla SEO adres URL (np. "tytul-artykulu"). 
   * To pole jest kluczowe, aby uniknąć błędów 404 przy dynamicznym linkowaniu.
   */
  slug: string; 
};