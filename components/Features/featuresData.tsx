import { Feature } from "@/types/feature";
import { FaBuilding, FaFan, FaFireAlt, FaFireExtinguisher } from "react-icons/fa";
import { MdOutlineFireplace } from "react-icons/md";
import { FaExplosion } from "react-icons/fa6";
import { LuAlarmSmoke } from "react-icons/lu";
import { PiStairsBold } from "react-icons/pi";

const featuresData: Feature[] = [
  {
    id: 1,
    icon: <LuAlarmSmoke size={32} />,
    href: "/ssp",
    title: "Projekt SSP",
    paragraph: "Kompleksowe projekty systemów sygnalizacji pożarowej — dobór central, czujek, stref alarmowych i scenariuszy działania.",
    isNew: true,
  },
  {
    id: 2,
    icon: <PiStairsBold size={32} />,
    href: "/oddymianie",
    title: "Systemy oddymiania",
    paragraph: "Projekty oddymiania grawitacyjnego i mechanicznego klatek schodowych i hal magazynowych zgodne z CNBOP i normami PN.",
    isNew: true,
  },
  {
    id: 3,
    icon: <MdOutlineFireplace size={32} />,
    href: "/cfd",
    title: "Symulacje CFD",
    paragraph: "Modelowanie rozwoju pożaru i rozprzestrzeniania dymu. Analiza warunków bezpiecznej ewakuacji (ASET vs RSET).",
  },
  {
    id: 4,
    icon: <FaFireExtinguisher size={32} />,
    href: "/ibp",
    title: "Instrukcja Bezpieczeństwa Pożarowego",
    paragraph: "Opracowanie nowej IBP oraz obowiązkowe aktualizacje istniejącej dokumentacji dla obiektów każdego typu.",
  },
  {
    id: 5,
    icon: <FaExplosion size={32} />,
    href: "/ozw",
    title: "OZW / DZW",
    paragraph: "Ocena zagrożenia wybuchem i Dokument Zabezpieczenia przed Wybuchem — wyznaczanie stref Ex i dobór środków ochronnych.",
    isNew: true,
  },
  {
    id: 6,
    icon: <FaBuilding size={32} />,
    href: "/audyt",
    title: "Audyt & Operat ppoż.",
    paragraph: "Weryfikacja zgodności obiektu z przepisami oraz operat przeciwpożarowy do zezwolenia na zbieranie lub przetwarzanie odpadów.",
  },
];

export default featuresData;
