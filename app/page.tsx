import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Blog from "@/components/Blog";
import ScrollUp from "@/components/Common/ScrollUp";
import Contact from "@/components/Contact";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import Video from "@/components/Video";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fire Protection Solutions | Inżynieria Bezpieczeństwa Pożarowego",
  description:
    "Kompleksowe usługi z zakresu ochrony przeciwpożarowej. Wykonujemy symulacje CFD, audyty ppoż., operaty oraz Instrukcje Bezpieczeństwa Pożarowego. Warszawa, Łódź, Grodzisk Mazowiecki.",
  alternates: {
    canonical: "https://fp-solutions.pl",
  },
  openGraph: {
    title: "Fire Protection Solutions – Ekspert Ochrony Ppoż.",
    description:
      "Zadbaj o bezpieczeństwo pożarowe swojego obiektu. Skontaktuj się z inżynierem bezpieczeństwa pożarowego. Działamy w całej Polsce, ze szczególnym uwzględnieniem woj. mazowieckiego i łódzkiego.",
    url: "https://fp-solutions.pl",
  },
};

export default function Home() {
  return (
    <>
      <ScrollUp />
      <Hero />
      <Features />
      <Video />
      <AboutSectionOne />
      <AboutSectionTwo />
      <Blog />
      <Contact />
    </>
  );
}