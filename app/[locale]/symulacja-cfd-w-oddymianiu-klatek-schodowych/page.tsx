import ArticlePage from "@/components/Blog/ArticlePage";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { seoUrls } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { canonical, languages } = seoUrls(locale, "/symulacja-cfd-w-oddymianiu-klatek-schodowych");
  return {
    title: "Symulacja CFD w oddymianiu klatek schodowych | Blog FP Solutions",
    description:
      "Dowiedz się, kiedy wymagana jest symulacja CFD do projektu oddymiania klatki schodowej zgodnie z wytycznymi CNBOP. Ekspercka baza wiedzy z inżynierii bezpieczeństwa pożarowego.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Symulacja CFD w oddymianiu klatek schodowych",
      description:
        "Sprawdź, w jakich przypadkach przepisy i wytyczne CNBOP wymagają wykonania symulacji CFD dla klatek schodowych.",
      url: canonical,
    },
  };
}

export default function ArticleCfdPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <ArticlePage
      slug="symulacja-cfd-w-oddymianiu-klatek-schodowych"
      image="/images/blog/blog.png"
    />
  );
}
