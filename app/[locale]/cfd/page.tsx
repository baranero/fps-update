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

  const { canonical, languages } = seoUrls(locale, "/cfd");
  return {
    title: "Symulacje CFD | Inżynieria Bezpieczeństwa Pożarowego – Warszawa, Łódź",
    description:
      "Profesjonalne symulacje CFD (Computational Fluid Dynamics) z zakresu inżynierii bezpieczeństwa pożarowego – Warszawa, Łódź, Grodzisk Mazowiecki. Sprawdź, kiedy są wymagane i ile kosztują.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Symulacje CFD – Warszawa i Łódź",
      description:
        "Analiza przepływu dymu i powietrza – wentylacja pożarowa, oddymianie, ewakuacja. Koszt i wymagania dla CFD. Realizacja: Warszawa, Łódź, mazowieckie i łódzkie.",
      url: canonical,
    },
  };
}

export default async function CfdPage(
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
      <PageHeader page="cfd" />
      <ServicePage slug="cfd" image="/images/cfd.png" />
    </>
  );
}
