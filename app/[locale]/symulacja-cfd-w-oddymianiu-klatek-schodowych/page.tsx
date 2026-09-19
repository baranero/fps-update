import ArticlePage from "@/components/Blog/ArticlePage";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { seoUrls } from "@/lib/seo";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

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

export default async function ArticleCfdPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  return (
    <ArticlePage
      slug="symulacja-cfd-w-oddymianiu-klatek-schodowych"
      image="/images/blog/blog.png"
    />
  );
}
