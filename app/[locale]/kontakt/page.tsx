import PageHeader from "@/components/Common/PageHeader";
import Contact from "@/components/Contact";
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

  const { canonical, languages } = seoUrls(locale, "/kontakt");
  return {
    title: "Kontakt | Inżynieria Bezpieczeństwa Pożarowego – FP Solutions",
    description:
      "Skontaktuj się z ekspertem ds. inżynierii bezpieczeństwa pożarowego. Realizujemy audyty ppoż., symulacje CFD i instrukcje IBP. Warszawa, Łódź, Grodzisk Mazowiecki.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Kontakt – Fire Protection Solutions Jakub Baran",
      description:
        "Masz pytania dotyczące ochrony przeciwpożarowej swojego obiektu? Zadzwoń lub napisz – chętnie doradzę i przygotuję darmową wycenę.",
      url: canonical,
    },
  };
}

export default async function ContactPage(
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
    <>
      <PageHeader page="contact" />
      <Contact />
    </>
  );
}
