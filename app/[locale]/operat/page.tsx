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

  const { canonical, languages } = seoUrls(locale, "/operat");
  return {
    title: "Operat przeciwpożarowy odpadów | Inżynier pożarnictwa – Warszawa, Łódź",
    description:
      "Sporządzanie operatów ppoż. wymaganych do pozwolenia na odpady przez inżyniera pożarnictwa. Warszawa, Łódź, Grodzisk Mazowiecki, woj. mazowieckie i łódzkie.",
    alternates: { canonical, languages },
    openGraph: {
      title: "Operat przeciwpożarowy – Warszawa, Łódź i okolice",
      description:
        "Profesjonalne operaty ppoż. dla zezwoleń na zbieranie, przetwarzanie i wytwarzanie odpadów. Gwarancja rzetelności inżynierskiej. Warszawa, Łódź, Grodzisk Mazowiecki.",
      url: canonical,
    },
  };
}

export default async function OperatPage(
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
      <PageHeader page="operat" />
      <ServicePage slug="operat" image="/images/operat.jpg" />
    </>
  );
}
