import PageHeader from "@/components/Common/PageHeader";
import ServicePage from "@/components/Service/ServicePage";
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

  const { canonical, languages } = seoUrls(locale, "/ibp");
  return {
    title: "Instrukcja Bezpieczeństwa Pożarowego | Inżynieria Pożarowa – Warszawa, Łódź",
    description:
      "Opracowanie Instrukcji Bezpieczeństwa Pożarowego (IBP) przez eksperta inżynierii bezpieczeństwa pożarowego. Obsługujemy obiekty w Warszawie, Łodzi, Grodzisku Maz. i okolicach.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Instrukcja Bezpieczeństwa Pożarowego – Warszawa, Łódź i okolice",
      description:
        "Profesjonalne opracowanie IBP w Warszawie, Łodzi i całym woj. mazowieckim oraz łódzkim. Zadbaj o zgodność z prawem i bezpieczeństwo swojego obiektu.",
      url: canonical,
    },
  };
}

export default async function IbpPage(
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
      <PageHeader page="ibp" />
      <ServicePage slug="ibp" image="/images/ibp.jpg" />
    </>
  );
}
