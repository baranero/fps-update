import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "O mnie | Inżynier Bezpieczeństwa Pożarowego – Jakub Baran",
  description:
    "Poznaj moje doświadczenie i kwalifikacje. Jako inżynier bezpieczeństwa pożarowego pomagam firmom i instytucjom w dbaniu o zgodność z przepisami ppoż.",
  alternates: {
    canonical: "https://fp-solutions.pl/o-mnie",
  },
  openGraph: {
    title: "O mnie – Fire Protection Solutions Jakub Baran",
    description:
      "Dowiedz się więcej o mojej pracy, doświadczeniu oraz podejściu do nowoczesnej inżynierii bezpieczeństwa pożarowego.",
    url: "https://fp-solutions.pl/o-mnie",
  },
};

const AboutPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="O mnie"
        description="Poznajmy się! Dowiedz się więcej o moim doświadczeniu, uprawnieniach oraz kompleksowym podejściu do inżynierii bezpieczeństwa pożarowego."
      />
      
      {/* Główne sekcje z treścią o Tobie */}
      <AboutSectionOne />
      <AboutSectionTwo />
    </>
  );
};

export default AboutPage;