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

  const { canonical, languages } = seoUrls(locale, "/nowa-norma-pn-b-02877-4-2025-07");
  return {
    title: "Analiza nowej normy PN-B-02877-4:2025-07 | Fire Protection Solutions",
    description:
      "Zmiany w projektowaniu systemów oddymiania grawitacyjnego. Analiza nowej normy PN-B-02877-4:2025-07 na tle dotychczasowych przepisów z 2001 i 2006 roku.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Analiza nowej normy PN-B-02877-4:2025-07",
      description:
        "Zmiany w projektowaniu systemów oddymiania grawitacyjnego. Analiza nowej normy na tle dotychczasowych przepisów.",
      url: canonical,
    },
  };
}

export default async function ArticleNormaPage(
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
    <ArticlePage slug="nowa-norma-pn-b-02877-4-2025-07" image="/images/blog/blog2.jpg" />
  );
}
