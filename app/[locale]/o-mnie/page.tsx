import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import PageHeader from "@/components/Common/PageHeader";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { seoUrls } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { canonical, languages } = seoUrls(locale, "/o-mnie");
  return {
    title: "O mnie | Inżynier Bezpieczeństwa Pożarowego – Jakub Baran",
    description:
      "Poznaj moje doświadczenie i kwalifikacje. Jako inżynier bezpieczeństwa pożarowego pomagam firmom i instytucjom w dbaniu o zgodność z przepisami ppoż.",
    alternates: { canonical, languages },
    openGraph: {
      title: "O mnie – Fire Protection Solutions Jakub Baran",
      description:
        "Dowiedz się więcej o mojej pracy, doświadczeniu oraz podejściu do nowoczesnej inżynierii bezpieczeństwa pożarowego.",
      url: canonical,
    },
  };
}

export default function AboutPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="about" />
      <AboutSectionOne />
      <AboutSectionTwo />
    </>
  );
}
