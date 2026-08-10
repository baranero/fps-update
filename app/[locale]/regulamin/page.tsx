import PageHeader from "@/components/Common/PageHeader";
import LegalPage from "@/components/Legal/LegalPage";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls, seoUrls } from "@/lib/seo";

// Dokument prawny istnieje w dwóch wariantach: polski (wiążący) na
// fp-solutions.pl i angielski (kurtuazyjny) na fdsrun.com — tam trafia klient
// chmury. Dlatego adres kanoniczny zależy od języka, a nie od jednej domeny.
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "headers.regulamin" });
  const { canonical, languages } =
    locale === "en" ? cloudSeoUrls(locale, "/regulamin") : seoUrls(locale, "/regulamin");
  return {
    title: `${t("title")} | Fire Protection Solutions`,
    description: t("desc"),
    alternates: { canonical, languages },
  };
}

export default function RegulaminPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="regulamin" />
      <LegalPage doc="regulamin" />
    </>
  );
}
