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
  const { canonical, languages } = seoUrls(locale, "/scenariusz");
  return {
    title: "Scenariusz rozwoju pożaru | Inżynier pożarnictwa – Warszawa, Łódź",
    description:
      "Opracowanie scenariuszy rozwoju pożaru dla projektów SSP, DSO, oddymiania i urządzeń ppoż. Eksperckie usługi: Warszawa, Łódź, Grodzisk Mazowiecki, całe woj. mazowieckie i łódzkie.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Scenariusz pożarowy – Warszawa, Łódź i okolice",
      description:
        "Profesjonalne opracowanie scenariusza rozwoju zdarzeń w czasie pożaru dla projektów SSP, DSO, oddymiania. Zgodność z wytycznymi rzeczoznawców. Działamy w Warszawie, Łodzi, Grodzisku Mazowieckim.",
      url: canonical,
    },
  };
}

export default function ScenariuszPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="scenariusz" />
      <ServicePage slug="scenariusz" image="/images/audyt-1.jpg" />
    </>
  );
}
