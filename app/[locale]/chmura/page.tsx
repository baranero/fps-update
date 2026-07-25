import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CloudLanding from "@/components/Cloud/CloudLanding";
import { cloudSeoUrls } from "@/lib/seo";

// Alias landingu chmury. W projekcie „cloud" root „/" jest właściwym landingiem
// (patrz app/[locale]/page.tsx), a /chmura middleware kanonizuje do „/". Trasa
// zostaje dla dev (jeden origin) i jako jawny adres landingu.

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "cloudLanding.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

export default async function ChmuraPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <CloudLanding />;
}
