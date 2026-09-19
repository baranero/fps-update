import PageHeader from "@/components/Common/PageHeader";
import LegalPage from "@/components/Legal/LegalPage";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls, seoUrls } from "@/lib/seo";

// Dokument prawny istnieje w dwóch wariantach: polski (wiążący) na
// fp-solutions.pl i angielski (kurtuazyjny) na fdsrun.com — tam trafia klient
// chmury. Dlatego adres kanoniczny zależy od języka, a nie od jednej domeny.
export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "headers.privacy" });
  const { canonical, languages } =
    locale === "en" ? cloudSeoUrls(locale, "/polityka-prywatnosci") : seoUrls(locale, "/polityka-prywatnosci");
  return {
    title: `${t("title")} | Fire Protection Solutions`,
    description: t("desc"),
    alternates: { canonical, languages },
  };
}

export default async function PolitykaPrywatnosciPage(
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
      <PageHeader page="privacy" />
      <LegalPage doc="privacy" />
    </>
  );
}
