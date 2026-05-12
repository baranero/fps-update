import Breadcrumb from "@/components/Common/Breadcrumb";
import Contact from "@/components/Contact";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt | Inżynieria Bezpieczeństwa Pożarowego – FP Solutions",
  description:
    "Skontaktuj się z ekspertem ds. inżynierii bezpieczeństwa pożarowego. Realizujemy audyty ppoż., symulacje CFD i instrukcje IBP. Warszawa, Łódź, Grodzisk Mazowiecki.",
  alternates: {
    canonical: "https://fp-solutions.pl/kontakt",
  },
  openGraph: {
    title: "Kontakt – Fire Protection Solutions Jakub Baran",
    description:
      "Masz pytania dotyczące ochrony przeciwpożarowej swojego obiektu? Zadzwoń lub napisz – chętnie doradzę i przygotuję darmową wycenę.",
    url: "https://fp-solutions.pl/kontakt",
  },
};

const ContactPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Skontaktuj się ze mną"
        description="Masz pytania dotyczące bezpieczeństwa pożarowego swojego obiektu? Zadzwoń lub wyślij wiadomość – chętnie doradzę, omówię Twój projekt i przygotuję indywidualną ofertę."
      />

      <Contact />
    </>
  );
};

export default ContactPage;