import PageHeader from "@/components/Common/PageHeader";
import ServicePage from "@/components/Service/ServicePage";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { seoUrls } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { canonical, languages } = seoUrls(locale, "/audyt");
  return {
    title: "Audyt przeciwpożarowy | Inżynieria Bezpieczeństwa Pożarowego – Warszawa, Łódź",
    description:
      "Profesjonalne audyty przeciwpożarowe budynków i obiektów. Usługi z zakresu inżynierii bezpieczeństwa pożarowego: Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Audyt przeciwpożarowy – Warszawa, Łódź i okolice",
      description:
        "Wykonujemy eksperckie audyty ppoż. w Warszawie, Łodzi i całym woj. mazowieckim oraz łódzkim. Ocena warunków ochrony przeciwpożarowej, dróg ewakuacyjnych i wyposażenia.",
      url: canonical,
    },
  };
}

export default function AudytPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="audyt" />
      <ServicePage slug="audyt" image="/images/audyt-1.jpg" />
    </>
  );
}
