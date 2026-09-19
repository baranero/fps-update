import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CloudLanding from "@/components/Cloud/CloudLanding";
import { cloudSeoUrls } from "@/lib/seo";

// Alias landingu chmury. W projekcie „cloud" root „/" jest właściwym landingiem
// (patrz app/[locale]/page.tsx), a /chmura middleware kanonizuje do „/". Trasa
// zostaje dla dev (jeden origin) i jako jawny adres landingu.

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "cloudLanding.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

export default async function ChmuraPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  return <CloudLanding />;
}
