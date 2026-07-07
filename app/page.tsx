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
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fire Protection Solutions | Inżynieria Bezpieczeństwa Pożarowego",
  description:
    "Kompleksowe usługi z zakresu ochrony przeciwpożarowej oraz chmura obliczeniowa CFD Cloud do symulacji FDS. Projekty SSP, oddymiania, IBP, OZW. Warszawa i cała Polska.",
  alternates: {
    canonical: "https://fp-solutions.pl",
  },
  openGraph: {
    title: "Fire Protection Solutions – Ekspert Ochrony Ppoż. i CFD Cloud",
    description:
      "Projekty SSP, oddymiania, symulacje CFD oraz platforma CFD Cloud do obliczeń FDS w chmurze. Działamy w całej Polsce i obsługujemy inżynierów globalnie.",
    url: "https://fp-solutions.pl",
  },
};

export default function Home() {
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
