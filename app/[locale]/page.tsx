import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Blog from "@/components/Blog";
import CloudSpotlight from "@/components/CloudSpotlight";
import ScrollUp from "@/components/Common/ScrollUp";
import Contact from "@/components/Contact";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import Pillars from "@/components/Pillars";
import Video from "@/components/Video";
import CloudLanding from "@/components/Cloud/CloudLanding";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { seoUrls, cloudSeoUrls } from "@/lib/seo";
import { SITE_MODE } from "@/lib/cloud";

// Root zależny od projektu (SITE_MODE, build-time → statycznie):
//  • cloud     → landing FDSRun pod czystym „/",
//  • marketing → strona usług ppoż.
// (Dev: SITE_MODE=null → strona usług; landing chmury pod /chmura.)

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (SITE_MODE === "cloud") {
    const t = await getTranslations({ locale, namespace: "cloudLanding.metadata" });
    const { canonical, languages } = cloudSeoUrls(locale, "/");
    return {
      title: t("title"),
      description: t("description"),
      alternates: { canonical, languages },
      openGraph: { title: t("title"), description: t("description"), url: canonical },
    };
  }
  const t = await getTranslations({ locale, namespace: "home.metadata" });
  const { canonical, languages } = seoUrls(locale, "/");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("ogTitle"), description: t("ogDescription"), url: canonical },
  };
}

export default function Home({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  if (SITE_MODE === "cloud") {
    return <CloudLanding />;
  }

  return (
    <>
      <ScrollUp />
      <Hero />
      <Pillars />
      <CloudSpotlight />
      <Features />
      <Video />
      <AboutSectionOne />
      <AboutSectionTwo />
      <Blog />
      <Contact />
    </>
  );
}
